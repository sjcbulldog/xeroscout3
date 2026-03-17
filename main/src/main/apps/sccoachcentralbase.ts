import { BrowserWindow, dialog } from "electron";
import { SCBase } from "./scbase";
import { IPCAppType, IPCAutoAnalysisConfig, IPCAutoAnalysisPayload, IPCAutoAnalysisRequest, IPCDatabaseData, IPCFormScoutData, IPCGetTeamsOptions, IPCGraphConfig, IPCMatchInfo, IPCMatchPredictorData, IPCMatchPredictorRequest, IPCMatchPredictorTeam, IPCPickListConfig, IPCPickListData, IPCPredictConfig, IPCProjColumnsConfig } from "../../shared/ipc";
import { Project } from "../project/project";
import { BAMatch, BATeam } from "../extnet/badata";
import { DataRecord } from "../model/datarecord";
import { generateAutoAnalysisData } from "../project/autoanalysis";
import * as path from "path";

export abstract class SCCoachCentralBaseApp extends SCBase {
    private project_?: Project = undefined;
    private color_ : string ;
    private reversed_ : boolean ;    

    constructor(win: BrowserWindow, type: IPCAppType) {
        super(win, type) ;
		this.color_ = 'blue' ;
		this.reversed_ = false ;        
    }

    protected get project() : Project | undefined {
        return this.project_ ;
    }

    protected set project(proj: Project | undefined) {
        this.project_ = proj ;
        let isCentral = false ;
        try {
            isCentral = this.applicationType === 'central' ;
        }
        catch {
            isCentral = false ;
        }

        if (isCentral && proj) {
            this.image_mgr_.setExtraImageDirs([path.join(proj.location, 'robot-photos')]) ;
        }
        else {
            this.image_mgr_.setExtraImageDirs([]) ;
        }
    }

    protected get color() : string {
        return this.color_ ;
    }

    protected set color(col: string) {
        this.color_ = col ;
    }

    protected get reversed() : boolean {
        return this.reversed_ ;
    }

    protected set reversed(rev: boolean) {
        this.reversed_ = rev ;
    }

	public getTeamList(opt: IPCGetTeamsOptions) {
		if (opt.nicknames) {
			let ret = this.project_?.team_mgr_?.getTeamsNickNameAndNumber(opt.rank || false) ;
			this.sendToRenderer('send-team-list', ret) ;
		}
		else {
			let ret: number[] = this.project_?.team_mgr_?.getSortedTeamNumbers(opt.rank || false)! ;
			this.sendToRenderer('send-team-list', ret) ;
		}
	}  
    
    public getMatchList() {
        let data = [] ;

        for(let match of this.project_!.match_mgr_!.getMatches()) {
            let one = {
                comp_level: match.comp_level,
                set_number: match.set_number,
                match_number: match.match_number,
                red: this.getTeamNumbersFromKeys(match.alliances.red.team_keys),
                blue: this.getTeamNumbersFromKeys(match.alliances.blue.team_keys),
            }

            data.push(one) ;
        }
        
        data.sort((a, b) => { return this.sortCompFun(a, b) ;}) ;

        this.sendToRenderer('send-match-list', data) ;
    }

    public sendPicklistConfigs() {
        this.sendToRenderer('send-picklist-configs', this.project_?.picklist_mgr_?.allPicklists) ;
    }    

    public async sendAutoAnalysisData(request?: IPCAutoAnalysisRequest) {
        let payload : IPCAutoAnalysisPayload = {
            teams: [],
            autosByTeam: {},
            matchesByTeam: {},
            plannerTags: [],
            selectorTags: [],
            metricOptions: [],
            selectedMetrics: [],
            averageFormulaOptions: [],
            selectedAverageFormula: '',
        } ;

        if (this.project_ && this.project_.isInitialized()) {
            payload = await generateAutoAnalysisData(this.project_, request) ;
        }

        this.sendToRenderer('send-auto-analysis-data', payload) ;
    }

    public getAutoAnalysisConfigs() {
        const configs = (this.project_?.graph_mgr_?.autoAnalysisConfigs || [])
            .filter((cfg) => cfg.owner === this.applicationType) ;
        this.sendToRenderer('send-auto-analysis-configs', configs) ;
    }

