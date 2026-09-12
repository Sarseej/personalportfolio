# Testing and performance

## Current evidence

The current after-hours pass is recorded in `review/after-hours/`, with before-comparison captures in `review/before-after-hours/`. The preceding desk iteration is in `review/desk-studio/`. Earlier `review/atelier/` files document the preceding accepted composition; `review/rejected-showroom/` is historical rejected work.

Validation commands: `npm run lint`; `./node_modules/.bin/tsc --noEmit --incremental false`; `npm run build`; `node scripts/verify-protection.mjs`; `node scripts/browser-check.mjs` against the exported `out` directory.

Required visual sizes: 1440×900, 1024×768, 390×844. Each has Home, Projects, Career and CV screenshots. Desktop reading panels align to monitor/paper geometry; tablet camera distance fits the bezel to the narrower aspect ratio. Mobile uses fixed scene compositions and a full-screen reading layer below navigation.

## Coverage

- All three labelled objects and conventional navigation activate the same hash states.
- Physical mesh hitboxes, hover highlighting, camera changes, display/folio response, Back and Escape.
- Four project selectors, explanatory system steps, technical expansion, nine career nodes and verified CV content.
- Browser Back/Forward, direct hash entry and rapid conflicting clicks.
- Keyboard Enter/Space, focus restoration and mobile timeline detail/return behavior.
- Reduced-motion immediate cuts; unavailable WebGL, context loss and no-JavaScript HTML.
- Console/page errors and automated WCAG A/AA checks across room and desktop/mobile reading views.

Exact final outcomes are in `review/after-hours/browser-results.json` and the Progress Log.

## Corrections from review

Browser testing exposed a plant scale attachment error; corrected to a regular mesh scale. Rapid batched navigation could return to the current state without restarting the completion signal; a navigation revision now makes that transition explicit. Project navigator contrast was strengthened. Detached object labels now restore keyboard focus through the corresponding persistent nav link. Screenshot review prompted softer chair geometry/grain, removal of a paper-label overlap, responsive camera fit for tablet bezels and a nonshrinking mobile Back control. Mobile timeline selection brings its detail into view and provides a return to the selected node.

## Performance boundaries

The final Next.js build reports Home first-load JavaScript at approximately 111 kB, with heavy 3D code loaded separately. Local fallback posters are approximately 60 kB desktop and 24 kB mobile. The scene uses procedural geometry/textures and a small generated environment; no external scene assets, fonts, model data or API are fetched.

Demand rendering stops after camera/pointer changes settle. Camera travel is bounded to 900 ms; reading has no idle motion. Standard DPR caps at 1.5, economy at 1.15. Economy removes dynamic shadows and reduces supporting geometry. Hidden documents pause scene rendering.

Headless Chrome uses software WebGL. These checks establish interaction behavior and composition, not 60 FPS on physical hardware. Hardware GPU profiling, additional browser engines, physical mobile devices and screen-reader speech review remain separate future validation. The existing deployment runtime configuration remains unchanged.

## Final result — 8 September 2026

Lint, TypeScript, production build/static export and protected-file verification passed. The final browser run passed all recorded checks with zero console/page errors and zero violations across eight automated accessibility scans. All twelve required room/destination screenshots were inspected. See `review/desk-studio/browser-results.json` for the exact check list. No hardware frame-rate claim is made.


## After-hours pass — 8 September 2026

Final full browser checks passed with zero console/page errors and zero violations across nine accessibility scans, including the restored Career promotion detail. The role and verified subjects/mentoring are tested in Career; the same continuous experience is verified in CV. All object hitboxes, navigation, camera returns, history, keyboard, mobile, static/no-WebGL, context loss and print paths remain functional. Reduced-motion checks explicitly verify that the Career path and node entry animations are disabled as well as camera travel.

Desktop, tablet and mobile captures include every destination, with a separate promotion-detail screenshot. Review corrected overly dark background architecture, screen specular hotspots, promotion-heading scale and return-control visibility. Fallback posters were recaptured from the finished evening scene. Localized emissive/bounce lighting is used instead of a new bloom/postprocessing dependency. Existing demand rendering and quality tiers remain intact; software WebGL does not establish physical-device FPS.
