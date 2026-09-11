# Requirements Document

## Introduction

This document defines the requirements for migrating the Call Tracking Admin Portal from MongoDB and Mongoose to PostgreSQL 18 and Sequelize while preserving the active React and Express behavior. The migration establishes an exact six-table relational domain, config-backed stateless JWT authentication, protected resource APIs, compatibility projections for the active React client, immutable auditing, on-demand S3 recording playback, deterministic dynamic seed data, and root-level database commands. The requirements derive from the approved design and retain the requirement numbering referenced by the design correctness properties.

## Glossary

- **Migration_System**: The complete Call Tracking Admin Portal after the PostgreSQL migration, including server configuration, persistence, APIs, compatibility behavior, and development commands.
- **Schema_Manager**: The server component that defines and synchronizes Sequelize models, relational constraints, indexes, associations, and database guards.
- **Database_Module**: The server component that validates database configuration and owns the Sequelize connection lifecycle.
- **Startup_Process**: The server initialization sequence that validates configuration, authenticates PostgreSQL, and opens the HTTP listener.
- **Domain_Service**: The server layer that enforces transactional business invariants for employees, devices, calls, forms, recordings, and audits.
- **Query_Service**: The server layer that constructs validated, parameterized filters, counts matching rows, and returns ordered paginated data.
- **Resource_API**: The protected Express HTTP interface for domain resources, dashboards, audits, and compatibility views.
- **Compatibility_Adapter**: The presentation layer that adds temporary Mongo-shaped identifiers and camelCase aliases to canonical relational fields for the Active_React_Client.
- **Authentication_Service**: The server component that authenticates a Configured_Principal and issues stateless JSON Web Tokens.
- **Configured_Principal_Provider**: The environment-backed provider that resolves authorized administrators by stable identifier or normalized email without a database identity table.
- **Authorization_Middleware**: The middleware that verifies a JSON Web Token, resolves the corresponding Configured_Principal, and enforces Role permissions.
- **Audit_Service**: The component that appends immutable Audit_Events and excludes sensitive values from audit snapshots.
- **Playback_Service**: The component that authorizes recording playback and requests fresh Amazon S3 pre-signed URLs.
- **Seed_Service**: The transactional process that inserts and verifies deterministic-cardinality development data using invocation-relative dates.
- **Request_Validator**: The middleware that validates request bodies, path parameters, and query parameters before controller execution.
- **Error_Middleware**: The middleware that converts operational and unexpected errors into safe Standard_Response_Envelopes.
- **Root_Command_Interface**: The root `package.json` scripts through which developers start the application, synchronize the database, and seed data.
- **Active_React_Client**: The application loaded from `client/src/main-live.jsx` through `client/index.html` at `http://localhost:5173`.
- **Domain_Table_Set**: The application-owned PostgreSQL tables `employees`, `devices`, `call_logs`, `call_form_data`, `call_recordings`, and `audit_logs`.
- **Canonical_Field**: A relational API field whose name and value directly represent a PostgreSQL model attribute or association.
- **Compatibility_Alias**: A temporary `_id`, camelCase, top-level, or Mongo-shaped projection required by the Active_React_Client.
- **Standard_Response_Envelope**: A JSON object containing boolean `success`, member `data`, and string `message`, with `pagination` for list responses.
- **Pagination_Metadata**: The object `{ page, limit, total, pages }`, where `page` and `limit` describe the current partition, `total` is the complete matching count, and `pages` is `ceil(total / limit)` or `0` for no matches.
- **Active_Filter**: A validated query parameter supplied by the requester that contributes a conjunctive predicate to a resource query.
- **Matching_Row**: A row that satisfies every Active_Filter for a request.
- **Stable_Order**: Deterministic descending `created_at` ordering with a deterministic key tie-breaker where equal timestamps can occur.
- **Configured_Principal**: An active administrator loaded from environment configuration with stable `id`, `name`, normalized `email`, bcrypt `passwordHash`, and Role.
- **Role**: One of `SUPER_ADMIN`, `ADMIN`, or `MANAGER`.
- **JSON_Web_Token**: A signed bearer token containing Configured_Principal `id` and Role and expiring according to `JWT_EXPIRY`.
- **Soft_Deletion**: An employee lifecycle operation that atomically sets `is_active=false` and `deleted_at` while retaining the physical row and historical associations.
- **Audit_Event**: One append-only `audit_logs` row describing an actor, action, entity, request context, success state, and redacted before/after snapshots.
- **Database_Transaction**: A PostgreSQL unit of work whose changes either all commit or all roll back.
- **Completed_Recording**: A `call_recordings` row whose `upload_status` is `COMPLETED`.
- **Playback_URL**: A short-lived Amazon S3 pre-signed `GetObject` URL generated from a persisted bucket and key.
- **Asia_Kolkata_Day**: A calendar day whose boundaries and date segments are calculated in the `Asia/Kolkata` process timezone.
- **Category_Behavior_Matrix**: The allowed combinations of call category, direction, duration, child rows, and behavior flags defined in Requirement 3.
- **Eligible_Recording_Category**: The `CLIENT` or `TEAM_MEMBER` call category.
- **Relative_Day_Bucket**: An Asia_Kolkata_Day at offset `0`, `1`, `3`, `5`, or `7` days before seed invocation.
- **Mongo_Runtime_Artifact**: A runtime dependency, import, model, middleware, connection, query, or configuration path that uses MongoDB, Mongoose, or `express-mongo-sanitize`.
- **Relational_Constraint**: A PostgreSQL primary-key, foreign-key, uniqueness, nullability, check, or delete/update rule.
- **E.164_Number**: A normalized international telephone number accepted by the server's E.164 validation rule.
- **UUID**: A PostgreSQL universally unique identifier generated with a version-4 default where declared.
- **TIMESTAMPTZ**: A PostgreSQL timestamp-with-time-zone value representing an instant.
- **JSONB**: PostgreSQL binary JSON storage.
- **INET**: PostgreSQL network-address storage.
- **BIGINT_JSON_Value**: A byte count serialized as a JSON number only within the JavaScript safe-integer range and as a decimal string otherwise.
- **Application_Table**: A table created and owned by this application, excluding PostgreSQL system catalogs and Sequelize metadata.

