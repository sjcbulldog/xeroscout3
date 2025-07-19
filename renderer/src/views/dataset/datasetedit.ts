import { XeroApp } from "../../apps/xeroapp.js";
import { IPCDataSet, IPCTeamNickNameNumber } from "../../shared/ipc.js";
import { XeroView } from "../xeroview.js";
import { EditDataSetDialog } from "./editdataset.js";

export class DataSetEditor extends XeroView {
    private div_ : HTMLDivElement ;
    private dialog_ : EditDataSetDialog | undefined ;
    private teams_ : IPCTeamNickNameNumber[] = [] ; 
    private datasets_ : IPCDataSet[] = [] ;

    // Class implementation goes here
    constructor(app: XeroApp) {
        super(app, 'xero-dataset-editor');

        this.registerCallback('send-team-list', this.receivedTeams.bind(this)) ;
        this.registerCallback('send-datasets', this.receivedDataSets.bind(this)) ;
        this.request('get-team-list', true) ;
        this.request('get-datasets') ;

        this.div_ = document.createElement('div') ;
        this.div_.className = 'xero-dataset-editor-div' ;
        this.elem.appendChild(this.div_) ;

        this.addNewDataSetSentinel() ;
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

    private addDataSetItem(ds: IPCDataSet) {
        let div = document.createElement('div') ;
        div.style.cursor = 'pointer' ;
        div.className = 'xero-dataset-editor-list-item' ;
        div.innerText = this.datasetToLabel(ds) ;
        div.addEventListener('click', this.editDataSet.bind(this)) ;
        this.div_.appendChild(div) ;
    }

    private addNewDataSetSentinel() {
        let div = document.createElement('div') ;
        div.style.cursor = 'pointer' ;
        div.className = 'xero-dataset-editor-list-item' ;
        div.innerText = 'Add New Data Set' ;
        div.addEventListener('click', this.addNewDataSet.bind(this)) ;
        this.div_.appendChild(div) ;
    }

    private editDataSetClosed(changed: boolean) {
        if (changed) {
            this.request('update-dataset', this.dialog_!.dataset) ;
            this.datasets_.push(this.dialog_!.dataset) ;
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
            }
        };

        let names : string[] = this.datasets_.map(d => d.name) ;
        this.dialog_ = new EditDataSetDialog(ds, this.teams_, names) ;
        this.dialog_.on('closed', this.editDataSetClosed.bind(this)) ;
        this.dialog_.showCentered(this.elem.parentElement!) ;
    }

    
    private editDataSet() {
        if (this.dialog_) {
            return ;
        }
    }
}