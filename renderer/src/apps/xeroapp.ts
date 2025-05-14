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

document.addEventListener('DOMContentLoaded', function () {
    let mainapp = new XeroApp() ;
}) ;

export class XeroApp extends XeroMainProcessInterface {
    private viewmap_ : Map<string, any> = new Map() ;                   // Map of view name to class

    private status_ : XeroStatusWindow ;
    private splitter_ : XeroSplitter ;
    private left_nav_pane_ : XeroNav ;
    private right_view_pane_ : XeroWidget ;
    private current_view_ : XeroView | undefined ;

    private status_overlay_ : StatusOverlay ;

    constructor() {
        super() ;
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

    public get statusBar() {
        return this.status_.statusBar() ;
    }

    private updateStatusBar(args: IPCSetStatus) {
        let logger = XeroLogger.getInstance() ;
        logger.debug(`request to update status bar to '${args.left}' '${args.middle}' '${args.right}'`) ;
        this.status_.statusBar().setLeftStatus(args.left) ;
        this.status_.statusBar().setMiddleStatus(args.middle) ;
        this.status_.statusBar().setRightStatus(args.right) ;
    }

    public updateView(args: IPCSetView) {
        let logger = XeroLogger.getInstance() ;

        this.closeCurrentView() ;

        if (!this.viewmap_.has(args.view)) {
            logger.error(`view ${args.view} not registered`) ;
        }
        else {
            let classObj = this.viewmap_.get(args.view) ;
            this.current_view_ = new classObj(this, args.args) ;
            this.right_view_pane_.elem.appendChild(this.current_view_!.elem) ;
        }
    }

    private closeCurrentView() {
        if (this.current_view_) {
            this.current_view_.close() ;
            this.right_view_pane_.elem.removeChild(this.current_view_!.elem) ;
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
