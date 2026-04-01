# XeroScout Comprehensive Testing Suite Plan

## Purpose
XeroScout needs a release gate that protects the real user journey, not just isolated methods. Today the codebase has useful unit coverage in `main/src/test`, but it does not have a full Central-plus-Scout end-to-end harness. That gap is large enough for new features to break sync, scouting flow, camera capture, and control behavior before anyone sees the regression.

This document defines a practical testing strategy for the current Electron architecture. It is written against the code as it exists today, with the first required gate optimized for deterministic local and CI execution, cross-platform from day one. Hardware-in-loop validation is still important, but it should be added as a second lane after the deterministic suite is stable.

## Current Baseline
- App architecture is split across `main/` and `renderer/`.
- `main/src/main.ts` selects app mode from CLI arguments: `central`, `scout`, `coach`, or `unittests`.
- `renderer/` is a separate TypeScript bundle that `main/` builds and copies into its `content/` pipeline.
- Sync is currently TCP-based. Central starts `TCPSyncServer` on port `45455`, Scout uses `TCPClient`, and local sync is explicitly `127.0.0.1`.
- Central also starts UDP broadcast for discovery, but the actual sync transport is TCP.
- Forms are JSON `IPCForm` objects containing `sections`, and each section contains typed controls.
- Existing typed controls include `text`, `textarea`, `boolean`, `updown`, `choice`, `select`, `timer`, `stopwatch`, `image`, `autoplan`, `autoselector`, `robotphoto`, and `robotviewer`.
- Team robot photo capture is implemented in the renderer with `navigator.mediaDevices.getUserMedia`, plus a file-pick fallback.
- Existing automated coverage is Vitest in `main/src/test`. At the time of research, `npx vitest run` in `main/` reports `50` tests total with `48` passing and `2` failing, so the current baseline is not fully green.
- There is no root `docs/` folder in the repo today. Existing docs live under `main/docs/`.

## Implementation Status

### Implemented In This Repo
- Root documentation now exists at `docs/comprehensive-testing-suite-plan.md`.
- Main-process test runtime isolation now exists:
  - `XEROSCOUT_TEST_MODE=1` or `--test-mode`
  - `XEROSCOUT_HOME=<temp dir>`
  - `XEROSCOUT_USER_DATA_DIR=<temp dir>`
- A minimal main-process test driver now exists behind test mode plus a driver flag:
  - `APP_TEST_DRIVER=1`
  - supports lightweight readiness and state inspection
- `IPCAppInit` now carries `testMode` into the renderer.
- Stable selector groundwork now exists in the renderer for:
  - app root
  - current view root
  - navigation items and separators
  - status window and status fields
  - tab widgets and tab pages
  - generic form controls keyed by control tag and control type
- Explicit `main` test scripts now exist:
  - `npm test`
  - `npm run test:watch`
- Playwright E2E scaffolding now exists in `main/`:
  - `playwright.config.cjs`
  - `scripts/run-playwright-e2e.cjs`
  - `e2e/helpers/electron-app.cjs`
  - `e2e/smoke.spec.cjs`
  - `e2e/README.md`
- Initial E2E fixture generation now exists for temporary Central event launch tests.
- Locked sync-ready fixture generation now exists for Central-plus-Scout E2E.
- The first real Playwright sync E2E now exists in `main/e2e/sync.spec.cjs`.
- Dialog-level and tablet-selection selectors now exist for the select-tablet flow.
- Sync port isolation now exists through `XEROSCOUT_SYNC_PORT`.
- Cable sync host isolation now exists through `XEROSCOUT_SYNC_CABLE_HOST`.
- Blocking scout confirmation prompts are skipped in test mode so unattended E2E can proceed deterministically.
- Runtime environment helpers are covered by unit tests.

