import { CellComponent, TabulatorFull } from "tabulator-tables";
import {  XeroApp  } from "../apps/xeroapp.js";
import {  XeroView  } from "./xeroview.js";
import { IPCTeamStatus } from "../shared/ipc.js";

export class XeroTeamStatus extends XeroView {
    private main_div_? : HTMLDivElement ;
    private table_? : TabulatorFull ;
    
    public constructor(app: XeroApp, args: any[]) {
        super(app, 'xero-team-status') ;

        this.registerCallback('send-team-status', this.receivedTeamStatus.bind(this)) ;
        this.request('get-team-status', args) ;
    }

    private receivedTeamStatus(status: IPCTeamStatus[]) {
        this.main_div_ = document.createElement('div') ;
        this.main_div_.classList.add('xero-teamstatus-view') ;
        this.elem.appendChild(this.main_div_) ;

        this.table_ = new TabulatorFull(this.main_div_, {
            data: status,
            columns: [
                { title: 'Number', field: 'number'},
                { title: 'Name', field: 'teamname'},
                { title: 'Tablet', field: 'tablet'},
                { title: 'Status', field: 'status', formatter: this.cellFormatter.bind(this) },
            ],
        }) ;
    }

    private cellFormatter(cell: CellComponent, params: any, onRendered: any) : string {
        let val = cell.getValue();
        let el = cell.getElement();

        if (val == 'Y') {
            el.style.fontSize = '16px';
            el.style.textAlign = 'center' ;
            el.style.backgroundColor = 'green' ;
            el.style.color = 'white' ;
            val = 'Scouted' ;
        }
        else {
            val = '' ;
        }

        return val;
    }
}