import { IPCStopwatchItem, IPCTypedDataValue } from "../../../shared/ipc.js";
import { DataValue } from "../../../shared/datavalue.js";
import { XeroRect } from "../../../shared/xerogeom.js";
import { XeroView } from "../../xeroview.js";
import { EditFormControlDialog } from "../dialogs/editformctrldialog.js";
import { EditStopwatchDialog } from "../dialogs/editstopwatchdialog.js";
import { XeroScoutFormView } from "../scoutformview.js";
import { FormControl } from "./formctrl.js";

export class StopwatchControl extends FormControl {
    private static item_desc_: IPCStopwatchItem = {
        type: 'stopwatch',
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
        datatype: 'real',
        transparent: true,
        holdMode: true,
    } ;

    private start_stop_button_? : HTMLSpanElement ;
    private current_time_? : HTMLSpanElement ;

    constructor(view: XeroView, tag: string, bounds: XeroRect) {
        super(view, StopwatchControl.item_desc_) ;
        this.setTag(tag) ;
        this.setBounds(bounds) ;
    }

    public copyObject(): FormControl {
        return new StopwatchControl(this.view, this.item.tag, this.bounds) ;
    }

    public updateFromItem(editing: boolean, scale: number, xoff: number, yoff: number): void {
        if (this.ctrl) {
            let item = this.item as IPCStopwatchItem ;
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

            this.updateButtonText(this.view instanceof XeroScoutFormView && this.view.isStopwatchRunning(this.item.tag)) ;
        }
    }

    public positionUpdated() : void {
        super.positionUpdated() ;
        this.applyLayout() ;
    }

    private startStopwatchSegment(): void {
        if (this.view instanceof XeroScoutFormView) {
            let view = this.view as XeroScoutFormView ;
            if (!view.isStopwatchRunning(this.item.tag)) {
                view.startStopwatch(this.item.tag, this.displayStopwatch.bind(this)) ;
                this.updateButtonText(true) ;
            }
        }
    }

    private stopStopwatchSegment(): void {
        if (this.view instanceof XeroScoutFormView) {
            let view = this.view as XeroScoutFormView ;
            if (view.isStopwatchRunning(this.item.tag)) {
                view.stopStopwatch(this.item.tag) ;
                this.updateButtonText(false) ;
            }
        }
    }

    private toggleStopwatch(): void {
        if (!(this.view instanceof XeroScoutFormView)) {
            return ;
        }

        let view = this.view as XeroScoutFormView ;
        if (view.isStopwatchRunning(this.item.tag)) {
            this.stopStopwatchSegment() ;
        }
        else {
            this.startStopwatchSegment() ;
        }
    }

