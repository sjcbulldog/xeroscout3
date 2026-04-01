# Sync

## Owns
- Central/Scout data transfer
- handshake
- form transfer
- image transfer
- result upload and acknowledgement

## Current Functionality
- Sync transport is currently TCP.
- Central listens on port `45455`.
- Scout supports local, remote, Wi-Fi, and manual-address flows.
- Local sync uses `127.0.0.1`.
- UDP broadcast is used for discovery, not for the primary sync payload transfer.
- A minimal test driver now exists for app readiness/state probing in test mode.

## Core User Stories
- As a scout, I sync my tablet before scouting so I receive the current event and forms.
- As a scout, I sync results back to Central without losing data.
- As Central, I reject bad sync states like event mismatch or malformed payloads.

## Test Focus
- handshake ordering
- event mismatch rejection
- image payload robustness
- result acknowledgement timing
- duplicate result handling
- disconnect and reconnect behavior

## Open Gaps
- no locked sync-ready fixture pack yet
- no E2E happy-path sync test yet
- no fault-injection hooks yet for transport failures
