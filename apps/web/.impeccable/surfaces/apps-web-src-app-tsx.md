---
version: 1
slug: "apps-web-src-app-tsx"
primary_target: "apps/web/src/App.tsx"
related_targets: ["apps/web/src/index.css"]
---

Scope: the Körbchen web app shell and its eight section panels. Visitor mode: Operate.

Audience and job: two people, a Caregiver and a Pupp, in one Körbchen. Ten-second one-handed visits all day on a phone installed to the home screen; often in a dark room. Task: log one act of care, or see the one the other person logged.

Constraints: German only, fixed vocabulary, dark ground, all eight sections and both role views preserved. Brief drivers: calmer than the incumbent; must not read clinical, infantilising, or cold.

## Direction contract

THESIS: A shelf of enamel tins, one open at a time — refusing the pastel wellness tracker of glowing cards and progress rings.

OWN-WORLD: Fired enamel. One deep cobalt-night body, a bone 1.5px rim hairline on every edge, faint graniteware fleck, stencilled caps for labels, quiet grotesk in bone for prose. One fired oxblood, reserved solely for escalation. A chipped rim showing iron means disabled.

STORY: Two people keep one shared record; what one logs arrives calmly in the other's hands.

FIRST VIEWPORT: Stencilled tin labels across the top, only the open one lit, flooding its body colour into the panel below. The primary control sits thumb-height on the first screen. Fill level carries the value; no ring, no chrome.

FORM: Emaille, candidate 3 of 7, seed 4b70157d.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Resolved in the build: the per-feature hue survives as body colour per tin. It passes the calmness test because exactly one firing is ever painted — the firing now lives on the shell (`TAB_FEAT` in App.tsx, applied to both the lit label and the tabpanel region), never in the panels, so a section cannot light a hue its label does not. Setup got its own undyed graniteware firing (`.feat-iron`) rather than borrowing Ruf's plum.

Also settled at finish: escalation is oxblood and only oxblood — `fällig!`, `knapp!`, an unacknowledged Ruf, a dropped SSE stream, and every error line. A list inside a tin is compartments divided by rim hairlines, never nested cards. Every control is stencilled caps, like every label. The drink reading stands beside its jug, not inside it, so the fill is free to be the light accent against both the dark recess and the body colour.