    public updateAutoAnalysisConfigs(configs: IPCAutoAnalysisConfig[]) {
        if (this.project && this.project.isInitialized()) {
            const others = (this.project!.graph_mgr_!.autoAnalysisConfigs || [])
                .filter((cfg) => cfg.owner !== this.applicationType) ;
            const owned = configs.map((cfg) => ({
                ...cfg,
                owner: this.applicationType,
                selectedMetrics: [...cfg.selectedMetrics],
            })) ;
            this.project!.graph_mgr_!.autoAnalysisConfigs = [...others, ...owned] ;
        }
    }

	public savePicklistConfig(config: IPCPickListConfig[]) {
        this.project!.picklist_mgr_!.coachesPicklists = config.filter(c => c.owner === 'coach') ;
		this.project!.picklist_mgr_!.centralPicklists = config.filter(c => c.owner === 'central') ;
	}

	public sendPicklistData(name: string) {
		this.project_?.picklist_mgr_!.getPicklistData(name)
		.then((data: IPCPickListData) => {
			this.sendToRenderer('send-picklist-data', data) ;
		})
		.catch((err) => {
			let errobj: Error = err as Error ;
			dialog.showMessageBox(this.win_, {
				title: "Picklist Data Error",
				message: `Error getting picklist data - ${errobj.message}`
			});
		});
	}    

    public async getSingleTeamData(ds: string, team: number) {
        interface MyObject {
            [key: string]: any; // Allows any property with a string key
        }
        let retdata : MyObject = {} ;

        if (this.project_ && this.project_.isInitialized()) {
            retdata.matches = this.project_.match_mgr_!.getMatchResults(+team) ;
            retdata.teamdata = await this.project_.dataset_mgr_!.getDataSetData(ds) ;
            retdata.videoicon = this.getIconData('video.png') ;
        }

        this.sendToRenderer('send-single-team-data', retdata) ;
    }

    public async getSingleTeamConfigs() {
        this.migrateLegacyMatchSimConfigs() ;

        const configs = this.project_?.graph_mgr_?.allConfigs.filter((cfg) => !this.isMatchSimConfig(cfg)) || [] ;
        this.sendToRenderer('send-single-team-configs', configs);
    }    

	public async updateSingleTeamConfigs(configs: IPCGraphConfig[]) {
		if (this.project && this.project.isInitialized()) {
            this.project!.graph_mgr_!.coachConfigs = configs.filter(c => c.owner === 'coach') ;
            this.project!.graph_mgr_!.singleTeamConfigs = configs.filter(c => c.owner === 'central') ;
        }
	}    

    public async getMatchSimConfigs() {
        this.migrateLegacyMatchSimConfigs() ;
        this.sendToRenderer('send-matchsim-configs', this.project_?.graph_mgr_?.matchSimConfigs || []);
    }

	public async updateMatchSimConfigs(configs: IPCPredictConfig[]) {
		if (this.project && this.project.isInitialized()) {
            this.project!.graph_mgr_!.matchSimConfigs = configs ;
        }
	}


	public sendPlayoffStatus() {
		if (this.project_ && this.project_.isInitialized()) {
			this.sendToRenderer('send-playoff-status', this.project_!.playoff_mgr_!.info) ;
		}
	}

	public setAllianceTeams(alliance: number, teams: number[]) {
		if (this.project_ && this.project_.isInitialized()) {
			this.project_!.playoff_mgr_!.setAllianceTeams(alliance, teams) ;
			this.sendPlayoffStatus() ;
		}
	}

	public setPlayoffMatchOutcome(match: number, winner: number, loser: number) {
		if (this.project_ && this.project_.isInitialized()) {
			this.project_!.playoff_mgr_!.setPlayoffMatchOutcome(match, winner, loser) ;
			this.sendPlayoffStatus() ;
		}
	}

	public sendMatchFormatFormulas() {
		if (this.project_ && this.project_.isInitialized()) {
			this.sendToRenderer('send-match-format-formulas', this.project_.info!.data_info_.match_formulas_) ;			
		}
	}

	public sendTeamFormatFormulas() {
		if (this.project_ && this.project_.isInitialized()) {
			this.sendToRenderer('send-team-format-formulas', this.project_.info!.data_info_.team_formulas_) ;			
		}
	}	
	
