const fs = require('fs') ;
const os = require('os') ;
const path = require('path') ;
const sqlite3 = require('sqlite3') ;
const { _electron: electron } = require('playwright') ;

function createTempRuntimeRoot(mode) {
    return fs.mkdtempSync(path.join(os.tmpdir(), `xeroscout-e2e-${mode}-`)) ;
}

function createEventFixture(rootDir, runtimeRoot, options = {}) {
    const { ProjectInfo } = require(path.join(rootDir, 'dist', 'main', 'project', 'projectinfo.js')) ;
    const eventDir = path.join(runtimeRoot, options.directoryName ?? 'event-fixture') ;
    fs.mkdirSync(eventDir, { recursive: true }) ;

    const info = new ProjectInfo() ;
    info.name_ = options.name ?? 'E2E Fixture Event' ;
    if (options.locked === true) {
        info.locked_ = true ;
        info.uuid_ = options.uuid ?? 'e2e-fixture-uuid' ;
    }

    const eventPath = path.join(eventDir, 'event.json') ;
    fs.writeFileSync(eventPath, JSON.stringify(info, null, 2)) ;

    return {
        eventDir,
        eventPath,
    } ;
}

function createLogger(rootDir, runtimeRoot, name) {
    const winston = require(path.join(rootDir, 'node_modules', 'winston')) ;
    const logPath = path.join(runtimeRoot, `${name}.log`) ;
    return winston.createLogger({
        level: 'error',
        transports: [
            new winston.transports.File({ filename: logPath }),
        ],
    }) ;
}

function createBaseItem(type, tag, datatype, x, y, width, height) {
    return {
        type,
        tag,
        x,
        y,
        width,
        height,
        color: 'black',
        background: 'white',
        fontFamily: 'Arial',
        fontSize: 24,
        fontWeight: 'normal',
        fontStyle: 'normal',
        datatype,
        transparent: false,
    } ;
}

function createTeamFormFixture() {
    return {
        purpose: 'team',
        tablet: {
            name: 'Default',
            size: {
                width: 1280,
                height: 800,
            },
        },
        sections: [
            {
                name: 'Overview',
                items: [
                    {
                        ...createBaseItem('text', 'pit_notes', 'string', 24, 24, 360, 48),
                        placeholder: 'Pit notes',
                    },
                    {
                        ...createBaseItem('boolean', 'ready', 'boolean', 24, 96, 48, 48),
                        accent: 'lightgreen',
                    },
                    {
                        ...createBaseItem('choice', 'drivetrain', 'string', 24, 168, 320, 120),
                        radiosize: 18,
                        orientation: 'vertical',
                        multiselect: false,
                        choices: [
                            { text: 'Tank', value: 'tank' },
                            { text: 'Swerve', value: 'swerve' },
                            { text: 'Other', value: 'other' },
                        ],
                    },
                ],
            },
            {
                name: 'Timing',
                items: [
                    {
                        ...createBaseItem('updown', 'intake_count', 'integer', 24, 24, 80, 160),
                        orientation: 'vertical',
                        minvalue: 0,
                        maxvalue: 10,
                    },
                    {
                        ...createBaseItem('stopwatch', 'climb_hold', 'real', 160, 24, 220, 140),
                        holdMode: true,
                    },
                ],
            },
        ],
    } ;
}

function createMatchFormFixture() {
    return {
        purpose: 'match',
        tablet: {
            name: 'Default',
            size: {
                width: 1280,
                height: 800,
            },
        },
        sections: [
            {
                name: 'Match',
                items: [
                    {
                        ...createBaseItem('text', 'auto_notes', 'string', 24, 24, 360, 48),
                        placeholder: 'Match notes',
                    },
                    {
                        ...createBaseItem('boolean', 'mobility', 'boolean', 24, 96, 48, 48),
                        accent: 'lightgreen',
                    },
                ],
            },
        ],
    } ;
}

