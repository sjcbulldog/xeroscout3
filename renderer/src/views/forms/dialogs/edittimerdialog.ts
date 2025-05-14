import {  EditFormControlDialog  } from "./editformctrldialog.js";
import {  FormControl  } from "../controls/formctrl.js";
import {  IPCTimerItem  } from "../../../ipc.js";

export class EditTimerDialog extends EditFormControlDialog {
    constructor(formctrl: FormControl) {
        super('Edit UpDown', formctrl) ;
    }

    protected async populateDialog(pdiv: HTMLElement) : Promise<void> {
        let item = this.formctrl_.item as IPCTimerItem ;
        let label ;
        let option: HTMLOptionElement ;

        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.populateTag(div) ;
        this.populateColors(div) ;
        await this.populateFontSelector(div) ;

        pdiv.appendChild(div) ;
    }

    protected extractData() : void {
        let item = this.formctrl_.item as IPCTimerItem ;

        item.tag = this.tag_!.value ;
        item.color = this.text_color_!.value ;
        item.background = this.background_color_!.value ;
        item.fontFamily = this.font_name_!.value ;
        item.fontSize = parseInt(this.font_size_!.value) ;
        item.fontWeight = this.font_weight_!.value ;
        item.fontStyle = this.font_style_!.value ;
        item.transparent = this.transparent_!.checked ;
    }
}