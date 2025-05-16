import {  XeroApp  } from "../../apps/xeroapp.js";
import {  XeroRect  } from "../../widgets/xerogeom.js";
import {  XeroView  } from "../xeroview.js";
import {  BooleanControl  } from "./controls/booleanctrl.js";
import {  MultipleChoiceControl  } from "./controls/choicectrl.js";
import {  FormControl  } from "./controls/formctrl.js";
import {  LabelControl  } from "./controls/labelctrl.js";
import {  SelectControl  } from "./controls/selectctrl.js";
import {  TextControl  } from "./controls/textctrl.js";
import {  TimerControl  } from "./controls/timerctrl.js";
import {  UpDownControl  } from "./controls/updownctrl.js";
import {  FormObject  } from "./formobj.js";

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
    private currentSectionIndex_: number = -1 ;

    private titlediv_? : HTMLDivElement ;
    private bardiv_? : HTMLDivElement ;
    private formimg_? : HTMLImageElement ;
    private form_ctrls_: FormControl[] = [] ;

    private timer_map_: Map<string, TimerStatus> = new Map<string, TimerStatus>() ;

    public constructor(app: XeroApp, type: any) {
        super(app, 'xero-form-view');

        this.type_ = type;

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

    private formCallback(args: any) : void {
        this.initDisplay() ;

        this.form_ = new FormObject(args.form.json) ;
        if (this.form_) {
                // Make sure we have the images for the sections.
            this.updateImages() ;
            this.formViewUpdateTabBar() ;
            this.setCurrentSectionByIndex(0) ;
        }        
    }

    private formViewUpdateTabBar() {
        if (this.bardiv_ && this.form_) {
            this.bardiv_.innerHTML = '' ;
            let index = 0 ;
            for(let section of this.form_.sections) {
                let button = document.createElement('div') ;
                button.innerText = section.name ;
                button.className = XeroScoutFormView.buttonClassUnselected ;
                button.id = section + '-button' ;
                button.section_index = index++ ;
                button.addEventListener('click', this.formViewSelectButton.bind(this)) ;
                this.bardiv_.append(button) ;
            }  
        }
        return this.bardiv_ ;
    }    

    private formViewSelectButton(event: MouseEvent) {
        if (this.bardiv_ && this.form_) {
            if (this.currentSectionIndex_ !== -1) {
                this.bardiv_.children[this.currentSectionIndex_].className = XeroScoutFormView.buttonClassUnselected ;
            }

            let index = Array.prototype.indexOf.call(this.bardiv_.children, event.target) ;
            if (index !== -1) {
                this.setCurrentSectionByIndex(index) ;
            }
        }
    }    

    private initDisplay() {
        this.reset() ;

        this.titlediv_ = document.createElement('div') ;
        this.titlediv_.className = 'xero-form-title' ;
        let tname = this.type_.charAt(0).toUpperCase() + this.type_.slice(1) ;
        this.titlediv_.innerText = tname + ' Form' ;
        this.elem.append(this.titlediv_) ;

        this.bardiv_ = document.createElement('div') ;
        this.bardiv_.className = 'xero-form-tab' ;
        this.elem.append(this.bardiv_) ;

        this.formimg_ = document.createElement('img') ;
        this.formimg_.className = 'xero-form-form' ;
        this.formimg_.style.pointerEvents = 'none' ;
        this.elem.style.userSelect = 'none' ;
        this.elem.append(this.formimg_) ;
    }

    private receiveImageData(args: any) : void {
        let name = args.name ;
        let data = args.data ;

        this.nameToImageMap_.set(name, data) ;

        if (this.form_ && this.form_.sections && this.form_.sections.length !== 0) {
            let section = this.form_.sections[this.currentSectionIndex_] ;
            if (section.image === name) {
                this.updateSectionDisplay() ;
            }
        }  
    }

    private updateSectionDisplay() {
        if (this.form_ && this.formimg_) {
            let imname = this.form_.sections[this.currentSectionIndex_].image ;
            let data = this.nameToImageMap_.get(imname) ;
            this.formimg_.src = `data:image/jpg;base64,${data}`
            this.updateControls() ;
        }
    }

    private removeExistingControls() {
        for(let entry of this.form_ctrls_) {
            if (entry.ctrl) {
                if (this.elem.contains(entry.ctrl)) {
                    this.elem.removeChild(entry.ctrl) ;
                }
            }
        }
        this.form_ctrls_ = [] ;
    }    

    private setCurrentSectionByIndex(sectionIndex: number) : boolean {
        if (!this.form_ || sectionIndex < 0 || sectionIndex >= this.form_.sections.length) {
            return false ;
        }

        if (this.bardiv_) {
            this.currentSectionIndex_ = sectionIndex ;
            this.bardiv_.children[this.currentSectionIndex_]!.className = XeroScoutFormView.buttonClassSelected ;
            this.updateSectionDisplay() ;
        }
        return true ;
    }

    updateImages() {
        if (this.form_) {
            this.form_.resetImages() ;
            for(let image of this.form_.images) {
                this.request('get-image-data', image) ;
            }
        }  
    }    

    private updateControls() {
        if (!this.form_) {
            return ;
        }

        this.removeExistingControls() ;

        let section = this.form_.sections[this.currentSectionIndex_] ;
        if (section.items) {
            for(let item of section.items) {
                let formctrl ;
                if (item.type === 'label') {
                    formctrl = new LabelControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'text') {
                    formctrl = new TextControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
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
                    console.log('Unknown form control type: ', item.type) ;
                }

                if (formctrl) {
                    this.form_ctrls_.push(formctrl) ;
                    let top = this.formimg_!.getBoundingClientRect().top ;
                    formctrl.createForScouting(this.elem, 0, top) ;
                }
            }
        }
    }    
}
