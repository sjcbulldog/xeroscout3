import { expect, test, vi } from "vitest" ;

import { DataManager } from "../main/project/datamgr" ;
import { IPCScoutResults } from "../shared/ipc" ;

function createManager() : any {
    const manager = Object.create(DataManager.prototype) as any ;
    manager.logger_ = {
        error: vi.fn(),
    } ;
    manager.write = vi.fn() ;
    manager.info_ = {
        match_results_: [],
        team_results_: [],
        scouted_match_: [],
        scouted_team_: [],
    } ;
    manager.matchdb_ = {
        processScoutingResults: vi.fn(async (obj: IPCScoutResults) => obj.results.map((one) => one.item)),
    } ;
    manager.teamdb_ = {
        processScoutingResults: vi.fn(async (obj: IPCScoutResults) => obj.results.map((one) => +(one.item || "").replace("st-", ""))),
    } ;
    return manager ;
}

test('processResults merges team results across multiple syncs', async () => {
    const manager = createManager() ;

    await manager.processResults({
        tablet: 'Tablet 41',
        purpose: 'team',
        results: [
            {
                item: 'st-111',
                data: [],
            },
        ],
    }) ;

    await manager.processResults({
        tablet: 'Tablet 43',
        purpose: 'team',
        results: [
            {
                item: 'st-222',
                data: [],
            },
        ],
    }) ;

    expect(manager.info_.team_results_.map((one: any) => one.item)).toEqual(['st-111', 'st-222']) ;
    expect(manager.info_.scouted_team_).toEqual([111, 222]) ;
    expect(manager.write).toHaveBeenCalledTimes(2) ;
}) ;

test('processResults replaces the latest value for an existing team result item', async () => {
    const manager = createManager() ;

    await manager.processResults({
        tablet: 'Tablet 41',
        purpose: 'team',
        results: [
            {
                item: 'st-111',
                data: [{ tag: 'notes', value: { type: 'string', value: 'old' } }],
            },
        ],
    }) ;

    await manager.processResults({
        tablet: 'Tablet 41',
        purpose: 'team',
        results: [
            {
                item: 'st-111',
                data: [{ tag: 'notes', value: { type: 'string', value: 'new' } }],
            },
        ],
    }) ;

    expect(manager.info_.team_results_).toHaveLength(1) ;
    expect(manager.info_.team_results_[0].data[0].value.value).toBe('new') ;
}) ;

test('processResults merges match results across multiple syncs', async () => {
    const manager = createManager() ;

    await manager.processResults({
        tablet: 'Tablet 7',
        purpose: 'match',
        results: [
            {
                item: 'sm-qm-1-1-1425',
                data: [],
            },
        ],
    }) ;

    await manager.processResults({
        tablet: 'Tablet 8',
        purpose: 'match',
        results: [
            {
                item: 'sm-qm-1-2-1425',
                data: [],
            },
        ],
    }) ;

    expect(manager.info_.match_results_.map((one: any) => one.item)).toEqual([
        'sm-qm-1-1-1425',
        'sm-qm-1-2-1425',
    ]) ;
    expect(manager.info_.scouted_match_).toEqual([
        'sm-qm-1-1-1425',
        'sm-qm-1-2-1425',
    ]) ;
}) ;
