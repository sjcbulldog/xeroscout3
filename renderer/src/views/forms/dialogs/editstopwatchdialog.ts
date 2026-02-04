import { EditFormControlDialog } from "./editformctrldialog.js";
import { FormControl } from "../controls/formctrl.js";
import { IPCStopwatchItem } from "../../../shared/ipc.js";

export class EditStopwatchDialog extends EditFormControlDialog {
    constructor(formctrl: FormControl) {
        super('Edit Stopwatch', formctrl) ;
    }

    protected async populateDialog(pdiv: HTMLElement): Promise<void> {
        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.populateTag(div) ;
        this.populateColors(div) ;
        await this.populateFontSelector(div) ;

        pdiv.appendChild(div) ;
    }

    protected extractData(): void {
        let item = this.formctrl_.item as IPCStopwatchItem ;

        item.tag = this.tag_!.value ;
        item.color = this.text_color_!.value ;
        item.background = this.background_color_!.value ;
        item.fontFamily = this.font_name_!.value ;
        item.fontSize = parseInt(this.font_size_!.value) ;
        item.fontWeight = this.font_weight_!.value ;
        item.fontStyle = this.font_style_!.value ;
        item.transparent = this.transparent_!.checked ;
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

