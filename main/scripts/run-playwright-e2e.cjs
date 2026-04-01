#!/usr/bin/env node

const { spawnSync } = require('child_process') ;
const path = require('path') ;

function resolveOrExit(id) {
    try {
        return require.resolve(id, { paths: [process.cwd()] }) ;
    }
    catch (err) {
        console.error(`Missing dependency '${id}'. Run 'npm install' in ${process.cwd()} before running E2E tests.`) ;
        process.exit(1) ;
    }
}

const playwrightTestCli = resolveOrExit('@playwright/test/cli') ;
resolveOrExit('playwright') ;

const args = process.argv.slice(2) ;
const result = spawnSync(process.execPath, [playwrightTestCli, 'test', ...args], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
        ...process.env,
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD ?? '1',
    },
}) ;

process.exit(result.status ?? 1) ;
