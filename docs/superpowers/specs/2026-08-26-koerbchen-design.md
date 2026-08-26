# Körbchen — Design & Spezifikation

**Datum:** 2026-08-26
**Status:** Freigegeben (Brainstorming abgeschlossen)
**Nächster Schritt:** Implementierungsplan (writing-plans) für Meilenstein 1 (Phasen 1–3)

---

## 1. Überblick & Zweck

Körbchen ist eine mobile-first Web-App für eine einvernehmliche **Caregiver/Little-Dynamik** (Rollen: `caregiver` und `pupp`). Zwei oder mehr Personen teilen sich einen gemeinsamen Raum — das „Körbchen" — in dem alltägliche Fürsorge sichtbar und spielerisch begleitet wird.

Kern dieses Meilensteins ist das **Trink-Tracking**: Ein Trinkziel wird gesetzt, getrunkene Milliliter werden eingetragen, der Fortschritt ist für alle im Körbchen in Echtzeit sichtbar, und das Erreichen des Ziels wird mit Sternen belohnt.

Das vollständige Datenmodell (in `apps/server/prisma/schema.prisma`) deckt darüber hinaus Windeln/Wickeln, einen Belohnungskatalog mit Sternen-Ökonomie und einen Kurzruf ab. Diese werden in späteren Phasen umgesetzt; das Design berücksichtigt sie, damit die Fundamente tragen.

### Getroffene Kernentscheidungen (aus dem Brainstorming)

| Thema | Entscheidung |
|---|---|
| Beziehungsstruktur | **Mehrere Mitglieder** pro Körbchen (mehrere Caregiver und/oder Pupps). Ein Nutzer kann in mehreren Körbchen sein und hat ein **aktives Körbchen**. |
| Echtzeit | **Live-Sync per SSE** (Server-Sent Events), In-Process-Event-Bus. |
| Hosting/Persistenz | **Self-hosted**, Node + Fastify, **SQLite** (später auf Postgres umstellbar). |
| Frontend-Architektur | **TanStack Query** (Server-State + SSE-getriebene Cache-Invalidierung) + **react-router** + **Tailwind**. |
| Trinkziel-Semantik | **Pro Pupp**: `drinkGoalMl` ist eine Körbchen-Einstellung, gilt aber für jeden Pupp individuell; jeder Pupp hat eigenen Tagesfortschritt und verdient eigene Sterne. |

---

## 2. Technischer Stack (bereits gerüstet)

- **Monorepo:** npm-Workspaces (`apps/*`, `packages/*`).
- **Server (`apps/server`):** Fastify 5, Prisma 7 (SQLite), `@fastify/cookie`, `bcryptjs`, `zod`, `tsx`, Vitest (+ `light-my-request` via Fastify `inject`).
- **Web (`apps/web`):** React + Vite, Vitest + Testing Library (jsdom-Setup vorhanden). **Neu hinzuzufügen:** `@tanstack/react-query`, `react-router-dom`, `tailwindcss` (+ postcss/autoprefixer).
- **Shared (`packages/shared`):** geteilte TypeScript-DTOs (bereits umfangreich vorhanden) — die typisierte Vertragsschicht zwischen Server und Web.

Node ≥ 20.12 (nutzt `process.loadEnvFile`). Kein externer Dienst nötig; alles läuft in einem Node-Prozess plus SQLite-Datei.

---

## 3. Datenmodell

Quelle der Wahrheit ist `apps/server/prisma/schema.prisma`. Zusammenfassung der für diesen Meilenstein relevanten Entitäten:

- **User** — `id`, `email` (unique), `passwordHash`, `displayName`.
- **Session** — `token` (unique), `userId`, `expiresAt`. Cookie-basiert.
- **Koerbchen** — der geteilte Raum. Einstellungen: `inviteCode` (unique), `drinkGoalMl` (default 1500), `changeIntervalMinutes`, `diaperCount`, `diaperLowThreshold`, `lastChangeAt`.
- **Membership** — verbindet `User` ↔ `Koerbchen` mit `role` (`'caregiver' | 'pupp'`). Unique pro `(userId, koerbchenId)`. Ein Nutzer kann mehrere Memberships haben (mehrere Körbchen).
- **DrinkLog** — `koerbchenId`, `userId`, `amountMl`, `createdAt`. Ein Eintrag pro Trink-Aktion.
- **StarTransaction** — `koerbchenId`, `userId` (der Pupp, dem die Sterne gehören), `delta`, `reason` (`'drink_goal' | 'manual' | 'redemption'`), `refId?`. Sterne-Guthaben = Summe der `delta` eines Pupps in einem Körbchen.

