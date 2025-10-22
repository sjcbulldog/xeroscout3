import { XeroApp } from "../../apps/xeroapp.js";
import { IPCDataSet, IPCMatchSet } from "../../shared/ipc.js";
import { XeroView } from "../xeroview.js";
import { EditDataSetDialog } from "./editdatasetdialog.js";

export class DataSetEditor extends XeroView {
    private div_ : HTMLDivElement ;
    private dialog_ : EditDataSetDialog | undefined ;
    private formulas_ : string[] = [] ;
    private dsets_ : IPCDataSet[] = [] ;
    private oldname_ : string = '' ;

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
        this.dsets_ = dsets ;        
        this.displayAll() ;
    }

    private formatMatchesInfo(matches: IPCMatchSet): string {
        if (matches.kind === 'all') {
            return 'Matches: All' ;
        } else if (matches.kind === 'first') {
            return `Matches: First ${matches.first}` ;
        } else if (matches.kind === 'last') {
            return `Matches: Last ${matches.last}` ;
        } else if (matches.kind === 'range') {
            return `Matches: ${matches.first} - ${matches.last}` ;
        } else if (matches.kind === 'specific') {
            const levelMap: { [key: string]: string } = {
                'qm': 'Qual',
                'ef': 'Eighth',
                'qf': 'Quarter',
                'sf': 'Semi',
                'f': 'Final'
            } ;
            const level = levelMap[matches.comp_level] || matches.comp_level ;
            return `Match: ${level} ${matches.match_number}-${matches.set_number}` ;
        }
        return 'Matches: Unknown' ;
    }

    private displayAll(): void {
        this.div_.innerHTML = '' ; // Clear existing content

        // Display all existing datasets
        for (let i = 0; i < this.dsets_.length; i++) {
            const dataset = this.dsets_[i] ;
            const isAllDataset = dataset.name === 'All' ;
            const div = document.createElement('div') ;
            div.style.cursor = isAllDataset ? 'default' : 'pointer' ;
            div.className = 'xero-dataset-editor-list-item' ;
            div.style.position = 'relative' ; // Enable positioning for the delete icon
            div.style.display = 'flex' ;
            div.style.alignItems = 'center' ;
            div.style.justifyContent = 'space-between' ;
            div.style.flexDirection = 'column' ;
            div.style.alignItems = 'stretch' ;
            
            // Create header row with name and delete icon
            const headerRow = document.createElement('div') ;
            headerRow.style.display = 'flex' ;
            headerRow.style.alignItems = 'center' ;
            headerRow.style.justifyContent = 'space-between' ;
            
            // Create text span for dataset name
            const nameSpan = document.createElement('span') ;
            nameSpan.innerText = dataset.name ;
            nameSpan.style.flexGrow = '1' ;
            nameSpan.style.fontWeight = 'bold' ;
            headerRow.appendChild(nameSpan) ;
            
            // Create delete icon only if not the 'All' dataset
            if (!isAllDataset) {
                const deleteIcon = document.createElement('span') ;
                deleteIcon.innerHTML = '🗑️' ; // Garbage can emoji
                deleteIcon.style.cursor = 'pointer' ;
                deleteIcon.style.fontSize = '18px' ; // Increased from 14px
                deleteIcon.style.fontWeight = 'bold' ; // Make it bolder
                deleteIcon.style.filter = 'brightness(1.3) contrast(1.2)' ; // Make it brighter
                deleteIcon.style.padding = '4px' ; // Increased padding
                deleteIcon.style.marginLeft = '10px' ;
                deleteIcon.title = 'Delete dataset' ;
                
                // Add click handler for delete icon
                deleteIcon.addEventListener('click', (e) => {
                    e.stopPropagation() ; // Prevent triggering selection
                    this.deleteDataSet(i) ;
                }) ;
                
                // Add hover effect for delete icon
                deleteIcon.addEventListener('mouseenter', () => {
                    deleteIcon.style.backgroundColor = '#ff4444' ;
                    deleteIcon.style.borderRadius = '3px' ;
                }) ;
                deleteIcon.addEventListener('mouseleave', () => {
                    deleteIcon.style.backgroundColor = '' ;
                    deleteIcon.style.borderRadius = '' ;
                }) ;
                
                headerRow.appendChild(deleteIcon) ;
            }
            
            div.appendChild(headerRow) ;
            
            // Create matches info
            const matchesSpan = document.createElement('div') ;
            matchesSpan.style.fontSize = '16px' ;
            matchesSpan.style.color = '#666' ;
            matchesSpan.style.marginTop = '4px' ;
            matchesSpan.innerText = this.formatMatchesInfo(dataset.matches) ;
            div.appendChild(matchesSpan) ;
            
            // Create formula info (if present)
            if (dataset.formula && dataset.formula.trim() !== '') {
                const formulaSpan = document.createElement('div') ;
                formulaSpan.style.fontSize = '16px' ;
                formulaSpan.style.color = '#666' ;
                formulaSpan.style.marginTop = '2px' ;
                formulaSpan.style.fontStyle = 'italic' ;
                formulaSpan.innerText = `Formula: ${dataset.formula}` ;
                div.appendChild(formulaSpan) ;
            }
            
            // Add double-click handler to edit the dataset (only if not 'All')
            if (!isAllDataset) {
                div.addEventListener('dblclick', () => this.editDataSet(i)) ;
            }
            
            this.div_.appendChild(div) ;
        }

        this.addNewDataSetSentinel() ;
    }

    private deleteDataSet(index: number) {
        // Confirm deletion
        if (confirm(`Are you sure you want to delete the dataset "${this.dsets_[index].name}"?`)) {
            // Remove the dataset from the array
            this.dsets_.splice(index, 1) ;
            
            // Update the backend with the modified dataset list
            this.request('update-datasets', this.dsets_) ;
            
            // Refresh the display
            this.displayAll() ;
        }
    }

    private addNewDataSetSentinel() {
        let div = document.createElement('div') ;
        div.style.cursor = 'pointer' ;
        div.className = 'xero-dataset-editor-list-item' ;
        div.innerText = 'Add New Data Set' ;
        
        // Make the "Add New Data Set" item visually distinct
        div.style.fontStyle = 'italic' ;
        div.style.color = '#666' ; // Gray color to distinguish from selectable items
        div.style.borderTop = '1px solid #ccc' ; // Add separator line
        div.style.marginTop = '5px' ;
        div.style.paddingTop = '5px' ;
        
        div.addEventListener('dblclick', this.addNewDataSet.bind(this)) ;
        this.div_.appendChild(div) ;
    }

    private editDataSetClosed(changed: boolean) {
        if (changed && this.dialog_) {
            if (this.dialog_.isNew) {
                // Create a new dataset
                let ds = this.dialog_.dataset ;
                this.dsets_.push(ds) ;
            }
            else {
                let i = this.dsets_.findIndex(d => d.name === this.oldname_) ;
                if (i !== -1) {
                    this.dsets_[i] = this.dialog_.dataset ;
                }
            }
            this.request('update-datasets', this.dsets_) ;          
            this.displayAll() ;
        }
        this.dialog_ = undefined ;
    }

    private editDataSet(index: number) {
        if (this.dialog_) {
            return ;
        }

        this.oldname_ = this.dsets_[index].name ;

        // Create a copy of the dataset to edit
        const originalDataset = this.dsets_[index] ;
        const datasetCopy: IPCDataSet = {
            name: originalDataset.name,
            matches: JSON.parse(JSON.stringify(originalDataset.matches)),
            formula: originalDataset.formula
        } ;

        this.dialog_ = new EditDataSetDialog(datasetCopy, this.formulas_, false) ;
        this.dialog_.on('closed', this.editDataSetClosed.bind(this)) ;
        this.dialog_.showCentered(this.elem.parentElement!) ;
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