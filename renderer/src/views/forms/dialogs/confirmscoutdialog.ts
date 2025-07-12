import { XeroDialog } from "../../../widgets/xerodialog.js";

export class ConfirmScoutDialog extends XeroDialog {
    constructor(ev: string) {
        super('Cofirm Scouting Data - ' + ev);
    }

    async populateDialog(pdiv: HTMLDivElement) {
        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        pdiv.appendChild(div) ;
    }
}