# Implementation Plan: PostgreSQL Call Tracking Migration

## Overview

Migrate the existing JavaScript ES-module React/Express application from MongoDB/Mongoose persistence to PostgreSQL 18 and Sequelize. The implementation proceeds from configuration and exact schema construction through shared platform services, transactional domain behavior, protected APIs, compatibility DTOs, deterministic seed data, repository cleanup, and bounded automated validation. Each leaf task is scoped so a `spec-task-execution` agent can implement it independently after all earlier dependency waves have completed.

## Tasks

- [ ] 1. Establish the PostgreSQL runtime foundation
  - [x] 1.1 Migrate and pin server dependencies and test commands
    - Update `server/package.json` and `server/package-lock.json` with exact compatible versions of Sequelize, `pg`, `pg-hstore`, `dotenv`, retained Express/security/JWT/bcrypt/Zod/AWS packages, and pinned `fast-check` as a development dependency.
    - Remove `mongoose`, `express-mongo-sanitize`, and any Mongo-only package entries; retain ES-module package boundaries and point the server seed command at `scripts/seed.js`.
    - Add non-watch Node test commands suitable for targeted unit, property, integration, and contract execution.
    - _Requirements: 9.5, 9.6, 9.7, 9.8, 15.3, 15.5, 15.7_

  - [x] 1.2 Implement validated environment configuration
    - Create `server/config/env.js` and align `server/.env`, `server/.env.example`, and the repository environment example with the complete database, server, timezone, client, JWT, configured-principal, AWS, and playback-expiry contract.
    - Validate required values before any database or listener operation, normalize the configured principal email, expose typed non-secret configuration, set `TZ=Asia/Kolkata`, and ensure validation errors never print secret values.
    - Preserve the specified local PostgreSQL development values while keeping production secrets out of committed examples and logs.
    - _Requirements: 9.1, 9.2, 9.3, 9.9, 9.12, 9.13, 10.1, 14.2, 14.3_

  - [ ] 1.3 Rewrite the Sequelize database module
    - Rewrite `server/config/db.js` to create one PostgreSQL Sequelize instance from validated configuration with timezone `+05:30`, pool `{ min: 2, max: 10, acquire: 30000, idle: 10000 }`, snake_case defaults, and a redaction-safe logging policy.
    - Export explicit connect, sync, close, and audit-guard installation lifecycle functions; authenticate before synchronization and propagate failures without opening an HTTP listener.
    - Preserve TIMESTAMPTZ instants and provide transaction access for domain and seed services.
    - _Requirements: 9.1, 9.3, 9.4, 9.9, 9.10, 9.11, 9.12, 9.13, 15.6_

  - [x] 1.4 Create shared HTTP, error, pagination, and date utilities
    - Create focused JavaScript modules under `server/utils/` for standard success/failure envelopes, typed operational errors, pagination parsing, stable ordering, Asia/Kolkata inclusive date-only boundaries, BIGINT-safe JSON serialization, and sensitive-value redaction.
    - Clamp untrusted pagination to `page >= 1` and `limit` in `[1, 200]`, default to `1/20`, calculate non-negative offsets and zero-result pages, and mirror compatibility pagination fields only through the envelope helper.
    - Keep the utilities independent of resource controllers so all endpoints share one response and error contract.
    - _Requirements: 1.18, 4.2, 4.5, 4.6, 4.9, 5.9, 5.10, 5.11, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10, 14.11, 14.14_

  - [ ]* 1.5 Write the pagination-bounds property test
    - Create `server/test/property/pagination-bounds.property.test.js` using `fast-check` and the Node test runner against arbitrary absent, malformed, negative, fractional, and oversized inputs.
    - **Property 8: Pagination bounds**
    - **Validates: Requirements 4.2**

  - [ ]* 1.6 Write the envelope-consistency property test
    - Create `server/test/property/envelope-consistency.property.test.js` to generate success, failure, list, empty-list, login, and playback responses and verify required canonical members plus permitted compatibility mirrors.
    - **Property 18: Envelope consistency**
    - **Validates: Requirements 4.5**