## Requirements

### Requirement 1: Exact PostgreSQL Domain Schema

**User Story:** As a system administrator, I want an exact relational schema, so that call-tracking data is constrained and no obsolete persistence tables remain.

#### Acceptance Criteria

1. THE Schema_Manager SHALL synchronize an Application_Table set equal to the Domain_Table_Set and containing no `users`, `user_sessions`, `sessions`, or `upload_queue` table.
2. THE Schema_Manager SHALL define `employees` with `emp_id VARCHAR(50)` primary key; required `full_name VARCHAR(255)`, `email VARCHAR(255)`, `phone_number VARCHAR(20)`, and `designation VARCHAR(100)`; required `is_active BOOLEAN` defaulting to `true`; required `created_at TIMESTAMPTZ` and `updated_at TIMESTAMPTZ`; and nullable `deleted_at TIMESTAMPTZ`.
3. THE Schema_Manager SHALL define `devices` with `serial_number VARCHAR(50)` primary key; nullable `employee_id VARCHAR(50)`; required unique `imei_1 VARCHAR(50)`; nullable unique-when-present `imei_2 VARCHAR(50)`; required unique `phone_number_1 VARCHAR(20)`; nullable `phone_number_2 VARCHAR(20)`; required `link_status` defaulting to `UNLINKED`; nullable `linked_at TIMESTAMPTZ` and `linked_by VARCHAR(255)`; required `is_active BOOLEAN` defaulting to `true`; required `registered_at TIMESTAMPTZ` defaulting to the current time; nullable `last_seen_at TIMESTAMPTZ` and `last_sync_at TIMESTAMPTZ`; and required `created_at TIMESTAMPTZ` and `updated_at TIMESTAMPTZ`.
4. THE Schema_Manager SHALL define `call_logs` with `id UUID` primary key defaulting to UUID version 4; required `device_serial VARCHAR(50)`, `employee_id VARCHAR(50)`, `call_direction`, `caller_number VARCHAR(20)`, `callee_number VARCHAR(20)`, and `call_category` defaulting to `PENDING`; required `duration_seconds INTEGER` defaulting to `0`; required `is_form_required BOOLEAN`, `is_form_submitted BOOLEAN`, and `has_recording BOOLEAN` defaulting to `false`; and required `created_at TIMESTAMPTZ` and `updated_at TIMESTAMPTZ`.
5. THE Schema_Manager SHALL define `call_form_data` with `id UUID` primary key defaulting to UUID version 4; required unique `call_log_id UUID`; required `company_name VARCHAR(255)`, `customer_name VARCHAR(255)`, and `reason_for_call TEXT`; nullable `notes TEXT`; and required `created_at TIMESTAMPTZ` and `updated_at TIMESTAMPTZ`.
6. THE Schema_Manager SHALL define `call_recordings` with `id UUID` primary key defaulting to UUID version 4; required unique `call_log_id UUID`; required `device_serial VARCHAR(50)`, `file_size_bytes BIGINT`, `s3_bucket VARCHAR(255)`, unique `s3_key VARCHAR(500)`, and `upload_status` defaulting to `PENDING`; nullable `local_file_path VARCHAR(500)`, `next_retry_at TIMESTAMPTZ`, and `error_message TEXT`; required `retry_count INTEGER` defaulting to `0`; required `max_retries INTEGER` defaulting to `3`; and required `created_at TIMESTAMPTZ` and `updated_at TIMESTAMPTZ`.
7. THE Schema_Manager SHALL define `audit_logs` with `id UUID` primary key defaulting to UUID version 4; required `admin_user VARCHAR(255)`, `action`, `entity_type`, `success BOOLEAN` defaulting to `true`, `ip_address INET`, `user_agent TEXT`, and `created_at TIMESTAMPTZ` defaulting to the current time; nullable `old_values JSONB` and `new_values JSONB`; and no `updated_at` column.
8. THE Schema_Manager SHALL enforce unique employee `email`, unique employee `phone_number`, E.164 employee phone validation, lowercase normalized employee email, and trimmed employee names.
9. THE Schema_Manager SHALL enforce E.164 validation for device phone fields, non-negative `call_logs.duration_seconds`, non-negative `call_recordings.file_size_bytes`, non-negative `retry_count`, and non-negative `max_retries`.
10. THE Schema_Manager SHALL create employee indexes for unique `email`, unique `phone_number`, `is_active`, `designation`, `deleted_at`, and `(is_active, deleted_at)`.
11. THE Schema_Manager SHALL create device indexes for unique IMEI values, unique primary phone number, `employee_id`, `link_status`, `is_active`, `last_seen_at`, and `(employee_id, is_active)`.
12. THE Schema_Manager SHALL create call indexes for `employee_id`, `device_serial`, `call_direction`, `call_category`, `created_at`, `(employee_id, created_at DESC)`, `(call_category, created_at DESC)`, pending forms, and calls with recordings.
13. THE Schema_Manager SHALL create form indexes for unique `call_log_id`, case-insensitive company search, and `created_at`.
14. THE Schema_Manager SHALL create recording indexes for unique `call_log_id`, unique `s3_key`, `device_serial`, `upload_status`, `next_retry_at`, and `(upload_status, updated_at DESC)`.
15. THE Schema_Manager SHALL create audit indexes for `admin_user`, `action`, `entity_type`, `entity_id`, `success`, `created_at DESC`, and `(entity_type, entity_id, created_at DESC)`.
16. THE Schema_Manager SHALL expose shared enum constants for Roles, device link statuses, call directions, call categories, recording upload statuses, audit actions, and audit entity types using the exact values declared by the approved design.
17. THE Schema_Manager SHALL map Sequelize model fields and timestamps to the declared snake_case PostgreSQL column names.
18. WHEN a recording byte count exceeds the JavaScript safe-integer range, THE Compatibility_Adapter SHALL serialize the byte count as a BIGINT_JSON_Value decimal string.

