# Testing Foundations Memory

## What Was Added
- Root testing plan doc exists at `docs/comprehensive-testing-suite-plan.md`.
- Functional tracking docs exist at `docs/functionality-tracker/`.
- Test runtime isolation exists in the main process:
  - `XEROSCOUT_TEST_MODE=1`
  - `--test-mode`
  - `XEROSCOUT_HOME`
  - `XEROSCOUT_USER_DATA_DIR`
  - `XEROSCOUT_SYNC_CABLE_HOST`
- Minimal main-process test driver exists behind:
  - test mode
  - `APP_TEST_DRIVER=1`
- Renderer selector foundation now exists for:
  - app root
  - current view root
  - nav items and separators
  - status window and status fields
  - tab widgets and tab pages
  - generic form controls
- Playwright scaffold now exists in `main/`:
  - `playwright.config.cjs`
  - `scripts/run-playwright-e2e.cjs`
  - `e2e/helpers/electron-app.cjs`
  - `e2e/smoke.spec.cjs`
  - `e2e/README.md`
- A real sync E2E now exists:
  - `e2e/sync.spec.cjs`
  - `e2e/cable-sync.spec.cjs`

## Important Repo Findings
- XeroScout is one Electron app with multiple runtime modes, not separate apps.
- CLI mode selection happens in `main/src/main.ts`:
  - `central`
  - `scout`
  - `coach`
  - `unittests`
- Current sync transport is TCP, not USB/serial.
- “Local” sync is explicitly loopback to `127.0.0.1`.
- Central listens on port `45455`.
- E2E now supports overriding the sync port with `XEROSCOUT_SYNC_PORT`.
- E2E and debug runs can now simulate the cable sync path by setting `XEROSCOUT_SYNC_CABLE_HOST`.
- UDP broadcast is for discovery, not the primary payload transport.
- Forms are JSON and shared across main/renderer through mirrored IPC types.
- New controls require coordinated edits across shared IPC types, edit rendering, scout rendering, validation, and persistence/sync paths.
- Renderer-facing DB payloads are primitive display values, not `DataValue` wrappers.

## Broken Tests And Fixes
- Fixed the two failing baseline tests in `main/src/test/sccoachcentralbase-db.test.ts`.
- Root cause:
  - tests expected wrapped `DataValue` objects
  - app intentionally sends primitive display values to the renderer
- Fixed the renderer compile blocker in `renderer/src/views/selecttablet/selecttabletdialog.ts`.
- Root cause:
  - `rowClick` in the Tabulator constructor options did not match the installed typings
  - moved to `table.on('rowClick', ...)`
- Separated Vitest from Playwright specs so `npm test` no longer tries to load `main/e2e/*.spec.cjs`.
- Fixed a real Scout UI modal-loop bug in `renderer/src/views/selecttablet/selecttablet.ts`.
- Root cause:
  - the select-tablet view ignored the dialog `closed` result
  - any close without a selected tablet, including `Cancel`, raised `No tablet selected`
  - the dialog was then recreated immediately, which could look like the app had hung
- fix:
  - `dialogClosed(changed: boolean)` now clears the old dialog instance first
  - only a changed/OK close without a selected tablet is treated as an error path

## Current Verified Status
- `main`: `npm test` passes with `55/55`.
- `main`: `npm run compile` passes.
- `renderer`: `npm run compile` passes.
- `main`: `node ./scripts/run-playwright-e2e.cjs` passes with `5/5`.
- Verified Playwright tests now cover:
  - Central launch smoke
  - Scout launch smoke
  - Central fixture open
  - Central-plus-Scout local sync with a real scouting round-trip into Central DB state
  - Central-plus-Scout simulated cable sync through the remote sync command

## Current Known Blockers
- fake camera / `robotphoto` determinism is still missing
- fault-injection coverage is still missing for disconnects, duplicate sync, and malformed payloads
- coach sync E2E is still missing

## Immediate Next Steps
- Add deterministic fake-camera support for `robotphoto`.
- Add feature-specific selectors for:
  - robot photo controls
- Add explicit E2E coverage for:
  - event mismatch
  - disconnect/retry
  - malformed image payloads
  - coach sync

## Repo Gotchas
- Keep Vitest and Playwright scopes separate.
- Keep E2E helpers in plain JS unless there is a strong reason to pull them into the TypeScript compile graph.
- If docs track implementation status, update `docs/comprehensive-testing-suite-plan.md` at the same time as code changes.
- There are generated files in the current worktree:
  - `main/vitest.config.js`
  - `main/vitest.config.js.map`
  These appear to be leftovers from an earlier TypeScript Vitest config attempt and should be reviewed before commit.
