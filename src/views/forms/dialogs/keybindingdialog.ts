import { XeroDialog } from "../../../widgets/xerodialog.js";
import { Keybinding } from "../keybindings.js";

export class KeybindingDialog extends XeroDialog {
    private bindings_: Keybinding[] ;
    private top_? : HTMLDivElement ;
    private binding_table_?: HTMLTableElement

    constructor(bindings: Keybinding[]) {
        super('Keybindings') ;
        this.bindings_ = bindings ;
    }

    populateDialog(pdiv: HTMLDivElement) {
        this.top_ = document.createElement('div') ;
        this.top_.className = 'xero-form-keybinding-dialog-top' ;
        pdiv.appendChild(this.top_) ;

        this.binding_table_ = document.createElement('table') ;
        this.binding_table_.className = 'xero-form-keybinding-table' ;

        let tr = document.createElement('tr') ;
        tr.className = 'xero-form-keybinding-table-header-row' ;

        let th = document.createElement('th') ;
        th.className = 'xero-form-keybinding-table-header-cell' ;
        th.innerText = 'Keybinding' ;
        tr.appendChild(th) ;

        th = document.createElement('th') ;
        th.className = 'xero-form-keybinding-table-header-cell' ;
        th.innerText = 'Description' ;
        tr.appendChild(th) ;

        this.binding_table_.appendChild(tr) ;

        for(let binding of this.bindings_) {
            tr = document.createElement('tr') ;
            tr.className = 'xero-form-keybinding-table-data-row' ;

            let td = document.createElement('td') ;
            td.className = 'xero-form-keybinding-table-data-cell' ;
            td.innerText = binding.bindingAsText ;
            tr.appendChild(td) ;

            td = document.createElement('td') ;
            td.className = 'xero-form-keybinding-table-data-cell' ;
            td.innerText = binding.desc ;
            tr.appendChild(td) ;

            this.binding_table_.appendChild(tr) ;
        }

        this.top_.appendChild(this.binding_table_) ;
    }
}