	public getGraphData(cfg: IPCGraphConfig) {
		if (cfg) {
			this.project_?.graph_mgr_?.generateGraphData(cfg)
				.then((data) => {
					this.sendToRenderer('send-chart-data', data) ;
				}) ;
		}
	}    


    public renameFormula(oldname: string, newname: string) : void {
        this.project?.formula_mgr_?.renameFormula(oldname, newname) ;
    }	

    public updateFormula(name: string, desc: string, exprstr: string) : void {
        this.project?.formula_mgr_?.addFormula(name, desc, exprstr) ;
    }	

    public deleteFormula(name: string) : void {
        this.project?.formula_mgr_?.deleteFormula(name) ;
    }    

    public async sendMatchStatus() {
        interface data {
            comp_level: string;
            set_number: number;
            match_number: number;
            played: boolean;
            red1: number;
            redtab1: string;
            redst1: string;
            red2: number;
            redtab2: string;
            redst2: string;
            red3: number;
            redtab3: string;
            redst3: string;
            blue1: number;
            bluetab1: string;
            bluest1: string;
            blue2: number;
            bluetab2: string;
            bluest2: string;
            blue3: number;
            bluetab3: string;
            bluest3: string;
        }

        try {
            let ret: data[] = [];

            if (this.project_ && this.project_.isInitialized() && this.project_.match_mgr_!.hasMatches()) {
                for (let one of this.project_.match_mgr_!.getMatches()) {
                    let r1 = one.alliances.red.team_keys[0];
                    let r2 = one.alliances.red.team_keys[1];
                    let r3 = one.alliances.red.team_keys[2];
                    let b1 = one.alliances.blue.team_keys[0];
                    let b2 = one.alliances.blue.team_keys[1];
                    let b3 = one.alliances.blue.team_keys[2];

                    let obj = {
                        comp_level: one.comp_level,
                        set_number: one.set_number,
                        match_number: one.match_number,
                        played: (one.winning_alliance && one.winning_alliance.length > 0) ? true : false,
                        red1: SCBase.keyToTeamNumber(r1),
                        redtab1: this.project_!.tablet_mgr_!.findTabletForMatch(
                            one.comp_level,
                            one.set_number,
                            one.match_number,
                            SCBase.keyToTeamNumber(r1)
                        ),
                        redst1: this.project_!.data_mgr_!.hasMatchScoutingResult(
                            one.comp_level,
                            one.set_number,
                            one.match_number,
                            SCBase.keyToTeamNumber(r1)
                        ),
                        red2: SCBase.keyToTeamNumber(r2),
                        redtab2: this.project_!.tablet_mgr_!.findTabletForMatch(
                            one.comp_level,
                            one.set_number,
                            one.match_number,
                            SCBase.keyToTeamNumber(r2)
                        ),
                        redst2: this.project_!.data_mgr_!.hasMatchScoutingResult(
                            one.comp_level,
                            one.set_number,
                            one.match_number,
                            SCBase.keyToTeamNumber(r2)
                        ),
                        red3: SCBase.keyToTeamNumber(r3),
                        redtab3: this.project_!.tablet_mgr_!.findTabletForMatch(
                            one.comp_level,
                            one.set_number,
                            one.match_number,
                            SCBase.keyToTeamNumber(r3)
                        ),
                        redst3: this.project_!.data_mgr_!.hasMatchScoutingResult(
                            one.comp_level,
                            one.set_number,
                            one.match_number,
                            SCBase.keyToTeamNumber(r3)
                        ),
                        blue1: SCBase.keyToTeamNumber(b1),
                        bluetab1: this.project_!.tablet_mgr_!.findTabletForMatch(
                            one.comp_level,
                            one.set_number,
                            one.match_number,
                            SCBase.keyToTeamNumber(b1)
                        ),
                        bluest1: this.project_!.data_mgr_!.hasMatchScoutingResult(
                            one.comp_level,
                            one.set_number,
                            one.match_number,
                            SCBase.keyToTeamNumber(b1)
                        ),
                        blue2: SCBase.keyToTeamNumber(b2),
                        bluetab2: this.project_!.tablet_mgr_!.findTabletForMatch(
                            one.comp_level,
                            one.set_number,
                            one.match_number,
                            SCBase.keyToTeamNumber(b2)
                        ),
                        bluest2: this.project_!.data_mgr_!.hasMatchScoutingResult(
                            one.comp_level,
                            one.set_number,
                            one.match_number,
                            SCBase.keyToTeamNumber(b2)
                        ),
                        blue3: SCBase.keyToTeamNumber(b3),
                        bluetab3: this.project_!.tablet_mgr_!.findTabletForMatch(
                            one.comp_level,
                            one.set_number,
                            one.match_number,
                            SCBase.keyToTeamNumber(b3)
                        ),
                        bluest3: this.project_!.data_mgr_!.hasMatchScoutingResult(
                            one.comp_level,
                            one.set_number,
                            one.match_number,
                            SCBase.keyToTeamNumber(b3)
                        ),
                    };
                    ret.push(obj);
                }
                this.sendToRenderer('send-match-status', ret);
            }
        } catch (err) {
            let errobj: Error = err as Error;
            dialog.showErrorBox(
                'Error',
                'Error retreiving match data - ' + errobj.message
            );
        }
    }

