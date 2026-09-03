# Körbchen

Ein geteiltes Fürsorge-Journal: Trinkziel, Wickeln, Taschen, Kuscheltier-Steckbriefe,
Sterne & Belohnungen, Kurzruf und Kalender — live synchron auf allen Geräten.

Monorepo aus drei Workspaces:

| Pfad              | Inhalt                                              |
| ----------------- | --------------------------------------------------- |
| `apps/server`     | Fastify-API, Prisma, SQLite, SSE-Live-Bus            |
| `apps/web`        | React + Vite + Tailwind, installierbar als PWA       |
| `packages/shared` | Gemeinsame TypeScript-DTOs zwischen beiden           |

## Einrichten

```bash
npm install
npm run db:migrate      # legt apps/server/dev.db an
npm run db:seed         # optionale Beispieldaten
```

Danach `apps/server/.env` aus `.env.example` kopieren und anpassen.

## Entwickeln

```bash
npm run dev
```

Startet API (Port 3001) und Vite-Dev-Server (Port 5173) mit Hot Reload.
Beide lauschen auf allen Netzwerk-Interfaces — die Adressen fürs Handy stehen
in der Vite-Ausgabe unter „Network".

## Betreiben — ein Port für alles

```bash
npm start
```

Baut die Web-App und lässt den Fastify-Server sie zusammen mit der API unter
**einem** Port ausliefern (Standard 3001). Beim Start werden alle erreichbaren
Adressen ausgegeben:

```
Körbchen läuft auf   http://localhost:3001
  im Netzwerk unter   http://192.168.1.42:3001
```

Das ist die Variante, die du von anderen Geräten aufrufen willst — es gibt nur
eine Adresse, keine getrennten Ports für Frontend und API.

## Von überall erreichbar

### Empfohlen: Tailscale

Auf diesem Rechner läuft Tailscale bereits. Damit ist das Körbchen von jedem
Gerät erreichbar, das in derselben Tailnet angemeldet ist — auch aus fremden
WLANs oder über Mobilfunk, **ohne** Portfreigabe im Router und ohne dass die
Seite öffentlich im Internet steht.

> **Achtung:** `tailscale serve` ist auf diesem Rechner bereits belegt — die
> Wurzel `/` des Tailnet-Namens zeigt auf `127.0.0.1:8000`. Ein schlichtes
> `tailscale serve --bg 3001` würde diese Zuordnung überschreiben. Der Befehl
> unten legt das Körbchen stattdessen auf einen eigenen Port, sodass die
> bestehende Freigabe unangetastet bleibt. Aktuellen Stand jederzeit mit
> `tailscale serve status` prüfen.

```bash
npm start                                # Server auf Port 3001
tailscale serve --bg --https=8443 3001   # HTTPS auf Port 8443 des Tailnet-Namens
```

Danach im Browser des anderen Geräts:

```
https://<dein-rechner>.<deine-tailnet>.ts.net:8443
```

Den genauen Namen zeigt `tailscale status`. Diese eine Freigabe wieder
entfernen mit `tailscale serve --https=8443 off`
(`tailscale serve reset` würde **alle** löschen, auch die auf Port 8000).

Warum ein eigener Port und nicht `--set-path=/koerbchen`? Die Web-App lädt ihre
Dateien über absolute Pfade (`/assets/…`), und das PWA-Manifest ist auf `/`
verankert. Unter einem Unterpfad würde sie nicht laden, ohne zusätzlich Vites
`base` umzustellen.

**Warum `tailscale serve` und nicht einfach die `100.x`-Adresse?**

Zwei Gründe:

1. **HTTPS.** Über den Tailnet-Namen kommt ein gültiges Zertifikat. Das braucht
   die App, um sich als PWA zum Homescreen hinzufügen zu lassen — Service Worker
   laufen nur über HTTPS (oder auf `localhost`).