### Requirement 2: Relationship Integrity and Resource Lifecycles

**User Story:** As a data steward, I want relational and lifecycle rules enforced, so that every persisted relationship remains valid throughout administrative operations.

#### Acceptance Criteria

1. THE Schema_Manager SHALL enforce that every non-null device employee reference resolves to one employee, every call employee and device reference resolves to one parent row, and every form and recording call reference resolves to one parent call.
2. THE Schema_Manager SHALL enforce at most one `call_form_data` row and at most one `call_recordings` row for each call identifier.
3. WHEN an authorized administrator deletes an active employee, THE Domain_Service SHALL perform Soft_Deletion while preserving the employee row, associated calls, and associated devices for historical reads.
4. THE Schema_Manager SHALL define the association aliases `devices`, `employee`, `callLogs`, `device`, `callForm`, `callLog`, `recording`, and `recordings` as specified by the approved design.
5. THE Schema_Manager SHALL apply `ON UPDATE CASCADE` and `ON DELETE SET NULL` to the device employee foreign key, restrict deletion of referenced call employees and devices, and cascade call deletion to associated forms and recordings.
6. THE Domain_Service SHALL enforce device link states as follows: `UNLINKED` has null employee, link timestamp, and linker; `AUTO_LINKED` has an employee and link timestamp with linker null or `SYSTEM`; `MANUAL_LINKED` has an employee, link timestamp, and linker; and `DEACTIVATED` has `is_active=false`.
7. WHEN an authorized administrator links an active device to an active employee, THE Domain_Service SHALL atomically update link metadata and append exactly one `LINK_DEVICE` Audit_Event.
8. WHEN an authorized administrator unlinks a device, THE Domain_Service SHALL atomically clear the employee reference, link timestamp, and linker and set link status to `UNLINKED`.
9. WHEN an authorized administrator deactivates a referenced device, THE Domain_Service SHALL retain the historical employee linkage and referenced call and recording rows.
10. IF a requested employee identifier is held by a Soft_Deleted employee row, THEN THE Domain_Service SHALL return a conflict response and preserve the existing row.
11. WHILE a device link transaction holds the device and employee row locks, THE Domain_Service SHALL serialize competing link operations against those rows.

### Requirement 3: Call Category and Child-Row Invariants

**User Story:** As a call-data administrator, I want category-specific invariants enforced, so that forms, recordings, flags, directions, and durations remain internally consistent.

#### Acceptance Criteria

1. THE Domain_Service SHALL persist calls only in these Category_Behavior_Matrix states: `CLIENT` uses `INCOMING` or `OUTGOING`, requires a form, permits zero or one recording, and derives child flags from child existence; `TEAM_MEMBER` uses `INCOMING` or `OUTGOING`, forbids a form, permits zero or one recording, and derives the recording flag from child existence; `PERSONAL` uses `INCOMING` or `OUTGOING` and has no form, recording, or behavior flags; `MISSED` uses direction `MISSED`, duration `0`, and has no form, recording, or behavior flags; and `PENDING` uses `INCOMING` or `OUTGOING` and has no form, recording, or behavior flags.
2. WHEN a form is persisted, THE Domain_Service SHALL require a `CLIENT` parent with `is_form_required=true` and set the parent `is_form_submitted=true` in the same Database_Transaction.
3. WHEN a recording is persisted, THE Domain_Service SHALL require an Eligible_Recording_Category parent, require the recording device to equal the parent call device, and set the parent `has_recording=true` in the same Database_Transaction.
4. THE Domain_Service SHALL maintain `is_form_submitted` as equivalent to form-row existence and `has_recording` as equivalent to recording-row existence after every committed domain operation.
5. WHEN a call category transition is requested, THE Domain_Service SHALL lock the parent and child rows and apply the transition in one Database_Transaction.
6. IF a category transition would forbid an existing form or recording, THEN THE Domain_Service SHALL return a conflict response and preserve the call and child rows.
7. IF `is_form_submitted=true` while `is_form_required=false`, THEN THE Schema_Manager SHALL reject the call state.
8. IF a `MISSED` call has a non-zero duration, THEN THE Schema_Manager SHALL reject the call state.
9. IF a call outside an Eligible_Recording_Category is marked with `has_recording=true`, THEN THE Schema_Manager SHALL reject the call state.

