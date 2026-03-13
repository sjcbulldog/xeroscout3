import { expect, test, vi } from "vitest" ;
import type { Menu } from "electron" ;

vi.mock("electron", () => {
    return {
        app: {
            getVersion: () => '0.0.0',
        },
        dialog: {
            showMessageBox: () => Promise.resolve(undefined),
        },
        Menu: class {
        },
    } ;
}) ;

import { SCCoachCentralBaseApp } from "../main/apps/sccoachcentralbase" ;
import { DataRecord } from "../main/model/datarecord" ;
import { DataValue } from "../shared/datavalue" ;
import { IPCDatabaseData, IPCProjColumnsConfig } from "../shared/ipc" ;

class TestCoachCentralApp extends SCCoachCentralBaseApp {
    public sent_ : { ev: string, args: any[] }[] = [] ;

    public constructor() {
        super({
            webContents: {
                send: () => {
                }
            }
        } as any, 'central') ;
    }

    public basePage(): string {
        return '' ;
    }

    public sendNavData(): void {
    }

    public executeCommand(cmd: string): void {
    }

    public createMenu(): Menu | null {
        return null ;
    }

    public windowCreated(): void {
    }

    public canQuit(): boolean {
        return true ;
    }

    public close(): void {
    }

    public async promptString(title: string, message: string, defaultValue?: string, placeholder?: string): Promise<string | undefined> {
        return undefined ;
    }

    public override sendToRenderer(ev: string, ...args: any) {
        this.sent_.push({ ev, args }) ;
    }

    public setProjectForTest(project: any) {
        this.project = project ;
    }
}

function createColumnConfig(name: string) : IPCProjColumnsConfig {
    return {
        columns: [
            {
                name,
                width: -1,
                hidden: false,
            }
        ],
        frozenColumnCount: 0,
    } ;
}

function createRecord(field: string, value: string | number) : DataRecord {
    let record = new DataRecord() ;
    if (typeof value === 'number') {
        record.addfield(field, DataValue.fromInteger(value)) ;
    }
    else {
        record.addfield(field, DataValue.fromString(value)) ;
    }
    return record ;
}

function createProjectStub() {
    return {
        isInitialized: () => true,
        data_mgr_: {
            matchColumnDescriptors: [{ name: 'team_key', type: 'string', source: 'base', editable: false }],
            teamColumnDescriptors: [{ name: 'team_number', type: 'integer', source: 'base', editable: false }],
            getMatchColConfig: () => createColumnConfig('team_key'),
            getTeamColConfig: () => createColumnConfig('team_number'),
            getAllMatchData: async () => [createRecord('team_key', 'frc1425')],
            getAllTeamData: async () => [createRecord('team_number', 1425)],
        },
        match_mgr_: {
            hasMatches: () => false,
        },
        team_mgr_: {
            hasTeams: () => false,
        },
    } ;
}

function getSinglePayload(app: TestCoachCentralApp, ev: string) : IPCDatabaseData {
    let sent = app.sent_.find((entry) => entry.ev === ev) ;
    expect(sent).toBeDefined() ;
    expect(sent!.args.length).toBe(1) ;
    return sent!.args[0] as IPCDatabaseData ;
}

test('sendMatchDB returns match database rows even when the match manager is empty', async () => {
    let app = new TestCoachCentralApp() ;
    app.setProjectForTest(createProjectStub()) ;

    app.sendMatchDB() ;
    await Promise.resolve() ;

    let payload = getSinglePayload(app, 'send-match-db') ;
    expect(payload.keycols).toEqual(['comp_level', 'set_number', 'match_number', 'team_key']) ;
    expect(payload.data).toEqual([{ team_key: DataValue.fromString('frc1425') }]) ;
}) ;

test('sendTeamDB returns team database rows even when the team manager is empty', async () => {
    let app = new TestCoachCentralApp() ;
    app.setProjectForTest(createProjectStub()) ;

    app.sendTeamDB() ;
    await Promise.resolve() ;

    let payload = getSinglePayload(app, 'send-team-db') ;
    expect(payload.keycols).toEqual(['team_number']) ;
    expect(payload.data).toEqual([{ team_number: DataValue.fromInteger(1425) }]) ;
}) ;

test('sendMatchDB returns a valid empty payload when the match database has no rows', async () => {
    let app = new TestCoachCentralApp() ;
    let project = createProjectStub() ;
    project.data_mgr_.getAllMatchData = async () => [] ;
    app.setProjectForTest(project) ;

    app.sendMatchDB() ;
    await Promise.resolve() ;

    let payload = getSinglePayload(app, 'send-match-db') ;
    expect(payload.column_configurations.columns.length).toBe(1) ;
    expect(payload.data).toEqual([]) ;
}) ;

test('sendTeamDB returns a valid empty payload when the team database has no rows', async () => {
    let app = new TestCoachCentralApp() ;
    let project = createProjectStub() ;
    project.data_mgr_.getAllTeamData = async () => [] ;
    app.setProjectForTest(project) ;

    app.sendTeamDB() ;
    await Promise.resolve() ;

    let payload = getSinglePayload(app, 'send-team-db') ;
    expect(payload.column_configurations.columns.length).toBe(1) ;
    expect(payload.data).toEqual([]) ;
}) ;

test('sendTeamDB normalizes stale column config entries against live descriptors', async () => {
    let app = new TestCoachCentralApp() ;
    let project = createProjectStub() ;
    project.data_mgr_.teamColumnDescriptors = [
        { name: 'team_number', type: 'integer', source: 'base', editable: false },
    ] ;
    project.data_mgr_.getTeamColConfig = () => ({
        frozenColumnCount: 5,
        columns: [
            { name: 'team_number', width: 120, hidden: false },
            { name: 'nickname', width: 200, hidden: false },
            { name: 'team_number', width: 80, hidden: true },
        ],
    }) ;
    app.setProjectForTest(project) ;

    app.sendTeamDB() ;
    await Promise.resolve() ;

    let payload = getSinglePayload(app, 'send-team-db') ;
    expect(payload.column_configurations.frozenColumnCount).toBe(1) ;
    expect(payload.column_configurations.columns).toEqual([
        { name: 'team_number', width: 120, hidden: false },
    ]) ;
}) ;
