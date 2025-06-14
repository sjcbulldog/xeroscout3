import { TabulatorFull } from "tabulator-tables";
import { XeroDialog } from "../../widgets/xerodialog.js";
import { IPCColumnDesc, IPCFormula } from "../../shared/ipc.js";
import { Expr } from "../../shared/expr.js";

export class NewFormulaDialog extends XeroDialog {

    private topdiv_? : HTMLDivElement ;

    private name_ : string = '' ;
    private name_input_?: HTMLInputElement ;
    private name_label_?: HTMLLabelElement ;

    private desc_ : string = '' ;
    private desc_input_?: HTMLInputElement ;
    private desc_label_?: HTMLLabelElement ;

    private expr_ : string = '' ;
    private expr_input_?: HTMLInputElement ;
    private expr_label_?: HTMLLabelElement ;

    private err_msg_? : HTMLSpanElement ;

    private list_div_? : HTMLDivElement ;

    private match_fields_table_div_? : HTMLDivElement ;
    private team_fields_table_div_? : HTMLDivElement ;
    private formula_table_div_? : HTMLDivElement ;
    private function_table_div_? : HTMLDivElement ;

    private match_fields_table_? : TabulatorFull ;
    private team_fields_table_? : TabulatorFull ;
    private formula_table_? : TabulatorFull ;
    private function_table_? : TabulatorFull ;

    private match_fields_ : IPCColumnDesc[] = [] ;
    private team_fields_ : IPCColumnDesc[] = [] ;
    private formulas_ : IPCFormula[] = [] ;

    private init_name_ : string = '' ;
    private init_expr_ : string = '' ;
    private init_desc_ : string = '' ;

    constructor(formulas: IPCFormula[], match_fields: IPCColumnDesc[], team_fields: IPCColumnDesc[],
                name: string = '', expr: string = '', desc: string = '') {
        super('New Formula') ;

        this.match_fields_ = match_fields ;
        this.team_fields_ = team_fields ;
        this.formulas_ = formulas ;

        this.init_name_ = name ;
        this.init_expr_ = expr ;
        this.init_desc_ = desc ;
    }

    public get name() : string {
        return this.name_ ;
    }

    public get expr() : string {
        return this.expr_ ;
    }

    public get desc() : string {
        return this.desc_ ;
    }

    async populateDialog(pdiv: HTMLDivElement) {
        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-newformula-rowdiv' ;

        this.topdiv_ = document.createElement('div') ;
        this.topdiv_.className = 'xero-popup-form-edit-dialog-newformula-topdiv' ;
        div.appendChild(this.topdiv_) ;

        this.name_input_ = document.createElement('input') ;
        this.name_input_.type = 'text' ;
        this.name_input_.className = 'xero-popup-form-edit-dialog-input' ;
        this.name_input_.value = this.init_name_ ;

        this.name_label_ = document.createElement('label') ;
        this.name_label_.className = 'xero-popup-form-edit-dialog-label' ;
        this.name_label_.innerText = 'Name' ;
        this.name_label_.appendChild(this.name_input_) ;
        this.topdiv_.appendChild(this.name_label_) ;

        this.desc_input_ = document.createElement('input') ;
        this.desc_input_.type = 'text' ;
        this.desc_input_.className = 'xero-popup-form-edit-dialog-input' ;
        this.desc_input_.value = this.init_desc_ ;

        this.desc_label_ = document.createElement('label') ;
        this.desc_label_.className = 'xero-popup-form-edit-dialog-label' ;
        this.desc_label_.innerText = 'Description' ;
        this.desc_label_.appendChild(this.desc_input_) ;
        this.topdiv_.appendChild(this.desc_label_) ;

        this.expr_input_ = document.createElement('input') ;
        this.expr_input_.type = 'text' ;
        this.expr_input_.style.width = '600px' ;
        this.expr_input_.className = 'xero-popup-form-edit-dialog-input' ;
        this.expr_input_.value = this.init_expr_ ;
        this.expr_input_.addEventListener('input', () => this.onExprChanged()) ;

        this.expr_label_ = document.createElement('label') ;
        this.expr_label_.className = 'xero-popup-form-edit-dialog-label' ;
        this.expr_label_.innerText = 'Expression' ;
        this.expr_label_.appendChild(this.expr_input_) ;
        this.topdiv_.appendChild(this.expr_label_) ;

        this.err_msg_ = document.createElement('span') ;
        this.err_msg_.className = 'xero-popup-form-edit-dialog-error-message' ;
        this.topdiv_.appendChild(this.err_msg_) ;

        this.list_div_ = document.createElement('div') ;
        this.list_div_.className = 'xero-popup-form-new-formula-list-div' ;

        this.match_fields_table_div_ = document.createElement('div') ;
        this.match_fields_table_div_.className = 'xero-popup-form-new-formula-table-div' ;
        this.list_div_.appendChild(this.match_fields_table_div_) ;

        this.match_fields_table_ = new TabulatorFull(this.match_fields_table_div_, {
            data: this.match_fields_,
            columns: [
                { title: 'Match', field: 'name' , width: 200}
            ],
            layout: 'fitData',
            maxHeight: '400px',
        }) ;

        this.team_fields_table_div_ = document.createElement('div') ;
        this.team_fields_table_div_.className = 'xero-popup-form-new-formula-table-div' ;
        this.list_div_.appendChild(this.team_fields_table_div_) ;

        this.team_fields_table_ = new TabulatorFull(this.team_fields_table_div_, {
            data: this.team_fields_,
            columns: [
                { title: 'Team', field: 'name' , width: 200}
            ],
            layout: 'fitColumns',
            maxHeight: '400px'
        }) ;        

        this.formula_table_div_ = document.createElement('div') ;
        this.formula_table_div_.className = 'xero-popup-form-new-formula-table-div' ;
        this.list_div_.appendChild(this.formula_table_div_) ;

        this.formula_table_ = new TabulatorFull(this.formula_table_div_, {
            data: this.formulas_,
            columns: [
                { title: 'Formula', field: 'name' , width: 200}
            ],
            layout: 'fitColumns',
            maxHeight: '400px'
        }) ;
        
        this.function_table_div_ = document.createElement('div') ;
        this.function_table_div_.className = 'xero-popup-form-new-formula-table-div' ;
        this.list_div_.appendChild(this.function_table_div_) ;

        this.function_table_ = new TabulatorFull(this.function_table_div_, {
            data: Expr.availableFunctions(),
            columns: [
                { title: 'Functions', field: 'name' , width: 200}
            ],
            layout: 'fitColumns',
            maxHeight: '400px'
        }) ;

        div.appendChild(this.list_div_) ;
        pdiv.appendChild(div) ;
    }

