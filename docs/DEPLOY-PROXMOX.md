# Körbchen auf Proxmox hosten (LXC, ohne Docker)

Das Körbchen bekommt einen eigenen unprivilegierten LXC-Container. Dein
bestehender nginx-Container bleibt, wie er ist, und bekommt nur eine weitere
Site — TLS und die öffentliche Adresse liegen dort, das Körbchen spricht
intern einfaches HTTP.

```
Internet ──HTTPS──> nginx-CT ──HTTP──> koerbchen-CT :3001
                  192.168.1.51       192.168.1.50
                                          │
                                          ├── apps/web/dist  (gebaute PWA)
                                          └── /var/lib/koerbchen/koerbchen.db
```

Der Fastify-Server liefert API **und** gebaute Web-App aus einem Prozess auf
einem Port aus — im nginx-Container ist also nur ein einziges `proxy_pass`
nötig, kein getrenntes Frontend-Root.

## Platzhalter

Ersetze durchgehend:

| Platzhalter          | Bedeutung                        | Beispiel hier   |
| -------------------- | -------------------------------- | --------------- |
| `110`                | CTID des neuen Körbchen-Containers | `110`         |
| `192.168.1.50`       | IP des Körbchen-Containers       | —               |
| `192.168.1.51`       | IP deines nginx-Containers        | —               |
| `192.168.1.1`        | Gateway / DNS deines Netzes       | —               |
| `koerbchen.example.de` | Öffentliche Domain              | —               |
| `DEIN_USER`          | Dein Login-Benutzer im Container  | —               |

Befehle laufen an drei Orten. Das steht jeweils über dem Block dabei:

- **Proxmox-Host** (SSH als root auf den Hypervisor)
- **koerbchen-CT** (`pct enter 110` oder SSH)
- **nginx-CT** (dein bestehender Reverse-Proxy-Container)

---

## 1. Container anlegen — auf dem Proxmox-Host

Template besorgen, falls noch keins da ist:

```bash
pveam update
pveam available --section system | grep debian-13
pveam download local debian-13-standard_13.1-1_amd64.tar.zst   # Namen aus der Liste übernehmen
```

Container erzeugen:

```bash
pct create 110 local:vztmpl/debian-13-standard_13.1-1_amd64.tar.zst \
  --hostname koerbchen \
  --unprivileged 1 \
  --features nesting=1 \
  --cores 2 \
  --memory 2048 \
  --swap 512 \
  --rootfs local-lvm:8 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.1.50/24,gw=192.168.1.1 \
  --nameserver 192.168.1.1 \
  --onboot 1 \
  --ssh-public-keys /root/.ssh/id_ed25519.pub

pct start 110
pct enter 110
```

Warum diese Werte:

- **`--features nesting=1`** ist hier nicht optional. Die systemd-Unit weiter
  unten nutzt `ProtectSystem=strict` und `PrivateTmp=true`; beides braucht
  eigene Mount-Namespaces. Ohne `nesting` scheitert der Dienst im
  unprivilegierten Container mit `Failed to set up mount namespacing`.
