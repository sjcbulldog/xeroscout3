import { CellComponent, EmptyCallback, TabulatorFull } from "tabulator-tables";
import { XeroDialog } from "../../widgets/xerodialog.js";
import { IPCCheckDBViewFormula, IPCProjColumnsConfig, IPCProjectColumnCfg } from "../../shared/ipc.js";

export class DBViewFormulaDialog extends XeroDialog {
    private table_? : TabulatorFull ;
    private forms_ : IPCCheckDBViewFormula[] ;

    constructor(forms: IPCCheckDBViewFormula[]) {
        super('Edit Database Check Formulas') ;
        this.forms_ = forms ;
    }

    async populateDialog(pdiv: HTMLDivElement) {
        let div = document.createElement('div') ;
        div.className = 'xero-db-' ;

        this.table_ = new TabulatorFull(div, 
            {
                data: this.forms_,
                columns: [
                    { title: '', formatter: 'buttonCross', width: 25 },
                    { title: 'Formula', field: 'formula', width: 300, editable: true, editor: this.forumlaEditor.bind(this) },
                    { title: 'Message', field: 'message', width: 300, editable: true, editor: 'input' },
                    { title: 'Formatting', field: 'formatting', formatter: this.formatFormattingCell.bind(this)}
                ],
                layout: 'fitColumns',
            }) ;

        pdiv.appendChild(div) ;
    }

    private forumlaEditor(cell: CellComponent, onRendered: EmptyCallback) : HTMLElement {
        let data = cell.getData() as IPCCheckDBViewFormula ;
        let input = document.createElement('input') ;
        input.type = 'text' ;
        input.value = data.formula ;
        input.maxLength = 1000 ;
        input.style.width = '100%' ;
        input.style.height = '100%' ;

        return input ;
    }

    private formatFormattingCell(cell: CellComponent, formatterParams: {}, onRendered: EmptyCallback) : HTMLSpanElement{
        let data = cell.getData() as IPCCheckDBViewFormula ;
        let elem = document.createElement('span') ;
        elem.innerHTML = 'Formatting' ;
        elem.style.backgroundColor = data.background ;
        elem.style.color = data.color ;

        return elem ;
    }
}
