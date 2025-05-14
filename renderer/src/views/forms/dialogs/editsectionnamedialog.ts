import { IPCSection } from "../../../ipc.js";
import { XeroDialog } from "../../../widgets/xerodialog.js" ;

export class EditSectionNameDialog extends XeroDialog {
    private section_: IPCSection ;
    private section_name_?: HTMLInputElement ;

    constructor(section: IPCSection) {
        super('Edit Section Name') ;
        this.section_ = section ;
    }

    async populateDialog(pdiv: HTMLDivElement) {
        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.section_name_ = document.createElement('input') ;
        this.section_name_.type = 'text' ;
        this.section_name_.className = 'xero-popup-form-edit-dialog-input' ;
        this.section_name_.value = this.section_.name ;

        let label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Section Name' ;
        label.appendChild(this.section_name_) ;
        div.appendChild(label) ;

        pdiv.appendChild(div) ;
    }

    onInit() {
        if (this.section_name_) {
            this.section_name_.focus() ;
            this.section_name_.select() ;
        }
    }

    okButton(event: Event) {
        if (this.section_name_) {
            let name = this.section_name_.value.trim() ;
            if (name !== this.section_.name) {
                this.section_.name = this.section_name_.value.trim() ;
            }
            super.okButton(event) ;
        }
    }
}