### Requirement 4: Query, Pagination, Filtering, and Envelope Semantics

**User Story:** As an API consumer, I want predictable query and response behavior, so that list, filter, stats, and dashboard requests are complete and consistent.

#### Acceptance Criteria

1. THE Query_Service SHALL partition every filtered list so that concatenating all pages in Stable_Order returns each Matching_Row exactly once and the reported `total` equals the database count.
2. WHEN untrusted pagination values are received, THE Query_Service SHALL produce an integer `page` of at least `1`, an integer `limit` in `[1, 200]`, and a non-negative offset using defaults `page=1` and `limit=20` for absent or invalid values.
3. WHEN a list query returns a row, THE Query_Service SHALL ensure that the row satisfies every Active_Filter.
4. THE Query_Service SHALL include every Matching_Row on exactly one page before concurrent data mutation.
5. WHEN the Resource_API returns a JSON body, THE Resource_API SHALL use a Standard_Response_Envelope and include valid Pagination_Metadata for every list success response.
6. WHEN a list query has zero Matching_Rows, THE Resource_API SHALL return an empty `data` array with `total=0` and `pages=0`.
7. WHEN multiple Active_Filters are supplied, THE Query_Service SHALL combine the filters using logical conjunction.
8. WHEN a supported filter is omitted, THE Query_Service SHALL leave the corresponding domain unrestricted.
9. WHEN a date-only `from` or `to` filter is supplied, THE Query_Service SHALL apply inclusive Asia_Kolkata_Day boundaries.
10. WHEN a call query uses `classification=BUSINESS`, THE Query_Service SHALL match categories `CLIENT` and `TEAM_MEMBER`.
11. WHEN a call query uses `classification=PERSONAL`, THE Query_Service SHALL match category `PERSONAL`.
12. WHEN a call query uses `recordingStatus=UPLOADED`, THE Query_Service SHALL match recording status `COMPLETED`.
13. WHEN a call query uses `recordingStatus=HAS_RECORDING`, `NONE`, `PENDING`, or `FAILED`, THE Query_Service SHALL apply the corresponding relational recording-existence or upload-status predicate.
14. WHEN a call query uses `company`, THE Query_Service SHALL filter through associated form company data.
15. THE Query_Service SHALL use one equivalent predicate and association set for paginated rows and the corresponding count.
16. THE Query_Service SHALL use distinct counting when query joins could duplicate parent rows.
17. WHEN a request supplies an unsupported enum, malformed identifier, or invalid date range, THE Request_Validator SHALL return a `400` Standard_Response_Envelope before database execution.

### Requirement 5: Active React Client Compatibility

**User Story:** As an administrator using the existing dashboard, I want the migrated API to preserve current endpoint and field expectations, so that the dashboard remains populated without a simultaneous React rewrite.

#### Acceptance Criteria

1. WHEN the Compatibility_Adapter maps a call, THE Compatibility_Adapter SHALL map `CLIENT` and `TEAM_MEMBER` to client classification `BUSINESS` and map `PERSONAL` to client classification `PERSONAL`.
2. WHEN the Compatibility_Adapter maps a recording status, THE Compatibility_Adapter SHALL map `COMPLETED` to `UPLOADED`, map `PENDING`, `UPLOADING`, and `RETRY_SCHEDULED` to `PENDING`, and map `FAILED` to `FAILED`.
3. WHEN the Compatibility_Adapter maps an employee, THE Compatibility_Adapter SHALL include canonical employee fields plus `id`, `_id`, `employeeId`, `name`, `phone`, `department`, and `status` aliases derived from the same employee row.
4. WHEN the Compatibility_Adapter maps a call, THE Compatibility_Adapter SHALL include canonical call fields plus `id`, `_id`, `callId`, a Mongo-shaped `employeeId`, `direction`, `startTime`, `duration`, `classification`, a form-derived `companyId`, and a recording-derived `recordingId`.
5. WHEN the Compatibility_Adapter maps a recording, THE Compatibility_Adapter SHALL include canonical recording fields plus `id`, `_id`, Mongo-shaped employee and call references, S3-key-derived `fileName`, safely serialized `fileSize`, client `uploadStatus`, and `uploadedAt` only for a Completed_Recording.
6. WHEN the Compatibility_Adapter maps an Audit_Event, THE Compatibility_Adapter SHALL include canonical audit fields plus `id`, `_id`, `timestamp`, a Mongo-shaped `userId`, `action`, `resourceId`, and `success`.
7. WHEN the Compatibility_Adapter maps a company projection, THE Compatibility_Adapter SHALL include normalized `id` and `_id`, company name, latest customer as `contactPerson`, assigned salesperson, and `totalCalls` and SHALL represent unavailable phone, email, industry, and location values as `null`.
8. THE Compatibility_Adapter SHALL retain every Canonical_Field while adding Compatibility_Aliases.
9. WHEN the Resource_API returns a list response, THE Compatibility_Adapter SHALL mirror `page`, `pages`, and `total` from Pagination_Metadata at the response top level.
10. WHEN login succeeds, THE Compatibility_Adapter SHALL mirror `token` and password-free `user` at the response top level while retaining both members under `data`.
11. WHEN recording playback succeeds, THE Compatibility_Adapter SHALL mirror `url`, `expiresIn`, and `fileName` at the response top level while retaining those members under `data`.
12. WHEN the Active_React_Client requests employees, calls, companies, recordings, audits, dashboards, or playback through the current URLs, THE Resource_API SHALL return the fields and array placement consumed by `client/src/main-live.jsx`.

