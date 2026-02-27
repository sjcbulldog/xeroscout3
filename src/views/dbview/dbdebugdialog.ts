import { XeroDialog } from "../../widgets/xerodialog.js";  
import { IPCCheckDBViewFormula, IPCColumnDesc, IPCFormula } from "../../shared/ipc.js";  
import { TabulatorFull, CellComponent } from "tabulator-tables";  
import { DatabaseView } from "./dbview.js";

//still unable to see variable values in debug dialog.
export class DBDebugDialog extends XeroDialog {  
    private table_?: TabulatorFull;  
    private formulas_: IPCCheckDBViewFormula[] = [];  
    private formulaMap_: Map<string, string> = new Map();
    private debugDataMap_: Map<string, any> = new Map();
      
    constructor(  
        private dbView: DatabaseView,   
        type: string,   
        formulas: IPCCheckDBViewFormula[],   
        allFormulas: IPCFormula[],   
        columns: IPCColumnDesc[],  
        matchId?: string 
    ) {  
        
        super('Debug Formulas' + (matchId ? ` - Match ${matchId}` : ''), false);  
        this.formulas_ = formulas;  
        allFormulas.forEach(f => this.formulaMap_.set(f.name, f.formula));  
    } 
        
    async populateDialog(pdiv: HTMLDivElement) {  
        const div = document.createElement('div');  
        div.style.width = '800px';  
        div.style.height = '400px';  
          
        this.table_ = new TabulatorFull(div, {  
            data: this.formulas_,  
            columns: [  
                { title: 'Type', field: 'type', width: 80 },  
                { title: 'Formula', field: 'formula', width: 150 },  
                {   
                    title: 'Debug',   
                    field: 'debug',   
                    width: 80,  
                    formatter: (cell: CellComponent) => {  
                        let btn = document.createElement('button');  
                        btn.innerText = 'Debug';  
                        btn.addEventListener('click', (e) => {  
                            e.stopPropagation();  
                            const rowData = cell.getRow().getData() as IPCCheckDBViewFormula;  
                            let debugData;  
                            
                            // Call appropriate debug method based on formula type  
                            if (rowData.type === 'alliance') {  
                                debugData = this.dbView.debugFormulaAlliance(rowData);  
                            } else {  
                                debugData = this.dbView.debugFormulaRobot(rowData);  
                            }  
                            
                            this.showDebugDetails(rowData, debugData);  
                        });  
                        return btn;  
                    }   
                }
            ],  
            layout: 'fitColumns'  
        });
          
        pdiv.appendChild(div);  
    }  
      
    public populateButtons(div: HTMLDivElement) {  
        let closebtn = document.createElement('button');  
        closebtn.innerText = 'Close';  
        closebtn.className = 'xero-popup-form-edit-dialog-button';  
        closebtn.addEventListener('click', () => {  
            this.close(false);  
        });  
        div.appendChild(closebtn); 
    }  
      
    private showDebugDetails(formula: IPCCheckDBViewFormula, debugData?: Array<{name: string, value: string}>[]) {  
        const expression = this.formulaMap_.get(formula.formula) || formula.formula;  
        
        const debugDiv = document.createElement('div');  
        debugDiv.style.cssText = `  
            position: fixed;  
            top: 50%;  
            left: 50%;  
            transform: translate(-50%, -50%);  
            background: white;  
            border: 2px solid black;  
            padding: 20px;  
            z-index: 1200;  
            box-shadow: 0 0 10px rgba(0,0,0,0.5);  
            max-height: 80vh;  
            overflow-y: auto;  
        `;  
        
        // Build variables HTML from array data  
        let variablesHtml = '';  
        if (debugData && debugData.length > 0) {  
            // Show first set of variables (for alliance) or the row data (for robot)  
            const vars = debugData[0] || [];  
            variablesHtml = vars.map(v => `${v.name} = ${v.value}`).join('<br>');  
        } else {  
            variablesHtml = 'No debug data available';  
        }  
        
        debugDiv.innerHTML = `  
            <h3>Debug Formula: ${formula.formula}</h3>  
            <p><strong>Expression:</strong> ${expression}</p>  
            <p><strong>Type:</strong> ${formula.type}</p>  
            <p><strong>Variables:</strong></p>  
            ${variablesHtml}  
        `;  
        
        const btn = document.createElement('button');  
        btn.className = 'xero-popup-form-edit-dialog-button';  
        btn.innerText = 'Close';  
        btn.addEventListener('click', () => {  
            debugDiv.remove();  
        });  
        debugDiv.appendChild(btn);  
        
        document.body.appendChild(debugDiv);  
    }

    public updateDebugData(formula: IPCCheckDBViewFormula, data: {expression: string, variables: Array<{name: string, value: string}>}) {  
        this.debugDataMap_.set(formula.formula, data);  
    }
}