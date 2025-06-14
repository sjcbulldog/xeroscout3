import { CellComponent, EmptyCallback, TabulatorFull } from "tabulator-tables";
import { XeroApp } from "../../apps/xeroapp.js";
import { XeroView } from "../xeroview.js";
import { IPCColumnDesc, IPCFormula } from "../../shared/ipc.js";
import { NewFormulaDialog } from "./newformula.js";
import { XeroYesNo } from "../../widgets/xeroyesnow.js";
import { XeroDialog } from "../../widgets/xerodialog.js";

export class XeroFormulasView extends XeroView {
    private table_? : TabulatorFull;
    private dialog_? : XeroDialog ;
    private match_fields_ : IPCColumnDesc[] = [] ;
    private team_fields_ : IPCColumnDesc[] = [] ;
    private formulas_ : IPCFormula[] = [] ;

    private seen_formulas_ : boolean = false ;
    private seen_match_fields_ : boolean = false ;
    private seen_team_fields_ : boolean = false ;

    private editing_ : number = -1 ;

    public constructor(app: XeroApp, args: any[]) {
        super(app, 'xero-formula-view') ;
        this.registerCallback('send-formulas', this.receivedFormulas.bind(this)) ;
        this.registerCallback('send-match-field-list', this.receivedMatchFields.bind(this)) ;
        this.registerCallback('send-team-field-list', this.receivedTeamFields.bind(this)) ;

        this.request('get-match-field-list') ;
        this.request('get-team-field-list') ;
        this.request('get-formula-field-list') ;
        this.request('get-formulas') ;
    }

    private receivedFormulas(data: IPCFormula[]) {
        this.formulas_ = data ;
        this.seen_formulas_ = true ;
        this.checkReady() ;
    }

    private receivedMatchFields(data: IPCColumnDesc[]) {
        this.match_fields_ = data ;
        this.seen_match_fields_ = true ;
        this.checkReady() ;
    }

    private receivedTeamFields(data: IPCColumnDesc[]) {
        this.team_fields_ = data ;
        this.seen_team_fields_ = true ;
        this.checkReady() ;
    }

    private checkReady() {
        if (this.seen_formulas_ && this.seen_match_fields_ && this.seen_team_fields_) {
            if (!this.table_) {
                this.table_ =  new TabulatorFull(this.elem, {
                    data: this.formulas_,
                    layout: 'fitColumns',
                    columns: [
                        { title: '', field: 'del', formatter: this.formatDelCell.bind(this), width: 30},
                        { title: 'Name', field: 'name'},
                        { title: 'Formula', field: 'formula'},
                        { title: 'Description', field: 'desc'},
                    ]
                }) ;

                this.table_.on('tableBuilt', this.addNewFormulaRow.bind(this)) ;
                this.table_.on('cellDblClick', this.onCellDblClick.bind(this)) ;
            }
            else {
                this.table_.setData(this.formulas_) ;
                this.addNewFormulaRow() ;
            }
        }
    }

    private onCellDblClick(e: UIEvent, cell: CellComponent) {
        let data = cell.getData() ;
        if (data.name !== undefined) {
            this.editing_ = this.formulas_.findIndex((f) => f.name === data.name) ;
            if (this.editing_ !== -1) {
                this.dialog_ = new NewFormulaDialog(this.formulas_, this.match_fields_, this.team_fields_, 
                                    this.formulas_[this.editing_].name, this.formulas_[this.editing_].formula,
                                    this.formulas_[this.editing_].desc) ;
                this.dialog_.on('closed', this.addNewFormulaClosed.bind(this)) ;
                this.dialog_.showCentered(this.elem) ;
            }
        }
    }

    private formatDelCell(cell: CellComponent, formatterParams: {}, onRendered: EmptyCallback) : HTMLElement {
        let ret: HTMLElement ;

        if (cell.getRow().getNextRow() === false && cell.getData().name === undefined) {
            ret = document.createElement('button') ;
            ret.addEventListener('click', this.addNewFormula.bind(this)) ;
            ret.innerHTML = '<b>+</b>' ;
        }
        else {
            ret = document.createElement('button') ;
            ret.addEventListener('click', this.deleteFormula.bind(this, cell)) ;
            ret.innerHTML = '<b>-</b>' ;
        }

        return ret;
    }

    private addNewFormulaRow() {
        this.table_!.addRow({
            del: true,
        })
    }

    private addNewFormulaClosed(changed: boolean) {
        if (changed) {
            let d = this.dialog_! as NewFormulaDialog ;
            let name = d.name ;
            let desc = d.desc ;
            let expr = d.expr ;

            if (this.editing_ !== -1) {
                if (name !== this.formulas_[this.editing_].name) {
                    this.request('rename-formula', this.formulas_[this.editing_].name) ;
                    this.formulas_[this.editing_].name = name ;
                }

                this.formulas_[this.editing_].desc = desc ;
                this.formulas_[this.editing_].formula = expr ;

            }
            else {
                this.formulas_.push({
                    name: name,
                    desc: desc,
                    formula: expr
                }) ;
            }
            this.request('update-formula', [name, desc, expr]) ;
            this.request('get-formulas') ;            
        }
        this.dialog_ = undefined ;
        this.editing_ = -1 ;
    }

    private addNewFormula(e: MouseEvent) {
        this.dialog_ = new NewFormulaDialog(this.formulas_, this.match_fields_, this.team_fields_) ;
        this.dialog_.on('closed', this.addNewFormulaClosed.bind(this)) ;
        this.dialog_.showCentered(this.elem) ;
    }

    private deleteFormulaConfirmed(cell: CellComponent, changed: boolean) {
        if (changed) {
            let data = cell.getData() ;
            if (data.name !== undefined) {
                this.request('delete-formula', data.name) ;
                this.request('get-formulas') ;
            }
        }
    }

    private deleteFormula(cell: CellComponent, e: MouseEvent) {
        let data = cell.getData() ;
        this.dialog_ = new XeroYesNo('Delete Formula', `Are you sure you want to delete the formula '${data.name}?`) ;
        this.dialog_.on('closed', this.deleteFormulaConfirmed.bind(this, cell)) ;
        this.dialog_.showCentered(this.elem) ;
    }
}