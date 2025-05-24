import {  EditFormControlDialog  } from "./editformctrldialog.js";
import {  FormControl  } from "../controls/formctrl.js";
import {  IPCUpDownItem  } from "../../../ipc.js";

export class EditUpDownControlDialog extends EditFormControlDialog {
    private min_value_? : HTMLInputElement ;
    private max_value_? : HTMLInputElement ;

    constructor(formctrl: FormControl) {
        super('Edit UpDown', formctrl) ;
    }

    protected async populateDialog(pdiv: HTMLElement) : Promise<void> {
        let item = this.formctrl_.item as IPCUpDownItem ;
        let label ;
        let option: HTMLOptionElement ;

        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.populateTag(div) ;
        this.populateOrientation(div, item.orientation) ;

        this.min_value_ = document.createElement("input");
        this.min_value_.type = "number";
        this.min_value_.className = "xero-popup-form-edit-dialog-input";
        this.min_value_.value = item.minvalue.toString();

        label = document.createElement("label");
        label.className = "xero-popup-form-edit-dialog-label";
        label.innerText = "Minimum Value";
        label.appendChild(this.min_value_);
        div.appendChild(label);

        this.max_value_ = document.createElement("input");
        this.max_value_.type = "number";
        this.max_value_.className = "xero-popup-form-edit-dialog-input";
        this.max_value_.value = item.maxvalue.toString();

        label = document.createElement("label");
        label.className = "xero-popup-form-edit-dialog-label";
        label.innerText = "Maximum Value";
        label.appendChild(this.max_value_);
        div.appendChild(label);

        this.populateColors(div) ;
        await this.populateFontSelector(div) ;

        pdiv.appendChild(div) ;
    }

    protected extractData() : void {
        let item = this.formctrl_.item as IPCUpDownItem ;

        item.tag = this.tag_!.value ;
        item.color = this.text_color_!.value ;
        item.background = this.background_color_!.value ;
        item.fontFamily = this.font_name_!.value ;
        item.fontSize = parseInt(this.font_size_!.value) ;
        item.fontWeight = this.font_weight_!.value ;
        item.fontStyle = this.font_style_!.value ;
        item.transparent = this.transparent_!.checked ;
        item.orientation = this.orientation_!.value as 'horizontal' | 'vertical' ;
        item.minvalue = parseFloat(this.min_value_!.value) ;
        item.maxvalue = parseFloat(this.max_value_!.value) ;
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