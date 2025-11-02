//
// A scouting project
//

// #region imports
import * as fs from 'fs' ;
import * as path from 'path' ;

import * as uuid from 'uuid' ;
import * as winston from 'winston' ;

import { BlueAlliance } from '../extnet/ba';
import { BAEvent } from '../extnet/badata';
import { StatBotics } from '../extnet/statbotics';
import { DataGenerator } from './datagen';
import { ProjectInfo } from './projectinfo';
import { PicklistMgr } from './picklistmgr';
import { TeamManager } from './teammgr';
import { DataManager } from './datamgr';
import { DataSetManager } from './datasetmgr';
import { FormulaManager } from './formulamgr';
import { FormManager } from './formmgr';
import { TabletData, TabletManager } from './tabletmgr';
import { ManualMatchData, MatchManager } from './matchmgr';
import { GraphManager } from './graphmgr';
import { IPCAppType, IPCHint, IPCScoutResults } from '../../shared/ipc';
import { RulesEngine } from '../../shared/rulesengine';
import { PlayoffManager } from './playoffmgr';
import { SCBase } from '../apps/scbase';

export class Project {
    private static readonly keepLotsOfBackups = true ;
    private static readonly event_file_name : string  = "event.json" ;

    private location_ : string ;
    private info_? : ProjectInfo ;
    private hint_db_? : IPCHint[] ;

    private logger_ : winston.Logger ;

    public team_mgr_? : TeamManager ;
    public data_mgr_? : DataManager ;
    public dataset_mgr_? : DataSetManager ;
    public formula_mgr_? : FormulaManager ;
    public picklist_mgr_? : PicklistMgr ;
    public form_mgr_?: FormManager ;
    public tablet_mgr_? : TabletManager ;
    public match_mgr_? : MatchManager ;
    public graph_mgr_? : GraphManager ;
    public playoff_mgr_? : PlayoffManager ;

    constructor(logger: winston.Logger, dir: string, year: number) {
        this.location_ = dir ;
        this.logger_ = logger ;
    }

    public isInitialized() : boolean {
        if (this.info_) {
            return true ;        
        }
        return false ;
    }

    public init(info: ProjectInfo, apptype: IPCAppType) {
        this.info_ = info ;
        this.team_mgr_ = new TeamManager(this.logger_, this.writeEventFile.bind(this), this.info_.team_info_) ;
        this.match_mgr_ = new MatchManager(this.logger_, this.writeEventFile.bind(this), this.info_.match_info_) ;
        this.formula_mgr_ = new FormulaManager(this.logger_, this.writeEventFile.bind(this), this.info_.formula_info_, apptype) ;
        this.data_mgr_ = new DataManager(this.logger_, this.writeEventFile.bind(this), this.location_, this.info_.data_info_, this.info_.team_db_info_, this.info_.match_db_info_, this.formula_mgr_) ;
        this.form_mgr_ = new FormManager(this.logger_, this.writeEventFile.bind(this), this.info_.form_info_, this.location_, this.data_mgr_) ;
        this.dataset_mgr_ = new DataSetManager(this.logger_, this.writeEventFile.bind(this), this.info_.dataset_info_, this.team_mgr_) ;
        this.picklist_mgr_ = new PicklistMgr(this.logger_, this.writeEventFile.bind(this), this.info_.picklist_info_, this.team_mgr_, this.dataset_mgr_, this.data_mgr_, this.formula_mgr_) ;
        this.tablet_mgr_ = new TabletManager(this.logger_, this.writeEventFile.bind(this), this.info_.tablet_info_, this.team_mgr_, this.match_mgr_) ;
        this.graph_mgr_ =  new GraphManager(this.logger_, this.writeEventFile.bind(this), this.info_.graph_info_, this.data_mgr_, this.dataset_mgr_) ;
        this.playoff_mgr_ = new PlayoffManager(this.logger_, this.writeEventFile.bind(this), this.info_.playoff_info_, this.match_mgr_) ;

        this.writeEventFile() ;
        this.logger_.info('Project initialized in directory \'' + this.location_ + '\'') ;
    }

    public closeEvent() {
        this.writeEventFile() ;
        this.info_ = undefined ;
    }

