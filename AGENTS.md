# AGENTS.md

## Purpose
This file is for future Codex agents working in this repo. It is meant to get an agent grounded quickly in the codebase structure, the main architectural seams, the current testing surface, and the conventions that matter most when making changes.

## Repo Shape
- Top level contains two main codebases:
  - `main/`: Electron main process, project/domain logic, sync transport, tests, packaging
  - `renderer/`: renderer UI, views, widgets, forms, controls
- Docs live at:
  - `docs/`: current planning, functionality trackers, memory notes
  - `main/docs/`: older project-specific docs already in the repo

## Core Architecture

### Runtime Model
- XeroScout is one Electron app with multiple runtime modes.
- Mode selection happens in [main/src/main.ts](/Users/luke/Programming/xeroscout3/main/src/main.ts).
- Main modes:
  - `central`
  - `scout`
  - `coach`
  - `unittests`

### Main Process
- Bootstrap: [main/src/main.ts](/Users/luke/Programming/xeroscout3/main/src/main.ts)
- Base app shell: [main/src/main/apps/scbase.ts](/Users/luke/Programming/xeroscout3/main/src/main/apps/scbase.ts)
- Central app: [main/src/main/apps/sccentral.ts](/Users/luke/Programming/xeroscout3/main/src/main/apps/sccentral.ts)
- Scout app: [main/src/main/apps/scscout.ts](/Users/luke/Programming/xeroscout3/main/src/main/apps/scscout.ts)
- Shared Central/Coach behavior: [main/src/main/apps/sccoachcentralbase.ts](/Users/luke/Programming/xeroscout3/main/src/main/apps/sccoachcentralbase.ts)
- IPC routing: [main/src/main/ipchandlers.ts](/Users/luke/Programming/xeroscout3/main/src/main/ipchandlers.ts)
- Preload bridge: [main/src/main/preload.ts](/Users/luke/Programming/xeroscout3/main/src/main/preload.ts)

### Renderer
- App shell and view registration: [renderer/src/apps/xeroapp.ts](/Users/luke/Programming/xeroscout3/renderer/src/apps/xeroapp.ts)
- Navigation renderer: [renderer/src/xeronav.ts](/Users/luke/Programming/xeroscout3/renderer/src/xeronav.ts)
- Core widgets: [renderer/src/widgets](/Users/luke/Programming/xeroscout3/renderer/src/widgets)
- Main views: [renderer/src/views](/Users/luke/Programming/xeroscout3/renderer/src/views)

### Shared Model Layer
- Main shared IPC/types: [main/src/shared/ipc.ts](/Users/luke/Programming/xeroscout3/main/src/shared/ipc.ts)
- Renderer mirror: [renderer/src/shared/ipc.ts](/Users/luke/Programming/xeroscout3/renderer/src/shared/ipc.ts)
- Keep these two in sync when shared contracts change.

## Key Domain Concepts

### Forms
- Form root type: `IPCForm`
- Sections: `IPCSection`
- Controls: `IPCFormItem` plus typed variants
- Main form manager: [main/src/main/project/formmgr.ts](/Users/luke/Programming/xeroscout3/main/src/main/project/formmgr.ts)
- Scout form render path: [renderer/src/views/forms/scoutformview.ts](/Users/luke/Programming/xeroscout3/renderer/src/views/forms/scoutformview.ts)
- Edit form render path: [renderer/src/views/forms/editformview.ts](/Users/luke/Programming/xeroscout3/renderer/src/views/forms/editformview.ts)

