import * as path from 'path' ;
import * as fs from 'fs' ;
import { BrowserWindow, dialog, Menu, MenuItem } from "electron";
import { SCBase } from "./scbase";
import { SyncClient } from "../sync/syncclient";
import { TCPClient } from "../sync/tcpclient";
import { PacketObj } from "../sync/packetobj";
import { PacketType } from "../sync/packettypes";
import { MatchTablet, PlayoffAssignment, TeamTablet } from "../project/tabletmgr";
import { kMatchAlliances } from '../../shared/playoffs';
import { IPCAppType, IPCForm, IPCFormScoutData, IPCImageItem, IPCNamedDataValue, IPCPlayoffStatus, IPCScoutResult, IPCScoutResults, IPCSection, IPCTabletDefn } from "../../shared/ipc";

export class SCScoutInfo {
    public tablet_? : string ;
    public purpose_? : string ;
    public uuid_? : string ;
    public evname_? : string ;
    public teamform_? : any ;
    public matchform_? : any ;
    public teamlist_? : TeamTablet[] ;
    public matchlist_? : MatchTablet[] ;
    public results_ : IPCScoutResult[] ;
    public playoff_assignments_? : PlayoffAssignment[] ;
    public playoff_status_? : IPCPlayoffStatus ;

    constructor() {
        this.results_ = [] ;
    }
}

export class SCScout extends SCBase {
    private static readonly last_event_setting = "lastevent" ;
    private static readonly SYNC_IPADDR = 'SYNC_IPADDR' ;

    private static readonly viewPlayoffs: string = 'view-playoffs' ;
    private static readonly syncEventLocal: string = "sync-event-local" ;
    private static readonly syncEventRemote: string = "sync-event-remote" ;
    private static readonly syncEventWiFi: string = "sync-event-wifi" ;
    private static readonly syncEventIPAddr: string = "sync-event-ipaddr" ;
    private static readonly resetTablet: string = "reset-tablet" ;
    private static readonly resizeWindow: string = "resize-window" ;
    private static readonly showTeams: string = 'show-teams' ;
    private static readonly showFullTeamNames: string = 'show-full-team-names' ;
    private static readonly reverseImage: string = 'reverse' ;


    private info_ : SCScoutInfo = new SCScoutInfo() ;

    private resultPromiseResolve_ ? : () => void ;
    private tablets_?: IPCTabletDefn[] ;
    private conn_?: SyncClient ;
    private current_scout_? : string ;
    private alliance_? : string ;
    private next_cmd_? : string ;
    private reversed_ : boolean = false ;
    private reverseImage_: MenuItem | undefined ;
    private show_teams_item_ : MenuItem | undefined ;
    private show_full_team_names_item_ : MenuItem | undefined ;
    private sync_client_? : SyncClient ;
    private show_teams_ : boolean = false ;
    private show_full_team_names_ : boolean = false ;

    private ipaddr_: string = '' ;
    private port_ : number = 0 ;

    private team_number_ : number = 1425 ;

    private match_results_received_ : boolean = false ;
    private team_results_received_ : boolean = false ;
    private playoff_assignment_received_ : boolean = false ;
    private playoff_status_received_ : boolean = false ;

    public constructor(win: BrowserWindow, args: string[]) {
        super(win, 'scout') ;

        this.checkLastEvent() ;

        if (this.hasSetting(SCScout.showTeams)) {
            this.show_teams_ = this.getSetting(SCScout.showTeams) ;
        }

        if (this.hasSetting(SCScout.showFullTeamNames)) {
            this.show_full_team_names_ = this.getSetting(SCScout.showFullTeamNames) ;
        }
    }

    public get applicationType() : IPCAppType { 
        return 'scout' ;
    }
    
    public basePage() : string  {
        return "content/main.html"
    }

    public canQuit(): boolean {
        return true ;
    }

    public close() : void {
    }
    
    public sendNavData() : any {
        let treedata : any[] = [] ;

        if (this.info_.purpose_) {
            let navstuff ;
            if (this.info_.purpose_ === 'team' && this.info_.teamlist_) {
                navstuff = this.populateNavTeams() ;
            }
            else {
                navstuff = this.populateNavMatches() ;
            }
            treedata = [...treedata, ...navstuff] ;
        }
        this.sendToRenderer('send-nav-data', treedata);
    }

    private ready() {
        this.setViewString() ;
    }

    public windowCreated() {
        this.win_.on('ready-to-show', this.ready.bind(this)) ;
    }

    private populateNavTeams() : any[] {
        let ret : any[] = [] ;

        for(let t of this.info_.teamlist_!) {      
            if (t.tablet === this.info_.tablet_) {
                let title = "Team: " + t.team ;
                if (this.show_teams_) {
                    title += ' (' + t.name + ')' ;
                }
                
                let teamName = undefined;
                if (this.show_full_team_names_) {
                    teamName = t.name.length > 64 ? t.name.substring(0, 61) + "..." : t.name;
                }
                
                ret.push({type: 'item', command: 'st-' + t.team, title: title, number: t.team, teamName: teamName}) ;
            }
        }

        ret.sort((a,b) : number => { 
            if (a.number < b.number) {
                return -1 ;
            }
            else if (a.number > b.number) {
                return 1 ;
            }

            return 0 ;
        }) ;
        return ret ;
    }