2. **Windows-Firewall.** Das Tailscale-Interface liegt im Profil „Privat", und
   dafür hat Node keine eingehende Ausnahme (die vorhandenen Regeln gelten nur
   für „Öffentlich"). Ein direkter Aufruf von `http://100.x.x.x:3001` wird
   deshalb blockiert. `tailscale serve` reicht die Verbindung intern über
   Loopback an den Server weiter und ist von dieser Regel gar nicht betroffen.

Wer die rohe `100.x`-Adresse trotzdem nutzen will, braucht einmalig eine
Firewall-Ausnahme (PowerShell als Administrator):

```powershell
New-NetFirewallRule -DisplayName "Körbchen (Tailscale)" -Direction Inbound `
  -Protocol TCP -LocalPort 3001 -Profile Private -Action Allow
```

### Nur im Heimnetz

Wenn Tailscale nicht laufen soll: `npm start` genügt. Die Seite ist dann unter
der ausgegebenen WLAN-Adresse für alle Geräte im selben Netz da.

Falls ein anderes Gerät die Adresse nicht erreicht, blockiert meist die
Windows-Firewall: prüfe mit `Get-NetConnectionProfile`, in welchem Profil dein
WLAN liegt, und lege für dieses Profil eine eingehende Ausnahme auf den Port an
(Befehl wie oben, `-Profile` entsprechend anpassen).

### Öffentlich im Internet

`tailscale funnel --bg 3001` stellt die Seite für **jeden** im Internet bereit.
Vorher lesen: [Sicherheit](#sicherheit) — das Körbchen enthält personenbezogene
Daten und Fotos, und die Zugangsdaten sind dann weltweit angreifbar.

### Auf einem eigenen Server

Für den Dauerbetrieb auf Proxmox — eigener LXC-Container, nginx als Reverse
Proxy in einem zweiten Container, ohne Docker:
[`docs/DEPLOY-PROXMOX.md`](docs/DEPLOY-PROXMOX.md).

## Konfiguration

Alle Werte in `apps/server/.env`:

| Variable         | Standard          | Bedeutung                                                |
| ---------------- | ----------------- | -------------------------------------------------------- |
| `DATABASE_URL`   | `file:./dev.db`   | SQLite-Datei; für Postgres Provider im Schema umstellen   |
| `SESSION_SECRET` | Dev-Fallback      | Signatur der Session-Cookies                              |
| `PORT`           | `3001`            | HTTP-Port                                                 |
| `HOST`           | `0.0.0.0`         | Alle Interfaces; `127.0.0.1` beschränkt auf diesen Rechner |
| `NODE_ENV`       | `development`     | `production` aktiviert Logger und `Secure`-Cookies         |

Mit `NODE_ENV=production` **muss** ein eigenes `SESSION_SECRET` gesetzt sein —
sonst verweigert der Server bewusst den Start, statt still mit dem öffentlich
bekannten Entwicklungs-Secret zu laufen.

## Tests

```bash
npm test          # Server (Vitest + Fastify inject) und Web (Vitest + Testing Library)
npm run build     # Typecheck beider Apps + Produktions-Build der Web-App
```

Die Server-Tests laufen gegen eine eigene SQLite-Datei (`test.db`) und fassen
die Entwicklungsdatenbank nicht an.

## Sicherheit

Das Körbchen ist als **selbst gehostete** Anwendung für einen kleinen,
vertrauten Kreis gebaut. Was bereits abgesichert ist:

- Passwörter als bcrypt-Hash, Sessions als HttpOnly-Cookie mit 30 Tagen Laufzeit
- Jeder Zugriff wird gegen die Mitgliedschaft im jeweiligen Körbchen geprüft
- Anmeldung und Registrierung sind auf 10 Versuche je 5 Minuten und IP begrenzt
- Einladungscodes stammen aus dem CSPRNG, nicht aus `Math.random()`

Was vor einer öffentlichen Bereitstellung noch fehlt:

- Abgelaufene Sessions werden nicht aufgeräumt
- Kein Backup-Konzept für die SQLite-Datei
- Kein Audit-Log für Zugriffe auf fremde Daten

Solange die Seite nur im Tailnet hängt, ist das vertretbar. Für
`tailscale funnel` oder ein Deployment auf eine öffentliche Domain sollten
diese Punkte vorher erledigt sein.
