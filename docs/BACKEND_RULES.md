# FarmExit Backend Rules

Rules for `api/` (NestJS, TypeScript strict, MySQL via Prisma, REST). They apply to every phase.

## Architecture

```
api/src/
  main.ts            bootstrap only (create app, configureApp, listen)
  app.module.ts      root module: config, prisma, feature modules
  common/            cross-cutting code with no business logic (app setup, filters, guards, interceptors, decorators)
  config/            environment schema and validation; typed access through ConfigService<Env, true>
  prisma/            PrismaModule (global) and PrismaService: the only database client
  modules/<feature>/ one folder per business capability
  generated/prisma/  Prisma client output (generated, git-ignored, never edited)
```

- Layers: controller (HTTP only) → service (business rules) → PrismaService. Controllers never call Prisma.
- Modules talk to each other through exported services, never by importing another module's internals.
- Every HTTP route lives under `/api/v{n}` (global prefix `api`, URI versioning, default v1). A breaking change
  creates a new version; existing versions keep working.
- `configureApp()` (`common/app-setup.ts`) is the single place for prefix, versioning, validation, CORS and Swagger;
  e2e tests use it so they hit the real routes.
- `GET /api/v1/health` is liveness only and must not depend on the database.

## Module structure

```
modules/farm-listings/
  farm-listings.module.ts
  farm-listings.controller.ts
  farm-listings.service.ts
  dto/create-farm-listing.dto.ts      request DTOs (class-validator + @ApiProperty)
  dto/farm-listing-response.dto.ts    response DTOs (explicit; never return Prisma models directly)
  farm-listings.service.spec.ts       unit tests next to the code
api/test/farm-listings.e2e-spec.ts    HTTP tests
```

## Naming conventions

- Files and folders: kebab-case (`farm-listings.service.ts`). Classes: PascalCase with a role suffix
  (`FarmListingsService`, `CreateFarmListingDto`). Tests: `*.spec.ts` (unit), `*.e2e-spec.ts` (e2e).
- Routes: plural kebab-case nouns (`/api/v1/farm-listings/:id`), no verbs; actions as sub-resources
  (`POST /api/v1/farm-listings/:id/details-requests`).
- JSON: camelCase fields. Status values reuse the confirmed frontend vocabulary in `web/src/lib/domain/status.ts`
  (`underFarmExitReview`, `changesRequested`, …); do not rename them.
- Prisma: models PascalCase singular (`FarmListing`), fields camelCase, tables mapped to snake_case plural with
  `@@map("farm_listings")`, columns with `@map` where they differ. Enums PascalCase.
- Environment variables: UPPER_SNAKE_CASE, declared and validated in `config/env.validation.ts` before use.

## Data and Prisma

- The schema comes only from the approved ERD (`docs/erd/`). Do not invent models, fields or relations.
- Every schema change is a reviewed migration (`prisma migrate dev`); never edit an applied migration.
- Prisma 7: the connection URL is in `prisma.config.ts` (from `DATABASE_URL`), not in `schema.prisma`; runtime
  queries go through the MariaDB driver adapter. `prisma migrate dev` needs a shadow database, so the database user
  must be allowed to create one (or set `shadowDatabaseUrl`) when migrations start.
- Money: whole Egyptian pounds as integers (`Int`/`BigInt`), never floats. Dates: UTC `DateTime`, ISO 8601 in JSON.
- Text is utf8mb4. Bilingual content is stored per locale (`en`, `ar`); Arabic is never machine-derived from English.
- Unknown values are `null`, never defaults or estimates; the frontend renders them as "Not stated in listing".

## Security

- Never commit `.env` files, credentials, tokens or production data. Only `.env.example` files are tracked.
- All input is validated by the global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`); every
  request body, query and param has a DTO.
- CORS allows only `CORS_ORIGINS`. Swagger is disabled in production unless `SWAGGER_ENABLED=true`.
- Authentication (later phase): mobile number + OTP only, no email/password. Authorisation is checked in the
  service layer for every resource (owner, applicant, FarmExit staff), not only by route guards.
- Refresh tokens rotate on every use; rotated secrets are kept only as SHA-256 hashes (`user_session_tokens`). Replaying a consumed secret revokes its session. **Narrow, deliberate exception:** a duplicate of the _most recently_ consumed secret arriving within 3 seconds (`REFRESH_DUPLICATE_GRACE_MS`) is a benign client race (retry or parallel refresh): it gets 401 with no tokens and the session is NOT revoked, so the winning request keeps working. The tradeoff: a thief replaying a just-rotated secret within that window is also only rejected, never given tokens, and the next real replay (older token, or after 3 s) still revokes. Unknown secrets never revoke (session ids are guessable).
- Responses expose only the fields a caller may see (explicit response DTOs). Never leak stack traces, SQL or
  internal IDs that are not part of the API.
- Uploaded documents are private: served only through authorised endpoints, never by public URL.
- Use parameterised Prisma queries only; `$queryRawUnsafe` is not allowed.

## FarmExit business constraints

These are confirmed product rules (see the frontend contracts in `web/src/lib/domain/` and `web/src/lib/auth/`).

- **FarmExit is the intermediary.** Every conversation and request is between a user and FarmExit. The API never
  returns another party's mobile number, email or direct contact details.
- **Location privacy.** The exact farm pin is private to FarmExit and never appears in public responses; public
  listings expose governorate and area only.
- **FarmExit Score** is FarmExit's own evaluation of a farm, never a customer rating or review. It has no
  customer-rating semantics (no user-submitted ratings, no averages of reviews). The scoring methodology is not yet
  defined: do not invent factors, weights or formulas; store only the approved value and leave it `null` otherwise.
- **No invented trust claims.** Do not create "verified", "site visit" or "documents verified" flags or wording
  unless the approved requirements define them. Professional verification uses the confirmed
  `VerificationStatus` values only.
- **Statuses.** Listing, request, application, details-request, document and verification states use the confirmed
  lists in `web/src/lib/domain/status.ts`; transitions are decided by FarmExit review, never automatically.
- **Documents** are shared with other parties only through FarmExit, after approval.
- **Sample data** is never presented as real data; counts and totals come from the database.
- **Photos** carry `isIllustrative` (shown as "Illustrative image") and a confirmed licence before production use.
- Open business questions (scoring method, legal document list, owner-decision finality, reply times) stay open in
  code: model them as nullable or configurable, and flag them instead of guessing.