- [ ] 2. Implement the exact six-table Sequelize schema
  - [x] 2.1 Define shared enum constants
    - Create `server/models/constants.js` with the exact Role, device link status, call direction, call category, recording upload status, audit action, and audit entity type values from the design.
    - Export immutable constants for reuse by models, validators, services, seed fixtures, and tests without defining a database identity table.
    - _Requirements: 1.16, 6.5, 9.7, 10.1, 10.10_

  - [ ] 2.2 Implement Employee and Device models
    - Create `server/models/Employee.js` and `server/models/Device.js` with the exact PostgreSQL names, types, defaults, nullability, primary/unique keys, E.164 checks, normalized employee fields, link-state checks, indexes, timestamps, and employee paranoid soft deletion defined by the design.
    - Map every Sequelize attribute to its declared snake_case column and configure device foreign-key update/delete behavior without making `employee_id` unique.
    - _Requirements: 1.2, 1.3, 1.8, 1.10, 1.11, 1.17, 2.5, 2.6_

  - [ ] 2.3 Implement CallLog and CallFormData models
    - Create `server/models/CallLog.js` and `server/models/CallFormData.js` with UUIDv4 keys, exact columns, category/direction enums, non-negative duration, behavior-flag checks, unique one-to-one form ownership, cascade behavior, and all declared indexes including pending-form and case-insensitive company search indexes.
    - Enforce local call checks for submitted/required forms, missed-call duration, and recording eligibility while leaving cross-row existence to transactional services.
    - _Requirements: 1.4, 1.5, 1.9, 1.12, 1.13, 1.17, 2.1, 2.2, 2.5, 3.7, 3.8, 3.9_

  - [ ] 2.4 Implement the CallRecording model
    - Create `server/models/CallRecording.js` with exact UUID, one-to-one call, device, BIGINT byte count, private S3 metadata, retry, status, timestamp, uniqueness, check, index, and foreign-key behavior from the design.
    - Keep signed playback URLs out of the model and support safe number-or-decimal-string serialization through the shared BIGINT utility.
    - _Requirements: 1.6, 1.9, 1.14, 1.17, 1.18, 2.1, 2.2, 2.5, 7.2, 7.3, 7.7, 15.8_

  - [ ] 2.5 Implement the append-only AuditLog model
    - Create `server/models/AuditLog.js` with the exact UUID, enum, entity, JSONB, boolean, INET, user-agent, and created timestamp fields, no `updated_at`, and all declared indexes.
    - Add instance and bulk Sequelize hooks that reject update and destroy operations, and validate audit enums without storing credentials or signed URLs.
    - _Requirements: 1.7, 1.15, 1.17, 6.1, 6.4, 6.5, 6.6, 6.8_

  - [ ] 2.6 Assemble model exports and associations
    - Rewrite `server/models/index.js` to initialize and export exactly Employee, Device, CallLog, CallFormData, CallRecording, and AuditLog plus shared constants.
    - Define the approved `devices`, `employee`, `callLogs`, `device`, `callForm`, `callLog`, `recording`, and `recordings` aliases with the specified update/delete rules and no user, session, upload queue, company, or contact model.
    - _Requirements: 1.1, 1.16, 2.1, 2.2, 2.4, 2.5, 13.8, 15.9_

  - [ ] 2.7 Implement PostgreSQL schema and audit guards
    - Create `server/scripts/schema-guards.js` to install idempotent database checks/indexes not fully represented by Sequelize and PostgreSQL guards rejecting `UPDATE`, `DELETE`, and `TRUNCATE` against `audit_logs`.
    - Make guard installation safe to repeat after synchronization and verify the target table/trigger/function names without creating any additional application table.
    - _Requirements: 1.1, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 6.1, 6.8, 15.6_

  - [ ] 2.8 Rewrite the database synchronization command
    - Rewrite `server/scripts/sync-db.js` to load validated configuration, authenticate PostgreSQL, synchronize only the six models, install schema/audit guards, verify the application-owned table set, and close the connection with a non-zero exit on failure.
    - Keep production versioned migrations explicitly outside this command and avoid destructive force/alter behavior by default.
    - _Requirements: 1.1, 6.8, 9.9, 9.11, 15.2, 15.6, 15.10_

  - [ ]* 2.9 Write exact-schema integration tests
    - Create `server/test/integration/schema.integration.test.js` for a disposable PostgreSQL schema and assert exact tables, columns, TIMESTAMPTZ/JSONB/INET/BIGINT types, keys, checks, indexes, aliases, update/delete rules, and audit hooks/guards.
    - Assert that user, session, upload queue, company, and contact tables are absent.
    - _Requirements: 1.1-1.18, 2.1, 2.2, 2.4, 2.5, 6.1, 6.8_

  - [ ]* 2.10 Write the relationship-integrity property test
    - Create `server/test/property/relationship-integrity.property.test.js` using generated valid and invalid foreign-key graphs against the disposable PostgreSQL schema.
    - **Property 1: Relationship integrity**
    - **Validates: Requirements 2.1**

  - [ ]* 2.11 Write the one-to-one child-integrity property test
    - Create `server/test/property/one-to-one-children.property.test.js` to generate repeated form and recording insertion attempts for arbitrary call IDs and assert uniqueness.
    - **Property 2: One-to-one child integrity**
    - **Validates: Requirements 2.2**

  - [ ]* 2.12 Write the audit-append-only property test
    - Create `server/test/property/audit-append-only.property.test.js` to generate append sequences and direct instance, bulk, raw update, delete, and truncate attempts while preserving all prior audit values.
    - **Property 14: Audit append-only**
    - **Validates: Requirements 6.1**

  - [ ]* 2.13 Write the exactly-six-schema property test
    - Create `server/test/property/exact-schema.property.test.js` to synchronize generated disposable schema names and compare application-owned tables to the exact declared six-name set.
    - **Property 24: Exactly-six schema**
    - **Validates: Requirements 1.1**