### Sync
- Packet types: [main/src/main/sync/packettypes.ts](/Users/luke/Programming/xeroscout3/main/src/main/sync/packettypes.ts)
- TCP client: [main/src/main/sync/tcpclient.ts](/Users/luke/Programming/xeroscout3/main/src/main/sync/tcpclient.ts)
- TCP server: [main/src/main/sync/tcpserver.ts](/Users/luke/Programming/xeroscout3/main/src/main/sync/tcpserver.ts)
- Sync diagnostics: [main/src/main/sync/syncdiag.ts](/Users/luke/Programming/xeroscout3/main/src/main/sync/syncdiag.ts)
- Important fact: current sync transport is TCP; local sync is `127.0.0.1`; Central listens on port `45455`.
- For deterministic cable-path simulation, Scout can be pointed at a controlled host with `XEROSCOUT_SYNC_CABLE_HOST`.

### Project Data
- Project root: [main/src/main/project/project.ts](/Users/luke/Programming/xeroscout3/main/src/main/project/project.ts)
- Project info schema: [main/src/main/project/projectinfo.ts](/Users/luke/Programming/xeroscout3/main/src/main/project/projectinfo.ts)
- Data manager: [main/src/main/project/datamgr.ts](/Users/luke/Programming/xeroscout3/main/src/main/project/datamgr.ts)
- Tablet manager: [main/src/main/project/tabletmgr.ts](/Users/luke/Programming/xeroscout3/main/src/main/project/tabletmgr.ts)
- Team manager: [main/src/main/project/teammgr.ts](/Users/luke/Programming/xeroscout3/main/src/main/project/teammgr.ts)
- Match manager: [main/src/main/project/matchmgr.ts](/Users/luke/Programming/xeroscout3/main/src/main/project/matchmgr.ts)

## Current Testing Surface

### Unit / Contract Tests
- Main test directory: [main/src/test](/Users/luke/Programming/xeroscout3/main/src/test)
- Current command:
  - `cd main && npm test`
- Current Vitest config:
  - [main/vitest.config.mjs](/Users/luke/Programming/xeroscout3/main/vitest.config.mjs)

### E2E Scaffold
- Playwright config: [main/playwright.config.cjs](/Users/luke/Programming/xeroscout3/main/playwright.config.cjs)
- Playwright runner wrapper: [main/scripts/run-playwright-e2e.cjs](/Users/luke/Programming/xeroscout3/main/scripts/run-playwright-e2e.cjs)
- E2E helper: [main/e2e/helpers/electron-app.cjs](/Users/luke/Programming/xeroscout3/main/e2e/helpers/electron-app.cjs)
- Smoke tests: [main/e2e/smoke.spec.cjs](/Users/luke/Programming/xeroscout3/main/e2e/smoke.spec.cjs)
- E2E docs: [main/e2e/README.md](/Users/luke/Programming/xeroscout3/main/e2e/README.md)

### Current Status
- `main`: `npm test` passes
- `main`: `npm run compile` passes
- `renderer`: `npm run compile` passes
- E2E scaffold exists but Playwright packages may not be installed in the current workspace

## Test / Automation Hooks Already Added
- Runtime env helper: [main/src/main/runtimeenv.ts](/Users/luke/Programming/xeroscout3/main/src/main/runtimeenv.ts)
- Supported test envs:
  - `XEROSCOUT_TEST_MODE=1`
  - `XEROSCOUT_HOME=<temp dir>`
  - `XEROSCOUT_USER_DATA_DIR=<temp dir>`
  - `APP_TEST_DRIVER=1`
  - `XEROSCOUT_SYNC_CABLE_HOST=<host>`
- Minimal test driver is wired in [main/src/main.ts](/Users/luke/Programming/xeroscout3/main/src/main.ts)
- Renderer now exposes stable `data-testid` foundations for:
  - app root
  - current view root
  - nav items/separators
  - status bar
  - tab widgets/pages
  - generic form controls
- Current Playwright specs cover:
  - smoke launch in Central and Scout
  - local sync round-trip
  - simulated cable sync round-trip

## Coding Standards For This Repo

### General
- This is TypeScript on both sides, but the renderer bundle and Electron main process are separate projects.
- Prefer matching the surrounding file style over introducing a new style.
- Existing code style uses:
  - semicolons
  - explicit braces
  - straightforward imperative logic
  - class-based organization

