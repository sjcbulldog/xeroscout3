import {  IPCTimerItem, IPCTypedDataValue  } from "../../../shared/ipc.js";
import { DataValue } from "../../../shared/datavalue.js";;
import {  XeroRect  } from "../../../shared/xerogeom.js";
import {  XeroView  } from "../../xeroview.js";
import {  EditFormControlDialog  } from "../dialogs/editformctrldialog.js";
import {  EditTimerDialog  } from "../dialogs/edittimerdialog.js";
import {  XeroScoutFormView  } from "../scoutformview.js";
import {  FormControl  } from "./formctrl.js";

export class TimerControl extends FormControl {
    private static item_desc_ : IPCTimerItem = {
        type: 'timer',
        tag: '',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: 'black',
        background: 'white',
        fontFamily: 'Arial',
        fontSize: 36,
        fontWeight: 'normal',
        fontStyle: 'normal',
        datatype: 'integer',
        transparent: true,
    }

    private start_stop_button_? : HTMLButtonElement ;
    private current_time_? : HTMLSpanElement ;

    constructor(view: XeroView, tag: string, bounds: XeroRect) {
        super(view, TimerControl.item_desc_) ;
        this.setTag(tag) ;
        this.setBounds(bounds) ;
    }

    public copyObject() : FormControl {
        return new TimerControl(this.view, this.item.tag, this.bounds) ;
    }

    public updateFromItem(editing: boolean, scale: number, xoff: number, yoff: number) : void {
        if (this.ctrl) {
            let item = this.item as IPCTimerItem ;
            this.setPosition(scale, xoff, yoff) ;

            this.start_stop_button_!.style.backgroundColor = item.background ;
            this.start_stop_button_!.style.color = item.color ;
            this.start_stop_button_!.style.fontFamily = item.fontFamily ;
            this.start_stop_button_!.style.fontSize = item.fontSize + 'px' ;
            this.start_stop_button_!.style.fontWeight = item.fontWeight ;
            this.start_stop_button_!.style.fontStyle = item.fontStyle ;

            this.current_time_!.style.backgroundColor = item.background ;
            this.current_time_!.style.color = item.color ;
            this.current_time_!.style.fontFamily = item.fontFamily ;
            this.current_time_!.style.fontSize = item.fontSize + 'px' ;
            this.current_time_!.style.fontWeight = item.fontWeight ;
            this.current_time_!.style.fontStyle = item.fontStyle ;
        }
    }

    private startStopTimer() : void {
        if (this.view instanceof XeroScoutFormView) {
            let view = this.view as XeroScoutFormView ;
            if (view.isTimerRunning(this.item.tag)) {
                view.stopTimer(this.item.tag) ;
                this.start_stop_button_!.innerText = 'Start' ;
            }
            else {
                view.startTimer(this.item.tag, this.displayTimer.bind(this)) ;
                this.start_stop_button_!.innerText = 'Stop' ;
            }
        }
    }

    private displayTimer() : void {
        if (this.current_time_ && this.view instanceof XeroScoutFormView) {
            let view = this.view as XeroScoutFormView ;
            let value = view.getTimerValue(this.item.tag) ;
            let minutes = Math.floor(value / 60) ;
            let seconds = Math.floor(value % 60) ;
            let tenths = Math.floor((value - Math.floor(value)) * 10) ;
            this.current_time_!.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}` ;
        }
    }

    public createForEdit(parent: HTMLElement, xoff: number, yoff: number): void {
        super.createForEdit(parent, xoff, yoff) ;        
        let item = this.item as IPCTimerItem ;
        this.ctrl = document.createElement('div') ;
        this.setClassList(this.ctrl, 'edit') ;

        this.current_time_ = document.createElement('span') ;
        this.setClassList(this.current_time_, 'edit', 'timer') ;
        this.current_time_!.innerText = '00:00.0' ;
        this.ctrl.appendChild(this.current_time_!) ;

        this.start_stop_button_ = document.createElement('button') ;
        this.setClassList(this.start_stop_button_, 'edit', 'button') ;
        this.start_stop_button_!.innerText = 'Start' ;
        this.start_stop_button_!.disabled = true ;
        this.ctrl.appendChild(this.start_stop_button_!) ;

        this.updateFromItem(true, 1.0, xoff, yoff) ;

        parent.appendChild(this.ctrl) ;
    }

    public createForScouting(parent: HTMLElement, scale: number, xoff: number, yoff: number): void {
        let item = this.item as IPCTimerItem ;
        this.ctrl = document.createElement('div') ;
        this.setClassList(this.ctrl, 'scout') ;

        this.current_time_ = document.createElement('span') ;
        this.setClassList(this.current_time_, 'scout', 'timer') ;
        this.current_time_!.innerText = '00:00.0' ;
        this.ctrl.appendChild(this.current_time_!) ;

        this.start_stop_button_ = document.createElement('button') ;
        this.setClassList(this.start_stop_button_, 'scout', 'button') ;
        this.start_stop_button_!.innerText = 'Start' ;
        this.start_stop_button_!.addEventListener('click', this.startStopTimer.bind(this)) ;
        this.ctrl.appendChild(this.start_stop_button_!) ;
        this.updateFromItem(false, scale, xoff, yoff) ;
        
        if (this.view instanceof XeroScoutFormView) {
            let view = this.view as XeroScoutFormView ;
            if (view.isTimerRunning(this.item.tag)) {
                this.start_stop_button_!.innerText = 'Stop' ;
                view.setCallback(this.item.tag, this.displayTimer.bind(this)) ;
            }
        }

        parent.appendChild(this.ctrl) ;
    }

    public createEditDialog() : EditFormControlDialog {
        return new EditTimerDialog(this) ;
    }

    public getData() :  IPCTypedDataValue | undefined  {
        let ret : IPCTypedDataValue | undefined = undefined ;

        if (this.view instanceof XeroScoutFormView) {
            let view = this.view as XeroScoutFormView ;
            ret = DataValue.fromReal(this.view.getTimerValue(this.item.tag)) ;
        }
        return ret;
    }

    public setData(data:IPCTypedDataValue) : void {
        if (this.current_time_ && this.view instanceof XeroScoutFormView && DataValue.isNumber(data)) {
            let view = this.view as XeroScoutFormView ;
            let value = DataValue.toReal(data) ;
            view.setTimerValue(this.item.tag, value) ;
            this.displayTimer() ;
        }
    }  
}
    