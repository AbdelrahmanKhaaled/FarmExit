# FarmExit ERD

`FarmExit_ERD_UI.dbml` is the approved, authoritative entity-relationship diagram (45 tables, 82 relationships).
`api/prisma/schema.prisma` implements it one model per table (`@@map` / `@map` keep the DBML names). Change the DBML
first, then the Prisma schema, then add a reviewed migration.

## Prisma vs DBML differences

- **Enums:** Prisma uses native MySQL enums where the DBML note lists a closed set of values. Extensible or undefined
  vocabularies stay `String` (`requests.status`, `conversations.status`, `farm_status`, staff membership `status`,
  `licence_status`, `request_documents.review_status`, `water_source`, `irrigation_method`, `energy_source`,
  `facility_type`, `notification_type`). Enum values are camelCase in Prisma and map to the DBML snake_case values.
- **Datetimes:** every date/time column is `DATETIME(3)` and stores UTC (no MySQL `TIMESTAMP`, so no 2038 limit and no
  session-timezone conversion). `created_at` / `updated_at` stay nullable; Prisma adds `now()` / `@updatedAt`. The API
  pool sets `timezone: 'Z'`.
- **Foreign keys:** the DBML has no delete rules, so Prisma defaults apply (`RESTRICT` for required, `SET NULL` for
  optional relations, `ON UPDATE CASCADE`). No cascading deletes were added.
- **Collation:** Prisma emits `utf8mb4_unicode_ci` on every table, not the database default `utf8mb4_0900_ai_ci`.
- **Rules not expressible in Prisma** are enforced in the service layer: sale-only terms, quick sale implying
  installment and exchange proposals, one target per saved item, share percentages in 0..100, score within
  `0..score_max`, and the type of a proposal's parent request.
