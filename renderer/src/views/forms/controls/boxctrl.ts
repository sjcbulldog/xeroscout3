import { IPCBoxItem, IPCTypedDataValue } from "../../../ipc.js";
import { XeroRect } from "../../../widgets/xerogeom.js";
import { XeroView } from "../../xeroview.js";
import { EditBoxDialog } from "../dialogs/editboxdialog.js";
import { EditFormControlDialog } from "../dialogs/editformctrldialog.js";
import { FormControl } from "./formctrl.js";

export class BoxControl extends FormControl {
    private static item_desc_ : IPCBoxItem = 
    {
        type: 'box',
        tag: '',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: 'black',
        background: 'white',
        borderWidth: 4,
        borderStyle: 'solid',
        borderRadius: 8,
        borderShadow: false,
        transparent: true,
        fontFamily: 'Arial',
        fontSize: 36,
        fontWeight: 'normal',
        fontStyle: 'normal',
        datatype: 'null',
    } ;

    private box_ctrl_?: HTMLDivElement ;

    constructor(view: XeroView, tag: string, bounds: XeroRect) {
        super(view, BoxControl.item_desc_) ;
        this.setTag(tag) ;
        this.setBounds(bounds) ;
    }

    public copyObject() : FormControl {
        return new BoxControl(this.view, this.item.tag, this.bounds) ;
    }

    public updateFromItem(editing: boolean, scale: number, xoff: number, yoff: number) : void {
        if (this.ctrl && this.box_ctrl_) {
            let item = this.item as IPCBoxItem ;
            this.setPosition(scale, xoff, yoff, 900) ;

            this.box_ctrl_.style.borderWidth = item.borderWidth + 'px' ;
            this.box_ctrl_.style.borderStyle = item.borderStyle ;
            this.box_ctrl_.style.borderRadius = item.borderRadius + 'px' ;
            this.box_ctrl_.style.boxShadow = item.borderShadow ? '10px 5px 5px lightgray' : 'none' ;
            this.box_ctrl_.style.borderColor = item.color ;
            if (item.transparent) {
                this.box_ctrl_.style.backgroundColor = 'transparent' ;
            }
            else {
                this.box_ctrl_.style.backgroundColor = item.background ;
            }
        }
    }

    public createForEdit(parent: HTMLElement, xoff: number, yoff:number) : void  {
        super.createForEdit(parent, xoff, yoff) ;
        this.ctrl = document.createElement('div') ;
        this.setClassList(this.ctrl, 'edit') ;

        this.box_ctrl_ = document.createElement('div') ;
        this.setClassList(this.box_ctrl_, 'edit', 'box') ;
        this.ctrl.appendChild(this.box_ctrl_) ;

        this.updateFromItem(true, 1.0, xoff, yoff) ;
        parent.appendChild(this.ctrl) ;
    }

    public createForScouting(parent: HTMLElement, scale: number, xoff: number, yoff:number) : void {
        super.createForScouting(parent, xoff, yoff, scale) ;
        this.ctrl = document.createElement('div') ;
        this.setClassList(this.ctrl, 'scout') ;

        this.box_ctrl_ = document.createElement('div') ;
        this.setClassList(this.box_ctrl_, 'scout', 'box') ;      
        this.ctrl.appendChild(this.box_ctrl_) ;  

        this.updateFromItem(false, scale, xoff, yoff) ;
        parent.appendChild(this.ctrl) ;
    }

    public createEditDialog() : EditFormControlDialog {
        return new EditBoxDialog(this) ;
    }

    public getData() : IPCTypedDataValue | undefined {
        return undefined ;
    }

    public setData(data:IPCTypedDataValue) : void {
    }
}