async function createLockedSyncFixture(rootDir, runtimeRoot, options = {}) {
    const { Project } = require(path.join(rootDir, 'dist', 'main', 'project', 'project.js')) ;
    const eventDir = path.join(runtimeRoot, options.directoryName ?? 'locked-sync-fixture') ;
    fs.mkdirSync(eventDir, { recursive: true }) ;

    const logger = createLogger(rootDir, runtimeRoot, 'fixture-builder') ;
    const project = await Project.createEvent(
        logger,
        eventDir,
        options.year ?? new Date().getFullYear(),
        'central'
    ) ;

    const teams = options.teams ?? [
        { number: 111, nickname: 'Alpha' },
        { number: 222, nickname: 'Bravo' },
        { number: 333, nickname: 'Charlie' },
        { number: 444, nickname: 'Delta' },
        { number: 555, nickname: 'Echo' },
        { number: 666, nickname: 'Foxtrot' },
    ] ;
    const teamScoutTabletName = options.teamScoutTabletName ?? 'Team Scout 1' ;

    project.setEventName(options.name ?? 'Locked Sync Fixture Event') ;
    project.team_mgr_.setTeamData(teams) ;
    await project.match_mgr_.setMatchData(options.matches ?? [
        {
            comp_level: 'qm',
            set_number: 1,
            match_number: 1,
            red: [111, 222, 333],
            blue: [444, 555, 666],
        },
    ]) ;

    project.form_mgr_.createTeamForm() ;
    project.form_mgr_.createMatchForm() ;
    project.form_mgr_.saveForm('team', createTeamFormFixture()) ;
    project.form_mgr_.saveForm('match', createMatchFormFixture()) ;

    project.setTabletData(options.tablets ?? [
        { name: teamScoutTabletName, purpose: 'team' },
        { name: 'Match Scout 1', purpose: 'match' },
        { name: 'Match Scout 2', purpose: 'match' },
        { name: 'Match Scout 3', purpose: 'match' },
        { name: 'Match Scout 4', purpose: 'match' },
        { name: 'Match Scout 5', purpose: 'match' },
        { name: 'Match Scout 6', purpose: 'match' },
    ]) ;

    await project.lockEvent() ;
    project.data_mgr_?.close?.() ;

    return {
        eventDir,
        eventPath: path.join(eventDir, 'event.json'),
        teamScoutTabletName,
        teamScoutCommand: `st-${teams[0].number}`,
        teamNumber: teams[0].number,
        dbPath: path.join(eventDir, 'team.db'),
    } ;
}

async function launchXeroScout(mode, options = {}) {
    const rootDir = options.rootDir ?? path.resolve(__dirname, '..', '..') ;
    const runtimeRoot = options.runtimeRoot ?? createTempRuntimeRoot(mode) ;
    const homeDir = path.join(runtimeRoot, 'home') ;
    const userDataDir = path.join(runtimeRoot, 'user-data') ;
    fs.mkdirSync(homeDir, { recursive: true }) ;
    fs.mkdirSync(userDataDir, { recursive: true }) ;

    const executablePath = require('electron') ;
    const appEntry = path.join(rootDir, 'dist', 'main.js') ;
    const env = {
        ...process.env,
        XEROSCOUT_TEST_MODE: '1',
        APP_TEST_DRIVER: '1',
        XEROSCOUT_HOME: homeDir,
        XEROSCOUT_USER_DATA_DIR: userDataDir,
        ...(options.syncPort ? { XEROSCOUT_SYNC_PORT: String(options.syncPort) } : {}),
        ...(options.syncCableHost ? { XEROSCOUT_SYNC_CABLE_HOST: String(options.syncCableHost) } : {}),
        ...options.env,
    } ;

    const app = await electron.launch({
        executablePath,
        cwd: rootDir,
        env,
        args: [
            appEntry,
            '--test-mode',
            '--allow-multi-instance',
            mode,
            ...(options.args ?? []),
        ],
    }) ;

    return {
        app,
        mode,
        runtimeRoot,
        homeDir,
        userDataDir,
    } ;
}

async function getMainProcessState(app) {
    return await app.evaluate(async ({ app }) => {
        return {
            ready: app.isReady(),
            userDataPath: app.getPath('userData'),
        } ;
    }) ;
}

async function sendRendererCommand(page, channel, data) {
    await page.evaluate(({ channel, data }) => {
        window.scoutingAPI.send(channel, data) ;
    }, { channel, data }) ;
}

async function waitForCurrentView(page, view) {
    await page.locator('body').waitFor({ state: 'attached' }) ;
    await page.waitForFunction((expectedView) => {
        return document.body?.dataset.currentView === expectedView ;
    }, view) ;
}

function querySqliteRow(dbPath, query, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                reject(err) ;
            }
        }) ;

        db.get(query, params, (err, row) => {
            db.close(() => {
                if (err) {
                    reject(err) ;
                }
                else {
                    resolve(row ?? null) ;
                }
            }) ;
        }) ;
    }) ;
}

async function pollForSqliteRow(dbPath, query, params = [], options = {}) {
    const timeoutMs = options.timeoutMs ?? 15000 ;
    const intervalMs = options.intervalMs ?? 250 ;
    const deadline = Date.now() + timeoutMs ;

    while (Date.now() < deadline) {
        const row = await querySqliteRow(dbPath, query, params) ;
        if (row) {
            return row ;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs)) ;
    }

    return null ;
}

async function closeXeroScout(launched) {
    if (!launched) {
        return ;
    }

    try {
        await launched.app.close() ;
    }
    finally {
        fs.rmSync(launched.runtimeRoot, { recursive: true, force: true }) ;
    }
}

module.exports = {
    createEventFixture,
    createLockedSyncFixture,
    launchXeroScout,
    getMainProcessState,
    sendRendererCommand,
    waitForCurrentView,
    querySqliteRow,
    pollForSqliteRow,
    closeXeroScout,
} ;