- [ ] 3. Checkpoint - Ensure all foundation and schema tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Build shared API, authentication, query, audit, and compatibility infrastructure
  - [ ] 4.1 Implement common request validation middleware and schemas
    - Create `server/middleware/validate.js` and `server/validation/common.js` for body, path, query, UUID, identifier, boolean, enum, pagination, and inclusive date-range validation.
    - Return the first actionable `400` envelope before controller or database execution and expose reusable validators for static and parameterized routes.
    - _Requirements: 4.17, 14.1, 14.4, 14.5_

  - [ ] 4.2 Implement resource-specific validation schemas
    - Create `server/validation/resources.js` with allowlisted schemas for login, employee/device mutations, link/unlink, all employee/device/call/form/recording/audit filters, company/dashboard ranges, and playback identifiers.
    - Cover filter aliases and reject unsupported enums, malformed identifiers, invalid ranges, unsafe sort values, and unknown mutable fields.
    - _Requirements: 4.10, 4.11, 4.12, 4.13, 4.14, 4.17, 10.2, 11.1-11.15, 12.1-12.14, 13.1-13.9, 14.1, 14.4, 14.5_

  - [ ] 4.3 Implement the config-backed principal provider and authentication service
    - Create `server/services/auth-provider.js` and `server/services/auth-service.js` to resolve the validated active principal by normalized email or stable ID, compare bcrypt hashes, sign `{ id, role }` with configured expiry, verify tokens, and return password-free principals.
    - Use generic invalid-credential errors and no identity table, session, refresh-token, or revocation storage.
    - _Requirements: 9.12, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.8, 10.10, 10.12_

  - [ ] 4.4 Rewrite authorization middleware
    - Rewrite `server/middleware/auth.js` to parse bearer tokens, verify signature/expiry, resolve the active configured principal, attach a password-free `req.user`, and enforce reusable Role allowlists.
    - Emit generic `401` and `403` operational errors and never query a database identity model.
    - _Requirements: 7.5, 10.5, 10.6, 10.9, 11.15, 14.6, 14.7_

  - [ ] 4.5 Implement the audit service and request metadata helper
    - Create `server/services/audit-service.js` and rewrite `server/middleware/audit.js` to append one enum-valid audit event inside a caller-provided transaction, capture actor/entity/request metadata, and recursively redact passwords, hashes, JWTs, AWS credentials, authorization headers, configured secrets, and signed URLs.
    - Provide helpers for login/logout, protected views, export, mutations, device links, and playback without exposing audit mutation endpoints.
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.6, 10.11, 14.14_

  - [ ] 4.6 Implement canonical and React compatibility DTOs
    - Create `server/services/dto-service.js` for employee, call, recording, audit, and company projections that retain every canonical field while adding the exact Mongo-shaped and camelCase aliases consumed by `client/src/main-live.jsx`.
    - Implement deterministic classification/upload mappings, BIGINT-safe file sizes, conditional `uploadedAt`, null unavailable company fields, password exclusion, and login/playback/list response mirrors.
    - _Requirements: 1.18, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 10.12_

  - [ ] 4.7 Implement the shared query service
    - Create `server/services/query-service.js` to compose validated filters conjunctively, merge association requirements, apply stable descending `created_at` plus deterministic key ordering, run equivalent row/count predicates, and use distinct counts when joins can duplicate parents.
    - Support omission semantics, inclusive Asia/Kolkata date boundaries, bounded pagination, empty pages, and database aggregates without loading full tables.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 4.8, 4.9, 4.15, 4.16, 13.4, 14.4_

  - [ ] 4.8 Implement security and centralized error middleware
    - Create `server/middleware/security.js` and `server/middleware/error.js` for the exact configured CORS allowlist, Helmet, request-size limits, login rate limiting, malformed JSON handling, async error boundaries, Sequelize error normalization, and redaction-safe diagnostics.
    - Normalize validation, authentication, permission, missing/unavailable, conflict, rate-limit, and unexpected failures to standard `400/401/403/404/409/429/500` envelopes without SQL or production stack details.
    - _Requirements: 9.12, 14.2, 14.3, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10, 14.11, 14.12, 14.13, 14.14_

  - [ ]* 4.9 Write configuration and database-module unit tests
    - Create `server/test/unit/config-db.test.js` for valid/default/invalid environment contracts, secret-safe failures, exact Sequelize options, lifecycle ordering, and connection failure propagation.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.9, 9.10, 9.11, 9.12, 9.13_

  - [ ]* 4.10 Write authentication, authorization, security, error, and redaction unit tests
    - Create `server/test/unit/platform-security.test.js` with mocked bcrypt/JWT/request/database errors to cover principal lookup, payload/expiry, role allowlists, CORS, rate limiting, safe envelopes, Sequelize normalization, and recursive secret redaction.
    - _Requirements: 6.5, 6.6, 9.12, 10.1-10.10, 14.2-14.14_

  - [ ]* 4.11 Write the pagination-partition property test
    - Create `server/test/property/pagination-partition.property.test.js` for arbitrary stable ordered datasets, filters, page sizes, ties, and empty results.
    - **Property 7: Pagination partition**
    - **Validates: Requirements 4.1**

  - [ ]* 4.12 Write the filter-soundness property test
    - Create `server/test/property/filter-soundness.property.test.js` for arbitrary supported filter combinations and assert every returned row satisfies every active predicate.
    - **Property 9: Filter soundness**
    - **Validates: Requirements 4.3**

  - [ ]* 4.13 Write the filter-completeness property test
    - Create `server/test/property/filter-completeness.property.test.js` to compare all paginated results with the complete generated matching set before mutation.
    - **Property 10: Filter completeness**
    - **Validates: Requirements 4.4**

  - [ ]* 4.14 Write the compatibility-classification property test
    - Create `server/test/property/compatibility-classification.property.test.js` over every declared call category.
    - **Property 11: Compatibility classification**
    - **Validates: Requirements 5.1**

  - [ ]* 4.15 Write the compatibility-upload-status property test
    - Create `server/test/property/compatibility-upload-status.property.test.js` over every declared internal recording status and all DTO entry points.
    - **Property 12: Compatibility upload status**
    - **Validates: Requirements 5.2**

