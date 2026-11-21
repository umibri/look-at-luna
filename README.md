# LookAtLuna
Look at the phase of the moon for today or for any date.

## Stack
Vite · React 19 · React Three Fiber 9 / drei · Tailwind CSS 4 · Vitest

The phase math (`src/lib/moon.ts`) is a TypeScript port of John Walker's
*moontool* algorithm and runs entirely in the browser — there is no backend.

## Scripts
```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm test           # unit tests
npm run build      # typecheck + production build to dist/
```

## Roadmap
- [x] **Phase 0 — Housekeeping:** Next 12 → Vite, React 19, R3F 9; Tailwind 4; remove debug code; 4k texture (5.1 MB → 1.2 MB); Vitest
- [ ] **Phase 1 — Correct core:** fix `getJD` (drops time of day) and the stale-date bug in `MoonCalculator`; centered 8-bin `phaseName`; tests against published new/full moon times
- [ ] **Phase 2 — Wire the moon to the data:** directional light at `(sin θ, 0, −cos θ)` with `θ = 2π·phase`; camera on +Z; no per-frame `setState`
- [ ] **Phase 3 — Date UX:** day stepping, month scrubber, `?date=` URL, info panel with next new/full moon
- [ ] **Phase 4 — Aesthetic pass:** full-bleed scene, typography, loading state, mobile layout
- [ ] **Phase 5 — Stretch:** hemisphere toggle, libration, moonrise/set, production deploy

## Inspiration
- https://codepen.io/seanseansean/pen/vEjOvy
- https://github.com/CoryG89/MoonDemo
- https://code.launchpad.net/~keturn/py-moon-phase/trunk
- https://stevealbers.net/albers/sos/sos.html
