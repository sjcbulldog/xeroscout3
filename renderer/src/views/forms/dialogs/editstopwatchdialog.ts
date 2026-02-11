import { EditFormControlDialog } from "./editformctrldialog.js";
import { FormControl } from "../controls/formctrl.js";
import { IPCStopwatchItem } from "../../../shared/ipc.js";

export class EditStopwatchDialog extends EditFormControlDialog {
    private hold_mode_?: HTMLInputElement ;

    constructor(formctrl: FormControl) {
        super('Edit Stopwatch', formctrl) ;
    }

    protected async populateDialog(pdiv: HTMLElement): Promise<void> {
        let item = this.formctrl_.item as IPCStopwatchItem ;
        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.populateTag(div) ;

        this.hold_mode_ = document.createElement("input") ;
        this.hold_mode_.type = "checkbox" ;
        this.hold_mode_.checked = item.holdMode ?? true ;
        this.hold_mode_.className = "xero-popup-form-edit-dialog-checkbox" ;

        let mode_label = document.createElement("label") ;
        mode_label.className = "xero-popup-form-edit-dialog-label" ;
        mode_label.innerText = "Hold (unchecked = Toggle)" ;
        mode_label.appendChild(this.hold_mode_) ;
        div.appendChild(mode_label) ;

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
        item.holdMode = this.hold_mode_ ? this.hold_mode_.checked : true ;
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
