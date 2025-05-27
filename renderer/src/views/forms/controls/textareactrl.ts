import { IPCTextAreaItem, IPCTypedDataValue } from "../../../ipc.js";
import { DataValue } from "../../../utils/datavalue.js";
import { XeroRect } from "../../../widgets/xerogeom.js";
import { XeroView } from "../../xeroview.js";
import { EditFormControlDialog } from "../dialogs/editformctrldialog.js";
import { EditTextAreaDialog } from "../dialogs/edittextareadialog.js";
import { FormControl } from "./formctrl.js";

export class TextAreaControl extends FormControl {
    private static item_desc_ : IPCTextAreaItem = 
    {
        type: 'textarea',
        tag: '',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rows: 4,
        cols: 20,
        color: 'black',
        background: 'white',
        fontFamily: 'Arial',
        fontSize: 36,
        fontWeight: 'normal',
        fontStyle: 'normal',
        datatype: 'string',
        transparent: true,
    } ;

    private area_? : HTMLTextAreaElement ;

    constructor(view: XeroView, tag: string, bounds: XeroRect) {
        super(view, TextAreaControl.item_desc_) ;
        this.setTag(tag) ;
        this.setBounds(bounds) ;
    }

    public copyObject() : FormControl {
        return new TextAreaControl(this.view, this.item.tag, this.bounds) ;
    }

    public updateFromItem(editing: boolean, xoff: number, yoff: number) : void {
        if (this.area_) {
            let item = this.item as IPCTextAreaItem ;
            this.setPosition(xoff, yoff) ;
            
            this.area_.rows = item.rows ;
            this.area_.cols = item.cols ;
            this.area_.style.fontFamily = item.fontFamily ;
            this.area_.style.fontSize = item.fontSize + 'px' ;
            this.area_.style.fontWeight = item.fontWeight ;
            this.area_.style.fontStyle = item.fontStyle ;
            this.area_.style.color = item.color ;
            this.area_.style.backgroundColor = item.background ;
        }
    }

    public createForEdit(parent: HTMLElement, xoff: number, yoff: number) : void {
        super.createForEdit(parent, xoff, yoff) ;
        let box = document.createElement('div') ;
        this.setClassList(box, 'edit') ;
        this.ctrl = box ;

        this.area_ = document.createElement('textarea') ;
        box.appendChild(this.area_) ;
        this.setClassList(this.area_, 'edit', 'textarea') ;
        this.area_.disabled = true ;

        this.updateFromItem(true, xoff, yoff) ;
        parent.appendChild(box) ;
    }

    public createForScouting(parent: HTMLElement, xoff: number, yoff: number) : void {
        super.createForEdit(parent, xoff, yoff) ;
        let box = document.createElement('div') ;
        this.setClassList(box, 'scout') ;
        this.ctrl = box ;

        this.area_ = document.createElement('textarea') ;
        box.appendChild(this.area_) ;
        this.setClassList(this.area_, 'scout', 'textarea') ;

        this.updateFromItem(true, xoff, yoff) ;
        parent.appendChild(box) ;
    }

    public createEditDialog(): EditFormControlDialog {
        return new EditTextAreaDialog(this) ;
    }

    public getData() :  IPCTypedDataValue | undefined  {
        let area = this.ctrl as HTMLTextAreaElement ;
        return DataValue.fromString(area.value) ;
    }

    public setData(data:IPCTypedDataValue) : void {
        if(this.ctrl && DataValue.isString(data)) {
            this.area_!.value = DataValue.toString(data) ;
        }
    }
}