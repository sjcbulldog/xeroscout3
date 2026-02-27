import * as sqlite3 from 'sqlite3' ;
import { DataModel, DataModelInfo } from "./datamodel";
import winston from 'winston';
import { BAOprData, BARankingData, BARankings, BATeam } from '../extnet/badata';
import { SCBase } from '../apps/scbase';
import { DataRecord } from './datarecord';
import { DataValue } from '../../shared/datavalue' ;
import { IPCColumnDesc, IPCScoutResults } from '../../shared/ipc';

interface scoutvalue {
    tag: string,
    type: string,
    value: any
} ;

export class TeamDataModel extends DataModel {
    public static readonly TableName: string = 'teams' ;

    public constructor(dbname: string, info: DataModelInfo, logger: winston.Logger) {
        super(dbname, TeamDataModel.TableName, info, logger) ;
    }

    public init() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            super.init()
            .then(() => {
                this.createTableIfNecessary(TeamDataModel.TableName)
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
                name: 'team_number',
                type: 'integer',
                source: 'base',
                editable: false,
            }] ;
    }

    protected createTableQuery() : string {
        let ret = 'create table ' + TeamDataModel.TableName + ' (' ;
        ret += 'key TEXT';
        ret += ', team_number INTEGER NOT NULL' ;
        ret += ');' ;

        return ret ;
    }

    private convertTeamToRecord(team: BATeam) : DataRecord {
        let dr = new DataRecord() ;

        dr.addfield('key', DataValue.fromString(team.key)) ;
        dr.addfield('team_number', DataValue.fromInteger(team.team_number)) ;
        dr.addfield('nickname', DataValue.fromString(team.nickname)) ;
        dr.addfield('name', DataValue.fromString(team.name)) ;
        dr.addfield('school_name', DataValue.fromString(team.school_name)) ;
        dr.addfield('city', DataValue.fromString(team.city)) ;
        dr.addfield('state_prov', DataValue.fromString(team.state_prov)) ;
        dr.addfield('country', DataValue.fromString(team.country)) ;
        dr.addfield('address', DataValue.fromString(team.address)) ;
        dr.addfield('postal_code', DataValue.fromString(team.postal_code)) ;
        dr.addfield('gmaps_place_id', DataValue.fromString(team.gmaps_place_id)) ;
        dr.addfield('gmaps_url', DataValue.fromString(team.gmaps_url)) ;
        dr.addfield('lat', DataValue.fromReal(team.lat)) ;
        dr.addfield('lng', DataValue.fromReal(team.lng)) ;
        dr.addfield('location_name', DataValue.fromString(team.location_name)) ;
        dr.addfield('website', DataValue.fromString(team.website)) ;
        dr.addfield('rookie_year', DataValue.fromInteger(team.rookie_year)) ;

        return dr ;
    }

    public processBAData(data: BATeam[]) : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            let records: DataRecord[] = [] ;

            for(let one of data) {
                let dr = this.convertTeamToRecord(one) ;
                records.push(dr) ;
            }

            try {
                await this.addColsAndData(['team_number'], records, false, 'bluealliance') ;
                resolve() ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;

        return ret;        
    }
	
    private convertRankingToRecord(ranking: any) : DataRecord {
        let dr = new DataRecord() ;
        dr.addfield('rank', DataValue.fromInteger(ranking.rank));
        dr.addfield('wins', DataValue.fromInteger(ranking.record.wins)) ;
        dr.addfield('losses', DataValue.fromInteger(ranking.record.losses));
        dr.addfield('ties', DataValue.fromInteger(ranking.record.ties)) ;
        dr.addfield('team_key', DataValue.fromString(ranking.team_key)) ;
        dr.addfield('team_number', DataValue.fromInteger(SCBase.keyToTeamNumber(ranking.team_key))) ;
        return dr ;
    }

    private convertStatsYearToRecord(t: any) {
        let dr = new DataRecord() ;

        if (t.team) {
            dr.addfield('team_number', DataValue.fromInteger(t.team)) ;

            if (t.epa) {
                if (t.epa.norm) {
                    dr.addfield('st_year_epanorm', DataValue.fromReal(t.epa.norm)) ;
                }

                if (t.epa.unitless) {
                    dr.addfield('st_year_epaunitless', DataValue.fromReal(t.epa.unitless));
                }

                if (t.epa.ranks.district) {
                    dr.addfield('st_year_district_rank', DataValue.fromInteger(t.epa.ranks.district.rank)) ;
                }

                if (t.epa.ranks.country.rank) {
                    dr.addfield('st_year_country_rank', DataValue.fromInteger(t.epa.ranks.country.rank)) ;
                }

                if (t.epa.ranks.state.rank) {
                    dr.addfield('st_year_state_rank', DataValue.fromInteger(t.epa.ranks.state.rank)) ;
                }

                if (t.epa.breakdown) {
                    for(let key of Object.keys(t.epa.breakdown)) {
                        dr.addfield('st_year_' + key, DataValue.fromReal(t.epa.breakdown[key])) ;
                    }
                }
            }
        }
        
        return dr ;
    }

    private convertStatsEventToRecord(t: any) {
        let dr = new DataRecord() ;
        dr.addfield('team_number', DataValue.fromInteger(t.team)) ;
        if (t.epa.unitless) {
            dr.addfield('st_event_epaunitless', DataValue.fromReal(t.epa.unitless));
        }

        if (t.epa.norm) {
            dr.addfield('st_event_epanorm', DataValue.fromReal(t.epa.norm)) ;
        }

        if (t.epa.total_points) {
            dr.addfield('st_event_totalpoints_mean', DataValue.fromReal(t.epa.total_points.mean)) ;
            dr.addfield('st_event_totalpoints_stddev', DataValue.fromReal(t.epa.total_points.sd)) ;
        }

        if (t.epa.breakdown) {
            for(let key of Object.keys(t.epa.breakdown)) {
                dr.addfield('st_event_' + key, DataValue.fromReal(t.epa.breakdown[key])) ;
            }
        }
        
        return dr ;
    }

    public processStatboticsYearToDateData(stats: any[]) : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            let records : DataRecord[] = [];

            for(let t of stats) {
                records.push(this.convertStatsYearToRecord(t)) ;
            }

            try {
                await this.addColsAndData(['team_number'], records, false, 'statbotics') ;
                resolve() ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;
        return ret ;
    }

    public processStatboticsEventData(stats: any[]) : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            let records : DataRecord[] = [];

            for(let t of stats) {
                records.push(this.convertStatsEventToRecord(t)) ;
            }

            try {
                await this.addColsAndData(['team_number'], records, false, 'statbotics') ;
                resolve() ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;
        return ret ;
    }

    private keyToTeamNumber(key: string) {
        let ret: number = -1 ;
        let m1 = /^frc[0-9]+$/ ;
        let m2 = /^[0-9]+$/ ;

        if (m1.test(key)) {
            ret = +key.substring(3) ;
        }
        else if (m2.test(key)) {
            ret = +key ;
        }

        return ret ;
    }

    public processOPR(opr: BAOprData) : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            let records : DataRecord[] = [];

            for(let key of Object.keys(opr.oprs)) {
                let dr = new DataRecord() ;
                dr.addfield('team_number', DataValue.fromInteger(SCBase.keyToTeamNumber(key))) ;
                dr.addfield('ba_opr', DataValue.fromReal(opr.oprs[key])) ;
                dr.addfield('ba_dpr', DataValue.fromReal(opr.dprs[key])) ;
                dr.addfield('ba_ccwms', DataValue.fromReal(opr.ccwms[key])) ;
                records.push(dr) ;
            }

            try {
                await this.addColsAndData(['team_number'], records, false, 'bluealliance') ;
                resolve() ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;

        return ret;
    }

    public processRankings(rankings: BARankingData[]) : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            let records : DataRecord[] = [];

            for(let t of rankings) {
                records.push(this.convertRankingToRecord(t)) ;
            }

            try {
                await this.addColsAndData(['team_number'], records, false, 'bluealliance') ;
                resolve() ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;

        return ret ;
    }    

    private convertScoutDataToRecord(team: any, data:any[]) : DataRecord {
        let dr = new DataRecord() ;
        let teamnumber = -1 ;
        let tstr: string = team as string ;

        if (tstr.startsWith('st-')) {
            teamnumber = +tstr.substring(3) ;
        }

        dr.addfield('team_number', { type: 'integer', value: teamnumber }) ;

        for(let field of data) {
            dr.addfield(field.tag, field.value) ;
        }
        return dr ;
    }

    public async processScoutingResults(data: IPCScoutResults) : Promise<number[]> {
        let ret = new Promise<number[]>(async (resolve, reject) => {
            let ret: number[] = [] ;
            let records: DataRecord[] = [] ;
            for(let record of data.results) {
                let dr = this.convertScoutDataToRecord(record.item, record.data) ;
                ret.push(DataValue.toInteger(dr.value('team_number')!)) ;
                records.push(dr) ;
            }
            try {
                await this.addColsAndData(['team_number'], records, true, 'form') ;
                resolve(ret) ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;
        return ret ;
    }
}