- [ ] 5. Implement transactional domain and resource query services
  - [ ] 5.1 Implement employee domain operations
    - Create `server/services/employee-service.js` for validated create/update and transactional soft deletion, including uniqueness conflicts, soft-deleted identifier conflicts, historical association preservation, redacted snapshots, and exactly one atomic audit event per audited command.
    - Ensure default reads can exclude deleted employees while historical joins can opt into `paranoid: false`.
    - _Requirements: 2.3, 2.10, 6.2, 11.4, 11.5, 11.6, 11.15, 14.9_

  - [ ] 5.2 Implement device domain operations
    - Create `server/services/device-service.js` for create/update/deactivate plus row-locked transactional link/unlink operations that enforce active rows and every link-state invariant.
    - Preserve referenced history, serialize competing links, apply actor metadata, and append exactly one matching audit event in each successful audited transaction.
    - _Requirements: 2.6, 2.7, 2.8, 2.9, 2.11, 6.2, 11.10, 11.11, 11.12, 11.13, 11.14, 11.15, 14.9_

  - [ ] 5.3 Implement call category transition operations
    - Create `server/services/call-domain-service.js` to validate the complete category behavior matrix, lock calls and both child associations, apply allowed transitions atomically, derive flags, and reject transitions that would silently discard forbidden evidence.
    - Keep public resources read-only unless invoked through an explicitly approved internal/domain operation.
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 12.13_

  - [ ] 5.4 Implement form and recording child operations
    - Create `server/services/child-domain-service.js` to lock parent calls, enforce CLIENT form eligibility and eligible recording categories/device equality, insert at most one child, and update parent flags in the same transaction.
    - Guarantee committed flag-to-row equivalence and rollback both parent and child changes on any failure.
    - _Requirements: 2.2, 3.2, 3.3, 3.4, 6.2_

  - [ ] 5.5 Implement employee and device query services
    - Create `server/services/employee-query-service.js` and `server/services/device-query-service.js` for all list/detail/stats filters and aggregates, including historical employee detail, device/call aggregates, link-state counts, and recent-sync counts.
    - Use the shared predicate, stable pagination, DTO, and count semantics without in-memory full-table processing.
    - _Requirements: 4.1-4.17, 11.1, 11.2, 11.3, 11.7, 11.8, 11.9_

  - [ ] 5.6 Implement call query service
    - Create `server/services/call-query-service.js` for list, stats, recent, and detail with employee/device/form/recording associations and every approved search/filter alias.
    - Map BUSINESS/PERSONAL classification, company, form status, recording existence/status including `UPLOADED -> COMPLETED`, inclusive dates, equivalent count predicates, distinct joins, and stable tie-breaking.
    - _Requirements: 4.7-4.17, 12.1, 12.2, 12.3, 12.4_

  - [ ] 5.7 Implement form query service
    - Create `server/services/form-query-service.js` for paginated form list/detail and pending CLIENT calls with absent form rows, required/unsubmitted flags, associated employee/device data, filters, and stable counts.
    - _Requirements: 4.1-4.17, 12.5, 12.6, 12.7_

  - [ ] 5.8 Implement recording query service
    - Create `server/services/recording-query-service.js` for list/detail/stats/failed operations, associated call/employee/device data, byte aggregates, failed and retry-exhausted semantics, and metadata responses that never include playback URLs.
    - _Requirements: 1.18, 4.1-4.17, 7.7, 12.8, 12.9, 12.10, 12.11_

  - [ ] 5.9 Implement audit query service
    - Create `server/services/audit-query-service.js` for read-only paginated history and grouped stats with every approved filter and no create/update/delete path.
    - _Requirements: 6.3, 13.1, 13.2_

  - [ ] 5.10 Implement dashboard and activity query service
    - Create `server/services/dashboard-query-service.js` to compute active employees, filtered calls, CLIENT calls, total duration, completed recordings, pending forms, and paginated mixed activity using database COUNT/SUM queries and stable DTO projections.
    - _Requirements: 13.3, 13.4, 13.5_

  - [ ] 5.11 Implement the company projection query service
    - Create `server/services/company-query-service.js` for a read-only paginated grouping by normalized form company name, latest customer/contact data, relational assigned salesperson, total calls, and explicit null unavailable fields.
    - Do not create company/contact storage or mutation operations.
    - _Requirements: 5.7, 13.6, 13.7, 13.8, 13.9, 15.9_

  - [ ]* 5.12 Write the category-matrix property test
    - Create `server/test/property/category-matrix.property.test.js` using generated categories, directions, durations, flags, and child combinations across accepted and rejected transitions.
    - **Property 3: Category matrix**
    - **Validates: Requirements 3.1**

  - [ ]* 5.13 Write the form-eligibility property test
    - Create `server/test/property/form-eligibility.property.test.js` for generated parent categories and form commands, including transactional rollback cases.
    - **Property 4: Form eligibility**
    - **Validates: Requirements 3.2**

  - [ ]* 5.14 Write the recording-eligibility property test
    - Create `server/test/property/recording-eligibility.property.test.js` for generated categories, call/recording device pairs, and insertion outcomes.
    - **Property 5: Recording eligibility**
    - **Validates: Requirements 3.3**

  - [ ]* 5.15 Write the child-flag-equivalence property test
    - Create `server/test/property/child-flag-equivalence.property.test.js` using stateful generated create/transition/failure command sequences.
    - **Property 6: Flag equivalence**
    - **Validates: Requirements 3.4**

  - [ ]* 5.16 Write the soft-deletion property test
    - Create `server/test/property/soft-deletion.property.test.js` for arbitrary employees with associated devices/calls and successful/repeated deletion commands.
    - **Property 13: Soft deletion**
    - **Validates: Requirements 2.3**

  - [ ]* 5.17 Write the audit-atomicity property test
    - Create `server/test/property/audit-atomicity.property.test.js` with generated audited commands and injected failures before and after mutation/audit insertion.
    - **Property 15: Audit atomicity**
    - **Validates: Requirements 6.2**

