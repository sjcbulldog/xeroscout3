import {  EditFormControlDialog  } from "./editformctrldialog.js";
import {  FormControl  } from "../controls/formctrl.js";
import {  IPCBooleanItem  } from "../../../shared/ipc.js";

export class EditBooleanDialog extends EditFormControlDialog {
    private accent_color_? : HTMLInputElement ;

    constructor(formctrl: FormControl) {
        super('Edit Boolean', formctrl) ;
    }

    protected async populateDialog(pdiv: HTMLElement) {
        let label : HTMLLabelElement ;
        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.populateTag(div) ;

        this.populateColors(div) ;       

        this.accent_color_ = document.createElement('input') ;
        this.accent_color_.className = 'xero-popup-form-edit-dialog-color' ;
        this.accent_color_.type = 'color' ;
        this.accent_color_.value = EditFormControlDialog.colorNameToHex(this.formctrl_.item.color) ;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Accent Color' ;
        label.appendChild(this.accent_color_) ;
        div.appendChild(label) ; 
        pdiv.appendChild(div) ;
    }

    extractData() {        
        let item = this.formctrl_.item as IPCBooleanItem ;
        this.formctrl_.item.tag = this.tag_?.value || '' ;
        this.formctrl_.item.color = this.text_color_?.value || 'black' ;
        this.formctrl_.item.background = this.background_color_?.value || 'white' ;
        item.accent = this.accent_color_?.value || 'lightgreen' ;
    }
    
    setFocus() {
        if (this.tag_) {
            this.tag_.focus() ;
            this.tag_.select() ;
        }
    }

    onInit() {
        setTimeout(this.setFocus.bind(this), 100) ;
    }     
}
