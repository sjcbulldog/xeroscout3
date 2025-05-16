import { FormControl  } from "../controls/formctrl.js";
import { IPCMultipleChoiceItem  } from "../../../ipc.js";
import { EditWithItemsDialog } from "./editwithitemsdialog.js";

export class EditChoiceDialog extends EditWithItemsDialog {
    private data_type_?: HTMLSpanElement ;
    private radio_size_? : HTMLInputElement ;

    constructor(formctrl: FormControl) {
        super('Edit Multiple Choice', formctrl) ;
    }

    protected async populateDialog(pdiv: HTMLElement) : Promise<void> {
        let item = this.formctrl_.item as IPCMultipleChoiceItem ;
        let label ;
        let option: HTMLOptionElement ;

        this.createTabs(pdiv) ;

        this.populateTag(this.tab_page_1!) ;

        this.radio_size_ = document.createElement("input");
        this.radio_size_.type = "number";
        this.radio_size_.max = "400";
        this.radio_size_.min = "4";
        this.radio_size_.className = "xero-popup-form-edit-dialog-input";
        this.radio_size_.value = item.radiosize.toString();

        label = document.createElement("label");
        label.className = "xero-popup-form-edit-dialog-label";
        label.innerText = "Radio Button Size";
        label.appendChild(this.radio_size_);
        this.tab_page_1!.appendChild(label);        

        this.data_type_ = document.createElement('span') ;
        this.data_type_.className = 'xero-popup-form-edit-dialog-label' ;
        this.data_type_.innerText = 'Data Type: ' + item.datatype ;
        this.tab_page_2!.appendChild(this.data_type_) ;

        this.populateOrientation(this.tab_page_1!, item.orientation) ;
        this.populateColors(this.tab_page_1!) ;
        await this.populateFontSelector(this.tab_page_1!) ;
        this.populateChoices(this.tab_page_2!, this.data_type_, item.choices) ;
    }

    protected extractData() : void {
        let item = this.formctrl_.item as IPCMultipleChoiceItem ;
        item.tag = this.tag_!.value ;
        item.radiosize = parseInt(this.radio_size_!.value) ;
        item.color = this.text_color_!.value ;
        item.background = this.background_color_!.value ;
        item.fontFamily = this.font_name_!.value ;
        item.fontSize = parseInt(this.font_size_!.value) ;
        item.fontWeight = this.font_weight_!.value ;
        item.fontStyle = this.font_style_!.value ;
        item.orientation = this.orientation_!.value as 'horizontal' | 'vertical' ;
        item.datatype = this.extractDataType() ;
        item.choices = this.extractChoices() ;
    }
}