- [ ] 6. Implement authorized S3 playback
  - [ ] 6.1 Rewrite the private S3 signer service
    - Rewrite `server/services/s3.js` to build `GetObject` commands only from persisted recording bucket/key values and generate a fresh URL with the validated `S3_PLAYBACK_EXPIRY_SECONDS` value.
    - Keep signer inputs and outputs out of logs, caches, model fields, and audit snapshots; expose dependency injection for deterministic tests.
    - _Requirements: 7.2, 7.3, 9.2, 9.6, 9.12, 14.14, 15.8_

  - [ ] 6.2 Implement the recording playback service
    - Create `server/services/playback-service.js` to authorize recording access before signer invocation, load completed recording/call/employee metadata, return safe unavailable errors otherwise, generate the compatibility playback envelope, and append `PLAY_RECORDING` audit data.
    - Ensure successful playback never stores or caches the URL and ordinary metadata operations never call the signer.
    - _Requirements: 5.11, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 12.12_

  - [ ]* 6.3 Write the playback-eligibility property test
    - Create `server/test/property/playback-eligibility.property.test.js` over arbitrary actor roles, recording presence, and upload statuses with a mocked signer invocation counter.
    - **Property 16: Playback eligibility**
    - **Validates: Requirements 7.1**

  - [ ]* 6.4 Write the playback-non-caching property test
    - Create `server/test/property/playback-non-caching.property.test.js` to compare database state before/after repeated successful requests, inspect fresh signer calls, and assert exact configured expiry.
    - **Property 17: Playback non-caching**
    - **Validates: Requirements 7.2**

- [ ] 7. Implement resource controllers
  - [ ] 7.1 Rewrite the authentication controller
    - Rewrite `server/controllers/auth.js` for validated login, current-principal, and stateless logout behavior with generic failures, password-free users, login/logout audit events, standard envelopes, and top-level login compatibility mirrors.
    - Forward all asynchronous errors to centralized middleware.
    - _Requirements: 5.10, 6.7, 10.2, 10.3, 10.4, 10.7, 10.8, 10.11, 10.12, 14.13_

  - [ ] 7.2 Implement the employee controller
    - Create `server/controllers/employees.js` for list, stats, detail, create, update, and soft delete using only employee domain/query services, DTOs, standard envelopes, and top-level pagination mirrors.
    - _Requirements: 5.3, 5.9, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 14.13_

  - [ ] 7.3 Implement the device controller
    - Create `server/controllers/devices.js` for list, stats, detail, create, update, deactivate, link, and unlink with transactional service calls and consistent conflict/error handling.
    - _Requirements: 5.9, 11.7, 11.8, 11.9, 11.10, 11.11, 11.12, 11.13, 11.14, 14.13_

  - [ ] 7.4 Implement the call controller
    - Create `server/controllers/calls.js` for read-only list, stats, recent, and detail using validated filters, compatibility DTOs, stable pagination, and no unapproved mutation endpoints.
    - _Requirements: 5.4, 5.9, 12.1, 12.2, 12.3, 12.4, 12.13, 14.13_

  - [ ] 7.5 Implement the form controller
    - Create `server/controllers/forms.js` for read-only list, pending, and detail operations with list pagination and compatible associated data.
    - _Requirements: 5.9, 12.5, 12.6, 12.7, 12.13, 14.13_

  - [ ] 7.6 Implement the recording controller
    - Create `server/controllers/recordings.js` for read-only list, stats, failed, detail, and authorized playback, including safe unavailable responses and top-level playback aliases only on successful `/play` responses.
    - _Requirements: 5.5, 5.9, 5.11, 7.1-7.7, 12.8, 12.9, 12.10, 12.11, 12.12, 12.13, 14.13_

  - [ ] 7.7 Implement the audit controller
    - Create `server/controllers/audit-logs.js` for authorized read-only list and stats responses with no mutation handlers.
    - _Requirements: 5.6, 6.3, 13.1, 13.2, 14.13_

  - [ ] 7.8 Implement dashboard and company controllers
    - Create `server/controllers/dashboard.js` and `server/controllers/companies.js` for summary, paginated activity, and paginated read-only company projections with standard and compatibility response shapes.
    - _Requirements: 5.7, 5.9, 13.3, 13.4, 13.5, 13.6, 13.7, 13.9, 14.13_

