import { IPCDataSet } from "../../shared/ipc.js";
import { XeroDialog } from "../../widgets/xerodialog.js";

export class EditDataSetDialog extends XeroDialog {
    private section_name_?: HTMLInputElement ;

    private new_ : boolean ;
    private dataset_ : IPCDataSet ;

    constructor(ds: IPCDataSet, newds: boolean) {
        super('Edit Data Set') ;
        this.dataset_ = ds ;
        this.new_ = newds ;
    }

    async populateDialog(pdiv: HTMLDivElement) {
        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.section_name_ = document.createElement('input') ;
        this.section_name_.type = 'text' ;
        this.section_name_.className = 'xero-popup-form-edit-dialog-input' ;
        this.section_name_.value = this.dataset_.name ;     

        div.appendChild(this.section_name_) ;

        pdiv.appendChild(div) ;
    }

    onInit() {
        if (this.section_name_) {
            this.section_name_.focus() ;
            this.section_name_.select() ;
        }
    }

    okButton(event: Event) {
        super.okButton(event) ;
    }
}
