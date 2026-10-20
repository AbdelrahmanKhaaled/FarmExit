# Phase 4.1 — populated Farm Details visual verification

Date: 19 October 2026. Stopped after Phase 4.1.

## Completed

- Added an isolated Playwright fixture app under `tests/visual/`, bound to localhost and guarded by `FARMEXIT_VISUAL_TEST=1`. It is outside the production route tree and is absent from the production build's route manifest.
- Rendered the existing Wadi El Natrun reference samples using the real components and tokens: five gallery assets, specifications, four facilities, map/location/access, two document rows, request band, three related farms and shared navigation/footer. EN/AR were captured at 1440, 1024 and 390px.
- All fixture image requests decode successfully. Assets are read directly from the existing public asset folders. No fixture data was written to MySQL, exposed on the production UI, or added to a live API response. API/external requests are blocked in populated fixture tests; mutation requests are asserted absent.
- Corrected verified related-card stretching below desktop, scoped to Farm Details. Cards no longer introduce a large blank area above the price to match the tallest sibling.
- Both inline and sidebar contact actions now use the explicit localized “Contact owner via FarmExit” label. Arabic uses “تواصل مع صاحب المزرعة عن طريق FarmExit”. The inline button wraps instead of clipping. Destinations and authentication behavior are unchanged.
- The fixed CTA now measures its actual height with ResizeObserver, reserves space after the footer and sets scroll clearance. This follows responsive visibility, text height and safe-area padding. Styles and observers are restored/removed when the component unmounts. The old fixed 89px spacer before the footer was removed from the Farm Details route.
- Kept FarmExit Score, pending-assessment behavior, offer/request/save actions and all backend/session/data adapters intact. The empty variant verifies that absent facilities, documents and related farms remain omitted and the neutral placeholder is used.

## Comparisons

[Open side-by-side references, before/after renders, overlays and difference maps](../artifacts/farm-details-phase4-1/comparison.html).

| Width | Approved PNG height | Populated before height | Populated after height | Raw differing pixels |
|---|---:|---:|---:|---:|
| 1440 | 5983 | 6178 | 6178 | 15.45% |
| 1024 | 6368 | 6676 | 6744 | 42.06% |
| 390 | 6400 | 7886 | 7975 | 49.12% |

Differences use unscaled top-aligned RGB images, white padding for different heights and a greater-than-32 threshold on any channel. They include deliberate content/Score/offer differences, asset differences and vertical displacement. **These are not passing similarity scores. Full Figma pixel parity remains unachieved.** Extra measured footer clearance and the longer mediated-contact label explain increased small-screen document heights; no content was removed to force a height match.

The original Figma PNGs were not edited. Browser captures were inspected alongside them at all three widths. Arabic captures verify responsiveness/wording, not parity to an Arabic frame, since only English baselines were supplied.

## Remaining visual differences

1. The pre-existing sample adapter deliberately uses different packing/storage and nursery photos. Its greenhouse researcher and sunset planting images differ from the PNG's greenhouse inspector and blue-gloved seedling images. Exact reference originals were not found among the local assets inspected. Existing approved alternatives were retained, explicitly; no new images were synthesized or extracted from screenshots.
2. The PNG displays 24 gallery photos and a +19 overlay. Only five approved local gallery images are present. The fixture truthfully renders 1/5; it does not duplicate assets to invent a count of 24.
3. Score blocks and Make an offer remain enabled as required. They are absent from the PNG and add height to action panels/related cards. The longer explicit contact wording also changes tablet action wrapping.
4. The mobile PNG overlaps facility images and clips their captions. The real component keeps four separate readable image/caption cards. This accounts for much of the mobile height difference; the overlap was not reproduced.
5. Existing sample content differs in some labels, water-source wording, irrigation facts, related-card water/crop text and subtitles. It was not rewritten into live data. Tablet/mobile keep the existing related-farm carousel rather than hiding a real third related farm just to match the two-card tablet example.
6. Minor shared-header/font rendering and image-crop differences remain. Existing shared logo sizing emits a development warning; there are no fixture page runtime errors. No unrelated header/footer or asset redesign was performed.

## Verification

- Isolated Playwright suite: **7 passed**. Six populated EN/AR viewport cases plus absent optional data. Checks include all sections, decoded images, Score presence, no horizontal overflow, explicit mediated-contact labels, no direct phone/email/WhatsApp actions, no mutation requests, footer clearance and scroll-into-view CTA clearance.
- Existing production-route Farm Details suite: **18 passed**, all six EN/AR viewport projects, against the production build and existing API. Covers listing navigation, unknown slugs, Score, gallery dialog, responsive actions and sign-in redirects. No database fixture insertion or request submission.
- Frontend typecheck: passed. Isolated harness `tsc --noEmit -p tests/visual/tsconfig.json`: passed.
- Frontend lint: passed, including RTL direction checks and 15 translation namespaces across both locales.
- Production build: passed; 133 static pages generated; no fixture routes. Existing multiple-lockfile workspace-root warning remains.

Reproduce with the commands in [tests/visual/README.md](../tests/visual/README.md). Only Farm Details presentation, its local regression harness, the generated-test ESLint exclusions and documentation/artifacts changed in this phase. No Backend, Dashboard, database, migrations, API contracts or unrelated product pages were modified. No Figma MCP calls were made.
