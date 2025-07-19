import { CellComponent, TabulatorFull } from "tabulator-tables";
import { IPCDataSet, IPCTeamNickNameNumber } from "../../shared/ipc.js";
import { XeroDialog } from "../../widgets/xerodialog.js";

interface DataSetTeamList {
    number: number;
    name: string;
    visible: boolean; // Indicates if the team is included in the dataset
}

export class EditDataSetDialog extends XeroDialog {
    private data_set_name_?: HTMLInputElement ;
    private first_n_?: HTMLInputElement ;
    private last_n_?: HTMLInputElement ;
    private table_? : TabulatorFull ;
    private all_ : HTMLElement | undefined ;
    private first_ : HTMLElement | undefined ;
    private last_ : HTMLElement | undefined ;
    private range_ : HTMLElement | undefined ;
    private error_ : HTMLSpanElement | undefined ;
    private button_map_ : Map<HTMLInputElement, string> = new Map() ;

    private dataset_ : IPCDataSet ;
    private teams_ : IPCTeamNickNameNumber[] ;
    private names_ : string[] ;

    constructor(ds: IPCDataSet, teams: IPCTeamNickNameNumber[], names: string[]) {
        super('Edit Data Set') ;
        this.dataset_ = JSON.parse(JSON.stringify(ds)) ;        // Deep copy to avoid modifying original dataset
        this.teams_ = teams ;
        this.names_ = names ;
    }

    public get dataset(): IPCDataSet {
        return this.dataset_ ;
    }

    async populateDialog(pdiv: HTMLDivElement) {
        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.data_set_name_ = document.createElement('input') ;
        this.data_set_name_.type = 'text' ;
        this.data_set_name_.className = 'xero-popup-form-edit-dialog-input' ;
        this.data_set_name_.value = this.dataset_.name ;
        if (this.data_set_name_.value === '') {
            this.data_set_name_.placeholder = 'Enter Data Set Name' ;
        }

        let label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Data Set Name:' ;
        label.appendChild(this.data_set_name_) ;
        div.appendChild(label) ;

        let div2 = document.createElement('div') ;
        div2.className = 'xero-popup-form-edit-dialog-rowdiv' ;
        div2.style.border = '1px solid black' ;
        div2.style.borderRadius = '5px' ;
        div2.style.marginTop = '5px' ;

        let div3 = document.createElement('div') ;
        div3.className = 'xero-popup-form-edit-dialog-matches' ;

        let span = document.createElement('span') ;
        span.className = 'xero-popup-form-edit-dialog-label' ;
        span.style.paddingTop = '0px' ;
        span.innerText = 'Matches:' ;
        div3.appendChild(span) ;

        div3.appendChild(this.all_ = this.createOneRadioButton('All', 'match', 'all')) ;
        div3.appendChild(this.last_ = this.createOneRadioButton('Last N', 'match', 'last')) ;
        div3.appendChild(this.first_ = this.createOneRadioButton('First N', 'match', 'first')) ;
        div3.appendChild(this.range_ = this.createOneRadioButton('Range', 'match', 'range')) ;

        let div4 = document.createElement('div') ;
        div4.className = 'xero-popup-form-edit-dialog-rowdiv' ;       

        this.first_n_ = document.createElement('input') ;
        this.first_n_.type = 'text' ;
        this.first_n_.className = 'xero-popup-form-edit-dialog-input' ;
        if (this.dataset_.matches.first && this.dataset_.matches.first >= 0) {
            this.first_n_.value = this.dataset_.matches.first.toString() ;
        }

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'First:' ;
        label.appendChild(this.first_n_) ;
        div4.appendChild(label) ;
        
        this.last_n_ = document.createElement('input') ;
        this.last_n_.type = 'text' ;
        this.last_n_.className = 'xero-popup-form-edit-dialog-input' ;
        if (this.dataset_.matches.last && this.dataset_.matches.last >= 0) {
            this.last_n_.value = this.dataset_.matches.last.toString() ;
        }

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Last:' ;
        label.appendChild(this.last_n_) ;
        div4.appendChild(label) ;

        div.appendChild(div2) ;
        div2.appendChild(div3) ;
        div2.appendChild(div4) ;

        let div5 = document.createElement('div') ;
        div5.className = 'xero-popup-form-edit-dialog-rowdiv' ;
        div.appendChild(div5) ;

        this.table_ = new TabulatorFull(div5, {
            data: this.createTeamList(),
            height: '200px',
            layout: 'fitColumns',
            columns: [
                { title: 'Team Number', field: 'number' },
                { title: 'Team Name', field: 'name' },
                { title: 'Included', field: 'visible', formatter: 'tickCross', width: 100},
            ],
        }) ;
        this.table_.on('cellClick', this.cellClick.bind(this)) ;

        this.error_ = document.createElement('span') ;
        this.error_.className = 'xero-popup-form-edit-dialog-error' ;
        div.appendChild(this.error_) ;

        if (this.dataset_.matches.kind === 'all') {
            this.radioButtonCheckedInt(this.all_.firstChild as HTMLInputElement) ;
        }
        else if (this.dataset_.matches.kind === 'first') {
            this.radioButtonCheckedInt(this.first_.firstChild as HTMLInputElement) ;
        }
        else if (this.dataset_.matches.kind === 'last') {
            this.radioButtonCheckedInt(this.last_.firstChild as HTMLInputElement) ;
        }
        else if (this.dataset_.matches.kind === 'range') {
            this.radioButtonCheckedInt(this.range_.firstChild as HTMLInputElement) ;
        }

        pdiv.appendChild(div) ;
    }

