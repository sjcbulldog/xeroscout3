import * as path from "path";
import * as fs from "fs";
import { BrowserWindow, dialog, Menu, MenuItem } from "electron";
import { SyncClient } from "../sync/syncclient";
import { TCPClient } from "../sync/tcpclient";
import { PacketObj } from "../sync/packetobj";
import { PacketType } from "../sync/packettypes";
import { Project } from "../project/project";
import { SCCoachCentralBaseApp } from "./sccoachcentralbase";
import { IPCAppType } from "../../shared/ipc";

export class SCCoach extends SCCoachCentralBaseApp {
    private static readonly lastEventLoaded: string = 'coach-last-event-loaded' ;

    private static readonly viewInit: string = 'view-init' ;
	private static readonly viewTeamStatus: string = 'view-team-status';
	private static readonly viewTeamDB: string = 'view-team-db';
	private static readonly viewMatchStatus: string = 'view-match-status';
	private static readonly viewMatchDB: string = 'view-match-db';
	private static readonly viewSingleTeamSummary: string = 'view-single-team-summary' ;
    private static readonly viewPicklist: string = 'view-picklist' ;
	private static readonly viewPlayoffs: string = 'view-playoffs' ;
    private static readonly resetTablet: string = "reset-tablet" ;    
    private static readonly viewTeamForm: string = 'view-team-form';
    private static readonly viewMatchForm: string = 'view-match-form';
	private static readonly viewFormulas: string = 'view-formulas';    

    private static readonly syncEventLocal: string = "sync-event-local" ;
    private static readonly syncEventRemote: string = "sync-event-remote" ;
    private static readonly syncEventWiFi: string = "sync-event-wifi" ;
    private static readonly syncEventIPAddr: string = "sync-event-ipaddr" ;

    private sync_client_? : SyncClient ;    
    private sync_project_file_ : string = '' ;

    public constructor(win: BrowserWindow, args: string[]) {
        super(win, 'coach') ;
    }

    public get applicationType() : IPCAppType { 
        return 'coach' ;
    }

	public mainWindowLoaded(): void {
		this.appInit() ;

        let lastevent = this.getSetting(SCCoach.lastEventLoaded) ;
        if (lastevent && typeof lastevent === 'string' && lastevent.length > 0) {
            let evfile = path.join(lastevent, 'event.json') ;
            this.openEvent(evfile)
            .then(() => { 
                this.sendNavData() ;
            })
        }
    }    

    private openEvent(evfile: string) : Promise<void> {
        let ret = new Promise<void>( (resolve, reject) => {
            let d = new Date() ;
            Project.openEvent(this.logger_, evfile, d.getFullYear(), this.applicationType)
                .then( (proj: Project) => {
                    this.project = proj ;
                    resolve() ;
                } )
                .catch( (err: Error) => {
                    dialog.showErrorBox('Error Opening Event', 'There was an error reopening the last event:\n' + err.message) ;
                    this.logger_.error('Error opening event: ' + err.message) ;
                    reject(err) ;
                } ) ;          
        } ) ;

        return ret ;
    }
    
    public basePage() : string  {
        return "content/main.html"
    }
    
    public canQuit(): boolean {
        return true ;
    }

    public close() : void {
        if (this.project) {
            this.setSetting(SCCoach.lastEventLoaded, this.project.location) ;
        }
    }