    private areAlliancesValid() : boolean {
        if (!this.info_.playoff_status_ || !this.info_.playoff_status_.alliances) {
            return false;
        }

        let alliances = this.info_.playoff_status_.alliances ;
        if (!Array.isArray(alliances) || alliances.length !== 8) {
            return false;
        }

        for(let all of alliances) {
            if (!all || !all.teams || !Array.isArray(all.teams) || all.teams.length !== 3) {
                return false ;
            }

            if (!all.teams[0] || !all.teams[1] || !all.teams[2]) {
                return false ;
            }
        }

        return true ;
    }

    private populateNavMatches() : any[] {
        let ret : any[] = [] ;

        let ofinterest: any[] = [] ;
        for(let t of this.info_.matchlist_!) {
            if (t.tablet === this.info_.tablet_) {
                ofinterest.push(t) ;
            }
        }
        ofinterest.sort((a, b) => { return this.sortCompFun(a, b) ;}) ;


        if (this.areAlliancesValid()) {
            ret.push({
                type: 'item',
                command: SCScout.viewPlayoffs,
                title: 'View Playoffs'
            }) ;
        }

        for(let t of ofinterest) {
            let mtype:string = t.comp_level ;
            
            let cmd: string = 'sm-' + t.comp_level + '-' + t.set_number + '-' + t.match_number + '-' + t.teamnumber ;
            let title: string ;
            title = mtype.toUpperCase() + '-' + t.match_number + ' - ' + t.set_number + '-' + t.teamnumber ;
            if (this.show_teams_) {
                title += ' (' + t.teamname + ')' ;
            }
            
            let teamName = undefined;
            if (this.show_full_team_names_) {
                teamName = t.teamname.length > 64 ? t.teamname.substring(0, 61) + "..." : t.teamname;
            }
            
            ret.push({type: 'item', command: cmd, title: title, teamName: teamName}) ;
        }
        return ret ;
    }

    public syncError(err: Error) {
        dialog.showMessageBoxSync(this.win_, {
            title: 'Synchronization Error',
            message: 'Error synchronizing - ' + err.message,
        }) ;
        this.sync_client_ = undefined ;
    }

    public syncDone() {
        this.sync_client_ = undefined ;
    }

    private optionallyGetResults() : Promise<void> {
        if (this.current_scout_) {
            return this.getCurrentResults() ;
        }
        else {
            return Promise.resolve() ;
        }
    }

    public executeCommand(cmd: string) : void {   
        this.optionallyGetResults()
        .then(() => {
            this.executeCommandInternal(cmd) ;
        })
        .catch((err) => {
            this.logger_.error('cannot get results before command', err) ; 
        }) ;
    }

    private executeCommandInternal(cmd: string) : void {
        if (cmd === SCScout.syncEventLocal) {
            this.setViewString() ;
            this.current_scout_ = undefined ;
            this.sync_client_ = new TCPClient(this.logger_, '127.0.0.1') ;
            this.sync_client_.on('close', this.syncDone.bind(this)) ; 
            this.sync_client_.on('error', this.syncError.bind(this)) ;

            this.match_results_received_ = false ;
            this.team_results_received_ = false ;
            this.syncClient(this.sync_client_) ;
        }
        else if (cmd === SCScout.syncEventRemote) {
            this.setViewString() ;
            this.current_scout_ = undefined ;
            this.sync_client_ = new TCPClient(this.logger_, '192.168.1.1') ;
            this.sync_client_.on('close', this.syncDone.bind(this)) ; 
            this.sync_client_.on('error', this.syncError.bind(this)) ;

            this.match_results_received_ = false ;
            this.team_results_received_ = false ;
            this.syncClient(this.sync_client_) ;
        }
        else if (cmd === SCScout.syncEventWiFi) {
            this.setViewString() ;
            this.current_scout_ = undefined ;
            this.sync_client_ = new TCPClient(this.logger_, this.ipaddr_, this.port_) ;
            this.sync_client_.on('close', this.syncDone.bind(this)) ; 
            this.sync_client_.on('error', this.syncError.bind(this)) ;

            this.match_results_received_ = false ;
            this.team_results_received_ = false ;
            this.syncClient(this.sync_client_) ;
        }      
        else if (cmd === SCScout.syncEventIPAddr) {
            this.setView('sync-ipaddr') ;
        }              
        else if (cmd === SCScout.resetTablet) {
            this.resetTabletCmd() ;
        }
        else if (cmd === SCScout.resizeWindow) {
            this.sendToRenderer('resize-window') ;
        }
        else if (cmd === SCScout.showTeams) {
            this.show_teams_ = !this.show_teams_ ;
            if (this.show_teams_item_) {
                this.show_teams_item_.checked = this.show_teams_ ;
            }
            this.setSetting(SCScout.showTeams, this.show_teams_) ;
            this.sendNavData() ;
        }
        else if (cmd === SCScout.showFullTeamNames) {
            this.show_full_team_names_ = !this.show_full_team_names_ ;
            if (this.show_full_team_names_item_) {
                this.show_full_team_names_item_.checked = this.show_full_team_names_ ;
            }
            this.setSetting(SCScout.showFullTeamNames, this.show_full_team_names_) ;
            this.sendNavData() ;
        }
        else if (cmd === SCScout.reverseImage) {
            this.reverseImage() ;
        }
        else if (cmd === SCScout.viewPlayoffs) {
            this.setView('playoffs', this.info_.playoff_status_)
        }
        else if (cmd.startsWith('st-')) {
            this.scoutTeam(cmd) ;
        }
        else if (cmd.startsWith('sm-')) {
            this.scoutMatch(cmd) ;
        }
    }

