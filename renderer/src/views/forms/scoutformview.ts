import {  XeroApp  } from "../../apps/xeroapp.js";
import {  IPCDatabaseData, IPCFormScoutData, IPCNamedDataValue, IPCScoutResult, IPCSection } from "../../shared/ipc.js";
import {  XeroLogger } from "../../utils/xerologger.js";
import {  XeroRect, XeroSize  } from "../../shared/xerogeom.js";
import {  XeroTabbedWidget } from "../../widgets/xerotabbedwidget.js";
import {  XeroView  } from "../xeroview.js";
import { DataValue } from "../../shared/datavalue.js";
import {  BooleanControl  } from "./controls/booleanctrl.js";
import {  BoxControl } from "./controls/boxctrl.js";
import {  MultipleChoiceControl  } from "./controls/choicectrl.js";
import { FormControl } from "./controls/formctrl.js";
import { ImageControl } from "./controls/imagectrl.js";
import {  LabelControl  } from "./controls/labelctrl.js";
import {  SelectControl  } from "./controls/selectctrl.js";
import {  TextAreaControl } from "./controls/textareactrl.js";
import {  TextControl  } from "./controls/textctrl.js";
import { StopwatchControl } from "./controls/stopwatchctrl.js";
import {  TimerControl  } from "./controls/timerctrl.js";
import { AutoPlanControl } from "./controls/autoplanctrl.js";
import { AutoSelectorControl } from "./controls/autoselectorctrl.js";
import { RobotPhotoControl } from "./controls/robotphotoctrl.js";
import {  UpDownControl  } from "./controls/updownctrl.js";
import { XeroFormDataValues } from "./formdatavalues.js";
import {  FormObject  } from "./formobj.js";
import {  XeroFormScoutSectionPage } from "./scoutpage.js";
import { StopwatchStatus } from "./stopwatchstatus.js";
import { TimerStatus } from "./timerstatus.js";
import { ConfirmScoutDialog } from "./dialogs/confirmscoutdialog.js";
import { PreviewTempDBDialog } from "./dialogs/previewtempdbdialog.js";

type XeroScoutFormDraft = {
    version: 1 ;
    savedAt: number ;
    sectionIndex: number ;
    values: IPCNamedDataValue[] ;
    timers: { [key: string]: { value: number ; running: boolean ; } } ;
    stopwatches: { [key: string]: string } ;
} ;

export class XeroScoutFormView extends XeroView {
    static buttonClassUnselected = 'xero-form-tab-button-unselected' ;
    static buttonClassSelected = 'xero-form-tab-button-selected' ;
    private static readonly draftStoragePrefix = 'xero-form-draft:' ;

    private form_? : FormObject ;
    private data_ : XeroFormDataValues ;
    private type_: string ;

    private tabbed_ctrl_? : XeroTabbedWidget ;
    private section_pages_ : XeroFormScoutSectionPage[] = [] ;
    private titlediv_? : HTMLElement ;
    private tabdiv_? : HTMLElement ;

    private confirm_dialog_? : ConfirmScoutDialog ;

    private form_info_? : IPCFormScoutData

    private timer_map_: Map<string, TimerStatus> = new Map<string, TimerStatus>() ;
    private stopwatch_map_: Map<string, StopwatchStatus> = new Map<string, StopwatchStatus>() ;

    private preview_toolbar_? : HTMLDivElement ;
    private preview_view_db_button_? : HTMLButtonElement ;
    private preview_reset_db_button_? : HTMLButtonElement ;
    private preview_update_timer_? : any ;
    private preview_event_handler_? : (ev: Event) => void ;
    private preview_db_dialog_? : PreviewTempDBDialog ;
    private preview_open_dialog_requested_ : boolean = false ;
    private preview_restored_from_db_ : boolean = false ;

    private flip_field_180_ : boolean = false ;
    private draft_update_timer_? : any ;
    private draft_event_handler_? : (ev: Event) => void ;
    private before_unload_handler_? : () => void ;
    private page_hide_handler_? : () => void ;
    private visibility_change_handler_? : () => void ;
    private restored_draft_ : boolean = false ;
    private restored_draft_section_index_ : number = 0 ;
    private draft_cleared_ : boolean = false ;

