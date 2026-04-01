# XeroScout E2E

This directory contains the Playwright-based Electron E2E harness for XeroScout.

## Current Scope
- deterministic launch smoke coverage for `central` and `scout`
- isolated runtime directories via:
  - `XEROSCOUT_TEST_MODE=1`
  - `XEROSCOUT_HOME=<temp dir>`
  - `XEROSCOUT_USER_DATA_DIR=<temp dir>`
- temporary event fixture generation for Central launch tests

## Commands
- `npm run test:e2e`
- `npm run test:e2e:smoke`
- `npm run test:e2e:headed`

## Prerequisites
- run `npm install` in `main/`
- Playwright packages must be present:
  - `@playwright/test`
  - `playwright`
- the current repo still has separate pre-existing build/test issues outside the E2E harness:
  - `main/src/test/sccoachcentralbase-db.test.ts`
  - `renderer/src/views/selecttablet/selecttabletdialog.ts`

## Current Test Files
- `smoke.spec.cjs`
  - launch Central in test mode
  - launch Scout in test mode
  - open a temporary Central fixture event and verify the `info` view

## Next Additions
- fixture builder for locked sync-ready events
- deterministic camera stubbing or fake-image injection
- Central-plus-Scout local sync happy-path E2E
- artifact helpers for traces, logs, and run summaries
