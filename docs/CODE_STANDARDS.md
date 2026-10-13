# XSense — Balanced Coding Standards

## Guiding principle
**Consistency of interfaces, safety rules, and code ownership matters more than uniform formatting preferences.** Follow patterns already established in the current branch; discuss any large refactor before starting.

## General
- One task, one focused change; do not combine feature work with unrelated refactors.
- Descriptive names; avoid magic numbers and duplicated business rules.
- Keep UI rendering, business logic, data access, and simulation separate.
- Validate all external inputs; handle loading, failure, empty, and offline states.
- Keep dependency additions minimal and explain them in the PR.
- Do not commit API keys, credentials, raw recordings, resident information, or local databases.
- Update documentation when behavior, commands, data models, or contracts change.

## Frontend — React / TypeScript
- Match existing React/TypeScript conventions, use typed props and data models; avoid `any` unless justified.
- Shared UI styles/components belong in common modules; do not duplicate styles across dashboards.
- Centralize API calls and status serialization in service modules.
- Display only backend-confirmed incident/SOS statuses when integration is present.
- The 3D scene renders objects and events; dispatch rules, incident transitions, and persistence live outside it.
- Keep anonymous dots anonymous, temporary, and unlinked to guard identities.
- Ensure keyboard access, mobile layouts, readable labels, and non-color-only statuses.

## Backend — Python / FastAPI
- Use Pydantic for request validation and explicit response types where practical.
- Keep routes thin and put shared incident, dispatch, and alert rules in services.
- Store durable incidents, SOS, guards, and event histories in a database rather than process-memory dictionaries.
- Enforce state transitions and guard availability on the server, not just the frontend.
- Make operations safe against repeat requests; use transactions when two writes must succeed together.
- Separate demo event injection from real and recorded inputs; provenance must be trustworthy.
- Avoid leaking private incident data through public SOS endpoints. Protect staff-only actions.

## Contracts and quality
- Maintain stable device and zone IDs across the 3D map, API, and database; lighting/mount IDs are separate optional references. Preserve legacy pole compatibility during migration.
- Keep coverage geometry, verification basis, health, and integration availability explicit. Camera inventory must not imply a live stream; keep camera credentials out of browser fixtures.
- Preserve old API compatibility where reasonable; document intentional breaking changes.
- Verification should match scope: run frontend typecheck/build after frontend changes, backend checks after backend changes, and manual cross-device flows for SOS changes. State if any check could not run.
- Do not state accuracy, hardware reliability, or production safety claims without evidence.

## Commit naming examples
- `feat: persist SOS requests`
- `fix: prevent duplicate guard assignment`
- `docs: establish development standards`

Focus on meaning and reviewability rather than enforcing a particular formatter or test framework prematurely.
