# Technical architecture

Retain Next.js static export, React, TypeScript, React Three Fiber, Drei and Three.js. No dependencies or protected configuration changed. Browser history uses hashes, keeping GitHub Pages routing intact.

Atelier.tsx owns one explicit View union: home, projects, career, cv. Navigation, object clicks and accessible object labels call the same transition. pushState records explicit navigation; popstate/hashchange restores it. Repeated clicks retarget one camera track from its current pose rather than queuing animations. A current-view reference rejects stale completion signals.

AtelierRoom.tsx preserves the procedural scene, shared rounded geometry/material resources, instanced keys, small procedural environment and demand-driven renderer. CameraDirector interpolates position, look target and up vector over 900 ms. The CV uses a top-down up vector. Bounded damped pointer offsets apply only at Home; reading has no drift. Reduced motion and initial entry cut directly. Hidden documents pause rendering.

Each frame during a transition projects the selected surface corners to CSS bounds through a ref, avoiding React render work per frame. ProjectWorkspace, CareerTimeline and CVDocument supply selectable semantic HTML. Reading becomes visible after the matching arrival signal. Mobile replaces physical screen bounds with full-screen readable layouts. Content works before scene loading and after WebGL failure.

lib/content/portfolio.ts owns verified project narratives, system walkthrough stages, timeline entries, experience and skill groups. No model server or placeholder model results are involved. The glass sculpture is a noninteractive background detail.

Standard rendering caps DPR at 1.5 with one 1024px shadow map. Economy caps DPR at 1.15, removes dynamic shadows and reduces supporting geometry. Both avoid postprocessing and external assets. Responsive local posters cover loading or unavailable WebGL. A no-JavaScript document supplies all three destinations.

Commands: npm run dev; npm run lint; ./node_modules/.bin/tsc --noEmit --incremental false; npm run build; node scripts/verify-protection.mjs. External existing Playwright/axe tooling runs scripts/browser-check.mjs against the exported out directory.


## After-hours refinement
The existing camera, navigation state, projected surface bounds and mobile adaptations remain intact. DestinationLighting interpolates a small set of local light intensities over a finite interval on entry/hover/selection, then stops requesting frames. MonitorSweep is a transient procedural plane during activation. Architectural additions reuse existing geometry/material resources. A focused after-hours.css layer supplies finite interface motion, timeline drawing/pulses and the darker screen palette. Project diagram drafting detail responds by only a few pixels to mouse movement, disabled with reduced motion.

The existing DPR caps, economy geometry reductions, no dynamic shadows on weaker devices, visibility pause and demand rendering remain in force. No dependencies, inference services or postprocessing stack were introduced.
