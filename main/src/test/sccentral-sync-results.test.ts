import { expect, test, vi } from "vitest" ;

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