- [ ] 8. Register protected routes and assemble the runtime
  - [ ] 8.1 Implement authentication routes
    - Create `server/routes/auth.js` with public rate-limited validated login and authenticated `/me` and `/logout` routes using the new authorization middleware.
    - _Requirements: 10.2, 10.7, 10.8, 14.1, 14.3_

  - [ ] 8.2 Implement employee routes
    - Create `server/routes/employees.js`, register `/stats` before `/:empId`, validate every input, allow configured authenticated reads, and restrict mutations to `SUPER_ADMIN` and `ADMIN`.
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.15, 14.1_

  - [ ] 8.3 Implement device routes
    - Create `server/routes/devices.js`, register `/stats` and link/unlink actions safely around `/:serialNumber`, validate inputs, and enforce read/mutation Role policies.
    - _Requirements: 11.7, 11.8, 11.9, 11.10, 11.11, 11.12, 11.13, 11.14, 11.15, 14.1_

  - [ ] 8.4 Implement call routes
    - Create `server/routes/calls.js` with authenticated validated `/stats` and `/recent` routes before `/:id`, and expose only approved read operations.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.13, 12.14, 14.1_

  - [ ] 8.5 Implement form routes
    - Create `server/routes/forms.js` with authenticated validated `/pending` before `/:id`, list/detail reads, and no public form mutation route.
    - _Requirements: 12.5, 12.6, 12.7, 12.13, 12.14, 14.1_

  - [ ] 8.6 Implement recording routes
    - Create `server/routes/recordings.js` with authenticated validated `/stats` and `/failed` before `/:id`, metadata detail, and role-protected `/:id/play` without metadata URL leakage.
    - _Requirements: 7.5, 7.7, 12.8, 12.9, 12.10, 12.11, 12.12, 12.13, 12.14, 14.1_

  - [ ] 8.7 Implement audit routes
    - Create `server/routes/audit-logs.js` with authorized validated `/stats` before list/detail patterns and no create, update, or delete route.
    - _Requirements: 6.3, 13.1, 13.2, 14.1_

  - [ ] 8.8 Implement dashboard and company routes
    - Create `server/routes/dashboard.js` and `server/routes/companies.js` for authenticated summary, paginated activity, and read-only company list operations.
    - _Requirements: 13.3, 13.5, 13.6, 13.9, 14.1_

  - [ ] 8.9 Assemble the API route index
    - Rewrite `server/routes/index.js` to mount auth, employees, devices, calls, forms, recordings, audit logs, dashboard, and companies at their current `/api` URLs without importing the legacy monolithic resource controller.
    - Preserve static-before-parameter route ordering through the resource routers.
    - _Requirements: 5.12, 11.1-11.15, 12.1-12.14, 13.1-13.9_

  - [ ] 8.10 Rewrite application startup and middleware wiring
    - Rewrite `server/src.js` to load validated configuration first, apply security/parsing/logging/routes/not-found/error middleware in order, authenticate PostgreSQL before listening on configured port `5000`, and exit non-zero without fallback listeners after database failure.
    - Export an application/start function suitable for tests, avoid logging secrets or signed URLs, and keep database synchronization in the explicit root command rather than creating undeclared tables at request startup.
    - _Requirements: 9.2, 9.9, 9.10, 9.11, 9.12, 10.12, 14.2, 14.3, 14.10, 14.11, 14.13, 14.14, 15.1, 15.7_

  - [ ]* 8.11 Write route registration and response-shape tests
    - Create `server/test/unit/routes-and-envelopes.test.js` to assert static route precedence, authentication/Role middleware placement, absent mutation routes, async error forwarding, list pagination, and canonical/compatibility envelope placement.
    - _Requirements: 4.5, 5.9, 5.10, 5.11, 6.3, 12.13, 12.14, 13.9, 14.13_

