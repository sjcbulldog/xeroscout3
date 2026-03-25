import { CellComponent, ColumnDefinition, RowComponent, TabulatorFull } from "tabulator-tables";
import { XeroApp  } from "../../apps/xeroapp.js";
import { IPCChange, IPCCheckDBViewFormula, IPCColumnDesc, IPCDatabaseData, IPCDatabasePrimitiveValue, IPCDatabaseRow, IPCDatabaseRowValue, IPCFormula, IPCProjColumnsConfig, IPCProjectColumnCfg, IPCTypedDataValue  } from "../../shared/ipc.js";
import { XeroView  } from "../xeroview.js";
import { XeroPopupMenu, XeroPopupMenuItem } from "../../widgets/xeropopupmenu.js";
import { XeroPoint } from "../../shared/xerogeom.js";
import { ShowHideColumnsDialog } from "./dbhidedialog.js";
import { XeroDialog } from "../../widgets/xerodialog.js";
import { DBViewFormulaDialog } from "./dbformdialog.js";
import { DataValue } from "../../shared/datavalue.js";
import { XeroMatchStatus } from "../matchstatus.js";
import { Expr } from "../../shared/expr.js";
import { DBDebugDialog } from "./dbdebugdialog.js";
import { ImagePreviewDialog } from "./imagepreviewdialog.js";


interface MatchRowCollection {
    rows: IPCDatabaseRow[] ;
    comp_level: string ;
    set_number: number ;
    match_number: number ;
    alliance: string ;
    team_keys: string[] ;
}

export class DatabaseView extends XeroView {
    private static readonly rowKeyField = "__xero_row_key" ;
    private data_ : IPCDatabaseRow[] = [] ;
    private col_cfgs_? : IPCProjColumnsConfig ;
    private col_descs_? : IPCColumnDesc[] ;
    private col_descs_by_name_ : Map<string, IPCColumnDesc> = new Map<string, IPCColumnDesc>() ;
    private keycol_? : string[] ;
    private table_? : TabulatorFull ;
    private table_div_? : HTMLDivElement ;
    private header_div_? : HTMLDivElement ;
    private table_summary_? : HTMLSpanElement ;
    private changes_ : any[] = [] ;
    private type_ : string ;
    private dialog_? : XeroDialog ;
    private popup_menu_? : XeroPopupMenu ;
    private context_menu_ : XeroPopupMenu ;
    private dirty_ : boolean ;
    private reverting_ : boolean ;
    private format_formulas_ : IPCCheckDBViewFormula[] = [] ;
    private formulas_ : IPCFormula[] = [] ;
    private formats_ : Map<string, Map<string, IPCCheckDBViewFormula>> = new Map<string, Map<string, IPCCheckDBViewFormula>>() ;
    private messages_ : string[] = [] ;

    protected constructor(app: XeroApp, clname: string, type: string) {
        super(app, clname);

        this.type_ = type ;
        this.dirty_ = false ;
        this.reverting_ = false ;       

        this.registerCallback('send-' + type + '-format-formulas', this.receiveFormulas.bind(this)) ;        
        this.registerCallback('send-' + type + '-db', this.receiveData.bind(this));
        this.registerCallback('send-formulas', this.receivedFormulas.bind(this)) ;         
        this.request('get-' + type + '-format-formulas') ;        
        this.request('get-' + type + '-db') ;
        this.request('get-formulas') ;

        let items : XeroPopupMenuItem[] = [
            new XeroPopupMenuItem('Save Changes', this.saveChanges.bind(this)),
            new XeroPopupMenuItem('Revert Changes', this.revertChanges.bind(this)),
            new XeroPopupMenuItem('Show/Hide/Freeze Columns', this.hideColumns.bind(this)),
            new XeroPopupMenuItem('Valid Data Formulas', this.validDataFormulas.bind(this)),
            new XeroPopupMenuItem('Debug formulas', this.debugFormulas.bind(this)),
        ] ;

        this.context_menu_ = new XeroPopupMenu('Menu', items) ;
        this.context_menu_.on('menu-closed', this.contextMenuClosed.bind(this)) ;
        this.startupMessage('Loading ' + type + ' database...') ;
    }

    public close() {
        if (this.table_) {
            this.table_.destroy() ;
        }

        super.close() ;
    }

