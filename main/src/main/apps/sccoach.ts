import * as path from "path";
import * as fs from "fs";
import { BrowserWindow, dialog, Menu, MenuItem } from "electron";
import { SCBase, XeroAppType } from "./scbase";
import { SyncClient } from "../sync/syncclient";
import { TCPClient } from "../sync/tcpclient";
import { PacketObj } from "../sync/packetobj";
import { PacketType } from "../sync/packettypes";
import { Project } from "../project/project";

export class SCCoach extends SCBase {
    private static readonly lastEventLoaded: string = 'coach-last-event-loaded' ;

    private static readonly viewInit: string = 'view-init' ;
	private static readonly viewTeamStatus: string = 'view-team-status';
	private static readonly viewTeamDB: string = 'view-team-db';
	private static readonly viewMatchStatus: string = 'view-match-status';
	private static readonly viewMatchDB: string = 'view-match-db';
	private static readonly viewSingleTeamSummary: string = 'view-single-team-summary' ;
    private static readonly viewPicklist: string = 'view-picklist' ;
	private static readonly viewPlayoffs: string = 'view-playoffs' ;

    private static readonly syncEventLocal: string = "sync-event-local" ;
    private static readonly syncEventRemote: string = "sync-event-remote" ;
    private static readonly syncEventWiFi: string = "sync-event-wifi" ;
    private static readonly syncEventIPAddr: string = "sync-event-ipaddr" ;

    private sync_client_? : SyncClient ;    
    private project_? : Project ;

    public constructor(win: BrowserWindow, args: string[]) {
        super(win, 'coach') ;
    }

    public get applicationType() : XeroAppType { 
        return XeroAppType.Coach ;
    }

	public mainWindowLoaded(): void {
		this.appInit() ;

        let lastevent = this.getSetting(SCCoach.lastEventLoaded) ;
        if (lastevent && typeof lastevent === 'string' && lastevent.length > 0) {
            let evfile = path.join(lastevent, 'event.json') ;
            Project.openEvent(this.logger_, evfile, 2025)
                .then( (proj: Project) => {
                    this.project_ = proj ;
                } )
                .catch( (err: Error) => {
                    this.logger_.error('Error reopening last event: ' + err.message) ;
                } ) ;   
        }
    }    
    
    public basePage() : string  {
        return "content/main.html"
    }
    
    public canQuit(): boolean {
        return true ;
    }

    public close() : void {
        if (this.project_) {
            this.setSetting(SCCoach.lastEventLoaded, this.project_.location) ;
        }
    }

	public sendNavData(): void {
		let treedata = [];
		let dims = 40 ;

		if (this.project_) {
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

        switch(p.type_) {
            case PacketType.HelloFromCoach:
                this.logger_.debug('SyncTablet: received HelloFromCoach packet') ;
                try {
                    obj = JSON.parse(p.payloadAsString()) ;
                    if (this.project_ && this.project_.info?.uuid_ && obj.uuid !== this.project_.info.uuid_) {
                        //
                        // We have an event loaded and it does not match
                        //
                        this.sync_client_!!.close() ;
                        return ;
                    }
                    p = new PacketObj(PacketType.RequestProject, new Uint8Array(0)) ;
                    this.sync_client_!.send(p) ;
                    
                }
                catch(err) {
                }                
                break ;

            case PacketType.Error:
                this.logger_.error('SyncTablet: received Error packet: ' + p.payloadAsString()) ;
                dialog.showErrorBox('Synchronization Error', p.payloadAsString()) ;
                p = new PacketObj(PacketType.GoodbyeFromCoach, new Uint8Array(0)) ;
                this.sync_client_!.send(p) ;                   
                break ;
            case PacketType.ProvideProject:
                this.logger_.debug('SyncTablet: received ProvideProject packet') ;
                this.receiveProject(p) ;
                p = new PacketObj(PacketType.RequestTeamDB, new Uint8Array(0)) ;
                this.sync_client_!.send(p) ;                
                break ;

            case PacketType.ProvideTeamDB:
                this.logger_.debug('SyncTablet: received ProvideTeamDB packet') ;
                this.receiveTeamDB(p) ;
                p = new PacketObj(PacketType.RequestMatchDB, new Uint8Array(0)) ;
                this.sync_client_!.send(p) ;                
                break ;

            case PacketType.ProvideMatchDB:
                this.logger_.debug('SyncTablet: received ProvideMatchDB packet') ;
                this.receiveMatchDB(p) ;
                p = new PacketObj(PacketType.GoodbyeFromCoach, new Uint8Array(0)) ;
                this.sync_client_!.send(p) ;                 
                break ;
        }
    }

    private receiveProject(p: PacketObj) : void {
        let str : string = p.payloadAsString() ;
        let info : any = JSON.parse(str) ;
        let pdir: string = this.getProjectDir(info) ;

        if (!fs.existsSync(pdir)) {
            fs.mkdirSync(pdir, { recursive: true }) ;
        }

        this.project_ = new Project(this.logger_, this.getProjectDir(info), 2025) ;
        this.project_.init(info) ;

        this.project_.writeEventFile() ;
    }

    private receiveTeamDB(p: PacketObj) : void {
        let fname = path.join(this.project_!.location, 'team.db') ;
        fs.writeFileSync(fname, p.data_) ;
    }

    private receiveMatchDB(p: PacketObj) : void {
        let fname = path.join(this.project_!.location, 'match.db') ;
        fs.writeFileSync(fname, p.data_) ;        
    }

    private getProjectDir(info:any) : string {
        let dir : string = path.join(this.appdir_, 'projects', info.uuid_) ;
        return dir ;
    }
}