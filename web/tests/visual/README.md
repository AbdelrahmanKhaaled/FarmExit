# Isolated Farm Details visual fixtures

Run from `web/`:

```sh
npx playwright test --config tests/visual/playwright.config.ts
node tests/visual/compare.mjs
```

Playwright starts a separate Next.js project on **127.0.0.1:3101**, with `FARMEXIT_VISUAL_TEST=1`. Its configuration refuses to start without that flag. The fixture routes live here, outside `src/app`, and do not enter the production build. No production routing, environment configuration, API adapter, seed or database is replaced.

The app renders the real Navbar, FarmDetailsView, FarmGallery, action panels, specifications, facilities, location/access, documents, FarmCards and Footer. It uses the pre-existing `src/lib/data/sample/farm-details.ts` and `sample/farm-listings.ts` adapters. Original public asset bytes are served read-only from `public/images` and `public/brand`. Traversal outside those asset roots is rejected. `/en?variant=empty` checks omission with an explicit test-only empty variant.

Playwright blocks `/api/**` and external requests for populated renders and asserts that no mutation requests occur. Shared save providers may attempt local API reads, but those are aborted. No backend is needed for the fixture suite. The separate live regression suite still uses the real API.

Screenshots are written to `artifacts/farm-details-phase4-1/`: six EN/AR captures at 1440/1024/390px. The initial populated captures are retained as `before-*`; use `VISUAL_CAPTURE=before` only when deliberately recording a new before state. Normal runs write `after-*` and leave Figma baselines untouched.

`compare.mjs` uses the installed Sharp dependency to generate unscaled, top-aligned overlays, difference maps, metrics and a comparison HTML file. It reads the original PNGs in `figma-baselines/farm-details`. Any RGB channel difference greater than 32 marks a pixel red, including intentional Score/offer additions, different assets/content, page shifts and extra footer clearance. **No pixel-parity threshold is asserted.** This suite verifies populated rendering and behavior, and supplies evidence for visual review; it does not call a differing screenshot a pixel-perfect pass.

Known reference differences are documented in `docs/PHASE4_1_FARM_DETAILS_VISUAL_REPORT.md`. In particular, two existing approved local photos differ from the reference PNG, and the PNG clips/overlaps mobile facilities content. No screenshot crops are used as production images.
