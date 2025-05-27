import { CellComponent, ColumnDefinition, TabulatorFull } from "tabulator-tables";
import {  XeroApp  } from "../../apps/xeroapp.js";
import {  IPCColumnDesc, IPCDatabaseData, IPCProjColumnsConfig, IPCProjectColumnCfg  } from "../../ipc.js";
import {  XeroView  } from "../xeroview.js";
import { DataValue } from "../../utils/datavalue.js";
import { XeroPopupMenu, XeroPopupMenuItem } from "../../widgets/xeropopupmenu.js";
import { XeroPoint } from "../../widgets/xerogeom.js";
import { ShowHideColumnsDialog } from "./dbhidedialog.js";
import { XeroDialog } from "../../widgets/xerodialog.js";

export class DatabaseView extends XeroView {
    private col_cfgs_? : IPCProjColumnsConfig ;
    private col_descs_? : IPCColumnDesc[] ;
    private keycol_? : string[] ;
    private table_? : TabulatorFull ;
    private table_div_? : HTMLDivElement ;
    private changes_ : any[] = [] ;
    private type_ : string ;
    private dialog_? : XeroDialog ;
    private popup_menu_? : XeroPopupMenu ;
    private context_menu_ : XeroPopupMenu ;

    protected constructor(app: XeroApp, clname: string, type: string) {
        super(app, clname);

        this.type_ = type ;

        this.registerCallback('send-' + type + '-db', this.receiveData.bind(this));
        this.request('get-' + type + '-db') ;

        let items : XeroPopupMenuItem[] = [
            new XeroPopupMenuItem('Save Changes', this.saveChanges.bind(this)),
            new XeroPopupMenuItem('Revert Changes', this.revertChanges.bind(this)),
            new XeroPopupMenuItem('Show/Hide/Freeze Columns', this.hideColumns.bind(this)),
            new XeroPopupMenuItem('Valid Data Formulas', this.validDataFormulas.bind(this)),
        ] ;

        this.context_menu_ = new XeroPopupMenu('Menu', items) ;
        this.startupMessage('Loading ' + type + ' database...') ;
    }