### Requirement 6: Immutable and Atomic Audit History

**User Story:** As a compliance administrator, I want immutable audit history coupled to administrative operations, so that prior activity remains trustworthy.

#### Acceptance Criteria

1. THE Audit_Service SHALL maintain append-only audit history in which existing Audit_Event values remain unchanged and PostgreSQL rejects `UPDATE`, `DELETE`, and `TRUNCATE` operations against `audit_logs`.
2. WHEN an audited domain command commits, THE Domain_Service SHALL commit the domain mutation and exactly one corresponding Audit_Event in the same Database_Transaction; when the transaction rolls back, neither change SHALL become visible.
3. THE Resource_API SHALL expose audit history through read-only list and stats operations with no create, update, or delete audit endpoint.
4. WHEN the Audit_Service appends an Audit_Event, THE Audit_Service SHALL record the configured administrator, allowed action, allowed entity type, entity identifier, success value, request IP address, user agent, creation timestamp, and applicable redacted snapshots.
5. THE Audit_Service SHALL accept only the audit actions and entity types declared by the shared enum constants.
6. WHEN an audit snapshot is created, THE Audit_Service SHALL exclude passwords, password hashes, JSON Web Tokens, AWS credentials, authorization headers, signed URLs, and configured secrets.
7. WHEN login, logout, device link, device unlink, resource mutation, export, protected view, or recording playback is audited, THE Audit_Service SHALL use the corresponding declared audit action and entity type.
8. WHEN the Schema_Manager synchronizes the schema, THE Schema_Manager SHALL install Sequelize mutation hooks and PostgreSQL guards for audit immutability.

### Requirement 7: Authorized On-Demand Recording Playback

**User Story:** As an authorized administrator, I want short-lived recording playback links, so that private recordings remain protected and no signed URL becomes persistent data.

#### Acceptance Criteria

1. WHEN an authenticated actor with recording access requests playback for a Completed_Recording, THE Playback_Service SHALL return a Playback_URL and playback metadata in a Standard_Response_Envelope.
2. WHEN playback succeeds, THE Playback_Service SHALL generate a fresh Playback_URL with expiry equal to `S3_PLAYBACK_EXPIRY_SECONDS` and SHALL leave all database rows and server caches free of the URL.
3. WHEN generating a Playback_URL, THE Playback_Service SHALL sign a `GetObject` request using the recording's persisted `s3_bucket` and `s3_key`.
4. IF the recording is absent or the upload status is not `COMPLETED`, THEN THE Playback_Service SHALL return a safe unavailable response without a Playback_URL.
5. IF the actor lacks recording access, THEN THE Authorization_Middleware SHALL return a `403` Standard_Response_Envelope without invoking the S3 signer.
6. WHEN playback succeeds, THE Audit_Service SHALL append a `PLAY_RECORDING` Audit_Event for the recording.
7. WHEN recording metadata is requested without `/play`, THE Resource_API SHALL return recording metadata without a Playback_URL.

### Requirement 8: Transactional Dynamic Seed Data

**User Story:** As a developer, I want deterministic-cardinality seed data with invocation-relative dates, so that local dashboards and relational behavior can be validated repeatedly on a clean schema.

#### Acceptance Criteria

1. WHEN seeding succeeds on an empty Domain_Table_Set, THE Seed_Service SHALL leave exactly 8 employees, 6 devices, 20 calls, 12 forms, 15 recordings, and 10 audits.
2. WHEN seeding succeeds, THE Seed_Service SHALL place at least one of the 20 calls in each Relative_Day_Bucket calculated from the invocation's Asia_Kolkata_Day without a hard-coded calendar date.
3. WHEN preparing forms and recordings, THE Seed_Service SHALL resolve parent UUIDs from call rows queried after insertion within the active Database_Transaction.
4. WHEN preparing each recording, THE Seed_Service SHALL construct `recordings/{employeeId}/{yyyy}/{MM}/{dd}/{callUuid}.m4a` using the associated call's Asia_Kolkata_Day and queried UUID.
5. IF any seed insertion, count verification, or invariant verification fails, THEN THE Seed_Service SHALL roll back the complete seed Database_Transaction and expose no partial seed rows.
6. IF any Domain_Table_Set table contains a row before seeding, THEN THE Seed_Service SHALL abort without deleting or changing existing rows.
7. WHEN seeding begins on an empty schema, THE Seed_Service SHALL insert employees before devices, devices before calls, calls before forms and recordings, and audits last.
8. WHEN seeding succeeds, THE Seed_Service SHALL create 12 `CLIENT` calls, 3 `TEAM_MEMBER` calls, and 5 calls distributed across `PERSONAL`, `MISSED`, and `PENDING` while satisfying the Category_Behavior_Matrix.
9. WHEN seeding succeeds, THE Seed_Service SHALL include linked and unlinked device states and recording statuses representing `COMPLETED`, pending or uploading work, and `FAILED` work.
10. WHEN seed insertion completes, THE Seed_Service SHALL re-query all six counts and verify relationship, category, child-row, and S3-key invariants before committing the Database_Transaction.
11. WHILE seed fixtures are prepared, THE Seed_Service SHALL ensure every prepared child references a parent already inserted in the active Database_Transaction.

