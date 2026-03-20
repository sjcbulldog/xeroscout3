import { expect, test } from "vitest" ;

import { DataManager } from "../main/project/datamgr" ;
import { DataRecord } from "../main/model/datarecord" ;
import { DataValue } from "../shared/datavalue" ;
import { IPCDataSet, IPCTypedDataValue } from "../shared/ipc" ;

function createMatchRecord(matchNumber: number, metric: number) : DataRecord {
    const record = new DataRecord() ;
    record.addfield('comp_level', DataValue.fromString('qm')) ;
    record.addfield('set_number', DataValue.fromInteger(1)) ;
    record.addfield('match_number', DataValue.fromInteger(matchNumber)) ;
    record.addfield('metric', DataValue.fromInteger(metric)) ;
    return record ;
}

function createNullMetricRecord(matchNumber: number) : DataRecord {
    const record = new DataRecord() ;
    record.addfield('comp_level', DataValue.fromString('qm')) ;
    record.addfield('set_number', DataValue.fromInteger(1)) ;
    record.addfield('match_number', DataValue.fromInteger(matchNumber)) ;
    record.addfield('metric', DataValue.fromNull()) ;
    return record ;
}

function createManager(recordsByTeam: Record<number, DataRecord[]>, scouted: string[] = []) : any {
    const manager = Object.create(DataManager.prototype) as any ;
    manager.info_ = {
        scouted_match_: scouted,
    } ;
    manager.teamdb_ = {
        getColumnNames: () => [],
    } ;
    manager.matchdb_ = {
        tableName: 'matches',
        getColumnNames: () => ['metric'],
        all: async (query: string) => {
            const match = query.match(/team_key = "frc(\d+)"/) ;
            const team = match ? parseInt(match[1], 10) : -1 ;
            return recordsByTeam[team] ?? [] ;
        },
    } ;
    manager.formula_mgr_ = {
        hasFormula: () => false,
    } ;
    return manager ;
}

function getArrayValues(value: IPCTypedDataValue) : number[] {
    expect(value.type).toBe('array') ;
    return DataValue.toArray(value).map((entry) => DataValue.toInteger(entry)) ;
}

test('last N dataset uses each team history and accepts teams with fewer completed matches', async () => {
    const manager = createManager({
        111: [
            createMatchRecord(3, 30),
            createMatchRecord(1, 10),
            createMatchRecord(5, 50),
            createMatchRecord(4, 40),
            createMatchRecord(2, 20),
        ],
        222: [
            createMatchRecord(2, 200),
            createMatchRecord(3, 300),
            createMatchRecord(1, 100),
        ],
    }, [
        'sm-qm-1-2-111',
        'sm-qm-1-3-111',
        'sm-qm-1-4-111',
        'sm-qm-1-5-111',
        'sm-qm-1-1-222',
        'sm-qm-1-2-222',
        'sm-qm-1-3-222',
    ]) ;

    const dataset: IPCDataSet = {
        name: 'Recent',
        formula: '',
        matches: {
            kind: 'last',
            first: 0,
            last: 4,
        },
    } ;

    const team111 = await manager.getData(dataset, 'metric', 111) ;
    const team222 = await manager.getData(dataset, 'metric', 222) ;

    expect(getArrayValues(team111)).toEqual([20, 30, 40, 50]) ;
    expect(getArrayValues(team222)).toEqual([100, 200, 300]) ;
}) ;

test('first N dataset reads the first count from matches.first', async () => {
    const manager = createManager({
        333: [
            createMatchRecord(4, 40),
            createMatchRecord(1, 10),
            createMatchRecord(3, 30),
            createMatchRecord(2, 20),
        ],
    }, [
        'sm-qm-1-1-333',
        'sm-qm-1-2-333',
        'sm-qm-1-3-333',
        'sm-qm-1-4-333',
    ]) ;

    const dataset: IPCDataSet = {
        name: 'Opening',
        formula: '',
        matches: {
            kind: 'first',
            first: 2,
            last: 0,
        },
    } ;

    const team333 = await manager.getData(dataset, 'metric', 333) ;
    expect(getArrayValues(team333)).toEqual([10, 20]) ;
}) ;

test('dataset arrays only include scouted non-null match values', async () => {
    const manager = createManager({
        444: [
            createMatchRecord(1, 10),
            createNullMetricRecord(2),
            createMatchRecord(3, 30),
            createMatchRecord(4, 40),
            createMatchRecord(5, 50),
        ],
    }, [
        'sm-qm-1-1-444',
        'sm-qm-1-2-444',
        'sm-qm-1-4-444',
        'sm-qm-1-5-444',
    ]) ;

    const dataset: IPCDataSet = {
        name: 'Recent',
        formula: '',
        matches: {
            kind: 'last',
            first: 0,
            last: 4,
        },
    } ;

    const team444 = await manager.getData(dataset, 'metric', 444) ;
    expect(getArrayValues(team444)).toEqual([10, 40, 50]) ;
}) ;