    public get isOkToClose() {
        if (this.dirty_) {
            alert('The data in this database view has been changed.  Use the context menu (right click) to either save this data or revert back to what was previously in the database') ;
            return false ;
        }

        if (this.dialog_) {
            alert('You must close the dialog before you can close this view') ;
            return false ;
        }

        if (this.popup_menu_) {
            alert('You must close the popup menu before you can close this view') ;
            return false ;
        }   

        return true ;
    }

    private buildViewChrome() {
        let wrapper = document.createElement('div') ;
        wrapper.className = 'xero-db-view-shell' ;

        this.header_div_ = document.createElement('div') ;
        this.header_div_.className = 'xero-db-view-toolbar' ;

        let title = document.createElement('div') ;
        title.className = 'xero-db-view-toolbar-title' ;
        title.innerText = `${this.type_.charAt(0).toUpperCase()}${this.type_.slice(1)} Database` ;
        this.header_div_.appendChild(title) ;

        this.table_summary_ = document.createElement('span') ;
        this.table_summary_.className = 'xero-db-view-toolbar-summary' ;
        this.header_div_.appendChild(this.table_summary_) ;

        let actions = document.createElement('div') ;
        actions.className = 'xero-db-view-toolbar-actions' ;
        actions.appendChild(this.createToolbarButton('Save', this.saveChanges.bind(this))) ;
        actions.appendChild(this.createToolbarButton('Revert', this.revertChanges.bind(this))) ;
        actions.appendChild(this.createToolbarButton('Columns', this.hideColumns.bind(this))) ;
        actions.appendChild(this.createToolbarButton('Formats', this.validDataFormulas.bind(this))) ;
        actions.appendChild(this.createToolbarButton('Debug', this.debugFormulas.bind(this))) ;
        this.header_div_.appendChild(actions) ;

        wrapper.appendChild(this.header_div_) ;

        this.table_div_ = document.createElement('div') ;
        this.table_div_.className = 'xero-db-view-table-div' ;
        wrapper.appendChild(this.table_div_) ;

        this.elem.appendChild(wrapper) ;
    }

    private createToolbarButton(label: string, callback: () => void) : HTMLButtonElement {
        let button = document.createElement('button') ;
        button.className = 'xero-db-view-toolbar-button' ;
        button.innerText = label ;
        button.addEventListener('click', callback) ;
        return button ;
    }

    private updateSummary() {
        if (!this.table_summary_) {
            return ;
        }

        let rowCount = this.data_.length ;
        let columnCount = this.col_cfgs_?.columns.length || 0 ;
        this.table_summary_.innerText = `${rowCount} rows • ${columnCount} columns` ;
    }

    private receivedFormulas(data: IPCFormula[]) {
        this.formulas_ = data ;

        if (this.table_ && this.format_formulas_.length > 0) {
            window.setTimeout(() => {
                if (!this.table_) {
                    return ;
                }

                this.updateFormatData() ;
                this.updateCellFormats(true) ;
            }, 0) ;
        }
    }