    public get isLocked() : boolean {
        if (this.info_) {
            return this.info_.locked_ ;
        }

        return false ;
    }

    public get info() : ProjectInfo | undefined {
        return this.info_ ;
    }

    public get location() : string {
        return this.location_ ;
    }

    public setHintHidden(hint: string) {
        if (this.info_) {
            if (this.info_.hidden_hints_.indexOf(hint) === -1) {
                this.info_.hidden_hints_.push(hint) ;
                this.writeEventFile() ;
            }

            if (this.hint_db_) {
                for(let hintdb of this.hint_db_) {
                    if (hintdb.id === hint) {
                        hintdb.hidden = true ;
                    }
                }
            }
        }
    }

    public getHintDb(contentdir: string) : any {
        if (!this.hint_db_) {
            let hintfile = path.join(contentdir, 'json', 'hintdb.json') ;
            if (fs.existsSync(hintfile)) {
                try {
                    const rawData = fs.readFileSync(hintfile, 'utf-8');
                    this.hint_db_ = JSON.parse(rawData) as IPCHint[] ;

                    for(let hint of this.hint_db_) {
                        if (this.info_ && this.info_.hidden_hints_.indexOf(hint.id) !== -1) {
                            hint.hidden = true ;
                        }
                        else {
                            hint.hidden = false ;
                        }
                    }
                }
                catch(err) {
                    this.logger_.error('Error reading hint database', err) ;
                    this.hint_db_ = [] ;
                }
            }
        }

        return this.hint_db_ ;
    }

