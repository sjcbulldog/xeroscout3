import { IPCRobotViewerItem } from "../../../shared/ipc.js";
import { FormControl } from "../controls/formctrl.js";
import { EditFormControlDialog } from "./editformctrldialog.js";

export class EditRobotViewerDialog extends EditFormControlDialog {
    constructor(formctrl: FormControl) {
        super('Edit Robot Viewer', formctrl) ;
    }

    protected async populateDialog(pdiv: HTMLElement) : Promise<void> {
        const div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;
        this.populateTag(div) ;
        pdiv.appendChild(div) ;
    }

    protected extractData(): void {
        const item = this.formctrl_.item as IPCRobotViewerItem ;
        item.tag = this.tag_!.value ;
        item.datatype = 'null' ;
    }

    public onInit() {
        setTimeout(() => {
            this.tag_?.focus() ;
        }, 100) ;
    }
}
