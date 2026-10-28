# FarmExit — Cross-App Integration Gap Map (Stage 1)

**Date:** 2026-10-21
**Mode:** Read-only audit — source inspected, no implementation.
**Apps:** `api/` (:4001), `web/` (:3000), `dashboard/` (:3003).
**References:** `docs/BACKEND_RULES.md`, `web/docs/FINAL_FRONTEND_COMPLETENESS_AUDIT.md`, live controllers and BFF routes.

---

## Executive summary

The **backend exposes a broad, staff-scoped REST surface** (website JWT + dashboard JWT audiences) with clear permission decorators. The **website BFF** covers essentially all approved **user** workflows. The **admin dashboard** wires most **admin/superAdmin** operational modules to real `/staff/*` and `/staff/admin/*` endpoints; overview and analytics use **live aggregates**, not hardcoded KPIs.

**Largest cross-app tensions:**

1. **Dashboard console is gated to `admin` / `superAdmin` only** (`staffHasDashboardConsoleAccess`) while many **staff APIs** (`@StaffOnly`, case agents, reviewers) exist — **case agents cannot use the current dashboard UI** for communications or assigned work without a product/architecture decision.
2. **Website** gaps are mostly **BLOCKED** (notifications, document catalog, public discovery) or **manual UAT** — see website section.
3. **Dashboard** has **partial** wiring: forwarding **decisions**, evaluation **create/checks**, **private farm location**, generic request **status** transitions, and **role management** APIs are missing or UI-incomplete.
4. **No user-facing notifications API** and **no website notifications** — internal audit exists for admins only.

---

## Legend

| Integration state | Meaning |
|-------------------|---------|
| **Complete** | Intended app calls real API; CRUD/submit paths connected; errors surfaced |
| **Partial** | Read or subset of writes connected; missing actions or weak UX |
| **Disconnected** | UI exists but does not call API, or wrong contract |
| **Blocked** | No approved backend contract |
| **Internal** | API exists; not intended for website or dashboard UI |
| **N/A** | Wrong audience by design |

**Audience:** `website` = mobile OTP JWT (`auth_audience` website); `dashboard` = email/password JWT (`auth_audience` dashboard); staff routes accept dashboard tokens with `StaffOnly` / permissions.

---

## 1. Cross-application integration matrix

### 1.1 Authentication & sessions