    public syncIPAddrWithAddr(ipaddr: string, port: number) {
        this.setViewString() ;
        this.current_scout_ = undefined ;
        this.sync_client_ = new TCPClient(this.logger_, ipaddr, port) ;
        this.sync_client_.on('close', this.syncDone.bind(this)) ; 
        this.sync_client_.on('error', this.syncError.bind(this)) ;

        this.match_results_received_ = false ;
        this.team_results_received_ = false ;
        this.syncClient(this.sync_client_) ;
    }

    private resetTabletCmd() {

        let ans = dialog.showMessageBoxSync(
            {
              title: 'Reset Tablet',
              type: 'question',
              buttons: ['Yes', 'No'],
              message: `This operation will reset the tablet and all data will be lost unless you have sync'ed with the central server.\nDo you want to continue?`,
            }) ;
        if (ans === 1) {
            return ;
        }

        this.unsetSettings(SCScout.last_event_setting) ;
        this.info_.purpose_ = undefined ;
        this.info_.tablet_ = undefined ;
        this.info_.results_ = [];
        this.info_.uuid_ = undefined ;
        this.info_.evname_ = undefined ;
        this.info_.teamform_ = undefined ;
        this.info_.matchform_ = undefined ;
        this.info_.teamlist_ = undefined ;
        this.info_.matchlist_ = undefined ;
        this.info_.playoff_assignments_ = undefined ;
        this.info_.playoff_status_ = undefined ;

        this.sendToRenderer('tablet-title', 'NOT ASSIGNED') ;

        this.sendNavData() ;
        this.setView('empty') ;

        this.image_mgr_.removeAllImages() ;
    }

    private scoutTeam(team: string, force: boolean = false) {
        this.optionallyGetResults()
        .then(() => {
            //
            // About to scout a new team, be sure that is what we want to do.
            //
            let data: IPCScoutResult | undefined = this.getOneScoutResults(team) ;
            if (!data) {
                let ans = dialog.showMessageBoxSync(
                    {
                      title: 'Scout New Team?',
                      type: 'warning',
                      buttons: ['Yes', 'No'],
                      message: 'You are about to scout a new team.  Do you want to continue?',
                    }) ;
                if (ans === 1) {
                    this.sendToRenderer('send-nav-highlight', undefined) ;
                    this.setViewString() ;
                    return ;
                }
            }

            this.sendToRenderer('send-nav-highlight', team) ;
            this.current_scout_ = team;
            this.setView('form-scout', 'team') ;
        })
        .catch((err) => {
            this.logger_.error('cannot get results before scouting team', err) ; 
        }) ;
    }

    private scoutMatch(match: string, force: boolean = false) {
        this.optionallyGetResults()
        .then(() => {
            this.alliance_ = this.getAllianceFromMatch(match) ;
            if (!this.alliance_) {
                dialog.showMessageBox(this.win_, {
                    title: 'Internal Error', 
                    message: 'Internal Error - no alliance from match'
                }) ;
            }
            else {
                //
                // About to scout a new match, be sure that is what we want to do.
                //
                let data: IPCScoutResult | undefined = this.getOneScoutResults(match) ;
                if (!data) {
                    let ans = dialog.showMessageBoxSync(
                        {
                          title: 'Scout New Team?',
                          type: 'warning',
                          buttons: ['Yes', 'No'],
                          message: 'You are about to scout a new team.  Do you want to continue?',
                        }) ;
                    if (ans === 1) {
                        this.sendToRenderer('send-nav-highlight', undefined) ;
                        this.setViewString() ;
                        return ;
                    }
                }
                this.sendToRenderer('send-nav-highlight', match) ;
                this.current_scout_ = match ;
                this.setView('form-scout', 'match') ;
            }
        })
        .catch((err) => {
            this.logger_.error('cannot get results before scouting match', err) ; 
        }) ;
    }

    private getAllianceFromMatch(match: string) : string | undefined {
        let ret: string | undefined ;
        
        for(let m of this.info_.matchlist_!) {
            let cmd: string = 'sm-' + m.comp_level + '-' + m.set_number + '-' + m.match_number + '-' + m.teamnumber ;
            if (cmd === match) {
                ret = m.alliance ;
                break ;
            }
        }

        return ret;
    }

    private filterResults(res: IPCNamedDataValue[]) : IPCNamedDataValue[] {
        let ret: IPCNamedDataValue[] = [] ;

        for(let r of res) {
            if (r.value !== undefined) {
                ret.push(r) ;
            }
        }

        return ret ;
    }