    public constructor(app: XeroApp, type: any) {
        super(app, 'xero-form-view');

        this.type_ = type;

        this.registerCallback('send-form', this.receivedForm.bind(this));
        this.registerCallback('request-results', this.provideResults.bind(this)) ;
        this.registerCallback('send-preview-match-db', this.receivedPreviewMatchDB.bind(this)) ;
        this.request('get-form', this.type_);        

        this.data_ = new XeroFormDataValues() ;
        this.draft_event_handler_ = this.formInteracted.bind(this) ;
        this.elem.addEventListener('input', this.draft_event_handler_, true) ;
        this.elem.addEventListener('change', this.draft_event_handler_, true) ;
        this.elem.addEventListener('click', this.draft_event_handler_, true) ;

        this.before_unload_handler_ = this.flushDraftNow.bind(this) ;
        this.page_hide_handler_ = this.flushDraftNow.bind(this) ;
        this.visibility_change_handler_ = this.documentVisibilityChanged.bind(this) ;
        window.addEventListener('beforeunload', this.before_unload_handler_) ;
        window.addEventListener('pagehide', this.page_hide_handler_) ;
        document.addEventListener('visibilitychange', this.visibility_change_handler_) ;

        if (this.isCentralMatchPreview()) {
            this.preview_event_handler_ = this.previewInteracted.bind(this) ;
            this.elem.addEventListener('input', this.preview_event_handler_, true) ;
            this.elem.addEventListener('change', this.preview_event_handler_, true) ;
            this.elem.addEventListener('click', this.preview_event_handler_, true) ;
        }
    }

    public close() {
        this.flushDraftNow() ;
        this.resetAllTimersAndStopwatches() ;

        for (let page of this.section_pages_) {
            page.close() ;
        }
        this.section_pages_ = [] ;

        if (this.draft_event_handler_) {
            this.elem.removeEventListener('input', this.draft_event_handler_, true) ;
            this.elem.removeEventListener('change', this.draft_event_handler_, true) ;
            this.elem.removeEventListener('click', this.draft_event_handler_, true) ;
            this.draft_event_handler_ = undefined ;
        }

        if (this.before_unload_handler_) {
            window.removeEventListener('beforeunload', this.before_unload_handler_) ;
            this.before_unload_handler_ = undefined ;
        }

        if (this.page_hide_handler_) {
            window.removeEventListener('pagehide', this.page_hide_handler_) ;
            this.page_hide_handler_ = undefined ;
        }

        if (this.visibility_change_handler_) {
            document.removeEventListener('visibilitychange', this.visibility_change_handler_) ;
            this.visibility_change_handler_ = undefined ;
        }

        if (this.preview_event_handler_) {
            this.elem.removeEventListener('input', this.preview_event_handler_, true) ;
            this.elem.removeEventListener('change', this.preview_event_handler_, true) ;
            this.elem.removeEventListener('click', this.preview_event_handler_, true) ;
            this.preview_event_handler_ = undefined ;
        }

        if (this.draft_update_timer_) {
            clearTimeout(this.draft_update_timer_) ;
            this.draft_update_timer_ = undefined ;
        }

        if (this.preview_update_timer_) {
            clearTimeout(this.preview_update_timer_) ;
            this.preview_update_timer_ = undefined ;
        }

        if (this.preview_db_dialog_) {
            this.preview_db_dialog_.close(false) ;
            this.preview_db_dialog_ = undefined ;
        }

        super.close() ;
    }

    public getActiveTeamResult(): IPCScoutResult | undefined {
        return this.form_info_?.activeTeamResult ;
    }

    public getScoutItemId(): string | undefined {
        return this.form_info_?.scoutItem ;
    }

    public getFormInfo(): IPCFormScoutData | undefined {
        return this.form_info_ ;
    }

    private isCentralMatchPreview() : boolean {
        return this.app.appType === 'central' && this.type_ === 'match' ;
    }

