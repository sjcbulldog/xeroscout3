import { BrowserWindow, dialog, Menu, MenuItem } from "electron";
import { SCBase, XeroAppType } from "./scbase";
import { SyncClient } from "../sync/syncclient";
import { TCPClient } from "../sync/tcpclient";
import { PacketObj } from "../sync/packetobj";
import * as path from 'path' ;
import * as fs from 'fs' ;
import { PacketType } from "../sync/packettypes";
import { FormInfo } from "../comms/formifc";
import { OneScoutField, OneScoutResult, ScoutingData } from "../comms/resultsifc";
import { MatchTablet, TeamTablet } from "../project/tabletmgr";

export class MatchInfo {
    public type_? : string ;
    public set_? : number ;
    public number_? : number ;
} ;

export class SCScoutInfo {
    public tablet_? : string ;
    public purpose_? : string ;
    public uuid_? : string ;
    public evname_? : string ;
    public teamform_? : any ;
    public matchform_? : any ;
    public teamlist_? : TeamTablet[] ;
    public matchlist_? : MatchTablet[] ;
    public results_ : OneScoutResult[] ;

    constructor() {
        this.results_ = [] ;
    }
}

export class SCScout extends SCBase {
    private static readonly last_event_setting = "lastevent" ;
    private static readonly SYNC_IPADDR = 'SYNC_IPADDR' ;

    private static readonly syncEventLocal: string = "sync-event-local" ;
    private static readonly syncEventRemote: string = "sync-event-remote" ;
    private static readonly resetTablet: string = "reset-tablet" ;
    private static readonly resizeWindow: string = "resize-window" ;
    private static readonly reverseImage: string = 'reverse' ;

    private info_ : SCScoutInfo = new SCScoutInfo() ;

    private tablets_?: any[] ;
    private conn_?: SyncClient ;
    private current_scout_? : string ;
    private alliance_? : string ;
    private want_cmd_ : boolean = false ;
    private next_cmd_? : string ;
    private reversed_ : boolean = false ;
    private reverseImage_: MenuItem | undefined ;
    private sync_client_? : SyncClient ;

    private match_results_received_ : boolean = false ;
    private team_results_received_ : boolean = false ;

    public constructor(win: BrowserWindow, args: string[]) {
        super(win, 'scout') ;

        this.checkLastEvent() ;
    }

    public get applicationType() : XeroAppType { 
        return XeroAppType.Scouter ;
    }
    
