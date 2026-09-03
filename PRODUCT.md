# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two people, one Körbchen: a **Caregiver** and a **Pupp** in a consensual caregiver/little
dynamic (`docs/superpowers/specs/2026-08-26-koerbchen-design.md`). Both are adults, both
German-speaking, both on their own phones. Confirmed at init: the product is for this one
household — not for strangers to adopt, not a template for other couples. There is no
acquisition audience, no onboarding for someone who has never seen it, and no reason to pay
a generality tax.

The two roles are asymmetric and each gets its own surface:

- **Pupp** — logs during the day: drinks, changes, packing a bag, sending a Ruf. Sees own
  Sterne balance and can request a reward.
- **Caregiver** — reads the overview, restocks and configures (goal, change interval, low
  threshold, diaper types), approves reward requests, holds the invite code.

The data model supports several members per Körbchen and a user in several Körbchen; that
capability is latent, not a target. Design for the pair.

## Product Purpose

Körbchen makes everyday care visible and shared between two people without either of them
having to ask. One person logs a small act of care; the other sees it on their own phone a
moment later, live. Success is that the day's care is *already recorded* — nobody has to
reconstruct it, and nobody has to check in to find out how the day is going.

Sterne turn one specific recorded act (reaching the drink goal) into something redeemable,
so tracking carries a small reward loop rather than being pure record-keeping.

## Positioning

Not a habit tracker and not a baby app, both of which a neighboring product could copy.
What is specific here: **one shared space with two asymmetric roles**, where the same events
are authored by one person and watched by the other in real time, in the vocabulary of a
consensual care dynamic. A hydration tracker is single-player; a baby app has a subject who
cannot use it. Körbchen's subject is an adult who logs their own day and is cared for while
doing it.

Self-hosted is part of the position, not a deployment detail: this data belongs to two
people and never leaves their machines.

## Operating Context

- **Many tiny moments, all day.** Confirmed usage pattern. Visits are ten seconds long:
  open, log one thing, close. Speed to a single action outranks overview on entry.
- **Phone in one hand**, standing, distracted, often one-thumbed. The app is installed to
  the home screen and opened like a native app (`display: standalone`).
- Reached over the home WLAN or over **Tailscale** (`tailscale serve` on port 8443 → HTTPS,
  which is what makes the PWA install and Service Worker possible). One port serves both
  the API and the built web app; there are never two addresses to remember. Full operating
  notes live in `README.md`.
- Both phones stay in sync over **SSE**; a change made by one is visible to the other
  without a refresh or a pull.
- Runs on one Node process plus a SQLite file. No external service is involved in normal
  operation.

## Capabilities and Constraints

Shipped features (each is a tab, per role):

| Bereich | What it does |
| --- | --- |
| **Trinken** | Drink goal in ml per Pupp per calendar day; log amounts; live progress. Reaching the goal credits **1 Stern**, once per day, idempotently (`services/stars.ts`). |
| **Windel** | Configurable diaper types with their own stock, emoji, note; retireable rather than deletable. Change log with type + note; change interval and a Körbchen-wide low-stock threshold. |
| **Taschen** | Packable bags (Schwimmtasche, Wickeltasche …) with items, quantity, note, packed state. Any member manages them. |
| **Kuscheltiere** | Steckbrief cards for plushies: name, species, character, favorites, bio, photo. Photos are client-resized `data:` URLs — there is no file storage. |
| **Sterne** | Star economy as a transaction ledger (`drink_goal` / `manual` / `redemption`). Reward catalog with a star cost; Pupp requests, Caregiver approves or denies. |
| **Ruf** | Quick-call pings from presets or free text, with acknowledgement. |
| **Kalender** | Events with attendees or for-everyone visibility, all-day, daily/weekly/monthly recurrence with an optional series end, and a reminder N minutes before start (server-side scheduler, idempotent per occurrence). |
| **Setup** | Invite code, Körbchen settings, membership. A Pupp-created Körbchen keeps this tab so it is not a dead end. |

Durable constraints, confirmed at init:

