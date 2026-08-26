# Körbchen Meilenstein 1 (Fundament + Auth & Pairing + Trinken) — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register/Login, ein Körbchen mit Rollen (caregiver/pupp) erstellen oder per Invite-Code beitreten, ein Trinkziel setzen, getrunkene ml eintragen und den Fortschritt live sehen — inklusive Sterne fürs Ziel-Erreichen.

**Architecture:** Fastify-REST-API (Zod-validiert) auf Prisma/SQLite mit Cookie-Sessions und einem In-Process-SSE-Event-Bus; React/Vite-Frontend mit TanStack Query (SSE-getriebene Cache-Invalidierung), react-router und Tailwind v4. Geteilte DTOs aus `@koerbchen/shared` sind der Vertrag zwischen beiden.

**Tech Stack:** Node ≥ 20.12, npm-Workspaces, TypeScript (strict, ESM), Fastify 5, Prisma 7 (SQLite), bcryptjs, zod v4, Vitest; React 18, Vite, @tanstack/react-query, react-router-dom, Tailwind v4 (`@tailwindcss/vite`), Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-26-koerbchen-design.md`

## Global Constraints

- **Node ≥ 20.12** — nutzt `process.loadEnvFile` und globales `crypto.randomUUID()`. Keine `dotenv`-Dependency.
- **ESM überall** — alle Packages sind `"type": "module"`. Keine `require`.
- **TypeScript strict** — kein `any` ohne Not; öffentliche Funktionen typisieren.
- **DTOs sind der Vertrag** — Server-Antworten und Client-Erwartungen entsprechen exakt den Typen in `packages/shared/src/index.ts`. Nicht neu definieren; von dort importieren.
- **Rollen** sind exakt `'caregiver' | 'pupp'` (Typ `Role` aus shared).
- **UI-Texte auf Deutsch**, mobile-first (Tailwind, kleine Viewports zuerst).
- **Fehler-Envelope** immer `{ error: { code, message } }`.
- **Zod v4** — Top-Level-Validatoren nutzen (`z.email()`, nicht `z.string().email()`).
- **Tests mit Vitest**; Server-Integrationstests laufen seriell (bereits in `vitest.config.ts` gesetzt) gegen eine separate Test-DB (`file:./test.db`), niemals gegen `dev.db`.
- **Häufige Commits** — jede Task endet mit genau einem Commit.

---

## Dateistruktur (was entsteht)

**Server (`apps/server/src/`)**
- `lib/errors.ts` — AppError + Fehler-Handler (neu)
- `lib/events.ts` — SSE-Event-Bus (neu)
- `lib/auth.ts` — Passwort-Hashing, Sessions, Cookies (neu)
- `plugins/auth.ts` — `currentUser`-Decorator, `requireUser`, `requireMembership` (neu)
- `routes/auth.ts`, `routes/koerbchen.ts`, `routes/drink.ts`, `routes/live.ts` (neu)
- `services/stars.ts` — Trink-Summe, Sterne-Gutschrift, Guthaben (neu)
- `app.ts` — Routen/Plugins registrieren (ändern)
- `env.ts` — Test-Modus respektieren (ändern)
- `src/tests/db.ts` — `resetDb()`-Helfer (neu); `src/tests/globalSetup.ts` — Test-DB migrieren (neu)
- `prisma/migrations/**` — initiale Migration (neu, generiert)

**Web (`apps/web/src/`)**
- `lib/api.ts`, `lib/queryKeys.ts`, `lib/live.ts` (neu)
- `app/providers.tsx` (neu)
- `features/auth/` (useMe, AuthPage), `features/koerbchen/` (useKoerbchen, CreateOrJoin, SettingsPage), `features/drink/` (useDrinkToday, DrinkCard, CaregiverOverview) (neu)
- `App.tsx` (ersetzen), `App.test.tsx` (ersetzen), `main.tsx` (ändern)

**Beide** `package.json` (Dependencies ergänzen).

---
