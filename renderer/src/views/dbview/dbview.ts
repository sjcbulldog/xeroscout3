import { CellComponent, ColumnDefinition, RowComponent, TabulatorFull } from "tabulator-tables";
import { XeroApp  } from "../../apps/xeroapp.js";
import { IPCChange, IPCCheckDBViewFormula, IPCColumnDesc, IPCDatabaseData, IPCDataValue, IPCFormula, IPCProjColumnsConfig, IPCProjectColumnCfg, IPCTypedDataValue  } from "../../shared/ipc.js";
import { XeroView  } from "../xeroview.js";
import { XeroPopupMenu, XeroPopupMenuItem } from "../../widgets/xeropopupmenu.js";
import { XeroPoint } from "../../shared/xerogeom.js";
import { ShowHideColumnsDialog } from "./dbhidedialog.js";
import { XeroDialog } from "../../widgets/xerodialog.js";
import { DBViewFormulaDialog } from "./dbformdialog.js";
import { DataValue } from "../../shared/datavalue.js";
import { XeroMatchStatus } from "../matchstatus.js";
import { Expr } from "../../shared/expr.js";

interface MatchRowCollection {
    rows: RowComponent[] ;
    comp_level: string ;
    set_number: number ;
    match_number: number ;
    alliance: string ;
    team_keys: string[] ;
}

export class DatabaseView extends XeroView {
    private data_ : any[] = [] ;
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
    private dirty_ : boolean ;
    private reverting_ : boolean ;
    private format_formulas_ : IPCCheckDBViewFormula[] = [] ;
    private formulas_ : IPCFormula[] = [] ;
    private formats_ : Map<number, Map<string, IPCCheckDBViewFormula>> = new Map<number, Map<string, IPCCheckDBViewFormula>>() ;
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

    private receivedFormulas(data: IPCFormula[]) {
        this.formulas_ = data ;
    }

