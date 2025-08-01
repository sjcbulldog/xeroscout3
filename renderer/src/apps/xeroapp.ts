import {  XeroLogger  } from "../utils/xerologger.js";
import {  XeroInfoView  } from "../views/infoview.js";
import {  XeroNav   } from "../xeronav.js";
import {  XeroSelectEvent   } from "../views/selectevent.js";
import {  XeroTextView   } from "../views/textview.js";
import {  XeroView   } from "../views/xeroview.js";
import {  XeroMainProcessInterface   } from "../widgets/xerocbtarget.js";
import {  XeroSplitter   } from "../widgets/xerosplitter.js";
import {  XeroStatusWindow   } from "../widgets/xerostatus.js";
import {  XeroWidget   } from "../widgets/xerowidget.js";
import {  XeroAssignTablets   } from "../views/assigntablets.js";
import {  XeroEditFormView   } from "../views/forms/editformview.js";
import {  XeroScoutFormView   } from "../views/forms/scoutformview.js";
import {  XeroTeamStatus   } from "../views/teamstatus.js";
import {  XeroMatchStatus   } from "../views/matchstatus.js";
import {  MessageOverlay   } from "../messages/messageoverlay.js";
import {  XeroTeamDatabaseView   } from "../views/teamdbview.js";
import {  XeroMatchDatabaseView   } from "../views/matchdbview.js";
import {  IPCAppInit, IPCAppType, IPCSetStatus, IPCSetView   } from "../shared/ipc.js";
import { HintManager } from "./hintmgr.js";
import { ImageDataSource } from "./imagesrc.js";
import { XeroSelectTablet } from "../views/selecttablet/selecttablet.js";
import { XeroSyncIPAddrView } from "../views/syncipaddr/syncipaddr.js";
import { ResizeBar } from "./resizebar.js";
import { XeroFormulasView } from "../views/formulas/formulas.js";
import { XeroPlayoffsView } from "../views/playoffs/playoffs.js";
import { DataSetEditor } from "../views/dataset/datasetedit.js";
import { SingleTeamView } from "../views/singleteam/singleteamview.js";

let mainapp: XeroApp | undefined = undefined ;

document.addEventListener('DOMContentLoaded', function () {
    // Initialize the XeroScout app
    mainapp = new XeroApp() ;
});

export class XeroApp extends XeroMainProcessInterface {
    private viewmap_ : Map<string, any> = new Map() ;                   // Map of view name to class

    private resize_bar_: ResizeBar ;
    private status_? : XeroStatusWindow ;
    private splitter_? : XeroSplitter ;
    private left_nav_pane_? : XeroNav ;
    private right_view_pane_? : XeroWidget ;
    private current_view_ : XeroView | undefined ;
    private hintdb_? : HintManager ;
    private message_overlay_? : MessageOverlay ;
    private image_src_? : ImageDataSource ;
    private type_? : IPCAppType ;

    constructor() {
        super() ;

        this.resize_bar_ = new ResizeBar(50, true) ;
        this.resize_bar_.elem.style.display = 'none' ;
        this.resize_bar_.elem.style.left = '0px' ;
        this.resize_bar_.elem.style.top = '100px' ;
        this.resize_bar_.on('resized', this.resizeBarChangedSize.bind(this)) ;

        this.registerCallback('xero-app-init', this.init.bind(this)) ;
        this.registerCallback('resize-window', this.resizeWinow.bind(this)) ;
        this.registerCallback('tablet-title', this.setTabletTitle.bind(this)) ;
    }

    private init(init: IPCAppInit) {
        let logger_ = XeroLogger.getInstance() ;
        logger_.debug(`XeroApp init called with type ${init.type}`) ;

        this.type_ = init.type ;
        this.hintdb_ = new HintManager() ;
        this.image_src_ = new ImageDataSource() ;

        let body = document.getElementsByTagName("body")[0] ;

        this.left_nav_pane_ = new XeroNav() ;
        this.right_view_pane_ = new XeroWidget('div', "xero-view-pane") ;
        this.splitter_ = new XeroSplitter("horizontal", this.left_nav_pane_, this.right_view_pane_) ;
        this.splitter_.on('changed', this.splitterChanged.bind(this)) ;
        this.splitter_.position = init.splitter || 10 ;

        this.message_overlay_ = new MessageOverlay(this.right_view_pane_) ;

        this.status_ = new XeroStatusWindow(this.splitter_) ;
        this.status_.setParent(body) ;

        this.registerCallback('update-main-window-view', this.updateView.bind(this)) ;
        this.registerCallback('send-app-status', this.updateStatusBar.bind(this)) ;
        this.registerViews() ;
    }

