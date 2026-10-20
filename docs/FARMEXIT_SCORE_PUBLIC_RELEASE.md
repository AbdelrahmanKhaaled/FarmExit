# FarmExit Score — public release rule (Phase 6)

## Product decision

The operator approved showing the **numeric FarmExit Score result** on public farm marketplace cards and listing views. This is **not** a customer rating and **not** a release of internal evaluation records.

## Authorization rule (implemented)

A score may appear in `PublicListingDto.farmExitScore` only when:

1. A `farm_evaluations` row exists for the farm with `status = published`.
2. Both `score_value` and `score_max` are set and valid (`0 <= score_value <= score_max`, `score_max > 0`).
3. The value is normalized to a **0–5** public scale: `(score_value / score_max) * 5`, rounded to one decimal.

If no row satisfies the rule, `farmExitScore` is `null` and the website shows **Pending assessment** (card UI preserved).

## Never public

- `internal_notes`, evaluation checks, reviewer/approver identities
- Draft, in_review, approved-only, withdrawn, or superseded evaluations
- Methodology names/versions unless separately approved for marketing copy
- Any inference from non-`published` statuses

## Governance note

`docs/BACKEND_RULES.md` still describes evaluations as staff-internal by default. The **narrow exception** above is the approved public projection for marketplace listings only. Broader disclosure (summaries, methodology pages) requires a separate product sign-off.
