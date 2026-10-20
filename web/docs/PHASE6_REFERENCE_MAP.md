# Phase 6 — Add Farm and listing management reference map

Authoritative local sources: `04 · Add Farm.pdf` (45 pages), `08 · Arabic Web + Client Demo.pdf` (11 pages). Both preliminary concepts, `Owner Dashboard.pdf` and `Add Farm Flow.pdf`, were read and excluded as implementation targets. All 58 PDF pages were rendered locally; contact sheets and detailed step/state references were reviewed. No Figma MCP calls were used.

Routes below include an `/en` or `/ar` prefix. The PDFs do not expose individual Figma frame IDs; no IDs have been invented.

| Add Farm PDF pages | Reference | Existing/new frontend presentation |
| --- | --- | --- |
| 1–4 | Homepage and authentication context | Existing public/Auth UI, unchanged |
| 5 | Listing introduction | Existing Add Farm entry now opens the functional first wizard step; no extra marketing gate |
| 6 | Farm basics | `/my/farms/new`, `/my/farms/[id]/list`; `AddFarmWizard` basics |
| 7 | Location and land | Same wizard, step 2; accepted area/soil fields only |
| 8 | Agriculture and facilities | Step 3; actual taxonomy, specification and facility APIs |
| 9–10 | Sale/rent listing details | Step 4; whole EGP sale prices, EGP/feddan/year rent, actual availability/description |
| 11 | Photos | Step 5; `FarmMediaPanel`, private previews, real upload progress |
| 12 | Documents | Step 6; `RequestDocumentsPanel`, real request-specific metadata/uploads |
| 13 | Review and edit sections | Step 7; controlled form summary and edit-step actions |
| 14 | Submitted confirmation | Confirmed submission state; tracking link to `/my/requests/[id]` |
| 15 | Input errors | Inline required indicators and retained form values; no save before valid required farm fields |
| 16–18 | Photo/document transfer and failure variants | Private upload panels; byte progress, awaiting confirmation, validation/retry errors |
| 19 | Final review variants | Same review step; backend values only |
| 20 | Submitting overlay | `SubmissionProgress`, shown during the actual submit request |
| 21 | Review draft | Same review/edit actions |
| 22 | Save and exit | Save/leave confirmation; failed saves do not navigate away |
| 23 | Resume | Backend-populated wizard; native URL records current step and request id |
| 24 | My Farms | `/my/farms`; actual status filters/counts, resume/track/workspace actions |
| 25 | Resume listing details | Existing saved values restore from farm/listing APIs |
| 26 | Farm workspace and review progress | `/my/farms/[id]`, `/my/requests/[id]`; real history/reviews/documents |
| 27–28 | Requested document corrections | Authorized same-slot new copy and listing resubmission, actual editable statuses |
| 29 | Resubmitted confirmation | Same confirmed review-state response gate |
| 30 | Farm list statuses | `MyFarmsList` using current user's listing requests |
| 31–33 | Tablet basics/photos/review | Responsive wizard: main form and review guidance; collapsible step navigator |
| 34–36 | Mobile OTP/profile context | Existing Phase 5 authentication, unchanged |
| 37 | Mobile introduction | No extra introduction step; existing authenticated entry opens basics |
| 38–39 | Mobile basics and validation | Compact task header, short farm-type labels, progress and fixed action bar |
| 40 | Mobile location/agriculture | Accepted controls and honest unsupported-map notice |
| 41 | Mobile listing/photos/documents | Responsive cards, uploads and private thumbnails |
| 42 | Mobile document/review variants | Same request-scoped document panel and summaries |
| 43 | Mobile submitted state | Confirmed-only success and tracking actions |
| 44 | Mobile save/exit sheet | Existing accessible `Dialog` pattern, with saved/unsaved semantics preserved |
| 45 | Mobile changes requested | Genuine feedback, editable request documents and resubmission |

