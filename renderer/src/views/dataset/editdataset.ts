import { IPCDataSet } from "../../shared/ipc.js";
import { XeroDialog } from "../../widgets/xerodialog.js";

export class EditDataSetDialog extends XeroDialog {
    private data_set_name_?: HTMLInputElement ;

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

        this.data_set_name_ = document.createElement('input') ;
        this.data_set_name_.type = 'text' ;
        this.data_set_name_.className = 'xero-popup-form-edit-dialog-input' ;
        this.data_set_name_.value = this.dataset_.name ;     

        let label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Data Set Name' ;
        label.appendChild(this.data_set_name_) ;
        div.appendChild(label) ;

        pdiv.appendChild(div) ;
    }

    onInit() {
        if (this.data_set_name_) {
            this.data_set_name_.focus() ;
            this.data_set_name_.select() ;
        }
    }

    okButton(event: Event) {
        super.okButton(event) ;
    }
}
