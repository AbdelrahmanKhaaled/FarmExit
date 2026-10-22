# Dashboard Remaining Blockers

Post functional completion (2026-10-21). Resolved items (DASH-001/002, evaluation create/checks, forwarding hardening) are omitted.

---

## Needs Backend API

| ID | Item |
|----|------|
| B1 | Staff membership / role management HTTP API (dashboard administrators page is list-only) |
| B2 | Website user notifications API |
| B3 | User-wide document catalog for website `/my/documents` |
| B4 | Public management & partnership marketplace discovery APIs |
| B5 | **Staff `PATCH` private farm coordinates** — only owners may update per `PrivateLocationController`; dashboard is read-only by design |

---

## Needs Business/Product Decision

| ID | Item |
|----|------|
| P1 | Canonical list of approved evaluation `check_key` values (API accepts any string ≤120; UI uses examples only) |
| P2 | Full matrix of allowed generic `POST /staff/requests/:id/status` transitions (backend allows broad admin transitions; UI is conservative) |

---

## Needs Approved Test Data

| ID | Item |
|----|------|
| T1 | Live UAT: reviewer + case agent + admin accounts with assigned farms/requests |
| T2 | Communications case with >50 messages for pagination verification |
| T3 | Published listing + co-purchase group for end-to-end member update |

---

## Needs Manual UAT

| ID | Item |
|----|------|
| U1 | EN/AR RTL on new forms (evaluation create, checks, status, private map) |
| U2 | Realtime reconnect after load-older on communications |
| U3 | Forwarding embed on proposals/farm-details with live API |

---

## Deliberately Deferred

| ID | Item |
|----|------|
| D1 | Dashboard visual redesign (separate prompt) |
| D2 | Embedding full forwarding panel on every specialized module (hub link used where embed is redundant) |
