import {  IPCTextAreaItem, IPCTextItem  } from "../../../ipc.js";
import {  FormControl  } from "../controls/formctrl.js";
import {  EditFormControlDialog  } from "./editformctrldialog.js";

export class EditTextAreaDialog extends EditFormControlDialog {
    private data_type_? : HTMLSelectElement ;
    private rows_? : HTMLInputElement ;
    private cols_? : HTMLInputElement ;

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

        this.rows_ = document.createElement('input') ;
        this.rows_.type = 'text' ;
        this.rows_.className = 'xero-popup-form-edit-dialog-input' ;
        this.rows_.value = item.placeholder ;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Rows' ;
        label.appendChild(this.rows_) ;
        div.appendChild(label) ;

        this.cols_ = document.createElement('input') ;
        this.cols_.type = 'text' ;
        this.cols_.className = 'xero-popup-form-edit-dialog-input' ;
        this.cols_.value = item.placeholder ;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Cols' ;
        label.appendChild(this.cols_) ;
        div.appendChild(label) ;        

        this.populateColors(div) ;
        await this.populateFontSelector(div) ;
        pdiv.appendChild(div) ;
    }

    public extractData() {
        if (this.tag_ && this.data_type_ && this.rows_ && this.cols_ && this.font_name_ && this.font_size_ && this.text_color_) {
            let item = this.formctrl_.item as IPCTextAreaItem ;

            item.tag = this.tag_.value ;
            item.datatype = this.data_type_.value as 'string' | 'integer' | 'real' ;
            item.rows = parseInt(this.rows_.value) ;
            item.cols = parseInt(this.cols_.value) ;
            item.fontFamily = this.font_name_.value ;
            item.fontSize = parseInt(this.font_size_.value) ;
            item.fontStyle = this.font_style_!.value ;
            item.fontWeight = this.font_weight_!.value ;
            item.color = this.text_color_.value ;
            item.background = this.background_color_!.value ;
            item.transparent = this.transparent_!.checked ;
        }
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
