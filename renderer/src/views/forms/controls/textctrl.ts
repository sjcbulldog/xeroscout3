import {  IPCTextItem, IPCTypedDataValue  } from "../../../shared/ipc.js";
import { DataValue } from "../../../shared/datavalue.js";;
import {  XeroRect  } from "../../../shared/xerogeom.js";
import {  XeroView  } from "../../xeroview.js";
import {  EditFormControlDialog  } from "../dialogs/editformctrldialog.js";
import {  EditLabelDialog  } from "../dialogs/editlabeldialog.js";
import {  EditTextDialog  } from "../dialogs/edittextdialog.js";
import {  FormControl  } from "./formctrl.js";

export class TextControl extends FormControl {
    private static item_desc_ : IPCTextItem = 
    {
        type: 'text',
        placeholder: 'Enter Text Here',
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
        datatype: 'string',
        transparent: true,
    } ;

    constructor(view: XeroView, tag: string, bounds: XeroRect) {
        super(view, TextControl.item_desc_) ;
        this.setTag(tag) ;
        this.setBounds(bounds) ;
    }

    public copyObject() : FormControl {
        return new TextControl(this.view, this.item.tag, this.bounds) ;
    }    

    public updateFromItem(editing: boolean, scale: number, xoff: number, yoff: number) : void {
        if (this.ctrl) {
            let item = this.item as IPCTextItem ;
            let ctrl = this.ctrl as HTMLInputElement ;

            this.setPosition(scale, xoff, yoff) ;
            
            if (editing) {
                ctrl.value = item.placeholder ;
            }
            else {
                ctrl.placeholder = item.placeholder ;
            }

            ctrl.style.fontFamily = item.fontFamily ;
            ctrl.style.fontSize = item.fontSize + 'px' ;
            ctrl.style.fontWeight = item.fontWeight ;
            ctrl.style.fontStyle = item.fontStyle ;
            ctrl.style.color = item.color ;
            ctrl.style.backgroundColor = item.background ;
        }
    }

    public createForEdit(parent: HTMLElement, xoff: number, yoff: number) : void  {
        super.createForEdit(parent, xoff, yoff) ;
        let input = document.createElement('input') ;
        this.setClassList(input, 'edit') ;
        input.disabled = true ;

        this.ctrl = input ;
        this.updateFromItem(true, 1.0, xoff, yoff) ;
        parent.appendChild(this.ctrl) ;
    }

    public createForScouting(parent: HTMLElement, scale: number, xoff: number, yoff: number) : void {
        console.log(`Creating TextControl for scouting with scale ${scale}, xoff ${xoff}, yoff ${yoff}`) ;
        
        let input = document.createElement('input') ;
        this.setClassList(input, 'scout') ;
        this.ctrl = input ;
        
        if (this.item.datatype === 'integer') {
            input.type = 'number' ;
            input.step = '1' ;
        }
        else if (this.item.datatype === 'real') {
            input.type = 'number' ;
            input.step = 'any' ;
        }
        else if (this.item.datatype === 'string') {
            input.type = 'text' ;
        }

        this.updateFromItem(false, scale, xoff, yoff) ;
        parent.appendChild(this.ctrl);
    }

    public createEditDialog() : EditFormControlDialog  {
        return new EditTextDialog(this) ;
    }

    public getData() :  IPCTypedDataValue | undefined  {
        let input = this.ctrl as HTMLInputElement ;
        return DataValue.fromString(input.value) ;
    }

    public setData(data:IPCTypedDataValue) : void {
        if(this.ctrl) { 
            let str: string = '' ;
            if (this.item.datatype === 'integer' && DataValue.isInteger(data)) {
                str = DataValue.toDisplayString(data) ;
            }
            else if (this.item.datatype === 'real' && DataValue.isNumber(data)) {
                str = DataValue.toDisplayString(data) ;                
            }
            else if (this.item.datatype === 'string' && DataValue.isString(data)) {
                str = DataValue.toDisplayString(data) ;                
            }

            let ctrl : HTMLInputElement = this.ctrl as HTMLInputElement ;
            ctrl.value = str ;

            console.log(`Setting text control data (type = '${this.item.datatype}' to '${str}'`) ;
            console.log(`    Input Type ${ctrl.type}`) ;
            console.log(`    After Delay - Value ${ctrl.value}`) ;
        }
    }
}
