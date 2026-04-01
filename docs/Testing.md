# XeroScout Testing Coverage Map

## Current Execution Status
- Date checked: `2026-03-26`
- Command run: `cd main && node ./scripts/run-playwright-e2e.cjs`
- Result: passed
- Verified suite:
  - `e2e/smoke.spec.cjs`
  - `e2e/sync.spec.cjs`
  - `e2e/cable-sync.spec.cjs`
- Total: `5/5` Playwright tests passing
- Important note: the E2E path now depends on building from the `main/` workspace first, matching the VS Code debug flow

## Automated Test Run Summary
- `cd main && npm test`: passed, `55/55`
- `cd main && npm run compile`: passed
- `cd renderer && npm run compile`: passed
- `cd main && node ./scripts/run-playwright-e2e.cjs`: passed, `5/5`
- Current status: there are no failing automated tests in the checked-in suite
- Current risk: many product features still have no executable automated coverage

## Current Baseline
- `main`: `npm test` passes
- `main`: `npm run compile` passes
- `renderer`: `npm run compile` passes
- `main`: `node ./scripts/run-playwright-e2e.cjs` passes
- Playwright is installed in `main/`
- the select-tablet modal loop regression has been fixed:
  - closing the dialog with `Cancel` no longer triggers `No tablet selected` and immediately reopens the dialog

## Immediate Next Steps
- add camera test seams for deterministic `robotphoto` coverage
- add sync fault-injection coverage
- add explicit event-mismatch and malformed-payload E2E coverage
- add coach sync coverage
- add UI-level tablet-row selection assertions separate from command-level fallback coverage
- add artifact summary bundling for failed E2E runs

## Release-Gate Journeys
- Central launches in test mode and reaches a stable initial view
- Scout launches in test mode and reaches a stable initial view
- Central opens a valid event fixture
- Central locks a valid event and starts sync services
- Scout syncs locally to Central over TCP loopback
- Scout receives tablet definitions, forms, assignments, and images
- Scout selects a tablet and opens the correct scouting flow
- Scout completes a real multi-section scouting session
- Scout syncs results back to Central
- Central updates team and match data correctly after sync

## Implemented E2E Coverage
- Central launch smoke
- Scout launch smoke
- Central opening an event fixture and reaching `info`
- locked sync-ready fixture generation with real forms, teams, matches, tablets, and databases
- local Central-plus-Scout sync on an isolated per-test TCP port
- simulated cable Central-plus-Scout sync using the remote/cable command path
- tablet assignment flow into Scout navigation
- multi-section team scouting flow
- text input coverage
- boolean control coverage
- choice control coverage
- updown control coverage
- hold-mode stopwatch coverage
- result sync back into Central
- Central team database verification after sync

## Currently Verified By Automated Tests
- app boot in `central`
- app boot in `scout`
- test-mode runtime isolation helpers
- Central event fixture open
- sync result merge semantics
- image sync payload validation
- form validation for duplicate and blank data tags
- formula import/export contracts
- dataset selection behavior
- auto analysis parsing and generation
- DB payload normalization and empty DB behavior
- Central-plus-Scout local sync round-trip
- Central-plus-Scout simulated cable sync round-trip
- multi-section team scouting with:
  - `text`
  - `boolean`
  - `choice`
  - `updown`
  - hold-mode `stopwatch`

## Not Yet Verified By Automated Tests
- `coach` launch and workflows
- `textarea`, `select`, `timer`, `image`, `autoplan`, `autoselector`, `robotphoto`, `robotviewer`
- camera permission, denial, unavailable, retake, and file-pick flows
- event mismatch rejection
- sync disconnect, retry, duplicate upload, and malformed-payload flows
- match scouting round-trip
- playoff assignment behavior
- picklist, single-team summary, and match prediction E2E
- crash/reload draft recovery

## Important Findings
- the scout flow mixes renderer dialogs and native Electron dialogs, so modal sequencing bugs can present as apparent hangs
- the app already had a distinct cable sync command path, but it was not deterministic for automated testing
- a cable sync simulation path now exists through `XEROSCOUT_SYNC_CABLE_HOST`
- this allows the Scout cable command to target a controlled test address without using `sync-event-local`
- the select-tablet view previously treated every dialog close as a failed selection
- that behavior caused a modal loop:
  - `Cancel` or any close without a selected tablet raised `No tablet selected`
  - the select-tablet dialog then reopened immediately
- the select-tablet close path now respects the dialog `changed` flag, so only a real OK-without-selection path is treated as an error

## Feature Coverage Checklist

### App Boot And Runtime Modes
- `central` mode launch
- `scout` mode launch
- `coach` mode launch
- test-mode launch with isolated state
- app-ready signaling
- current-view reporting
- user-data isolation
- log-path discovery

### Project And Event Lifecycle
- open event from disk
- reject missing or malformed `event.json`
- save event changes
- lock valid event
- reject invalid event before lock
- unlock or reload behaviors if supported
- restore previously opened/default event state

