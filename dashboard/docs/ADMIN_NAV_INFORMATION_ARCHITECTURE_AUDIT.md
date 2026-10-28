# Admin navigation information architecture audit

Date: 2026-10-27

The application serving localhost:3003 is `FarmExit_dashboard-v2_redesigned/dashboard-v2` (confirmed from the listening Node process). Backend services are in the repository's `api` directory. The corresponding frontend changes are also present in the top-level `dashboard-v2` copy.

## Decisions

| Module | Decision | Reason / access |
| --- | --- | --- |
| Requests & applications | Keep as the unified inbox | `/admin/requests`; filters use the actual request type and status values. Requester links open the unified detail, which links to specialized workflows. |
| Professional verification | Merge sidebar queue into unified inbox | `/admin/requests?requestType=professionalVerification`. Same `requests` table and staff inbox, with dedicated verification data/review operations retained on `/admin/verification/:id`. |
| Partnerships | Merge sidebar queue into unified inbox | `/admin/requests?requestType=partnership` or `partnershipApplication`. Parent opportunity and application detail workflows remain distinct and accessible from request detail. |
| Farm management requests | Merge sidebar queue into unified inbox | `/admin/requests?requestType=farmManagement`. Specialized management requirements and review/publication remain on the detail workflow. |
| Farm details inquiries | Merge sidebar queue into unified inbox | `/admin/requests?requestType=farmDetails`. These are customer inquiries about a listing, with review, owner forwarding, and mediated communication; they are not farm records or listings. A separate sidebar queue adds no necessary capability. |
| Listings | Keep | Dedicated sale/rent listing review queue and detail workbench, with assignment, review, price/visibility context, and publication actions. A listing is a `farmListing` request, but its workflow has material business value beyond a general inbox row. Also accessible through `requestType=farmListing`. |
| Listing pipeline | Keep | Approved listings awaiting publication; a separate operational task from reviewing incoming requests. |
| Purchase proposals / co-purchase | Keep existing access | Offer terms, group participation and follow-up have dedicated workflows beyond basic request review. Existing RBAC continues to control navigation and APIs. |
| Farms, evaluations, communications | Keep | Farm directory, internal assessments, and isolated participant conversations are separate entities/workflows. |
| Users, administrators, audit logs | Keep | Platform accounts, dashboard role memberships/credentials, and audit events serve different administrative purposes. |

## Every request type remains accessible

Use `/admin/requests?requestType=` with `farmListing`, `farmManagement`, `partnership`, `partnershipApplication`, `professionalVerification`, `professionalApplication`, `farmDetails`, or `farmPurchaseProposal`.

Select a requester to open `/admin/requests/:id`, then use the specialized workflow link when offered. All links use the existing locale-aware navigation. Specialized detail URLs and older queue URLs remain available for bookmarks; removing a sidebar entry does not delete business workflows or bypass assignment/role checks.

## Listings versus inquiries

A listing describes a sale/rental opportunity and its review/publication lifecycle. An inquiry is a separate customer's request about an existing listing; it has its own requester, review and forwarding history. Combining them as one entity would lose that distinction. The unified inbox collects their request rows while preserving their dedicated operations.
