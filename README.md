# LookAtLuna
Look at the phase of the moon for today or for any date.

## Stack
Vite · React 19 · React Three Fiber 9 / drei · Tailwind CSS 4 · Vitest

The phase math (`src/lib/moon.ts`) is a TypeScript port of John Walker's
*moontool* algorithm and libration (`src/lib/libration.ts`) follows Meeus,
*Astronomical Algorithms*; both run entirely in the browser — there is no
backend. Moonrise/moonset uses [astronomy-engine](https://github.com/cosinekitty/astronomy),
which is also the test oracle for the app's own math.

Location, if shared, is rounded to 0.1° and kept only in the browser's
localStorage, along with the hemisphere preference.

## Scripts
```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm test           # unit tests
npm run build      # typecheck + production build to dist/
```

## Deploy
Pushes to `main` run [.github/workflows/deploy.yml](.github/workflows/deploy.yml):
tests, build, then publish `dist/` to GitHub Pages. Asset paths are relative
(`base: './'` in `vite.config.ts`), so the site works under any repo name.

## Roadmap
- [x] **Phase 0 — Housekeeping:** Next 12 → Vite, React 19, R3F 9; Tailwind 4; remove debug code; 4k texture (5.1 MB → 1.2 MB); Vitest
- [x] **Phase 1 — Correct core:** exact `toJulianDate`; stale-date bug fixed; centered 8-bin `phaseName`; tests against published new/full moons and `astronomy-engine` (max error 0.33°, ~38 min, over 1950–2050)
- [x] **Phase 2 — Wire the moon to the data:** date state lives in `App`; directional light from `sunDirection(phase)` = `(sin θ, 0, −cos θ)`, eased via a ref (no per-frame `setState`); camera on +Z with the near side facing it
- [x] **Phase 3 — Date UX:** ◀/▶ day stepping and ←/→ keys, controlled date picker, Today; lunar-cycle scrubber (new moon → new moon); `?date=` URL; info panel with illumination, age, distance, next new/full moon (`findPhase`)
- [x] **Phase 4 — Aesthetic pass:** full-bleed scene with a camera rig that centres the moon in the space the UI leaves; Cormorant Garamond + Inter; glass info panel; scrubber with quarter/full markers; bump-mapped terminator; loading veil; SVG favicon; phone layout
- [x] **Phase 5 — Observer:** Northern/Southern hemisphere view; optical libration (Meeus ch. 53, within 0.12° of astronomy-engine) wobbles the moon month to month; moonrise/moonset from the viewer's location (astronomy-engine, loaded on demand); deployed to GitHub Pages

## Inspiration
- https://codepen.io/seanseansean/pen/vEjOvy
- https://github.com/CoryG89/MoonDemo
- https://code.launchpad.net/~keturn/py-moon-phase/trunk
- https://stevealbers.net/albers/sos/sos.html
