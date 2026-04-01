const fs = require('fs') ;
const os = require('os') ;
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

test('central and scout complete a simulated cable sync round-trip @sync @cable', async () => {
    const syncPort = 47000 + Math.floor(Math.random() * 1000) ;
    const sharedRuntimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xeroscout-e2e-cable-')) ;
    const fixture = await createLockedSyncFixture(path.resolve(__dirname, '..'), sharedRuntimeRoot) ;

    const central = await launchXeroScout('central', {
        runtimeRoot: path.join(sharedRuntimeRoot, 'central-runtime'),
        syncPort,
        args: [fixture.eventPath],
    }) ;

    const scout = await launchXeroScout('scout', {
        runtimeRoot: path.join(sharedRuntimeRoot, 'scout-runtime'),
        syncPort,
        syncCableHost: '127.0.0.1',
    }) ;

    try {
        const centralWindow = await central.app.firstWindow() ;
        const scoutWindow = await scout.app.firstWindow() ;

        await waitForCurrentView(centralWindow, 'info') ;
        await sendRendererCommand(scoutWindow, 'execute-command', 'sync-event-remote') ;
        await waitForCurrentView(scoutWindow, 'select-tablet') ;

        await expect(scoutWindow.locator('[data-testid="dialog-select-tablet"]')).toBeVisible() ;
        await scoutWindow.getByText(fixture.teamScoutTabletName, { exact: true }).click() ;
        await scoutWindow.locator('[data-testid="dialog-ok-select-tablet"]').click() ;

        await sendRendererCommand(scoutWindow, 'execute-command', fixture.teamScoutCommand) ;
        await waitForCurrentView(scoutWindow, 'form-scout') ;

        await scoutWindow.locator('[data-testid="form-control-scout-text-pit-notes"]').fill('Cable sync note') ;
        await scoutWindow.locator('[data-testid="form-control-scout-boolean-ready"] input[type="checkbox"]').check() ;

        await sendRendererCommand(scoutWindow, 'execute-command', 'sync-event-remote') ;

        let row = null ;
        const deadline = Date.now() + 15000 ;
        while (Date.now() < deadline) {
            row = await querySqliteRow(
                fixture.dbPath,
                'select team_number, pit_notes, ready from teams where team_number = ?',
                [fixture.teamNumber]
            ) ;
            if (row && row.pit_notes === 'Cable sync note') {
                break ;
            }
        }

        expect(row).not.toBeNull() ;
        expect(row.team_number).toBe(fixture.teamNumber) ;
        expect(row.pit_notes).toBe('Cable sync note') ;
        expect(row.ready).toBe(1) ;
    }
    finally {
        await closeXeroScout(scout) ;
        await closeXeroScout(central) ;
        fs.rmSync(sharedRuntimeRoot, { recursive: true, force: true }) ;
    }
}) ;