    private onExprChanged() {
        let expr = this.expr_input_!.value ;
        let index = expr.length - 1 ;

        while (index >= 0) {
            let ch = expr[index] ;
            if (/[a-zA-Z0-9_]/.test(ch) === false) {
                break ;
            }
            index-- ;
        }

        let word = '' ;
        if (index < expr.length - 1) {
            word = expr.substring(index + 1) ;
        }

        if (word.length === 0) {
            this.team_fields_table_!.clearFilter(true) ;
            this.match_fields_table_!.clearFilter(true) ;
            this.formula_table_!.clearFilter(true) ;
            this.function_table_!.clearFilter(true) ;
        }
        else {
            this.team_fields_table_!.setFilter('name', 'starts', word) ;
            this.match_fields_table_!.setFilter('name', 'starts', word) ;
            this.formula_table_!.setFilter('name', 'starts', word) ;
            this.function_table_!.setFilter('name', 'starts', word) ;
        }
    } 

    public onInit() {
        this.name_input_!.focus() ;
    }

    public okButton(event: Event) {
        this.name_ = this.name_input_!.value ;
        this.expr_ = this.expr_input_!.value ;
        this.desc_ = this.desc_input_!.value ;
        super.okButton(event) ;
    }

    public isOKToClose(ok: boolean): boolean {
        if (!ok) {
            return true ;
        }
        
        if (this.name_ === '') {
            this.err_msg_!.innerText = 'Please enter a name for the formula.' ;
            this.name_label_!.classList.add('xero-popup-form-edit-dialog-label-error') ;
            return false ;
        }
        else {
            this.name_label_!.classList.remove('xero-popup-form-edit-dialog-label-error') ;
        }

        if (this.desc_ === '') {
            this.err_msg_!.innerText = 'Please enter a description for the formula.' ;
            this.desc_label_!.classList.add('xero-popup-form-edit-dialog-label-error') ;
            return false ;
        }
        else {
            this.desc_label_!.classList.remove('xero-popup-form-edit-dialog-label-error') ;
        }

        if (this.expr_ === '') {
            this.err_msg_!.innerText = 'Please enter an expression for the formula.' ;
            this.expr_label_!.classList.add('xero-popup-form-edit-dialog-label-error') ;
            return false ;
        }
        else {
            this.expr_label_!.classList.remove('xero-popup-form-edit-dialog-label-error') ;
        }

        let expr = Expr.parse(this.expr_)
        if (expr.hasError()) {
            this.err_msg_!.innerText = 'Invalid expression: ' + expr.getError()?.message ;
            return false ;
        }

        return true ;
    }
}