### Verified Status
- `main`: `npm run compile` passes.
- `main`: `npm test` passes `55/55`.
- `renderer`: `npm run compile` passes.
- `main`: `node ./scripts/run-playwright-e2e.cjs` passes `5/5`.
- Verified Playwright coverage now includes:
  - Central launch smoke
  - Scout launch smoke
  - Central event fixture open
  - Central-plus-Scout local sync with team scouting round-trip and Central DB verification
  - Central-plus-Scout simulated cable sync using the remote sync command path

### Remaining Gaps Before The First Real E2E Gate
- No deterministic fake camera injection seam has been added yet.
- No coach sync E2E exists yet.
- No explicit fault-injection coverage exists yet for disconnects, duplicate syncs, or malformed payloads.
- No artifact bundling command has been added yet.

## Current Structure

### Runtime Layout
- `main/` owns Electron bootstrap, menu creation, mode selection, IPC registration, project state, sync transport, data managers, image management, and unit tests.
- `renderer/` owns the UI bundle, view system, form editor, scout form renderer, control implementations, camera dialog, and user-facing interaction logic.
- `content/` under `main/` contains HTML, CSS, bundled renderer assets, images, and static content used at runtime.

### App Modes
- Central and Scout are not separate codebases. They are separate runtime modes of the same Electron app.
- `main/src/main.ts` creates `SCCentral`, `SCScout`, or `SCCoach` based on the first non-flag CLI argument.
- This is important for testing because the E2E harness should launch two Electron processes from the same built app, not two unrelated apps.

### Views And Navigation
- Renderer views are registered centrally in `renderer/src/apps/xeroapp.ts`.
- Central-specific views include event info, tablet assignment, form editing, team/match status, team/match DB, formulas, datasets, picklist, auto analysis, scouter accuracy, single-team summary, and match prediction.
- Scout-specific views include tablet selection, sync IP entry, and scouting forms.
- New views are integrated by wiring all of the following:
  - preload allowlist in `main/src/main/preload.ts`
  - `ipcMain` registration in `main/src/main.ts`
  - handler routing in `main/src/main/ipchandlers.ts`
  - renderer view registration in `renderer/src/apps/xeroapp.ts`
  - menu or nav exposure in the owning app class

### Forms, Sections, And Controls
- Forms are modeled through shared IPC types in `main/src/shared/ipc.ts` and mirrored in `renderer/src/shared/ipc.ts`.
- A form contains:
  - `purpose`
  - `tablet`
  - `sections[]`
- A section contains:
  - `name`
  - `items[]`
- Controls are instantiated in both the edit path and the scout path.
- New control types are not plug-in based today. Adding a control requires coordinated edits in multiple places:
  - add the type to shared IPC unions
  - add renderer creation logic in `editformview.ts`
  - add renderer creation logic in `scoutformview.ts`
  - define validation behavior in form/rules handling
  - define persistence rules if the control stores data
  - define sync and DB behavior if the control produces user data

### Syncing
- Central starts a TCP sync server through `startSyncServer()` in `sccentral.ts`.
- Scout supports:
  - local sync to `127.0.0.1`
  - remote sync to configured IP and port
  - Wi-Fi sync
- For deterministic automation, the cable path can now be directed via `XEROSCOUT_SYNC_CABLE_HOST` without using the local-sync command.
- Packet handling is explicit and stateful. Core packets include handshake, form requests, image transfer, result transfer, and receipt acknowledgement.
- The current codebase does not implement a distinct USB or serial transport. Any “over cable” release gate must therefore map to deterministic TCP loopback first, with hardware lab coverage added separately if the field workflow uses wired networking.

### Data And Project Managers
- `Project` composes the event managers: teams, matches, formulas, data, datasets, forms, tablets, graphs, playoffs, and picklists.
- Locking an event validates forms and tablets, initializes the databases, and starts sync-related behavior expected by Central.
- This means fixture setup for E2E should create a valid locked event, not just random UI state.

## What Is Missing Today
- No stable end-to-end suite that launches Central and Scout together.
- No release gate for the full sync journey.
- No standardized test selectors contract.
- No test-only isolation for user state, logs, and image caches.
- No deterministic fake camera path for CI.
- No artifact bundle that captures traces, screenshots, structured logs, and sync transcript data for failures.
- No explicit rule forcing new controls or views to ship with regression tests.

