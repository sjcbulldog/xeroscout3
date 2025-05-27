import { CellComponent, TabulatorFull } from "tabulator-tables";
import { XeroDialog } from "../../widgets/xerodialog.js";
import { IPCProjColumnsConfig, IPCProjectColumnCfg } from "../../ipc.js";

export class ShowHideColumnsDialog extends XeroDialog {
    private colcfgs_ : IPCProjColumnsConfig ;
    private table_? : TabulatorFull ;

    constructor(colcfg: IPCProjColumnsConfig) {
        super('Edit Section Name') ;
        this.colcfgs_ = colcfg ;
    }

    async populateDialog(pdiv: HTMLDivElement) {
        let div = document.createElement('div') ;
        div.className = 'xero-db-dialog-hide-show' ;

        this.table_ = new TabulatorFull(div, 
            {
                data: this.generateData(),
                columns: [
                    { title: 'Column Name', field: 'name', width: 200 },
                    { title: 'Visible', field: 'visible', formatter: 'tickCross', width: 100},
                    { title: 'Frozen', field: 'frozen', formatter: 'tickCross', width: 100 },
                ],
                layout: 'fitColumns',
            }) ;

        this.table_.on('cellClick', this.cellClick.bind(this)) ;

        pdiv.appendChild(div) ;
    }

    private cellClick(e: UIEvent, cell: CellComponent) {
        if (cell.getField() === 'visible') {
            let data = cell.getData() ;
            data.visible = !data.visible ;
            cell.setValue(data.visible) ;
        }
        else if (cell.getField() === 'frozen') {
            let pos = cell.getRow().getPosition() ;
            if (typeof pos !== 'number') {
                return ;
            }

            if (pos === 1) {
                let data = cell.getData() ;
                if (data.frozen) {
                for (let row of this.table_!.getRows()) {
                    let rcell = row.getCell('frozen') ;
                    let rdata = rcell.getData() ;
                    rdata.frozen = false ;
                    rcell.setValue(rdata.frozen) ;
                }                    
                }
                else {
                    data.frozen = true ;
                    cell.setValue(data.frozen) ;                
                }
            }
            else {
                for (let row of this.table_!.getRows()) {
                    let rcell = row.getCell('frozen') ;
                    let rdata = rcell.getData() ;
                    rdata.frozen = ((row.getPosition() as number) <= pos),
                    rcell.setValue(rdata.frozen) ;
                }
            }
        }
    }

    private generateData() : any[] {
        let data: any[] = [] ;
        for (let i = 0; i < this.colcfgs_.columns.length; i++) {
            let colcfg = this.colcfgs_.columns[i] ;
            data.push({
                name: colcfg.name,
                visible: !colcfg.hidden,
                frozen: (i < this.colcfgs_.frozenColumnCount) ? true : undefined,
            }) ;
        }
        return data ;
    }

    public okButton(event: Event) {
        let index = 0 ;
        this.colcfgs_.frozenColumnCount = 0 ;
        for(let row of this.table_!.getRows()) {
            let data = row.getData() ;
            let colcfg = this.colcfgs_.columns[index] ;
            colcfg.hidden = !data.visible ;

            if (data.frozen) {
                this.colcfgs_.frozenColumnCount = index + 1 ;
            }

            index++ ;
        }

        super.okButton(event) ;        
    }
}