    private createColumnDescs() : ColumnDefinition[] {
        let cols: ColumnDefinition[] = [] ;
        const isCoach = this.app.appType === 'coach' ;

        for (let i = 0; i < this.col_cfgs_!.columns.length; i++) {
            let colcfg = this.col_cfgs_!.columns[i] ;
            let desc = this.getColumnDesc(colcfg.name) ;
            if (!desc) {
                continue ;
            }
            let col_desc: ColumnDefinition = {
                formatter: this.cellFormatter.bind(this),
                title: colcfg.name,
                field: colcfg.name,
                frozen: i < this.col_cfgs_!.frozenColumnCount,
                headerSort: true,
                width: colcfg.width !== -1 ? colcfg.width : this.getDefaultColumnWidth(desc),
                minWidth: 90,
            } ;

            if (colcfg.name === 'comp_level') {
                col_desc.sorter = XeroMatchStatus.sortMatchFunc ;
            }
            else if (desc.type === 'integer' || desc.type === 'real') {
                col_desc.sorter = 'number' ;
            }

            if (desc.type === 'integer' || desc.type === 'real') {
                col_desc.hozAlign = 'right' ;
            }

            if (desc.editable && !isCoach) {
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

    protected getInitialSort() : {column: string, dir: "asc" | "desc"}[] | undefined {
        return undefined ;
    }

    private getDefaultColumnWidth(desc: IPCColumnDesc) : number {
        if (desc.type === 'integer' || desc.type === 'real') {
            return 110 ;
        }

        if (this.type_ === 'team' && desc.name.toLowerCase().includes('photo')) {
            return 140 ;
        }

        return 160 ;
    }

    private getRowKeyFromObject(row: Record<string, any>) : string {
        return this.keycol_!.map((key) => {
            let value = row[key] ;
            if (value === undefined) {
                value = null ;
            }
            return `${key}:${JSON.stringify(value)}` ;
        }).join('|') ;
    }

    private getFormat(cell: CellComponent) : IPCCheckDBViewFormula | undefined {
        let rowKey = this.getRowKeyFromObject(cell.getRow().getData()) ;
        let rowformats = this.formats_.get(rowKey) ;
        if (rowformats) {
            let colname = cell.getField() ;
            return rowformats.get(colname) ;
        }  
        return undefined ;
    }    

    private formatCellValue(value: IPCDatabaseRowValue | undefined) : string {
        if (value === null || value === undefined) {
            return '' ;
        }

        let primitive = this.toPrimitiveCellValue(value) ;
        if (primitive === null) {
            return '' ;
        }

        if (typeof primitive === 'boolean') {
            return primitive ? 'true' : 'false' ;
        }

        return String(primitive) ;
    }

    private cellFormatter(cell: CellComponent) : string | HTMLElement {
        let value = cell.getValue() ;
        let fmt = this.getFormat(cell) ;
        let elem = cell.getElement() ;
        if (fmt) {
            elem.style.backgroundColor = fmt.background ;
            elem.style.color = fmt.color ;
            elem.style.fontWeight = fmt.fontWeight ;
            elem.style.fontStyle = fmt.fontStyle ;
            elem.style.fontFamily = fmt.fontFamily ;
        }
        else {
            elem.style.backgroundColor = '' ;
            elem.style.color = '' ;
            elem.style.fontWeight = '' ;
            elem.style.fontStyle = '' ;
            elem.style.fontFamily = '' ;
        }

        if (this.shouldRenderImagePreview(cell, value)) {
            let button = document.createElement('button') ;
            button.innerText = 'View Photo' ;
            button.style.cursor = 'pointer' ;
            button.style.padding = '2px 8px' ;
            button.style.fontSize = '12px' ;
            return button ;
        }

        return this.formatCellValue(value) ;
    }

    private toPrimitiveCellValue(value: IPCDatabaseRowValue | undefined) : IPCDatabasePrimitiveValue {
        if (value === undefined || value === null) {
            return null ;
        }

        if (typeof value === 'object' && 'type' in value && 'value' in value) {
            if (DataValue.isNull(value)) {
                return null ;
            }

            if (DataValue.isString(value)) {
                return DataValue.toString(value) ;
            }

            if (DataValue.isBoolean(value)) {
                return DataValue.toBoolean(value) ;
            }

            if (DataValue.isInteger(value)) {
                return DataValue.toInteger(value) ;
            }

            if (DataValue.isReal(value)) {
                return DataValue.toReal(value) ;
            }

            return DataValue.toDisplayString(value) ;
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value ;
        }

        return null ;
    }

    private normalizeData(data: IPCDatabaseRow[]) : IPCDatabaseRow[] {
        let ret : IPCDatabaseRow[] = [] ;
        for(let one of data) {
            let newobj : IPCDatabaseRow = {} ;
            for (let key of Object.keys(one)) {
                newobj[key] = this.toPrimitiveCellValue(one[key]) ;
            }
            newobj[DatabaseView.rowKeyField] = this.getRowKeyFromObject(newobj) ;
            ret.push(newobj) ;
        }
        return ret;
    }

    private receiveFormulas(forms: IPCCheckDBViewFormula[]) {
        if (forms && Array.isArray(forms) && forms.length > 0) {
            this.format_formulas_ = forms ;
        }
        else {
            this.format_formulas_ = [] ;
        }

        if (this.table_) {
            window.setTimeout(() => {
                if (!this.table_) {
                    return ;
                }

                this.updateFormatData() ;
                this.updateCellFormats(true) ;
            }, 0) ;
        }
    }

    private receiveData(data: IPCDatabaseData) {
        this.reset() ;
        this.buildViewChrome() ;

        this.col_cfgs_ = data.column_configurations ;
        this.col_descs_ = data.column_definitions ;
        this.col_descs_by_name_ = new Map(this.col_descs_.map((desc) => [desc.name, desc])) ;
        this.keycol_ = data.keycols ;
        this.data_ = this.normalizeData(data.data) ;
        if (this.revealTeamImageColumns()) {
            this.sendColConfigs() ;
        }
        let coldefs = this.createColumnDescs() ;
        this.table_ = new TabulatorFull(this.table_div_!, {
            data: this.data_,
            columns: coldefs,
            index: DatabaseView.rowKeyField,
            height: "100%",
            layout:"fitDataTable",
            layoutColumnsOnNewData: false,
            renderVertical: "virtual",
            // Keep horizontal rendering basic so frozen columns remain pinned
            // while scrolling; horizontal virtual rendering can recycle them.
            renderHorizontal: "basic",
            renderVerticalBuffer: 600,
            resizableColumnFit:true,
            movableColumns:true,
            selectableRows: 1,
            initialSort: this.getInitialSort(),
        }) ;

        this.updateSummary() ;

        this.table_.on('tableBuilt', this.tableReady.bind(this)) ;
        this.table_.on('cellEdited', this.cellEdited.bind(this)) ;
        this.table_.on('cellClick', this.cellClicked.bind(this)) ;
        this.table_.on('columnMoved', this.columnMoved.bind(this)) ;
        this.table_.on('columnResized', this.columnResized.bind(this)) ;
        this.table_.on('cellContext', this.contextMenu.bind(this)) ; 
    }

    private revealTeamImageColumns() : boolean {
        if (this.type_ !== 'team' || !this.col_cfgs_) {
            return false ;
        }

        let changed = false ;
        for (let cfg of this.col_cfgs_.columns) {
            if (!cfg.hidden) {
                continue ;
            }

            let hasImageData = this.data_.some((row) => {
                let value = row[cfg.name] ;
                return typeof value === 'string' && this.isImageDataUrl(value) ;
            }) ;

            if (hasImageData) {
                cfg.hidden = false ;
                changed = true ;
            }
        }

        return changed ;
    }

    private cellClicked(e: UIEvent, cell: CellComponent) {
        if (!this.shouldRenderImagePreview(cell, cell.getValue())) {
            return ;
        }

        e.preventDefault() ;
        e.stopPropagation() ;
        this.showImagePreview(cell) ;
    }

    private contextMenuClosed() {
        this.popup_menu_ = undefined ; 
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
        let existing = new Map(this.col_cfgs_!.columns.map((cfg) => [cfg.name, cfg])) ;
        this.col_cfgs_!.columns = [] ;

        for(let col of this.table_!.getColumns()) {
            let prior = existing.get(col.getField()) ;
            let cfg: IPCProjectColumnCfg = {
                name: col.getField(),
                width: col.getWidth(),
                hidden: prior?.hidden ?? false,
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
            let changed = false ;
            for(let col of this.table_!.getColumns()) {
                let coldef = col.getDefinition() ;
                let frozen = index < this.col_cfgs_.frozenColumnCount ;
                if(frozen !== coldef.frozen) {
                    coldef.frozen = frozen ;
                    col.updateDefinition(coldef) ;
                    changed = true ;
                }
                index++ ;
            }

            // Force a full layout pass after frozen state changes so unfrozen
            // columns are repositioned to the right of the frozen block.
            if (changed && this.table_) {
                this.table_.redraw(true) ;
            }
        }
    }

    private getColumnDesc(field: string) : IPCColumnDesc | undefined {
        return this.col_descs_by_name_.get(field) ;
    }

    private primitiveToTypedValue(type: string, value: IPCDatabaseRowValue | undefined) : IPCTypedDataValue | undefined {
        let primitive = this.toPrimitiveCellValue(value) ;

        switch(type) {
            case 'string':
                return DataValue.fromString(primitive === null ? '' : String(primitive)) ;
            case 'integer':
                return primitive === null ? DataValue.fromNull() : DataValue.fromInteger(parseInt(String(primitive), 10)) ;
            case 'real':
                return primitive === null ? DataValue.fromNull() : DataValue.fromReal(parseFloat(String(primitive))) ;
            case 'boolean':
                return DataValue.fromBoolean(primitive === true || primitive === 'true' || primitive === 1) ;
            case 'null':
                return DataValue.fromNull() ;
            case 'error':
                return DataValue.fromError(new Error(String(primitive))) ;
            default:
                return undefined ;
        }
    }

    private cellValueToIPCValue(cell: CellComponent, value: any) : IPCTypedDataValue | undefined{
        let ret : IPCTypedDataValue | undefined = undefined ;

        let coldesc = this.getColumnDesc(cell.getField()) ;
        if (coldesc) {
            ret = this.primitiveToTypedValue(coldesc.type, value) ;
        }
        return ret;
    }

    private cellEdited(cell: CellComponent) {
        if (!this.reverting_) {
            this.dirty_ = true ;

            cell.getElement().style.fontWeight = 'bolder' ;

            let data = cell.getData() ;
            let searchkeys: any = {} ;
            for(let key of this.keycol_!) {
                let coldesc = this.getColumnDesc(key) ;
                if (coldesc) {
                    let colcell = cell.getRow().getCell(key) ;
                    searchkeys[key] = this.cellValueToIPCValue(colcell, colcell.getValue()) ;
                }
            }

            let oldv = this.cellValueToIPCValue(cell, cell.getOldValue()) ;
            let newv = this.cellValueToIPCValue(cell, data[cell.getField()]) ;

            if (oldv && newv) {
                let change : IPCChange = {
                    column: cell.getField(),
                    oldvalue: oldv!,
                    newvalue: newv!,
                    search: searchkeys
                }

                this.changes_.push(change) ;
            }
        }
    }

    private tableReady() {
        this.hideHiddenColumns() ;
        this.freezeColumns() ;
        if (this.format_formulas_.length > 0) {
            window.setTimeout(() => {
                if (!this.table_) {
                    return ;
                }

                this.updateFormatData() ;
                this.updateCellFormats(true) ;
            }, 0) ;
        }
    }

    private updateCellFormats(forceRedraw: boolean = false) {
        if (!this.table_) {
            return ;
        }

        if (forceRedraw) {
            this.table_.redraw(true) ;
            return ;
        }

        for(let row of this.table_.getRows('visible')) {
            row.reformat() ;
        }
    }

    private saveChanges() {
        if (this.changes_.length > 0) {
            //
            // Revert the display of the cells that have been changed and are currently bolded
            //
            for(let change of this.changes_) {
                let row = this.findRowFromSearch(change.search) ;
                if (row) {
                    let cell = row.getCell(change.column) ;
                    if (cell) {
                        cell.getElement().style.fontWeight = 'normal' ;
                    }
                }            
            }

            //
            // Update the databse on the main process
            //
            this.request('update-' + this.type_ + '-db', this.changes_) ;

            this.dirty_ = false ;
            this.changes_ = [] ;
            this.updateFormatData() ;
            this.updateCellFormats(true) ;
        }
    }

    private findRowFromSearch(search: any) : RowComponent | undefined {
        if (!this.table_ || !this.keycol_) {
            return undefined ;
        }

        let obj: Record<string, IPCDatabasePrimitiveValue> = {} ;
        for(let key of this.keycol_) {
            obj[key] = this.toPrimitiveCellValue(search[key]) ;
        }

        let rowKey = this.getRowKeyFromObject(obj) ;
        try {
            return this.table_.getRow(rowKey) ;
        }
        catch {
            return undefined ;
        }
    }

    private revertChanges() {
        this.reverting_ = true ;
        for(let change of this.changes_) {
            let row = this.findRowFromSearch(change.search) ;
            if (row) {
                let cell = row.getCell(change.column) ;
                if (cell) {
                    cell.setValue(this.toPrimitiveCellValue(change.oldvalue)) ;
                    cell.getElement().style.fontWeight = 'normal' ;
                }
            }
        }

        this.reverting_ = false ;
        this.dirty_ = false ;
        this.changes_ = [] ;
        this.updateFormatData() ;
        this.updateCellFormats(true) ;
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
        if (this.dialog_) {
            return ;
        }

        this.dialog_ = new ShowHideColumnsDialog(this.col_cfgs_!) ;
        this.dialog_.on('closed', this.hideColumnsDialogClosed.bind(this)) ;
        this.dialog_.showRelative(this.table_div_!, 100, 100) ;
    }

    private shouldRenderImagePreview(cell: CellComponent, value: any) : boolean {
        return this.type_ === 'team' &&
            typeof value === 'string' &&
            this.isImageDataUrl(value) ;
    }

    private isImageDataUrl(value: string) : boolean {
        return /^data:image\/[a-z0-9.+-]+;base64,/i.test(value) ;
    }

    private showImagePreview(cell: CellComponent) {
        if (this.dialog_ || !this.table_div_) {
            return ;
        }

        const value = cell.getValue() ;
        if (typeof value !== 'string') {
            return ;
        }

        const rowData = cell.getRow().getData() ;
        const teamNumber = rowData?.team_number ? `Team ${rowData.team_number}` : 'Team Photo' ;
        const field = cell.getField() ;

        this.dialog_ = new ImagePreviewDialog(`${teamNumber} - ${field}`, value) ;
        this.dialog_.on('closed', () => {
            this.dialog_ = undefined ;
        }) ;
        this.dialog_.showCentered(this.table_div_) ;
    }

    private findMatchRows() : Map<string, MatchRowCollection> {
        let ret = new Map<string, MatchRowCollection>() ;

        for(let data of this.data_) {
            let comp_level = String(data['comp_level'] ?? '') ;
            let set_number = Number(data['set_number'] ?? 0) ;
            let match_number = Number(data['match_number'] ?? 0) ;
            let alliance = String(data['alliance'] ?? '') ;
            let keystr = `${comp_level}-${set_number}-${match_number}-${alliance}` ;

            let m : MatchRowCollection | undefined = ret.get(keystr) ;
            if (!m) {
                m = {
                    rows: [],
                    comp_level: comp_level,
                    set_number: set_number,
                    match_number: match_number,
                    alliance: alliance,
                    team_keys: []
                }

                ret.set(keystr, m) ;
            }

            m.rows.push(data) ;
            m.team_keys.push(String(data['team_key'] ?? '')) ;
        }
        return ret ;
    }

    private setFormat(row: IPCDatabaseRow, column: string, formula: IPCCheckDBViewFormula) {
        let rowKey = String(row[DatabaseView.rowKeyField]) ;
        let rowformats = this.formats_.get(rowKey) ;
        if (!rowformats) {
            rowformats = new Map<string, IPCCheckDBViewFormula>() ;
            this.formats_.set(rowKey, rowformats) ;
        }
        rowformats.set(column, formula) ;
    }

    private findFormulaByName(name: string) : string | undefined {
        for(let formula of this.formulas_) {
            if (formula.name === name) {
                return formula.formula ;
            }
        }
        return undefined ;
    }

    private evalOneField(mrow: MatchRowCollection, field: string) : IPCTypedDataValue | undefined {
        let ret: IPCTypedDataValue | undefined = undefined ;

        let cfg = this.getColumnDesc(field) ;
        if (!cfg) {
            this.logMessage('Column not found: ' + field) ;
            return undefined ;
        }

        if (cfg.source === 'form') {
            if (cfg.type !== 'integer' && cfg.type !== 'real') {
                this.logMessage('Unsupported type for field: ' + field) ;
                return undefined ;
            }

            let sum = 0.0 ;
            let nans = 0 ;
            for(let row of mrow.rows) {
                let value = row[field] ;
                let v = Number(value) ;
                if (isNaN(v)) {
                    v = 0.0 ;
                    nans++ ;
                }
                sum += v ;
            }
            if (nans === mrow.rows.length) {
                // We have an empty value across all robots in the alliance.  This means
                // this match has not been played yet, so we return a null value
                return undefined ;
            }
            else if (cfg.type === 'integer') {
                ret = DataValue.fromInteger(Math.round(sum)) ;
            }
            else {
                ret = DataValue.fromReal(sum) ;
            }
        }
        else if (cfg.source === 'bluealliance') {
            //
            // We expect the field to be the same across all rows for this alliance in the match
            //
            if (mrow.rows.length > 0) {
                let value = mrow.rows[0][field] ;
                ret = this.primitiveToTypedValue(cfg.type, value) ;
            }
        }

        return ret ;
    }

    private evalFormulaAlliance(formula: IPCCheckDBViewFormula) {
        let f = this.findFormulaByName(formula.formula) ;
        if (!f) {
            this.logMessage('Formula not found: ' + formula.formula) ;
            return ;
        }

        let expr = Expr.parse(f) ;
        if (expr.hasError()) {
            this.logMessage('Error parsing formula: ' + formula.formula + ' - ' + expr.getErrorMessage()) ;
            return ;
        }
 
       

        let vars = expr.variables() ;
        let mrows = this.findMatchRows() ;

        for(let mrow of mrows.values()) {
            let varvalues : Map<string, IPCTypedDataValue> = new Map<string, IPCTypedDataValue>() ;

            let missing = false ;
            for(let varname of vars) {
                let v = this.evalOneField(mrow, varname) ;
                if (v) {
                    varvalues.set(varname, v) ;
                }
                else {
                    // We are missing matches as they have not yet been played (or transferred from the scouting tablet)
                    missing = true ;
                }
            }

            if (!missing) {
                let result = expr.evaluate(varvalues) ;
                if (result instanceof Error) {
                    this.logMessage('Error evaluating formula: ' + formula.formula + ' - ' + result.message) ;
                    continue ;
                }
                // Store variable values for debugging  
                const debugData = {  
                    expression: f,  
                    variables: Array.from(varvalues.entries()).map(([name, value]: [string, any]) => ({
                        name,  
                        value: DataValue.toDisplayString(value)  
                    }))  
                };  
                
                // Pass debug data to dialog if it exists  
                if (this.dialog_ && this.dialog_ instanceof DBDebugDialog) {  
                    (this.dialog_ as DBDebugDialog).updateDebugData(formula, debugData);  
                }

                if (DataValue.isTruthy(result)) {
                    for(let row of mrow.rows) {
                        for(let col of formula.columns) {
                            this.setFormat(row, col, formula) ;
                            this.logMessage(`Row ${row[DatabaseView.rowKeyField]}: ${formula.message}`) ;
                        }
                    }
                }
            }
        }        
    }

    private evalFormulaRobot(formula: IPCCheckDBViewFormula) {
        let f = this.findFormulaByName(formula.formula) ;
        if (!f) {
            this.logMessage('Formula not found: ' + formula.formula) ;
            return ;
        }

        let expr = Expr.parse(f) ;
        if (expr.hasError()) {
            this.logMessage('Error parsing formula: ' + formula.formula + ' - ' + expr.getErrorMessage()) ;
            return ;
        }

        let vars = expr.variables() ;
        for(let row of this.data_) {
            let varvalues : Map<string, IPCTypedDataValue> = new Map<string, IPCTypedDataValue>() ;
            for(let varname of vars) {
                let cfg = this.getColumnDesc(varname) ;
                if (!cfg) {
                    this.logMessage('Column not found: ' + varname) ;
                    continue ;
                }
                let value = row[varname] ;
                let typed = this.primitiveToTypedValue(cfg.type, value) ;
                if (typed) {
                    varvalues.set(varname, typed) ;
                }
            }

            let result = expr.evaluate(varvalues) ;
            if (result instanceof Error) {
                continue ;
            }

           // Store variable values for debugging  
            const debugData = {  
                expression: f,  
                variables: Array.from(varvalues.entries()).map(([name, value]: [string, any]) => ({

                    name,  
                    value: DataValue.toDisplayString(value)  
                }))  
            };  
            
            // Pass debug data to dialog if it exists  
            if (this.dialog_ && this.dialog_ instanceof DBDebugDialog) {  
                (this.dialog_ as DBDebugDialog).updateDebugData(formula, debugData);  
            }


            if (DataValue.isTruthy(result)) {
                for(let col of formula.columns) {
                    this.setFormat(row, col, formula) ;
                }
                this.logMessage(`Row ${row[DatabaseView.rowKeyField]}: ${formula.message}`) ;
            }
        }
    }

    private updateFormatData() {
        this.messages_ = [] ;
        this.formats_ = new Map<string, Map<string, IPCCheckDBViewFormula>>() ;

        for(let formula of this.format_formulas_) {
            if (formula.type === 'alliance') {
                this.evalFormulaAlliance(formula) ;
            }
            else if (formula.type === 'robot') {
                this.evalFormulaRobot(formula) ;
            }
        }
    }
    
    private formatFormulasClosed(changed: boolean) {
        if (changed) {
            let d: DBViewFormulaDialog = this.dialog_ as DBViewFormulaDialog ;
            this.format_formulas_ = d.formatFormulas ;
            this.request('set-' + this.type_ + '-format-formulas', this.format_formulas_) ;

            this.updateFormatData() ;
            this.updateCellFormats(true) ;
        }

        this.dialog_ = undefined ;        
    }

    private validDataFormulas() {
        if (this.dialog_) {
            return ;
        }

        if (this.formulas_.length === 0) {
            alert('There are no formulas defined.  You must define at least one formula before you can use this feature.') ;
            return ;
        }

        this.dialog_ = new DBViewFormulaDialog(this.type_, this.format_formulas_, this.formulas_, this.col_descs_!); 
        this.dialog_.on('closed', this.formatFormulasClosed.bind(this)) ;
        this.dialog_.showCentered(this.table_div_!) ;
    }
    


   private debugFormulas() {  
        if (this.dialog_) {  
            return;  
        }  
        
        // Extract match identifier using same pattern as Scout navigation  
        let matchId: string | undefined;  
        const selectedRows = this.table_?.getSelectedRows();
        matchId = "cannot get match data: " + selectedRows + ", " + this.table_?.getSelectedRows().length; // debug info  
        if (selectedRows && selectedRows.length > 0) {  
            const data = selectedRows[0].getData();  
            // This matches Scout's navigation command format (sm-qm-1, sm-sf-2-1, etc.)  
            matchId = `${data.comp_level}${data.set_number ? '-' + data.set_number : ''}-${data.match_number}`;  
        }  
        
        this.dialog_ = new DBDebugDialog(this, this.type_, this.format_formulas_, this.formulas_, this.col_descs_!, matchId);  
        this.dialog_.on('closed', this.debugDialogClosed.bind(this));  
        this.dialog_.showCentered(this.table_div_!);  
    }

    
    private debugDialogClosed() {  
        this.dialog_ = undefined;  
    }

    private logMessage(msg: string) {
        this.messages_.push(msg) ;
    }


    public debugFormulaRobot(formula: IPCCheckDBViewFormula): Array<{name: string, value: string}>[] {  
        let f = this.findFormulaByName(formula.formula);  
        if (!f) return [];  
    
        let expr = Expr.parse(f);  
        if (expr.hasError()) return [];  
    
        let vars = expr.variables();  
        let results: Array<{name: string, value: string}>[] = [];  
    
        for(let row of this.data_) {  
            let varvalues = new Map<string, IPCTypedDataValue>();  
            
            for(let varname of vars) {  
                let cfg = this.getColumnDesc(varname);  
                if (cfg) {  
                    let value = row[varname];  
                    let typed = this.primitiveToTypedValue(cfg.type, value) ;
                    if (typed) {
                        varvalues.set(varname, typed);  
                    }
                }  
            }  
            
            results.push(Array.from(varvalues.entries()).map(([name, value]: [string, any]) => ({  
                name,  
                value: DataValue.toDisplayString(value)  
            })));  
        }  
        return results;  
    }  
    
    public debugFormulaAlliance(formula: IPCCheckDBViewFormula): Array<{name: string, value: string}>[] {  
        let f = this.findFormulaByName(formula.formula);  
        if (!f) return [];  
    
        let expr = Expr.parse(f);  
        if (expr.hasError()) return [];  
    
        let vars = expr.variables();  
        let mrows = this.findMatchRows();  
        let results: Array<{name: string, value: string}>[] = [];  
    
        for(let mrow of mrows.values()) {  
            let varvalues = new Map<string, IPCTypedDataValue>();  
            
            for(let varname of vars) {  
                let v = this.evalOneField(mrow, varname);  
                if (v) {  
                    varvalues.set(varname, v);  
                }  
            }  
            
            results.push(Array.from(varvalues.entries()).map(([name, value]: [string, any]) => ({  
                name,  
                value: DataValue.toDisplayString(value)  
            })));  
        }  
        
        return results;  
    }
}
