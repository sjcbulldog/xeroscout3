import { IPCRobotPhotoItem } from "../../../shared/ipc.js";
import { FormControl } from "../controls/formctrl.js";
import { EditFormControlDialog } from "./editformctrldialog.js";

export class EditRobotPhotoDialog extends EditFormControlDialog {
    constructor(formctrl: FormControl) {
        super('Edit Robot Photo', formctrl) ;
    }

    protected async populateDialog(pdiv: HTMLElement) : Promise<void> {
        const div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.populateTag(div) ;
        pdiv.appendChild(div) ;
    }

    protected extractData(): void {
        const item = this.formctrl_.item as IPCRobotPhotoItem ;
        item.tag = this.tag_!.value ;
        item.mode = 'capture' ;
        item.datatype = 'string' ;
    }

    public onInit() {
        setTimeout(() => {
            this.tag_?.focus() ;
        }, 100) ;
    }
}