    public provideResults(res: IPCNamedDataValue[]) {
        this.addResults(this.current_scout_!, this.filterResults(res)) ;
        this.writeEventFile() ;
        this.logger_.silly('provideResults:' + this.current_scout_, res) ;

        if (this.resultPromiseResolve_) {
            // If there is a promise waiting for results, resolve it now.
            this.resultPromiseResolve_() ;
            this.resultPromiseResolve_ = undefined ;
        }
    }

    public sendForm(type: string) {
        if (this.current_scout_ === undefined) {
            throw new Error('No current scout set - cannot send form') ;
        }

        let good : boolean = true ;
        let ret : IPCFormScoutData = {
            message: undefined,
            reversed: this.reversed_,
            color: this.alliance_,
            title: this.current_scout_,
        }

        if (type === 'team') {
            ret.form = this.info_.teamform_
        }
        else if (type === 'match') {
            ret.form = this.info_.matchform_ ;
        }
        else {
            ret.message = 'Invalid form type requested' ;
            good = false ;
        }

        if (good) {
            this.sendToRenderer('send-form', ret);
            let data: IPCScoutResult | undefined = this.getOneScoutResults(this.current_scout_!) ;
            if (data) {
                console.log('send-initial-values: ' + JSON.stringify(data.data)) ;
                this.sendToRenderer('send-initial-values', data.data) ;
            }
        }
    }

    public sendImageData(image: string) {
		this.sendToRenderer('send-image-data', { name: image, data: this.getImageData(image) }) ;
	}

    public sendMatchForm() {
        let ret = {
            formjson: null,
            title: "",
            errormsg: "",
        } ;

        if (this.info_.matchform_) {
            ret.formjson = this.info_.matchform_ ;
            if (this.current_scout_) {
                ret.title = this.current_scout_ ;
            }
            else {
                ret.title = 'UNKNOWN' ;
            }
            this.sendToRenderer('send-match-form', ret) ;
        }

        let data: any = this.getOneScoutResults(this.current_scout_!) ;
        this.logger_.silly('sendTeamForm/send-result-values: ' + this.current_scout_, data) ;
        if (data) {
            this.sendToRenderer('send-result-values', data) ;
        }
    }

    private getOneScoutResults(scout: string) : IPCScoutResult | undefined {
        for(let result of this.info_.results_) {
            if (result.item === scout) {
                return result ;
            }
        }
        return undefined ;
    }

    private deleteResults(scout: string) {
        for(let i = 0 ; i < this.info_.results_.length ; i++) {
            if (this.info_.results_[i].item && this.info_.results_[i].item === scout) {
                this.info_.results_.splice(i, 1) ;
                break ;
            }
        }
    }
    
    private addResults(scout: string, result: IPCNamedDataValue[]) {
        let resobj : IPCScoutResult = {
            item: scout,
            data: result
        } ;

        //
        // Optionally delete result if it already exists, we are providing new data.
        //
        this.deleteResults(scout) ;
        this.info_.results_.push(resobj) ;
    }

