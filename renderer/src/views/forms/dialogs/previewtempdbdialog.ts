import { ColumnDefinition, TabulatorFull } from "tabulator-tables";
import { DataValue } from "../../../shared/datavalue.js";
import { IPCColumnDesc, IPCDatabaseData, IPCProjColumnsConfig } from "../../../shared/ipc.js";
import { XeroDialog } from "../../../widgets/xerodialog.js";
import { ShowHideColumnsDialog } from "../../dbview/dbhidedialog.js";

export class PreviewTempDBDialog extends XeroDialog {
    private data_ : IPCDatabaseData ;
    private col_cfg_ : IPCProjColumnsConfig ;
    private table_? : TabulatorFull ;
    private container_? : HTMLDivElement ;
    private on_refresh_ : () => void ;

    constructor(data: IPCDatabaseData, onRefresh: () => void) {
        super('Temp Match DB') ;
        this.data_ = data ;
        this.col_cfg_ = this.cloneConfig(data.column_configurations) ;
        this.data_.column_configurations = this.col_cfg_ ;
        this.on_refresh_ = onRefresh ;
        this.disableEnterKeyProcessing() ;
    }

    public setData(data: IPCDatabaseData) {
        //
        // This modal can receive frequent refreshes while open (as the user interacts
        // with the match preview form). Preserve the current Show/Hide/Freeze column
        // configuration across refreshes, otherwise the table "snaps back" to the
        // default configuration each time new data arrives.
        //
        if (!this.isCompatibleSchema(this.col_cfg_, data.column_definitions)) {
            this.col_cfg_ = this.cloneConfig(data.column_configurations) ;
        }

        this.data_.data = data.data ;
        this.data_.column_definitions = data.column_definitions ;
        this.data_.keycols = data.keycols ;
        this.data_.column_configurations = this.col_cfg_ ;
        this.rebuildTable() ;
    }

    protected populateDialog(pdiv: HTMLDivElement): void {
        this.container_ = document.createElement('div') ;
        this.container_.className = 'xero-db-view-table-div' ;
        this.container_.style.width = '1000px' ;
        this.container_.style.height = '500px' ;

        pdiv.appendChild(this.container_) ;

        this.table_ = new TabulatorFull(this.container_, {
            data: this.convertData(this.data_.data),
            columns: this.createColumns(this.col_cfg_, this.data_.column_definitions),
            layout: "fitData",
            resizableColumnFit: true,
            movableColumns: true,
        }) ;
    }

    public populateButtons(div: HTMLDivElement) {
        let refresh = document.createElement('button') ;
        refresh.innerText = 'Refresh' ;
        refresh.className = 'xero-popup-form-edit-dialog-button' ;
        refresh.addEventListener('click', () => this.on_refresh_()) ;
        div.appendChild(refresh) ;

        let showhide = document.createElement('button') ;
        showhide.innerText = 'Show/Hide Columns' ;
        showhide.className = 'xero-popup-form-edit-dialog-button' ;
        showhide.addEventListener('click', this.showHideColumns.bind(this)) ;
        div.appendChild(showhide) ;

        let close = document.createElement('button') ;
        close.innerText = 'Close' ;
        close.className = 'xero-popup-form-edit-dialog-button' ;
        close.addEventListener('click', () => this.close(false)) ;
        div.appendChild(close) ;
    }

    private showHideColumns() {
        let dialog = new ShowHideColumnsDialog(this.col_cfg_) ;
        dialog.on('closed', (ok: boolean) => {
            if (ok) {
                this.data_.column_configurations = this.col_cfg_ ;
                this.rebuildTable() ;
            }
        }) ;
        if (this.popup && this.popup.parentElement) {
            dialog.showCentered(this.popup.parentElement) ;
        }
    }

    private rebuildTable() {
        if (!this.table_ || !this.container_) {
            return ;
        }

        this.table_.destroy() ;
        this.container_.innerHTML = '' ;
        this.table_ = new TabulatorFull(this.container_, {
            data: this.convertData(this.data_.data),
            columns: this.createColumns(this.col_cfg_, this.data_.column_definitions),
            layout: "fitData",
            resizableColumnFit: true,
            movableColumns: true,
        }) ;
    }

    private createColumns(cfg: IPCProjColumnsConfig, descs: IPCColumnDesc[]) : ColumnDefinition[] {
        let cols: ColumnDefinition[] = [] ;

        for (let i = 0; i < cfg.columns.length; i++) {
            let one = cfg.columns[i] ;
            let desc = descs.find((d) => d.name === one.name) ;

            let col: ColumnDefinition = {
                title: one.name,
                field: one.name,
                visible: !one.hidden,
                frozen: i < cfg.frozenColumnCount,
            } ;

            if (one.width && one.width > 0) {
                col.width = one.width ;
            }

            if (desc && (desc.type === 'integer' || desc.type === 'real')) {
                col.hozAlign = 'right' ;
            }

            cols.push(col) ;
        }

        return cols ;
    }

    private convertData(data: any[]) {
        let ret : any[] = [] ;
        for (let one of data) {
            let newobj : any = {} ;
            for (let key of Object.keys(one)) {
                let value = one[key] ;
                if (DataValue.isNull(value)) {
                    newobj[key] = '' ;
                }
                else {
                    newobj[key] = DataValue.toDisplayString(value) ;
                }
            }
            ret.push(newobj) ;
        }
        return ret ;
    }

    private isCompatibleSchema(cfg: IPCProjColumnsConfig, descs: IPCColumnDesc[]) : boolean {
        if (!cfg || !cfg.columns || !descs) {
            return false ;
        }

        if (cfg.columns.length !== descs.length) {
            return false ;
        }

        let cfgNames = new Set(cfg.columns.map((c) => c.name)) ;
        for (let d of descs) {
            if (!cfgNames.has(d.name)) {
                return false ;
            }
        }

        return true ;
    }

    private cloneConfig(cfg: IPCProjColumnsConfig) : IPCProjColumnsConfig {
        return {
            frozenColumnCount: cfg.frozenColumnCount,
            columns: cfg.columns.map((c) => {
                return {
                    name: c.name,
                    width: c.width,
                    hidden: c.hidden,
                } ;
            }),
        } ;
    }
}
