import { CellComponent, TabulatorFull } from "tabulator-tables";
import {  XeroApp  } from "../apps/xeroapp.js";
import {  XeroView  } from "./xeroview.js";

export class XeroMatchStatus extends XeroView {
    private main_div_? : HTMLDivElement ;
    private table_? : TabulatorFull ;
    
    public constructor(app: XeroApp, args: any[]) {
        super(app, 'xero-match-status') ;

        this.registerCallback('send-match-status', this.receivedMatchStatus.bind(this)) ;
        this.request('get-match-status', args) ;
    }

    private mapMatchType(mtype: string) : number {
        let ret= -1 ;

        if (mtype === 'f') {
            ret = 3 ;
        }
        else if (mtype === 'sf') {
            ret = 2 ;
        }
        else {
            ret = 1 ;
        }

        return ret;
    }

    private sortMatchFunc(a: any, b: any): number {
        let ret = 0;

        let atype = this.mapMatchType(a.comp_level);
        let btype = this.mapMatchType(b.comp_level);

        if (atype < btype) {
            ret = -1;
        }
        else if (atype > btype) {
            ret = 1;
        }
        else {
            if (a.match_number < b.match_number) {
                ret = -1;
            }
            else if (a.match_number > b.match_number) {
                ret = 1;
            }
            else {
                if (a.set_number < b.set_number) {
                    ret = -1;
                }
                else if (a.set_number > b.set_number) {
                    ret = 1;
                }
                else {
                    ret = 0;
                }
            }
        }
        return ret;
    }

    private receivedMatchStatus( args: any) {
        this.main_div_ = document.createElement('div') ;
        this.main_div_.classList.add('xero-teamstatus-view') ;
        this.elem.appendChild(this.main_div_) ;

        this.table_ = new TabulatorFull(this.main_div_, {
            data: args,
            resizableColumnFit:true,
            columns: [
                { title: 'Type', field: 'comp_level'},
                { title: 'Match', field: 'match_number'},
                { title: 'Set', field: 'set_number'},

                { title: 'Blue 1', field: 'blue1'},
                { title: 'Blue Tablet 1', field: 'bluetab1'},
                { title: 'Blue 1 Status', field: 'bluest1', formatter: this.cellFormatter.bind(this) },

                { title: 'Blue 2', field: 'blue2'},
                { title: 'Blue Tablet 2', field: 'bluetab2'},
                { title: 'Blue 2 Status', field: 'bluest2', formatter: this.cellFormatter.bind(this)},

                { title: 'Blue 3', field: 'blue3'},
                { title: 'Blue Tablet 3', field: 'bluetab3'},
                { title: 'Blue 3 Status', field: 'bludst3', formatter: this.cellFormatter.bind(this)},

                { title: 'Red 1', field: 'red1'},
                { title: 'Red Tablet 1', field: 'redtab1'},
                { title: 'Red 1 Status', field: 'redst1', formatter: this.cellFormatter.bind(this)},

                { title: 'Red 2', field: 'red2'},
                { title: 'Red Tablet 2', field: 'redtab2'},
                { title: 'Red 2 Status', field: 'redst2', formatter: this.cellFormatter.bind(this)},

                { title: 'Red 3', field: 'red3'},
                { title: 'Red Tablet 3', field: 'redtab3'},
                { title: 'Red 3 Status', field: 'redst3', formatter: this.cellFormatter.bind(this)},
            ],
        }) ;
    }

    private cellFormatter(cell: CellComponent, params: any, onRendered: any) : HTMLElement{
        let val = cell.getValue();
        let el = cell.getElement();

        if (Math.random() > 0.75) {
            val = 'Y' ;
        }

        if (val == 'Y') {
            el.style.fontSize = '16px';
            el.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)' ;
            el.style.borderRadius = '5px' ;
            el.style.textAlign = 'center' ;
            val = 'Scouted' ;
        }
        else {
            val = '' ;
        }

        return val;
    }
}