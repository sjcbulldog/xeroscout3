import { XeroApp } from "../../apps/xeroapp.js";
import { IPCDataSet } from "../../shared/ipc.js";
import { XeroView } from "../xeroview.js";
import { EditDataSetDialog } from "./editdatasetdialog.js";

export class DataSetEditor extends XeroView {
    private div_ : HTMLDivElement ;
    private dialog_ : EditDataSetDialog | undefined ;
    private formulas_ : string[] = [] ;

    // Class implementation goes here
    constructor(app: XeroApp) {
        super(app, 'xero-dataset-editor');

        this.registerCallback('send-datasets', this.receivedDataSets.bind(this)) ;
        this.registerCallback('send-formulas', this.receivedFormulas.bind(this)) ;
        this.request('get-formulas') ;
        this.request('get-datasets') ;

        this.div_ = document.createElement('div') ;
        this.div_.className = 'xero-dataset-editor-div' ;
        this.elem.appendChild(this.div_) ;

        this.addNewDataSetSentinel() ;
    }

    private receivedFormulas(formulas: any[]) {
        this.formulas_ = formulas.map((f: any) => f.name) ; 
    }

    private receivedDataSets(dsets: IPCDataSet[]) {
        this.div_.innerHTML = '' ; // Clear existing content
        this.addNewDataSetSentinel() ;
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
        if (changed && this.dialog_) {
            if (this.dialog_.isNew) {
                // Create a new dataset

            }
            else {
                // Update existing dataset
            }
        }
        this.dialog_ = undefined ;
    }

    private addNewDataSet() {
        if (this.dialog_) {
            return ;
        }

        let ds: IPCDataSet = {
            name: 'New Data Set',
            matches: {
                kind: 'all',
                first: 4,
                last: 4,
            },
            formula: '',
        };

        this.dialog_ = new EditDataSetDialog(ds, this.formulas_, true) ;
        this.dialog_.on('closed', this.editDataSetClosed.bind(this)) ;
        this.dialog_.showCentered(this.elem.parentElement!) ;
    }
}