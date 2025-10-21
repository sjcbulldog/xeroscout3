import { IPCDataSet, IPCMatchSetRange } from "../../shared/ipc.js";
import { XeroDialog } from "../../widgets/xerodialog.js";

export class EditDataSetDialog extends XeroDialog {
    private data_set_name_?: HTMLInputElement ;
    private match_kind_?: HTMLSelectElement ;
    private first_value_?: HTMLInputElement ;
    private last_value_?: HTMLInputElement ;
    private formula_?: HTMLSelectElement ;

    private new_ : boolean = true ;
    private dataset_ : IPCDataSet ;
    private formulas_ : string[] = [] ;

    constructor(ds: IPCDataSet, formulas: string[], newds: boolean) {
        super('Edit Data Set') ;
        this.dataset_ = ds ;
        this.new_ = newds ;
        this.formulas_ = formulas ;
    }

    public get isNew() : boolean {
        return this.new_ ;
    }

    public get dataset() : IPCDataSet {
        return this.dataset_ ;
    }

    async populateDialog(pdiv: HTMLDivElement) {
        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        // Data Set Name
        this.data_set_name_ = document.createElement('input') ;
        this.data_set_name_.type = 'text' ;
        this.data_set_name_.className = 'xero-popup-form-edit-dialog-input' ;
        this.data_set_name_.value = this.dataset_.name ;     

        let label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Data Set Name' ;
        label.appendChild(this.data_set_name_) ;
        div.appendChild(label) ;

        // Match Set Kind
        this.match_kind_ = document.createElement('select') ;
        this.match_kind_.className = 'xero-popup-form-edit-dialog-select' ;
        
        let option = document.createElement('option') ;
        option.value = 'all' ;
        option.innerText = 'All Matches' ;
        this.match_kind_.appendChild(option) ;
        
        option = document.createElement('option') ;
        option.value = 'first' ;
        option.innerText = 'First N Matches' ;
        this.match_kind_.appendChild(option) ;
        
        option = document.createElement('option') ;
        option.value = 'last' ;
        option.innerText = 'Last N Matches' ;
        this.match_kind_.appendChild(option) ;
        
        option = document.createElement('option') ;
        option.value = 'range' ;
        option.innerText = 'Match Range' ;
        this.match_kind_.appendChild(option) ;
        
        this.match_kind_.value = this.dataset_.matches.kind ;
        this.match_kind_.addEventListener('change', this.onMatchKindChanged.bind(this)) ;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Match Set Type' ;
        label.appendChild(this.match_kind_) ;
        div.appendChild(label) ;

        // First Value (for first N matches or range start)
        let dsms : IPCMatchSetRange = this.dataset_.matches as IPCMatchSetRange ;
        this.first_value_ = document.createElement('input') ;
        this.first_value_.type = 'number' ;
        this.first_value_.className = 'xero-popup-form-edit-dialog-input' ;
        this.first_value_.value = dsms.first.toString() ;
        this.first_value_.min = '1' ;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'First Value' ;
        label.appendChild(this.first_value_) ;
        div.appendChild(label) ;

        // Last Value (for last N matches or range end)
        this.last_value_ = document.createElement('input') ;
        this.last_value_.type = 'number' ;
        this.last_value_.className = 'xero-popup-form-edit-dialog-input' ;
        this.last_value_.value = dsms.last.toString() ;
        this.last_value_.min = '1' ;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Last Value' ;
        label.appendChild(this.last_value_) ;
        div.appendChild(label) ;

        // Formula
        this.formula_ = document.createElement('select') ;
        this.formula_.className = 'xero-popup-form-edit-dialog-select' ;
        
        // Add empty option for no formula
        option = document.createElement('option') ;
        option.value = '' ;
        option.innerText = '(No Filter)' ;
        this.formula_.appendChild(option) ;
        
        // Add all available formulas
        for (const formula of this.formulas_) {
            option = document.createElement('option') ;
            option.value = formula ;
            option.innerText = formula ;
            this.formula_.appendChild(option) ;
        }
        
        this.formula_.value = this.dataset_.formula ;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Filter Formula' ;
        label.appendChild(this.formula_) ;
        div.appendChild(label) ;

        pdiv.appendChild(div) ;
        
        // Update field visibility based on current match kind
        this.updateFieldVisibility() ;
    }

    onInit() {
        if (this.data_set_name_) {
            this.data_set_name_.focus() ;
            this.data_set_name_.select() ;
        }
    }

    private onMatchKindChanged() {
        this.updateFieldVisibility() ;
    }

    private updateFieldVisibility() {
        if (!this.match_kind_ || !this.first_value_ || !this.last_value_) {
            return ;
        }

        const kind = this.match_kind_.value ;
        const firstLabel = this.first_value_.parentElement ;
        const lastLabel = this.last_value_.parentElement ;

        if (kind === 'all') {
            // Hide both fields for 'all'
            if (firstLabel) firstLabel.style.display = 'none' ;
            if (lastLabel) lastLabel.style.display = 'none' ;
        } else if (kind === 'first') {
            // Show first field (number of matches), hide last field
            if (firstLabel) {
                firstLabel.style.display = 'block' ;
                (firstLabel.childNodes[0] as Text).textContent = 'Number of Matches' ;
            }
            if (lastLabel) lastLabel.style.display = 'none' ;
        } else if (kind === 'last') {
            // Show last field (number of matches), hide first field
            if (firstLabel) firstLabel.style.display = 'none' ;
            if (lastLabel) {
                lastLabel.style.display = 'block' ;
                (lastLabel.childNodes[0] as Text).textContent = 'Number of Matches' ;
            }
        } else if (kind === 'range') {
            // Show both fields for range
            if (firstLabel) {
                firstLabel.style.display = 'block' ;
                (firstLabel.childNodes[0] as Text).textContent = 'Start Match' ;
            }
            if (lastLabel) {
                lastLabel.style.display = 'block' ;
                (lastLabel.childNodes[0] as Text).textContent = 'End Match' ;
            }
        }
    }

    okButton(event: Event) {
        // Extract data back to the dataset before closing
        if (this.data_set_name_) {
            this.dataset_.name = this.data_set_name_.value ;
        }

        let dsm : IPCMatchSetRange = {
            kind: 'all',
            first: 0,
            last: 0,
        }
        
        if (this.match_kind_) {
            dsm.kind = this.match_kind_.value as "last" | "first" | "range" | "all" ;
        }
        
        if (this.first_value_) {
            dsm.first = parseInt(this.first_value_.value) || 0 ;
        }
        
        if (this.last_value_) {
            dsm.last = parseInt(this.last_value_.value) || 0 ;
        }

        this.dataset_.matches = dsm ;
        
        if (this.formula_) {
            this.dataset_.formula = this.formula_.value ;
        }

        super.okButton(event) ;
    }
}