- **German-only UI.** All copy is German; no i18n layer is expected or planned.
- **Fixed product vocabulary.** Körbchen, Pupp, Caregiver, Sterne, Ruf, Windel, Taschen,
  Kuscheltiere, Steckbrief, Einladungs-Code are product language, not placeholders awaiting
  a rename. `role` is `'caregiver' | 'pupp'` on the wire.
- **Phone-first, one-handed, installable.** The narrow single column and the PWA install are
  requirements, not a starting point that a desktop layout may outgrow.
- **Self-hosted only.** SQLite on one machine; provider is switchable to Postgres. No
  third-party analytics, CDN, or data processor is acceptable.
- Auth is email + bcrypt with a 30-day HttpOnly session cookie; every request is checked
  against membership in the Körbchen.
- Known gaps the README states plainly and future work must not paper over: expired sessions
  are never cleaned up, there is no SQLite backup plan, and there is no audit log. These are
  accepted while the app lives inside the tailnet and are blockers for any public exposure.

Explicitly undecided (do not invent an answer):

- Whether the app must be **discreet** on a shared or locked screen — app name, icon,
  reminder toast, and notification text were *not* made a constraint at init. Do not add
  discretion behavior, and do not assume it is unwanted either; ask before designing around
  it.
- Whether Körbchen ever becomes publicly reachable (`tailscale funnel` or a domain).
- Whether the Körbchen switcher for multiple memberships is ever built.

## Brand Commitments

- **Name:** Körbchen. The wordmark and the PWA identity (`manifest.webmanifest`,
  `public/icon.svg`, `apple-mobile-web-app-title`) are the installed name on a home screen.
- **Voice:** German, warm, *spielerisch* — the approved spec's own word — addressing an
  adult. Never clinical, never a nursery.
- **Manifest description:** „Fürsorge, gemeinsam getrackt."
- No aesthetic direction, palette, or typography was made binding at init. The visual world
  is genuinely unsettled — git history holds two full redesigns (a cyberpunk "care terminal"
  and the current „Sticker-Heft bei Nacht" dark-plum sticker world in the working tree).
  That is a DESIGN.md question, deliberately left open here.

## Evidence on Hand

- `README.md` — operating truth: setup, one-port deployment, Tailscale, firewall, env vars,
  tests, and an honest security section. German.
- `docs/superpowers/specs/2026-08-26-koerbchen-design.md` — approved spec with the confirmed
  core decisions (multi-member, SSE, self-hosted, per-Pupp goal semantics).
- `apps/server/prisma/schema.prisma` — source of truth for the data model.
- `apps/server/prisma/seed.ts` — real example content in the product's own voice: diaper
  types „Tag" ☀️ and „Nacht" 🌙 („saugstärker"), bags „Schwimmtasche" 🏊 and
  „Wickeltasche" 🧷. Use these as sample content instead of inventing new ones.
- Test suites on both sides (Vitest; Fastify `inject` on the server, Testing Library on the
  web) define real behavior.

There are **no** customers, testimonials, press, benchmarks, pricing, licensing, usage
numbers, or deployment claims. None exist. Never fabricate them, and never write copy that
implies a user base larger than two people.

## Product Principles

1. **One action, ten seconds.** The day is made of tiny visits. Entry lands on the thing
   this role does most; nothing between opening the app and logging one fact.
2. **Two roles, two products.** Pupp authors, Caregiver oversees and configures. Build the
   role's surface, never one screen with permissions punched out of it.
3. **Shared state is the promise.** If one person records something, the other sees it
   without asking, refreshing, or being told. Live sync is the product, not plumbing.
4. **Playful toward an adult.** Warmth, emoji, stickers and stars are welcome; talking down
   to the person using it is not. The dynamic is consensual and between equals.
5. **Private by construction.** Two people's care journal on their own machine. No external
   dependency at runtime, nothing that phones home, nothing that leaks in a notification.

## Accessibility & Inclusion

No formal standard was set at init. What is established:

- Reach and target size matter more than density — one thumb, phone in one hand.
- German is the only language; copy must be readable without translation.
- Existing markup uses real tab semantics (`role="tablist"` / `tab` / `tabpanel`,
  `aria-selected`, labeled regions); keep that floor rather than rebuilding it as divs.
- The current theme is dark by design; contrast is a live risk in every redesign and must be
  verified, not assumed.
