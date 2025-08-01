import { CellComponent, TabulatorFull } from "tabulator-tables";
import { IPCAnalysisViewConfig } from "../../shared/ipc.js";
import { XeroDialog } from "../../widgets/xerodialog.js";

export class AnalysisConfigDialog extends XeroDialog {
    private config_ : IPCAnalysisViewConfig ;

    private config_name_?: HTMLInputElement ;
    private description_?: HTMLInputElement ;
    private dataset_select_? : HTMLSelectElement ;
    private list_div_? : HTMLDivElement ;
    private match_fields_table_div_? : HTMLDivElement ;
    private match_fields_table_? : TabulatorFull ;
    private team_fields_table_div_? : HTMLDivElement ;
    private team_fields_table_? : TabulatorFull ;
    private formula_table_div_? : HTMLDivElement ;
    private formula_table_? : TabulatorFull ;
    private err_msg_? : HTMLSpanElement ;
    private names_ : string[] ;
    private datasets_ : string[] = [] ;
    private match_fields_ : string[] = [] ;
    private team_fields_ : string[] = [] ;
    private formulas_ : string[] = [] ;

    constructor(config: IPCAnalysisViewConfig, title: string, names: string[], datasets: string[], match_fields: string[], team_fields: string[], formulas: string[]) {
        super(title) ;

        this.config_ = JSON.parse(JSON.stringify(config)) as IPCAnalysisViewConfig ;

        this.names_ = names ;        
        this.match_fields_ = match_fields ;
        this.team_fields_ = team_fields ;
        this.formulas_ = formulas ;
        this.datasets_ = datasets ;
    }

    public get config(): IPCAnalysisViewConfig {
        return this.config_ ;
    }

    async populateDialog(pdiv: HTMLDivElement) {
        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.config_name_ = document.createElement('input') ;
        this.config_name_.type = 'text' ;
        this.config_name_.maxLength = 16 ;
        this.config_name_.className = 'xero-popup-form-edit-dialog-input' ;
        this.config_name_.value = this.config_.name ;
        this.config_name_.placeholder = 'Enter Single view configuration name' ;
        this.config_name_.value = this.config_.name ;

        let label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Config Name:' ;
        label.appendChild(this.config_name_) ;
        div.appendChild(label) ;

        this.description_ = document.createElement('input') ;
        this.description_.type = 'text' ;
        this.description_.maxLength = 100 ;
        this.description_.className = 'xero-popup-form-edit-dialog-input' ;
        this.description_.value = this.config_.description ;
        this.description_.placeholder = 'Enter description' ;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Description:' ;
        label.appendChild(this.description_) ;
        div.appendChild(label) ;
    
        this.dataset_select_ = document.createElement('select') ;
        this.dataset_select_.className = 'xero-popup-form-edit-dialog-select' ;

        for (let dataset of this.datasets_) {
            let option = document.createElement('option') ;
            option.value = dataset ;
            option.innerText = dataset ;
            if (dataset === this.config_.dataset) {
                option.selected = true ;
            }
            this.dataset_select_.appendChild(option) ;
        }
        this.dataset_select_.value = this.config_.dataset ;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Data Set:' ;
        label.appendChild(this.dataset_select_) ;
        div.appendChild(label) ;

        this.list_div_ = document.createElement('div') ;
        this.list_div_.className = 'xero-popup-form-new-formula-list-div' ;
        div.appendChild(this.list_div_) ;

        this.match_fields_table_div_ = document.createElement('div') ;
        this.match_fields_table_div_.className = 'xero-popup-form-new-formula-table-div' ;
        this.list_div_.appendChild(this.match_fields_table_div_) ;

        this.match_fields_table_ = new TabulatorFull(this.match_fields_table_div_, {
            data: this.createFieldData(this.match_fields_),
            columns: [
                { title: 'Included', field: 'visible', formatter: 'tickCross', width: 100},                  
                { title: 'Match', field: 'name' , width: 200},
            ],
            layout: 'fitData',
            maxHeight: '300px',
        }) ;
        this.match_fields_table_.on('cellClick', this.cellClick.bind(this)) ;

        this.team_fields_table_div_ = document.createElement('div') ;
        this.team_fields_table_div_.className = 'xero-popup-form-new-formula-table-div' ;
        this.list_div_.appendChild(this.team_fields_table_div_) ;

        this.team_fields_table_ = new TabulatorFull(this.team_fields_table_div_, {
            data: this.createFieldData(this.team_fields_),
            columns: [
                { title: 'Included', field: 'visible', formatter: 'tickCross', width: 100},                 
                { title: 'Team', field: 'name' , width: 200},
            ],
            layout: 'fitColumns',
            maxHeight: '300px'
        }) ;        
        this.team_fields_table_.on('cellClick', this.cellClick.bind(this)) ;

        this.formula_table_div_ = document.createElement('div') ;
        this.formula_table_div_.className = 'xero-popup-form-new-formula-table-div' ;
        this.list_div_.appendChild(this.formula_table_div_) ;

        this.formula_table_ = new TabulatorFull(this.formula_table_div_, {
            data: this.createFieldData(this.formulas_),
            columns: [
                { title: 'Included', field: 'visible', formatter: 'tickCross', width: 100},                  
                { title: 'Formula', field: 'name' , width: 200},
            ],
            layout: 'fitColumns',
            maxHeight: '300px'
        }) ;
        this.formula_table_.on('cellClick', this.cellClick.bind(this)) ;

        this.err_msg_ = document.createElement('span') ;
        this.err_msg_.className = 'xero-popup-form-edit-dialog-error-message' ;
        div.appendChild(this.err_msg_) ;        

        pdiv.appendChild(div) ;
    }

