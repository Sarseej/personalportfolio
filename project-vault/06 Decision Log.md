# Decision log

## Retain static deployment
Decision: preserve the full manifest, lockfile, workflow, domain and framework configuration. Reason: fragile deployment and sufficient existing libraries. Alternatives: dependency changes or migration. Consequence: use existing React Three Fiber and CSS transitions; no Motion dependency.

## Replace legacy planning
Decision: establish project-vault/ around the approved concept. Reason: legacy notes are unrelated to the approved rebuild. Alternative: merge previous notes. Consequence: only the two authorized legacy targets were moved after tracked dependency checks proved no references or scanning dependencies. Recovery: /Users/userselu/.Trash/personalportfolio-legacy-20260907-071453-623632.

## One project reveal
Decision: all three first-run prompts introduce different aspects of the LIDC study in one panel. Reason: prove one coherent interaction before expanding. Alternatives: three project-specific transformations. Consequence: scope remains one Lens, one transformation, one project.

## Static mobile and reduced-motion treatment
Decision: use procedural static artwork on narrow screens and when reduced motion is requested. Reason: content parity and lower rendering cost. Alternative: low-detail mobile WebGL. Consequence: the same HTML controls and reveal work without animation or WebGL.

## Procedural lighting and rendering budget
Decision: bake a small environment map from three procedural light surfaces, once per scene mount, and render on demand. Reason: metal and black glass need soft reflections to read as physical materials; perpetual animation is unnecessary. Alternatives: downloaded HDR assets, postprocessing, continuous rendering. Consequences: no external assets or licenses, 128-pixel cube faces, shared ring geometry/materials, DPR capped at 1.5. Rendering stops after interpolation settles and while the instrument is hidden or offscreen.

## Preserve disconnected historical code for this checkpoint
Decision: the new entry point imports only the new portfolio components and content; existing model/training modules and unused previous UI remain disconnected. Reason: keep the initial visual milestone reviewable without conflating it with offline research cleanup. Alternative: delete all prior source. Consequence: no prior model data is fetched by the new UI, but old public assets remain in the export until a later path-specific asset audit.

## Superseding decision — Computational Atelier
The Latent Lens direction is rejected and retired. See [[ADR — Replace object showroom with computational atelier]]. The new full-viewport environment replaces the prior visual, interaction and information-architecture decisions. Historical decisions above describe the rejected iteration and are not implementation requirements.

## Recovery implementation decisions
The studio uses enclosed upper architecture and a lower entrance camera after the initial capture read as an exposed cutaway. Neutral daylight separates limestone, walnut, terracotta and smoked glass. Furniture shares a lightly rounded primitive geometry; repeated masonry, lattice and keyboard elements use instancing.

Camera focus is based on elapsed time over 950 ms, rather than accumulated clamped frame deltas, so slow rendering cannot extend the intended movement indefinitely. Reduced motion bypasses interpolation. A selected station both changes the camera and exposes content; workstation displays also change state, while the glass structure reorients on selection.

The initial introduction disappears after exploring instead of becoming low-contrast text. Persistent identity and professional links remain. Project reading uses a nonmodal panel aligned beside the focused workstation; it retains independent scrolling and restores initiating keyboard focus on return.

Static fallbacks are JPEG captures of the actual procedural room (desktop and mobile), not unrelated placeholder art. Standard rendering caps DPR at 1.5; economy rendering caps it at 1.15, removes dynamic shadows and reduces repeated detail. Economy mode activates for narrow viewports, limited reported cores/memory or data-saving preference. Device hints are conservative quality choices, not claims about measured hardware performance.

## Contemporary desk destinations
See [[ADR — Desk destinations and contemporary studio]]. Retain the accepted spatial architecture while removing the cultural theme and whiteboard. Three desk objects map to Projects, Career and CV; conventional navigation uses the identical hash state. Project and CV reading surfaces track actual projected geometry. This keeps spatial continuity without tiny virtual text. Mobile prioritizes readable full-screen interfaces. Detailed tutoring material is confined to the CV.

## Camera and reading separation
A single retargetable 900 ms camera track prevents conflicting transitions. The destination panel fades in only after the matching arrival, while loading/failure mode can show content immediately. Browser history and reduced motion are first-class paths, not alternate implementations. Considered a fixed centered modal; rejected because it breaks the monitor/paper connection.


## After-hours studio and Career correction — 8 September 2026
See [[ADR — After-hours studio and career promotion]]. The later instruction supersedes CV-only tutoring placement: use one continuous Career role with a visible promotion and verified responsibilities. Preserve all destination/camera systems. Address visual flatness through directional evening light, local warm task light, darker material separation, architectural depth and finite entry/selection effects. Considered full-screen bloom; chose emissive geometry and local light bounce to retain clarity and the existing performance tiers.

## The Latent Studio — phase 1

Replace the unsuccessful Warm Aero Home and Projects presentation with a blue-hour computational observatory. Preserve verified content, routes, static export and the existing Career/CV workflows. Keep old visual files for later approved cleanup.

Use a curated deterministic graph of canonical projects, technologies and experience rather than pretending to display an embedding. Reveal structure makes the real relationships discoverable without requiring labels in the default composition.

Use procedural Web Audio with explicit consent and a permanent sound-state control. This avoids external tracks and network audio requests. Quiet and sound entrances are equally available; returning visitors never receive automatic sound without a gesture.

Projects must occupy the full viewport after a physical screen approach. Keep the current project narratives and distinct diagrams; change the chapter presentation rather than rewriting facts. Cursor motion is bounded, damped and disabled for reduced motion. Continuous rendering is restricted to visible animated Home.

## Repository-backed field

Replaced theme-membership connections with a static, inspectable project–concept graph. Evidence comes from OncoLA, LungNoduleClassification, lidc-reader-disagreement, and dchanson/Ruskin documentation, source, manifests, protocol/tests, and public history. The old case-study text remains unchanged even where repositories have evolved: OncoLA now documents CareSignal, and the lung repository has a newer training/evaluation pipeline.

Shared imaging concepts include CT preprocessing, reader annotations, uncertainty, patient-level separation, and Python. OncoLA and the study connect through distinct human-review workflows, without equating clinician review with an operational annotation reference. Protocol proposals are explicitly distinguished from completed model work. Ruskin appears as a contributed collaborative platform, never sole-authored. Specific personal commit attribution remains deferred; repository-level capabilities do not imply authorship of each feature.
