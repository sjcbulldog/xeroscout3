import {  EditFormControlDialog  } from "./editformctrldialog.js";
import {  FormControl  } from "../controls/formctrl.js";
import {  IPCLabelItem  } from "../../../shared/ipc.js";

export class EditLabelDialog extends EditFormControlDialog {
    private text_string_? : HTMLInputElement ;

    constructor(formctrl: FormControl) {
        super('Edit Label', formctrl) ;
    }

    protected async populateDialog(pdiv: HTMLElement) : Promise<void> {
        let item = this.formctrl_.item as IPCLabelItem ;

        let label ;
        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.text_string_ = document.createElement('input') ;
        this.text_string_.type = 'text' ;
        this.text_string_.className = 'xero-popup-form-edit-dialog-input' ;
        this.text_string_.value = item.text ;

        label = document.createElement('label') ;
        label.className = '.xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Text' ;
        label.appendChild(this.text_string_) ;
        div.appendChild(label) ;

        this.populateColors(div) ;
        await this.populateFontSelector(div) ;
        pdiv.appendChild(div) ;
    }

    protected extractData() : void {
        let item = this.formctrl_.item as IPCLabelItem ;
        item.text = this.text_string_!.value ;
        item.fontFamily = this.font_name_!.value ;
        item.fontSize = parseInt(this.font_size_!.value) ;
        item.fontStyle = this.font_style_!.value ;
        item.fontWeight = this.font_weight_!.value ;
        item.color = this.text_color_!.value ;
        item.background = this.background_color_!.value ;
        item.transparent = this.transparent_!.checked ;
    }

    setFocus() {
        if (this.text_string_) {
            this.text_string_.focus() ;
            this.text_string_.select() ;
        }
    }

    onInit() {
        setTimeout(this.setFocus.bind(this), 100) ;
    }    
}