### Forms
- team form load
- match form load
- form purpose respected by tablet assignment
- form validation before lock
- invalid form rejection
- synced form parity between Central and Scout
- empty sections handling
- malformed control definitions

### Sections
- section ordering
- section tab rendering
- section switching
- state preservation when switching sections
- draft restore to correct section
- navigation after reload/interruption

### Controls
- `text`
- `textarea`
- `boolean`
- `updown`
- `choice`
- `select`
- `timer`
- `stopwatch`
- `image`
- `autoplan`
- `autoselector`
- `robotphoto`
- `robotviewer`

### Control Interaction Behaviors
- tap/click input
- repeated tap behavior
- hold behavior
- timer start/stop/reset
- stopwatch hold-mode behavior
- keyboard input where applicable
- default value rendering
- value serialization
- clearing/resetting values
- invalid or out-of-range values

### Robot Photo And Camera
- camera permission granted
- camera permission denied
- camera unavailable
- file-pick fallback
- capture success
- cancel capture
- retake flow
- invalid image payload
- synced image transfer to Scout
- synced image return path back to Central if applicable
- `robotviewer` rendering against available team-photo data

### Tablets And Assignments
- tablet definitions load from Central
- tablet selection dialog renders correctly
- tablet purpose assignment
- team tablet schedule handling
- match tablet schedule handling
- playoff assignment handling
- invalid tablet assignment rejection
- reset-tablet flow
- Scout nav changes based on selected tablet

### Sync
- Central starts TCP sync server
- Scout local sync to `127.0.0.1`
- remote sync path
- manual IP sync path
- Wi-Fi/discovery path
- handshake ordering
- event UUID match
- event mismatch rejection
- form transfer
- tablet transfer
- assignment transfer
- image transfer
- result upload
- acknowledgement handling
- goodbye/finalization handling

### Sync Edge Cases
- disconnect during handshake
- disconnect during image transfer
- disconnect during result upload
- duplicate result upload
- duplicate image upload
- malformed packet handling
- malformed synced image payload
- second client while sync is active
- stale tablet identity
- partial sync followed by retry
- idempotent merge behavior

### Scouting Results
- team result creation
- match result creation
- result draft persistence
- result overwrite rules
- result replacement for same scout item
- active team result usage during match scouting
- save before leaving section/view
- restore after reload/crash

### Databases And Derived Views
- team DB payload shape
- match DB payload shape
- DB update after sync
- primitive display serialization
- empty DB handling
- stale column config normalization
- formulas against synced data
- datasets against synced data
- auto analysis load
- picklist load
- single-team summary load
- match prediction load

### Navigation And View Wiring
- nav item selection
- current-view transitions
- view registration
- menu command routing
- preload and IPC wiring for newly added views
- guard against stale selectors when features move

### Error Handling And Recovery
- invalid form errors surfaced clearly
- sync errors surfaced clearly
- camera errors surfaced clearly
- bad event data surfaced clearly
- retry after sync failure
- recover after app restart
- recover after rejected confirmation flow

## Priority By Test Layer

### Unit / Contract
- packet handling
- event validation
- result merge semantics
- database payload normalization
- image payload validation
- tablet schedule rules

### Renderer-Level
- control rendering
- tap and hold interactions
- section-switch persistence
- camera-dialog state transitions
- selector stability for automation-critical surfaces

### Playwright E2E
- Central launch
- Scout launch
- open valid event
- lock event
- local sync happy path
- tablet select
- complete scouting session
- sync results back
- verify Central data update

### Nightly / Extended
- coach sync path
- analysis and picklist validation
- repeated sync loops
- disconnect fault injection
- camera denial and unavailable scenarios
- broad control-matrix coverage
- hardware-in-loop validation

## Required Artifacts On E2E Failure
- Playwright trace
- screenshots
- optional video
- renderer console logs
- main-process log file
- sync trace summary
- fixture manifest used for the run

## Current Blockers
- there is not yet a fake-camera seam for deterministic CI camera coverage
- there is not yet dedicated E2E coverage for `timer`, `select`, `textarea`, `image`, `autoplan`, `autoselector`, `robotphoto`, or `robotviewer`
- there is not yet dedicated E2E coverage for event mismatch, duplicate sync, disconnect, or malformed image payloads
- there is not yet a coach sync E2E
- there is not yet a fake-camera seam for deterministic CI camera coverage
- there are not yet feature-specific selectors for all sync, camera, and confirm-dialog flows

## Done Already
- test-mode runtime isolation
- isolated home and user-data overrides
- minimal main-process test driver
- foundational `data-testid` support for app root, nav, status, tabs, and generic form controls
- dialog-level `data-testid` support
- tablet-row `data-testid` support in the select-tablet dialog
- Playwright config and runner wrapper
- Electron launch helper
- smoke specs for Central and Scout launch scaffolding
- temporary Central event fixture generation
- locked sync-ready fixture generation
- per-test sync-port isolation via `XEROSCOUT_SYNC_PORT`
- test-mode skip for blocking scout confirmation prompts
- passing Central-plus-Scout local sync E2E