    private cellClick(e: UIEvent, cell: CellComponent) {
        if (cell.getField() === 'visible') {
            let data = cell.getData() ;
            data.visible = !data.visible ;
            cell.setValue(data.visible) ;
        }
    }    

    private createTeamList(): DataSetTeamList[] {
        let teamList: DataSetTeamList[] = [] ;
        for (let team of this.teams_) {
            teamList.push({
                number: team.number,
                name: team.nickname,
                visible: this.dataset_.teams.includes(team.number) // Check if team is included in the dataset
            });
        }
        return teamList;
    }

    private radioButtonCheckedInt(input: HTMLInputElement): void {
        let kind = (this.button_map_.get(input) || 'all') ;
        if (kind === 'all') {
            this.first_n_!.disabled = true ;
            this.last_n_!.disabled = true ;
        }
        else if (kind === 'first') {
            this.first_n_!.disabled = false ;
            this.last_n_!.disabled = true ;
        }
        else if (kind === 'last') {
            this.first_n_!.disabled = true ;
            this.last_n_!.disabled = false ;
        }
        else if (kind === 'range') {
            this.first_n_!.disabled = false ;
            this.last_n_!.disabled = false ;
        }
    }

    private radioButtonChecked(ev: Event): void {
        let input = ev.target as HTMLInputElement ;
        this.radioButtonCheckedInt(input) ;
    }

    private createOneRadioButton(labelstr: string, name: string, kind: string): HTMLElement {
        let div = document.createElement('div') ;
        let radio = document.createElement('input') ;
        div.appendChild(radio) ;

        radio.type = 'radio' ;
        radio.className = 'xero-popup-form-edit-dialog-radio' ;
        radio.name = name ;
        radio.checked = (kind === this.dataset_.matches.kind) ;
        this.button_map_.set(radio, kind) ;
        radio.addEventListener('change', this.radioButtonChecked.bind(this)) ;

        let label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = labelstr ;
        div.appendChild(label) ;
        return div ;
    }


    onInit() {
        if (this.data_set_name_) {
            this.data_set_name_.focus() ;
            this.data_set_name_.select() ;
        }
    }

    protected isOKToClose(ok: boolean): boolean {
        if (ok) {
            let name = this.data_set_name_?.value.trim() || '' ;            
            if (name === '') {
                this.error_!.innerText = 'Data Set Name cannot be empty.' ;
                this.data_set_name_!.focus() ;
                return false ;
            }

            if (name.length > 16) {
                this.error_!.innerText = 'Data Set Name cannot be longer than 16 characters.' ;
                this.data_set_name_!.focus() ;
                return false ;
            }

            for(let ch of this.data_set_name_!.value) {
                if (!ch.match(/[a-zA-Z0-9_]/)) {
                    this.error_!.innerText = 'Data Set Name can only contain alphanumeric characters and underscores.' ;
                    this.data_set_name_!.focus() ;
                    return false ;
                }
            }

            if (this.names_.includes(name)) {
                this.error_!.innerText = 'Data Set Name must be unique.' ;
                this.data_set_name_!.focus() ;
                return false ;
            }
        }

        return true ;
    }

    okButton(event: Event) {
        this.dataset_.name = this.data_set_name_?.value || '' ;
        this.dataset_.matches.first = parseInt(this.first_n_?.value || '-1', 10) ;
        this.dataset_.matches.last = parseInt(this.last_n_?.value || '-1', 10) ;
        this.dataset_.teams = this.table_?.getData().filter(team => team.visible).map(team => team.number) || [] ;

        if ((this.all_?.firstChild as HTMLInputElement).checked) {
            this.dataset_.matches.kind = 'all' ;
        }
        else if ((this.first_?.firstChild as HTMLInputElement).checked) {
            this.dataset_.matches.kind = 'first' ;
        }
        else if ((this.last_?.firstChild as HTMLInputElement).checked) {
            this.dataset_.matches.kind = 'last' ;
        }
        else if ((this.range_?.firstChild as HTMLInputElement).checked) {
            this.dataset_.matches.kind = 'range' ;
        }

        super.okButton(event) ;
    }
}