## Recommended Test Architecture

### Layer 0: Stabilize The Existing Baseline
- Fix the two currently failing Vitest tests before expanding the required gate.
- Add explicit `npm` scripts for repeatable test execution in `main/`.
- Make “green existing suite” a prerequisite for the rest of the rollout.
- Status:
  - `npm test` scripts are now in place in `main/`.
  - the baseline is still red because of the existing DB payload expectation failures.

### Layer 1: Main-Process Unit And Contract Tests
- Keep Vitest in `main/` as the primary tool for sync contracts, packet handling, form validation, manager behavior, image payload handling, and DB merge semantics.
- Expand this layer around high-risk logic:
  - handshake ordering
  - result acknowledgement timing
  - malformed image payloads
  - event mismatch behavior
  - duplicate syncs and idempotent merges
  - concurrent or rejected connection behavior

### Layer 2: Renderer Behavior Tests
- Add renderer-focused Vitest coverage with a DOM environment for control behavior that does not need a full Electron runtime.
- Use this layer to cover:
  - tap/click behavior
  - hold-mode stopwatch behavior
  - section switching and draft persistence
  - robot photo control state transitions
  - cancel/retake behavior in camera capture UI
- This catches regressions earlier than full E2E and makes new control types cheaper to validate.

### Layer 3: Playwright Electron E2E
- Use Playwright as the primary E2E tool.
- Reason:
  - Electron’s own automated testing guidance documents Playwright support.
  - Playwright can launch Electron, access app windows, drive the DOM, grant browser permissions, record traces, and capture screenshots/video.
  - It is a strong fit for cross-platform deterministic automation.
- This layer should launch:
  - one Central process
  - one Scout process
  - both against the same built app
- The E2E harness should use fixture events, not ad hoc manual setup.
- Status:
  - Playwright runner/config and Electron launch helper are now in the repo
- current smoke coverage validates Central launch, Scout launch, and Central opening a temporary event fixture
 - locked-event fixtures, local sync, and cable sync user-journey assertions are now implemented

### Layer 4: Hardware-In-Loop Lane
- Add a later self-hosted lane for:
  - real camera capture
  - real field hardware configurations
  - same-network or wired-lab sync validation
- This lane should run nightly or on-demand at first, not as the first required PR gate.

## Required Testability Changes

### 1. Test Mode And State Isolation
- Add a dedicated test mode flag or environment contract, for example:
  - `XEROSCOUT_TEST_MODE=1`
  - `--test-mode`
- Add a per-run home/state override, for example:
  - `XEROSCOUT_HOME=<temp dir>`
- Reason:
  - current code writes logs and persistent settings outside the repo
  - tests must not mutate real user state or bleed between runs
- Status:
  - implemented in the main process
  - `XEROSCOUT_HOME` now isolates the legacy app home
  - `XEROSCOUT_USER_DATA_DIR` or `XEROSCOUT_HOME/user-data` now isolates Electron user data

### 2. Stable Selector Contract
- Add `data-testid` attributes to all critical UI elements.
- Minimum selector coverage:
  - nav items
  - section tabs
  - status window
  - sync dialogs and status text
  - form controls keyed by control tag
  - robot photo buttons
  - confirm/cancel dialogs
- New user-visible features should not be considered complete until they expose selectors.
- Status:
  - foundational selectors are implemented for root app surfaces, nav, status, tabs, and generic form controls
  - feature-specific selectors still need to be added for sync dialogs, robot photo flows, and confirmation dialogs

### 3. Narrow Custom Test Driver
- Add a test-only driver for deterministic non-UI coordination.
- Keep it small. It should own:
  - “app ready” and “sync server ready” probes
  - fixture loading helpers
  - artifact/log path reporting
  - deterministic fault injection toggles
  - fake media injection control