	public sendNavData(): void {
		let treedata = [];
		let dims = 40 ;

		if (this.project) {
			treedata.push({
				type: "icon",
				command: SCCoach.viewInit,
				title: "Event Info",
				icon: this.getIconData('info.png'),
				width: dims,
				height: dims
			});
			treedata.push({ type: "separator", title: "Teams" });
            treedata.push({
                type: "icon",
                command: SCCoach.viewTeamForm,
                title: "Team Form",
                icon: this.getIconData('form.png'),
                width: dims,
                height: dims
            });            
            treedata.push({
                type: "icon",
                command: SCCoach.viewTeamStatus,
                title: "Team Status",
                icon: this.getIconData('status.png'),
                width: dims,
                height: dims					
            });
            treedata.push({
                type: "icon",
                command: SCCoach.viewTeamDB,
                title: "Team Data",
                icon: this.getIconData('data.png'),
                width: dims,
                height: dims					
            });

			treedata.push({ type: "separator", title: "Match" });
            treedata.push({
                type: "icon",
                command: SCCoach.viewMatchForm,
                title: "MatchForm",
                icon: this.getIconData('form.png'),
                width: dims,
                height: dims
            });
            treedata.push({
                type: "icon",
                command: SCCoach.viewMatchStatus,
                title: "Match Status",
                icon: this.getIconData('status.png'),
                width: dims,
                height: dims					
            });
            treedata.push({
                type: "icon",
                command: SCCoach.viewMatchDB,
                title: "Match Data",
                icon: this.getIconData('data.png'),
                width: dims,
                height: dims					
            });

            treedata.push({
                type: 'icon',
                command: SCCoach.viewPlayoffs,
                title: "Playoffs",
                icon: this.getIconData('playoffs.png'),
                width: dims,
                height: dims	
            });					

			treedata.push({ type: "separator", title: "Analysis" });

            treedata.push({
                type: 'icon',
                command: SCCoach.viewFormulas,
                title: "Formulas",
                icon: this.getIconData('formula.png'),
                width: dims,
                height: dims	
            });	            
			
            treedata.push({
                type: 'icon',
                command: SCCoach.viewPicklist,
                title: "Picklist",
                icon: this.getIconData('picklist.png'),
                width: dims,
                height: dims	
            });

            treedata.push({
                type: 'icon',
                command: SCCoach.viewSingleTeamSummary,
                title: "Single Team View",
                icon: this.getIconData('singleteam.png'),
                width: dims,
                height: dims						
            });
		}

		this.sendToRenderer("send-nav-data", treedata);
    }   

    public windowCreated(): void {
    }

    public executeCommand(cmd: string) : void {
        if (cmd === SCCoach.syncEventLocal) {
            this.sync_client_ = new TCPClient(this.logger_, '127.0.0.1') ;
            this.sync_client_.on('close', this.syncDone.bind(this)) ; 
            this.sync_client_.on('error', this.syncError.bind(this)) ;
            this.syncCoach() ;            
        }
        else if (cmd === SCCoach.syncEventRemote) {
        }
        else if (cmd === SCCoach.syncEventWiFi) {
        }      
        else if (cmd === SCCoach.syncEventIPAddr) {
            this.setView('sync-ipaddr') ;
        }
        else if (cmd === SCCoach.resetTablet) {
            this.project = undefined ;
            this.unsetSettings(SCCoach.lastEventLoaded) ;
            this.sendNavData() ;
        }
        else if (cmd === SCCoach.viewInit) {
            this.setView('info') ;
		} else if (cmd === SCCoach.viewTeamForm) {
			this.setView('form-scout', 'team');
		} else if (cmd === SCCoach.viewMatchForm) {
			this.setView('form-scout', 'match');
		}        
        else if (cmd === SCCoach.viewTeamStatus) {
            this.setView("team-status");
        }
        else if (cmd === SCCoach.viewTeamDB) {
            this.setView("team-db");
        }
        else if (cmd === SCCoach.viewMatchStatus) {
            this.setView("match-status");
        }
        else if (cmd === SCCoach.viewMatchDB) {
            this.setView("match-db");
        }
        else if (cmd === SCCoach.viewFormulas) {
            this.setView("formulas");
        }
        else if (cmd === SCCoach.viewSingleTeamSummary) {
            this.setView("singleteam");
        }
        else if (cmd === SCCoach.viewPicklist) {
            this.setView("picklist");
        }
        else {
            dialog.showErrorBox('Unknown Command', `The command '${cmd}' is not recognized by SCCoach.`) ;
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
            click: () => { this.executeCommand(SCCoach.syncEventLocal)}
        }) ;
        filemenu.submenu?.insert(0, synctcpitem) ;

        synctcpitem = new MenuItem( {
            type: 'normal',
            label: 'Sync Event Cable (192.168.1.1)',
            click: () => { this.executeCommand(SCCoach.syncEventRemote)}
        }) ;
        filemenu.submenu?.insert(1, synctcpitem) ;

