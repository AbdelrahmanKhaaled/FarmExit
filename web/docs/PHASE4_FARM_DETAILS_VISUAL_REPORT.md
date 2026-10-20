# Phase 4 — Farm Details visual reconstruction

Date: 19 October 2026. Scope: existing Farm Details UI only. No Phase 5 work.

## References and scope

Confirmed and inspected all three local PNGs:

- `web/figma-baselines/farm-details/Desktop 1440.png`: 1440 × 5983, node `31:1393`.
- `web/figma-baselines/farm-details/Tablet 1024.png`: 1024 × 6368, node `107:6917`.
- `web/figma-baselines/farm-details/Mobile 390.png`: 390 × 6400, node `107:15222`.

Read the inventory, style guidelines, generated tokens, Farm Details components and public data adapter. No Figma MCP calls were made. Existing tokens, components, typography, gallery layouts, colors, request links and data adapters were reused.

## Visual corrections

- Bounded key-fact cards and allowed long live values to wrap without crowding icons or exceeding the column.
- Matched the specifications card's responsive row structure: individual mobile dividers and 60px minimum items; desktop/tablet retain paired items and 14px row padding. Removed redundant nested vertical padding.
- Let tablet price/action content wrap while reserving room for the price.
- Fixed cramped pending-assessment cards locally on Farm Details: pending status moves below the label/note in narrow panels. Shared Score components and published/pending semantics remain unchanged.
- Matched the mobile request band's compact composition. The step explanation remains available to assistive technology; desktop/tablet keep the visible numbered steps. CTA actions and privacy copy remain intact.

Only `FarmDetailsView.tsx`, `FarmActions.tsx`, the Farm Details regression spec and this report were edited, plus generated local screenshot artifacts. Existing unrelated workspace changes were preserved. No API, dashboard, database, migration, auth logic, live data mapping, global tokens, shared navigation or unrelated page source was changed.

## Browser comparisons

Captured and visually inspected full-page before/after screenshots at 1440, 1024 and 390px. Final captures use a separate production server on port 3100, with the existing API at port 4001 and existing published record `demo-dash-1-sale`. That record is explicitly demo data already supplied by the local API; this task created no listings or farm data.

Final screenshots cover English and Arabic at all three widths. Arabic captures are responsive smoke checks; the supplied baseline images are English, so these do not establish Arabic Figma parity.

| Check | Desktop | Tablet | Mobile |
|---|---|---|---|
| Baseline width | 1440 | 1024 | 390 |
| Live heading size | 52px | 40px | 30px |
| Horizontal overflow, EN and AR | None | None | None |
| Gallery main-image height retained | 560px | 520px | 320px |
| English live page height, before → after | 3215 → 3199 | 3570 → 3554 | 4162 → 3831 |

Page heights reflect current content, not the Figma example's complete farm record; they are not pixel-match scores. The mobile reduction is primarily the compact request band, specification spacing and improved pending-card wrapping. Desktop/tablet geometry was already close and received targeted corrections.

Artifacts:

- [Side-by-side reference, before and after comparison](../artifacts/farm-details-phase4/comparison.html)
- [Desktop after](../artifacts/farm-details-phase4/after-en-1440.png)
- [Tablet after](../artifacts/farm-details-phase4/after-en-1024.png)
- [Mobile after](../artifacts/farm-details-phase4/after-en-390.png)
- [Measurements](../artifacts/farm-details-phase4/measurements.json)

The artifact directory also contains all three before captures and the three Arabic after captures.

## Validation

- `npm run typecheck` in `web/`: passed, including the final test changes.
- `npm run lint` in `web/`: passed; direction checks and all 15 message namespaces passed. Targeted ESLint/Prettier checks repeated for the final changed files.
- `npm run build` in `web/`: passed; 133 static pages generated. Existing multiple-lockfile/workspace-root warning remains.
- `PORT=3100 npx playwright test tests/e2e/farm-details.spec.ts --workers=2`: **18 passed**, no skips, across six viewport/locale projects.
- Regression coverage: unknown slug, listing navigation, Score presence, no horizontal overflow, lightbox open/Escape close, responsive fixed action visibility after scrolling, and gated request redirect to sign-in. No database writes or authenticated submissions were performed.
- React review: existing component boundaries/hooks retained, observer cleanup unchanged, live values preserved, request/offer/save actions retained, focus-managed lightbox retained, logical directions and mobile step explanation preserved.

Chromium and the production build required sandbox escalation for browser launch and the installed SWC native cache. Both succeeded on retry. No dependency/configuration changes were needed.

## Remaining mismatches and verification limits

Full visual reconstruction is **not pixel-identical** to the example farm, and the following differences remain explicit:

1. The public adapter intentionally supplies one neutral placeholder. It exposes no approved gallery media. The designed five-photo mosaic/thumbnail arrangement cannot be demonstrated with the current live record. The existing multi-photo layout remains intact; no photos were substituted into live data.
2. Public facilities, documents, nearby/access details and related farms are absent from this route's current data. Those sections remain omitted. Their complete populated rendering and image crops were not browser-verified in this task, and no fixture was connected to the production route.
3. The live listing's name, activity, description, price, reference and Score availability differ from the Figma example. Longer content wraps honestly. The required Score and Make an offer action remain visible even though the approved screenshots do not show them.
4. The supplied mobile reference visibly overlaps/crops facility photographs and omits their labels. That clipping was not reproduced by changing the existing accessible facilities cards; their populated state remains unverified while the public API supplies no facilities.
5. Existing shared header/footer, map illustration and complete multi-photo asset parity were not redesigned. No claim of whole-page pixel parity or a numerical image-difference threshold is made.

Phase 4 stops here. No Phase 5 implementation was started.