| Capability | Backend | Endpoint(s) | Audience / guard | Intended app | Integrated? | Data source | Actions | State |
|------------|---------|-------------|------------------|--------------|-------------|-------------|---------|-------|
| Website OTP request/verify | Yes | `POST /auth/otp/request`, `POST /auth/otp/verify` | Public + rate limit | Website | **Complete** | Real API via `web/src/app/api/auth/*` | Create session | UAT needs dev OTP |
| Website refresh/logout/me | Yes | `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | Website JWT | Website | **Complete** | BFF + cookies | Read session | D — live UAT |
| Profile complete / patch | Yes | `POST /auth/profile/complete`, `PATCH /auth/profile` | Website JWT | Website | **Complete** | BFF | Update | D |
| Dashboard login/refresh/logout/me | Yes | `POST /admin-auth/login`, `refresh`, `logout`, `GET /admin-auth/me` | Dashboard JWT | Dashboard | **Complete** | `dashboard/src/app/api/admin/auth/*` | Session | D |
| Staff identity | Yes | `GET /staff/me` | Staff (dashboard token) | Dashboard | **Complete** | `session.server.ts` | Read roles | Used on every load |

### 1.2 Users, staff & permissions

| Capability | Backend | Endpoint(s) | Audience / guard | Intended app | Integrated? | Notes |
|------------|---------|-------------|------------------|--------------|-------------|-------|
| Platform user directory | Yes | `GET /staff/admin/users`, `GET /staff/admin/users/:id` | `@StaffDashboardOnly` + admin roles | Dashboard | **Complete** | `/admin/users`, `/admin/users/[id]` |
| Administrator listing | Yes | Same users API with query filter | Dashboard | **Partial** | `/admin/administrators` — list only; **no create/disable staff membership API exposed in controllers** |
| Assignable staff (reviewer/case agent) | Yes | `GET /staff/admin/assignable-staff` | Admin | Dashboard | **Complete** | Used by assignment forms |
| Staff role / permission CRUD | **No HTTP module found** | — | — | Dashboard | **Blocked** | Membership exists in DB; no staff-management controller in `api/src/modules` |
| Farm ownership (user) | Yes | `GET/POST/PATCH /farms`, nested details | Website JWT | Website | **Complete** | BFF under `/api/farms` |
| Farm relationships (staff read) | Yes | Via `GET /staff/admin/farms/:id` | Admin | Dashboard | **Complete** | Relationships table on farm detail |
| Private coordinates | Yes | `GET/PUT /farms/:id/private-location` | Staff + permission | Dashboard (staff) | **Partial** | **No dashboard UI** calls private-location |

### 1.3 Farms, media, facilities, documents

| Capability | Backend | Endpoint(s) | Intended app | Integrated? | Notes |
|------------|---------|-------------|--------------|-------------|-------|
| Farm CRUD & specs | Yes | `farms.controller`, `farm-details.controller` | Website | **Complete** | BFF |
| Media upload/serve | Yes | `media.controller` under `/farms/:id/media` | Website | **Complete** | BFF file routes |
| Facilities | Yes | `/farms/:id/facilities` | Website | **Complete** | BFF |
| User request documents | Yes | `requests.controller` + staff doc review | Website + Dashboard | **Complete** | Website `RequestDocumentsPanel`; dashboard `RequestDocumentsPanel` + PATCH via `platform.ts` |
| Staff document download | Yes | Staff request document routes | Dashboard | **Complete** | BFF proxy `/api/admin/staff/requests/.../documents/[id]` |
| User-wide document catalog | **No** | — | Website | **Blocked** | `/my/documents` empty state |

### 1.4 Listing requests, review, publication, score

| Capability | Backend | Endpoint(s) | Intended app | Integrated? | Notes |
|------------|---------|-------------|--------------|-------------|-------|
| Owner listing draft/submit | Yes | `/farms/:id/listing-requests`, `/listing-requests/:id`, sale-terms | Website | **Complete** | Wizard + BFF |
| Quick Sale / installments / exchange terms | Yes | `PUT/GET .../sale-terms` | Website | **Complete** | Stage 1E |
| Staff listing list/detail | Yes | `GET /staff/listing-requests`, `GET :id` | Dashboard | **Complete** | `/admin/listings` |
| Publication queue | Yes | `GET /staff/listing-requests/publication-queue` | Dashboard | **Complete** | `/admin/listing-pipeline` |
| Assign reviewer/case agent | Yes | `PUT /staff/listing-requests/:id/assignments` | Dashboard | **Complete** | `assignListingStaffAction` |
| Review decision | Yes | `POST /staff/listing-requests/:id/decision` | Dashboard | **Complete** | `decideListingReviewAction` |
| Publish | Yes | `POST /staff/listing-requests/:id/publish` | Dashboard | **Complete** | `publishListingAction` |
| Public marketplace | Yes | `GET /marketplace/farms`, `GET /marketplace/farms/:slug` | Website | **Complete** | Some filter params unsupported publicly |
| Saved listings | Yes | `GET/POST/DELETE /marketplace/saved` | Website | **Complete** | |
| FarmExit evaluations (staff) | Yes | `/farms/:farmId/evaluations` CRUD + checks | Dashboard | **Partial** | Inbox + PATCH; **no create UI**; **checks read-only** |
| Public score on listing | Yes | Embedded in publication/marketplace DTOs | Website | **Complete** | Null when unset |
| Admin farm directory | Yes | `GET /staff/admin/farms` | Dashboard | **Complete** | No private pin in DTO |

### 1.5 Purchase proposals & co-purchase

| Capability | Backend | Endpoint(s) | Intended app | Integrated? | Notes |
|------------|---------|-------------|--------------|-------------|-------|
| Buyer create/edit proposals | Yes | `/marketplace/farms/:slug/purchase-proposals`, `/purchase-proposals` | Website | **Complete** | BFF |
| Staff list/detail proposals | Yes | `GET /staff/purchase-proposals`, `GET :id` | Dashboard | **Complete** | `/admin/proposals` |
| Assign case agent to proposal | Yes | `PUT /staff/purchase-proposals/:id/assignments` | Dashboard | **Complete** | No staff “approve deal” API (by design) |
| Co-purchase groups | Yes | `POST/GET/PATCH /staff/co-purchase-groups`, members | Dashboard | **Partial** | Pages + `co-purchase.ts` actions; verify all member ops in UAT |

### 1.6 Farm details inquiries

| Capability | Backend | Intended app | Integrated? |
|------------|---------|--------------|-------------|
| User create/submit | Yes — `/farm-details-requests` | Website | **Complete** |
| Staff list/review | Yes — `/staff/farm-details-requests` | Dashboard | **Complete** — `decideFarmDetailsAction` |

### 1.7 Management & professional

| Capability | Backend | Intended app | Integrated? |
|------------|---------|--------------|-------------|
| Owner management requests | Yes — `/farm-management-requests`, nested create | Website | **Complete** |
| Staff review | Yes — `/staff/farm-management-requests` | Dashboard | **Complete** |
| Professional profile/capabilities | Yes — `/professional-profile` | Website | **Complete** |
| Verification requests | Yes — `/professional-verification-requests` | Website | **Complete** |
| Staff verification review | Yes — `/staff/professional-verification-requests` | Dashboard | **Complete** |
| Public management discovery | **No** | Website | **Blocked** — informational `/management` only |

### 1.8 Partnerships

| Capability | Backend | Intended app | Integrated? |
|------------|---------|--------------|-------------|
| Owner partnership requests | Yes | Website | **Complete** |
| Applicant applications | Yes | Website | **Complete** |
| Staff partnership review | Yes — `/staff/partnership-requests` | Dashboard | **Complete** |
| Staff application review | Yes — `/staff/partnership-applications` | Dashboard | **Complete** |
| Owner accept/decline applications | **No contract** | Website | **Blocked** (Phase 8) |
| Public partnership discovery | **No** | Website | **Blocked** — informational `/partnerships` |

### 1.9 Unified requests, assignments, forwarding

| Capability | Backend | Endpoint(s) | Dashboard | State |
|------------|---------|-------------|-----------|-------|
| Unified request inbox | Yes | `GET /staff/requests`, `GET :id` | `/admin/requests` | **Complete** |
| Assign reviewer/case agent | Yes | `PUT /staff/requests/:id/assignments` | Request detail | **Complete** |
| Generic review (non-specialized) | Yes | `POST /staff/requests/:id/reviews` | Request detail | **Complete** when not specialized |
| Forward to recipient | Yes | `POST /staff/requests/:id/forwardings` | Forwarding panel | **Complete** |
| Forwarding decision | Yes | `POST /staff/requests/:id/forwardings/:forwardingId/decision` | — | **Disconnected** — **no dashboard UI** |
| Request status transition | Yes | `POST /staff/requests/:id/status` | — | **Partial** — no dedicated action in `requests.ts` |
| Specialized workflows | Yes | Per-type `.../decide` or `.../reviews` | Type-specific pages | **Complete** via `workflows.ts` |

### 1.10 Communication & realtime

| Capability | Backend | Website | Dashboard | State |
|------------|---------|---------|-----------|-------|
| Open case / list cases | Yes — `/communication/cases` | `/my/messages` | `/admin/communications` | **Complete** |
| Messages (user) | Yes — `POST/GET .../messages` | `ConversationView` + BFF | — | **Complete** |
| Messages (staff) | Yes — `/staff/communication/cases/...` | — | Case workspace | **Complete** |
| Staff relay | Yes — `POST .../relay` | — | `relayMessageAction` | **Complete** |
| Case status | Yes — `PATCH .../status` | — | `updateCaseStatusAction` | **Complete** |
| Socket.IO ticket | Yes — website + staff `realtime-ticket` | BFF + hook | BFF + hook | **Complete** code; **D** live E2E |
| Inbox enrichment (previews/unread) | **No fields** | Partial UI | Partial UI | **Blocked** |

### 1.11 Analytics, audit, health

| Capability | Backend | Dashboard | State |
|------------|---------|-----------|-------|
| Dashboard overview KPIs | Yes — `GET /staff/admin/dashboard/overview` | `/admin` | **Complete** — real DB aggregates |
| Work queue counters | Yes — `GET /staff/admin/work-queue` | Overview | **Complete** |
| Analytics report | Yes — `GET /staff/admin/analytics` (+ split endpoints) | `/admin/analytics` | **Complete** |
| Audit logs | Yes — `GET /staff/admin/audit-logs` | `/admin/audit-logs` | **Complete** |
| User notifications module | **Not found** | — | **Blocked** |
| Health | Yes — `GET /health` | Internal | **Internal** |

---

## 2. Website integration gaps (Objective B)

Preserving existing website design; no redesign in this stage.

| ID | Priority | Module | API / BFF | Route(s) | Current | Expected | Files (indicative) |
|----|----------|--------|-----------|----------|---------|----------|-------------------|
| WEB-001 | **BLOCKED** | Notifications | None | `/my/notifications` | Coming soon empty | Real list/read API | `web/src/app/[locale]/my/notifications/page.tsx` |
| WEB-002 | **BLOCKED** | Documents hub | Per-request only | `/my/documents` | Gap note | Catalog or redirect UX | same |
| WEB-003 | **BLOCKED** | Public mgmt/partnership discovery | None | `/management`, `/partnerships` | Informational | Only if API approved | marketing pages |
| WEB-004 | **BLOCKED** | Messaging inbox richness | Case list DTO | `/my/messages` | Case/request IDs only | Previews when API extends | `MessagesInbox.tsx` |
| WEB-005 | **P1** | Marketplace filters | Partial query support | `/farms` | Some filters non-functional server-side | Hide or align with `marketplace` API | `use-marketplace-listings.ts`, `MarketplaceSearch` |
| WEB-006 | **P2** | Public navbar session | `GET /auth/me` | Public pages | May not show session | Optional me fetch in `PublicNavbar` | `PublicNavbar.tsx`, BFF |
| WEB-007 | **P2** | Homepage samples | N/A | `/` | Labeled samples | Keep labels; optional CMS later | `features/home/*` |
| WEB-008 | **D** | All authenticated writes | Full BFF | `/my/*` | Wired in code | Live OTP UAT | Phase 10 authenticated spec |
| WEB-009 | **D** | Realtime messaging | Socket + REST | `/my/messages/[caseId]` | Implemented | Three-party live test | `useCommunicationSocket.ts` |

**Website verdict:** No evidence of **fake success** on primary portal writes. Gaps match `FINAL_FRONTEND_COMPLETENESS_AUDIT.md`; re-verified BFF families under `web/src/app/api/` (auth, farms, listing, marketplace, requests, workflows, communication).

---

## 3. Dashboard integration gaps (Objective C)

| ID | Priority | Module | API endpoint | Dashboard route | Current | Expected | Files | Risk |
|----|----------|--------|--------------|-----------------|---------|----------|-------|------|
| DASH-001 | **P0** / **BLOCKED** | Console access for case agents | Many `@StaffOnly` routes | All `/admin/*` except login | Non-admin → `/admin/forbidden` | Product: agent workspace OR expand console ACL | `session.server.ts`, `(console)/layout.tsx` | Agents cannot relay messages in UI |
| DASH-002 | **P1** | Forwarding decision | `POST .../forwardings/:id/decision` | `/admin/requests/[id]` | List + create only | Owner decision capture UI | `RequestForwardingPanel.tsx`, new action | Workflow incomplete |
| DASH-003 | **P1** | Evaluation create | `POST /farms/:farmId/evaluations` | `/admin/evaluations` | Inbox + edit only | Create evaluation from farm | evaluations pages, new action | Score workflow blocked |
| DASH-004 | **P1** | Evaluation checks write | `POST/PUT .../checks` | `/admin/evaluations/...` | Read-only table | Edit check status/notes | `EvaluationEditPanel.tsx` | Score incomplete |
| DASH-005 | **P1** | Private farm location | `GET/PUT /farms/:id/private-location` | `/admin/farms/[id]` | Not shown | Staff-only map/pin panel | farm detail page | Reviewers lack pin access in UI |
| DASH-006 | **P1** | Request status API | `POST /staff/requests/:id/status` | Request hub | Not exposed | Explicit status tool when rules allow | `requests.ts`, `RequestActions` | Ops rely on specialized decides only |
| DASH-007 | **P2** | Nav icons | — | Sidebar | All items use `IconOverview` | Distinct icons per module | `AdminSidebar.tsx`, `design-system/icons` | UX confusion |
| DASH-008 | **P2** | Filter UX | Various list APIs | Lists (communications, evaluations, etc.) | Raw `<input>` filters | Shared `FilterBar` + validated enums | multiple `page.tsx` | Invalid filter values |
| DASH-009 | **P2** | Generic success copy | — | Action panels | Generic `success` string | Differentiate revalidation failures | `ListingActions`, `RequestActions` | False confidence |
| DASH-010 | **DEFERRED** | Settings nav | — | `/admin/settings` | `enabled: false` | Future | `admin-navigation.ts` | — |
| DASH-011 | **BLOCKED** | Staff RBAC admin UI | No API | — | None | Membership CRUD | — | Requires new backend |
| DASH-012 | **D** | End-to-end staff flows | All | All modules | Code-complete for admin role | Browser UAT with staff account | — | — |

**Not gaps (confirmed wired):** Listing review/publish, specialized decides, proposal case-agent assign, co-purchase staff routes, communications send/relay/status, document review PATCH, analytics/overview, audit log list, realtime ticket BFF.

---

## 4. Prioritized backlog (cross-app)

### P0
| ID | Item | App | Phase |
|----|------|-----|-------|
| DASH-001 | Resolve case-agent vs admin-only console (product decision then ACL or separate shell) | Dashboard | 1 |

### P1
| ID | Item | App | Phase |
|----|------|-----|-------|
| DASH-002 | Forwarding decision UI | Dashboard | 2 |
| DASH-003–004 | Evaluation create + check writes | Dashboard | 2 |
| DASH-005 | Private location on farm detail | Dashboard | 2 |
| DASH-006 | Request status action (if ops need it) | Dashboard | 2 |
| WEB-005 | Marketplace filter honesty | Website | 4 |

### P2
| ID | Item | App | Phase |
|----|------|-----|-------|
| DASH-007–009 | Nav icons, filters, messaging | Dashboard | 3 (with redesign) |
| WEB-006–007 | Navbar session, copy polish | Website | 4 |

### BLOCKED
WEB-001–004, WEB-003, DASH-011, public discovery, notifications API, inbox enrichment API.

### DEFERRED
Dashboard settings, website redesign, new backend features.

---

## 5. Dependencies & authorization boundaries

- **Website** must not call `@StaffDashboardOnly` or `/staff/*` (except via mistaken BFF — none found).
- **Dashboard** uses dashboard JWT only; website OTP tokens are not accepted on staff routes.
- **Staff permissions** (`StaffPermission.*`) are enforced in API services; dashboard should surface 403 messages, not bypass.
- **Mediation:** relay and case APIs preserve no direct contact exposure.

---

## 6. Evidence method

- API: `api/src/modules/**/*.controller.ts` (58 controller files), decorator grep (`StaffOnly`, `StaffDashboardOnly`, `WebsiteAudienceGuard`).
- Website: `web/src/app/api/**` route handlers; spot-check portal pages.
- Dashboard: `dashboard/src/app/[locale]/admin/**`, `dashboard/src/features/admin/actions/*.ts`, `platform.ts`, `workflows.ts`, `listings.ts`.
- No test suite re-run; no DB changes.

---

*End of gap map. Implementation tracked in `docs/CROSS_APP_IMPLEMENTATION_ROADMAP.md`.*
