# Sarseej Shrestha — Computational Atelier

An after-hours computational studio where the desk is the navigation: main monitor → Projects, secondary monitor → Career, desk paper → CV. Persistent navigation and labelled objects share hash-based states, directed camera transitions and accessible semantic reading interfaces.

## Development

Use the existing npm installation and run `npm run dev`. The deployment workflow uses Node 20. The application remains a static Next.js export and needs no API keys, model server, database, remote fonts, or external scene assets.

## Validation

- `npm run lint`
- `./node_modules/.bin/tsc --noEmit --incremental false`
- `npm run build`
- `node scripts/verify-protection.mjs`

The deployment workflow, framework configuration, domain, manifest, lockfile, compiler configuration, CSS build configuration, and ignore rules are protected. SHA-256 baselines live in `project-vault/protected-files.json`. Investigate any mismatch before proceeding; do not silently restore a changed protected file.

## Browser review

The existing external browser tool installation is reused; no application dependencies were added. Serve the static build:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory out
```

Run `node scripts/browser-check.mjs` in another terminal. The script uses Playwright and axe from `/private/tmp/personalportfolio-browser-review` and the installed Chrome executable. `PORTFOLIO_TEST_TOOLS`, `PORTFOLIO_BROWSER`, and `PORTFOLIO_PREVIEW_URL` can override these local defaults. The basic static server exposes the CV as `/resume.html`; GitHub Pages resolves the exported clean route `/resume`.

Current iteration screenshot evidence is in `project-vault/review/after-hours/`. Tests cover the required desktop/tablet/mobile sizes, station hover, camera focus, project selection, Back/Escape, keyboard equivalence, reduced motion and unavailable WebGL. Software WebGL results do not establish hardware frame rate.

## Architecture

- `app/`: static entry point, global visual system, and printable CV.
- `components/portfolio/Atelier.tsx`: professional navigation, hash state, semantic panels and progressive enhancement.
- `components/portfolio/AtelierRoom.tsx`: procedural studio, shared resources, architectural instancing, labelled hitboxes and bounded camera director.
- `components/portfolio/atelier-types.ts`: station definitions and shared interface types.
- `lib/content/portfolio.ts`: approved factual project and experience content.
- `project-vault/`: current direction, decisions, deployment protection, progress and roadmap.

The small glass sculpture is a noninteractive detail. It does not display model inference or measured interventions. Real offline experiment data remains a later phase. Existing historical model/training modules and previous disconnected UI are outside this visual recovery pass; the new page does not import them or fetch their model assets.
