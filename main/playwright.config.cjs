const path = require('path') ;

module.exports = {
    testDir: path.join(__dirname, 'e2e'),
    testMatch: /.*\.spec\.cjs$/,
    timeout: 60_000,
    expect: {
        timeout: 10_000,
    },
    fullyParallel: false,
    workers: 1,
    reporter: [
        ['list'],
        ['html', { outputFolder: path.join(__dirname, 'playwright-report'), open: 'never' }],
    ],
    outputDir: path.join(__dirname, 'test-results', 'playwright'),
    use: {
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
} ;
