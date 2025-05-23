import { IPCSection } from "../../../ipc.js";
import { XeroDialog } from "../../../widgets/xerodialog.js" ;

export class EditSectionNameDialog extends XeroDialog {
    private section_name_?: HTMLInputElement ;

    private oldname_ : string ;
    private newname_ : string = '' ;

    constructor(oldname: string) {
        super('Edit Section Name') ;
        this.oldname_ = oldname ;
    }

    public get enteredName() : string {
        return this.newname_ ;
    }

    async populateDialog(pdiv: HTMLDivElement) {
        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.section_name_ = document.createElement('input') ;
        this.section_name_.type = 'text' ;
        this.section_name_.className = 'xero-popup-form-edit-dialog-input' ;
        this.section_name_.value = this.oldname_ ;

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
        this.newname_ = this.section_name_!.value ;
        super.okButton(event) ;
    }
}