    public basePage() : string  {
        return "content/scscouter/scouter.html"
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

    public windowCreated() {
        this.win_.on('ready-to-show', () => {
            this.setViewString() ;
        }) ;
    }

    private populateNavTeams() : any[] {
        let ret : any[] = [] ;

        for(let t of this.info_.teamlist_!) {      
            if (t.tablet === this.info_.tablet_) {
                ret.push({type: 'item', command: 'st-' + t.team, title: "Team: " + t.team, number: t.team}) ;
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

    private populateNavMatches() : any[] {
        let ret : any[] = [] ;

        let ofinterest: any[] = [] ;
        for(let t of this.info_.matchlist_!) {
            if (t.tablet === this.info_.tablet_) {
                ofinterest.push(t) ;
            }
        }
        ofinterest.sort((a, b) => { return this.sortCompFun(a, b) ;}) ;

        for(let t of ofinterest) {
            let numstr: string = SCBase.stripKeyString(t.teamkey) ;
            let mtype:string = t.comp_level ;
            
            let cmd: string = 'sm-' + t.comp_level + '-' + t.set_number + '-' + t.match_number + '-' + t.teamkey ;
            let title: string ;
            title = mtype.toUpperCase() + '-' + t.match_number + ' - ' + t.set_number + '-' + numstr ;
            ret.push({type: 'item', command: cmd, title: title}) ;
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

    public executeCommand(cmd: string) : void {   
        if (this.current_scout_) {
            this.want_cmd_ = true ;
            this.next_cmd_ = cmd ;
            this.sendToRenderer('request-results') ;
        }
        else if (cmd === SCScout.syncEventLocal) {
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
        else if (cmd === SCScout.resetTablet) {
            this.resetTabletCmd() ;
        }
        else if (cmd === SCScout.resizeWindow) {
            this.sendToRenderer('resize-window') ;
        }
        else if (cmd === SCScout.reverseImage) {
            this.reverseImage() ;
        }
        else if (cmd.startsWith('st-')) {
            this.scoutTeam(cmd) ;
        }
        else if (cmd.startsWith('sm-')) {
            this.scoutMatch(cmd) ;
        }
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

        this.sendToRenderer('tablet-title', 'NOT ASSIGNED') ;

        this.sendNavData() ;
        this.setView('empty') ;

        this.image_mgr_.removeAllImages() ;
    }

    private scoutTeam(team: string, force: boolean = false) {
        if (this.current_scout_ && !force) {
            //
            // Get the result from the existing displayed
            // team and store the result in the info for the team
            //
            this.sendToRenderer('request-results') ;
        }
        else {

            //
            // About to scout a new team, be sure that is what we want to do.
            //
            let data: OneScoutResult | undefined = this.getResults(team) ;
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
            this.setView('formview', 'team') ;
        }
    }

    private scoutMatch(match: string, force: boolean = false) {
        if (this.current_scout_ && !force) {
            //
            // Get the result from the existing displayed
            // match and store the result in the info for the match
            //
            this.sendToRenderer('request-results') ;
        }
        else {
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
                let data: OneScoutResult | undefined = this.getResults(match) ;
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
                this.setView('formview', 'match') ;
            }
        }
    }

    private getAllianceFromMatch(match: string) : string | undefined {
        let ret: string | undefined ;
        
        for(let m of this.info_.matchlist_!) {
            let cmd: string = 'sm-' + m.comp_level + '-' + m.set_number + '-' + m.match_number + '-' + m.teamkey ;
            if (cmd === match) {
                ret = m.alliance ;
                break ;
            }
        }

        return ret;
    }

    private filterResults(res: OneScoutField[]) : OneScoutField[] {
        let ret: OneScoutField[] = [] ;

        for(let r of res) {
            if (r.value !== undefined) {
                ret.push(r) ;
            }
        }

        return ret ;
    }

    public provideResults(res: OneScoutField[]) {
        this.addResults(this.current_scout_!, this.filterResults(res)) ;
        this.writeEventFile() ;
        this.logger_.silly('provideResults:' + this.current_scout_, res) ;

        if (this.want_cmd_) {
            this.current_scout_ = undefined ;
            this.want_cmd_ = false ;
            this.executeCommand(this.next_cmd_!) ;
        }
    }

    public sendForm(type: string) {
        let good : boolean = true ;
        let ret : FormInfo = {
            message: undefined,
            form: undefined,
            reversed: this.reversed_,
            color: this.alliance_,
        }

        if (type === 'team') {
            ret.form = 
            {
                type: 'team',
                title: 'Team Form',
                json: this.info_.teamform_
            }
        }
        else if (type === 'match') {
            ret.form = 
            {
                type: 'match',
                title: 'Match Form',
                json: this.info_.matchform_
            }
        }
        else {
            ret.message = 'Invalid form type requested' ;
            good = false ;
        }

        if (good) {
            let images = ret.form!.json.images ;
            if (images) {
                for(let image of images) {
                    this.sendImageData(image) ;
                }
            }
        }
        this.sendToRenderer('send-form', ret);

        let data: OneScoutResult | undefined = this.getResults(this.current_scout_!) ;
        if (data) {
            this.sendToRenderer('send-initial-values', data.data) ;
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

        let data: any = this.getResults(this.current_scout_!) ;
        this.logger_.silly('sendTeamForm/send-result-values: ' + this.current_scout_, data) ;
        if (data) {
            this.sendToRenderer('send-result-values', data) ;
        }
    }

    private getResults(scout: string) : OneScoutResult | undefined {
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
    
    private addResults(scout: string, result: OneScoutField[]) {
        let resobj : OneScoutResult = {
            item: scout,
            data: result
        } ;

        //
        // Optionally delete result if it already exists, we are providing new data.
        //
        this.deleteResults(scout) ;
        this.info_.results_.push(resobj) ;
    }

    private syncClient(conn: SyncClient) {
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
                let p: PacketObj = new PacketObj(PacketType.Hello, data) ;
                await this.conn_!.send(p) ;

                this.conn_!.on('close', () => {
                    this.conn_ = undefined ;
                }) ;

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
            })
            .catch((err) => {
                this.logger_.error('cannot connect to central', err) ;
            }) ;
    }

    private uuidToFileName(uuid: string) : string {
        return uuid ;
    }

    private syncTablet(p: PacketObj) {
        let ret = true ;

        if (p.type_ === PacketType.Hello) {
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
            let obj = JSON.parse(p.payloadAsString()) ;
            for(let res of obj) {
                if (!this.getResults(res.item)) {
                    this.addResults(res.item, res.data) ;
                }
            }
            this.match_results_received_ = true ;
            this.writeEventFile() ;
            ret = this.getMissingData() ;  
        }
        else if (p.type_ === PacketType.ProvideTeamResults) {
            let obj = JSON.parse(p.payloadAsString()) ;
            for(let res of obj) {
                if (!this.getResults(res.item)) {
                    this.addResults(res.item, res.data) ;
                }
            }
            this.team_results_received_ = true ;
            this.writeEventFile() ;
            ret = this.getMissingData() ;  
        }
        else if (p.type_ === PacketType.Goodbye) {
            this.conn_?.close() ;
        }
        else if (p.type_ === PacketType.ReceivedResults) {
            this.conn_?.send(new PacketObj(PacketType.Goodbye, Buffer.from(this.info_.tablet_!))) ;
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
        let obj : ScoutingData = {
            tablet: this.info_.tablet_!,
            purpose: this.info_.purpose_!,
            results: this.info_.results_
        } ;

        let jsonstr = JSON.stringify(obj) ;
        let buffer = Buffer.from(jsonstr) ;
        let jsonstr2 = buffer.toString() ;
        this.conn_?.send(new PacketObj(PacketType.ProvideResults, Buffer.from(jsonstr))) ;
    }

    private needImages() : string[] {
        let ret : string[] = [] ;
        this.image_mgr_.rescanImageDirs() ;
        for(let im of [ ...this.info_.matchform_!.images, ...this.info_.teamform_!.images]) {
            if (!this.image_mgr_.getImage(im)) {
                if (ret.indexOf(im) < 0) {
                    ret.push(im) ;
                }
            }
        }
        return ret ;
    }

    private needMatchResults() : string[] {
        let ret : string[] = [] ;

        for(let m of this.info_.matchlist_!) {
            let cmd: string = 'sm-' + m.comp_level + '-' + m.set_number + '-' + m.match_number + '-' + m.teamkey ;
            if (this.info_.results_) {
                let res: OneScoutResult | undefined = this.getResults(cmd) ;
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
                let res: OneScoutResult | undefined = this.getResults(cmd) ;
                if (!res) {
                    ret.push(cmd) ;
                }
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
        
        if (!ret) {
            this.sendNavData() ;
            this.setViewString() ;
            this.sendScoutingData() ;
        }

        return ret ;
    }

    private setViewString() {
        if (this.info_.uuid_) {
            this.sendToRenderer('update-main-window-view', 'event-view', this.info_.evname_, this.info_.uuid_) ;
            this.sendToRenderer('tablet-title', this.info_.tablet_) ;
        }
        else {
            this.setView('empty') ;
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
            label: 'Sync Event Remote (192.168.1.1)',
            click: () => { this.executeCommand(SCScout.syncEventRemote)}
        }) ;
        filemenu.submenu?.insert(0, synctcpitem) ;

        filemenu.submenu?.insert(1, new MenuItem({type: 'separator'}));

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
}