    public isTimerRunning(tag: string) : boolean {
        let ret = false ;
        if (this.timer_map_.has(tag)) {
            let timer = this.timer_map_.get(tag)! ;
            ret = timer.running ;
        }
        return ret ;
    }

    public startTimer(tag: string, callback: () => void) : void {
        let timer : TimerStatus ;

        if (!this.timer_map_.has(tag)) {
            timer = new TimerStatus(tag) ;
            this.timer_map_.set(tag, timer) ;
        }
        else {
            timer = this.timer_map_.get(tag)! ;
        }

        timer.start(callback) ;
    }

    public setCallback(tag: string, callback: () => void) : void {
        if (this.timer_map_.has(tag)) {
            let timer = this.timer_map_.get(tag)! ;
            timer.setCallback(callback) ;
        }
    }

    public stopTimer(tag: string) : void {
        if (this.timer_map_.has(tag)) {
            let timer = this.timer_map_.get(tag)! ;
            timer.stop() ;
        }
    }

    public getTimerValue(tag: string) : number {
        let ret = 0.0 ;
        if (this.timer_map_.has(tag)) {
            let timer = this.timer_map_.get(tag)! ;
            ret = timer.value ;
        }
        return ret ;
    }

    public setTimerValue(tag: string, value: number) : void {
        if (!this.timer_map_.has(tag)) {
            let timer = new TimerStatus(tag) ;
            this.timer_map_.set(tag, timer) ;
            timer.value = value ;
        }
    }

    public isStopwatchRunning(tag: string) : boolean {
        if (this.stopwatch_map_.has(tag)) {
            return this.stopwatch_map_.get(tag)!.running ;
        }
        return false ;
    }

    public startStopwatch(tag: string, callback: () => void) : void {
        let sw : StopwatchStatus ;
        if (!this.stopwatch_map_.has(tag)) {
            sw = new StopwatchStatus(tag) ;
            this.stopwatch_map_.set(tag, sw) ;
        }
        else {
            sw = this.stopwatch_map_.get(tag)! ;
        }
        sw.start(callback) ;
    }

    public stopStopwatch(tag: string) : void {
        if (this.stopwatch_map_.has(tag)) {
            this.stopwatch_map_.get(tag)!.stop() ;
        }
    }

    public setStopwatchCallback(tag: string, callback: () => void) : void {
        if (this.stopwatch_map_.has(tag)) {
            this.stopwatch_map_.get(tag)!.setCallback(callback) ;
        }
    }

    public getStopwatchValue(tag: string) : number {
        if (this.stopwatch_map_.has(tag)) {
            return this.stopwatch_map_.get(tag)!.value ;
        }
        return 0.0 ;
    }

    public getStopwatchSerialized(tag: string) : string {
        let sw : StopwatchStatus ;
        if (!this.stopwatch_map_.has(tag)) {
            sw = new StopwatchStatus(tag) ;
            this.stopwatch_map_.set(tag, sw) ;
        }
        else {
            sw = this.stopwatch_map_.get(tag)! ;
        }
        return JSON.stringify(sw.toJSON()) ;
    }

    public setStopwatchSerialized(tag: string, value: string) : void {
        let sw : StopwatchStatus ;
        if (!this.stopwatch_map_.has(tag)) {
            sw = new StopwatchStatus(tag) ;
            this.stopwatch_map_.set(tag, sw) ;
        }
        else {
            sw = this.stopwatch_map_.get(tag)! ;
        }

        try {
            sw.load(JSON.parse(value)) ;
        }
        catch {
        }
    }

    private scoutDataConfirmed(changed: boolean) {
        this.request('provide-result', this.data_!.values) ;
        this.clearDraft() ;
    }

    private provideResults() {
        // This extracts the results from the current section
        this.beforeSectionChanged(this.tabbed_ctrl_!.selectedPageNumber, -1) ;     
        this.scoutDataConfirmed(true) ;   
    }

    private setCurrentSectionByIndex(sectionIndex: number) : boolean {
        if (!this.form_ || sectionIndex < 0 || sectionIndex >= this.form_.sections.length) {
            return false ;
        }

        this.tabbed_ctrl_!.selectPage(sectionIndex) ;
        return true ;
    }    