    private displayStopwatch(): void {
        if (this.current_time_ && this.view instanceof XeroScoutFormView) {
            let view = this.view as XeroScoutFormView ;
            let value = view.getStopwatchValue(this.item.tag) ;
            let minutes = Math.floor(value / 60) ;
            let seconds = Math.floor(value % 60) ;
            let tenths = Math.floor((value - Math.floor(value)) * 10) ;
            this.current_time_!.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}` ;
        }
    }

    public createForEdit(parent: HTMLElement, xoff: number, yoff: number): void {
        super.createForEdit(parent, xoff, yoff) ;

        this.ctrl = document.createElement('div') ;
        this.setClassList(this.ctrl, 'edit') ;

        this.current_time_ = document.createElement('span') ;
        this.setClassList(this.current_time_, 'edit', 'timer') ;
        this.current_time_!.innerText = '00:00.0' ;
        this.ctrl.appendChild(this.current_time_!) ;

        this.start_stop_button_ = document.createElement('span') ;
        this.setClassList(this.start_stop_button_, 'edit', 'button') ;
        this.updateButtonText(false) ;
        this.ctrl.appendChild(this.start_stop_button_!) ;

        this.applyLayout() ;
        this.updateFromItem(true, 1.0, xoff, yoff) ;
        parent.appendChild(this.ctrl) ;
    }

    public createForScouting(parent: HTMLElement, scale: number, xoff: number, yoff: number): void {
        this.ctrl = document.createElement('div') ;
        this.setClassList(this.ctrl, 'scout') ;

        this.current_time_ = document.createElement('span') ;
        this.setClassList(this.current_time_, 'scout', 'timer') ;
        this.current_time_!.innerText = '00:00.0' ;
        this.ctrl.appendChild(this.current_time_!) ;

        this.start_stop_button_ = document.createElement('span') ;
        this.setClassList(this.start_stop_button_, 'scout', 'button') ;
        this.updateButtonText(false) ;
        this.ctrl.appendChild(this.start_stop_button_!) ;

        if (this.isHoldMode()) {
            this.ctrl.addEventListener('pointerdown', (ev) => {
                ev.preventDefault() ;
                this.startStopwatchSegment() ;
                this.ctrl!.setPointerCapture(ev.pointerId) ;
            }) ;
            this.ctrl.addEventListener('pointerup', () => {
                this.stopStopwatchSegment() ;
            }) ;
            this.ctrl.addEventListener('pointerleave', () => {
                this.stopStopwatchSegment() ;
            }) ;
            this.ctrl.addEventListener('pointercancel', () => {
                this.stopStopwatchSegment() ;
            }) ;
        }
        else {
            this.ctrl.addEventListener('click', (ev) => {
                ev.preventDefault() ;
                this.toggleStopwatch() ;
            }) ;
        }

        this.applyLayout() ;
        this.updateFromItem(false, scale, xoff, yoff) ;

        if (this.view instanceof XeroScoutFormView) {
            let view = this.view as XeroScoutFormView ;
            let running = view.isStopwatchRunning(this.item.tag) ;
            if (running) {
                view.setStopwatchCallback(this.item.tag, this.displayStopwatch.bind(this)) ;
            }
            this.updateButtonText(running) ;
            this.displayStopwatch() ;
        }

        parent.appendChild(this.ctrl) ;
    }

    public createEditDialog(): EditFormControlDialog {
        return new EditStopwatchDialog(this) ;
    }

    public getData(): IPCTypedDataValue | undefined {
        if (this.view instanceof XeroScoutFormView) {
            let view = this.view as XeroScoutFormView ;
            return DataValue.fromReal(view.getStopwatchValue(this.item.tag)) ;
        }
        return undefined ;
    }

    public setData(data: IPCTypedDataValue): void {
        if (!(this.view instanceof XeroScoutFormView)) {
            return ;
        }

        let view = this.view as XeroScoutFormView ;
        if (DataValue.isString(data)) {
            view.setStopwatchSerialized(this.item.tag, DataValue.toString(data)) ;
        }

        if (this.start_stop_button_) {
            if (view.isStopwatchRunning(this.item.tag)) {
                this.updateButtonText(true) ;
                view.setStopwatchCallback(this.item.tag, this.displayStopwatch.bind(this)) ;
            }
            else {
                this.updateButtonText(false) ;
            }
        }

        this.displayStopwatch() ;
    }

    private applyLayout() : void {
        if (!this.ctrl || !this.current_time_ || !this.start_stop_button_) {
            return ;
        }

        this.ctrl.style.display = 'flex' ;
        this.ctrl.style.flexDirection = 'column' ;
        this.ctrl.style.alignItems = 'center' ;
        this.ctrl.style.justifyContent = 'center' ;
        this.ctrl.style.gap = '4px' ;
        this.ctrl.style.boxSizing = 'border-box' ;
        this.ctrl.style.padding = '6px' ;
        this.ctrl.style.border = '1px solid #c8c8c8' ;
        this.ctrl.style.borderRadius = '8px' ;
        this.ctrl.style.backgroundColor = '#f2f2f2' ;

        this.current_time_.style.flex = '1 1 auto' ;
        this.current_time_.style.minWidth = '0' ;
        this.current_time_.style.whiteSpace = 'nowrap' ;
        this.current_time_.style.overflow = 'hidden' ;
        this.current_time_.style.textOverflow = 'ellipsis' ;
        this.current_time_.style.textAlign = 'center' ;

        this.start_stop_button_.style.flex = '0 0 auto' ;
        this.start_stop_button_.style.textAlign = 'center' ;
    }

    private isHoldMode() : boolean {
        let item = this.item as IPCStopwatchItem ;
        return item.holdMode ?? true ;
    }

    private updateButtonText(running: boolean) : void {
        if (!this.start_stop_button_) {
            return ;
        }

        if (this.isHoldMode()) {
            this.start_stop_button_.innerText = running ? 'Release' : 'Hold' ;
        }
        else {
            this.start_stop_button_.innerText = running ? 'Stop' : 'Start' ;
        }
    }
}
