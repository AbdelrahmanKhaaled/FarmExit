# Request narrative locale migration review

Migration: `20261102120000_request_narrative_locales`.

Adds nullable JSON `localized_content` to `professional_verification_details` and `farm_purchase_proposal_details`. Existing summaries, notes, profile snapshots, proposal components, identities, monetary values, permissions and statuses are unchanged. No backfill or translation is performed. Management uses existing columns; partnership application translations use an additive key in its existing proposal-details JSON.

The SQL was authored as an additive migration because a disposable MySQL server was unavailable. It has **not been applied or verified on MySQL**, and was not generated with `migrate dev`. Prisma client generation and API compilation are separate checks and do not establish migration compatibility.

Before release, create a disposable database with the production MySQL version, apply the complete migration chain with `prisma migrate deploy`, and verify old rows remain readable, new bilingual writes round-trip, null fields fall back to legacy text, and the deployment account has the necessary ALTER privilege. Measure ALTER lock behavior on a representative restored dataset. Review the actual migration ledger; do not assume the nine migrations reported in the brief still describe production.

Release API only after this migration is applied through the approved release procedure. Deploy compatible clients afterward. Old clients can omit the new fields. Rolling the application back leaves the nullable columns in place. Prefer roll-forward; do not drop populated translation columns during application rollback. Any later schema removal requires explicit approval and exported translation data with a tested restoration plan.

No production migration, database reset, `db push`, or seed was run.
