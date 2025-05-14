import { ColumnDefinition, TabulatorFull } from "tabulator-tables";
import {  XeroApp  } from "../apps/xeroapp.js";
import {  IPCProjColumnsConfig  } from "../ipc.js";
import {  XeroView  } from "./xeroview.js";

export class DatabaseView extends XeroView {
    private col_cfgs_? : IPCProjColumnsConfig ;
    private table_? : TabulatorFull ;
    private div_ : HTMLElement ;

    protected constructor(app: XeroApp, clname: string, type: string) {
        super(app, clname);

        this.div_ = document.createElement('div') ;
        this.div_.className = 'xero-db-view' ;
        this.elem.appendChild(this.div_) ;

        this.registerCallback('send-' + type + '-db', this.receiveData.bind(this));
        this.registerCallback('send-' + type + '-col-config', this.receiveColConfig.bind(this));
        this.request('get-' + type + '-db') ;
    }

    private convertData(data: any[]) : any[] {
        let ret : any[] = [] ;
        for(let one of data) {
        }
        return ret ;
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

    private receiveData(data: any) {
        this.table_ = new TabulatorFull(this.div_, {
            data: this.convertData(data.data),
            columns: this.createColumnDescs(),
            layout:"fitData",
            resizableColumnFit:true,
        }) ;        
    }

    private receiveColConfig(data: IPCProjColumnsConfig) {
        this.col_cfgs_ = data;
    }
}