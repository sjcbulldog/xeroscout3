
import {  IPCSelectItem, IPCTypedDataValue  } from "../../../ipc.js";
import { DataValue } from "../../../utils/datavalue.js";
import {  XeroRect  } from "../../../widgets/xerogeom.js";
import {  XeroView  } from "../../xeroview.js";
import {  EditFormControlDialog  } from "../dialogs/editformctrldialog.js";
import {  EditSelectDialog  } from "../dialogs/editselectdialog.js";
import {  FormControl  } from "./formctrl.js";


export class SelectControl extends FormControl {
    private static item_desc_ : IPCSelectItem = {
        type: 'select',
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
        choices: [
            { text: 'Choice 1', value: 'choice1' },
            { text: 'Choice 2', value: 'choice2' },
            { text: 'Choice 3', value: 'choice3' },
        ],
    } ;

    constructor(view: XeroView, tag: string, bounds: XeroRect) {
        super(view, SelectControl.item_desc_) ;
        this.setTag(tag) ;
        this.setBounds(bounds) ;
    }

    public copyObject() : FormControl {
        return new SelectControl(this.view, this.item.tag, this.bounds) ;
    }

    public updateFromItem(editing: boolean, xoff: number, yoff: number) : void {
        if (this.ctrl) {
            let item = this.item as IPCSelectItem ;
            let ctrl = this.ctrl as HTMLDivElement
            
            this.setPosition(xoff, yoff) ;

            ctrl.style.color = item.color ;
            ctrl.style.backgroundColor = item.background ;
            ctrl.style.fontFamily = item.fontFamily ;
            ctrl.style.fontSize = item.fontSize + 'px' ;
            ctrl.style.fontWeight = item.fontWeight ;
            ctrl.style.fontStyle = item.fontStyle ;

            this.updateChoices(editing) ;
        }
    }

    private updateChoices(editing: boolean) : void {
        let item = this.item as IPCSelectItem ;
        let ctrl = this.ctrl as HTMLSelectElement ;

        ctrl.innerHTML = '' ;

        for (const choice of item.choices) {
            let opt = document.createElement('option') ;
            opt.value = choice.value.toString() ;
            opt.textContent = choice.text ;
            ctrl.appendChild(opt) ;
        }
    }

    public createForEdit(parent: HTMLElement, xoff: number, yoff: number) : void  {
        super.createForEdit(parent, xoff, yoff) ;        
        let item = this.item as IPCSelectItem ;

        let sel = document.createElement('select') ;
        this.setClassList(sel, 'edit') ;
        sel.disabled = true ;
        this.ctrl = sel ;
        this.setClassList(this.ctrl, 'edit') ;
        this.updateFromItem(true, xoff, yoff) ;
        parent.appendChild(this.ctrl) ;
    }

    public createForScouting(parent: HTMLElement, xoff: number, yoff: number): void {
        let item = this.item as IPCSelectItem ;

        this.ctrl = document.createElement('select') ;
        this.setClassList(this.ctrl, 'scout') ;
        this.updateFromItem(true, xoff, yoff) ;
        parent.appendChild(this.ctrl) ;
    }

    public createEditDialog() : EditFormControlDialog   {
        return new EditSelectDialog(this) ;
    }
    
    public getData() :  IPCTypedDataValue | undefined  {
        let ret : IPCTypedDataValue | undefined = undefined ;
        let ctrl = this.ctrl as HTMLSelectElement ;
        if (this.item.datatype === 'integer') {
            ret = DataValue.fromInteger(parseInt(ctrl.value)) ;
        }
        else if (this.item.datatype === 'real') {
            ret = DataValue.fromReal(parseFloat(ctrl.value)) ;
        }
        else if (this.item.datatype === 'string') {
            ret = DataValue.fromString(ctrl.value) ;
        }
        return ret ;
    }

    public setData(data:IPCTypedDataValue) : void {
        let ctrl = this.ctrl as HTMLSelectElement ;
        if (ctrl && DataValue.isString(data)) {
            ctrl.value = DataValue.toString(data) ;
        }
    }
}