    public sendTeamStatus() {
        interface data {
            number: number;
            status: string;
            tablet: string;
            teamname: string;
        }

        let ret: data[] = [];

        if (this.project_ && this.project_.tablet_mgr_!.hasTeamAssignments()) {
            for (let t of this.project_.tablet_mgr_!.getTeamAssignments()) {
                let status: string = this.project_.data_mgr_!.hasTeamScoutingResults(t.team)
                    ? 'Y'
                    : 'N';
                let team: BATeam | undefined = this.project_.team_mgr_!.findTeamByNumber(t.team);
                if (team) {
                    ret.push({
                        number: t.team,
                        status: status,
                        tablet: t.tablet,
                        teamname: team.nickname,
                    });
                }
            }
        }

        this.sendToRenderer('send-team-status', ret);
    }

    public sendInfoData(): void {
        if (this.project_ && this.project_.isInitialized()) {
            let obj = {
                location_: this.project_.location,
                bakey_: this.project_.info!.frcev_?.key,
                name_: this.project_.info!.frcev_
                    ? this.project_.info!.frcev_.name
                    : this.project_.info!.name_,
                teamform_: this.project_.form_mgr_?.getTeamFormFullPath(),
                matchform_: this.project_.form_mgr_?.getMatchFormFullPath(),
                tablets_: this.project_.tablet_mgr_?.getTablets(),
                tablets_valid_: this.project_.tablet_mgr_!.areTabletsValid(),
                teams_: this.project_.team_mgr_!.getTeams(),
                matches_: this.project_.match_mgr_!.getMatches(),
                locked_: this.project_.info?.locked_,
                uuid_: this.project_.info?.uuid_,
                importicon: this.getIconData('import.png'),
                createicon: this.getIconData('create.png'),
                editicon: this.getIconData('edit.png')
            };
            this.sendToRenderer('send-info-data', obj);
        }
    }

    public sendFormulas() : void {
        this.sendToRenderer('send-formulas', this.project?.formula_mgr_?.formulas) ;
    }
    
    public sendTeamFieldList() : void {
        this.sendToRenderer('send-team-field-list', this.project_!.data_mgr_!.teamColumnDescriptors) ;
    }

    public sendMatchFieldList() : void {
        this.sendToRenderer('send-match-field-list', this.project_?.data_mgr_?.matchColumnDescriptors) ;
    }

    public sendDataSets() : void {
        this.sendToRenderer('send-datasets', this.project_?.dataset_mgr_?.getDataSets()) ;
    }    
    
    public setMatchColConfig(data: IPCProjColumnsConfig) {
        this.project_?.data_mgr_?.setMatchColConfig(data);
    }

    public setTeamColConfig(data:IPCProjColumnsConfig) {
        this.project_?.data_mgr_?.setTeamColConfig(data);
    }     