    private setTabletTitle(title: string) {
        document.title = title ;
    }

    private resizeWinow() {
        if (this.status_) {
            this.resize_bar_.elem.style.display = 'flex' ;
            this.status_.elem.appendChild(this.resize_bar_.elem) ;
        }
    }

    private resizeBarChangedSize(pcnt: number) {
        if (this.splitter_) {
            this.splitter_.position = pcnt ;
            this.resize_bar_.elem.style.display = 'none' ;
        }
    }

    private splitterChanged() {
        this.request('splitter-changed', this.splitter_!.position) ;
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

    public get messageOverlay() {
        return this.message_overlay_ ;
    }

    private processArg(arg: string | undefined) : string | undefined {
        return arg ;
    }

    private updateStatusBar(args: IPCSetStatus) {
        let logger = XeroLogger.getInstance() ;
        this.status_!.statusBar().setLeftStatus(this.processArg(args.left)) ;
        this.status_!.statusBar().setMiddleStatus(this.processArg(args.middle)) ;
        this.status_!.statusBar().setRightStatus(this.processArg(args.right)) ;
    }

    public updateView(args: IPCSetView) {
        let logger = XeroLogger.getInstance() ;

        if (args === undefined || args.view === undefined) {
            const obj = {
                stack: ''
            };
            Error.captureStackTrace(obj);
            console.log(obj.stack) ;
            logger.error("updateView called with undefined args or view") ;
        }

        if (this.current_view_ && !this.current_view_.isOkToClose) {
            return ;
        }

        if (!this.closeCurrentView()) {
            return ;
        }
        if (!this.viewmap_.has(args.view)) {
            logger.error(`view ${args.view} not registered`) ;
            args.args = [`View ${args.view} not a valid view`] ;
            args.view = 'text' ; // Default to text view

        }

        let classObj = this.viewmap_.get(args.view) ;
        this.current_view_ = new classObj(this, args.args) ;
        this.right_view_pane_!.elem.appendChild(this.current_view_!.elem) ;
        this.current_view_!.onVisible() ;
    }

    private closeCurrentView() : boolean {
        let ret = true ;
        if (this.current_view_) {
            if (this.current_view_.isOkToClose) {
                this.current_view_.close() ;
                if (this.right_view_pane_!.elem && this.right_view_pane_!.elem.contains(this.current_view_!.elem)) {
                    this.right_view_pane_!.elem.removeChild(this.current_view_!.elem) ;
                }
                this.current_view_ = undefined ;
            }
            else {
                ret = false ;
            }
        }

        return ret;
    }

    private registerView(view: string, viewclass: any, programs: IPCAppType[]) {
        if (this.type_ && programs.includes(this.type_)) {
            this.viewmap_.set(view, viewclass) ;
        }
    }

    private registerViews() {
        this.registerView('text', XeroTextView, ['central', 'scout']) ;
        this.registerView('info', XeroInfoView, ['central']) ;
        this.registerView('select-event', XeroSelectEvent, ['central']) ;
        this.registerView('assign-tablets', XeroAssignTablets, ['central']) ;
        this.registerView('form-edit', XeroEditFormView, ['central']) ;
        this.registerView('form-scout', XeroScoutFormView, ['central', 'scout']) ;
        this.registerView('team-status', XeroTeamStatus, ['central']) ;
        this.registerView('team-db', XeroTeamDatabaseView, ['central']) ;
        this.registerView('match-status', XeroMatchStatus, ['central']) ;
        this.registerView('match-db', XeroMatchDatabaseView, ['central']) ;
        this.registerView('select-tablet', XeroSelectTablet, ['scout']) ;
        this.registerView('sync-ipaddr', XeroSyncIPAddrView, ['scout']);
        this.registerView('formulas', XeroFormulasView, ['central']) ;
        this.registerView('playoffs', XeroPlayoffsView, ['central', 'scout']) ;
        this.registerView('datasets', DataSetEditor, ['central']) ;
        this.registerView('singleteam', SingleTeamView, ['central']) ;
    }
}