- [ ] 9. Checkpoint - Ensure all service and API wiring tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement canonical dynamic transactional seed data
  - [ ] 10.1 Create deterministic-cardinality dynamic seed fixture builders
    - Create `server/scripts/seed-fixtures.js` to build exactly 8 employees, 6 devices, 20 calls, 12 forms, 15 recordings, and 10 audits using the invocation-relative Asia/Kolkata day buckets `0/1/3/5/7`.
    - Allocate 12 CLIENT, 3 TEAM_MEMBER, and 5 PERSONAL/MISSED/PENDING calls; include linked/unlinked devices and completed/pending-or-uploading/failed recordings while satisfying every category and link invariant.
    - Build child fixtures only from caller-supplied queried parent rows and generate each S3 key as `recordings/{employeeId}/{yyyy}/{MM}/{dd}/{callUuid}.m4a`.
    - _Requirements: 3.1, 8.1, 8.2, 8.4, 8.7, 8.8, 8.9, 8.11_

  - [ ] 10.2 Implement post-insertion seed invariant verification
    - Create `server/scripts/seed-verify.js` to re-query all six exact counts and verify foreign keys, one-to-one children, category behavior, child flags, recording-device equality, required day buckets, and S3 key/date agreement inside the active transaction.
    - Throw before commit on any count or invariant mismatch.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.10, 8.11_

  - [ ] 10.3 Rewrite the canonical transactional seed command
    - Rewrite `server/scripts/seed.js` to validate configuration, authenticate, begin one transaction, abort without mutation if any domain table is nonempty, insert in FK order, re-query inserted calls for UUID mapping, build children from those rows, insert audits last, verify, commit, and close.
    - Roll back every inserted row on preparation, insertion, verification, or injected failure and expose a non-zero command exit without deleting existing audit history.
    - _Requirements: 8.1, 8.3, 8.5, 8.6, 8.7, 8.10, 8.11, 15.3, 15.5_

  - [ ] 10.4 Eliminate duplicate seed entry points
    - Remove `server/utils/seed.js` or reduce it to a side-effect-free thin launcher importing the canonical `server/scripts/seed.js`; remove obsolete seed verification entry points that duplicate canonical logic.
    - Ensure there is exactly one fixture construction/insertion implementation.
    - _Requirements: 15.3, 15.5_

  - [ ]* 10.5 Write the seed-cardinality property test
    - Create `server/test/property/seed-cardinality.property.test.js` for arbitrary valid invocation instants on an empty disposable schema.
    - **Property 19: Seed cardinality**
    - **Validates: Requirements 8.1**

  - [ ]* 10.6 Write the seed-date-spreading property test
    - Create `server/test/property/seed-date-spreading.property.test.js` across arbitrary dates, month/year boundaries, and daylight-independent Asia/Kolkata calculations.
    - **Property 20: Seed date spreading**
    - **Validates: Requirements 8.2**

  - [ ]* 10.7 Write the seed-FK-mapping property test
    - Create `server/test/property/seed-fk-mapping.property.test.js` with randomized database return order and UUIDs to prevent positional/stale fixture assumptions.
    - **Property 21: Seed FK mapping**
    - **Validates: Requirements 8.3**

  - [ ]* 10.8 Write the seed-key/date-agreement property test
    - Create `server/test/property/seed-key-date-agreement.property.test.js` over arbitrary seeded calls and boundary dates.
    - **Property 22: Seed key/date agreement**
    - **Validates: Requirements 8.4**

  - [ ]* 10.9 Write the transaction-rollback property test
    - Create `server/test/property/transaction-rollback.property.test.js` with injected failures at each seed/domain transaction stage and compare all visible rows before and after.
    - **Property 23: Transaction rollback**
    - **Validates: Requirements 8.5**

- [ ] 11. Add targeted automated integration and compatibility coverage
  - [ ]* 11.1 Create isolated PostgreSQL and HTTP test harnesses
    - Create reusable modules under `server/test/helpers/` for disposable schema setup/teardown, transaction failure injection, generated relational fixtures, mocked configured principals/S3 signer, and in-process Express requests without starting a long-running development server.
    - Keep test schemas and credentials isolated from non-test data and make teardown bounded and deterministic.
    - _Requirements: 2.11, 6.2, 8.5, 9.10, 9.11, 14.11_

  - [ ]* 11.2 Write authentication and platform API contract tests
    - Create `server/test/contract/auth-platform.contract.test.js` for login, top-level token/user aliases, `/me`, stateless logout, audit events, invalid credentials/tokens, Role denial, validation, CORS, rate limiting, startup database failure, and safe error/redaction behavior.
    - _Requirements: 5.10, 6.7, 9.9-9.12, 10.2-10.12, 14.1-14.14_

  - [ ]* 11.3 Write employee and device integration/API contract tests
    - Create `server/test/contract/employees-devices.contract.test.js` for every endpoint/filter/stats/detail/mutation, soft deletion, link-state transitions, competing row locks, atomic audit behavior, DTO aliases, authorization, conflicts, and pagination.
    - _Requirements: 2.3, 2.6-2.11, 5.3, 6.2, 11.1-11.15_

  - [ ]* 11.4 Write call, form, recording, and playback integration/API contract tests
    - Create `server/test/contract/calls-forms-recordings.contract.test.js` for every list/detail/stats/recent/pending/failed filter, category/child invariants, distinct counts, metadata URL exclusion, playback authorization/status/signing/audit behavior, DTO aliases, and static route precedence.
    - _Requirements: 3.1-3.9, 4.1-4.17, 5.4, 5.5, 7.1-7.7, 12.1-12.14_

  - [ ]* 11.5 Write audit, dashboard, activity, and company integration/API contract tests
    - Create `server/test/contract/audit-dashboard-companies.contract.test.js` for audit list/stats/read-only behavior, database aggregate KPIs, paginated mixed activity, normalized company grouping/latest contact/salesperson/counts, null unavailable fields, and absent company mutations/tables.
    - _Requirements: 5.6, 5.7, 6.1, 6.3, 13.1-13.9_

  - [ ]* 11.6 Write active React compatibility and client-build tests
    - Create `server/test/contract/react-client.contract.test.js` to exercise every current URL and field/array placement consumed by `client/src/main-live.jsx`, including list mirrors, Mongo-shaped associations, login, dashboard, companies, recordings, audits, and playback.
    - Run the non-watch client build as part of the bounded test command and fail on server contract or active-entry-point drift without redesigning the React client.
    - _Requirements: 5.1-5.12, 10.12, 15.1, 15.7_