    public async generateRandomData() : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            if (this.team_mgr_ && this.match_mgr_ && this.form_mgr_ && this.form_mgr_.hasForms()) {
                if (this.team_mgr_.hasTeams()) {
                    let teams = this.team_mgr_.getTeams().map((v)=> { return 'st-' + v.team_number}) ;

                    let gendata: DataGenerator = new DataGenerator(this.form_mgr_.getTeamFormFullPath()!) ;
                    let results : IPCScoutResults | null = gendata.generateData(teams) ;
                    if (results) {
                        results.purpose = "team" ;
                        try {
                            await this.data_mgr_!.processResults(results) ;
                        }
                        catch(err) {
                            reject(err) ;
                        }
                    }
                }

                if (this.match_mgr_.hasMatches()) {
                    let matches:string[] = [] ;
                    for(let match of this.match_mgr_.getMatches()) {
                        for(let i = 0 ; i < 3 ; i++) {
                            let blue = 'sm-'+ match.comp_level + '-' + match.set_number + '-' + 
                                    match.match_number + '-' + SCBase.keyToTeamNumber(match.alliances.blue.team_keys[i]) ;
                            matches.push(blue) ;
                            let red = 'sm-'+match.comp_level + '-' + match.set_number + '-' + 
                                    match.match_number + '-' + SCBase.keyToTeamNumber(match.alliances.red.team_keys[i]) ;
                            matches.push(red) ;
                        }
                    }

                    let gendata: DataGenerator = new DataGenerator(this.form_mgr_.getMatchFormFullPath()!) ;
                    let results : IPCScoutResults | null  = gendata.generateData(matches) ;
                    if (results) {
                        results.purpose = "match" ;
                        try {
                            await this.data_mgr_!.processResults(results) ;
                            resolve() ;
                        }
                        catch(err) {
                            reject(err) ;
                        }
                    }
                }
            }
        }) ;
        return ret ;
    }

    public async lockEvent() : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            if (!this.info_) {
                reject(new Error('event is not initialized, cannot lock event')) ;
            }
            else {
                //
                // Check that all the managers are initialized and have the required data
                //
                if (!this.team_mgr_ || !this.team_mgr_.hasTeams()) {
                    reject(new Error('event is not ready to be locked, missing teams')) ;
                }

                if (!this.match_mgr_) {
                    reject(new Error('event is not ready to be locked, missing matches')) ;
                }

                if (!this.form_mgr_ || !this.form_mgr_.hasForms()) {
                    reject(new Error('event is not ready to be locked, missing forms')) ;
                }

                if (!this.tablet_mgr_ || !this.tablet_mgr_.areTabletsValid()) {
                    reject(new Error('event is not ready to be locked, missing tablets')) ;
                }

                //
                // Check for duplicate tags in the form definitions
                //
                let errors = this.form_mgr_!.checkFormsValid() ;
                if (errors.length > 0) {
                    let msg = 'Errors were found in the form definitions:' ;
                    for (let err of errors) {
                        msg += '<br>' + err ;
                    }
                    msg += '<br><br>Please correct the form definitions and try again' ;
                    reject(new Error(msg)) ;
                    return ;
                }

                //
                // Initialize the data manager, which creates or opens the databases
                //
                try {
                    await this.data_mgr_!.init() ;
                }
                catch(err) {
                    reject(err) ;
                    return ;
                }

                try {
                    //
                    // Process the team data
                    //
                    await this.data_mgr_!.processTeamBAData(this.team_mgr_!.getTeams()) ;
                }
                catch(err) {
                    this.data_mgr_!.removeDatabases() ;
                    reject(err) ;
                    return ;
                }

                if (this.match_mgr_ && this.match_mgr_.hasMatches()) {
                    //
                    // Process the match data if it exists, this is not required and can be added
                    // later
                    //
                    try {
                        await this.data_mgr_!.processMatchBAData(this.match_mgr_.getMatches(), false) ;
                    }
                    catch(err) {
                        this.data_mgr_!.removeDatabases() ;
                        reject(err) ;
                        return ;
                    }
                }

                if (!this.tablet_mgr_!.generateTabletSchedule()) {
                    this.data_mgr_!.removeDatabases() ;                    
                    reject(new Error('could not generate tablet schedule for scouting')) ;
                }

                this.form_mgr_!.populateDBWithForms()
                    .then(()=> {
                        this.info_!.locked_ = true ;
                        this.info_!.uuid_ = uuid.v4() ;
                        this.writeEventFile() ;
                        resolve() ;
                    })
                    .catch((err) => {
                        this.data_mgr_!.removeDatabases() ;
                        this.tablet_mgr_!.clearScoutingSchedules() ;
                        reject(err) ;
                    }) ;
            }
        }) ;

        return ret;
    }

    public setTeamForm(form: string) : Error | undefined {
        return this.form_mgr_!.setTeamForm(form) ;
    }

    public setMatchForm(form: string) : Error | undefined {
        return this.form_mgr_!.setMatchForm(form) ;
    }

    public static async createEvent(logger: winston.Logger, dir: string, year: number, apptype: IPCAppType) : Promise<Project> {
        let ret: Promise<Project> = new Promise<Project>((resolve, reject) => {
            logger.info('Creating event in directory \'' + dir + '\'') ;

            if (!fs.existsSync(dir)) {
                logger.info('    directory does not exist, creating directory \'' + dir + '\'') ;
                //
                // Does not exist, create it
                //
                fs.mkdirSync(dir) ;
                if (!fs.existsSync(dir)) {
                    let err : Error = new Error("could not create directory '" + dir + "' for new event") ;
                    logger.error('    directory does not exist, create directory failed', err) ;
                    reject(err) ;
                }
            } else if (!Project.isDirectoryEmpty(dir)) {
                //
                // The directory exists, it must be empty
                //
                let err : Error = new Error("directory '" + dir + "' is not empty, cannot use a new event directory") ;
                logger.error('    directory is not empty, location \'' + dir + '\'') ;
                reject(err) ;
            }

            let proj: Project = new Project(logger, dir, year) ;
            proj.init(new ProjectInfo(), apptype) ;
            resolve(proj) ;
        }) ;

        return ret ;
    }

    public static async openEvent(logger: winston.Logger, filepath: string, year: number, apptype: IPCAppType) : Promise<Project> {
        let ret: Promise<Project> = new Promise<Project>((resolve, reject) => {

            logger.info('Open event, location \'' + filepath + '\'') ;

            let loc: string = path.dirname(filepath) ;
            let file: string = path.basename(filepath) ;

            if (file !== Project.event_file_name) {
                let err = new Error("the file selected was not an event file, name should be '" + Project.event_file_name + "'") ;
                logger.error(err) ;
                reject(err) ;
                return ;
            }

            if (!fs.existsSync(filepath)) {
                let err = new Error('the file selected \'' + filepath + '\'does not exist') ;
                logger.error(err) ;
                reject(err) ;
                return ;
            }

            let proj: Project = new Project(logger, loc, year) ;
            let info = Project.readEventFile(logger, loc) ;
            if (info instanceof Error) {
                reject(info as Error) ;
            }
            proj.init(info as ProjectInfo, apptype) ;

            if (proj.isLocked) {
                //
                // The project is locked, we need to initialize the databases
                //
                proj.data_mgr_!.init()
                    .then(() => {
                        resolve(proj) ;
                    })
                    .catch((err) => {
                        logger.error('Error initializing project', err) ;
                        reject(err) ;
                    }) ;
            } else {
                resolve(proj) ;
            }

        }) ;

        return ret ;
    }

    public setEventName(name: string) {
        if (this.info_) {
            this.info_.name_ = name ;
            this.writeEventFile() ;
        }
        else {
            this.logger_.error('event name cannot be set, event is not initialized') ;
        }
    }

    //
    // This is called from the renderer for events that are not created using
    // Blue Alliance.  The data from the UI side of the application is sent to this
    // method to initialize the the match list.
    //
    public async setMatchData(data: ManualMatchData[]) {
        this.match_mgr_!.setMatchData(data) ;
    }

    public setTabletData(data:TabletData[]) {
        this.tablet_mgr_!.setTabletData(data) ;
    }


    private static readEventFile(logger: winston.Logger, dir: string) : Error | ProjectInfo {
        let ret : Error | ProjectInfo = new ProjectInfo() ;

        let projfile = path.join(dir, Project.event_file_name) ;
        logger.info('Reading project file \'' + projfile + '\'') ;

        if (!fs.existsSync(projfile)) {
            ret = new Error("the directory '" + dir + "' is not a valid event project, missing file '" + Project.event_file_name + "'") ;
        }
        else {
            try {
                const rawData = fs.readFileSync(projfile, 'utf-8');
                ret = JSON.parse(rawData) as ProjectInfo ;

                if (ret.hidden_hints_ === undefined) {
                    ret.hidden_hints_ = [] ;
                }
            }
            catch(err) {
                ret = err as Error ;
            }
        }
        
        return ret ;
    }

    private serial_ : number = 0 ;

    public writeEventFile() : Error | undefined {
        let ret: Error | undefined = undefined ;
        let errst = false ;

        let projfile = path.join(this.location_, Project.event_file_name) ;        
        this.logger_.info('Writing project file [' + this.serial_++ + '] ' + projfile) ;

        if (fs.existsSync(projfile) && Project.keepLotsOfBackups) {
            this.logger_.debug('Performing backup file sequence ....');
            let i = 10 ;
            let fullname = path.join(this.location_, 'event-' + i + '.json') ;
            if (fs.existsSync(fullname)) {
                this.logger_.debug('    removing file \'' + fullname + '\'') ;
                try {
                    fs.rmSync(fullname) ;
                }
                catch(err) {
                    this.logger_.error('    error removing file \'' + fullname + '\'', err) ;
                    errst = true ;
                }
            }
            i-- ;

            if (!errst) {
                while (i > 0) {
                    fullname = path.join(this.location_, 'event-' + i + '.json') ;
                    let newname = path.join(this.location_, 'event-' + ( i + 1) + '.json') ;
                    if (fs.existsSync(fullname)) {
                        try {
                            this.logger_.debug('    renaming file \'' + fullname + '\' -> \'' + newname + '\'') ;
                            fs.renameSync(fullname, newname) ;
                        }
                        catch(err) {
                            this.logger_.error('    error renaming file \'' + fullname + '\' -> \'' + newname + '\'') ;
                        }
                    }
                    i-- ;
                }

                try {
                    fullname = path.join(this.location_, 'event-1.json') ;
                    this.logger_.debug('    renaming file \'' + projfile + '\' -> \'' + fullname + '\'') ;
                    fs.renameSync(projfile, fullname) ;
                }
                catch(err) {
                    this.logger_.error('    error renaming file \'' + projfile + '\' -> \'' + fullname + '\'') ;
                }
            }
            else {
                this.logger_.warning('could not execute rolling backup strategy due to an error')
            }
        }

        const jsonString = JSON.stringify(this.info_, null, 2);
        try {
            this.logger_.debug('    writing project data to file \'' + projfile + '\'') ;
            fs.writeFileSync(projfile, jsonString) ;
        }
        catch(err) {
            ret = err as Error ;
        }
        
        this.logger_.info('    Finished project file [' + (this.serial_- 1) + '] ' + projfile) ;
        return ret;
    } 

    private static isDirectoryEmpty(path: string) : boolean {
        let ret: boolean = true ;

        try {
            const files = fs.readdirSync(path);
            ret = (files.length === 0) ;
        } catch (err) {
            ret = false ;
        }

        return ret;
    }

    public async loadMatchData(key: string, ba: BlueAlliance, results: boolean, callback?: (result: string) => void) : Promise<void> {
        let ret: Promise<void> = new Promise<void>(async (resolve, reject) => {
            try {
                let type = results ? 'match results' : 'match schedule' ;
                if (callback) {
                    callback('Requesting ' + type + ' from \'The Blue Alliance\' ... ') ;
                }
                let matches = await ba.getMatches(key);
                if (callback) {
                    callback('received ' + matches.length + ' matches<br>') ;
                }

                if (matches.length === 0) {
                    if (callback) {
                        callback('No matches received, try again later<br>') ;
                    }
                }
                else {
                    this.match_mgr_!.setBAMatchData(matches) ;
                    this.tablet_mgr_!.incrementallyGenerateMatchSchedule() ;
                    
                    if (results) {
                        if (callback) {
                            callback('Inserting ' + type + ' into database ... ');
                        }
                        await this.data_mgr_!.processMatchBAData(matches, results) ;
                        if (callback) {
                            callback('inserted ' + matches.length + ' matches<br>') ;
                        }
                    }
                }
                resolve() ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;

        return ret ;
    }

    public loadOprDprData(key: string, ba: BlueAlliance, callback?: (result: string) => void) : Promise<void> {
        let ret: Promise<void> = new Promise<void>(async (resolve, reject) => {
            try {
                if (callback) {
                    callback('Requesting OPR/DPR/CCWMS data from \'The Blue Alliance\' ... ') ;
                }
                let opr = await ba.getOPR(key) ;

                if (Object.keys(opr.oprs).length === 0) {
                    if (callback) {
                        callback('No data received, try again later<br>') ;
                    }
                }
                else {
                    if (callback) {
                        callback(' received data.<br>') ;
                        callback('Inserting data into database ... ');
                    }
                    await this.data_mgr_!.processOPRData(opr) ;
                    if (callback) {
                        callback('done.<br>') ;
                    }
                }
                resolve() ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;

        return ret ;
    }

    public loadRankingData(key: string, ba: BlueAlliance, callback?: (result: string) => void) : Promise<void> {
        let ret: Promise<void> = new Promise<void>(async (resolve, reject) => {
            try {
                if (callback) {
                    callback('Requesting ranking data from \'The Blue Alliance\' ... ') ;
                }
                let rankings = await ba.getRankings(key) ;

                if (rankings.rankings.length === 0) {
                    if (callback) {
                        callback('No rankings data received, try again later<br>') ;
                    }
                }
                else {
                    if (callback) {
                        callback('received data.<br>') ;
                        callback('Inserting data into database ... ');
                    }
                    await 
                    await this.data_mgr_!.processRankings(rankings.rankings) ;
                    if (callback) {
                        callback('done.<br>') ;
                    }
                }
                resolve() ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;

        return ret ;
    }

    public loadStatboticsEventData(key: string, sb: StatBotics, callback?: (result: string) => void) : Promise<void> {
        let ret: Promise<void> = new Promise<void>(async (resolve, reject) => {
            try {
                if (callback) {
                    callback('Requesting EPA data for the event from \'Statbotics\' ... ') ;
                }
                let stats = await sb.getStatsEvent(key, this.team_mgr_!.getSortedTeamNumbers(false)) ;

                if (callback) {
                    callback('received stats data.<br>') ;
                    callback('Inserting data into team database ... ')
                }

                await this.data_mgr_!.processStatboticsEventData(stats) ;
                if (callback) {
                    callback('data inserted.<br>') ;
                }

                resolve() ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;

        return ret ;
    }
    
    public loadStatboticsYearData(sb: StatBotics, callback?: (result: string) => void) : Promise<void> {
        let ret: Promise<void> = new Promise<void>(async (resolve, reject) => {
            try {
                if (callback) {
                    callback('Requesting EPA data for the year from \'Statbotics\' ... ') ;
                }
                let stats = await sb.getStatsYear(this.team_mgr_!.getSortedTeamNumbers(false)) ;

                if (callback) {
                    callback('received stats data.<br>') ;
                    callback('Inserting data into team database ... ')
                }
                await this.data_mgr_?.processStatboticsYearToDateData(stats) ;
                
                if (callback) {
                    callback('data inserted.<br>') ;
                }

                resolve() ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;

        return ret ;
    }

    private loadTeams(key: string, ba: BlueAlliance, callback?: (result: string) => void) : Promise<void> {
        let ret: Promise<void> = new Promise<void>(async (resolve, reject) => {
            try {
                if (callback) {
                    callback('Requesting teams from \'The Blue Alliance\' ... ') ;
                }
                let teams = await ba.getTeams(key) ;

                if (callback) {
                    callback('received ' + teams.length + ' teams.<br>') ;
                }

                if (teams.length === 0) {
                    if (callback) {
                        callback('No teams data received, try again later<br>') ;
                    }
                }
                else {
                    this.team_mgr_!.setBATeamData(teams) ;
                }
                resolve() ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;

        return ret ;        
    }

    public loadBAEvent(ba: BlueAlliance, sb: StatBotics, frcev: BAEvent, callback?: (result: string) => void) : Promise<void> {
        let ret: Promise<void> = new Promise<void>(async (resolve, reject) => {
            if (!this.info_) {
                reject(new Error('event is not initialized, cannot load event data')) ;
                return ;
            }

            this.info_.frcev_ = frcev ;
            try {
                await this.loadTeams(frcev.key, ba, callback) ;
                if (this.team_mgr_!.hasTeams()) {
                    await this.loadMatchData(frcev.key, ba, false, callback) ;
                }
                this.writeEventFile() ;
                if (callback) {
                    callback('Event data file saved.<br>');
                    callback('Event loaded sucessfully.<br>');
                }

                resolve() ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;

        return ret;
    }

    private loadAllianceData(key: string, ba: BlueAlliance, callback?: (result: string) => void) : Promise<void> {
        let ret: Promise<void> = new Promise<void>(async (resolve, reject) => {
            try {
                if (callback) {
                    callback('Requesting alliance data from \'The Blue Alliance\' ... ') ;
                }
                let alliances = await ba.getAlliances(key) ;

                if (Object.keys(alliances).length === 0) {
                    if (callback) {
                        callback('No alliance data received, try again later<br>') ;
                    }
                }
                else {
                    if (callback) {
                        callback('received alliance data.<br>') ;
                        callback('Inserting data into playoff manager ... ');
                    }
                    this.playoff_mgr_!.processAllianceData(alliances) ;
                    if (callback) {
                        callback('done.<br>') ;
                    }
                }
                resolve() ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;

        return ret ;
    }

    public loadExternalBAData(ba: BlueAlliance, frcev: BAEvent, callback?: (result: string) => void) : Promise<number> {
        let ret: Promise<number> = new Promise<number>(async (resolve, reject) => {
            try {
                await this.loadMatchData(frcev.key, ba, this.isLocked, callback) ;
                await this.loadOprDprData(frcev.key, ba, callback) ;
                await this.loadRankingData(frcev.key, ba, callback) ;
                await this.loadAllianceData(frcev.key, ba, callback) ;
                resolve(0) ;
            } 
            catch(err) {
                reject(err) ;
            }
        }) ;
        
        return ret;
    }

    public loadExternalSTData(sb: StatBotics, frcev: BAEvent, callback?: (result: string) => void) : Promise<number> {
        let ret: Promise<number> = new Promise<number>(async (resolve, reject) => {
            try {
                await this.loadStatboticsEventData(frcev.key, sb, callback) ;
                await this.loadStatboticsYearData(sb, callback) ;
                resolve(0) ;
            } 
            catch(err) {
                reject(err) ;
            }
        }) ;
        
        return ret;
    }    
}
