import { expect, test, vi } from "vitest" ;
import fs from "fs" ;
import os from "os" ;
import path from "path" ;

vi.mock("electron", () => {
    return {
        app: {
            getVersion: () => '0.0.0',
        },
        dialog: {
            showErrorBox: vi.fn(),
            showMessageBox: () => Promise.resolve(undefined),
        },
        Menu: class {
        },
        MenuItem: class {
        },
        shell: {
            openExternal: vi.fn(),
        },
    } ;
}) ;

import { SCCentral } from "../main/apps/sccentral" ;
import { PacketObj } from "../main/sync/packetobj" ;
import { PacketType } from "../main/sync/packettypes" ;

function writeTempForm(contents: object, filename: string) : string {
    let dir = fs.mkdtempSync(path.join(os.tmpdir(), "xeroscout-central-form-")) ;
    let fullpath = path.join(dir, filename) ;
    fs.writeFileSync(fullpath, JSON.stringify(contents, null, 4)) ;
    return fullpath ;
}

function createDeferred<T>() {
    let resolve! : (value: T) => void ;
    let reject! : (reason?: unknown) => void ;
    const promise = new Promise<T>((res, rej) => {
        resolve = res ;
        reject = rej ;
    }) ;
    return { promise, resolve, reject } ;
}

function createCentral(processResultsImpl: () => Promise<number>) : any {
    const central = Object.create(SCCentral.prototype) as any ;
    central.logger_ = {
        info: vi.fn(),
        error: vi.fn(),
    } ;
    central.logSync = vi.fn() ;
    central.setView = vi.fn() ;
    central.project_ = {
        data_mgr_: {
            processResults: vi.fn(processResultsImpl),
        },
        tablet_mgr_: {
            isTabletTeam: vi.fn(() => true),
        },
    } ;
    return central ;
}

test('handleProvideResults waits for processResults before acknowledging success', async () => {
    const deferred = createDeferred<number>() ;
    const central = createCentral(() => deferred.promise) ;
    const packet = new PacketObj(PacketType.ProvideResults, Buffer.from(JSON.stringify({
        tablet: 'Tablet 41',
        purpose: 'team',
        results: [{ item: 'st-111', data: [] }],
    }))) ;

    let settled = false ;
    const replyPromise = central.handleProvideResults(packet).then((reply: PacketObj) => {
        settled = true ;
        return reply ;
    }) ;

    await Promise.resolve() ;
    expect(settled).toBe(false) ;

    deferred.resolve(1) ;
    const reply = await replyPromise ;

    expect(reply.type_).toBe(PacketType.ReceivedResults) ;
    expect(central.project_.data_mgr_.processResults).toHaveBeenCalledTimes(1) ;
    expect(central.setView).toHaveBeenCalledWith("team-status") ;
}) ;

test('handleProvideResults returns an error packet when processResults fails', async () => {
    const central = createCentral(async () => {
        throw new Error('team import failed') ;
    }) ;
    const packet = new PacketObj(PacketType.ProvideResults, Buffer.from(JSON.stringify({
        tablet: 'Tablet 41',
        purpose: 'team',
        results: [{ item: 'st-111', data: [] }],
    }))) ;

    const reply = await central.handleProvideResults(packet) ;

    expect(reply.type_).toBe(PacketType.Error) ;
    expect(reply.payloadAsString()).toBe('team import failed') ;
}) ;

test('handleRequestTeamForm refuses an invalid stored form', () => {
    let formPath = writeTempForm({
        purpose: 'team',
        tablet: { name: 'Tablet 1', size: { width: 1024, height: 768 } },
        sections: [
            {
                name: 'Photo',
                items: [
                    {
                        type: 'text',
                        tag: 'robot_photo',
                        x: 0,
                        y: 0,
                        width: 100,
                        height: 40,
                        fontFamily: 'Arial',
                        fontSize: 14,
                        fontStyle: 'normal',
                        fontWeight: 'normal',
                        color: '#000000',
                        background: '#ffffff',
                        transparent: false,
                        datatype: 'string',
                        placeholder: '',
                    },
                    {
                        type: 'autoplan',
                        tag: 'robot_photo',
                        x: 0,
                        y: 50,
                        width: 100,
                        height: 40,
                        fontFamily: 'Arial',
                        fontSize: 14,
                        fontStyle: 'normal',
                        fontWeight: 'normal',
                        color: '#000000',
                        background: '#ffffff',
                        transparent: false,
                        datatype: 'string',
                    },
                ],
            },
        ],
    }, 'team.json') ;

    const central = Object.create(SCCentral.prototype) as any ;
    central.logSync = vi.fn() ;
    central.project_ = {
        form_mgr_: {
            hasTeamForm: vi.fn(() => true),
            getTeamFormFullPath: vi.fn(() => formPath),
        },
    } ;

    const reply = central["handleRequestTeamForm"](new PacketObj(PacketType.RequestTeamForm)) ;

    expect(reply.type_).toBe(PacketType.Error) ;
    expect(reply.payloadAsString()).toContain("central team form is invalid") ;
    expect(reply.payloadAsString()).toContain("duplicate data tag") ;

    fs.rmSync(path.dirname(formPath), { recursive: true, force: true }) ;
}) ;

test('handleRequestMatchForm returns the stored form when it validates', () => {
    let formPath = writeTempForm({
        purpose: 'match',
        tablet: { name: 'Tablet 1', size: { width: 1024, height: 768 } },
        sections: [
            {
                name: 'Start',
                items: [
                    {
                        type: 'text',
                        tag: 'notes',
                        x: 0,
                        y: 0,
                        width: 100,
                        height: 40,
                        fontFamily: 'Arial',
                        fontSize: 14,
                        fontStyle: 'normal',
                        fontWeight: 'normal',
                        color: '#000000',
                        background: '#ffffff',
                        transparent: false,
                        datatype: 'string',
                        placeholder: '',
                    },
                ],
            },
        ],
    }, 'match.json') ;

    const central = Object.create(SCCentral.prototype) as any ;
    central.logSync = vi.fn() ;
    central.project_ = {
        form_mgr_: {
            hasMatchForm: vi.fn(() => true),
            getMatchFormFullPath: vi.fn(() => formPath),
        },
    } ;

    const reply = central["handleRequestMatchForm"](new PacketObj(PacketType.RequestMatchForm)) ;

    expect(reply.type_).toBe(PacketType.ProvideMatchForm) ;
    expect(JSON.parse(reply.payloadAsString())).toMatchObject({ purpose: 'match' }) ;

    fs.rmSync(path.dirname(formPath), { recursive: true, force: true }) ;
}) ;