    private normalizeColumnConfig(cols: any[], cfg: IPCProjColumnsConfig | undefined) : IPCProjColumnsConfig {
        let ret : IPCProjColumnsConfig = {
            columns: [],
            frozenColumnCount: Math.max(0, cfg?.frozenColumnCount || 0),
        } ;

        for (let col of cols) {
            let existing = cfg?.columns.find((one) => one.name === col.name) ;
            ret.columns.push({
                name: col.name,
                width: existing?.width ?? -1,
                hidden: existing?.hidden ?? false,
            }) ;
        }

        if (ret.frozenColumnCount > ret.columns.length) {
            ret.frozenColumnCount = ret.columns.length ;
        }

        return ret ;
    }

    public sendMatchDB(): void {
        if (!this.project_ || !this.project_.isInitialized()) {
            this.logger_.warn('send-match-db requested before project initialization completed') ;
            return ;
        }

        let cols = this.project_.data_mgr_?.matchColumnDescriptors || [] ;
        this.project_!.data_mgr_!.getAllMatchData()
            .then((data) => {
                let colcfg = this.normalizeColumnConfig(cols, this.project_!.data_mgr_!.getMatchColConfig()) ;
                let dataobj : IPCDatabaseData = {
                    column_configurations: colcfg,
                    column_definitions: cols,
                    keycols: ['comp_level', 'set_number', 'match_number', 'team_key'],
                    data: this.convertDataForDisplay(data),
                };
                this.logger_.silly(`send-match-db returning ${dataobj.data.length} rows`) ;
                this.sendToRenderer('send-match-db', dataobj);
            })
            .catch((err) => {
                this.logger_.error(
                    'error getting data from database for send-match-db',
                    err
                );					
            });
    }    

    public sendMatchData(): void {
        if (this.project_ && this.project_.isInitialized()) {
            this.sendMatchDataInternal(this.project_.match_mgr_!.getMatches());
        }
    }    

    public sendTeamDB(): void {
        if (!this.project_ || !this.project_.isInitialized()) {
            this.logger_.warn('send-team-db requested before project initialization completed') ;
            return ;
        }

        let cols = this.project_.data_mgr_?.teamColumnDescriptors || [] ;
        this.project_?.data_mgr_!.getAllTeamData()
            .then((data) => {
                let colcfg = this.normalizeColumnConfig(cols, this.project_!.data_mgr_!.getTeamColConfig()) ;
                let dataobj : IPCDatabaseData = {
                    column_configurations: colcfg,
                    column_definitions: cols,
                    keycols: ['team_number'],
                    data: this.convertDataForDisplay(data),
                };
                this.logger_.silly(`send-team-db returning ${dataobj.data.length} rows`) ;
                this.sendToRenderer('send-team-db', dataobj);
            })
            .catch((err) => {
                this.logger_.error(
                    'error getting data from database for send-team-db',
                    err
                );
            });
    }    

    public sendTeamData(): void {
        this.sendToRenderer('send-team-data', this.project_?.team_mgr_!.getTeams());
    }      
    
    public sendForm(arg: string) {
        let ret : IPCFormScoutData = {
        } ;

        let filename: string ;
        let title: string ;
        let good: boolean = true ;

        if (arg === 'team') {
            if (this.project_ && this.project_.isInitialized() && this.project_.form_mgr_!.hasForms()) {
                filename = this.project_.form_mgr_!.getTeamFormFullPath()! ;
                ret.title = 'Team Form' ;
            }
            else {
                good = false ;
                ret.message = 'No team form has been defined yet.' ;
            }
        }
        else if (arg === 'match') {
            if (this.project_ && this.project_.isInitialized() && this.project_.form_mgr_!.hasForms()) {
                filename = this.project_.form_mgr_!.getMatchFormFullPath()! ;
                ret.title = 'Match Form' ;
            }
            else {
                good = false ;
                ret.message = 'No match form has been defined yet.' ;
            }
        }
        else {
            good = false;
            ret.message = 'Internal request for invalid form type' ;
        }

        if (good) {
            let jsonobj = this.project!.form_mgr_!.getForm(arg) ;
            if (jsonobj instanceof Error) {
                let errobj = jsonobj as Error;
                ret.message = errobj.message;
            } else if (!jsonobj) {
                ret.message = `No ${arg} form has been set` ;
            }
            else {
                ret.form = jsonobj ;
                ret.color = this.color_ ;
                ret.reversed = this.reversed_ ;
                this.sendToRenderer('send-form', ret);				
            }
        } else {
            ret.message = `No ${arg} form has been set`;
        }
    }   

