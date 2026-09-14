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

## Living Workstation extension

Routing, camera interpolation, projected interface bounds and focus restoration remain unchanged. ProjectVisual renders small local SVG diagrams driven by the existing walkthrough step. CareerTimeline adds decorative lane paths while retaining the semantic ordered list and selection behavior. Identity timing is local presentation state. Paper lift settles before camera arrival; reduced motion disables it. No additional dependencies.

## Latent Studio phase 1

Atelier continues to own hash navigation and arrival state. Pointer input now writes to a ref instead of triggering React renders. CameraDirector reconstructs the base camera pose each frame and applies a damped spherical orbit of at most ±1.5 degrees yaw and ±0.8 degrees pitch, with no roll and no accumulated offsets. Damping uses a rate of 9 per second. Mobile uses a tiny ambient orbit, paused during pointer contact; reduced motion disables it. Home return restores a navigation focus target after browser history traversal as well as explicit navigation.

The Home architecture is recomposed as a glass observatory. LatentLandscape consumes `lib/visual/latent-graph.ts`, whose deterministic positions use identifiers and verified portfolio content. Four curated themes contain project and career anchors. Project-story technologies and selected terms from the canonical experience descriptions produce satellites; links connect each term to its owner, theme members to one another, and shared project anchors across themes. No inferred scientific relationship or learned projection is claimed.

Repeated small signals use buffer Points. Connection segments share one buffer per cluster, with a separate shared-project filament buffer. Reusable furniture geometry and materials, instanced keys, a 64px procedural environment, one capped shadow map and DPR limits remain. Economy mode reduces dust from 110 to 30 and halves technology satellites/connections, removes the glass sheen and contact shadows, and caps DPR at 1.15 instead of 1.5. Hidden tabs set the renderer to never; reduced-motion and settled destinations use demand rendering. Home alone renders continuously for its atmospheric systems. Resources and visibility listeners are disposed on unmount.

StudioSound creates AudioContext only after an explicit sound gesture. Quiet entry creates no audio resources. The original local synthesis combines sine fundamentals and suspended harmonics, slow gain modulation, low-pass filtered noise, stereo placement and a restrained upper texture. The Projects texture changes through a 0.3-second time constant, reaching approximately 95% in 0.9 seconds. Master gain remains conservative. Quiet preference is remembered; a remembered sound preference still requires a fresh gesture on a new visit. Playback refusal leaves a quiet usable scene and retry control. Visibility changes suspend/resume an already consented context; unmount stops sources, disconnects nodes and closes the context.

Projects activation coordinates local lighting and a landscape-to-monitor pulse with an 840ms quintic camera flight. The camera approaches the actual primary screen until its edges move beyond the viewport. The factual screen preview hands off to the full-screen semantic Projects chapter. On Home return, the chapter fades away over 240ms while the camera restores its Home pose. Reduced motion cuts directly. Career and CV retain their established surface-bound transitions. The regression browser script reads the current camera target rather than assuming the superseded Home composition.

Validation covers the retained browser suite plus focused sound, cursor, fallback and full-screen chapter checks. The ordinary headless Chrome renderer used ANGLE Metal on Apple M4 Max at a measured median 16.7ms frame interval; forced SwiftShader was much slower at 150ms. Visibility instrumentation confirmed zero hidden-tab draw calls. Device-hint quality selection is implemented; a continuous frame-time-driven degradation ladder remains a future refinement.

## Shared repository graph and field route

`lib/visual/signal-field.ts` defines typed nodes, evidence-bearing edges, pinned repository revisions, and deterministic positions. `SignalFilaments` draws its primary edges behind the studio using a shared buffer geometry. `SignalField` expands the same dataset into a semantic button list and SVG connection layer at `#field`. No graph data is fetched at runtime, and no force simulation or graph library is used.

Field navigation moves the existing camera to `[0, 4, -6.3]`, beyond the glass at z=-5, over 1,000ms. Room lighting dims and a signal travels toward the glass. A 280ms opacity handoff resolves the interactive field. Back/history reuse the camera controller; Escape first clears a selection, then returns to the studio with focus restored. Reduced motion skips the flight and decorative pulses. After the field resolves, the covered Three.js canvas stops rendering; CSS signal motion pauses in hidden tabs. The interface remains available without WebGL. Existing audio consent and mute controls remain shared across destinations.
