import { CellComponent, RowComponent, TabulatorFull } from "tabulator-tables";
import { IPCTabletDefn } from "../../shared/ipc.js";
import { XeroDialog } from "../../widgets/xerodialog.js";

export class SelectTabletDialog extends XeroDialog {
    private tablets_: IPCTabletDefn[] ;
    private table_? : TabulatorFull ;
    private selected_tablet_? : IPCTabletDefn ;
    
    constructor(tablets: IPCTabletDefn[]) {
        super('Select Tablet') ;
        this.tablets_ = tablets ;
    }

    public get selectedTablet() : IPCTabletDefn | undefined {
        return this.selected_tablet_ ;
    }

    async populateDialog(pdiv: HTMLDivElement) {
        let div = document.createElement('div') ;
        div.className = 'xero-db-dialog-hide-show' ;

        this.table_ = new TabulatorFull(div, 
            {
                data: this.tablets_,
                selectableRows: 1,
                columns: [
                    { title: 'Tablet Name', field: 'name', width: 200},
                    { title: 'Tablet Type', field: 'purpose', width: 200 },
                ],
                layout: 'fitColumns',
            }) ;

        this.table_.on('cellDblClick', this.cellDblClick.bind(this)) ;

        pdiv.appendChild(div) ;
    }    

    private cellDblClick(ev: UIEvent, cell: CellComponent) {
        let row = cell.getRow() ;
        if (row) {
            row.select() ;
            this.okButton(ev) ;
        }
    }

    protected isOKToClose(ok: boolean): boolean {
        let ret  = true ;
        let rows = this.table_?.getSelectedRows() ;
        if (rows && rows.length === 1) {
            let data = rows[0].getData() ;
            this.selected_tablet_ = {
                name: data.name,
                purpose: data.purpose
            }
        } else {
            alert('You must select a tablet before closing this dialog.') ;
            ret = false ;
        }

        return ret;
    }
}