    private createColumnDescs() : ColumnDefinition[] {
        let cols: ColumnDefinition[] = [] ;

        for (let i = 0; i < this.col_cfgs_!.columns.length; i++) {
            let colcfg = this.col_cfgs_!.columns[i] ;
            let desc = this.col_descs_![i] ;
            let col_desc: ColumnDefinition = {
                formatter: this.cellFormatter.bind(this),
                title: colcfg.name,
                field: colcfg.name,
                frozen: false,
                headerSort: (colcfg.name !== 'set_number' && colcfg.name !== 'match_number')
            } ;

            if (colcfg.name === 'comp_level') {
                col_desc.sorter = XeroMatchStatus.sortMatchFunc ;
            }

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

    private getFormat(cell: CellComponent) : IPCCheckDBViewFormula | undefined {
        let rows = this.table_!.getRows() ;
        let pos = rows.indexOf(cell.getRow()) ;
        if (pos < 0) {
            return ;
        }
        let rowformats = this.formats_.get(pos) ;
        if (rowformats) {
            let colname = cell.getField() ;
            return rowformats.get(colname) ;
        }  
        return undefined ;
    }    

    private cellFormatter(cell: CellComponent, formatterParams: any) : string {
        let value = cell.getValue() ;
        let fmt = this.getFormat(cell) ;
        if (fmt) {
            let elem = cell.getElement() ;
            elem.style.backgroundColor = fmt.background ;
            elem.style.color = fmt.color ;
            elem.style.fontWeight = fmt.fontWeight ;
            elem.style.fontStyle = fmt.fontStyle ;
            elem.style.fontFamily = fmt.fontFamily ;
        }
        return value ;
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

    private receiveFormulas(forms: IPCCheckDBViewFormula[]) {
        if (forms && Array.isArray(forms) && forms.length > 0) {
            this.format_formulas_ = forms ;
        }
        else {
            this.format_formulas_ = [] ;
        }
    }

    private receiveData(data: IPCDatabaseData) {
        this.reset() ;
        this.table_div_ = document.createElement('div') ;
        this.table_div_.className = 'xero-db-view-table-div' ;
        this.elem.appendChild(this.table_div_) ;

        this.col_cfgs_ = data.column_configurations ;
        this.col_descs_ = data.column_definitions ;
        this.keycol_ = data.keycols ;
        this.data_ = this.convertData(data.data) ;
        let coldefs = this.createColumnDescs() ;
        this.table_ = new TabulatorFull(this.table_div_!, {
            data: this.data_,
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

    private getColumnDesc(field: string) : IPCColumnDesc | undefined {
        if (this.col_descs_) {
            for(let desc of this.col_descs_) {
                if (desc.name === field) {
                    return desc ;
                }
            }
        }
        return undefined ;
    }

    private cellValueToIPCValue(cell: CellComponent, value: any) : IPCTypedDataValue | undefined{
        let ret : IPCTypedDataValue | undefined = undefined ;

        let coldesc = this.getColumnDesc(cell.getField()) ;
        if (coldesc) {
            switch( coldesc.type) {
                case 'string':
                    ret = DataValue.fromString(value) ;
                    break ;
                case 'integer':
                    ret = DataValue.fromInteger(value) ;
                    break ;
                case 'real':
                    ret = DataValue.fromReal(value) ;
                    break ;
                case 'boolean':
                    ret = DataValue.fromBoolean(value) ;
                    break ;
                case 'null':
                    ret = DataValue.fromNull() ;
                    break ;
                case 'error':
                    ret = DataValue.fromError(new Error(value)) ;
                    break ;
            }
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
        this.updateFormatData() ;
        this.updateCellFormats() ;
    }

    private updateCellFormats() {
        for(let row of this.table_!.getRows()) {
            row.reformat() ;
        }
    }

    private saveChanges() {
        if (this.changes_.length > 0) {
            this.popup_menu_?.closeMenu() ;
            this.table_?.alert("Saving changes...") ;
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
            this.updateCellFormats() ;
            this.table_?.clearAlert() ;
        }
    }

    private findRowFromSearch(search: any) : RowComponent | undefined {
        for(let row of this.table_!.getRows()) {
            let data = row.getData() ;
            let match = true ;
            for(let keys of Object.keys(search)) {
                let tvalue = data[keys] ;
                let svalue = DataValue.toDisplayString(search[keys]) ;
                if (tvalue !== svalue) {
                    match = false ;
                    break ;
                }
            }

            if (match) {
                return row ;
            }
        }

        return undefined ;
    }

    private revertChanges() {
        this.popup_menu_?.closeMenu() ;
        this.table_?.alert("Reverting changes...") ;
        this.reverting_ = true ;
        for(let change of this.changes_) {
            let row = this.findRowFromSearch(change.search) ;
            if (row) {
                let cell = row.getCell(change.column) ;
                if (cell) {
                    cell.setValue(DataValue.toDisplayString(change.oldvalue)) ;
                    cell.getElement().style.fontWeight = 'normal' ;
                }
            }
        }

        this.reverting_ = false ;
        this.dirty_ = false ;
        this.changes_ = [] ;
        this.updateCellFormats() ;
        this.table_?.clearAlert() ;
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

    private findMatchRows() : Map<string, MatchRowCollection> {
        let ret = new Map<string, MatchRowCollection>() ;

        for(let row of this.table_!.getRows()) {
            let data = row.getData() ;
            let comp_level = data['comp_level'] ;
            let set_number = data['set_number'] ;
            let match_number = data['match_number'] ;
            let alliance = data['alliance'] ;
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

            m.rows.push(row) ;
            m.team_keys.push(data['team_key']) ;
        }
        return ret ;
    }

    private setFormat(row: RowComponent, column: string, formula: IPCCheckDBViewFormula) {
        let rows = this.table_!.getRows() ;
        let pos = rows.indexOf(row) ;
        if (pos < 0) {
            return ;
        }
        let rowformats = this.formats_.get(pos) ;
        if (!rowformats) {
            rowformats = new Map<string, IPCCheckDBViewFormula>() ;
            this.formats_.set(pos, rowformats) ;
        }
        if (!rowformats.has(column)) {
            //
            // If it already has a format for this column, we do not overwrite it
            //
            rowformats.set(column, formula) ;
        }
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
                let value = row.getData()[field] ;
                let v = parseFloat(value) ;
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
                ret = DataValue.convertFromString(cfg.type, mrow.rows[0].getData()[field]) ;
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

                if (DataValue.isTruthy(result)) {
                    for(let row of mrow.rows) {
                        for(let col of formula.columns) {
                            this.setFormat(row, col, formula) ;
                            this.logMessage(`Row ${row.getIndex()}: ${formula.message}`) ;
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
        for(let row of this.table_!.getRows()) {
            let varvalues : Map<string, IPCTypedDataValue> = new Map<string, IPCTypedDataValue>() ;
            let data = row.getData() ;
            for(let varname of vars) {
                let cfg = this.getColumnDesc(varname) ;
                if (!cfg) {
                    this.logMessage('Column not found: ' + varname) ;
                    continue ;
                }
                let value = data[varname] ;
                varvalues.set(varname, DataValue.convertFromString(cfg.type, value)) ;
            }

            let result = expr.evaluate(varvalues) ;
            if (result instanceof Error) {
                continue ;
            }

            if (DataValue.isTruthy(result)) {
                for(let col of formula.columns) {
                    this.setFormat(row, col, formula) ;
                }
                this.logMessage(`Row ${row.getIndex()}: ${formula.message}`) ;
            }
        }
    }

    private updateFormatData() {
        this.messages_ = [] ;
        this.formats_.clear() ;

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
            this.updateCellFormats() ;
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

    private logMessage(msg: string) {
        this.messages_.push(msg) ;
    }
}