### Requirement 9: PostgreSQL Runtime Configuration and Dependency Migration

**User Story:** As a developer, I want a validated PostgreSQL and Sequelize runtime configuration, so that local startup is deterministic and no MongoDB path remains active.

#### Acceptance Criteria

1. THE Database_Module SHALL connect locally to PostgreSQL 18 at `localhost:5432` using database `mist_avinya_db`, user `postgres`, password `1234`, and Sequelize dialect `postgres` when the specified development environment contract is loaded.
2. THE Migration_System SHALL load `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_DIALECT`, `PORT`, `NODE_ENV`, `TZ`, `CLIENT_URL`, `JWT_SECRET`, `JWT_EXPIRY`, configured principal fields, AWS fields, and `S3_PLAYBACK_EXPIRY_SECONDS` from `server/.env` through `dotenv`.
3. THE Database_Module SHALL configure the Sequelize connection timezone as `+05:30` and the process timezone as `Asia/Kolkata`.
4. THE Database_Module SHALL configure a connection pool with minimum `2`, maximum `10`, acquisition timeout `30000` milliseconds, and idle timeout `10000` milliseconds.
5. THE Migration_System SHALL use pinned compatible versions of `sequelize`, `pg`, `pg-hstore`, and `dotenv` in the server package and a pinned `fast-check` development dependency when property tests are implemented.
6. THE Migration_System SHALL retain Express, JSON Web Token, bcrypt, Helmet, CORS, rate limiting, Morgan, Zod, and AWS S3 SDK capabilities required by the approved design.
7. THE Migration_System SHALL contain zero Mongo_Runtime_Artifacts and zero package dependencies on `mongoose` or `express-mongo-sanitize`.
8. THE Migration_System SHALL retain ES module syntax in the root, server, and client package boundaries.
9. WHEN required environment configuration is absent or invalid, THE Startup_Process SHALL report a non-secret validation error and exit with a non-zero status before database connection or HTTP listening.
10. WHEN server startup begins with valid configuration, THE Startup_Process SHALL authenticate PostgreSQL before opening the HTTP listener on port `5000`.
11. IF PostgreSQL authentication fails during startup, THEN THE Startup_Process SHALL exit with a non-zero status and leave port `5000` unopened.
12. THE Migration_System SHALL keep database passwords, password hashes, JSON Web Token secrets, AWS credentials, and signed URLs out of application logs.
13. THE Database_Module SHALL store and query temporal domain values as TIMESTAMPTZ instants and calculate calendar boundaries in `Asia/Kolkata`.

### Requirement 10: Stateless Config-Backed Authentication and Authorization

**User Story:** As an administrator, I want existing JWT login and role checks preserved without an identity table, so that authentication remains compatible with the exact six-table domain.

#### Acceptance Criteria

1. THE Configured_Principal_Provider SHALL resolve active Configured_Principals from validated environment configuration by normalized email and stable identifier without querying a database identity table.
2. WHEN valid login credentials are submitted to `POST /api/auth/login`, THE Authentication_Service SHALL compare the submitted password to the configured bcrypt hash and return a signed JSON_Web_Token and password-free principal.
3. WHEN login succeeds, THE Authentication_Service SHALL sign the JSON_Web_Token with `JWT_SECRET`, include only principal `id` and Role in the application payload, and apply `JWT_EXPIRY`.
4. IF login credentials are invalid, THEN THE Authentication_Service SHALL return a generic `401` Standard_Response_Envelope without revealing whether the email or password failed.
5. WHEN a protected request includes a bearer token, THE Authorization_Middleware SHALL verify signature and expiry and resolve the active Configured_Principal by the token's stable identifier.
6. WHEN authorization succeeds, THE Authorization_Middleware SHALL attach a password-free principal to the request.
7. WHEN an authenticated actor requests `GET /api/auth/me`, THE Resource_API SHALL return the current password-free Configured_Principal in a Standard_Response_Envelope.
8. WHEN an authenticated actor requests `POST /api/auth/logout`, THE Authentication_Service SHALL return success and rely on the Active_React_Client to remove the existing local-storage token without creating or revoking a server session.
9. WHEN a protected mutation or device link operation is requested, THE Authorization_Middleware SHALL enforce the Role allowlist declared for that operation.
10. THE Authentication_Service SHALL operate without a refresh-token store, server session store, or token-revocation table.
11. WHEN login or logout completes, THE Audit_Service SHALL append the corresponding `LOGIN` or `LOGOUT` Audit_Event with entity type `AUTH`.
12. WHEN the Active_React_Client receives a successful login response, THE Active_React_Client SHALL be able to retain the JSON_Web_Token in the existing `localStorage` session flow.

### Requirement 11: Employee and Device Resource APIs

**User Story:** As an authorized administrator, I want complete employee and device APIs, so that personnel and device assignments can be managed through PostgreSQL-backed operations.

#### Acceptance Criteria

