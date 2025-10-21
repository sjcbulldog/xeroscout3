import * as sqlite3 from 'sqlite3' ;
import { DataModel, DataModelInfo } from "./datamodel";
import winston from 'winston';
import { BAMatch } from '../extnet/badata';
import { SCBase } from '../apps/scbase';
import { DataRecord } from './datarecord';
import { DataValue } from '../../shared/datavalue' ;
import { IPCColumnDesc, IPCScoutResults, IPCTypedDataValue } from '../../shared/ipc';

export class MatchDataModel extends DataModel {
    public static readonly TableName: string = 'matches' ;
    private static readonly BlueAlliancePrefix: string = 'ba_' ;
    private static readonly fixedcols = ['comp_level', 'match_number', 'set_number'] ;

    public constructor(dbname: string, info: DataModelInfo, logger: winston.Logger) {
        super(dbname, MatchDataModel.TableName, info, logger) ;
    }

    public init() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            super.init()
            .then(() => {
                this.createTableIfNecessary(MatchDataModel.TableName)
                    .then(()=> {
                        resolve() ;
                    })
                    .catch((err) => {
                        reject(err) ;
                    }) ;
            })
            .catch((err) => {
                reject(err) ;
            })
        }) ;

        return ret;
    }

    protected initialTableColumns() : IPCColumnDesc[] {
        //
        // Initial columns for the teams table.  These are the base columns that will be
        // created when the table is created.  This list must match the columns in the
        // createTableQuery() method.
        //         
        return [
            {
                name: 'key',
                type: 'string',
                source: 'base',
                editable: false,
            },            
            {
                name: 'comp_level',
                type: 'string',
                source: 'base',
                editable: false,
            },
            {
                name: 'set_number',
                type: 'integer',
                source: 'base',
                editable: false,                
            }, 
            {
                name: 'match_number',
                type: 'integer',
                source: 'base',
                editable: false,                
            }, 
            {
                name: 'team_key',
                type: 'string',
                source: 'base',
                editable: false,                
            }
        ] ;
    }

    protected createTableQuery() : string {
        let ret = 'create table ' + MatchDataModel.TableName + ' (' ;
        ret += 'key TEXT' ;
        ret += ', comp_level TEXT NOT NULL' ;
        ret += ', set_number REAL NOT NULL' ;
        ret += ', match_number REAL NOT NULL'
        ret += ', team_key TEXT NOT NULL' ;
        ret += ');' ;

        return ret ;
    }

    private getDataValueFromObject(obj: any) : IPCTypedDataValue {
        let ret = DataValue.fromError(new Error('Invalid data type')) ;

        if (typeof obj === 'string') {
            ret = DataValue.fromString(obj) ;
        }
        else if (typeof obj === 'number') {
            if (Number.isInteger(obj)) {
                ret = DataValue.fromInteger(obj) ;
            }
            else {
                ret = DataValue.fromReal(obj) ;
            }
        }
        else if (typeof obj === 'boolean') {
            ret = DataValue.fromBoolean(obj) ;
        }

        return ret ;
    }

    private moveToRecord(obj: any, dr: DataRecord) {
        for(let key of Object.keys(obj)) {
            let value = this.getDataValueFromObject(obj[key]) ;
            if (!DataValue.isError(value)) {
                dr.addfield('ba_' + key, value) ;
            }
        }
    }

    private getScoreBreakdown(score: any, dr: DataRecord, alliance: string) {
        this.moveToRecord(score, dr) ;
        if (alliance === 'red' && score.red) {
            this.moveToRecord(score.red, dr) ;
        }
        else if (alliance === 'blue' && score.blue) {
            this.moveToRecord(score.blue, dr) ;
        }
    }

    private convertToRecord(obj: BAMatch, tkey: string, alliance: string, results: boolean) : DataRecord {
        let dr = new DataRecord() ;

        dr.addfield('key', DataValue.fromString(obj.key)) ;
        dr.addfield('team_key', DataValue.fromString(tkey)) ;
        dr.addfield('comp_level', DataValue.fromString(obj.comp_level));
        dr.addfield('set_number', DataValue.fromInteger(obj.set_number)) ;
        dr.addfield('match_number', DataValue.fromInteger(obj.match_number)) ;
        dr.addfield('r1', DataValue.fromString(obj.alliances.red.team_keys[0])) ;
        dr.addfield('r2', DataValue.fromString(obj.alliances.red.team_keys[1])) ;
        dr.addfield('r3', DataValue.fromString(obj.alliances.red.team_keys[2])) ;
        dr.addfield('b1', DataValue.fromString(obj.alliances.blue.team_keys[0])) ;
        dr.addfield('b2', DataValue.fromString(obj.alliances.blue.team_keys[1])) ;
        dr.addfield('b3', DataValue.fromString(obj.alliances.blue.team_keys[2])) ;
        dr.addfield('alliance', DataValue.fromString(alliance)) ;

        if (results) {
            if (obj.alliances.red.score) {
                dr.addfield('ba_redscore', DataValue.fromInteger(obj.alliances.red.score)) ;
                if (alliance === 'red') {
                    dr.addfield('ba_score', DataValue.fromInteger(obj.alliances.red.score)) ;
                }
            }
            

            if (obj.alliances.blue.score) {
                dr.addfield('ba_bluescore', DataValue.fromInteger(obj.alliances.blue.score)) ;
                if (alliance === 'blue') {
                    dr.addfield('ba_score', DataValue.fromInteger(obj.alliances.blue.score)) ;
                }
            }

            if (obj.winning_alliance) {
                dr.addfield('ba_winning_alliance', DataValue.fromString(obj.winning_alliance)) ;
            }

            if (obj.score_breakdown) {
                this.getScoreBreakdown(obj.score_breakdown, dr, alliance) ;
            }
        }

        return dr ;
    }

    public processBAData(data: BAMatch[], results: boolean) : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            let dr: DataRecord ;
            let records: DataRecord[] = [] ;

            for(let one of data) {
                //
                // Each match turns into 6 records in the database, one for each team
                // of each of the alliances.
                //

                dr = this.convertToRecord(one, one.alliances.red.team_keys[0], 'red', results) ;
                records.push(dr) ;

                dr = this.convertToRecord(one, one.alliances.red.team_keys[1], 'red', results) ;
                records.push(dr) ;

                dr = this.convertToRecord(one, one.alliances.red.team_keys[2], 'red', results) ;
                records.push(dr) ;

                dr = this.convertToRecord(one, one.alliances.blue.team_keys[0], 'blue', results) ;
                records.push(dr) ;

                dr = this.convertToRecord(one, one.alliances.blue.team_keys[1], 'blue', results) ;
                records.push(dr) ;

                dr = this.convertToRecord(one, one.alliances.blue.team_keys[2], 'blue', results) ;
                records.push(dr) ;
            }

            try {
                await this.addColsAndData(['comp_level', 'set_number', 'match_number', 'team_key'], records, false, 'bluealliance') ;
                resolve() ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;

        return ret; 
    }

    // sm-qm-1-1-8 is sm- TYPE - set_number - match_number
    private parseMatchString(str: string) : any | undefined {
        let ret ;

        const regex = /^sm-([a-z]+)-([0-9]+)-([0-9]+)-([a-zA-Z0-9]+)$/;
        let match = regex.exec(str) ;
        if (match) {
            let team = match[4] ;
            if (!team.startsWith('frc')) {
                team = 'frc' + team ;
            }
            ret = {
                type: match[1],
                set_number: +match[2],
                match: +match[3],
                teamkey: team
            } ;
        }

        return ret ;
    }

    private convertScoutDataToRecord(match: any, data:any[]) : DataRecord {
        let dr = new DataRecord() ;
        let teamnumber = -1 ;

        let item = this.parseMatchString(match as string) ;

        dr.addfield('comp_level', DataValue.fromString(item.type)) ;
        dr.addfield('set_number', DataValue.fromInteger(item.set_number)) ;
        dr.addfield('match_number', DataValue.fromInteger(item.match)) ;
        dr.addfield('team_key', DataValue.fromString(item.teamkey)) ;

        for(let field of data) {
            dr.addfield(field.tag, field.value) ;
        }
        return dr ;
    }

    public async processScoutingResults(data: IPCScoutResults) : Promise<string[]> {
        let ret = new Promise<string[]>(async (resolve, reject) => {
            let ret: string[] = [] ;
            let records: DataRecord[] = [] ;
            for(let record of data.results) {
                let dr = this.convertScoutDataToRecord(record.item, record.data) ;
                ret.push(record.item!) ;
                records.push(dr) ;
            }
            await this.addColsAndData(['comp_level', 'set_number', 'match_number', 'team_key'], records, true, 'form') ;
            resolve(ret) ;
        }) ;
        return ret ;
    }
}