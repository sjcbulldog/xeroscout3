import winston from "winston";
import { MatchDataModel } from "../model/matchmodel";
import { TeamDataModel } from "../model/teammodel";
import * as path from 'path' ;
import { Manager } from "./manager";
import { FormulaManager } from "./formulamgr";
import { BAMatch, BAOprData, BARankingData, BATeam } from "../extnet/badata";
import { DataValue } from '../../shared/datavalue' ;
import { IPCColumnDesc, IPCTypedDataValue, IPCProjColumnsConfig, IPCChange, IPCScoutResult, IPCScoutResults, IPCCheckDBViewFormula, IPCMatchSet } from "../../shared/ipc";
import { DataRecord } from "../model/datarecord";
import { DataModelInfo } from "../model/datamodel";
import { SCBase } from "../apps/scbase";


export class DataInfo {
    public matchdb_col_config_? : IPCProjColumnsConfig ;       // List of hidden columns in match data
    public teamdb_col_config_? : IPCProjColumnsConfig ;        // List of hidden columns in team data
    
    public scouted_team_: number[] = [] ;               // The list of teams that have scouting data
    public scouted_match_: string[] = [] ;              // The list of matches that have scouring data

    public match_results_ : IPCScoutResult[] = [] ;           // The list of match results that have been processed
    public team_results_ : IPCScoutResult[] = [] ;            // The list of team results that have been processed

    public match_formulas_ : IPCCheckDBViewFormula[] = [] ;
    public team_formulas_ : IPCCheckDBViewFormula[] = [] ;

    public matchdb_changed_rows_ : string[] = [] ; // The list of rows that have been changed in the match database by the central server
    public teamdb_changed_rows_ : string[] = [] ;  // The list of rows that have been changed in the team database by the central server
} ;

export class DataManager extends Manager {
    private static matchLevels : string[] = ['qm', 'sf', 'f'] ;

    private teamdb_ : TeamDataModel ;
    private matchdb_ : MatchDataModel ;
    private formula_mgr_ : FormulaManager ;
    private info_ : DataInfo ;

    constructor(logger: winston.Logger, writer: () => void, dir: string, info: DataInfo, teaminfo: DataModelInfo, matchinfo: DataModelInfo, formula_mgr: FormulaManager) {
        super(logger, writer) ;

        this.info_ = info ;

        if (this.info_.matchdb_changed_rows_ === undefined) {
            this.info_.matchdb_changed_rows_ = [] ;
        }

        if (this.info_.teamdb_changed_rows_ === undefined) {
            this.info_.teamdb_changed_rows_ = [] ;
        }
        
        this.formula_mgr_ = formula_mgr ;

        let filename: string ;

        filename = path.join(dir, 'team.db') ;
        this.teamdb_ = new TeamDataModel(filename, teaminfo, logger) ;
        this.teamdb_.on('column-added', this.teamColumnAdded.bind(this)) ;
        this.teamdb_.on('column-removed', this.teamColumnRemoved.bind(this)) ;

        filename = path.join(dir, 'match.db') ;
        this.matchdb_ = new MatchDataModel(filename, matchinfo, logger) ;
        this.matchdb_.on('column-added', this.matchColumnAdded.bind(this));
        this.matchdb_.on('column-removed', this.matchColumnRemoved.bind(this));

        if (!this.info_.match_results_) {
            this.info_.match_results_ = [] ;
        }

        if (!this.info_.team_results_) {
            this.info_.team_results_ = [] ;
        }
    }

    public init() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.teamdb_.init()
                .then(() => {
                    this.matchdb_.init()
                        .then(()=> {
                            resolve() ;
                        })
                        .catch((err) => {
                            reject(err) ;
                        })
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
        }) ;

