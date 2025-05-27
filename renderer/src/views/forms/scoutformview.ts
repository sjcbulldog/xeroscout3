import {  XeroApp  } from "../../apps/xeroapp.js";
import {  IPCSection } from "../../ipc.js";
import {  XeroLogger } from "../../utils/xerologger.js";
import {  XeroRect  } from "../../widgets/xerogeom.js";
import {  XeroTabbedWidget } from "../../widgets/xerotabbedwidget.js";
import {  XeroView  } from "../xeroview.js";
import {  BooleanControl  } from "./controls/booleanctrl.js";
import {  BoxControl } from "./controls/boxctrl.js";
import {  MultipleChoiceControl  } from "./controls/choicectrl.js";
import { ImageControl } from "./controls/imagectrl.js";
import {  LabelControl  } from "./controls/labelctrl.js";
import {  SelectControl  } from "./controls/selectctrl.js";
import {  TextAreaControl } from "./controls/textareactrl.js";
import {  TextControl  } from "./controls/textctrl.js";
import {  TimerControl  } from "./controls/timerctrl.js";
import {  UpDownControl  } from "./controls/updownctrl.js";
import {  FormObject  } from "./formobj.js";
import {  XeroFormScoutSectionPage } from "./scoutpage.js";

class TimerStatus {
    public readonly name: string ;
    private running_ = false ;
    private callback_?: () => void ;
    private value_: number = 0.0 ;    
    private timer_? : any ;

    constructor(name: string) {
        this.name = name ;
    }

    public setCallback(callback: () => void) {
        if (this.running_) {
            this.callback_ = callback ;
        }
    }

    public get running() : boolean {
        return this.running_ ;
    }

    public get value() : number {
        return this.value_ ;
    }

    public set value(value: number) {
        this.value_ = value ;
        if (this.callback_) {
            this.callback_() ;
        }
    }

    public reset() {
        this.value = 0.0 ;
    }

    public start(callback: () => void) {
        this.running_ = true ;
        this.callback_ = callback ;
        this.timer_ = setInterval(this.tick.bind(this), 100) ;
    }

    public stop() {
        if (this.timer_) {
            clearInterval(this.timer_) ;
            this.timer_ = undefined ;
        }
        this.running_ = false ;
        this.callback_ = undefined ;
    }

    private tick() {
        this.value += 0.1 ;
        if (this.callback_) {
            this.callback_() ;
        }
    }
}

export class XeroScoutFormView extends XeroView {
    static buttonClassUnselected = 'xero-form-tab-button-unselected' ;
    static buttonClassSelected = 'xero-form-tab-button-selected' ;

    private nameToImageMap_: Map<string, string> = new Map<string, string>() ;    
    private form_? : FormObject ;
    private type_: string ;

    private image_src_ ;

    private tabbed_ctrl_? : XeroTabbedWidget ;
    private section_pages_ : XeroFormScoutSectionPage[] = [] ;
    private titlediv_? : HTMLElement ;
    private tabdiv_? : HTMLElement ;    

    private timer_map_: Map<string, TimerStatus> = new Map<string, TimerStatus>() ;

    public constructor(app: XeroApp, type: any) {
        super(app, 'xero-form-view');

        this.type_ = type;

        this.image_src_ = 

        this.registerCallback('send-form', this.formCallback.bind(this));
        this.registerCallback('send-image-data', this.receiveImageData.bind(this)) ;    
        this.request('get-form', this.type_);        
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

    private setCurrentSectionByIndex(sectionIndex: number) : boolean {
        if (!this.form_ || sectionIndex < 0 || sectionIndex >= this.form_.sections.length) {
            return false ;
        }

        this.tabbed_ctrl_!.selectPage(sectionIndex) ;
        return true ;
    }    

    private formCallback(args: any) : void {
        this.initDisplay() ;

        this.form_ = new FormObject(args.form.json) ;
        if (this.form_) {
                // Make sure we have the images for the sections.
            this.updateImages() ;
            this.createSectionPages() ;
            this.setCurrentSectionByIndex(0) ;
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
        let page = new XeroFormScoutSectionPage(image!) ;
        this.tabbed_ctrl_!.addPage(section.name, page.elem) ;
        this.section_pages_.push(page) ;
        this.updateControls(section, page) ;
    }    

    private initDisplay() {
        this.reset() ;

        this.titlediv_ = document.createElement('div') ;
        this.titlediv_.className = 'xero-form-title' ;
        let tname = this.type_.charAt(0).toUpperCase() + this.type_.slice(1) ;
        this.titlediv_.innerText = tname + ' Form' ;
        this.elem.append(this.titlediv_) ;

        this.tabdiv_ = document.createElement('div') ;
        this.tabdiv_.className = 'xero-form-tab-div' ;
        this.elem.append(this.tabdiv_) ;

        this.tabbed_ctrl_ = new XeroTabbedWidget() ;
        this.tabbed_ctrl_.setParent(this.tabdiv_) ;        

        this.tabbed_ctrl_.on('afterSelectPage', this.sectionChanged.bind(this)) ;        
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

    private sectionChanged() : void {
        if (this.tabbed_ctrl_!.selectedPageNumber !== -1) {
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].doLayout() ;
        }        
    }
}