    private receivedForm(args: IPCFormScoutData) : void {
        this.form_info_ = args ;
        this.data_ = new XeroFormDataValues() ;
        this.preview_restored_from_db_ = false ;
        this.preview_open_dialog_requested_ = false ;
        this.restored_draft_ = false ;
        this.restored_draft_section_index_ = 0 ;
        this.draft_cleared_ = false ;

        this.loadInitialData(args.initialValues) ;
        this.restoreDraft() ;
        this.initDisplay() ;

        if (this.form_info_.form) {
            this.form_ = new FormObject(args.form!) ;
            if (this.form_) {
                this.createSectionPages() ;
                if (!this.setCurrentSectionByIndex(this.restored_draft_section_index_)) {
                    this.setCurrentSectionByIndex(0) ;
                }
            }        
        }

        if (this.isCentralMatchPreview() && this.preview_view_db_button_) {
            this.preview_view_db_button_.disabled = false ;
            this.request('get-preview-match-db') ;
        }
    }

    private createSectionPages() {
        for(let section of this.form_!.sections) {
            this.createSectionPage(section) ;
        }
    }   

    private createSectionPage(section: IPCSection) : void { 
        let sz = new XeroSize(1024, 768) ;
        if (this.form_info_?.form?.tablet.size) {
            sz = new XeroSize(this.form_info_!.form.tablet.size.width, this.form_info_!.form.tablet.size.height) ;
        }
        let page = new XeroFormScoutSectionPage(
            this.app,
            this.data_!,
            sz,
            this.form_info_!.color || 'blue',
            this.form_info_!.reversed || false,
            this.form_info_!.mirrorx,
            this.form_info_!.mirrory
        ) ;
        page.setFlipField180(this.flip_field_180_) ;
        this.tabbed_ctrl_!.addPage(section.name, page.elem) ;
        this.section_pages_.push(page) ;
        this.updateControls(section, page) ;
    }    

    private initDisplay() {
        this.reset() ;

        this.titlediv_ = document.createElement('div') ;
        this.titlediv_.className = 'xero-form-title' ;
        this.titlediv_.innerText = this.form_info_!.title || 'Xero Form - Untilted' ;
        if (this.form_info_?.color) {
            this.titlediv_.style.color = this.form_info_!.color ;
        }
        this.elem.append(this.titlediv_) ;

        if (this.isCentralMatchPreview()) {
            this.preview_toolbar_ = document.createElement('div') ;
            this.preview_toolbar_.className = 'xero-form-preview-toolbar' ;

            this.preview_reset_db_button_ = document.createElement('button') ;
            this.preview_reset_db_button_.className = 'xero-form-preview-toolbar-button' ;
            this.preview_reset_db_button_.innerText = 'Reset Temp DB' ;
            this.preview_reset_db_button_.addEventListener('click', this.resetPreviewMatchDB.bind(this)) ;
            this.preview_toolbar_.appendChild(this.preview_reset_db_button_) ;

            this.preview_view_db_button_ = document.createElement('button') ;
            this.preview_view_db_button_.className = 'xero-form-preview-toolbar-button' ;
            this.preview_view_db_button_.innerText = 'View Temp DB' ;
            this.preview_view_db_button_.disabled = true ;
            this.preview_view_db_button_.addEventListener('click', this.viewPreviewMatchDB.bind(this)) ;
            this.preview_toolbar_.appendChild(this.preview_view_db_button_) ;

            this.elem.appendChild(this.preview_toolbar_) ;
        }

        this.tabdiv_ = document.createElement('div') ;
        this.tabdiv_.className = 'xero-form-tab-div' ;
        this.elem.append(this.tabdiv_) ;

        this.tabbed_ctrl_ = new XeroTabbedWidget() ;
        this.tabbed_ctrl_.setParent(this.tabdiv_) ;        

        this.tabbed_ctrl_.on('beforeSelectPage', this.beforeSectionChanged.bind(this)) ;
        this.tabbed_ctrl_.on('afterSelectPage', this.afterSectionChanged.bind(this)) ;        
    }