    public okButton(event: Event) {
        this.config_.name = this.config_name_!.value ;
        this.config_.description = this.description_!.value ;
        this.config_.dataset = this.dataset_select_!.value ;
        this.config_.fields = [] ;
        for(let row of this.match_fields_table_!.getData()) {
            if (row.visible) {
                this.config_.fields.push(row.name) ;
            }
        }

        for(let row of this.team_fields_table_!.getData()) {
            if (row.visible) {
                this.config_.fields.push(row.name) ;
            }
        }

        for(let row of this.formula_table_!.getData()) {
            if (row.visible) {
                this.config_.fields.push(row.name) ;
            }
        }
    }

    protected isOKToClose(changed: boolean) : boolean {
        if (changed) {
            let name = this.config_name_?.value.trim() || '' ;            
            if (name === '') {
                this.err_msg_!.innerText = 'Single view configuration name cannot be empty.' ;
                this.config_name_!.focus() ;
                return false ;
            }

            if (name.length > 16) {
                this.err_msg_!.innerText = 'Single view configuration name cannot be longer than 16 characters.' ;
                this.config_name_!.focus() ;
                return false ;
            }

            for(let ch of this.config_name_!.value) {
                if (!ch.match(/[a-zA-Z0-9_]/)) {
                    this.err_msg_!.innerText = 'Single view configuration name can only contain alphanumeric characters and underscores.' ;
                    this.config_name_!.focus() ;
                    return false ;
                }
            }

            if (this.description_!.value.trim().length === 0) {
                this.err_msg_!.innerText = 'Description cannot be empty.' ;
                this.description_!.focus() ;
                return false ;
            }

            if (this.names_.includes(name)) {
                this.err_msg_!.innerText = 'Single view configuration name must be unique.' ;
                this.config_name_!.focus() ;
                return false ;
            }

            if (this.dataset_select_!.value == '') {
                this.err_msg_!.innerText = 'Data set must be selected.' ;
                this.dataset_select_!.focus() ;
                return false ;
            }
        }

        return true ;
    }

    private cellClick(e: UIEvent, cell: CellComponent) {
        if (cell.getField() === 'visible') {
            let data = cell.getData() ;
            data.visible = !data.visible ;
            cell.setValue(data.visible) ;
        }
    }       

    private createFieldData(names: string[]) : any[] {
        let ret = [] ;
        for(let name of names) {
            ret.push(
                { 
                    name: name, 
                    visible: this.config_.fields.includes(name)
            }) ;
        }

        return ret ;
    }
}
