# ADR — Desk destinations and contemporary studio

Status: implementation approved; extends the accepted architectural workspace.

Retain the full-viewport scene, shared geometry, demand rendering, daylight/task lighting, progressive loading, economy tier, and deliberate camera transitions. Refine the studio into a contemporary oak, bone and charcoal interior. Remove cultural ornament, patterned lattice, brick theme, whiteboard and standalone research/teaching interaction. A plant, shelving and noninteractive acoustic artwork provide restrained personal context.

## One navigation contract
Explicit states: home, projects, career, cv. The main monitor, secondary monitor and paper invoke the same navigation function as persistent HTML links. Valid hashes initialize state and support browser Back/Forward. New navigation interrupts from the current camera position; a single camera director owns interpolation, preventing queued/conflicting animations. Escape and Back go to home. Reduced motion cuts directly. Panels enter only after the relevant camera settles; fallback panels do not wait for WebGL.

The monitor’s projected bounds position desktop HTML inside the screen. CV uses the paper’s projected bounds. Mobile uses fixed compositions and full-screen reading below persistent navigation. No important text is baked into the scene.

## Content
Projects: four verified projects with problem, contribution, approach, result, technologies, limitations and an explanatory step diagram. No invented repositories or measurements. Career: chronological education/experience/project graph, with concise selectable context rather than duplicate case studies. CV: complete factual public résumé and technical skills, without phone/address. No PDF download until a real approved asset exists.

The request lists tutoring as a possible Career entry but later specifies that this experience belongs only in CV. Apply the later constraint: Career marks the dated analytical-foundations stage without teaching-role detail; the full tutoring entry appears only in CV. No separate mathematics station survives.

No desk-reference attachment is available in the current turn; use the supplied spatial description without inventing reference-specific details. Existing modified/untracked files are authorized. Deployment files, dependencies, branch, Git identity and remotes remain untouched.


## Superseding correction — 8 September 2026
The later instruction restores the full Mathematics Tutor → Senior Mathematics Tutor Career entry and promotion milestone. The CV-only interpretation above is historical and no longer applies. No teaching object or whiteboard returns. See [[ADR — After-hours studio and career promotion]].