    private loadInitialData(values?: IPCNamedDataValue[]) : void {
        if (!values) {
            return ;
        }

        for(let one of values) {
            this.data_.set(one.tag, one.value) ;
        }
    }

    private updateControls(section: IPCSection, page: XeroFormScoutSectionPage) : void {
        if (section.items) {
            for(let item of section.items) {
                let formctrl ;
                if (item.type === 'label') {
                    formctrl = new LabelControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'image') {
                    formctrl = new ImageControl(this.app.imageSource!, this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'box') {
                    formctrl = new BoxControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'text') {
                    formctrl = new TextControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'textarea') {
                    formctrl = new TextAreaControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'boolean') {  
                    formctrl = new BooleanControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'updown') {
                    formctrl = new UpDownControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'choice') {
                    formctrl = new MultipleChoiceControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'select') {
                    formctrl = new SelectControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'timer') {
                    formctrl = new TimerControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'stopwatch') {
                    formctrl = new StopwatchControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'autoplan') {
                    formctrl = new AutoPlanControl(this.app.imageSource!, this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'autoselector') {
                    formctrl = new AutoSelectorControl(this.app.imageSource!, this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'robotphoto') {
                    formctrl = new RobotPhotoControl(this.app.imageSource!, this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else {
                    let logger = XeroLogger.getInstance() ;
                    logger.warn(`XeroEditFormView: unknown form control type ${item.type}`) ;
                }

                if (formctrl) {
                    page.addControl(formctrl) ;
                }
            }
        }
    }

    private beforeSectionChanged(oldpage: number, newpage: number) : void {
        if (oldpage !== -1) {
            if (this.data_) {
                for(let ctrl of this.section_pages_[oldpage].controls) {
                    let value = ctrl.getData() ;
                    if (value) {
                        this.data_!.set(ctrl.item.tag, value) ;
                    }

                    if (ctrl.item.type === 'stopwatch') {
                        this.data_!.set(ctrl.item.tag + '_segments', DataValue.fromString(this.getStopwatchSerialized(ctrl.item.tag))) ;
                    }
                }
            }
        }

        if (this.isCentralMatchPreview()) {
            this.sendPreviewTempDBUpdate() ;
        }

        this.scheduleDraftSave() ;
    }    

    private afterSectionChanged(oldpage: number, newpage: number) : void {
        if (newpage !== -1) {
            this.section_pages_[newpage].doLayout() ;            
        }        
    }

    private previewInteracted(ev: Event) {
        if (!this.isCentralMatchPreview()) {
            return ;
        }

        let target = ev.target as any ;
        if (target instanceof HTMLElement) {
            if (target.closest('.xero-form-preview-toolbar')) {
                return ;
            }
        }

        this.schedulePreviewTempDBUpdate() ;
    }

    private formInteracted(ev: Event) {
        let target = ev.target as any ;
        if (target instanceof HTMLElement) {
            if (target.closest('.xero-form-preview-toolbar')) {
                return ;
            }
        }

        this.scheduleDraftSave() ;
    }

    private documentVisibilityChanged() {
        if (document.visibilityState === 'hidden') {
            this.flushDraftNow() ;
        }
    }

    private scheduleDraftSave() {
        this.draft_cleared_ = false ;

        if (this.draft_update_timer_) {
            clearTimeout(this.draft_update_timer_) ;
        }

        this.draft_update_timer_ = setTimeout(this.flushDraftNow.bind(this), 200) ;
    }

    private flushDraftNow() {
        if (this.draft_update_timer_) {
            clearTimeout(this.draft_update_timer_) ;
            this.draft_update_timer_ = undefined ;
        }

        let key = this.getDraftStorageKey() ;
        if (!key) {
            return ;
        }

        if (this.draft_cleared_) {
            return ;
        }

        let draft = this.captureDraft() ;
        if (!draft) {
            return ;
        }

        try {
            window.localStorage.setItem(key, JSON.stringify(draft)) ;
        }
        catch {
        }
    }

    private captureDraft() : XeroScoutFormDraft | undefined {
        if (!this.tabbed_ctrl_) {
            return undefined ;
        }

        this.captureCurrentSectionToDataValues() ;

        let timers: { [key: string]: { value: number ; running: boolean ; } } = {} ;
        for (let [key, timer] of this.timer_map_) {
            timers[key] = {
                value: timer.value,
                running: timer.running,
            } ;
        }

        let stopwatches: { [key: string]: string } = {} ;
        for (let [key] of this.stopwatch_map_) {
            stopwatches[key] = this.getStopwatchSerialized(key) ;
        }

        return {
            version: 1,
            savedAt: Date.now(),
            sectionIndex: this.tabbed_ctrl_.selectedPageNumber,
            values: this.data_.values.map((value) => ({ tag: value.tag, value: value.value })),
            timers: timers,
            stopwatches: stopwatches,
        } ;
    }

    private restoreDraft() {
        this.restored_draft_ = false ;
        this.restored_draft_section_index_ = 0 ;

        let key = this.getDraftStorageKey() ;
        if (!key) {
            return ;
        }

        let raw: string | null = null ;
        try {
            raw = window.localStorage.getItem(key) ;
        }
        catch {
            raw = null ;
        }

        if (!raw) {
            return ;
        }

        try {
            let draft = JSON.parse(raw) as XeroScoutFormDraft ;
            if (!draft || draft.version !== 1) {
                return ;
            }

            this.data_ = new XeroFormDataValues() ;
            this.loadInitialData(this.form_info_?.initialValues) ;
            this.loadInitialData(draft.values) ;

            this.restoreTimersFromDraft(draft) ;
            this.restoreStopwatchesFromDraft(draft) ;

            this.restored_draft_ = true ;
            this.restored_draft_section_index_ = draft.sectionIndex >= 0 ? draft.sectionIndex : 0 ;
        }
        catch {
        }
    }

    private restoreTimersFromDraft(draft: XeroScoutFormDraft) {
        let elapsedSeconds = Math.max(0, Date.now() - draft.savedAt) / 1000.0 ;
        for (let key of Object.keys(draft.timers)) {
            let timer = draft.timers[key] ;
            this.setTimerValue(key, timer.value + (timer.running ? elapsedSeconds : 0.0)) ;
            if (timer.running) {
                this.startTimer(key, () => {}) ;
            }
        }
    }

    private restoreStopwatchesFromDraft(draft: XeroScoutFormDraft) {
        for (let key of Object.keys(draft.stopwatches)) {
            this.setStopwatchSerialized(key, draft.stopwatches[key]) ;
        }
    }

    private getDraftStorageKey() : string | undefined {
        if (!this.form_info_?.draftKey) {
            return undefined ;
        }

        return XeroScoutFormView.draftStoragePrefix + this.form_info_.draftKey ;
    }

    private clearDraft() {
        this.draft_cleared_ = true ;
        let key = this.getDraftStorageKey() ;
        if (!key) {
            return ;
        }

        try {
            window.localStorage.removeItem(key) ;
        }
        catch {
        }
    }

    private schedulePreviewTempDBUpdate() {
        if (this.preview_update_timer_) {
            clearTimeout(this.preview_update_timer_) ;
            this.preview_update_timer_ = undefined ;
        }

        this.preview_update_timer_ = setTimeout(this.flushPreviewTempDBUpdate.bind(this), 200) ;
    }

    private captureControlsToDataValues(ctrls: FormControl[]) {
        for (let ctrl of ctrls) {
            let value = ctrl.getData() ;
            if (value) {
                this.data_.set(ctrl.item.tag, value) ;
            }

            if (ctrl.item.type === 'stopwatch') {
                this.data_.set(ctrl.item.tag + '_segments', DataValue.fromString(this.getStopwatchSerialized(ctrl.item.tag))) ;
            }
        }
    }

    private captureCurrentSectionToDataValues() {
        if (!this.tabbed_ctrl_) {
            return ;
        }

        let page = this.tabbed_ctrl_.selectedPageNumber ;
        if (page >= 0 && page < this.section_pages_.length) {
            this.captureControlsToDataValues(this.section_pages_[page].controls) ;
        }
    }

    private sendPreviewTempDBUpdate() {
        if (!this.isCentralMatchPreview()) {
            return ;
        }

        this.request('update-preview-match-db', this.data_.values) ;

        if (this.preview_db_dialog_) {
            this.request('get-preview-match-db') ;
        }
    }

    private flushPreviewTempDBUpdate() {
        this.preview_update_timer_ = undefined ;
        if (!this.isCentralMatchPreview()) {
            return ;
        }

        this.captureCurrentSectionToDataValues() ;
        this.sendPreviewTempDBUpdate() ;
    }

    private resetPreviewMatchDB() {
        if (!this.isCentralMatchPreview()) {
            return ;
        }

        this.request('reset-preview-match-db') ;
        this.clearDraft() ;
        this.restored_draft_ = false ;

        this.data_.clear() ;
        this.resetAllTimersAndStopwatches() ;

        if (this.tabbed_ctrl_) {
            let page = this.tabbed_ctrl_.selectedPageNumber ;
            if (page >= 0 && page < this.section_pages_.length) {
                this.section_pages_[page].doLayout() ;
            }
        }

        if (this.preview_db_dialog_) {
            this.request('get-preview-match-db') ;
        }
    }

    private viewPreviewMatchDB() {
        if (!this.isCentralMatchPreview()) {
            return ;
        }

        this.captureCurrentSectionToDataValues() ;
        this.request('update-preview-match-db', this.data_.values) ;

        this.preview_open_dialog_requested_ = true ;
        setTimeout(() => this.request('get-preview-match-db'), 10) ;
    }

    private receivedPreviewMatchDB(data: IPCDatabaseData) {
        if (!this.isCentralMatchPreview()) {
            return ;
        }

        if (!this.preview_restored_from_db_) {
            this.preview_restored_from_db_ = true ;
            this.applyPreviewMatchDBToForm(data) ;
        }

        if (this.preview_db_dialog_) {
            this.preview_db_dialog_.setData(data) ;
            return ;
        }

        if (this.preview_open_dialog_requested_) {
            this.preview_open_dialog_requested_ = false ;
            this.preview_db_dialog_ = new PreviewTempDBDialog(data, () => this.request('get-preview-match-db')) ;
            this.preview_db_dialog_.on('closed', () => {
                this.preview_db_dialog_ = undefined ;
            }) ;
            this.preview_db_dialog_.showCentered(this.elem) ;
        }
    }

    private applyPreviewMatchDBToForm(data: IPCDatabaseData) {
        this.clearDraft() ;
        this.restored_draft_ = false ;
        this.data_.clear() ;
        this.resetAllTimersAndStopwatches() ;

        if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
            if (this.tabbed_ctrl_) {
                let page = this.tabbed_ctrl_.selectedPageNumber ;
                if (page >= 0 && page < this.section_pages_.length) {
                    this.section_pages_[page].doLayout() ;
                }
            }
            return ;
        }

        let row = data.data[0] ;
        if (!row || typeof row !== 'object') {
            if (this.tabbed_ctrl_) {
                let page = this.tabbed_ctrl_.selectedPageNumber ;
                if (page >= 0 && page < this.section_pages_.length) {
                    this.section_pages_[page].doLayout() ;
                }
            }
            return ;
        }

        for (let key of Object.keys(row)) {
            let value = (row as any)[key] ;
            if (value && typeof value.type === 'string' && value.hasOwnProperty('value')) {
                this.data_.set(key, value) ;
            }
        }

        if (this.tabbed_ctrl_) {
            let page = this.tabbed_ctrl_.selectedPageNumber ;
            if (page >= 0 && page < this.section_pages_.length) {
                this.section_pages_[page].doLayout() ;
            }
        }
    }

    private resetAllTimersAndStopwatches() {
        for (let t of this.timer_map_.values()) {
            t.stop() ;
        }
        this.timer_map_.clear() ;

        for (let sw of this.stopwatch_map_.values()) {
            sw.clear() ;
        }
        this.stopwatch_map_.clear() ;
    }
}