Spätere Phasen: `ChangeLog`, `Reward`, `RewardRedemption`, `QuickCallPreset`, `QuickCall` (bereits im Schema vorhanden).

### Trinkziel-Semantik (pro Pupp)

- `Koerbchen.drinkGoalMl` ist **ein** Zielwert, den ein Caregiver setzt.
- Er gilt für **jeden Pupp einzeln**. „Tagesfortschritt" eines Pupps = Summe seiner `DrinkLog`-Einträge des heutigen Kalendertags (lokale Zeitzone des Servers).
- Ein Pupp erreicht das Ziel, sobald seine Tages-Summe `>= drinkGoalMl` ist. Dann wird **einmal pro Kalendertag** eine `StarTransaction(reason: 'drink_goal')` gutgeschrieben (Idempotenz: prüfen, ob heute schon eine `drink_goal`-Transaktion für diesen Pupp existiert).
- Sternenwert pro Ziel-Erreichung: **1 Stern** (Konstante, in `services/stars.ts` zentral; später konfigurierbar — YAGNI für jetzt).

### Aktives Körbchen

Da ein Nutzer in mehreren Körbchen sein kann, hält der Client ein „aktives Körbchen" (`koerbchenId`) im Zustand. Der Server leitet den Kontext aus dem angefragten `koerbchenId`-Pfadparameter ab und prüft per Membership die Berechtigung. `MeDto.membership` bleibt für den Einstieg die Membership des zuletzt aktiven/einzigen Körbchens; die Mitgliederliste steht über den Körbchen-Endpunkt bereit. Ein Körbchen-Umschalter im UI erscheint nur, wenn der Nutzer mehr als eine Membership hat.

---

## 4. Server-Architektur & Modulgrenzen

Kleine Module mit je einer klaren Aufgabe, unter `apps/server/src/`:

