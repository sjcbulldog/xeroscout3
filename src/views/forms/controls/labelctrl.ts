import {  IPCLabelItem, IPCTypedDataValue  } from "../../../shared/ipc.js";
import {  XeroRect  } from "../../../shared/xerogeom.js";
import {  XeroView  } from "../../xeroview.js";
import {  EditFormControlDialog  } from "../dialogs/editformctrldialog.js";
import {  EditLabelDialog  } from "../dialogs/editlabeldialog.js";
import {  FormControl  } from "./formctrl.js";

export class LabelControl extends FormControl {
    private static item_desc_ : IPCLabelItem = 
    {
        type: 'label',
        text: 'MyLabel',
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
        datatype: 'null',
        transparent: true
    } ;

    constructor(view: XeroView, tag: string, bounds: XeroRect) {
        super(view, LabelControl.item_desc_) ;
        this.setTag(tag) ;
        this.setBounds(bounds) ;
    }

    public copyObject() : FormControl {
        return new LabelControl(this.view, this.item.tag, this.bounds) ;
    }

    public updateFromItem(editing: boolean, scale: number, xoff: number, yoff: number) : void {
        if (this.ctrl) {
            let item = this.item as IPCLabelItem ;
            this.setPosition(scale, xoff, yoff, 950) ;

            this.ctrl.innerText = item.text ;
            this.ctrl.style.fontFamily = item.fontFamily ;
            this.ctrl.style.fontSize = item.fontSize + 'px' ;
            this.ctrl.style.fontWeight = item.fontWeight ;
            this.ctrl.style.fontStyle = item.fontStyle ;
            this.ctrl.style.color = item.color ;
            if (item.transparent) {
                this.ctrl.style.backgroundColor = 'transparent' ;
            }
            else {
                this.ctrl.style.backgroundColor = item.background ;
            }
        }
    }

    public createForEdit(parent: HTMLElement, xoff: number, yoff:number) : void  {
        super.createForEdit(parent, xoff, yoff) ;        
        this.ctrl = document.createElement('span') ;
        this.setClassList(this.ctrl, 'edit') ;
        this.updateFromItem(true, 1.0, xoff, yoff) ;
        parent.appendChild(this.ctrl) ;
    }

    public createForScouting(parent: HTMLElement, scale: number, xoff: number, yoff:number) : void {
        super.createForScouting(parent, scale, xoff, yoff) ;
        this.ctrl = document.createElement('span') ;
        this.setClassList(this.ctrl, 'scout') ;
        this.updateFromItem(false, scale, xoff, yoff) ;
        parent.appendChild(this.ctrl);
    }

    public createEditDialog() : EditFormControlDialog  {
        return new EditLabelDialog(this) ;
    }

    public getData() : IPCTypedDataValue | undefined {
        return undefined ;
    }

    public setData(data:IPCTypedDataValue) : void {
    }
}