1. WHEN an authenticated actor requests `GET /api/employees`, THE Resource_API SHALL return a paginated employee list supporting `q`, `designation`, and `isActive` filters.
2. WHEN an authenticated actor requests `GET /api/employees/stats`, THE Resource_API SHALL return employee statistics for the optional validated date range.
3. WHEN an authenticated actor requests `GET /api/employees/:empId`, THE Resource_API SHALL return the employee with device and call aggregates.
4. WHEN an authorized administrator submits valid employee data to `POST /api/employees`, THE Resource_API SHALL create the employee and return the created employee in a Standard_Response_Envelope.
5. WHEN an authorized administrator submits valid mutable fields to `PATCH /api/employees/:empId`, THE Resource_API SHALL update the employee and append an `UPDATE` Audit_Event atomically.
6. WHEN an authorized administrator requests `DELETE /api/employees/:empId`, THE Resource_API SHALL perform the Soft_Deletion defined by Requirement 2.3.
7. WHEN an authenticated actor requests `GET /api/devices`, THE Resource_API SHALL return a paginated device list supporting `q`, `employeeId`, `linkStatus`, and `isActive` filters.
8. WHEN an authenticated actor requests `GET /api/devices/stats`, THE Resource_API SHALL return counts by link state, active state, and recent synchronization state.
9. WHEN an authenticated actor requests `GET /api/devices/:serialNumber`, THE Resource_API SHALL return device detail with the associated employee.
10. WHEN an authorized administrator submits valid device data to `POST /api/devices`, THE Resource_API SHALL create the device and return the created device in a Standard_Response_Envelope.
11. WHEN an authorized administrator submits valid mutable fields to `PATCH /api/devices/:serialNumber`, THE Resource_API SHALL update device metadata or status and append an `UPDATE` Audit_Event atomically.
12. WHEN an authorized administrator requests `DELETE /api/devices/:serialNumber`, THE Resource_API SHALL deactivate the device while retaining referenced history.
13. WHEN an authorized administrator submits a valid employee identifier to `POST /api/devices/:serialNumber/link`, THE Resource_API SHALL execute the atomic device-link behavior defined by Requirement 2.7.
14. WHEN an authorized administrator requests `POST /api/devices/:serialNumber/unlink`, THE Resource_API SHALL execute the atomic device-unlink behavior defined by Requirement 2.8 and append one `UNLINK_DEVICE` Audit_Event.
15. THE Authorization_Middleware SHALL restrict employee and device mutations to `SUPER_ADMIN` and `ADMIN` Roles and permit authenticated read access according to the configured read Role allowlist.

### Requirement 12: Call, Form, and Recording Resource APIs

**User Story:** As an authenticated administrator, I want complete read APIs for calls, forms, and recordings, so that operational data and upload states can be inspected without MongoDB.

#### Acceptance Criteria

1. WHEN an authenticated actor requests `GET /api/calls`, THE Resource_API SHALL return a paginated call list supporting `q`, `employee`, `employeeId`, `device`, `direction`, `category`, `classification`, `company`, `recordingStatus`, `formStatus`, `from`, and `to` filters.
2. WHEN an authenticated actor requests `GET /api/calls/stats`, THE Resource_API SHALL calculate call statistics using the same validated filter domain as the call list without pagination.
3. WHEN an authenticated actor requests `GET /api/calls/recent`, THE Resource_API SHALL return calls in Stable_Order with pagination and optional employee and category filters.
4. WHEN an authenticated actor requests `GET /api/calls/:id`, THE Resource_API SHALL return call detail with employee, device, form, and recording associations.
5. WHEN an authenticated actor requests `GET /api/forms`, THE Resource_API SHALL return a paginated form list supporting `q`, `employeeId`, `company`, `from`, and `to` filters.
6. WHEN an authenticated actor requests `GET /api/forms/pending`, THE Resource_API SHALL return paginated `CLIENT` calls whose form is required, whose submitted flag is false, and whose form row is absent.
7. WHEN an authenticated actor requests `GET /api/forms/:id`, THE Resource_API SHALL return form detail with call, employee, and device associations.
8. WHEN an authenticated actor requests `GET /api/recordings`, THE Resource_API SHALL return a paginated recording list supporting `q`, `employeeId`, `device`, `status`, `from`, and `to` filters.
9. WHEN an authenticated actor requests `GET /api/recordings/stats`, THE Resource_API SHALL return recording counts and byte totals grouped by upload status.
10. WHEN an authenticated actor requests `GET /api/recordings/failed`, THE Resource_API SHALL return paginated failed and retry-exhausted recordings.
11. WHEN an authenticated actor requests `GET /api/recordings/:id`, THE Resource_API SHALL return recording metadata without a Playback_URL.
12. WHEN an authenticated actor requests `GET /api/recordings/:id/play`, THE Resource_API SHALL invoke the playback behavior defined by Requirement 7.
13. THE Resource_API SHALL expose call, form, and recording resources as read-only operations except for domain ingestion or transition operations explicitly introduced by a later approved requirement.
14. THE Resource_API SHALL register `/stats`, `/recent`, `/pending`, and `/failed` routes before parameterized `/:id` routes.

### Requirement 13: Audit, Dashboard, Activity, and Company Projection APIs

**User Story:** As an authenticated administrator, I want operational summaries, activity, audit search, and company views, so that the existing dashboard remains informative after migration.

#### Acceptance Criteria

