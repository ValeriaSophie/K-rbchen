---
target: apps/web/src/App.tsx
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
target_identity: "file:C:\\Users\\EstrogenBytesLAB\\Desktop\\körbchen\\apps\\web\\src\\App.tsx"
target_fingerprint: "sha256:dba25db872a63baa45aa6b07eaf9541cd1f62809548ac17d6ace7bf2fae76201"
target_path: "C:\\Users\\EstrogenBytesLAB\\Desktop\\körbchen\\apps\\web\\src\\App.tsx"
timestamp: 2026-09-01T20-38-13Z
slug: apps-web-src-app-tsx
closed: true
---
Method: DEGRADED single-context (harness policy forbids spawning sub-agents unless the user asks). A/B isolation imperfect: detect.mjs output was already in context from the routing step. No browser inspection: no browser automation exposed, dev server down. Contrast figures are hand-computed WCAG 2.1 ratios from index.css hex values.

Mode: Operate. Surface: the role dashboard shell (App.tsx + TabNav + Dashboard).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | Failed drink log shows nothing. `k` undefined renders null (blank panel, no skeleton). SSE state invisible. |
| 2 | Match System / Real World | 4 | Excellent. Own household German: frisch machen, zuletzt gewickelt, knapp!, fällig!, stillgelegt. |
| 3 | User Control and Freedom | 1 | No undo at any layer: no DELETE route for DrinkLog or ChangeLog. Deletes elsewhere fire with no confirm. |
| 4 | Consistency and Standards | 2 | Two manage labels, btn3d vs legacy btn-neon, font-mono cyberpunk survivors, ErrorNote missing in busiest panel. |
| 5 | Error Prevention | 2 | Custom ml accepts 5000 (accidental goal + Stern). No confirm on destructive deletes. |
| 6 | Recognition Rather Than Recall | 3 | Chips carry stock counts; last-change time above the button. Half the tabs off-screen. |
| 7 | Flexibility and Efficiency | 2 | Quick amounts good. No keyboard tabs, no deep links, no persisted tab, no customization. |
| 8 | Aesthetic and Minimalist Design | 3 | Coherent distinctive world; seven accents glow at equal weight so nothing is primary. |
| 9 | Error Recovery | 2 | ErrorNote + role=alert + plain German exists but is unevenly applied; no retry anywhere. |
| 10 | Help and Documentation | 2 | Nothing explains Sterne earning, change interval, or "stillgelegt". |
| **Total** | | **22/40** | **Acceptable - significant improvements needed** |

Cognitive load: 4 of 8 items fail (high). Failed: chunking, minimal choices, visual hierarchy, single focus (caregiver Windel stacks DiaperCard + ChangeCard). Two failures share one root cause (8 tabs). Passing well: working memory, progressive disclosure.

## Design Specificity Verdict