- Use it where raw UI automation would otherwise become flaky or obscure.
- Do not let it bypass the main user journey. The user path should still be exercised through the UI.
- Status:
  - minimal driver implemented
  - current commands are intentionally small: readiness/state probing only
  - fixture loading and fault injection are still to be added

### 4. Deterministic Camera Strategy
- CI should not rely on a real webcam.
- The first gate should use one of these deterministic paths:
  - inject a fake image/blob path in test mode
  - stub `getUserMedia` in test mode
  - use Chromium media-stream flags only as a secondary technique
- Real webcam validation belongs in the hardware lane.

### 5. Artifact Pipeline
- Every failed E2E run should emit:
  - Playwright trace
  - screenshot at failure
  - optional video for selected suites
  - renderer console logs
  - main-process structured log file path
  - sync transcript or run summary JSON
- Triage speed matters as much as raw pass/fail.

## Release-Gate E2E Journeys

### Core Happy Path
- Launch Central with a valid fixture event.
- Confirm event opens correctly and navigation loads.
- Lock or open a locked event so the sync server is available.
- Launch Scout in local mode.
- Assign or select the expected tablet.
- Sync Scout to Central using local loopback sync.
- Confirm forms and required images arrive.
- Complete a scouting session across multiple sections.
- Exercise:
  - button/tap interactions
  - text entry
  - select or choice changes
  - up/down controls
  - hold-mode stopwatch behavior
  - timer behavior
  - robot photo capture or deterministic camera substitute
- Submit/sync results back to Central.
- Verify Central status/data views reflect the incoming results.

### Must-Have Edge Cases
- Event UUID mismatch during sync.
- Connection loss during sync.
- Second client attempting to connect while one sync is active.
- Repeat sync of the same result item.
- Missing or malformed image payloads.
- Camera unavailable.
- Camera permission denied.
- Capture cancelled.
- Capture retaken.
- Draft restored after reload or interruption.
- Invalid form rejected due to duplicate data tags.
- Invalid form rejected due to illegal `robotphoto` or `robotviewer` combinations.

## How New Features Must Be Added Safely

### New Sections
- New sections should be treated as part of navigation and draft state.
- Required coverage:
  - section appears in the expected order
  - section can be entered and exited
  - values persist correctly across section changes
  - final result includes section data

### New Controls
- Any new control type must ship with:
  - unit/behavior tests for its local interaction logic
  - E2E coverage if it is user-facing during scouting
  - selector support
  - serialization and sync validation if it stores data
- Definition of done for a new control is not “it renders.” It is “it is testable across edit, scout, persistence, and sync.”

### New Sync Features
- Any change to packet types, form transfer, image transfer, or result flow must add:
  - packet-level contract tests
  - failure-path tests
  - at least one E2E scenario if the feature affects real operator workflow

### New Views Or Analysis Features
- Any new view should be tested at two levels:
  - route/view registration and data plumbing
  - one user-visible E2E smoke path if the feature is exposed in Central navigation

## CI And Execution Model
- Required PR gate:
  - build renderer and main
  - run current unit/contract tests
  - run deterministic Playwright Electron smoke and core journey suite
- Nightly or scheduled lane:
  - broader edge-case matrix
  - repeated sync loops
  - fault injection runs
  - hardware-in-loop camera/network validation
- The first implementation should support cross-platform CI from day one, even if hardware lanes initially live only on self-hosted runners.

## MCP And LLM Expansion
- MCP should be used for investigation, triage, and failure summarization, not as the sole source of truth for pass/fail.
- Recommended maintained MCP building blocks:
  - `filesystem` for fixture, log, trace, and artifact access
  - `git` for changed-file awareness and regression correlation
  - `memory` for recurring failure patterns and known regressions
  - `fetch` when external docs or remote artifacts need to be consulted
- Strong recommendation:
  - build a small project-local MCP server for XeroScout test artifacts instead of depending on archived reference servers for database access
- Useful XeroScout-specific MCP capabilities:
  - expose latest run summaries as resources
  - expose sync transcripts and screenshots as resources
  - provide tools to list failing steps, compare runs, and summarize likely regressions
  - provide prompts to summarize sync failures and map them back to changed files