    protected doExportData(table: string) {
        if (!this.project_ || !this.project_.isInitialized()) {
            dialog.showErrorBox('Export Data', 'No event has been loaded - cannot export data');
            return;
        }

        var fpath = dialog.showSaveDialog({
            title: 'Select CSV Output File',
            message: 'Select file for CSV output for table "' + table + '"',
            filters: [
                {
                    extensions: ['csv'],
                    name: 'CSV File',
                },
            ],
            properties: ['showOverwriteConfirmation'],
        });

        fpath.then((pathname) => {
            if (!pathname.canceled) {
                this.project_!.data_mgr_!.exportToCSV(pathname.filePath, table);
            }
        });
    }    

    protected sendMatchDataInternal(matches: BAMatch[] | undefined): void {
        let data : IPCMatchInfo[] = [];
        if (matches) {
            for (let t of matches) {
                let d : IPCMatchInfo = {
                    comp_level: t.comp_level,
                    set_number: t.set_number,
                    match_number: t.match_number,
                    red1: SCBase.keyToTeamNumber(t.alliances.red.team_keys[0]),
                    red2: SCBase.keyToTeamNumber(t.alliances.red.team_keys[1]),
                    red3: SCBase.keyToTeamNumber(t.alliances.red.team_keys[2]),
                    blue1: SCBase.keyToTeamNumber(t.alliances.blue.team_keys[0]),
                    blue2: SCBase.keyToTeamNumber(t.alliances.blue.team_keys[1]),
                    blue3: SCBase.keyToTeamNumber(t.alliances.blue.team_keys[2]),
                };
                data.push(d);
            }
        }
        this.sendToRenderer('send-match-data', data, this.project_?.team_mgr_!.getTeams());
    }       

	private convertDataForDisplay(data: DataRecord[]) {
		let ret: any[] = [];
		for (let d of data) {
			let obj: any = {};
			for (let key of d.keys()) {
				let value: any = d.value(key);
				obj[key] = value;
			}
			ret.push(obj);
		}
		return ret;
	}    

    private getTeamNumbersFromKeys(keys: string[]) : number[] {
        let ret: number[] = [] ;

        for(let key of keys) {
            let teamnum = SCBase.keyToTeamNumber(key) ;
            ret.push(teamnum) ;
        }

        return ret;
    }    
 
    // Implementation of abstract promptString method - Coach app does not support user prompts
    public async promptString(title: string, message: string, defaultValue?: string, placeholder?: string): Promise<string | undefined> {
        // Coach app does not support user input prompts, always return undefined
        return Promise.resolve(undefined);
    }
    public async sendMatchPredictorData(req: IPCMatchPredictorRequest): Promise<void> {
        const response: IPCMatchPredictorData = {
            comp_level: req.comp_level,
            set_number: req.set_number,
            match_number: req.match_number,
            formula: req.formula,
            red: [],
            blue: [],
            red_score: 0,
            blue_score: 0,
            score_sd: null
        };

        try {
            if (!this.project_ || !this.project_.isInitialized()) {
                response.error = 'Project data is not initialized yet. Load data and try again.';
                this.sendToRenderer('send-match-predictor-data', response);
                return;
            }

            if (!req.formula || req.formula.trim().length === 0) {
                response.error = 'Select a formula to compute average points.';
                this.sendToRenderer('send-match-predictor-data', response);
                return;
            }

            const formulaError = this.validateMatchPredictorFormula(req.formula);
            if (formulaError) {
                response.error = formulaError;
                this.sendToRenderer('send-match-predictor-data', response);
                return;
            }

            const match = this.project_.match_mgr_!.findMatchByInfo(req.comp_level, req.set_number, req.match_number);
            if (!match) {
                response.error = 'Match not found for selected match.';
                this.sendToRenderer('send-match-predictor-data', response);
                return;
            }

            const dataMgr = this.project_.data_mgr_! ;
            const redTeams = match.alliances.red.team_keys.map(k => SCBase.keyToTeamNumber(k));
            const blueTeams = match.alliances.blue.team_keys.map(k => SCBase.keyToTeamNumber(k));

            const red = await Promise.all(redTeams.map(async (team) => {
                const avg = await dataMgr.getAverageFormulaBeforeMatch(req.formula, team, req);
                return { team, average: avg.average, matches: avg.count };
            }));

            const blue = await Promise.all(blueTeams.map(async (team) => {
                const avg = await dataMgr.getAverageFormulaBeforeMatch(req.formula, team, req);
                return { team, average: avg.average, matches: avg.count };
            }));

            response.red = red;
            response.blue = blue;
            response.red_score = red.reduce((sum, team) => sum + team.average, 0);
            response.blue_score = blue.reduce((sum, team) => sum + team.average, 0);

            const scoreDiffs: number[] = [];
            for (const m of this.project_.match_mgr_!.getMatches()) {
                const redScore = m.alliances.red.score;
                const blueScore = m.alliances.blue.score;
                if (typeof redScore === 'number' && typeof blueScore === 'number') {
                    scoreDiffs.push(redScore - blueScore);
                }
            }

            if (scoreDiffs.length > 1) {
                const mean = scoreDiffs.reduce((acc, v) => acc + v, 0) / scoreDiffs.length;
                const variance = scoreDiffs.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / scoreDiffs.length;
                response.score_sd = Math.sqrt(variance);
            }
        } catch (e: any) {
            response.error = e?.message ?? 'Failed to compute match predictor data.';
        }

        this.sendToRenderer('send-match-predictor-data', response);
    }

