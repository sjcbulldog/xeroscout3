import { ColumnDefinition, TabulatorFull } from "tabulator-tables";
import {  XeroApp  } from "../apps/xeroapp.js";
import {  IPCProjColumnsConfig  } from "../ipc.js";
import {  XeroView  } from "./xeroview.js";
import { DataValue } from "../utils/datavalue.js";

export class DatabaseView extends XeroView {
    private col_cfgs_? : IPCProjColumnsConfig ;
    private div_? : HTMLDivElement ;
    private top_? : HTMLDivElement ;
    private table_? : TabulatorFull ;
    private table_div_? : HTMLDivElement ;
    private checker_button_? : HTMLButtonElement ;

    protected constructor(app: XeroApp, clname: string, type: string) {
        super(app, clname);

        this.div_ = document.createElement('div') ;
        this.div_.className = 'xero-db-view' ;
        this.elem.appendChild(this.div_) ;

        this.top_ = document.createElement('div') ;
        this.top_.className = 'xero-db-view-top' ;
        this.div_.appendChild(this.top_) ;

        this.checker_button_ = document.createElement('button') ;
        this.checker_button_.className = 'xero-db-view-checker-button' ;
        this.checker_button_.innerText = 'Check All' ;
        this.top_.appendChild(this.checker_button_) ;


        this.table_div_ = document.createElement('div') ;
        this.table_div_.className = 'xero-db-view-table-div' ;
        this.div_.appendChild(this.table_div_) ;

        this.registerCallback('send-' + type + '-db', this.receiveData.bind(this));
        this.registerCallback('send-' + type + '-col-config', this.receiveColConfig.bind(this));
        this.request('get-' + type + '-db') ;
    }

    private hideHiddenColumns() {
        if (this.col_cfgs_) {
            let colobjs = this.table_!.getColumns() ;
            let index = 0 ;
            for(let col of this.table_!.getColumns()) {
                let cfg = this.col_cfgs_.columns[index] ;
                if (cfg && cfg.hidden) {
                    col.hide() ;
                }
            }
        }        
    }

    private createColumnDescs() : ColumnDefinition[] {
        let cols: ColumnDefinition[] = [] ;

        for (let i = 0; i < this.col_cfgs_!.columns.length; i++) {
            let col = this.col_cfgs_!.columns[i] ;
            let col_desc: ColumnDefinition = {
                title: col.name,
                field: col.name,
            } ;
            cols.push(col_desc) ;
        }

        return cols ;
    }


    private convertData(data: any[]) {
        let ret : any[] = [] ;
        for(let one of data) {
            let newobj : any = {}
            for (let key of Object.keys(one)) {
                let value = one[key] ;
                if (DataValue.isNull(value)) {
                    newobj[key] = '' ;
                }
                else {
                    newobj[key] = DataValue.toValueString(value) ;
                }
            }
            ret.push(newobj) ;
        }
        return ret;
    }

    private receiveData(data: any) {
        this.table_ = new TabulatorFull(this.table_div_!, {
            data: this.convertData(data.data),
            columns: this.createColumnDescs(),
            layout:"fitData",
            resizableColumnFit:true,
        }) ;

        this.table_.on('tableBuilt', this.tableReady.bind(this)) ;

    }

    private tableReady() {
        this.hideHiddenColumns() ;
    }

    private receiveColConfig(data: IPCProjColumnsConfig) {
        this.col_cfgs_ = data;
    }
}