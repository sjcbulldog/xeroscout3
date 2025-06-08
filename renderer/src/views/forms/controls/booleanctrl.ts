import {  IPCBooleanItem, IPCTypedDataValue  } from "../../../shared/ipc.js";
import { DataValue } from "../../../utils/datavalue.js";
import {  XeroRect  } from "../../../shared/xerogeom.js";
import {  XeroView  } from "../../xeroview.js";
import {  EditBooleanDialog  } from "../dialogs/editbooleandialog.js";
import {  EditFormControlDialog  } from "../dialogs/editformctrldialog.js";
import {  FormControl  } from "./formctrl.js";

export class BooleanControl extends FormControl {
    private static item_desc_ : IPCBooleanItem = {
        type: 'boolean',
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
        datatype: 'boolean',
        transparent: true,
        accent: 'lightgreen',
    }

    private input_? : HTMLInputElement ;

    constructor(view: XeroView, tag: string, bounds: XeroRect) {
        super(view, BooleanControl.item_desc_) ;
        this.setTag(tag) ;
        this.setBounds(bounds) ;
    }

    public copyObject() : FormControl {
        return new BooleanControl(this.view, this.item.tag, this.bounds) ;
    }

    public updateFromItem(editing: boolean, scale: number, xoff: number, yoff: number) : void {
        if (this.ctrl) {
            let item = this.item as IPCBooleanItem ;
            let ctrl = this.ctrl as HTMLInputElement ;

            this.setPosition(scale, xoff, yoff) ;

            ctrl.style.fontFamily = item.fontFamily ;
            ctrl.style.fontSize = item.fontSize + 'px' ;
            ctrl.style.fontWeight = item.fontWeight ;
            ctrl.style.fontStyle = item.fontStyle ;
            ctrl.style.color = item.color ;
            ctrl.style.accentColor = item.accent ;
            ctrl.style.backgroundColor = item.background ;
        }
    }

    public createForEdit(parent: HTMLElement, xoff: number, yoff: number) : void  {
        super.createForEdit(parent, xoff, yoff) ;
        this.ctrl = document.createElement('div') ;
        this.setClassList(this.ctrl, 'edit') ;

        this.input_ = document.createElement('input') ;
        this.setClassList(this.input_, 'edit', 'checkbox') ;
        this.input_.type = 'checkbox' ;
        this.input_.disabled = true ;
        this.updateFromItem(true, 1.0, xoff, yoff) ;
        this.ctrl.appendChild(this.input_) ;
        parent.appendChild(this.ctrl) ;
    }
    
    public createForScouting(parent: HTMLElement, scale: number, xoff: number, yoff: number) : void {
        this.ctrl = document.createElement('div') ;        
        this.setClassList(this.ctrl, 'scout') ;

        this.input_ = document.createElement('input') ;
        this.setClassList(this.input_, 'scout', 'checkbox') ;
        this.input_.type = 'checkbox' ;
        this.updateFromItem(false, scale, xoff, yoff) ;
        this.ctrl.appendChild(this.input_) ;
        parent.appendChild(this.ctrl) ;
    }

    public createEditDialog() : EditFormControlDialog {
        return new EditBooleanDialog(this) ;
    }

    public getData() : IPCTypedDataValue {
        return DataValue.fromBoolean(this.input_!.checked) ;
    }

    public setData(data:IPCTypedDataValue) : void {
        if (this.input_) {
            if (DataValue.isBoolean(data)) {
                this.input_.checked = DataValue.toBoolean(data) ;
            }
        }
    }
}