1. WHEN an authorized actor requests `GET /api/audit-logs`, THE Resource_API SHALL return a paginated Audit_Event list supporting `adminUser`, `action`, `entityType`, `entityId`, `success`, `from`, and `to` filters.
2. WHEN an authorized actor requests `GET /api/audit-logs/stats`, THE Resource_API SHALL return audit counts grouped by action, entity type, and success.
3. WHEN an authenticated actor requests `GET /api/dashboard`, THE Resource_API SHALL return active-employee count, filtered call count, `CLIENT` call count, total duration seconds, Completed_Recording count, and pending-form count.
4. WHEN the Resource_API calculates dashboard summary values, THE Query_Service SHALL use database `COUNT` and `SUM` aggregates rather than loading complete tables into application memory.
5. WHEN an authenticated actor requests `GET /api/dashboard/activity`, THE Resource_API SHALL return paginated recent calls, Audit_Events, failed uploads, and pending forms.
6. WHEN an authenticated actor requests `GET /api/companies`, THE Resource_API SHALL return a paginated read-only projection grouped by normalized `call_form_data.company_name` and derived through associated calls and employees.
7. WHEN the Resource_API derives a company projection, THE Query_Service SHALL use the most recent form for customer fields and SHALL calculate assigned salesperson and call count from relational associations.
8. THE Schema_Manager SHALL represent company data through `call_form_data` without creating a company Domain_Table_Set member.
9. THE Resource_API SHALL expose the company projection through read operations without create, update, or delete company endpoints.

### Requirement 14: Validation, Security, and Error Responses

**User Story:** As a system operator, I want validated and hardened API behavior, so that malformed, unauthorized, or failed requests produce safe and predictable outcomes.

#### Acceptance Criteria

1. WHEN a request reaches a resource route, THE Request_Validator SHALL validate the applicable body, path parameters, and query parameters before controller execution.
2. THE Resource_API SHALL allow browser cross-origin requests from `http://localhost:5173` and reject browser origins outside the configured local allowlist.
3. THE Resource_API SHALL apply Helmet headers, configured JSON request-size limits, and login rate limiting.
4. WHEN the Query_Service builds a search or filter query, THE Query_Service SHALL use Sequelize operators or bound parameters and allowlisted sort and enum values.
5. IF a request body, query, or path parameter is invalid, THEN THE Error_Middleware SHALL return HTTP `400` with the first actionable validation message in a Standard_Response_Envelope.
6. IF a JSON_Web_Token is absent, invalid, or expired for a protected route, THEN THE Error_Middleware SHALL return HTTP `401` with a generic authentication message in a Standard_Response_Envelope.
7. IF an authenticated actor lacks a required Role, THEN THE Error_Middleware SHALL return HTTP `403` with a generic permission message in a Standard_Response_Envelope.
8. IF a requested resource is missing or a recording is unavailable, THEN THE Error_Middleware SHALL return HTTP `404` with a resource-specific safe message in a Standard_Response_Envelope.
9. IF a uniqueness, link-state, or category-state conflict occurs, THEN THE Error_Middleware SHALL return HTTP `409` with a stable conflict message and code in a Standard_Response_Envelope.
10. IF login rate limiting rejects a request, THEN THE Error_Middleware SHALL return HTTP `429` with a retry message in a Standard_Response_Envelope.
11. IF an unexpected database, S3, or server failure occurs, THEN THE Error_Middleware SHALL return HTTP `500` with a generic message and no SQL details or production stack trace.
12. WHEN a Sequelize validation, uniqueness, or foreign-key error occurs, THE Error_Middleware SHALL normalize the error to the corresponding safe API status and envelope.
13. WHEN an asynchronous controller operation fails, THE Resource_API SHALL forward the normalized error to Error_Middleware through a top-level controller error boundary.
14. WHEN the Resource_API records request or error diagnostics, THE Resource_API SHALL redact credentials, secrets, authorization headers, password material, and Playback_URL values.

### Requirement 15: Root Commands and Migration Boundaries

**User Story:** As a developer, I want stable root commands and explicit migration boundaries, so that the PostgreSQL environment can be installed, synchronized, seeded, and run consistently.

#### Acceptance Criteria

1. THE Root_Command_Interface SHALL retain root `dev` and `install:all` commands for the server and Active_React_Client.
2. WHEN a developer runs root `npm run db:sync`, THE Root_Command_Interface SHALL invoke the server database synchronization command.
3. WHEN a developer runs root `npm run seed`, THE Root_Command_Interface SHALL invoke `server/scripts/seed.js` as the canonical seed implementation.
4. WHEN a developer runs root `npm run db:setup`, THE Root_Command_Interface SHALL complete database synchronization before invoking the canonical seed command.
5. THE Migration_System SHALL contain exactly one seed implementation, with `server/utils/seed.js` absent or limited to a thin launcher for `server/scripts/seed.js`.
6. WHEN database synchronization succeeds, THE Schema_Manager SHALL have authenticated PostgreSQL, synchronized the six Sequelize models, and installed audit immutability guards.
7. THE Migration_System SHALL preserve the React and Express architecture, active React entry point, JWT bearer flow, Role checks, and private S3 object storage while replacing the persistence layer.
8. THE Migration_System SHALL store recording metadata in PostgreSQL and recording binaries in private S3 objects.
9. THE Migration_System SHALL derive company compatibility data from forms and SHALL operate without an upload worker, persistent refresh-token store, session store, company table, contact table, or audio-binary database column.
10. THE Migration_System SHALL reserve versioned production database migrations and a persistent identity provider for later approved work outside this migration phase.

## Out of Scope

- React component redesign or state-management replacement.
- Audio binary storage in PostgreSQL.
- A recording upload worker or `upload_queue` table.
- Persistent refresh-token, session, token-revocation, company, contact, or user tables.
- Production deployment migration tooling; production adoption must replace schema synchronization with approved versioned migrations.
- Application implementation during this requirements phase.
