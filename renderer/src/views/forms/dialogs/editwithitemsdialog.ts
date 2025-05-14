import { CellComponent, ColumnDefinition, TabulatorFull } from "tabulator-tables";
import { FormControl } from "../controls/formctrl.js";
import { EditFormControlDialog } from "./editformctrldialog.js";
import { IPCDataValueType } from "../../../ipc.js";

export abstract class EditWithItemsDialog extends EditFormControlDialog {
    private table_? : TabulatorFull ;
    private data_type_display_? : HTMLSpanElement ;        

    constructor(name: string, formctrl: FormControl) {
        super(name, formctrl) ;
    }

    private getColumnData() : string[] {
        let data : string[] = [] ;
        for(let row of this.table_!.getRows()) {
            let d = row.getData() ;
            data.push(d.value) ;
        }
        return data ;
    }

    private tableReady() { 
        this.data_type_display_!.innerText = 'Data Type: ' + this.deduceDataType(this.getColumnData()) ;        
    }

    protected extractChoices() : any[] {
        let data : any[] = [] ;
        for(let row of this.table_!.getRows()) {
            let d = row.getData() ;
            data.push({
                text: d.text,
                value: d.value,
            }) ;
        }
        return data ;
    }

    protected extractDataType() : IPCDataValueType {
        let data = this.getColumnData() ;
        return this.deduceDataType(data) ;
    }

    protected populateChoices(div: HTMLElement, datatype: HTMLElement, choices: any[]) : void {
        this.data_type_display_ = datatype ;

        let bigdiv = document.createElement('div') ;
        bigdiv.className = 'xero-popup-form-edit-dialog-bigdiv' ;
        div.appendChild(bigdiv) ;

        let tdiv = document.createElement('div') ;
        tdiv.className = 'xero-popup-form-edit-dialog-table-div' ;
        bigdiv.appendChild(tdiv) ;

        let cols : ColumnDefinition[] = [] ;
        cols.push({
            field: 'text',
            title: 'Display',
            editor: 'input',
        }) ;
    
        cols.push({
            field: 'value',
            title: 'Value',
            editor: 'input',
        }) ;

        this.table_ = new TabulatorFull(tdiv, 
            {
                data:choices,
                columns:cols,
                selectableRows: 1,
                layout: 'fitColumns',
            });
        this.table_.on('tableBuilt', this.tableReady.bind(this)) ;
        this.table_.on('cellEdited', this.tableCellChanged.bind(this)) ;

        let btndiv = document.createElement('div') ;
        btndiv.className = 'xero-popup-form-edit-dialog-choice-button-div' ;
        bigdiv.appendChild(btndiv) ;

        let addbtn = document.createElement('button') ;
        addbtn.className = 'xero-popup-form-edit-dialog-choice-button' ;
        addbtn.innerHTML = '&#x2795;' ;
        addbtn.addEventListener('click', this.addChoice.bind(this)) ;
        btndiv.appendChild(addbtn) ;

        let delbtn = document.createElement('button') ;
        delbtn.className = 'xero-popup-form-edit-dialog-choice-button' ;
        delbtn.innerHTML = '&#x2796;' ;
        delbtn.addEventListener('click', this.deleteChoice.bind(this)) ;
        btndiv.appendChild(delbtn) ;
    }

    private deleteChoice() : void {
        let rows = this.table_!.getSelectedRows() ;
        if (rows.length !== 1) {
            return ;
        }
        let row = rows[0] ;
        this.table_!.deleteRow(row) ;
        this.data_type_display_!.innerText = 'Data Type: ' + this.deduceDataType(this.getColumnData()) ;
    }

    private addChoice() : void {
        this.table_!.addRow(
            {
                text: 'New Choice',
                value: 'new_value',
            }
        ) ;

        this.data_type_display_!.innerText = 'Data Type: ' + this.deduceDataType(this.getColumnData()) ;
    }

    private tableCellChanged(cell: CellComponent) : void {
        this.data_type_display_!.innerText = 'Data Type: ' + this.deduceDataType(this.getColumnData()) ;
    }
}