### Shared Contracts
- If you change shared data passed between main and renderer, update both:
  - `main/src/shared/ipc.ts`
  - `renderer/src/shared/ipc.ts`
- Do not change one without the other.

### UI / Renderer Changes
- Register new views in [renderer/src/apps/xeroapp.ts](/Users/luke/Programming/xeroscout3/renderer/src/apps/xeroapp.ts)
- Ensure preload allowlists and IPC handlers exist if the view needs new commands
- Add `data-testid` support for any new user-facing automation-critical UI

### Form / Control Changes
- New controls require coordinated changes in multiple places:
  - shared IPC type
  - edit rendering
  - scout rendering
  - validation
  - persistence
  - sync / DB behavior if data-bearing
- Check:
  - [renderer/src/views/forms/editformview.ts](/Users/luke/Programming/xeroscout3/renderer/src/views/forms/editformview.ts)
  - [renderer/src/views/forms/scoutformview.ts](/Users/luke/Programming/xeroscout3/renderer/src/views/forms/scoutformview.ts)
  - [main/src/main/project/formmgr.ts](/Users/luke/Programming/xeroscout3/main/src/main/project/formmgr.ts)
  - [main/src/shared/ipc.ts](/Users/luke/Programming/xeroscout3/main/src/shared/ipc.ts)

### Test Changes
- Keep Vitest and Playwright scopes separate.
- Unit/contract tests belong in `main/src/test`.
- Playwright specs belong in `main/e2e`.
- Prefer plain JS for Playwright helpers/config unless there is a strong reason to pull them into the TS compile graph.

## Important Gotchas
- Renderer-facing DB payloads are primitive display values, not `DataValue` wrappers.
- Central and Scout are mode variants of the same app, so E2E should launch the same built app twice with different args.
- Sync is TCP today. Do not assume a dedicated USB transport exists.
- Local sync means loopback, not a mocked in-process sync.
- If you need to exercise cable sync in debug or E2E without using the local command, set `XEROSCOUT_SYNC_CABLE_HOST` and invoke the cable sync command path.
- If you add docs that track implementation status, also update:
  - [docs/comprehensive-testing-suite-plan.md](/Users/luke/Programming/xeroscout3/docs/comprehensive-testing-suite-plan.md)
  - [docs/memories/testing-foundations-memory.md](/Users/luke/Programming/xeroscout3/docs/memories/testing-foundations-memory.md)

## Recommended First Files To Read
- [main/src/main.ts](/Users/luke/Programming/xeroscout3/main/src/main.ts)
- [main/src/main/apps/scbase.ts](/Users/luke/Programming/xeroscout3/main/src/main/apps/scbase.ts)
- [main/src/main/apps/scscout.ts](/Users/luke/Programming/xeroscout3/main/src/main/apps/scscout.ts)
- [main/src/main/ipchandlers.ts](/Users/luke/Programming/xeroscout3/main/src/main/ipchandlers.ts)
- [main/src/shared/ipc.ts](/Users/luke/Programming/xeroscout3/main/src/shared/ipc.ts)
- [renderer/src/apps/xeroapp.ts](/Users/luke/Programming/xeroscout3/renderer/src/apps/xeroapp.ts)
- [renderer/src/views/forms/scoutformview.ts](/Users/luke/Programming/xeroscout3/renderer/src/views/forms/scoutformview.ts)
- [renderer/src/views/forms/editformview.ts](/Users/luke/Programming/xeroscout3/renderer/src/views/forms/editformview.ts)

## Related Docs
- Main testing plan: [docs/comprehensive-testing-suite-plan.md](/Users/luke/Programming/xeroscout3/docs/comprehensive-testing-suite-plan.md)
- Functionality trackers: [docs/functionality-tracker/README.md](/Users/luke/Programming/xeroscout3/docs/functionality-tracker/README.md)
- Memory notes: [docs/memories/README.md](/Users/luke/Programming/xeroscout3/docs/memories/README.md)
