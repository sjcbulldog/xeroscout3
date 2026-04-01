# Databases

## Owns
- `IPCDatabaseData`
- team DB and match DB display payloads
- database column configs and descriptors

## Current Functionality
- Central and Coach convert DB rows into renderer display payloads.
- Display payloads are normalized against live column descriptors.
- Renderer-facing DB values are primitives for display, not raw `DataValue` wrappers.
- Team and match DB payloads include key columns and per-view column configuration.

## Core User Stories
- As Central, I can inspect team and match data after scouting.
- As a user, I can rely on DB views even when some managers are empty.
- As a user, stale column config does not break the DB view.

## Test Focus
- payload shape for empty and non-empty DBs
- column config normalization
- primitive display serialization
- DB update flows

## Open Gaps
- no E2E test yet proving scouting sync updates the rendered DB views
- DB-related artifact capture is not yet part of failed E2E runs