- **2 GB RAM**, weil `vite build` beim Deploy im Container läuft. Mit 1 GB
  kippt der Build gerne mit „JavaScript heap out of memory" — dann entweder
  vorübergehend hochdrehen (`pct set 110 --memory 2048`) oder lokal bauen
  (siehe [Abschnitt 8](#8-web-app-bauen)).
- **8 GB Disk** reichen lange. Die Datenbank wächst vor allem durch
  Kuscheltier-Fotos, die als `data:`-URLs mit bis zu 500 KB je Bild darin
  liegen.
- **unprivilegiert**, weil nichts hier root-Rechte auf dem Host braucht.

> Wenn du lieber eine VM statt eines LXC nimmst: alles ab Abschnitt 2 gilt
> unverändert, nur `--features nesting=1` und die `pct`-Befehle entfallen.

## 2. Grundeinrichtung — im koerbchen-CT

Zeitzone zuerst. Kalender, Serientermine und Erinnerungen rechnen in **lokaler**
Zeit; ein Container auf UTC verschiebt alle Erinnerungen:

```bash
timedatectl set-timezone Europe/Berlin
timedatectl
```

Node installieren. Debians eigenes `nodejs`-Paket ist zu alt — der Server nutzt
`process.loadEnvFile`, das gibt es erst ab Node 20.12:

```bash
apt update
apt install -y curl ca-certificates gnupg git sqlite3 sudo
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
node -v    # v24.x
```

Einen Login-Benutzer für dich, falls du nicht als root arbeiten willst:

```bash
adduser DEIN_USER
usermod -aG sudo DEIN_USER
```

## 3. Benutzer und Verzeichnisse — im koerbchen-CT

Der Dienst läuft unter einem eigenen Systembenutzer ohne Login, der **nur** in
das Datenverzeichnis schreiben darf. Der Code gehört deinem Login-User — so
deployst du ohne `sudo`-Verrenkungen, und der laufende Dienst kann sich nicht
selbst überschreiben.

```bash
sudo adduser --system --group --home /var/lib/koerbchen --no-create-home koerbchen
sudo install -d -o koerbchen -g koerbchen -m 750 /var/lib/koerbchen
sudo install -d -o DEIN_USER -g koerbchen -m 755 /srv/koerbchen
```

## 4. Code in den Container bringen

Das Repo hat noch kein Remote. Zwei Wege — nimm A, wenn du ohnehin ein privates
Git-Hosting nutzt, sonst B.

### Variante A — privates Repo (GitHub, Codeberg, Forgejo …)

```bash
# im koerbchen-CT
git clone git@github.com:DEIN_KONTO/koerbchen.git /srv/koerbchen
```

### Variante B — Bare-Repo im Container, Push direkt von deinem Rechner

```bash
# im koerbchen-CT
git init --bare /srv/koerbchen.git
git clone /srv/koerbchen.git /srv/koerbchen
```

```powershell
# auf deinem Windows-Rechner, im Projektordner
git remote add proxmox ssh://DEIN_USER@192.168.1.50/srv/koerbchen.git
git push proxmox master
```

```bash
# im koerbchen-CT, nach jedem Push
cd /srv/koerbchen && git pull --ff-only
```

> `.env`, `node_modules/`, `dist/` und die SQLite-Datei stehen in `.gitignore` —
> die kommen bewusst **nicht** mit und entstehen im Container.

## 5. Abhängigkeiten installieren — im koerbchen-CT

Der Server startet TypeScript zur Laufzeit über `tsx`, und die Web-App wird im
Container gebaut. Beides steckt in den `devDependencies` — also **nicht**
`--omit=dev`:

```bash
cd /srv/koerbchen
npm ci --include=dev
npm run db:generate -w apps/server     # prisma generate
```

`prisma generate` muss im Container laufen, nicht auf Windows: Prisma legt dabei
die zur Plattform passende Query-Engine ab (`debian-openssl-3.0.x`).
`node_modules` von deinem Rechner zu kopieren funktioniert deshalb nicht.

## 6. Konfiguration — im koerbchen-CT

```bash
cd /srv/koerbchen/apps/server
cp .env.example .env
openssl rand -hex 32        # Ausgabe als SESSION_SECRET eintragen
```

`/srv/koerbchen/apps/server/.env`:

```ini
DATABASE_URL="file:/var/lib/koerbchen/koerbchen.db"
SESSION_SECRET="<hier die 64 Zeichen aus openssl>"
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
```

**Zum `HOST`:** Bei einem Ein-Server-Setup stünde hier `127.0.0.1`. Das geht
hier nicht — nginx läuft in einem *anderen* Container und erreicht den Loopback
des Körbchen-Containers nicht. Der Dienst muss also auf der Container-IP
lauschen, und die Absicherung übernimmt stattdessen die Firewall in
[Abschnitt 10](#10-port-3001-auf-den-nginx-container-beschränken). Ohne diese
Firewall wäre das Körbchen für jedes Gerät im LAN unter
`http://192.168.1.50:3001` offen — unverschlüsselt.

`NODE_ENV=production` schaltet Request-Logging und das `Secure`-Flag der
Session-Cookies scharf. Fehlt dabei ein eigenes `SESSION_SECRET`, verweigert der
Server bewusst den Start, statt still mit dem veröffentlichten Dev-Secret zu
laufen — dann ließen sich Session-Cookies fälschen.

> **Vorrang:** Eine echte Umgebungsvariable schlägt immer die `.env`-Datei
> (`process.loadEnvFile` überschreibt bereits Gesetztes nicht). Zum kurzen
> Gegentesten reicht ein Präfix wie `NODE_ENV=development …`, ohne die Datei
> anzufassen.

Die Datei enthält das Session-Secret, also Rechte einschränken. Der
Dienstbenutzer liest sie über die Gruppe:

```bash
sudo chown DEIN_USER:koerbchen /srv/koerbchen/apps/server/.env
sudo chmod 640 /srv/koerbchen/apps/server/.env
```

## 7. Datenbank anlegen — im koerbchen-CT

Die Migrationen laufen als Dienstbenutzer, damit die entstehende SQLite-Datei
gleich die richtigen Rechte hat. In Produktion `migrate deploy` (spielt nur
vorhandene Migrationen ab), **nicht** `migrate dev`:

```bash
sudo -u koerbchen -H env DATABASE_URL="file:/var/lib/koerbchen/koerbchen.db" \
  /srv/koerbchen/node_modules/.bin/prisma migrate deploy \
  --schema /srv/koerbchen/apps/server/prisma/schema.prisma

ls -l /var/lib/koerbchen/
```

`npm run db:seed` **nicht** ausführen — das legt Beispieldaten an. Deine echten
Konten legst du später über die Registrierung in der App an.

## 8. Web-App bauen — im koerbchen-CT

```bash
cd /srv/koerbchen
npm run build -w apps/web        # erzeugt apps/web/dist
```

Der Fastify-Server findet `apps/web/dist` automatisch und liefert die PWA unter
demselben Port aus wie die API (`registerWebApp` in `apps/server/src/app.ts`).

> Wenn der Build am Speicher scheitert: `pct set 110 --memory 4096` auf dem
> Host, Container neu starten, bauen, danach wieder zurückdrehen. Oder lokal
> bauen und nur `dist/` hochladen:
> `rsync -av apps/web/dist/ DEIN_USER@192.168.1.50:/srv/koerbchen/apps/web/dist/`

Funktionstest, bevor systemd übernimmt:

```bash
cd /srv/koerbchen/apps/server
/srv/koerbchen/node_modules/.bin/tsx src/server.ts
# in einer zweiten Sitzung:
curl -s localhost:3001/api/health
```

Sollte `{"status":"ok","time":"…"}` liefern. Danach mit `Ctrl+C` beenden.

## 9. systemd-Dienst — im koerbchen-CT

Datei `/etc/systemd/system/koerbchen.service`:

```ini
[Unit]
Description=Koerbchen
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=koerbchen
Group=koerbchen
WorkingDirectory=/srv/koerbchen/apps/server
ExecStart=/srv/koerbchen/node_modules/.bin/tsx src/server.ts
Restart=on-failure
RestartSec=5

# Datenverzeichnis: wird angelegt und ist der einzige beschreibbare Pfad
StateDirectory=koerbchen
ReadWritePaths=/var/lib/koerbchen

# Härtung (braucht --features nesting=1 am Container, siehe Abschnitt 1)
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now koerbchen
systemctl status koerbchen
journalctl -u koerbchen -f
```

`ProtectSystem=strict` macht das gesamte Dateisystem schreibgeschützt — der
Dienst kann nur noch nach `/var/lib/koerbchen` und in sein privates `/tmp`
schreiben (dorthin legt `tsx` seinen Übersetzungs-Cache).

Der Kalender-Erinnerungs-Scheduler (`startReminderScheduler`) läuft im selben
Prozess und braucht keinen eigenen Cronjob.

## 10. Port 3001 auf den nginx-Container beschränken — im koerbchen-CT

Weil der Dienst auf `0.0.0.0` lauscht, muss die Firewall die Zugriffskontrolle
übernehmen. Am einfachsten mit `ufw` **im Container** — das bleibt
selbstenthalten und kann dich nicht vom Proxmox-Host aussperren:

```bash
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow from 192.168.1.51 to any port 3001 proto tcp
sudo ufw enable
sudo ufw status verbose
```

Gegenprobe vom nginx-CT (muss gehen) und von einem beliebigen anderen Gerät im
LAN (muss ins Leere laufen):

```bash
# im nginx-CT
curl -s http://192.168.1.50:3001/api/health
```

<details>
<summary>Alternative: Proxmox-Firewall statt ufw</summary>

Auf dem **Proxmox-Host**, Datei `/etc/pve/firewall/110.fw`:

```ini
[OPTIONS]
enable: 1
policy_in: DROP
policy_out: ACCEPT

[RULES]
IN ACCEPT -p tcp -dport 22
IN ACCEPT -p tcp -dport 3001 -source 192.168.1.51
```

Dazu muss die Firewall am Netzwerkgerät aktiv sein:

```bash
pct set 110 --net0 name=eth0,bridge=vmbr0,firewall=1,ip=192.168.1.50/24,gw=192.168.1.1
```

> **Achtung:** Die Container-Firewall greift erst, wenn die Firewall auch auf
> Datacenter-Ebene eingeschaltet ist (`/etc/pve/firewall/cluster.fw`,
> `enable: 1`). Das wirkt sich auf **alle** Gäste und den Host aus — prüfe
> vorher deine bestehenden Regeln, sonst sperrst du dir womöglich die
> Weboberfläche auf Port 8006 oder andere Container aus. Wenn du die
> Proxmox-Firewall bisher nicht nutzt, nimm lieber `ufw` im Container.

</details>

## 11. Site im nginx-Container anlegen

Das Körbchen hält für die Live-Aktualisierung eine dauerhafte SSE-Verbindung
offen (`/api/live/:id`). Die braucht eine eigene `location` ohne Pufferung —
sonst hängt nginx die Ereignisse in seinem Puffer fest und die App aktualisiert
sich erst verspätet oder gar nicht.

Im **nginx-CT**, Datei `/etc/nginx/sites-available/koerbchen`:

```nginx
upstream koerbchen {
    server 192.168.1.50:3001;
    keepalive 16;
}

server {
    listen 80;
    listen [::]:80;
    server_name koerbchen.example.de;

    # Kuscheltier-Fotos werden als data:-URL im JSON mitgeschickt (max. 500 KB)
    client_max_body_size 4m;

    # Live-Stream (Server-Sent Events): keine Pufferung, langer Timeout
    location /api/live/ {
        proxy_pass http://koerbchen;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 24h;
        chunked_transfer_encoding off;
    }

    location / {
        proxy_pass http://koerbchen;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/koerbchen /etc/nginx/sites-enabled/koerbchen
sudo nginx -t && sudo systemctl reload nginx
```

`X-Forwarded-For` ist nicht optional: Fastify läuft mit `trustProxy: true`, und
die Rate-Begrenzung auf Login/Registrierung (10 Versuche je 5 Minuten und IP)
würde ohne diesen Header alle Besucher als einen einzigen Client zählen. Da
`trustProxy: true` **jedem** Absender diesen Header glaubt, ist Abschnitt 10
die Voraussetzung dafür, dass er verlässlich bleibt — nur der nginx-Container
darf den Port überhaupt erreichen.

<details>
<summary>Wenn dein Container Nginx Proxy Manager (NPM) statt nginx fährt</summary>

Neuen Proxy Host anlegen: Scheme `http`, Forward Hostname `192.168.1.50`,
Forward Port `3001`, „Websockets Support" **an**. Die Standardkonfiguration von
NPM puffert allerdings, was den Live-Stream verzögert. Deshalb unter
**Advanced → Custom Nginx Configuration** ergänzen:

```nginx
client_max_body_size 4m;

location /api/live/ {
    proxy_pass http://192.168.1.50:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 24h;
}
```

</details>

## 12. HTTPS — im nginx-Container

Ohne HTTPS kein Service Worker — die App ließe sich nicht als PWA auf den
Homescreen legen, und das `Secure`-Flag der Session-Cookies würde die Anmeldung
verhindern. Also nicht überspringen.

Falls dein nginx-Container schon ein Wildcard-Zertifikat für die Domain hat,
trägst du es einfach in den `server`-Block ein. Sonst:

```bash
# im nginx-CT
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d koerbchen.example.de
```

Voraussetzung ist ein DNS-Record auf die öffentliche IP und eine
Portweiterleitung 80/443 vom Router auf `192.168.1.51`. Certbot ergänzt den
443-Block und richtet die Erneuerung als systemd-Timer ein
(`systemctl list-timers | grep certbot`).

Beachte: Ein Konto kann jede Person anlegen, die die URL kennt — geschützt sind
erst die Körbchen selbst (über Einladungscodes). Wenn dir das zu offen ist, nimm
die Variante unten.

### Alternative ohne öffentliche Adresse: Tailscale

Bei personenbezogenen Daten und Fotos die deutlich ruhigere Variante. Tailscale
kommt in den **nginx-CT** (oder direkt in den koerbchen-CT, dann brauchst du gar
keinen Proxy):

```bash
# im koerbchen-CT
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
tailscale serve --bg 3001
```

Damit entfallen nginx, certbot und die Portweiterleitung komplett; erreichbar
unter `https://<hostname>.<tailnet>.ts.net` mit gültigem Zertifikat, also auch
als PWA installierbar. In einem unprivilegierten LXC braucht Tailscale Zugriff
auf `/dev/net/tun` — auf dem **Proxmox-Host**:

```bash
pct set 110 --features nesting=1,keyctl=1
echo 'lxc.cgroup2.devices.allow: c 10:200 rwm' >> /etc/pve/lxc/110.conf
echo 'lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file' >> /etc/pve/lxc/110.conf
pct reboot 110
```

## 13. Backups

Zwei Ebenen, die unterschiedliche Dinge abfangen.

### Ebene 1: SQLite-Dump im Container

Ein `cp` auf eine laufende Datenbank kann einen inkonsistenten Stand erwischen.
`sqlite3 .backup` ist dafür sicher. Im **koerbchen-CT**,
`/usr/local/bin/koerbchen-backup`:

```bash
#!/bin/sh
set -eu
DEST=/var/backups/koerbchen
mkdir -p "$DEST"
STAMP=$(date +%Y-%m-%d)
sqlite3 /var/lib/koerbchen/koerbchen.db ".backup '$DEST/koerbchen-$STAMP.db'"
gzip -f "$DEST/koerbchen-$STAMP.db"
find "$DEST" -name 'koerbchen-*.db.gz' -mtime +30 -delete
```

`/etc/systemd/system/koerbchen-backup.service`:

```ini
[Unit]
Description=Koerbchen Datenbank-Backup

[Service]
Type=oneshot
ExecStart=/usr/local/bin/koerbchen-backup
```

`/etc/systemd/system/koerbchen-backup.timer`:

```ini
[Unit]
Description=Taegliches Koerbchen-Backup

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo chmod +x /usr/local/bin/koerbchen-backup
sudo systemctl daemon-reload
sudo systemctl enable --now koerbchen-backup.timer
sudo systemctl start koerbchen-backup.service   # einmal testen
ls -lh /var/backups/koerbchen/
```

### Ebene 2: vzdump auf dem Proxmox-Host

Sichert den ganzen Container. Leg den Job so, dass er **nach** 03:00 läuft —
dann enthält jedes Container-Backup automatisch einen frischen, garantiert
konsistenten `.db.gz`-Dump aus Ebene 1:

```bash
# auf dem Proxmox-Host
vzdump 110 --mode snapshot --compress zstd --storage local
```

Dauerhaft über *Datacenter → Backup* einrichten, Startzeit z. B. 04:00.

`--mode snapshot` friert den Container nicht ein, das Ergebnis ist also nur
absturzkonsistent. SQLite übersteht das in aller Regel (Journal-Recovery), aber
der Dump aus Ebene 1 ist die Kopie, auf die du dich verlassen solltest.
`--mode stop` wäre voll konsistent, kostet aber ein bis zwei Minuten Ausfall.

Und: Zieh die Backups regelmäßig **vom Proxmox-Host weg**. Ein Backup auf
derselben Maschine ist keins.

### Zurückspielen

```bash
# im koerbchen-CT
sudo systemctl stop koerbchen
sudo -u koerbchen gunzip -c /var/backups/koerbchen/koerbchen-2026-09-01.db.gz \
  > /var/lib/koerbchen/koerbchen.db
sudo systemctl start koerbchen
```

## 14. Updates einspielen

Der Vorteil gegenüber Bare Metal: vor jedem Update ein Snapshot, der in Sekunden
zurückgerollt ist.

```bash
# auf dem Proxmox-Host
pct snapshot 110 vor-update
```

Im **koerbchen-CT**, `/srv/koerbchen/deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /srv/koerbchen

git pull --ff-only
npm ci --include=dev
npm run db:generate -w apps/server

sudo -u koerbchen -H env DATABASE_URL="file:/var/lib/koerbchen/koerbchen.db" \
  /srv/koerbchen/node_modules/.bin/prisma migrate deploy \
  --schema /srv/koerbchen/apps/server/prisma/schema.prisma

npm run build -w apps/web
sudo systemctl restart koerbchen

sleep 2
curl -fsS localhost:3001/api/health && echo " — läuft"
```

```bash
chmod +x /srv/koerbchen/deploy.sh
```

Ablauf: lokal committen, `git push proxmox master`, dann im Container
`/srv/koerbchen/deploy.sh`. Läuft alles, den Snapshot wieder löschen:

```bash
# auf dem Proxmox-Host
pct delsnapshot 110 vor-update
# oder im Fehlerfall:
pct rollback 110 vor-update
```

> **Achtung beim Rollback:** Ein Snapshot-Rollback setzt auch die **Datenbank**
> auf den Stand von vorher zurück. Alles, was seither eingetragen wurde, ist
> weg. Nur direkt nach einem fehlgeschlagenen Deploy sinnvoll, nicht Tage
> später.

Vor dem Push lokal absichern:

```bash
npm test          # Server- und Web-Tests
npm run build     # Typecheck beider Apps
```

Neue Migrationen entstehen weiterhin **lokal** mit `npm run db:migrate` und
werden mitcommittet; im Container läuft nur `migrate deploy`.

## 15. Fehlersuche

| Symptom | Prüfen |
| ------- | ------ |
| Dienst startet nicht | `journalctl -u koerbchen -n 50 --no-pager` |
| `Failed to set up mount namespacing` | `--features nesting=1` fehlt am Container (Abschnitt 1) |
| `SESSION_SECRET ist nicht gesetzt` | `.env` fehlt oder ist für `koerbchen` nicht lesbar: `sudo -u koerbchen cat /srv/koerbchen/apps/server/.env` |
| 502 im nginx-CT | `curl http://192.168.1.50:3001/api/health` vom nginx-CT aus — geht das nicht, ist es die Firewall (Abschnitt 10) oder `HOST=127.0.0.1` in der `.env` |
| Von überall im LAN erreichbar | Firewall aus Abschnitt 10 fehlt oder erlaubt zu viel: `sudo ufw status verbose` |
| Leere Seite, nur API antwortet | `apps/web/dist/index.html` fehlt → `npm run build -w apps/web`, dann Dienst neu starten |
| Änderungen erscheinen erst nach Reload | SSE wird gepuffert → `location /api/live/` im nginx-CT prüfen |
| Anmeldung schlägt still fehl | Seite über HTTP statt HTTPS aufgerufen; das `Secure`-Cookie wird verworfen |
| `SQLITE_READONLY` / `unable to open database file` | Rechte auf `/var/lib/koerbchen` (`ls -l`), muss `koerbchen:koerbchen` gehören |
| Erinnerungen zur falschen Uhrzeit | `timedatectl` im koerbchen-CT — Zeitzone |
| Build stirbt mit „heap out of memory" | Container-RAM zu klein, `pct set 110 --memory 4096` |
| Alte Version nach Deploy | Service Worker im Browser; einmal hart neu laden |

Logs live: `journalctl -u koerbchen -f` im koerbchen-CT. Fastify loggt nur mit
`NODE_ENV=production` in der `.env` — ohne den Eintrag bleibt das Journal außer
Start- und Fehlermeldungen leer.

## 16. Was hier bewusst offen bleibt

Aus dem [Sicherheits-Abschnitt des README](../README.md#sicherheit), relevant
sobald der Server öffentlich steht:

- Abgelaufene Sessions werden nicht aufgeräumt (die Tabelle wächst langsam)
- Kein Audit-Log für Zugriffe auf fremde Daten
- Registrierung ist offen — wer die URL kennt, kann ein Konto anlegen
- Ein einzelner Prozess auf einer SQLite-Datei: keine zwei Instanzen des
  Dienstes parallel starten und die Datei nicht auf einen NFS-Mountpoint legen