- [ ] 12. Complete root commands, Mongo removal, and bounded smoke validation
  - [ ] 12.1 Add canonical root database commands
    - Update root `package.json` to retain `dev` and `install:all` and add `db:sync`, `seed`, and sequential `db:setup` passthroughs to the canonical server commands.
    - Keep root/server/client ES-module and active React entry-point behavior unchanged.
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.7_

  - [ ] 12.2 Remove all remaining Mongo runtime artifacts and obsolete modules
    - Scan active source, manifests, and lockfiles; remove Mongoose/Mongo sanitization imports, models, connections, query idioms, middleware, configuration paths, stale monolithic controllers, obsolete admin/user persistence scripts, and duplicate seed logic.
    - Confirm all active route/service imports resolve to Sequelize modules and that no user/session/upload queue/company/contact persistence or audio-binary database path remains.
    - _Requirements: 1.1, 9.7, 9.8, 10.1, 10.10, 13.8, 15.5, 15.7, 15.8, 15.9, 15.10_

  - [ ]* 12.3 Add a static migration-boundary test
    - Create `server/test/architecture/postgresql-boundary.test.js` to scan runtime source and package metadata for forbidden Mongo artifacts, undeclared application tables, duplicate seed implementations, persistent auth/session stores, upload workers, and private playback URL persistence.
    - _Requirements: 1.1, 7.2, 9.7, 10.10, 15.5, 15.7, 15.8, 15.9, 15.10_

  - [ ]* 12.4 Add and execute a bounded root-command smoke validator
    - Create `scripts/smoke-local.js` and a root non-watch smoke command that runs root `db:sync`, then `seed`, then spawns root `dev` with a strict timeout, waits for API `5000` and the active client `5173`, validates health/login/populated protected responses, and always terminates the process tree.
    - Fail if command order, exact seed counts, startup database authentication, fixed ports, active React entry, or response population is incorrect; never persist or print credentials or signed URLs.
    - Use this automated bounded harness instead of leaving a development server or watcher running.
    - _Requirements: 8.1, 9.10, 9.11, 9.12, 10.12, 15.1, 15.2, 15.3, 15.4, 15.6, 15.7_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for a faster MVP; non-optional tasks are implementation work.
- Every correctness property from the design has one dedicated `fast-check` task with its property and requirement number.
- All implementation and test code uses JavaScript ES modules, as selected by the design.
- Each leaf task assumes `requirements.md` and `design.md` are available and must not weaken their schema, security, compatibility, or transaction constraints.
- Execute tasks by dependency wave. Tasks in the same wave use distinct primary files and may run in parallel; later wiring tasks own shared indexes and entry points.
- The smoke validator is bounded automation; task execution must not leave `npm run dev`, Vite, Nodemon, or another watcher running.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2", "1.4", "2.1"]
    },
    {
      "id": 1,
      "tasks": ["1.3", "2.2", "2.3", "2.4", "2.5", "4.1", "4.3", "4.6", "4.7", "4.8"]
    },
    {
      "id": 2,
      "tasks": ["1.5", "1.6", "2.6", "4.2", "4.4", "4.9", "4.11", "4.12", "4.13", "4.14", "4.15"]
    },
    {
      "id": 3,
      "tasks": ["2.7", "4.5", "4.10", "5.5", "5.6", "5.7", "5.8", "5.9", "5.10", "5.11", "6.1"]
    },
    {
      "id": 4,
      "tasks": ["2.8", "5.1", "5.2", "5.3", "5.4", "6.2", "7.1"]
    },
    {
      "id": 5,
      "tasks": ["2.9", "2.10", "2.11", "2.12", "2.13", "5.12", "5.13", "5.14", "5.15", "5.16", "5.17", "6.3", "6.4", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8", "11.1"]
    },
    {
      "id": 6,
      "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8", "10.1", "10.2"]
    },
    {
      "id": 7,
      "tasks": ["8.9", "8.11", "10.3"]
    },
    {
      "id": 8,
      "tasks": ["8.10", "10.4", "10.5", "10.6", "10.7", "10.8", "10.9", "12.1"]
    },
    {
      "id": 9,
      "tasks": ["12.2"]
    },
    {
      "id": 10,
      "tasks": ["11.2", "11.3", "11.4", "11.5", "11.6", "12.3"]
    },
    {
      "id": 11,
      "tasks": ["12.4"]
    }
  ]
}
```