| Arabic PDF page | Reference | Implementation |
| --- | --- | --- |
| 1 | Listing introduction | No extra marketing gate added |
| 2–3 | Basics and errors | Arabic labels, font, field alignment and short type choices |
| 4 | Location | Logical governorate/area placement; unsupported pin/road controls omitted |
| 5 | Agriculture/facilities | Actual API taxonomies, Arabic labels and optional supported production fields |
| 6 | Sale/rent and price | Sale remains the logical first choice on the right; numeric values are not transformed into different units |
| 7 | Photos | Private previews and upload controls |
| 8 | Documents | Private request metadata, new-copy version handling, validation |
| 9 | Review | Arabic summary labels and edit actions |
| 10 | Submission | Accessible pending overlay |
| 11 | Success | Confirmed-only submission and actual status |

## Contract mapping

| Operation | Existing backend contract / frontend adapter | Preserved rule |
| --- | --- | --- |
| Farm create/update | `POST /farms`, `PATCH /farms/:id` | Exact allowed DTO fields; no owner/status/coordinates/publication fields |
| Farm specifications | `GET/PATCH /farms/:id/specifications` | Approved crop taxonomy; only supported production text keys; missing loaded production data is never overwritten |
| Facilities | Existing `/farms/:id/facilities` GET/POST and per-id PATCH | Four supported facility types; owner/manager editing remains enforced by backend |
| Media | Existing `/farms/:id/media` and per-file private GET | Existing auth cookies; private JPEG/PNG/WebP; no public URL conversion or publication claim |
| Listing drafts | `POST /farms/:id/listing-requests`, `GET /listing-requests/mine`, `GET/PATCH /listing-requests/:id` | Owner-scoped drafts; edits only in draft/changesRequested; correct sale/rent fields and units |
| Submission | Existing `POST /listing-requests/:id/submit` | Empty submit body forwarded; success requires returned `underFarmExitReview`; never sets public visibility |
| Documents | Existing `GET/POST /requests/:id/documents`, private download | Request creator scope and draft/changesRequested policy; same-slot new copies preserve earlier versions |
| Tracking | Existing `GET /requests/:id` | Render actual status history/reviews only; no synthetic future timeline or promised review SLA |

Only missing **web adapters** for existing backend endpoints were added. The backend, dashboard, database, migrations, seed data, public Farm Details and authentication were not modified.

## Supported and blocked details

- Backend-required farm name/type/area/governorate must exist before the first save. Step 1 can continue locally, but does not claim a saved draft. Save/continue and mobile Save report success only after API confirmation.
- Controlled values and mounted upload/facility panels persist when switching steps. Selected files must be uploaded or explicitly cleared before saving/continuing/submitting. Bytes sent at 100% are shown as awaiting server confirmation.
- Resume restores server-confirmed farm, listing and specification values. The active URL records the step. There is no backend wizard checkpoint: entering a resume link without a step starts at basics rather than inventing completion of optional fields. Progress counts visited steps, not a fictional persisted completeness score.
- Exact pins, road distances and unsupported land/access fields are absent from accepted DTOs; no dummy map or fake saving is supplied.
- Photo ordering, cover selection, deletion and true image replacement have no current endpoint. Existing uploads/alt text/illustrative flag remain available.
- The PDF's fixed three required documents have no confirmed backend requirements contract. Real document metadata is shown, and the existing supporting-document reference/type fields remain functional. New copies append to the same slot; old copies are not silently deleted.
- Only supported facility types are offered, not decorative checkboxes for unsupported facility concepts.
- No autosave, three-working-day SLA, publication, approval, owner contact, private coordinates or user role is fabricated.
- The existing portal layout is reused for farms/workspaces/tracking. Only wizard routes switch to the compact approved task shell; unrelated portal pages retain Phase 5 presentation.

## Review artifacts

[Comparison viewer](../artifacts/phase6/comparison.html), [Add Farm reference contact sheet](../artifacts/phase6/reference/add-farm/contact-sheet.png), [Arabic reference contact sheet](../artifacts/phase6/reference/arabic/contact-sheet.png).

Screenshots are generated by a separate environment-guarded visual app with browser-intercepted responses and approved local images. No synthetic record, photo, document or score is inserted into the live application or database. Printed PDF margins and multi-frame pages are not pixel-registered; no numerical parity score is claimed.
