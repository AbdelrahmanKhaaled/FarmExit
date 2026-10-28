# Dashboard Final Module Matrix

**Legend:** COMPLETE — CODE VERIFIED | COMPLETE — LIVE VERIFIED | PARTIAL | BLOCKED BY BACKEND | DEFERRED

| Module | Route | Roles / permissions | Read APIs | Write APIs | Status | Evidence |
|--------|-------|---------------------|-----------|------------|--------|----------|
| Overview | `/admin` | Admin | aggregates | — | COMPLETE — CODE VERIFIED | `page.tsx`, overview APIs |
| Analytics | `/admin/analytics` | Admin | `/staff/admin/analytics` | — | COMPLETE — CODE VERIFIED | analytics page |
| Users | `/admin/users` | Admin | `/staff/admin/users` | — | COMPLETE — CODE VERIFIED | list + detail |
| Administrators | `/admin/administrators` | Admin | users filter | — | PARTIAL | list only; no staff CRUD API |
| Farms | `/admin/farms` | Admin | `/staff/admin/farms` | — | COMPLETE — CODE VERIFIED | list + detail |
| Farm detail | `/admin/farms/[id]` | Admin | farm + **GET private-location** | — (location PATCH owner-only) | PARTIAL | private read UI added |
| Evaluations | `/admin/evaluations` | `evaluations.manage` | `/staff/admin/evaluations` | — | COMPLETE — CODE VERIFIED | inbox |
| Evaluation create | `/admin/evaluations/new` | `evaluations.manage` | farm context | `POST /farms/:id/evaluations` | COMPLETE — CODE VERIFIED | DASH-003 |
| Evaluation detail | `/admin/evaluations/...` | `evaluations.manage` | `GET /farms/.../evaluations/:id` | `PATCH`, `POST …/checks` | COMPLETE — CODE VERIFIED | DASH-004 |
| Listings | `/admin/listings` | `requests.read` | `/staff/listing-requests` | decision/publish modules | COMPLETE — CODE VERIFIED | + hub forwarding link |
| Listing pipeline | `/admin/listing-pipeline` | Admin | publication-queue | publish | COMPLETE — CODE VERIFIED | |
| Unified requests | `/admin/requests` | `requests.read` | `/staff/requests` | assign/review/forward/status | COMPLETE — CODE VERIFIED | DASH-002/006 |
| Proposals | `/admin/proposals` | admin/caseAgent + read | `/staff/purchase-proposals` | assignments | COMPLETE — CODE VERIFIED | + embedded forwarding |
| Co-purchase | `/admin/co-purchase` | admin/caseAgent | `/staff/co-purchase-groups` | create/patch/members | COMPLETE — CODE VERIFIED | member PATCH added |
| Farm details | `/admin/farm-details` | `requests.read` | dedicated staff API | decide action | COMPLETE — CODE VERIFIED | + forwarding embed |
| Farm management | `/admin/farm-management` | `requests.read` | dedicated API | decide | COMPLETE — CODE VERIFIED | hub link pattern |
| Partnerships | `/admin/partnerships` | `requests.read` | dedicated API | decide | COMPLETE — CODE VERIFIED | |
| Partnership apps | `/admin/partnerships/applications` | `requests.read` | dedicated API | decide | COMPLETE — CODE VERIFIED | |
| Verification | `/admin/verification` | `requests.read` | dedicated API | decide | COMPLETE — CODE VERIFIED | |
| Communications | `/admin/communications` | `communication.relay` | cases/messages | send/relay/status | COMPLETE — CODE VERIFIED | pagination load older |
| Audit logs | `/admin/audit-logs` | Admin | audit API | — | COMPLETE — CODE VERIFIED | |
| Session | login/BFF | staff dashboard audience | `/admin-auth/*`, `/staff/me` | — | COMPLETE — CODE VERIFIED | DASH-001 |

**BLOCKED BY BACKEND (not dashboard failures):** staff membership CRUD, website notifications, user document catalog, public discovery marketplaces, staff PATCH private location.
