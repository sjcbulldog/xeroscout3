import {  IPCTextItem  } from "../../../ipc.js";
import {  XeroRect  } from "../../../widgets/xerogeom.js";
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
        return new TextControl(this.view, this.item.tag, this.bounds()) ;
    }    

    public updateFromItem(editing: boolean) : void {
        if (this.ctrl) {
            let item = this.item as IPCTextItem ;
            let ctrl = this.ctrl as HTMLInputElement ;

            if (editing) {
                ctrl.value = item.placeholder ;
            }
            else {
                ctrl.placeholder = item.placeholder ;
            }

            ctrl.style.left = item.x + 'px' ;
            ctrl.style.top = item.y + 'px' ;
            ctrl.style.width = item.width + 'px' ;
            ctrl.style.height = item.height + 'px' ;
            ctrl.style.position = 'absolute' ;
            ctrl.style.fontFamily = item.fontFamily ;
            ctrl.style.fontSize = item.fontSize + 'px' ;
            ctrl.style.fontWeight = item.fontWeight ;
            ctrl.style.fontStyle = item.fontStyle ;
            ctrl.style.color = item.color ;
            ctrl.style.backgroundColor = item.background ;
            ctrl.style.margin = '4px' ;
        }
    }

    public createForEdit(parent: HTMLElement) : void  {
        let input = document.createElement('input') ;
        this.setClassList(input, 'edit') ;
        input.disabled = true ;

        this.ctrl = input ;
        this.updateFromItem(true) ;
        parent.appendChild(this.ctrl) ;
    }

    public createForScouting(parent: HTMLElement) : void {
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

        this.updateFromItem(false) ;
        parent.appendChild(this.ctrl);
    }

    public createEditDialog() : EditFormControlDialog  {
        return new EditTextDialog(this) ;
    }

    public getData() : any {
        let input = this.ctrl as HTMLInputElement ;
        return input.value ;
    }

    public setData(data: any) : void {
        let input = this.ctrl as HTMLInputElement ;
        input.value = data ;
    }
}
