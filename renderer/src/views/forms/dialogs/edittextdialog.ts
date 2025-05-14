import {  IPCTextItem  } from "../../../ipc.js";
import {  FormControl  } from "../controls/formctrl.js";
import {  EditFormControlDialog  } from "./editformctrldialog.js";

export class EditTextDialog extends EditFormControlDialog {
    private data_type_? : HTMLSelectElement ;
    private placeholder_? : HTMLInputElement ;

    constructor(formctrl: FormControl) {
        super('Edit Text', formctrl);
    }

    protected async populateDialog(pdiv: HTMLElement) : Promise<void> {
        let item = this.formctrl_.item as IPCTextItem ;
        let label ;
        let option: HTMLOptionElement ;

        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.populateTag(div) ;

        this.data_type_ = document.createElement('select') ;
        this.data_type_.className = 'xero-popup-form-edit-dialog-select' ;
        option = document.createElement('option') ;
        option.value = 'string' ;
        option.innerText = 'String' ;
        this.data_type_.appendChild(option) ;
        option = document.createElement('option') ;
        option.value = 'integer' ;
        option.innerText = 'Integer' ;
        this.data_type_.appendChild(option) ;
        option = document.createElement('option') ;
        option.value = 'real' ;
        option.innerText = 'Float' ;
        this.data_type_.appendChild(option) ;
        this.data_type_.value = this.formctrl_.item.datatype ;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Data Type' ;
        label.appendChild(this.data_type_) ;
        div.appendChild(label) ;

        this.placeholder_ = document.createElement('input') ;
        this.placeholder_.type = 'text' ;
        this.placeholder_.className = 'xero-popup-form-edit-dialog-input' ;
        this.placeholder_.value = item.placeholder ;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Placeholder' ;
        label.appendChild(this.placeholder_) ;
        div.appendChild(label) ;

        this.populateColors(div) ;
        await this.populateFontSelector(div) ;
        pdiv.appendChild(div) ;
    }

    public extractData() {
        if (this.tag_ && this.data_type_ && this.placeholder_ && this.font_name_ && this.font_size_ && this.text_color_) {
            let item = this.formctrl_.item as IPCTextItem ;

            item.tag = this.tag_.value ;
            item.datatype = this.data_type_.value as 'string' | 'integer' | 'real' ;
            item.placeholder = this.placeholder_.value ;
            item.fontFamily = this.font_name_.value ;
            item.fontSize = parseInt(this.font_size_.value) ;
            item.fontStyle = this.font_style_!.value ;
            item.fontWeight = this.font_weight_!.value ;
            item.color = this.text_color_.value ;
        }
    }
}
