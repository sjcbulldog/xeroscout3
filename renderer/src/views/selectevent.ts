import {  CellComponent, ColumnDefinition, TabulatorFull  } from "tabulator-tables";
import {  XeroApp  } from "../apps/xeroapp.js";
import {  XeroView  } from "./xeroview.js";

export class XeroSelectEvent extends XeroView {

    private loading_ : boolean = false ;
    private search_div_? : HTMLDivElement ;
    private search_input_? : HTMLInputElement ;
    private table_div_? : HTMLDivElement ;
    private table_? : TabulatorFull ;

    constructor(app: XeroApp) {
        super(app, 'xero-select-event') ;

        this.registerCallback('send-event-data', this.receivedEventData.bind(this));    
        this.request('get-event-data') ;
    }

    private receivedEventData(args: any) {
        this.search_div_ = document.createElement('div') ;
        this.search_div_.className = 'xero-select-event-search' ;
        this.elem.appendChild(this.search_div_) ;

        this.search_input_ = document.createElement('input') ;
        this.search_input_.className ='xero-select-event-search-box' ;
        this.search_input_.type = 'text' ;
        this.search_input_.placeholder = 'Enter text to search' ;
        this.search_input_.addEventListener('input', (ev) => {
            let filter = this.search_input_!.value ;
            if (filter.length > 0) {
                this.table_!.setFilter((data: any) => {
                    return data.name.toLowerCase().includes(filter.toLowerCase()) ;
                }) ;
            }
            else {
                this.table_!.setFilter((data: any) => {
                    return true ;
                }) ;
            }
        }) ;

        this.search_div_.append(this.search_input_) ;

        this.table_div_ = document.createElement('div') ;
        this.elem.appendChild(this.table_div_) ;

        let cols : ColumnDefinition[] = [] ;
        cols.push({
            field: 'key',
            title: 'Event Key',
        }) ;
    
        cols.push({
            field: 'name',
            title: 'Name',
        }) ;
    
        cols.push({
            field: 'district.display_name',
            title: 'District',
        }) ;
    
        cols.push({
            field: 'start_date',
            title: 'Date',
        }) ;

        this.table_ = new TabulatorFull(this.table_div_,
            {
                data:args,
                layout:"fitColumns",
                resizableColumnFit:true,
                columns:cols
            });        

        this.table_.on('tableBuilt', this.tableReady.bind(this)) ;
        this.table_.on('cellClick', this.loadBAEvent.bind(this)) ;
    }

    private tableReady() : void {
    }

    private loadBAEvent(e: Event, cell: CellComponent) : void {
        let data = cell.getData() ;
        this.request('load-ba-event-data', data.key) ;
    }
}