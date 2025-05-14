import { TabulatorFull } from "tabulator-tables";
import {  XeroApp  } from "../apps/xeroapp.js";
import {  XeroView  } from "./xeroview.js";

export class XeroTeamStatus extends XeroView {
    private main_div_? : HTMLDivElement ;
    private table_? : TabulatorFull ;
    
    public constructor(app: XeroApp, args: any[]) {
        super(app, 'xero-team-status') ;

        this.registerCallback('send-team-status', this.receivedTeamStatus.bind(this)) ;
        this.request('get-team-status', args) ;
    }

    private receivedTeamStatus( args: any) {
        this.main_div_ = document.createElement('div') ;
        this.main_div_.classList.add('xero-teamstatus-view') ;
        this.elem.appendChild(this.main_div_) ;

        this.table_ = new TabulatorFull(this.main_div_, {
            data: args,
            columns: [
                { title: 'Number', field: 'number'},
                { title: 'Name', field: 'teamname'},
                { title: 'Tablet', field: 'tablet'},
                { title: 'Status', field: 'status'},
            ],
        }) ;
    }

    private cellFormatter(cell: HTMLElement) {
        if (cell.innerText === 'Y') {
            cell.style.backgroundColor = 'lightgreen' ;
        }
        else {
            cell.style.backgroundColor = 'lightcoral' ;
        }
    }
}