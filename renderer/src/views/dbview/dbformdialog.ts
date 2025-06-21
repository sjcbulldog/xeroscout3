import { CellComponent, EmptyCallback, TabulatorFull } from "tabulator-tables";
import { XeroDialog } from "../../widgets/xerodialog.js";
import { IPCCheckDBViewFormula, IPCColumnDesc, IPCFormula, IPCProjColumnsConfig, IPCProjectColumnCfg } from "../../shared/ipc.js";

export class DBViewFormulaDialog extends XeroDialog {
    private table_? : TabulatorFull ;
    private format_entries_ : IPCCheckDBViewFormula[] ;
    private formulas_ : IPCFormula[] = [] ;
    private columns_ : IPCColumnDesc[] = [] ;

    constructor(forms: IPCCheckDBViewFormula[], formulas: IPCFormula[], columns: IPCColumnDesc[]) {
        super('Edit Database Check Formulas') ;
        this.format_entries_ = forms ;
        this.formulas_ = formulas ;
        this.columns_ = columns ;
        this.disableEnterKeyProcessing() ;
    }

    public get formatFormulas() : IPCCheckDBViewFormula[] {
        return this.format_entries_ ;
    }

    async populateDialog(pdiv: HTMLDivElement) {
        let div = document.createElement('div') ;
        div.className = 'xero-db-' ;

        this.table_ = new TabulatorFull(div, 
            {
                editTriggerEvent: 'dblclick',
                data: this.format_entries_,
                columns: [
                    { title: '', field: 'del', formatter: this.formatDelCell.bind(this), width: 30},
                    { title: 'Column', field: 'column', width: 200, editable: this.canEditCell.bind(this), editor: 'list', 
                      editorParams: {
                        values: this.columns_.map((c) => c.name),
                      }
                    },
                    { title: 'Formula', field: 'formula', width: 300, editable: this.canEditCell.bind(this), editor: 'list', 
                      editorParams: {
                        values: this.formulas_.map((f) => f.name),
                      }
                    },
                    { title: 'Message', field: 'message', width: 300, editable: this.canEditCell.bind(this), editor: 'input' },
                    { title: 'Background', field: 'background', width: 100, editable: this.canEditCell.bind(this), editor: 'input' },
                    { title: 'Color', field: 'color', width: 100, editable: this.canEditCell.bind(this), editor: 'input' },
                    { title: 'Formatting', field: 'formatting', formatter: this.formatFormattingCell.bind(this), editable: false},
                ],
                layout: 'fitColumns',
            }) ;

        this.table_.on('tableBuilt', this.tableBuilt.bind(this)) ;
        this.table_.on('cellEdited', this.cellEdited.bind(this)) ;
        pdiv.appendChild(div) ;
    }

    private canEditCell(cell: CellComponent) : boolean {
        // Allow editing only if the cell is not in the last row
        console.log('canEditCell', cell.getField(), this.isLastRow(cell)) ;
        return !this.isLastRow(cell) ;
    }

    private cellEdited(cell: CellComponent) {
        let data = cell.getData() as IPCCheckDBViewFormula ;
        if (!this.isLastRow(cell)) {
            let fmtcell = cell.getRow().getCell('formatting') ;
            fmtcell.setValue('Formatting') ;
        }
    }

    private isLastRow(cell: CellComponent) : boolean {
        let row = cell.getRow() ;
        if (row.getNextRow() === false) {
            return true ;
        }

        return false ;
    }

    private formatDelCell(cell: CellComponent, formatterParams: {}, onRendered: EmptyCallback) : HTMLElement {
        let ret: HTMLElement ;

        if (this.isLastRow(cell)) {
            ret = document.createElement('button') ;
            ret.addEventListener('click', this.addFormat.bind(this)) ;
            ret.innerHTML = '<b>+</b>' ;
        }
        else {
            ret = document.createElement('button') ;
            ret.addEventListener('click', this.delFormat.bind(this, cell)) ;
            ret.innerHTML = '<b>-</b>' ;
        }

        return ret;
    }

    private addFormat(e: MouseEvent) {
        let entry = {
            formula: this.formulas_[0].name,
            message: 'New Database Check Formula',
            background: '#000000',
            color: '#ffffff',
        }
        this.table_!.addRow(entry, true) ;
    }

    private delFormat(cell: CellComponent, e: MouseEvent) {
        this.table_?.deleteRow(cell.getRow()) ;
    }    

    private tableBuilt() {
        this.table_!.addRow({
        })
    }
    
    private formatFormattingCell(cell: CellComponent, formatterParams: {}, onRendered: EmptyCallback) : HTMLSpanElement {
        let data = cell.getData() as IPCCheckDBViewFormula ;
        let elem = document.createElement('span') ;
        elem.innerHTML = this.isLastRow(cell) ? '' : 'Formatting' ;
        elem.style.backgroundColor = data.background ;
        elem.style.color = data.color ;

        return elem ;
    }

    private extractFormulas() {
        let formulas: IPCCheckDBViewFormula[] = [] ;

        for(let row of this.table_!.getRows()) {
            if (row.getNextRow() === false) {
                break ;
            }

            let data = row.getData() as IPCCheckDBViewFormula ;
            if (data.formula && data.formula.length > 0 && data.message && data.message.length > 0) {
                let formula: IPCCheckDBViewFormula = {
                    formula: data.formula,
                    message: data.message,
                    background: data.background || '#000000',
                    color: data.color || '#ffffff',
                    column: data.column,
                };
                formulas.push(formula) ;
            }
        }

        this.format_entries_ = formulas ;
    }

    public okButton(ev: KeyboardEvent) {
        this.extractFormulas() ;
        super.okButton(ev) ;
    }
}