- `env.ts` *(vorhanden)* — Konfiguration aus `.env`.
- `lib/prisma.ts` *(vorhanden)* — Prisma-Client-Singleton.
- `lib/auth.ts` — Passwort-Hashing (bcrypt), Session-Token erzeugen/prüfen, Cookie setzen/löschen, Ablauf.
- `lib/events.ts` — **Live-Event-Bus**: ein `EventEmitter` plus Registry der verbundenen SSE-Clients, gruppiert nach `koerbchenId`. Funktion `emit(event: LiveEvent)` broadcastet an alle Clients dieses Körbchens.
- `lib/errors.ts` — einheitliches Fehler-Envelope und Fastify-Error-Handler.
- `plugins/auth.ts` — Fastify-`preHandler`/Decorator: liest Session-Cookie, lädt `request.user`; Hilfsfunktion `requireMembership(koerbchenId, role?)` lädt `request.membership` und prüft Rolle.
- `routes/auth.ts` — `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- `routes/koerbchen.ts` — Körbchen erstellen, per Invite-Code beitreten, lesen, Einstellungen ändern (inkl. `drinkGoalMl`), Mitgliederliste.
- `routes/drink.ts` — ml eintragen, Tagesstatus (pro Pupp), Verlauf.
- `routes/live.ts` — `GET /api/live/:koerbchenId` SSE-Stream.
- Später: `routes/diaper.ts`, `routes/rewards.ts`, `routes/quickcall.ts`, `services/stars.ts` (Sterne-Gutschrift; im Trink-Meilenstein bereits minimal angelegt für die Ziel-Belohnung).

**Validierung:** Eingaben je Route mit **Zod** parsen; Ausgaben entsprechen den Shared-DTOs. Zod-Schemas liegen bei der jeweiligen Route.

---

## 5. API-Oberfläche (Meilenstein 1)

Alle Antworten JSON. Geschützte Endpunkte erfordern gültiges Session-Cookie.

**Auth**
- `POST /api/auth/register` `{ email, password, displayName }` → setzt Session-Cookie, `MeDto`.
- `POST /api/auth/login` `{ email, password }` → Session-Cookie, `MeDto`.
- `POST /api/auth/logout` → löscht Session.
- `GET /api/auth/me` → `MeDto` (User + aktuelle Membership oder `null`).

**Körbchen**
- `POST /api/koerbchen` `{ name, role }` → erstellt Körbchen, macht Ersteller zum Mitglied mit gewählter Rolle, generiert `inviteCode`. → `KoerbchenDto`.
- `POST /api/koerbchen/join` `{ inviteCode, role }` → tritt bei. → `KoerbchenDto`.
- `GET /api/koerbchen/:id` → `KoerbchenDto` (inkl. `members[]`). (Mitgliedschaft erforderlich.)
- `PATCH /api/koerbchen/:id/settings` `KoerbchenSettingsInput` (u.a. `drinkGoalMl`) → nur `caregiver`. Emittiert `koerbchen.updated`.

**Trinken**
- `POST /api/koerbchen/:id/drink` `{ amountMl }` → nur `pupp` (loggt für sich selbst). Legt `DrinkLog` an, berechnet Tages-Summe, vergibt ggf. Sterne. Emittiert `drink.logged` (+ `drink.goalReached`, `stars.updated` falls Ziel erreicht). → aktualisiertes `DrinkTodayDto`.
- `GET /api/koerbchen/:id/drink/today?userId=` → `DrinkTodayDto` für den angegebenen Pupp (Default: der anfragende Nutzer, falls Pupp). Caregiver können `userId` eines Pupps abfragen.

**Live**
- `GET /api/live/:koerbchenId` → SSE-Stream aller `LiveEvent`s dieses Körbchens (Mitgliedschaft erforderlich). Heartbeat alle ~25 s.

---

## 6. Frontend-Architektur

Unter `apps/web/src/`:

- `lib/api.ts` — typisierter Fetch-Client; nutzt Shared-DTOs; wirft strukturierte Fehler.
- `lib/live.ts` — Hook `useLiveEvents(koerbchenId)`: öffnet `EventSource`, mappt eingehende `LiveEvent`-Typen auf **TanStack-Query-Invalidierungen** (z.B. `drink.logged` → `['drink','today', koerbchenId]`).
- `lib/queryKeys.ts` — zentrale Query-Key-Fabriken.
- `features/auth/` — Login-/Register-Views, `useMe()`.
- `features/koerbchen/` — Erstellen/Beitreten, Einstellungen (Trinkziel), Körbchen-Umschalter, Mitgliederliste.
- `features/drink/` — `DrinkCard` (Ziel-Fortschrittsring, Schnell-Buttons +100/+200/+250/eigener Wert, Tagesverlauf, „Ziel erreicht 🎉"), Caregiver-Übersicht über alle Pupps.
- `App.tsx` — react-router: `/login`, `/` (rollenabhängiges Dashboard), `/settings`. Nicht eingeloggt → Redirect zu `/login`. Kein aktives Körbchen → Erstellen/Beitreten-Flow.

**Rollenabhängige Ansichten**
- **Pupp:** eigener Ziel-Ring, ml eintragen, eigene Sterne.
- **Caregiver:** Fortschritt aller Pupps, Trinkziel setzen; später Belohnungen freigeben.

**Datenfluss Trinken (End-to-End)**
1. Pupp tippt „+250 ml" → optimistisches Update + `POST …/drink { amountMl: 250 }`.
2. Server: Auth-preHandler → Rolle `pupp` → `DrinkLog` anlegen → Tages-Summe neu berechnen.
3. Ziel gerade überschritten & heute noch nicht belohnt? → `StarTransaction('drink_goal')` + Events `drink.goalReached`, `stars.updated`.
4. Immer: Event `drink.logged` an **alle** SSE-Clients des Körbchens.
5. Clients: Event → passende Queries invalidieren → Refetch → UI aktualisiert sich (Ziel-Ring; Caregiver sieht es live).

---

## 7. Fehlerbehandlung

- Einheitliches Envelope: `{ error: { code: string, message: string } }`.
- Statuscodes: `400` Validierung (Zod), `401` nicht authentifiziert, `403` falsche/fehlende Rolle, `404` nicht gefunden, `409` Konflikt (z.B. E-Mail vergeben, schon Mitglied).
- Zentrale Fastify-`setErrorHandler`; Zod-Fehler werden auf `400` gemappt.
- **SSE:** Heartbeat-Kommentar (`: ping`) alle ~25 s hält die Verbindung offen. `EventSource` reconnectet automatisch; der Client refetcht relevante Queries beim (Re-)Connect, statt Event-IDs nachzuspielen (ausreichend fürs MVP).

---

## 8. Teststrategie (TDD pro Feature)

- **Server (Vitest + Fastify `inject`):** je Route Tests gegen eine isolierte Test-SQLite-DB (eigene `DATABASE_URL`, vor Tests migriert/zurückgesetzt). Abgedeckt:
  - Auth: Registrieren, Login (richtig/falsch), `me`, Logout.
  - Körbchen: Erstellen, Beitreten per Code, Einstellungen nur durch Caregiver.
  - Trinken: ml eintragen, Tages-Summe, **„Ziel erreicht vergibt genau einmal pro Tag Sterne"** (Idempotenz).
  - Event-Bus (`lib/events.ts`): emit erreicht nur Clients des richtigen Körbchens.
- **Web (Vitest + Testing Library, jsdom-Setup vorhanden):** `DrinkCard` rendern + Interaktion (Klick auf „+250" ruft api mit 250); `useLiveEvents` invalidiert die richtige Query bei eingehendem Event (gemockt).
- **Shared:** Typ-Ebene, minimal.

---

## 9. Phasen-Fahrplan

Der bestehende Aufgaben-/Phasenplan bleibt, geschärft:

1. **Fundament** — Tailwind verdrahten; `lib/auth.ts`, `lib/events.ts`, `lib/errors.ts`; `plugins/auth.ts`; Router/Layout; TanStack-Query-Provider. (erweitert „Monorepo-Gerüst")
2. **Auth & Pairing** — register/login/logout/me; Körbchen erstellen; per Invite-Code beitreten; Mitgliederliste; Rollenwahl.
3. **Trinken** *(erstes echtes Feature)* — Trinkziel setzen, ml eintragen, Tagesstatus pro Pupp, Fortschritts-UI, Verlauf; **minimales Sterne-Ledger** für die Ziel-Belohnung.
4. **Windeln & Wickeln** — `ChangeLog`, Zähler, Wickel-Intervall/Erinnerung.
5. **Belohnungen & Sterne** — voller Katalog (`Reward`) + Einlösung (`RewardRedemption`), Sterne-Guthaben-Ansicht.
6. **Kurzruf** — Presets + Kurznachrichten mit Bestätigung.
7. **Live-Layer komplettieren** — SSE-Abdeckung für alle Event-Typen härten (Bus/SSE selbst wird schon ab Phase 1 gebaut und je Feature scharfgeschaltet, **nicht** erst hier).
8. **PWA & Design-Feinschliff** — Manifest, Offline-Grundgerüst, gestalterische Politur.

**Meilenstein 1 = Phasen 1–3** liefert genau das beschriebene Kernprodukt (Rollen + Trinkziel + ml). Er ist der Umfang des ersten Implementierungsplans. Spätere Phasen erhalten jeweils einen eigenen Plan.

---

## 10. Offene, bewusst später entschiedene Punkte

- **Sternwert & Ökonomie-Feinjustierung** (wie viele Sterne, Boni) — Konstante jetzt, Konfiguration in Phase 5.
- **Zeitzonen-Handhabung** für „heute" — MVP nutzt die Serverzeit; falls Nutzer in verschiedenen Zonen, in Phase 8 nachschärfen.
- **Caregiver loggt für Pupp** — MVP: Pupp loggt selbst. Stellvertretendes Eintragen ggf. später.
