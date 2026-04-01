const { test, expect } = require('@playwright/test') ;
const path = require('path') ;
const { closeXeroScout, createEventFixture, getMainProcessState, launchXeroScout } = require('./helpers/electron-app.cjs') ;

test.describe.configure({ mode: 'serial' }) ;

test('central launches in deterministic test mode @smoke', async () => {
    const launched = await launchXeroScout('central') ;

    try {
        const window = await launched.app.firstWindow() ;
        const state = await getMainProcessState(launched.app) ;

        await expect(window.locator('[data-testid="app-root"]')).toHaveAttribute('data-testid', 'app-root') ;
        await expect(window.locator('[data-testid="view-text"]')).toHaveCount(1) ;
        await expect(window.locator('[data-testid="status-bar"]')).toBeVisible() ;

        expect(state.ready).toBe(true) ;
        expect(state.userDataPath).toBe(launched.userDataDir) ;
        await expect(window.locator('body')).toHaveAttribute('data-app-type', 'central') ;
        await expect(window.locator('body')).toHaveAttribute('data-current-view', 'text') ;
        await expect(window.locator('body')).toHaveAttribute('data-test-mode', 'true') ;
    }
    finally {
        await closeXeroScout(launched) ;
    }
}) ;

test('scout launches in deterministic test mode @smoke', async () => {
    const launched = await launchXeroScout('scout') ;

    try {
        const window = await launched.app.firstWindow() ;
        const state = await getMainProcessState(launched.app) ;

        await expect(window.locator('[data-testid="app-root"]')).toHaveAttribute('data-testid', 'app-root') ;
        await expect(window.locator('[data-testid="view-text"]')).toHaveCount(1) ;
        await expect(window.locator('[data-testid="status-bar"]')).toBeVisible() ;

        expect(state.ready).toBe(true) ;
        expect(state.userDataPath).toBe(launched.userDataDir) ;
        await expect(window.locator('body')).toHaveAttribute('data-app-type', 'scout') ;
        await expect(window.locator('body')).toHaveAttribute('data-current-view', 'text') ;
        await expect(window.locator('body')).toHaveAttribute('data-test-mode', 'true') ;
    }
    finally {
        await closeXeroScout(launched) ;
    }
}) ;

test('central opens a temporary event fixture and reaches the info view @smoke', async () => {
    const runtimeRoot = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'xeroscout-e2e-central-fixture-')) ;
    const fixture = createEventFixture(path.resolve(__dirname, '..'), runtimeRoot, {
        name: 'Central Fixture Event',
    }) ;
    const launched = await launchXeroScout('central', {
        runtimeRoot,
        args: [fixture.eventPath],
    }) ;

    try {
        const window = await launched.app.firstWindow() ;
        const state = await getMainProcessState(launched.app) ;

        await expect(window.locator('[data-testid="view-info"]')).toHaveCount(1) ;
        await expect(window.locator('[data-testid="nav-icon-view-init"]')).toBeVisible() ;
        await expect(window.locator('[data-testid="nav-separator-general"]')).toBeVisible() ;

        expect(state.ready).toBe(true) ;
        expect(state.userDataPath).toBe(launched.userDataDir) ;
        await expect(window.locator('body')).toHaveAttribute('data-app-type', 'central') ;
        await expect(window.locator('body')).toHaveAttribute('data-current-view', 'info') ;
    }
    finally {
        await closeXeroScout(launched) ;
    }
}) ;
