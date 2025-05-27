import {  XeroLogger  } from "../utils/xerologger.js";
import {  XeroInfoView  } from "../views/infoview.js";
import {   XeroNav   } from "../xeronav.js";
import {   XeroSelectEvent   } from "../views/selectevent.js";
import {   XeroTextView   } from "../views/textview.js";
import {   XeroView   } from "../views/xeroview.js";
import {   XeroMainProcessInterface   } from "../widgets/xerocbtarget.js";
import {   XeroSplitter   } from "../widgets/xerosplitter.js";
import {   XeroStatusWindow   } from "../widgets/xerostatus.js";
import {   XeroWidget   } from "../widgets/xerowidget.js";
import {   XeroAssignTablets   } from "../views/assigntablets.js";
import {   XeroEditFormView   } from "../views/forms/editformview.js";
import {   XeroScoutFormView   } from "../views/forms/scoutformview.js";
import {   XeroTeamStatus   } from "../views/teamstatus.js";
import {   XeroMatchStatus   } from "../views/matchstatus.js";
import {   StatusOverlay   } from "../status/StatusOverlay.js";
import {   XeroTeamDatabaseView   } from "../views/teamdbview.js";
import {   XeroMatchDatabaseView   } from "../views/matchdbview.js";
import {   IPCSetStatus, IPCSetView   } from "../ipc.js";
import { HintManager } from "../hintmgr.js";
import { ImageDataSource } from "./imagesrc.js";

let mainapp: XeroApp | undefined = undefined ;

document.addEventListener('DOMContentLoaded', function () {
    // Initialize the XeroScout app
    console.log("XeroApp DOMContentLoaded - creating app") ;
    mainapp = new XeroApp() ;
});

export type XeroAppType = 'central' | 'scout' | 'coach' ;

export class XeroApp extends XeroMainProcessInterface {
    private viewmap_ : Map<string, any> = new Map() ;                   // Map of view name to class

    private status_? : XeroStatusWindow ;
    private splitter_? : XeroSplitter ;
    private left_nav_pane_? : XeroNav ;
    private right_view_pane_? : XeroWidget ;
    private current_view_ : XeroView | undefined ;
    private hintdb_? : HintManager ;
    private status_overlay_? : StatusOverlay ;
    private image_src_? : ImageDataSource ;
    private type_? : XeroAppType ;

    constructor() {
        super() ;

        console.log(`XeroApp constructor called`) ;
        this.registerCallback('xero-app-init', this.init.bind(this)) ;
    }

    private init(type: XeroAppType) {
        this.type_ = type ;
        this.hintdb_ = new HintManager() ;
        this.image_src_ = new ImageDataSource() ;

        let body = document.getElementsByTagName("body")[0] ;

        this.left_nav_pane_ = new XeroNav() ;
        this.right_view_pane_ = new XeroWidget('div', "xero-view-pane") ;
        this.splitter_ = new XeroSplitter("horizontal", this.left_nav_pane_, this.right_view_pane_) ;
        this.splitter_.setSplit(5) ;

        this.status_overlay_ = new StatusOverlay(this.right_view_pane_) ;

        this.status_ = new XeroStatusWindow(this.splitter_) ;
        this.status_.setParent(body) ;

        this.status_.statusBar().setLeftStatus("Xero App - Ready") ;

        this.registerCallback('update-main-window-view', this.updateView.bind(this)) ;
        this.registerCallback('send-app-status', this.updateStatusBar.bind(this)) ;
        this.registerViews() ;
    }

    public get imageSource() {
        return this.image_src_ ;
    }

    public get statusBar() {
        return this.status_!.statusBar() ;
    }

    public get hintDB() {
        return this.hintdb_ ;
    }

    private updateStatusBar(args: IPCSetStatus) {
        let logger = XeroLogger.getInstance() ;
        this.status_!.statusBar().setLeftStatus(args.left) ;
        this.status_!.statusBar().setMiddleStatus(args.middle) ;
        this.status_!.statusBar().setRightStatus(args.right) ;
    }

    public updateView(args: IPCSetView) {
        let logger = XeroLogger.getInstance() ;

        if (this.current_view_ && !this.current_view_.okToClose) {
            return ;
        }

        this.closeCurrentView() ;
        if (!this.viewmap_.has(args.view)) {
            logger.error(`view ${args.view} not registered`) ;
        }
        else {
            let classObj = this.viewmap_.get(args.view) ;
            this.current_view_ = new classObj(this, args.args) ;
        }
    }

    private closeCurrentView() {
        if (this.current_view_) {
            this.current_view_.close() ;
            this.right_view_pane_!.elem.removeChild(this.current_view_!.elem) ;
            this.current_view_ = undefined ;
        }
    }

    private registerView(view: string, viewclass: any) {
        this.viewmap_.set(view, viewclass) ;
    }

    private registerViews() {
        this.registerView('text', XeroTextView) ;
        this.registerView('info', XeroInfoView) ;
        this.registerView('select-event', XeroSelectEvent) ;
        this.registerView('assign-tablets', XeroAssignTablets) ;
        this.registerView('form-edit', XeroEditFormView) ;
        this.registerView('form-scout', XeroScoutFormView) ;
        this.registerView('team-status', XeroTeamStatus) ;
        this.registerView('team-db', XeroTeamDatabaseView) ;
        this.registerView('match-status', XeroMatchStatus) ;
        this.registerView('match-db', XeroMatchDatabaseView) ;
    }
}
