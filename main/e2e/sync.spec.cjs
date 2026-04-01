const path = require('path') ;
const { test, expect } = require('@playwright/test') ;
const {
    closeXeroScout,
    createLockedSyncFixture,
    launchXeroScout,
    querySqliteRow,
    sendRendererCommand,
    waitForCurrentView,
} = require('./helpers/electron-app.cjs') ;

test.describe.configure({ mode: 'serial' }) ;

test('central and scout complete a local sync and team scouting round-trip @sync', async () => {
    const syncPort = 46000 + Math.floor(Math.random() * 1000) ;
    const sharedRuntimeRoot = require('fs').mkdtempSync(
        require('path').join(require('os').tmpdir(), 'xeroscout-e2e-sync-')
    ) ;
    const fixture = await createLockedSyncFixture(path.resolve(__dirname, '..'), sharedRuntimeRoot) ;

    const central = await launchXeroScout('central', {
        runtimeRoot: path.join(sharedRuntimeRoot, 'central-runtime'),
        syncPort,
        args: [fixture.eventPath],
    }) ;

    const scout = await launchXeroScout('scout', {
        runtimeRoot: path.join(sharedRuntimeRoot, 'scout-runtime'),
        syncPort,
    }) ;

    try {
        const centralWindow = await central.app.firstWindow() ;
        const scoutWindow = await scout.app.firstWindow() ;

        await waitForCurrentView(centralWindow, 'info') ;
        await expect(centralWindow.locator('body')).toHaveAttribute('data-app-type', 'central') ;

        await sendRendererCommand(scoutWindow, 'execute-command', 'sync-event-local') ;
        await waitForCurrentView(scoutWindow, 'select-tablet') ;

        await expect(scoutWindow.locator('[data-testid="dialog-select-tablet"]')).toBeVisible() ;
        await expect(scoutWindow.locator('[data-testid="select-tablet-table"]')).toBeVisible() ;
        await scoutWindow.getByText(fixture.teamScoutTabletName, { exact: true }).click() ;
        await scoutWindow.locator('[data-testid="dialog-ok-select-tablet"]').click() ;

        await expect(scoutWindow.locator('[data-testid="nav-item-st-111"]')).toBeVisible() ;
        await sendRendererCommand(scoutWindow, 'execute-command', fixture.teamScoutCommand) ;
        await waitForCurrentView(scoutWindow, 'form-scout') ;

        await scoutWindow.locator('[data-testid="form-control-scout-text-pit-notes"]').fill('Fast pit sync note') ;
        await scoutWindow.locator('[data-testid="form-control-scout-boolean-ready"] input[type="checkbox"]').check() ;
        await scoutWindow.locator('[data-testid="form-control-scout-choice-drivetrain"] input[type="radio"]').nth(1).check() ;

        await scoutWindow.locator('[data-testid="tab-timing"]').click() ;
        await expect(scoutWindow.locator('[data-testid="form-control-scout-updown-intake-count"]')).toHaveCount(1) ;
        await scoutWindow.locator('[data-testid="form-control-scout-updown-intake-count"] button').first().click() ;
        await scoutWindow.locator('[data-testid="form-control-scout-updown-intake-count"] button').first().click() ;

        const stopwatch = scoutWindow.locator('[data-testid="form-control-scout-stopwatch-climb-hold"]') ;
        await stopwatch.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1 }) ;
        await scoutWindow.waitForTimeout(1200) ;
        await stopwatch.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 0 }) ;

        await sendRendererCommand(scoutWindow, 'execute-command', 'sync-event-local') ;

        let row = null ;
        const deadline = Date.now() + 15000 ;
        while (Date.now() < deadline) {
            row = await querySqliteRow(
                fixture.dbPath,
                'select team_number, pit_notes, ready, drivetrain, intake_count, climb_hold from teams where team_number = ?',
                [fixture.teamNumber]
            ) ;
            if (row && row.pit_notes === 'Fast pit sync note') {
                break ;
            }
            await scoutWindow.waitForTimeout(250) ;
        }

        expect(row).not.toBeNull() ;
        expect(row.team_number).toBe(fixture.teamNumber) ;
        expect(row.pit_notes).toBe('Fast pit sync note') ;
        expect(row.ready).toBe(1) ;
        expect(row.drivetrain).toBe('swerve') ;
        expect(row.intake_count).toBe(2) ;
        expect(Number(row.climb_hold)).toBeGreaterThan(0.5) ;
    }
    finally {
        await closeXeroScout(scout) ;
        await closeXeroScout(central) ;
        require('fs').rmSync(sharedRuntimeRoot, { recursive: true, force: true }) ;
    }
}) ;