    private validateMatchPredictorFormula(name: string): string | undefined {
        if (!this.project_ || !this.project_.isInitialized()) {
            return 'Project data is not initialized yet. Load data and try again.';
        }

        const teamCols = new Set(this.project_.data_mgr_!.teamColumnNames);
        const matchCols = new Set(this.project_.data_mgr_!.matchColumnNames);
        const formulaMgr = this.project_.formula_mgr_!;
        const visited = new Set<string>();
        const stack = new Set<string>();
        const errors = new Set<string>();

        const walk = (formulaName: string) => {
            const formula = formulaMgr.findFormula(formulaName);
            if (!formula) {
                errors.add(`Formula "${formulaName}" not found.`);
                return;
            }

            if (formula.hasError()) {
                errors.add(`Formula "${formulaName}" has errors: ${formula.getErrorMessage()}`);
                return;
            }

            if (stack.has(formulaName) || visited.has(formulaName)) {
                return;
            }

            stack.add(formulaName);
            for (const variable of formula.variables()) {
                if (teamCols.has(variable) || matchCols.has(variable)) {
                    continue;
                }

                if (stack.has(variable)) {
                    errors.add(`Formula cycle detected involving "${variable}".`);
                    continue;
                }

                if (formulaMgr.findFormula(variable)) {
                    walk(variable);
                } else {
                    errors.add(`Formula "${formulaName}" uses unknown field "${variable}".`);
                }
            }
            stack.delete(formulaName);
            visited.add(formulaName);
        };

        walk(name);
        return errors.size > 0 ? Array.from(errors).join(' ') : undefined;
    }

    private isMatchSimConfig(config: IPCGraphConfig | IPCPredictConfig | undefined): config is IPCPredictConfig {
        return !!config && (config as any).matchsim_mode === 'matchsim';
    }

    private migrateLegacyMatchSimConfigs(): void {
        if (!this.project_ || !this.project_.isInitialized()) {
            return;
        }

        const graphMgr = this.project_.graph_mgr_!;
        const legacy = graphMgr.allConfigs.filter((cfg) => this.isMatchSimConfig(cfg));
        if (legacy.length === 0) {
            return;
        }

        const merged = new Map<string, IPCPredictConfig>();
        for (const cfg of graphMgr.matchSimConfigs) {
            merged.set(`${cfg.owner}:${cfg.name}`, cfg);
        }
        for (const cfg of legacy) {
            merged.set(`${cfg.owner}:${cfg.name}`, cfg);
        }

        graphMgr.matchSimConfigs = Array.from(merged.values());
        graphMgr.coachConfigs = graphMgr.coachConfigs.filter((cfg) => !this.isMatchSimConfig(cfg));
        graphMgr.singleTeamConfigs = graphMgr.singleTeamConfigs.filter((cfg) => !this.isMatchSimConfig(cfg));
    }

}
