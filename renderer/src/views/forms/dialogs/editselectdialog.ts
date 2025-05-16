import {  EditFormControlDialog  } from "./editformctrldialog.js";
import {  FormControl  } from "../controls/formctrl.js";
import {  IPCSelectItem  } from "../../../ipc.js";
import { ColumnDefinition, TabulatorFull } from "tabulator-tables";
import { EditWithItemsDialog } from "./editwithitemsdialog.js";

export class EditSelectDialog extends EditWithItemsDialog {
    private data_type_? : HTMLSpanElement ;

    constructor(formctrl: FormControl) {
        super('Edit Boolean', formctrl) ;
    }

    protected async populateDialog(pdiv: HTMLElement) : Promise<void> {
        let item = this.formctrl_.item as IPCSelectItem ;
        let label ;
        let option: HTMLOptionElement ;

        this.createTabs(pdiv) ;        

        this.populateTag(this.tab_page_1!) ;

        this.data_type_ = document.createElement('span') ;
        this.data_type_.className = 'xero-popup-form-edit-dialog-label' ;
        this.data_type_.innerText = 'Data Type: ' + item.datatype ;
        this.tab_page_2!.appendChild(this.data_type_) ;

        this.populateColors(this.tab_page_1!) ;
        await this.populateFontSelector(this.tab_page_1!) ;
        this.populateChoices(this.tab_page_2!, this.data_type_, item.choices) ;
    }

    protected extractData() : void {
        let item = this.formctrl_.item as IPCSelectItem ;
        item.tag = this.tag_!.value ;
        item.color = this.text_color_!.value ;
        item.background = this.background_color_!.value ;
        item.fontFamily = this.font_name_!.value ;
        item.fontSize = parseInt(this.font_size_!.value) ;
        item.fontWeight = this.font_weight_!.value ;
        item.fontStyle = this.font_style_!.value ;
        item.datatype = this.extractDataType() ;
        item.choices = this.extractChoices() ;
    }
}