LLM assessment: strongly specific, not reskinnable. Inverted Tailwind ramps (--color-rose-50 #2b1826 to rose-900 #ffe7f0) let existing text-rose-800 markup keep meaning "light ink on dark". Badge tilts 2deg, card-ic -5deg, star stickers pick from a 12-value tilt table, btn3d underside sinks 4px on press, eyebrows in Patrick Hand. Leaks: font-mono (Courier Prime) survivors from the committed cyberpunk theme; .btn-neon legacy alias.

Deterministic scan: 1 finding - apps/web/src/index.css:391 bounce-easing (warning) cubic-bezier(0.2, 0.9, 0.3, 1.5), the .chip selection overshoot. CRITICAL CAVEAT: detect.mjs ran DEGRADED (htmlparser2/css-select/css-tree/domutils unavailable; the plugin install ships no package.json or node_modules). Custom properties, selector matching and computed contrast were NOT evaluated. A codebase built entirely on custom properties was scanned by a tool that cannot read them. The near-clean result carries almost no information.

Visual overlays: none. No browser automation exposed; no dev server. No [Human] tab exists.

## Overall Impression

A real design with a real point of view, undermined by one arithmetic mistake repeated seven times. The accents were chosen as sticker colors then used as button backgrounds with white text; all seven fail WCAG AA, worst on the active tab and the alert badge. Meanwhile the Kurzruf - the one feature whose purpose is to get attention - arrives silently. Biggest opportunity is not a redesign: derive a legible ink per accent instead of hard-coding #fff. One change lifts tabs, buttons, badges and chips at once, and costs the world nothing.

## What's Working

1. The inverted ramps are clever systems thinking - a light-to-dark inversion with no mass markup rewrite. Rewards.tsx bg-amber-100 text-amber-700 lands as light-gold-on-dark-brown and reads beautifully.
2. Recognition over recall: diaper chips carry their own stock count inline; formatTime(lastChangeAt) sits above the log button; the useEffect keeping `selected` valid when a type is retired mid-session is a rare edge case handled.
3. Retire-don't-delete: active:false keeps stock and history visible while the server refuses new changes and ChangeCard filters it from the picker. "stillgelegt" is the right word.

## Priority Issues

### [P0] White text on candy accents - every accent fails, alert badge illegible

.btn3d, .badge, .tabpill[aria-selected], .chip[aria-pressed] all set color:#fff over var(--accent). Computed vs white: gold #ffc24b 1.62:1 (fällig!/knapp! badges, Sterne tab); teal #3ecfd0 1.89:1; mint #4fcb9b 2.01:1 (Windel tab, Frisch gewickelt); sky #54b4f0 2.31:1 (Trinken tab, +100..+330); coral #ff7e6c 2.48:1; bubblegum #ff74a6 2.53:1; grape #9b84e8 3.07:1. AA needs 4.5:1 at these sizes (text-sm 14px; text-lg 18px bold misses the 18.66px large-text threshold). Nothing passes.

Why: the only two alerts in the app are illegible at 1.62:1; the active tab pill is the sole "where am I" signal; night theme used both in a dark room and in daylight.

Fix: add --accent-on per .feat-* (dark ink for gold/mint/teal/sky/coral, white only where the accent is dark enough); replace color:#fff in .btn3d, .badge, .tabpill[aria-selected], .chip[aria-pressed], .seg-on. Dark ink on candy is more sticker-authentic, not less.

Command: /impeccable audit apps/web/src/index.css

### [P0] The Kurzruf arrives in total silence

live.ts handles quickcall.received with only invalidate(qk.quickcalls(id)). Only calendar.reminder dispatches a toast. No badge, no sound, no vibration, no notification.

Why: the feature exists to reach the other person and only works if they are already on that exact tab - one of eight, default for neither role. Sender sees it appear and assumes delivery. PRODUCT.md names shared state as the promise; this is where it breaks.

Fix: route quickcall.received through the same window.dispatchEvent path; generalize ReminderToast into one toast host (reminders, unacknowledged Rufe, diaper.low); unread count on the Ruf tab pill; give the toast role="status" and a dismiss control (it has neither).

Command: /impeccable harden apps/web/src/lib/live.ts

### [P1] The two most frequent actions are irreversible

No DELETE for a drink log or change log in api.ts, routes/drink.ts, or routes/diaper.ts. A mis-tapped +250 is permanent; "Frisch gewickelt" is permanent and decrements stock. CustomAmount accepts 1-5000, so one slip completes the goal and mints a Stern. Conversely DeletePreset and diaper-type delete fire on one tap with no confirm.

Why: ten-second one-handed taps are exactly the conditions that produce mis-taps, and each one is a permanent falsehood in a shared record - and in the star economy, real currency.

Fix: undo affordance on the last logged action (~10s window) rather than a confirm dialog; needs a delete route for the owner's own most-recent log. Confirm step on genuinely destructive deletes. Sanity warning past ~1500 ml, not a hard cap.

Command: /impeccable harden apps/web/src/features/drink/DrinkCard.tsx

### [P1] Failures and loading states are invisible

(1) DrinkCard has no ErrorNote; logMutation errors go nowhere, while QuickCall, DiaperChange, Rewards and Bags all render one. (2) Five tabs are written as k ? Panel : null, so during the useKoerbchen fetch - and permanently if it fails - the user gets a tab bar above an empty page, no skeleton, no message, no retry; App.tsx has no error branch for useKoerbchen. (3) useLiveEvents never handles es.onerror, so a dropped SSE stream leaves stale data looking live.

Fix: ErrorNote in DrinkCard; shared skeleton + error state with retry replacing the null renders; onerror handler surfacing a "nicht verbunden" marker in TopBar with reconnect.

Command: /impeccable harden apps/web/src/App.tsx

### [P1] Eight tabs, half off-screen, behind a hidden scrollbar

TabNav renders eight pills in one overflow-x-auto row that explicitly hides its scrollbar. At 375px about 3.5 pills fit; Kalender and Setup sit past a fold with the only scroll cue deliberately removed. Eight is double the working-memory limit. Also: useState(tabs[0].id) with nothing in the URL and nothing persisted (react-router-dom is a dependency, unused here), so every PWA reopen lands on Trinken; no aria-controls/id linking tabs to the panel and no arrow-key roving focus; the reminder toast cannot deep-link to Kalender.

Fix: active tab in the URL hash or a route; right-edge fade or partial-pill peek for overflow; arrow-key navigation and aria-controls; consider nesting Kuscheltiere and Taschen so the bar fits a phone.

Command: /impeccable adapt apps/web/src/App.tsx

## Persona Red Flags

Casey (Distracted Mobile): taps +200 while walking, sees the 4px depress, pockets the phone - the request failed and DrinkCard renders no error. Fat-thumbs +250 instead of +200; no undo at any layer. Opens for the Kalender, lands on Trinken again, swipes a tab row with no visible scrollbar. In sunlight the mint "Frisch gewickelt" label sits at 2.01:1.

Sam (Accessibility-Dependent): markup is better than most - real tablist/tab/tabpanel, aria-selected, aria-pressed, aria-labels on icon buttons, role=alert on errors, aria-label on the sticker chart, prefers-reduced-motion block. But: no aria-controls and no arrow-key nav; ReminderToast has no role=status so reminders are never announced; live SSE updates change content with no live region; text-rose-900/40 computes to 3.17:1 and /50 to 4.11:1 against --panel-1, both under AA and both used for empty states and metadata; DeletePreset's multiplication-sign button is text-rose-300 (#6d3a55) at 1.69:1 - an invisible destructive control. Pattern: --muted (#b19bad) is fine at 5.74:1; the token is right, the ad-hoc /40 /45 /50 opacity utilities are what fail.

Alex (Power User): no keyboard path through the tabs, no shortcuts, no deep links, no customizing QUICK_AMOUNTS or RESTOCK_STEPS, no bulk anything.

Project-specific "Der Pupp, mitten im Tag": sends a Ruf, watches it join the list, gets no confirmation it reached anyone - because it didn't. Reaches the drink goal and the celebration is font-mono text-sm "Ziel erreicht" plus a small sparkle; the gold-foil sticker payoff lives on a different tab. In an app whose emotional peak is a reward, the peak is rendered smaller than the eyebrow above it.

## Minor Observations

- Cyberpunk survivors: font-mono on "Ziel erreicht" (DrinkCard.tsx:96) and the +N star overflow; .btn-neon legacy alias; @fontsource/chakra-petch and @fontsource/share-tech-mono still in package.json, imported nowhere.
- Two names for one pattern: "verwalten" (Windel) vs "Presets" (Ruf) - same mechanic, same position, same styling.
- The manage toggles are not buttons: hand-font text, no border or background, hit area well under 44px, in the least thumb-reachable corner.
- Logout has the best real estate: the only header action on a two-person app nobody logs out of; that corner could carry connection state or an unread count.
- ReminderToast is single-slot: a second reminder overwrites the first and resets the 8s timer; no dismiss.
- The detector's bounce-easing finding is legitimate but low-stakes; it is the only bounce in the app, so it reads inconsistent rather than expressive. Commit to it as a signature or drop it.
- Every panel glows equally: .panel's accent shadow fires at the same strength on all seven accents, so the stacked caregiver Windel tab is two equally-loud cards.

## Questions to Consider

- What if the tab bar admitted there are only two things you actually do all day?
- The peak moment in a sticker book is pressing on the sticker. What if reaching the goal pressed one onto the screen you were already looking at?
- Live sync is invisible when it works and invisible when it breaks. What would it look like if the other person's presence were felt continuously?
- If white had never been an option for button text, would this palette have been chosen differently, or just inked differently?
