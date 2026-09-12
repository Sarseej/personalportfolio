# ADR — Replace object showroom with computational atelier

Status: accepted direction; architectural composition awaiting visual validation.

## Rejection
The previous prototype was rejected. Its split layout, framed canvas, pedestal and concentric-ring object produced an ornamental showroom. The questions amounted to conventional navigation. A single LIDC reveal narrowed Sarseej’s identity to one research project. Further polishing that object would not address the fundamental problem.

## Decision
Replace the entire current prototype presentation with the Computational Atelier: an inhabited architectural portrait of a computer scientist, AI/ML developer, researcher, systems builder, mathematician and communicator. The environment occupies the full viewport. Furniture, light, camera and readable HTML form one interaction system.

## Reference
[Jesse’s Ramen](https://www.jessezhou.com/) and its [case study](https://jesse-zhou.medium.com/jesses-ramen-case-study-77bae77ab5f0) inform the interaction principle: personal interests and professional work become places and objects; camera position and object state support discovery. The case study describes coordinated camera/target transitions, raycast hitboxes, baked illumination and quality degradation. Its visual language, assets, screen images, neon and branding will not be reused. Our content stays semantic HTML instead of image-based screens.

## Object-to-career mapping
- Workstation: selected engineering work across all four projects; the first complete reading interface.
- Folded glass computational sculpture: AI/ML, representation and future interpretability experiment; no invented inference results.
- Research wall: mathematics, preregistration, teaching and communicating reasoning; supporting station in this checkpoint.
- Compact systems cabinet: infrastructure, search, APIs and reliability; composition only initially.
- Spatial timeline: professional development; composition only initially.
- Physical folio: résumé and direct professional access, also available in persistent navigation.

## Accessibility
Persistent HTML navigation and large station controls duplicate spatial selection. Labels never depend on hidden geometry. Reading appears in a nonmodal semantic panel, with focused heading, Escape/Back return and restored initiating focus. Reduced motion uses immediate camera positioning. Mobile uses directed station views and large tap controls. Server-rendered content and static architectural artwork remain available before JavaScript and if WebGL fails.

## Performance
Existing dependencies only. Shared primitive geometry/materials, instanced repeated construction, one shadow-casting key light, a small procedural environment map and demand rendering. Cap DPR; simplify mobile architecture and shadows. No texture downloads, postprocessing bloom, models or live inference. Pause when hidden. Camera movement is bounded to deliberate compositions.

## Source inventory before replacement
- app/page.tsx: split hero, Observatory mount and conventional long-form sections.
- app/globals.css: boxed instrument, split columns, prompt rows and result panel.
- components/portfolio/Observatory.tsx: three question controls, LIDC-only reveal and enhancement lifecycle.
- components/portfolio/LensScene.tsx: concentric-ring geometry, plinth and pointer response.
- components/portfolio/LensStill.tsx: matching SVG ring and plinth fallback.
- app/icon.svg: ring emblem.
- scripts/browser-check.mjs: tests coupled to the rejected interaction.
- project-vault/review/: historical rejected screenshots; not evidence for the recovery checkpoint.

Only the current uncommitted prototype, its tests and project documentation are replaced. Existing training/model code, unrelated historical UI, deployment inventory, Git identity and remotes remain untouched.

## Alternatives and consequences
Rejected: polish the Lens, put multiple objects in separate cards, use a giant monitor, or construct project-specific rooms. The studio provides a broader personal identity at the cost of more camera/composition work. This recovery checkpoint deliberately limits content to one complete workstation flow and minimal sculpture/research introductions.

## Still requiring visual validation
Entrance composition, professional character, architectural scale, material separation, workstation-to-panel connection, station discoverability, camera pace and mobile framing. Full case studies, systems interactions and real interpretability data remain deferred until the environment is approved.
