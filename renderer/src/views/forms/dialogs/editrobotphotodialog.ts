import { IPCRobotPhotoItem } from "../../../shared/ipc.js";
import { FormControl } from "../controls/formctrl.js";
import { EditFormControlDialog } from "./editformctrldialog.js";

export class EditRobotPhotoDialog extends EditFormControlDialog {
    private mode_? : HTMLSelectElement ;
    private source_tag_? : HTMLInputElement ;

    constructor(formctrl: FormControl) {
        super('Edit Robot Photo', formctrl) ;
    }

    protected async populateDialog(pdiv: HTMLElement) : Promise<void> {
        const item = this.formctrl_.item as IPCRobotPhotoItem ;
        const div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.populateTag(div) ;

        this.mode_ = document.createElement('select') ;
        this.mode_.className = 'xero-popup-form-edit-dialog-select' ;
        let option = document.createElement('option') ;
        option.value = 'capture' ;
        option.innerText = 'Capture (team form)' ;
        this.mode_.appendChild(option) ;
        option = document.createElement('option') ;
        option.value = 'display' ;
        option.innerText = 'Display (match form)' ;
        this.mode_.appendChild(option) ;
        this.mode_.value = item.mode ;

        let label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Mode' ;
        label.appendChild(this.mode_) ;
        div.appendChild(label) ;

        this.source_tag_ = document.createElement('input') ;
        this.source_tag_.type = 'text' ;
        this.source_tag_.className = 'xero-popup-form-edit-dialog-input' ;
        this.source_tag_.value = item.sourceTag || '' ;
        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Source Tag' ;
        label.appendChild(this.source_tag_) ;
        div.appendChild(label) ;

        pdiv.appendChild(div) ;
    }

    protected extractData(): void {
        const item = this.formctrl_.item as IPCRobotPhotoItem ;
        item.tag = this.tag_!.value ;
        item.mode = this.mode_!.value as 'capture' | 'display' ;
        item.sourceTag = this.source_tag_!.value.trim() ;
        item.datatype = 'string' ;
    }

    public onInit() {
        setTimeout(() => {
            this.tag_?.focus() ;
        }, 100) ;
    }
}