    private getCurrentResults() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.resultPromiseResolve_ = resolve ;
            this.sendToRenderer('request-results') ;
        }) ;
        return ret;
    }

    private syncClient(conn: SyncClient) {
        this.optionallyGetResults()
        .then(() => {
            this.match_results_received_ = false ;
            this.team_results_received_ = false ;
            this.playoff_assignment_received_ = false ;
            this.playoff_status_received_ = false ;

            this.conn_ = conn ;
            conn.connect()
                .then(async ()=> {
                    this.logger_.info(`ScouterSync: connected to server ' ${conn.name()}'`) ;
                    let data = new Uint8Array(0) ;

                    if (this.info_.tablet_ && this.info_.purpose_) {
                        let obj = {
                            name: this.info_.tablet_,
                            purpose: this.info_.purpose_
                        }
                        data = Buffer.from(JSON.stringify(obj)) ;
                    }

                    this.conn_!.on('close', () => {
                        this.conn_ = undefined ;
                    }) ;

                    let p: PacketObj = new PacketObj(PacketType.HelloFromScouter, data) ;

                    this.conn_!.on('error', (err: Error) => {
                        let msg: string = "" ;
                        let a: any = err as any ;
                        if (a.errors) {
                            for(let cerror of a.errors) {
                                this.logger_.info('ScouterSync: error from connection \'' + conn.name() + '\' - ' + cerror.message) ;
                                msg += cerror.message + '\n' ;
                            }
                        }
                        else {
                            this.logger_.info('ScouterSync: error from connection \'' + conn.name() + '\' - ' + err.message) ;
                            msg = err.message ;
                        }

                        this.sendToRenderer('set-status-title', 'Error Connecting To XeroScout Central') ;
                        this.sendToRenderer('set-status-visible', true) ;
                        this.sendToRenderer('set-status-text', msg) ;
                        this.sendToRenderer('set-status-close-button-visible', true) ;
                    }) ;

                    this.conn_!.on('packet', (p: PacketObj) => {
                        this.syncTablet(p) ;
                    }) ;

                    await this.conn_!.send(p) ;
                })
                .catch((err) => {
                    this.logger_.error('cannot connect to central', err) ;
                }) ;
        })
        .catch((err) => {
            this.logger_.error('cannot get results before sync', err) ;
        }) ;
    }

    private uuidToFileName(uuid: string) : string {
        return uuid ;
    }

    private syncTablet(p: PacketObj) {
        let ret = true ;

        if (p.type_ === PacketType.HelloFromScouter) {
            let obj ;

            try {
                obj = JSON.parse(p.payloadAsString()) ;
                if (this.info_.uuid_ && obj.uuid !== this.info_.uuid_) {
                    //
                    // We have an event loaded and it does not match
                    //
                    this.sendToRenderer('set-status-title', 'Error Connecting To XeroScout Central') ;
                    this.sendToRenderer('set-status-visible', true) ;
                    this.sendToRenderer('set-status-text', 'The loaded event does not match event being synced - reset the tablet to sync to this new event.') ;
                    this.sendToRenderer('set-status-close-button-visible', true) ;
                    this.conn_!.close() ;
                    return ;
                }

                if (this.info_.tablet_) {
                    //
                    // The current tablet already has an identity.  See if we are missing things ...
                    //
                    this.getMissingData() ;
                    if (!this.info_.evname_) {
                        this.info_.evname_ = obj.name ;
                    }
                }
                else {
                    this.info_.uuid_ = obj.uuid ;
                    this.info_.evname_ = obj.name;
                    let p: PacketObj = new PacketObj(PacketType.RequestTablets) ;
                    this.conn_!.send(p) ;
                }
            }
            catch(err) {
            }
        }
        else if (p.type_ === PacketType.ProvideTablets) {
            this.tablets_ = JSON.parse(p.data_.toString()) ;
            this.setView('select-tablet') ;
        }
        else if (p.type_ === PacketType.ProvideTeamForm) {
            this.info_.teamform_ = JSON.parse(p.payloadAsString()) ;
            this.writeEventFile() ;
            ret = this.getMissingData() ;            
        }
        else if (p.type_ === PacketType.ProvideMatchForm) {
            this.info_.matchform_ = JSON.parse(p.payloadAsString()) ;
            this.writeEventFile() ;
            ret = this.getMissingData() ;  
        }
        else if (p.type_ === PacketType.ProvideTeamList) {
            this.info_.teamlist_ = JSON.parse(p.payloadAsString()) ;
            this.writeEventFile() ;
            ret = this.getMissingData() ;  
        }
        else if (p.type_ === PacketType.ProvidePlayoffAssignments) {
            let obj = JSON.parse(p.payloadAsString()) ;
            if (obj !== null) {
                this.info_.playoff_assignments_ = obj ;
                this.writeEventFile() ;
                this.checkPlayoffMatchGeneration();
            }

            this.playoff_assignment_received_ = true ;
            this.getMissingData() ;
        }
        else if (p.type_ === PacketType.ProvidePlayoffStatus) {
            let obj = JSON.parse(p.payloadAsString()) ;
            if (obj !== null) {
                this.info_.playoff_status_ = obj ;
                this.writeEventFile() ;
                this.checkPlayoffMatchGeneration();                
            }

            this.playoff_status_received_ = true ;
            this.getMissingData() ;
        }        
        else if (p.type_ === PacketType.ProvideMatchList) {
            this.info_.matchlist_ = JSON.parse(p.payloadAsString()) ;
            this.writeEventFile() ;
            ret = this.getMissingData() ;  
        }
        else if (p.type_ === PacketType.ProvideImages) {
            let obj = JSON.parse(p.payloadAsString()) ;
            for(let imname of Object.keys(obj)) {
                let imdata = obj[imname] ;
                this.image_mgr_.addImageWithData(imname, imdata) ;
            }
            ret = this.getMissingData() ;  
        }
        else if (p.type_ === PacketType.ProvideMatchResults) {
            if (this.info_.purpose_ === 'match') {
                let obj = JSON.parse(p.payloadAsString()) ;
                for(let res of obj) {
                    if (!this.getOneScoutResults(res.item)) {
                        this.addResults(res.item, res.data) ;
                    }
                }
            }
            this.match_results_received_ = true ;
            this.writeEventFile() ;
            ret = this.getMissingData() ;  
        }
        else if (p.type_ === PacketType.ProvideTeamResults) {
            if (this.info_.purpose_ === 'team') {
                let obj = JSON.parse(p.payloadAsString()) ;
                for(let res of obj) {
                    if (!this.getOneScoutResults(res.item)) {
                        this.addResults(res.item, res.data) ;
                    }
                }
            }
            this.team_results_received_ = true ;
            this.writeEventFile() ;
            ret = this.getMissingData() ;  
        }
        else if (p.type_ === PacketType.GoodbyeFromScouter) {
            this.conn_?.close() ;
        }
        else if (p.type_ === PacketType.ReceivedResults) {
            this.conn_?.send(new PacketObj(PacketType.GoodbyeFromScouter, Buffer.from(this.info_.tablet_!))) ;
            this.conn_?.close() ;
        }
        else if (p.type_ === PacketType.Error) {
            this.sendToRenderer('set-status-title', 'Error Syncing With XeroScout Central') ;
            this.sendToRenderer('set-status-visible', true) ;
            this.sendToRenderer('set-status-text', p.payloadAsString()) ;
            this.sendToRenderer('set-status-close-button-visible', true) ;
        }
    }

    private sendScoutingData() {
        let obj : IPCScoutResults = {
            tablet: this.info_.tablet_!,
            purpose: this.info_.purpose_!,
            results: this.info_.results_
        } ;

        let jsonstr = JSON.stringify(obj) ;
        let buffer = Buffer.from(jsonstr) ;
        let jsonstr2 = buffer.toString() ;
        this.conn_?.send(new PacketObj(PacketType.ProvideResults, Buffer.from(jsonstr))) ;
    }

    private needMatchResults() : string[] {
        let ret : string[] = [] ;

        for(let m of this.info_.matchlist_!) {
            let cmd: string = 'sm-' + m.comp_level + '-' + m.set_number + '-' + m.match_number + '-' + m.teamnumber ;
            if (this.info_.results_) {
                let res: IPCScoutResult | undefined = this.getOneScoutResults(cmd) ;
                if (!res) {
                    ret.push(cmd) ;
                }
            }
        }
        return ret ;
    }

    private needTeamResults() : string[] {
        let ret : string[] = [] ;

        for(let t of this.info_.teamlist_!) {
            let cmd: string = 'st-' + t.team ;
            if (this.info_.results_) {
                let res: IPCScoutResult | undefined = this.getOneScoutResults(cmd) ;
                if (!res) {
                    ret.push(cmd) ;
                }
            }
        }
        return ret ;
    }

    private getRequiredImagesFromSection(section: IPCSection) : string[] {
        let ret : string [] = [] ;
        for(let item of section.items) {
            if (item.type === 'image') {
                let imitem = item as IPCImageItem ;
                ret.push(imitem.image) ;
            }
        }

        return [...new Set(ret)] ;
    }

    private getRequiredImagesFromForm(form: IPCForm) : string[] {
        let ret : string[] = [] ;
        for(let section of form.sections) {
            ret = [...ret, ... this.getRequiredImagesFromSection(section)];
        }

        return ret ;
    }

    private needImages() : string [] {
        let images: string[] = [ 
                ...this.getRequiredImagesFromForm(this.info_.teamform_), 
                ... this.getRequiredImagesFromForm(this.info_.matchform_)] ;

        let imlist = [...new Set(images)];
        let ret: string[] = [] ;

        for(let im of imlist) {
            if (!this.image_mgr_.hasImage(im)) {
                ret.push(im) ;
            }
        }

        return ret ;
    }

    private getMissingData() {
        let ret: boolean = false ;

        if (!this.info_.teamform_) {
            this.conn_?.send(new PacketObj(PacketType.RequestTeamForm)) ;
            ret = true ;
        }
        else if (!this.info_.matchform_) {
            this.conn_?.send(new PacketObj(PacketType.RequestMatchForm)) ;
            ret = true ;
        }
        else if (!this.info_.matchlist_) {
            this.conn_?.send(new PacketObj(PacketType.RequestMatchList)) ;
            ret = true ;
        }
        else if (!this.info_.teamlist_) {
            this.conn_?.send(new PacketObj(PacketType.RequestTeamList)) ;
            ret = true ;
        }
        else if (!this.match_results_received_ && this.needMatchResults().length > 0) {
            this.conn_?.send(new PacketObj(PacketType.RequestMatchResults, Buffer.from(JSON.stringify(this.needMatchResults())))) ;
            ret = true ;
        }
        else if (!this.team_results_received_ && this.needTeamResults().length > 0) {
            this.conn_?.send(new PacketObj(PacketType.RequestTeamResults, Buffer.from(JSON.stringify(this.needTeamResults())))) ;
            ret = true ;
        }
        else if (this.needImages().length > 0) {
            this.conn_?.send(new PacketObj(PacketType.RequestImages, Buffer.from(JSON.stringify(this.needImages())))) ;
            ret = true ;            
        }
        else if (!this.info_.playoff_assignments_ && !this.playoff_assignment_received_) {
            this.conn_?.send(new PacketObj(PacketType.RequestPlayoffAssignments)) ;
            ret = true ;              
        }
        else if (!this.playoff_status_received_) {
            this.conn_?.send(new PacketObj(PacketType.RequestPlayoffStatus)) ;
            ret = true ;              
        }

        if (!ret) {
            this.checkPlayoffMatchGeneration() ;
            this.sendNavData() ;
            this.setViewString() ;
            this.sendScoutingData() ;
        }

        return ret ;
    }

    public mainWindowLoaded(): void {
        this.appInit() ;
        this.setViewString() ;
        
        let v = this.getVersion('application') ;
        this.sendToRenderer('send-app-status', { 
            left: `Xero Scouter ${this.versionToString(v)}`,
            middle: this.info_.evname_ ? this.info_.evname_ : 'No Event Loaded',
            right: this.info_.uuid_ ? this.info_.uuid_ : ''
        }) ;
    }    

    private setViewString() {
        if (this.info_.uuid_) {
            this.sendToRenderer('tablet-title', this.info_.tablet_) ;
        }
        else {
            this.setView('text', 'No Event Loaded') ;
        }
    }

    private reverseImage() {
        this.reversed_ = this.reverseImage_!.checked ;
        this.current_scout_ = undefined ;
        if (this.info_.uuid_) {
            this.setViewString() ;
        }
        else {
            this.setView('empty') ;
        }
    }

    public createMenu() : Menu | null {
        let ret: Menu | null = new Menu() ;

        let filemenu: MenuItem = new MenuItem( {
            type: 'submenu',
            label: 'File',
            role: 'fileMenu'
        }) ;

        let synctcpitem: MenuItem = new MenuItem( {
            type: 'normal',
            label: 'Sync Event Local (127.0.0.1)',
            click: () => { this.executeCommand(SCScout.syncEventLocal)}
        }) ;
        filemenu.submenu?.insert(0, synctcpitem) ;

        synctcpitem = new MenuItem( {
            type: 'normal',
            label: 'Sync Event Cable (192.168.1.1)',
            click: () => { this.executeCommand(SCScout.syncEventRemote)}
        }) ;
        filemenu.submenu?.insert(1, synctcpitem) ;

        synctcpitem = new MenuItem( {
            type: 'normal',
            label: 'Sync Event WiFi (mDNS)',
            click: () => { this.executeCommand(SCScout.syncEventWiFi)}
        }) ;
        filemenu.submenu?.insert(2, synctcpitem) ;    
        
        synctcpitem = new MenuItem( {
            type: 'normal',
            label: 'Sync Event IP Address (Manual)',
            click: () => { this.executeCommand(SCScout.syncEventIPAddr)}
        }) ;
        filemenu.submenu?.insert(3, synctcpitem) ;          

        filemenu.submenu?.insert(4, new MenuItem({type: 'separator'}));        

        ret.append(filemenu) ;

        let resetmenu: MenuItem = new MenuItem({
            type: 'submenu',
            label: 'Reset',
            submenu: new Menu()
        }) ;

        let resetitem: MenuItem = new MenuItem( {
            type: 'normal',
            label: 'Reset Tablet',
            click: () => { this.executeCommand(SCScout.resetTablet)}
        }) ;
        resetmenu.submenu?.insert(0, resetitem) ;
        ret.append(resetmenu);    

        let optionmenu: MenuItem = new MenuItem({
            type: 'submenu',
            label: 'Options',
            submenu: new Menu()
        }) ;
    
        this.reverseImage_ = new MenuItem({
            type: 'checkbox',
            label: 'Reverse',
            checked: false,
            click: () => { this.executeCommand(SCScout.reverseImage)}
          }) ;
        optionmenu.submenu!.append(this.reverseImage_) ;
        ret.append(optionmenu);        
        
        let viewmenu: MenuItem = new MenuItem( {
            type: 'submenu',
            role: 'viewMenu'
        }) ;
        viewmenu.submenu?.append(new MenuItem({type: 'separator'}));

        viewmenu.submenu?.append(new MenuItem({
            type: 'normal',
            label: 'Resize Window',
            click: () => { this.executeCommand(SCScout.resizeWindow)}
        })) ;

        this.show_teams_item_ = new MenuItem({
            type: 'checkbox',
            label: 'Show Teams',
            click: () => { this.executeCommand(SCScout.showTeams)}
        }) ;
        if (this.show_teams_) {
            this.show_teams_item_.checked = true ;
        }
        viewmenu.submenu?.append(this.show_teams_item_) ;

        viewmenu.submenu?.append(new MenuItem({type: 'separator'}));

        this.show_full_team_names_item_ = new MenuItem({
            type: 'checkbox',
            label: 'Show Full Team Names',
            click: () => { this.executeCommand(SCScout.showFullTeamNames)}
        }) ;
        if (this.show_full_team_names_) {
            this.show_full_team_names_item_.checked = true ;
        }
        viewmenu.submenu?.append(this.show_full_team_names_item_) ;
        ret.append(viewmenu) ;

        let helpmenu: MenuItem = new MenuItem( {
            type: 'submenu',
            label: 'Help',
            submenu: new Menu(),
        }) ;

        let aboutitem: MenuItem = new MenuItem( {
            type: 'normal',
            label: 'About',
            click: () => { this.showAbout() }
        }) ;
        helpmenu.submenu?.append(aboutitem) ;

        ret.append(helpmenu) ;

        return ret;
    }    

    public sendTabletData() : void {
        if (this.tablets_) {
            this.sendToRenderer('send-tablet-data', this.tablets_) ;
        }
    }

    public setTabletNamePurpose(name: string, purpose: string) : void {
        this.tablets_ = undefined ;
        this.info_.tablet_ = name ;
        this.info_.purpose_ = purpose ;

        this.sendToRenderer('tablet-title', this.info_.tablet_) ;

        this.writeEventFile() ;
        this.getMissingData() ;
    }

    private checkLastEvent() {
        if (this.hasSetting(SCScout.last_event_setting)) {
            try {
                let fname = this.getSetting(SCScout.last_event_setting) ;
                let fullpath: string = path.join(this.appdir_, fname) ;
                this.readEventFile(fullpath) ;
            }
            catch(err) {
                let errobj: Error = err as Error ;
                dialog.showMessageBoxSync(this.win_, {
                    title: 'Error starting scout computer',
                    message: 'Error reading default event - this tablet has been reset.\nError: ' + errobj.message
                }) ;
                this.resetTabletCmd() ;
            }
        }
    }

    private readEventFile(fullpath: string) : Error | undefined {
        let ret : Error | undefined = undefined ;

        const rawData = fs.readFileSync(fullpath, 'utf-8');
        this.info_ = JSON.parse(rawData) as SCScoutInfo ;

        return ret ;
    }

    private writeEventFile() : Error | undefined {
        let ret : Error | undefined ;

        let filename = this.uuidToFileName(this.info_.uuid_!) ;
        this.setSetting(SCScout.last_event_setting, filename) ;

        const jsonString = JSON.stringify(this.info_);
        let projfile = path.join(this.appdir_, filename) ;
        fs.writeFile(projfile, jsonString, (err) => {
            if (err) {
                this.unsetSettings(SCScout.last_event_setting) ;
                fs.rmSync(projfile) ;   
                ret = err ;
            }
        });
        return ret;
    }

    private target2Alliance(target: string) : number | undefined {
        let ret: string = target ;

        if (target.startsWith('a')) {
            ret = target.substring(1) ;
        } else if (target.startsWith('l') || target.startsWith('w')) {
            let match = +target.substring(1) ;
            if (this.info_.playoff_status_ && this.info_.playoff_status_.outcomes) {
                let outcome = this.info_.playoff_status_.outcomes["m" + match.toString() as keyof IPCPlayoffStatus['outcomes']] ;
                if (outcome) {
                    if (target.startsWith('l')) {
                        ret = outcome.loser.toString() ;
                    } else if (target.startsWith('w')) {
                        ret = outcome.winner.toString() ;
                    }
                }
            }
        }

        if (/^a-zA-Z.*/.test(ret)) {
            return undefined ;
        } ;

        return +ret ;
    }

    private findPlayoffMatchAssignment(match: number) : PlayoffAssignment | undefined {
        for(let a of this.info_.playoff_assignments_!) {
            if (a.match === match && a.tablet === this.info_.tablet_) {
                return a ;
            }
        }

        return undefined ;
    }

    private findMatchInList(match: number) : MatchTablet | undefined {
        for(let m of this.info_.matchlist_!) {
            if (m.comp_level === 'sf' && m.set_number === match && m.match_number === 1 && m.tablet === this.info_.tablet_) {
                return m ;
            }

            if (m.comp_level === 'f' && m.set_number === 1 && m.match_number === match - 13 && m.tablet === this.info_.tablet_) {
                return m ;
            }
        }

        return undefined ;
    }

    private findTeam(alliance: number, target: number) : number | undefined {
        if (this.info_.playoff_status_ && this.info_.playoff_status_.alliances) {
            if (Array.isArray(this.info_.playoff_status_.alliances) && this.info_.playoff_status_.alliances.length > alliance - 1) {
                let allianceData = this.info_.playoff_status_.alliances[alliance - 1] ;
                if (allianceData && Array.isArray(allianceData.teams) && allianceData.teams.length > target) {
                    return allianceData.teams[target] ;
                }
            }
        }

        return undefined ;
    }

    private createMatchFromAlliance(match: number, ralliance: number, balliance: number) {
        let a: PlayoffAssignment | undefined = this.findPlayoffMatchAssignment(match) ;
        if (!a) {
            // No assignment for this match, nothing to do.
            return ;
        }

        if (this.findMatchInList(match)) {
            // It's already in the list, no need to create it.
            return ;
        }

        let team = this.findTeam(a.alliance === 'red' ? ralliance : balliance, a.which) ;
        if (!team) {
            return ;
        }

        let mtype = (match < 14) ? 'sf' : 'f' ;
        let setno = (match < 14) ? match  : 1 ;
        let matchno = (match < 14) ? 1 : match - 13 ;
        let ma = new MatchTablet(mtype, matchno, setno, a.alliance, team, '?', this.info_.tablet_!) ;
        this.info_.matchlist_!.push(ma) ;

        this.writeEventFile() ;
    }

    private checkPlayoffMatchGeneration() {
        for(let m = 1 ; m <= 16 ; m++) {
            let match = kMatchAlliances[m-1] ;
            let ralliance = this.target2Alliance(match[0]) ;
            let balliance = this.target2Alliance(match[1]) ;

            if (ralliance && balliance) {
                this.createMatchFromAlliance(m, ralliance, balliance) ;
            }
        }

        this.sendNavData() ;
        this.setViewString() ;
    }   

    public setPlayoffMatchOutcome(match: number, winner: number, loser: number) : void {
        if (this.info_.playoff_status_) {
            let str = `m${match}` as keyof typeof this.info_.playoff_status_.outcomes ;
            this.info_.playoff_status_.outcomes[str] = {
                winner: winner,
                loser: loser,
            } ;
            this.checkPlayoffMatchGeneration() ;
            this.setView('playoffs', this.info_.playoff_status_)            
            this.writeEventFile() ;
            this.sendNavData() ;
        }
    }

    // Implementation of abstract promptString method - Scout app does not support user prompts
    public async promptString(title: string, message: string, defaultValue?: string, placeholder?: string): Promise<string | undefined> {
        // Scout app does not support user input prompts, always return undefined
        return Promise.resolve(undefined);
    }
}