- LLM or MCP output should be advisory only. Deterministic tests remain the release gate.

## Rollout Plan

### Phase 0
- Fix existing failing unit tests.
- Add explicit test scripts.
- Add test state isolation.
- Current status:
  - test scripts are complete
  - state isolation is complete
  - baseline test repair is still open

### Phase 1
- Add selectors.
- Add test mode.
- Add fixture event builder or fixture event pack.
- Add Playwright Electron harness.
- Add the first Central-plus-Scout happy-path release gate.
- Current status:
  - selector foundation is partially complete
  - test mode is complete
  - Playwright harness is partially complete
  - temporary fixture generation is partially complete
  - locked fixture generation and happy-path E2E are still open

### Phase 2
- Add control-matrix coverage for tap, hold, timer, camera, and section persistence.
- Add sync fault injection.
- Add artifact bundle generation.

### Phase 3
- Add self-hosted hardware-in-loop lane.
- Add MCP-backed artifact triage and regression summarization.

## Acceptance Criteria
- Existing unit baseline is green.
- One command can run the required deterministic suite locally.
- PR gate protects the full Central-to-Scout-to-Central journey.
- Failures produce actionable artifacts, not just red/green output.
- New controls and new sync features cannot land without automated coverage.
- Camera, tap, hold, section flow, and sync are all protected by tests that reflect the actual user journey.

## Immediate Next Steps
- Fix the existing failures in `main/src/test/sccoachcentralbase-db.test.ts`.
- Fix the renderer typing/build issue in `renderer/src/views/selecttablet/selecttabletdialog.ts`.
- Run `npm install` in `main/` so the Playwright suite can execute.
- Verify the smoke suite after install:
  - `npm run test:e2e:smoke`
- Extend fixture generation so Central can boot into a locked, sync-ready event deterministically.
- Add feature-specific selectors for sync status, scout form submission, robot photo capture, and confirmation dialogs.
- Add the first happy-path E2E that:
  - launches Central
  - launches Scout
  - performs local sync
  - fills at least one multi-section form
  - exercises a hold interaction
  - returns results to Central

## Completion Checklist
- Completed:
  - root testing plan document
  - test-mode runtime isolation
  - isolated user-data/home overrides
  - minimal main-process test driver
  - renderer selector foundation for app root, views, nav, status, tabs, and generic form controls
  - `main` test scripts
  - runtime environment unit tests
  - Playwright config and runner wrapper
  - Electron launch helper for E2E
  - smoke tests for Central launch, Scout launch, and Central opening a temporary event fixture
  - E2E README and artifact ignore rules
- In progress:
  - green baseline restoration
  - executable Playwright environment in `main/`
  - fixture expansion from temporary event to locked sync-ready event
- Not started:
  - Central-plus-Scout sync E2E
  - deterministic camera test seam
  - feature-specific sync/camera/confirm selectors
  - artifact bundling command
  - hardware-in-loop lane

## Recommended External References
- Electron automated testing: https://www.electronjs.org/docs/latest/tutorial/automated-testing
- Playwright Electron support: https://playwright.dev/docs/api/class-electronapplication
- Playwright browser permissions: https://playwright.dev/docs/api/class-browsercontext
- Playwright touch input: https://playwright.dev/docs/api/class-touchscreen
- Playwright locator API: https://playwright.dev/docs/api/class-locator
- Playwright trace viewer: https://playwright.dev/docs/trace-viewer
- MCP server concepts: https://modelcontextprotocol.io/docs/learn/server-concepts
- MCP reference servers repository: https://github.com/modelcontextprotocol/servers

## Final Position
The correct first move is not a hardware lab. It is a deterministic, cross-platform Electron test harness that launches Central and Scout together, validates the complete scouting workflow, and produces usable failure artifacts. Once that is in place, hardware-in-loop validation and MCP-assisted investigation become force multipliers instead of band-aids.