        synctcpitem = new MenuItem( {
            type: 'normal',
            label: 'Sync Event WiFi (mDNS)',
            click: () => { this.executeCommand(SCCoach.syncEventWiFi)}
        }) ;
        filemenu.submenu?.insert(2, synctcpitem) ;    
        
        synctcpitem = new MenuItem( {
            type: 'normal',
            label: 'Sync Event IP Address (Manual)',
            click: () => { this.executeCommand(SCCoach.syncEventIPAddr)}
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
            click: () => { this.executeCommand(SCCoach.resetTablet)}
        }) ;
        resetmenu.submenu?.insert(0, resetitem) ;
        ret.append(resetmenu);          

        return ret ;
    }    

    private syncDone() : void {
    }

    private syncError(err: Error) : void {
        this.logger_.error('Sync error: ' + err.message) ;
    }

    private syncCoach() : void {
        this.sync_client_!.connect()
            .then(async ()=> {
                this.logger_.info(`ScouterSync: connected to server ' ${this.sync_client_!.name()}'`) ;
                let data = new Uint8Array(0) ;

                this.sync_client_!.on('close', () => {
                    this.logger_.info('ScouterSync: connection closed') ;
                    this.sync_client_ = undefined ;
                }) ;
                
                let p: PacketObj = new PacketObj(PacketType.HelloFromCoach, data) ;
                this.sync_client_!.on('error', (err: Error) => {
                    let msg: string = "" ;
                    let a: any = err as any ;
                    if (a.errors) {
                        for(let cerror of a.errors) {
                            this.logger_.info('ScouterSync: error from connection \'' + this.sync_client_!.name() + '\' - ' + cerror.message) ;
                            msg += cerror.message + '\n' ;
                        }
                    }
                    else {
                        this.logger_.info('ScouterSync: error from connection \'' + this.sync_client_!.name() + '\' - ' + err.message) ;
                        msg = err.message ;
                    }

                    this.sendToRenderer('set-status-title', 'Error Connecting To XeroScout Central') ;
                    this.sendToRenderer('set-status-visible', true) ;
                    this.sendToRenderer('set-status-text', msg) ;
                    this.sendToRenderer('set-status-close-button-visible', true) ;
                }) ;

                this.sync_client_!.on('packet', (p: PacketObj) => {
                    this.syncTablet(p) ;
                }) ;

                await this.sync_client_!.send(p) ;
                
            })
            .catch((err) => {
                this.logger_.error('Error connecting to sync server: ' + err.message) ;
            }) ;
    }

    private syncTablet(p: PacketObj) : void {
        let obj : any ;
        let str: string ;
        let data: Uint8Array ;

        switch(p.type_) {
            case PacketType.HelloFromCoach:
                this.receiveHello(p) ;
                let configs = this.project?.graph_mgr_?.coachConfigs || [] ;
                str = JSON.stringify(configs) ;
                data = new Uint8Array(Buffer.from(str)) ;
                p = new PacketObj(PacketType.ProvideCoachGraphs, data) ;
                this.sync_client_!.send(p) ;
                break ;

            case PacketType.ReceivedCoachGraphcs:
                this.logger_.debug('SyncTablet: received ReceivedCoachGraphcs packet') ;
                let picklists = this.project?.picklist_mgr_?.coachesPicklists || [] ;
                str = JSON.stringify(picklists) ;
                data = new Uint8Array(Buffer.from(str)) ;
                p = new PacketObj(PacketType.ProvideCoachPickLists, data) ;
                this.sync_client_!.send(p) ;
                break ;
                
                
            case PacketType.ReceivedCoachPickLists:
                this.logger_.debug('SyncTablet: received ReceivedCoachPickLists packet') ;
                p = new PacketObj(PacketType.RequestProject, new Uint8Array(0)) ;
                this.sync_client_!.send(p) ;                
                break ;

            case PacketType.Error:
                this.logger_.error('SyncTablet: received Error packet: ' + p.payloadAsString()) ;
                dialog.showErrorBox('Synchronization Error', p.payloadAsString()) ;
                p = new PacketObj(PacketType.GoodbyeFromCoach, new Uint8Array(0)) ;
                this.sync_client_!.send(p) ;                   
                break ;
            case PacketType.ProvideProject:
                this.receiveProject(p) ;
                p = new PacketObj(PacketType.RequestTeamDB, new Uint8Array(0)) ;
                this.sync_client_!.send(p) ;                
                break ;

            case PacketType.ProvideTeamDB:
                this.receiveTeamDB(p) ;
                p = new PacketObj(PacketType.RequestMatchDB, new Uint8Array(0)) ;
                this.sync_client_!.send(p) ;                
                break ;

            case PacketType.ProvideMatchDB:
                this.receiveMatchDB(p) ;
                p = new PacketObj(PacketType.RequestTeamForm, new Uint8Array(0)) ;
                this.sync_client_!.send(p) ;                 
                break ;

            case PacketType.ProvideTeamForm:
                this.logger_.debug('SyncTablet: received ProvideTeamForm packet') ;
                this.receiveTeamForm(p) ;
                p = new PacketObj(PacketType.RequestMatchForm, new Uint8Array(0)) ;
                this.sync_client_!.send(p) ;                 
                break ;

            case PacketType.ProvideMatchForm:
                this.logger_.debug('SyncTablet: received ProvideMatchForm packet') ;
                this.receiveMatchForm(p) ;
                p = new PacketObj(PacketType.GoodbyeFromCoach, new Uint8Array(0)) ;
                this.sync_client_!.send(p) ;
                this.finishSync() ;                
                break ;
        }
    }

    private finishSync() : void {
        let evfile = path.join(this.sync_project_file_, 'event.json') ;
        this.openEvent(evfile)
        .then(() => {
            let form = path.join(this.sync_project_file_, 'match.json') ;
            this.project?.form_mgr_?.setMatchForm(form) ;

            form = path.join(this.sync_project_file_, 'team.json') ;
            this.project?.form_mgr_?.setTeamForm(form) ;

            this.sync_project_file_ = '' ;
            this.sendNavData() ;
        }) ;
    }

    private receiveHello(p: PacketObj) : void {
        this.logger_.debug('SyncTablet: received HelloFromCoach packet') ;
        try {
            let obj = JSON.parse(p.payloadAsString()) ;
            if (this.project && this.project.info?.uuid_ && obj.uuid !== this.project.info.uuid_) {
                alert('The connected event does not match the currently loaded event.');
                //
                // We have an event loaded and it does not match
                //
                this.sync_client_!!.close() ;
                return ;
            }
        }
        catch(err) {
        }    
    }

    private receiveTeamForm(p: PacketObj) : void {
        let str : string = p.payloadAsString() ;
        let fname = path.join(this.sync_project_file_, 'team.json') ;
        fs.writeFileSync(fname, str) ;
    }

    private receiveMatchForm(p: PacketObj) : void {
        let str : string = p.payloadAsString() ;
        let fname = path.join(this.sync_project_file_, 'match.json') ;
        fs.writeFileSync(fname, str) ;
    }

    private receiveProject(p: PacketObj) : void {
        this.logger_.debug('SyncTablet: received ProvideProject packet') ;        
        let str : string = p.payloadAsString() ;
        let info : any = JSON.parse(str) ;
        this.sync_project_file_ = this.getProjectDir(info) ;

        if (!fs.existsSync(this.sync_project_file_)) {
            fs.mkdirSync(this.sync_project_file_, { recursive: true }) ;
        }

        fs.writeFileSync(path.join(this.sync_project_file_, 'event.json'), str) ;
    }

    private receiveTeamDB(p: PacketObj) : void {
        this.logger_.debug('SyncTablet: received ProvideTeamDB packet') ;        
        let fname = path.join(this.sync_project_file_, 'team.db') ;
        fs.writeFileSync(fname, p.data_) ;
    }

    private receiveMatchDB(p: PacketObj) : void {
        this.logger_.debug('SyncTablet: received ProvideMatchDB packet') ;        
        let fname = path.join(this.sync_project_file_, 'match.db') ;
        fs.writeFileSync(fname, p.data_) ;        
    }

    private getProjectDir(info:any) : string {
        let dir : string = path.join(this.appdir_, 'projects', info.uuid_) ;
        return dir ;
    }
}