import {  XeroApp  } from "../../apps/xeroapp.js";
import {  IPCFormScoutData, IPCNamedDataValue, IPCSection } from "../../ipc.js";
import {  XeroLogger } from "../../utils/xerologger.js";
import {  XeroRect, XeroSize  } from "../../widgets/xerogeom.js";
import {  XeroTabbedWidget } from "../../widgets/xerotabbedwidget.js";
import {  XeroView  } from "../xeroview.js";
import {  BooleanControl  } from "./controls/booleanctrl.js";
import {  BoxControl } from "./controls/boxctrl.js";
import {  MultipleChoiceControl  } from "./controls/choicectrl.js";
import { FormControl } from "./controls/formctrl.js";
import { ImageControl } from "./controls/imagectrl.js";
import {  LabelControl  } from "./controls/labelctrl.js";
import {  SelectControl  } from "./controls/selectctrl.js";
import {  TextAreaControl } from "./controls/textareactrl.js";
import {  TextControl  } from "./controls/textctrl.js";
import {  TimerControl  } from "./controls/timerctrl.js";
import {  UpDownControl  } from "./controls/updownctrl.js";
import { XeroFormDataValues } from "./formdatavalues.js";
import {  FormObject  } from "./formobj.js";
import {  XeroFormScoutSectionPage } from "./scoutpage.js";
import { TimerStatus } from "./timerstatus.js";

export class XeroScoutFormView extends XeroView {
    static buttonClassUnselected = 'xero-form-tab-button-unselected' ;
    static buttonClassSelected = 'xero-form-tab-button-selected' ;

    private nameToImageMap_: Map<string, string> = new Map<string, string>() ;    
    private form_? : FormObject ;
    private data_? : XeroFormDataValues ;
    private type_: string ;

    private tabbed_ctrl_? : XeroTabbedWidget ;
    private section_pages_ : XeroFormScoutSectionPage[] = [] ;
    private titlediv_? : HTMLElement ;
    private tabdiv_? : HTMLElement ;

    private form_info_? : IPCFormScoutData

    private timer_map_: Map<string, TimerStatus> = new Map<string, TimerStatus>() ;

    public constructor(app: XeroApp, type: any) {
        super(app, 'xero-form-view');

        this.type_ = type;

        this.registerCallback('send-form', this.formCallback.bind(this));
        this.registerCallback('send-image-data', this.receiveImageData.bind(this)) ;   
        this.registerCallback('request-results', this.provideResults.bind(this)) ;
        this.registerCallback('send-initial-values', this.initForm.bind(this)) ;
        this.request('get-form', this.type_);        

        this.data_ = new XeroFormDataValues() ;
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
    }

    private findControlByTag(tag: string) : FormControl | undefined {
        for(let page of this.section_pages_) {
            let control = page.getControlByTag(tag) ;
            if (control) {
                return control ;
            }
        }
        return undefined ;
    }

    private provideResults() {
        this.beforeSectionChanged(this.tabbed_ctrl_!.selectedPageNumber, -1) ;
        this.request('provide-result', this.data_!.values) ;
    }

    private initForm(values: IPCNamedDataValue[]) : void {
        this.data_ = new XeroFormDataValues(values) ;
        for(let one of values) {
            let ctrl = this.findControlByTag(one.tag) ;
            if (ctrl) {
                ctrl.setData(one.value) ;
            }
        }
    }

    private setCurrentSectionByIndex(sectionIndex: number) : boolean {
        if (!this.form_ || sectionIndex < 0 || sectionIndex >= this.form_.sections.length) {
            return false ;
        }

        this.tabbed_ctrl_!.selectPage(sectionIndex) ;
        return true ;
    }    

    private formCallback(args: IPCFormScoutData) : void {
        this.form_info_ = args ;
        this.initDisplay() ;

        if (this.form_info_.form) {
            this.form_ = new FormObject(args.form!) ;
            if (this.form_) {
                    // Make sure we have the images for the sections.
                this.updateImages() ;
                this.createSectionPages() ;
                this.setCurrentSectionByIndex(0) ;
            }        
        }
    }

    private createSectionPages() {
        for(let section of this.form_!.sections) {
            this.createSectionPage(section) ;
        }
    }   

    private createSectionPage(section: IPCSection) : void { 
        let image = this.nameToImageMap_.get(section.image) ;
        if (!image) {
            throw new Error(`XeroScoutFormView: image ${section.image} not found`) ;
        }
        let page = new XeroFormScoutSectionPage(new XeroSize(section.imageSize!.width, section.imageSize!.height), image!) ;
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

        this.tabdiv_ = document.createElement('div') ;
        this.tabdiv_.className = 'xero-form-tab-div' ;
        this.elem.append(this.tabdiv_) ;

        this.tabbed_ctrl_ = new XeroTabbedWidget() ;
        this.tabbed_ctrl_.setParent(this.tabdiv_) ;        

        this.tabbed_ctrl_.on('beforeSelectPage', this.beforeSectionChanged.bind(this)) ;
        this.tabbed_ctrl_.on('afterSelectPage', this.afterSectionChanged.bind(this)) ;        
    }

    private receiveImageData(args: any) : void {
        let name = args.name ;
        let data = args.data ;

        this.nameToImageMap_.set(name, data) ;

        if (this.form_ && this.form_.sections && this.form_.sections.length !== 0) {
            let section = this.form_.sections[this.tabbed_ctrl_!.selectedPageNumber] ;
            if (section.image === name) {
                this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].setImage(data) ;
            }
        }     
    }

    private updateImages() {
        if (this.form_) {
            this.form_.resetImages() ;
            for(let image of this.form_.images) {
                this.request('get-image-data', image) ;
            }
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
                }
            }
        }
    }    

    private afterSectionChanged(oldpage: number, newpage: number) : void {
        if (newpage !== -1) {
            this.section_pages_[newpage].doLayout() ;            
            if (this.data_) {
                for(let ctrl of this.section_pages_[newpage].controls) {
                    let data = this.data_!.get(ctrl.item.tag) ;
                    if (data) {
                        ctrl.setData(data) ;
                    }
                }
            }
        }        
    }
}
