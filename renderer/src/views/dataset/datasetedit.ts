import { XeroApp } from "../../apps/xeroapp.js";
import { IPCColumnDesc, IPCDataSet, IPCFormula, IPCTeamNickNameNumber } from "../../shared/ipc.js";
import { XeroView } from "../xeroview.js";
import { EditDataSetDialog } from "./editdataset.js";

export class DataSetEditor extends XeroView {
    private div_ : HTMLDivElement ;
    private dialog_ : EditDataSetDialog | undefined ;
    private teams_ : IPCTeamNickNameNumber[] = [] ; 
    private datasets_ : IPCDataSet[] = [] ;
    private oldname_ : string | undefined ;

    private formulas_ : string[] = [] ;
    private match_fields_ : string[] = [] ;
    private team_fields_ : string[] = [] ;
    private seen_formulas_ : boolean = false ;
    private seen_match_fields_ : boolean = false ;
    private seen_team_fields_ : boolean = false ;    

    // Class implementation goes here
    constructor(app: XeroApp) {
        super(app, 'xero-dataset-editor');

        this.registerCallback('send-team-list', this.receivedTeams.bind(this)) ;
        this.registerCallback('send-datasets', this.receivedDataSets.bind(this)) ;
        this.registerCallback('send-formulas', this.receivedFormulas.bind(this)) ;
        this.registerCallback('send-match-field-list', this.receivedMatchFields.bind(this)) ;
        this.registerCallback('send-team-field-list', this.receivedTeamFields.bind(this)) ;        
        this.request('get-team-list', true) ;
        this.request('get-match-field-list') ;
        this.request('get-team-field-list') ;
        this.request('get-formulas') ;  

        this.div_ = document.createElement('div') ;
        this.div_.className = 'xero-dataset-editor-div' ;
        this.elem.appendChild(this.div_) ;

        this.addNewDataSetSentinel() ;
    }

    private checkReady() {
        if (this.seen_formulas_ && this.seen_match_fields_ && this.seen_team_fields_) {
            this.request('get-datasets') ;
        }
    }

    private receivedFormulas(data: IPCFormula[]) {
        this.formulas_ = data.map(f => f.name) ;
        this.seen_formulas_ = true ;
        this.checkReady() ;
    }

    private receivedMatchFields(data: IPCColumnDesc[]) {
        this.match_fields_ = data.map(f => f.name) ;
        this.seen_match_fields_ = true ;
        this.checkReady() ;
    }

    private receivedTeamFields(data: IPCColumnDesc[]) {
        this.team_fields_ = data.map(f => f.name) ;
        this.seen_team_fields_ = true ;
        this.checkReady() ;
    }     

    private receivedTeams(teams: IPCTeamNickNameNumber[]) {
        this.teams_ = teams ;   
    }

    private receivedDataSets(dsets: IPCDataSet[]) {
        this.datasets_ = dsets ;
        this.addDataSets() ;
    }

    private addDataSets() {
        this.div_.innerHTML = '' ;        
        for(let ds of this.datasets_) {
            this.addDataSetItem(ds) ;
        }
        this.addNewDataSetSentinel() ;
    }

    private datasetToLabel(ds: IPCDataSet): string {
        let label = ds.name ;
        label += `, ${ds.teams.length} teams ` ;
        if (ds.matches.kind === 'range') {
            label += ` (${ds.matches.first} - ${ds.matches.last})` ;
        } else if (ds.matches.kind === 'first') {
            label += ` (First: ${ds.matches.first})` ;
        } else if (ds.matches.kind === 'last') {
            label += ` (Last: ${ds.matches.last})` ;
        } else if (ds.matches.kind === 'all') {
            label += ' (All Matches)' ;
        }
        return label ;
    }

    private deleteDataSet(ds: IPCDataSet) {
        this.request('delete-dataset', ds.name) ;
        this.datasets_ = this.datasets_.filter(d => d.name !== ds.name) ;
        this.addDataSets() ;
    }

    private addDataSetItem(ds: IPCDataSet) {
        let top = document.createElement('div') ;
        top.className = 'xero-dataset-editor-list-item-top' ;

        let button = document.createElement('button') ;
        button.className = 'xero-dataset-editor-list-item-delete' ;
        button.innerHTML = '&#x2612' ;
        button.addEventListener('click', this.deleteDataSet.bind(this, ds)) ;
        top.appendChild(button) ;

        let div = document.createElement('div') ;
        div.style.cursor = 'pointer' ;
        div.className = 'xero-dataset-editor-list-item' ;
        div.innerText = this.datasetToLabel(ds) ;
        div.addEventListener('click', this.editDataSet.bind(this, ds)) ;

        top.appendChild(div) ;
        this.div_.appendChild(top) ;
    }

    private addNewDataSetSentinel() {
        let top = document.createElement('div') ;
        top.className = 'xero-dataset-editor-list-item-top' ;

        let div = document.createElement('div') ;
        div.style.cursor = 'pointer' ;
        div.className = 'xero-dataset-editor-list-item' ;
        div.innerText = 'Add New Data Set' ;
        div.addEventListener('click', this.addNewDataSet.bind(this)) ;

        top.appendChild(div) ;
        this.div_.appendChild(top) ;
    }

    private editDataSetClosed(newds: boolean, changed: boolean) {
        if (changed) {
            let newobj = this.dialog_!.dataset ;
            if (!newds) {
                if (this.oldname_ && this.oldname_ !== newobj.name) {
                    //
                    // The dataset name has changed, so we need to remove the old one
                    // and add the new one.
                    //
                    this.datasets_ = this.datasets_.filter(d => d.name !== this.oldname_) ;
                    this.request('delete-dataset', this.oldname_) ;
                    this.oldname_ = undefined ;
                    this.datasets_.push(this.dialog_!.dataset) ;
                }
                else {
                    // The dataset has not changed, so we can just update it.
                    let index = this.datasets_.findIndex(d => d.name === newobj.name) ;
                    this.datasets_[index] = newobj ;
                }
            }
            else {
                this.datasets_.push(this.dialog_!.dataset) ;
            }

            this.request('update-dataset', newobj) ;
            this.addDataSets() ;
        }
        this.dialog_ = undefined ;
    }

    private addNewDataSet() {
        if (this.dialog_) {
            return ;
        }

        let ds: IPCDataSet = {
            name: '',
            teams: this.teams_.map(team => team.number), // Default to all teams
            matches: {
                kind: 'all',
                first: -1,
                last: -1,
            },
            fields: [],
        };

        let names : string[] = this.datasets_.map(d => d.name) ;
        this.dialog_ = new EditDataSetDialog(ds, this.teams_, names, this.match_fields_, this.team_fields_, this.formulas_) ;
        this.dialog_.on('closed', this.editDataSetClosed.bind(this, true)) ;
        this.dialog_.showCentered(this.elem.parentElement!) ;
    }

    
    private editDataSet(ds: IPCDataSet) {
        if (this.dialog_) {
            return ;
        }

        this.oldname_ = ds.name ;

        let names : string[] = this.datasets_.map(d => d.name) ;
        if (names.includes(ds.name)) {
            names = names.filter(name => name !== ds.name) ;
        }
        this.dialog_ = new EditDataSetDialog(ds, this.teams_, names, this.match_fields_, this.team_fields_, this.formulas_) ;
        this.dialog_.on('closed', this.editDataSetClosed.bind(this, false)) ;
        this.dialog_.showCentered(this.elem.parentElement!) ;        
    }
}