        return ret;
    }

    public close() : boolean {
        let ret: boolean = true ;

        if (this.teamdb_) {
            if (!this.teamdb_.close()) {
                ret = false ;
            }
        }

        if (this.matchdb_) {
            if (!this.matchdb_.close()) {
                ret = false ;
            }
        }
        return ret ;
    }

    public removeDatabases() {
        this.teamdb_.remove() ;
        this.matchdb_.remove() ;
    }

    public createFormColumns(teamfields: IPCColumnDesc[], matchfields: IPCColumnDesc[]) : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            try {
                await this.teamdb_.addNecessaryCols(teamfields) ;
            }
            catch(err) {
                reject(err) ;
            }

            try {
                await this.matchdb_.addNecessaryCols(matchfields) ;
            }
            catch(err) {
                reject(err) ;
            }

            resolve() ;
        }) ;

        return ret ;
    }

    //
    // For a given field, either team or match, and a given team, get the
    // value of the field.  For team fields, it is the data stored for that
    // field.  For match fields, the data is processes over all matches to get
    // an average.
    //   
    public getData(m: IPCMatchSet, field: string, team: number) : Promise<IPCTypedDataValue> {
        let ret = new Promise<IPCTypedDataValue>(async (resolve, reject) => {
            let found = false ;

            let tcols = await this.teamdb_.getColumnNames() ;
            if (tcols.includes(field)) {
                let v = await this.getTeamData(field, team) ;
                found = true ;
                resolve(v) ;
                return ;
            }

            let mcols = await this.matchdb_.getColumnNames() ;
            if (mcols.includes(field)) {
                let v = await this.getMatchData(m, field, team) ;
                found = true ;
                resolve(v) ;
                return ;
            }

            if (this.formula_mgr_.hasFormula(field)) {
                let v = await this.evalFormula(m, field, team) ;
                found = true ;
                resolve(v) ;
                return ;
            }

            if (!found) {
                let v : IPCTypedDataValue = {
                    type: 'error',
                    value: 'Field ' + field + ' is not a valid team, match, or formula field'
                }
                resolve(v) ;
                return ;
            }
        }) ;
        return ret;
    }

    public async processResults(obj: IPCScoutResults) : Promise<number> {
        let ret = new Promise<number>(async (resolve, reject) => {
            if (!this.info_) {
                this.logger_.error('project is not initialized, cannot process results') ;
                reject(new Error('project is not initialized')) ;
            }
            else {
                let num = 0 ;

                if (obj.purpose) {
                    if (obj.purpose === 'match') {
                        this.info_.match_results_ = [] ;
                        for(let res of obj.results) {
                            if (res.item) {
                                this.info_.match_results_.push(res) ;
                            }
                        }

                        try {
                            let status = await this.matchdb_.processScoutingResults(obj, this.info_.matchdb_changed_rows_) ;
                            for(let st of status.scouted) {
                                if (!this.info_.scouted_match_.includes(st)) {
                                    this.info_.scouted_match_.push(st) ;
                                }
                            }
                        }
                        catch(err) {
                            this.logger_.error('error processing match scouting results: ' + err) ;
                            reject(err) ;
                            return ;
                        }
                    }
                    else {
                        this.info_.team_results_ = [] ;
                        for(let res of obj.results) {
                            if (res.item) {
                                this.info_.team_results_.push(res) ;
                            }
                        }

                        try {
                            let teams = await this.teamdb_.processScoutingResults(obj, this.info_.teamdb_changed_rows_) ;
                            for (let st of teams.scouted) {
                                if (st.startsWith('st-')) {
                                    let num = parseInt(st.substring(3)) ;
                                    if (!isNaN(num)) {
                                        if (!this.info_.scouted_team_.includes(num)) {
                                            this.info_.scouted_team_.push(num) ;
                                        }
                                    }
                                }
                            }
                        }
                        catch(err) {
                            this.logger_.error('error processing team scouting results: ' + err) ;
                            reject(err) ;
                            return ;
                        }
                    }
                    resolve(num) ;
                }
                this.write() ;
            }
        }) ;
        return ret;
    }     

    public async removeFormColumns() : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            let p1 = this.teamdb_.removeColumns((one) => { return one.source === 'form'}) ;
            let p2 = this.matchdb_.removeColumns((one) => { return one.source === 'form'}) ;
            Promise.all([p1, p2])
                .then(() => {
                    resolve() ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
        }) ;
        return ret ;
    }

    // #region match related methods
    
    public setMatchColConfig(data: IPCProjColumnsConfig) {
        this.info_.matchdb_col_config_ = data ;
        this.write() ;
    }  

    public getMatchColConfig() : IPCProjColumnsConfig | undefined {
        return this.info_.matchdb_col_config_ ;
    }

    public async processMatchBAData(matches: BAMatch[], results: boolean) : Promise<void> {   
        return this.matchdb_.processBAData(matches, results) ;
    }

    public hasMatchScoutingResult(type: string, set: number, match: number, team: number) : string {
        let str: string = 'sm-' + type + '-' + set + '-' + match + '-' + team ;
        return this.info_.scouted_match_.includes(str) ? 'Y' : 'N' ;
    }

    public isMatchScoutingResultQuestionable(type: string, set: number, match: number, team: number) : boolean {
        let str: string = 'sm-' + type + '-' + set + '-' + match + '-' + team ;
        for(let res of this.info_.match_results_) {
            if (res.item === str && res.questionable) {
                return true ;
            }
        }
        return false ;
    }

    public get matchColumnDescriptors() : IPCColumnDesc[] {
        return this.matchdb_.colummnDescriptors ;
    }    

    public get matchColumnNames() : string[] {
        return this.matchdb_.columnNames ;
    }

    public getAllMatchData() : Promise<any[]> {
        return this.matchdb_.getAllData() ;
    }

    private updateResult(result: IPCScoutResult, name: string, value: IPCTypedDataValue) {
        for(let data of result.data) {
            if (data.tag === name) {
                data.value = value ;
                return ;
            }
        }
    }

    public updateMatchDB(changes: IPCChange[]) {
        this.matchdb_.update(changes) ;

        // Flag the match results as changed so that the sync operation will not change it
        for(let change of changes) {
            let team = SCBase.stripKeyString(DataValue.toDisplayString(change.search.team_key)) ;
            let tag = 'sm-' + DataValue.toDisplayString(change.search.comp_level) + '-' + DataValue.toDisplayString(change.search.set_number) + 
                        '-' + DataValue.toDisplayString(change.search.match_number) + '-' + team ;
            if (!this.info_.matchdb_changed_rows_.includes(tag)) {
                this.info_.matchdb_changed_rows_.push(tag) ;
            }

            let result = this.getMatchResult(tag) ;
            if (result) {
                this.updateResult(result, change.column, change.newvalue) ;
            }
        }

        this.write() ;
    }    

    // #endregion

    // #region team related methods
    public setTeamColConfig(data: IPCProjColumnsConfig) {
        this.info_.teamdb_col_config_ = data ;
        this.write() ;
    }

    public getTeamColConfig() : IPCProjColumnsConfig | undefined {
        return this.info_.teamdb_col_config_ ;
    }
    
    public async processTeamBAData(teams: BATeam[]) : Promise<void> {
        return this.teamdb_.processBAData(teams) ;
    }

    public hasTeamScoutingResults(team: number) : boolean {
        return this.info_.scouted_team_.includes(team) ;
    }    

    public get teamColumnDescriptors() : IPCColumnDesc[] {
        return this.teamdb_.colummnDescriptors ;
    }

    public get teamColumnNames() : string[] {
        return this.teamdb_.columnNames ;
    }

    public getAllTeamData() : Promise<DataRecord[]> {
        return this.teamdb_.getAllData() ;
    }    

    public updateTeamDB(changes: IPCChange[]) {
        this.teamdb_.update(changes) ;

        for(let change of changes) {
            let tag = 'st-' + DataValue.toDisplayString(change.search.team_number) ;

            if (!this.info_.teamdb_changed_rows_.includes(tag)) {
                this.info_.teamdb_changed_rows_.push(tag) ;
            }

            let result = this.getTeamResult(tag) ;
            if (result) {
                this.updateResult(result, change.column, change.newvalue) ;
            }
        }        

        this.write() ;
    }

    // #endregion


    // #region external site data methods
    public async processStatboticsEventData(data: any) {
        return this.teamdb_.processStatboticsEventData(data) ;
    }

    public async processStatboticsYearToDateData(data: any) {
        return this.teamdb_.processStatboticsYearToDateData(data) ;
    }

    public async processOPRData(data: BAOprData) : Promise<void> {
        return this.teamdb_.processOPR(data) ;
    }

    public async processRankings(data: BARankingData[]) : Promise<void> {
        return this.teamdb_.processRankings(data) ;
    }
    
    // #endregion

    // region misc methods

    public exportToCSV(filename: string, table: string) : Promise<void> {
        let ret : Promise<void> ;
        if (table === this.teamdb_.tableName) {
            ret = this.teamdb_.exportToCSV(filename, table);
        } else {
            ret = this.matchdb_.exportToCSV(filename, table);
        }

        return ret ;
    }

    public getChangedMatchResults() : IPCScoutResult[] {
        let ret: IPCScoutResult[] = [] ;
        for(let tag of this.info_.matchdb_changed_rows_) {
            let res = this.getMatchResult(tag) ;
            if (res) {
                res.edited = true ; // Mark the result as edited
                ret.push(res) ;
            }
        }
        return ret ;
    }

    public getMatchResult(match: string) : IPCScoutResult | undefined {
        for(let res of this.info_.match_results_) {
            if (res.item === match) {
                return res ;
            }
        }
        return undefined ;
    }

    public getTeamResult(team: string) : IPCScoutResult | undefined {
        for(let res of this.info_.team_results_) {
            if (res.item === team) {
                return res ;
            }
        }
        return undefined ;
    }

    // #endregion

    private getMatchData(m: IPCMatchSet, field: string, team: number) : Promise<IPCTypedDataValue> {
        let ret = new Promise<IPCTypedDataValue>(async (resolve, reject) => {
            let fields = field + ', comp_level, set_number, match_number' ;
            let teamkey = 'frc' + team ;
            let query = 'select ' + fields + ' from ' + this.matchdb_.tableName + ' where team_key = "' + teamkey + '" ;' ;
            this.matchdb_.all(query, undefined)
                .then((data: any[]) => {
                    if (data.length !== 0) {
                        let sorted = this.sortData(data) ;
                        let filtered = this.filterMatchData(m, sorted) ;

                        let value : DataValue[] = [] ;
                        for(let row of filtered) {
                            if (row.has(field)) {
                                value.push(row.value(field)) ;
                            }
                        }
                        resolve (
                            {
                                type: 'array',
                                value: value
                            }) ;
                    }
                    else {
                        resolve(
                            {
                                type: 'error',
                                value: 'no data found for field ' + field
                            }) ;
                    }
                })
                .catch((err) => {
                    resolve(
                        {
                            type: 'error',
                            value: err
                        }) ;
                }) ;
        }) ;

        return ret ;
    }	

    private getTeamData(field: string, team: number) : Promise<IPCTypedDataValue> {
        let ret = new Promise<IPCTypedDataValue>(async (resolve, reject) => {
            let query = 'select ' + field + ' from ' + this.teamdb_.tableName + ' where team_number = ' + team + ' ;' ;
            this.teamdb_.all(query, undefined)
                .then((data) => {
                    let rec = data[0] as any ;
                    let v = rec.value(field) ;
                    resolve(v) ;
                })
                .catch((err) => {
                    resolve({
                        type: 'error',
                        value: err
                    }) ;
                }) ;
        }) ;

        return ret ;
    }    

    public getChangedTeamResults() : IPCScoutResult[] {
        let ret: IPCScoutResult[] = [] ;
        for(let tag of this.info_.teamdb_changed_rows_) {
            let res = this.getTeamResult(tag) ;
            if (res) {
                res.edited = true ; // Mark the result as edited
                ret.push(res) ;
            }
        }
        return ret ;
    }    
    
    private teamColumnAdded(coldesc: IPCColumnDesc) {
        this.logger_.silly('added new column \'' + coldesc.name + '\' to team database') ;

        if (!this.info_.teamdb_col_config_) {
            this.info_.teamdb_col_config_ = {
                frozenColumnCount: 0,
                columns:[]
            };
        }
        
        let colcfg = {
            name: coldesc.name,
            width: -1,
            hidden: false
        } ;
        this.info_.teamdb_col_config_?.columns.push(colcfg) ;
    }

    private teamColumnRemoved(coldesc: IPCColumnDesc) {
        this.logger_.silly('removed column \'' + coldesc.name + '\' from the team database') ;
        let i = this.info_.teamdb_col_config_?.columns.findIndex((one) => one.name === coldesc.name) ;
        if (i !== undefined && i >= 0) {
            this.info_.teamdb_col_config_?.columns.splice(i, 1) ;
        }
    }

    private matchColumnAdded(coldesc: IPCColumnDesc) {
        this.logger_.silly('added new ColumnDesc \'' + coldesc.name + '\' to match database') ;

        if (!this.info_.matchdb_col_config_) {
            this.info_.matchdb_col_config_ = {
                frozenColumnCount: 0,
                columns:[]
            };
        }

        let colcfg = {
            name: coldesc.name,
            width: -1,
            hidden: false
        } ;
        this.info_.matchdb_col_config_?.columns.push(colcfg) ;
    }    

    private matchColumnRemoved(coldesc: IPCColumnDesc) {
        this.logger_.silly('removed column \'' + coldesc.name + '\' from the match database') ;

        let i = this.info_.matchdb_col_config_?.columns.findIndex((one) => one.name === coldesc.name) ;
        if (i !== undefined && i >= 0) {
            this.info_.matchdb_col_config_?.columns.splice(i, 1) ;
        }
    }
    
    private evalFormula(m: IPCMatchSet, name: string, team: number) : Promise<IPCTypedDataValue> {
        let ret = new Promise<IPCTypedDataValue>(async (resolve, reject) => {
            let formula = this.formula_mgr_.findFormula(name) ;
            if (!formula) {
                resolve(
                    {
                        type: 'error',
                        value: 'formula ' + name + ' not found'
                    }) ;
                return ;
            }
            else if (formula.hasError()) {
                // The formula has an error, return it
                resolve(
                    {
                        type: 'error',
                        value: formula.getError()!
                    }) ;
                return ;
            }
            else {
                let vars: string[] = formula.variables() ;
                let varvalues: Map<string, IPCTypedDataValue> = new Map() ;
                for(let varname of vars) {
                    let v = await this.getData(m, varname, team) ;
                    if(v.type === 'error') {
                        resolve(v) ;
                        return ;
                    }
                    varvalues.set(varname, v) ;
                }

                let result = formula.evaluate(varvalues) ;
                resolve(result) ;
            }
        }) ;
    
        return ret ;
    }

    private filterMatchData(m: IPCMatchSet, data: any[]) : any[] {
        let start = 0 ;
        let end = data.length - 1 ;
        let newdata : any[] = [] ;

        if (m.kind == 'first') {
            // 
            // We want the first N entries
            //
            start = 0 ;
            if (m.last - 1 < end) {
                end = m.last - 1 ;
            }
        }
        else if (m.kind == 'last') {
            //
            // We want the last N entries
            //
            end = data.length - 1 ;
            start = data.length - m.first ;
            if (start < 0) {
                start = 0 ;
            }
        }
        else if (m.kind == 'all') {
            start = 0 ;
            end = data.length - 1 ;
        }
        else if (m.kind == 'range') {
            //
            // We want the entries between the two values
            //
            start = m.first ;
            end = m.last ;
            if (start < 0) {
                start = 0 ;
            }
            if (end > data.length - 1) {
                end = data.length - 1 ;
            }
        }

        for(let i = start ; i <= end ; i++) {
            newdata.push(data[i]) ;
        }

        return newdata ;
    }

    private sortData(data: any[]) : any[] {
        data = data.sort((a, b) => {
            let am = DataManager.matchLevels.indexOf(a.comp_level) ;
            let bm = DataManager.matchLevels.indexOf(b.comp_level) ;
            if (am < bm) {
                return -1 ;
            }
            else if (am > bm) {
                return 1 ;
            }
            else {
                if (a.set_number < b.set_number) {
                    return -1 ;
                }
                else if (a.set_number > b.set_number) {
                    return 1 ;
                }
                else {
                    if (a.match_number < b.match_number) {
                        return -1 ;
                    }
                    else if (a.match_number > b.match_number) {
                        return 1 ;
                    }
                    else {
                        return 0 ;
                    }
                }
            }
        }) ;
        
        return data ;
    }

    public setTeamFormatFormulas(f: IPCCheckDBViewFormula[]) {
        this.info_.team_formulas_ = f ;
        this.write() ;
    }

    public setMatchFormatFormulas(f: IPCCheckDBViewFormula[]) {
        this.info_.match_formulas_ = f ;
        this.write() ;
    }
}