    private createColumnDescs() : ColumnDefinition[] {
        let cols: ColumnDefinition[] = [] ;

        for (let i = 0; i < this.col_cfgs_!.columns.length; i++) {
            let colcfg = this.col_cfgs_!.columns[i] ;
            let desc = this.col_descs_![i] ;
            let col_desc: ColumnDefinition = {
                title: colcfg.name,
                field: colcfg.name,
                frozen: false,
            } ;

            if (colcfg.width !== -1) {
                col_desc.width = colcfg.width ;
            }

            if (desc.editable) {
                col_desc.editable = true ;
                if (desc.type === 'string') {
                    if (desc.choices && desc.choices.length > 0) {
                        col_desc.editor = 'list' ;
                        col_desc.editorParams = {
                            values: desc.choices.map((choice) => { return choice.value ; })
                        }
                    }
                    else {
                        col_desc.editor = 'input' ;
                    }
                }
                else if (desc.type === 'integer') {
                    if (desc.choices && desc.choices.length > 0) {
                        col_desc.editor = 'list' ;
                        col_desc.editorParams = {
                            values: desc.choices.map((choice) => { return choice.value ; })
                        }
                    }
                    else {
                        col_desc.editor = 'number' ;
                    }
                }
                else if (desc.type === 'real') {
                    if (desc.choices && desc.choices.length > 0) {
                        col_desc.editor = 'list' ;
                        col_desc.editorParams = {
                            values: desc.choices.map((choice) => { return choice.value ; })
                        }
                    }
                    else {
                        col_desc.editor = 'number' ;
                    }
                }
                else if (desc.type === 'boolean') {
                    col_desc.editor = 'tickCross' ;
                }
            }

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
                    newobj[key] = DataValue.toDisplayString(value) ;
                }
            }
            ret.push(newobj) ;
        }
        return ret;
    }

    private receiveData(data: IPCDatabaseData) {
        this.reset() ;

        this.table_div_ = document.createElement('div') ;
        this.table_div_.className = 'xero-db-view-table-div' ;
        this.elem.appendChild(this.table_div_) ;
                
        this.col_cfgs_ = data.column_configurations ;
        this.col_descs_ = data.column_definitions ;
        this.keycol_ = data.keycols ;
        let cdata = this.convertData(data.data) ;
        let coldefs = this.createColumnDescs() ;
        this.table_ = new TabulatorFull(this.table_div_!, {
            data: cdata,
            columns: coldefs,
            layout:"fitData",
            resizableColumnFit:true,
            movableColumns:true,
        }) ;

        this.table_.on('tableBuilt', this.tableReady.bind(this)) ;
        this.table_.on('cellEdited', this.cellEdited.bind(this)) ;
        this.table_.on('columnMoved', this.columnMoved.bind(this)) ;
        this.table_.on('columnResized', this.columnResized.bind(this)) ;
        this.table_.on('cellContext', this.contextMenu.bind(this)) ; 
    }

    private contextMenu(e: UIEvent, cell: CellComponent) {
        if (!(e instanceof MouseEvent)) {
            return ;
        }

        if (this.dialog_) {
            return ;
        }

        let ev = e as MouseEvent ;

        e.preventDefault() ;
        e.stopPropagation() ;

        if (this.popup_menu_) {
            this.popup_menu_.closeMenu() ;
        }

        this.popup_menu_ = this.context_menu_ ;
        this.popup_menu_.showRelative(this.table_div_!, new XeroPoint(ev.clientX, ev.clientY)) ;
    }

    private sendColConfigs() {
        if (this.col_cfgs_) {
            this.request('send-' + this.type_ + '-col-config', this.col_cfgs_) ;
        }
    }

    private columnMoved() {
        this.col_cfgs_!.columns = [] ;

        for(let col of this.table_!.getColumns()) {
            let cfg: IPCProjectColumnCfg = {
                name: col.getField(),
                width: col.getWidth(),
                hidden: false,
            } ;
            this.col_cfgs_!.columns.push(cfg) ;
        }
        this.sendColConfigs() ;
    }

    private columnResized() {
        for(let col of this.table_!.getColumns()) {
            let cfg = this.col_cfgs_!.columns.find((c) => c.name === col.getField()) ;
            if (cfg) {
                cfg.width = col.getWidth() ;
            }
        }
        this.sendColConfigs() ;
    }

    private hideHiddenColumns() {
        if (this.col_cfgs_) {
            let index = 0 ;
            for(let col of this.table_!.getColumns()) {
                let cfg = this.col_cfgs_.columns[index++] ;
                if (cfg && cfg.hidden) {
                    col.hide() ;
                }
                else {
                    col.show() ;
                }
            }
        }        
    }

    private freezeColumns() {
        if (this.col_cfgs_) {
            let index = 0 ;
            for(let col of this.table_!.getColumns()) {
                let coldef = col.getDefinition() ;
                let frozen = index < this.col_cfgs_.frozenColumnCount ;
                if(frozen !== coldef.frozen) {
                    coldef.frozen = frozen ;
                    col.updateDefinition(coldef) ;
                }
                index++ ;
            }
        }
    }

    private cellEdited(cell: CellComponent) {
        cell.getElement().style.fontWeight = 'bolder' ;
        cell.getElement().style.fontSize = '20px' ;
        cell.getColumn().getElement().style.backgroundColor = 'lightblue' ;

        let data = cell.getData() ;
        let cellchange : any = {} ;

        cellchange['__oldvalue'] = cell.getOldValue() ;
        cellchange[cell.getField()] = data[cell.getField()] ;
        for(let key of this.keycol_!) {
            cellchange[key] = data[key] ;
        }
        this.changes_.push(cellchange) ;
    }

    private tableReady() {
        this.hideHiddenColumns() ;
        this.freezeColumns() ;
    }

    private saveChanges() {
        if (this.changes_.length > 0) {
            this.request('set-' + this.type_ + '-db-changes', this.changes_) ;
            this.changes_ = [] ;
        }
    }

    private revertChanges() {
        this.changes_ = [] ;
    }

    private hideColumnsDialogClosed(changed: boolean) {
        if (changed) {
            this.sendColConfigs() ;
            this.hideHiddenColumns() ;
            this.freezeColumns() ;
        }
        this.dialog_ = undefined ;
    }

    private hideColumns() {
        this.dialog_ = new ShowHideColumnsDialog(this.col_cfgs_!) ;
        this.dialog_.on('closed', this.hideColumnsDialogClosed.bind(this)) ;
        this.dialog_.showRelative(this.table_div_!, 100, 100) ;
    }

    private validDataFormulas() {
    }
}