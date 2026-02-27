import { CellComponent, ColumnDefinition, RowComponent, TabulatorFull } from "tabulator-tables";
import { XeroApp } from "../../apps/xeroapp.js";
import { XeroView } from "../xeroview.js";

interface ManualMatchData {
    comp_level: string,
    set_number: number,
    match_number: number,
    red: [number, number, number],
    blue: [number, number, number]
}

interface TeamData {
    number: number ;
    nickname: string ;
} ;

interface BATeam {
    key: string,
    team_number: number,
    nickname: string,
    name: string,
    school_name: string,
    city: string,
    state_prov: string,
    country: string,
    address: string,
    postal_code: string,
    gmaps_place_id: string,
    gmaps_url: string,
    lat: number,
    lng: number,
}

interface BAMatch {
    key: string,
    comp_level: string,
    set_number: number,
    match_number: number,
    alliances: {
        red: {
            score?: number,
            team_keys: [string, string, string],
            surrogate_team_keys?: [string, string, string] | [number, number, number] | [],
            dq_team_keys?: [string, string, string] | [number, number, number] | [],
        },
        blue: {
            score?: number,
            team_keys: [string, string, string],
            surrogate_team_keys?: [string, string, string] | [number, number, number] | [],
            dq_team_keys?: [string, string, string] | [number, number, number] | [],
        }
    },
}

export class EditMatchesView extends XeroView {

    private table_div_ : HTMLDivElement | null = null ;
    private table_ : TabulatorFull | null = null ;
    private team_data_: TeamData[] = [] ;
    private modified_ : boolean = false ;

    constructor(app: XeroApp) {
        super(app, 'xero-editteams-view') ;

        this.registerCallback('send-match-data', this.receiveMatchData.bind(this)) ;
        this.registerCallback('send-team-data', this.receiveTeamData.bind(this)) ;
        this.request('get-team-data') ;
        this.request('get-match-data') ;
    }

    public get isOkToClose() : boolean {
        if (this.modified_) {
            alert('You have unsaved changes! Please save or cancel before closing.') ;
            return false ;
        }
        return true ;
    }    

    private receiveTeamData(data: BATeam[]) {
        // Convert BATeam array to TeamData array
        this.team_data_ = data.map(baTeam => ({
            number: baTeam.team_number,
            nickname: baTeam.nickname
        }));
    }

    private receiveMatchData(data: any) {
        this.reset() ;
        this.table_div_ = document.createElement('div') ;
        this.table_div_.className = 'xero-db-view-table-div' ;
        this.elem.appendChild(this.table_div_) ;

        let coldefs: ColumnDefinition[] = [
            {
                title: "CompLevel",
                field: "comp_level",
                editor: "list",
                editorParams: {
                    values: ["qm", "sf", "f"]
                },
                width: 100,
            },
            {
                title: "Set Number",
                field: "set_number",
                editor: "number",
                editorParams : 
                {
                    min: 0,
                    max: 200,
                    step: 1,
                },
                width: 180,
            },            
            {
                title: "Match Number",
                field: "comp_number",
                editor: "number",
                editorParams : 
                {
                    min: 0,
                    max: 200,
                    step: 1,
                },
                width: 180,
            },
            {
                title: "Red 1",
                field: "red1",
                editor: "number",
                editorParams : 
                {
                    min: 1,
                    max: 19999,
                    step: 1,
                },                
                width: 100,
            },
            {
                title: "Red 2",
                field: "red2",
                editor: "number",
                editorParams : 
                {
                    min: 1,
                    max: 19999,
                    step: 1,
                },                
                width: 100
            },
            {
                title: "Red 3",
                field: "red3",
                editor: "number",
                editorParams : 
                {
                    min: 1,
                    max: 19999,
                    step: 1,
                },                
                width: 100,
            },
            {
                title: "Blue 1",
                field: "blue1",
                editor: "number",
                editorParams : 
                {
                    min: 1,
                    max: 19999,
                    step: 1,
                },                
                width: 100,
            },
            {
                title: "Blue 2",
                field: "blue2",
                editor: "number",
                editorParams : 
                {
                    min: 1,
                    max: 19999,
                    step: 1,
                },                
                width: 100,
            },
            {
                title: "Blue 3",
                field: "blue3",
                editor: "number",
                editorParams : 
                {
                    min: 1,
                    max: 19999,
                    step: 1,
                },                
                width: 100,
            },
            {
                title: "",
                field: "delete",
                width: 60,
                hozAlign: "center",
                formatter: () => "🗑️",
                cellClick: (e, cell) => {
                    this.table_?.deleteRow(cell.getRow());
                    this.modified_ = true ;
                }
            }
        ]

        this.table_ = new TabulatorFull(this.table_div_!, {
            data: this.convertFromBackend(data),
            columns: coldefs,
            layout:"fitData",
            resizableColumnFit:true,
            movableColumns:true,
            selectableRows: 1,
        }) ;

        this.table_.on('cellEdited', this.cellEdited.bind(this)) ;

        let hr = document.createElement('hr') ;
        this.elem.appendChild(hr) ;

        let add_btn = document.createElement('button') ;
        add_btn.textContent = 'Add Match' ;
        add_btn.onclick = this.onAddMatch.bind(this) ;
        this.elem.appendChild(add_btn) ;

        let import_btn = document.createElement('button') ;
        import_btn.textContent = 'Import Matches' ;
        import_btn.onclick = this.onImportMatches.bind(this) ;
        this.elem.appendChild(import_btn) ;

        let save_btn = document.createElement('button') ;
        save_btn.textContent = 'Save Matches' ;
        save_btn.onclick = this.onSaveTeams.bind(this) ;
        this.elem.appendChild(save_btn) ;

        let cancel_btn = document.createElement('button') ;
        cancel_btn.textContent = 'Cancel' ;
        cancel_btn.onclick = this.onCancel.bind(this) ;
        this.elem.appendChild(cancel_btn) ;
    }

    private cellEdited(cell: CellComponent): void {
        const field = cell.getField();
        const value = cell.getValue();
        
        // Check if this is a team number field (red1, red2, red3, blue1, blue2, blue3)
        if (['red1', 'red2', 'red3', 'blue1', 'blue2', 'blue3'].includes(field)) {
            // Validate the entire row for duplicates and team existence
            this.validateMatchRow(cell.getRow());
        }

        this.modified_ = true ;
    }

    private validateMatchRow(row: RowComponent): void {
        const rowData = row.getData();
        const teamFields = ['red1', 'red2', 'red3', 'blue1', 'blue2', 'blue3'];
        
        // Get all team numbers in this match
        const teamNumbers = teamFields.map(field => parseInt(rowData[field]) || 0);
        
        // Find duplicates (excluding 0 which represents empty slots)
        const duplicateTeams = new Set<number>();
        const seenTeams = new Set<number>();
        
        for (const teamNumber of teamNumbers) {
            if (teamNumber !== 0) {
                if (seenTeams.has(teamNumber)) {
                    duplicateTeams.add(teamNumber);
                } else {
                    seenTeams.add(teamNumber);
                }
            }
        }
        
        // Validate each team field
        teamFields.forEach(field => {
            const cell = row.getCell(field);
            const teamNumber = parseInt(rowData[field]) || 0;
            
            let hasError = false;
            let errorMessage = '';
            
            // Check if team exists in team data
            if (teamNumber !== 0) {
                const teamExists = this.team_data_.some(team => team.number === teamNumber);
                if (!teamExists) {
                    hasError = true;
                    errorMessage = `Team ${teamNumber} not found in team data`;
                }
            }
            
            // Check for duplicates within the match
            if (teamNumber !== 0 && duplicateTeams.has(teamNumber)) {
                hasError = true;
                if (errorMessage) {
                    errorMessage += '; Duplicate team in match';
                } else {
                    errorMessage = `Team ${teamNumber} appears multiple times in this match`;
                }
            }
            
            // Apply styling based on validation results
            if (hasError) {
                cell.getElement().style.backgroundColor = '#ffcccc';
                cell.getElement().style.border = '2px solid #ff0000';
                cell.getElement().title = errorMessage;
            } else {
                cell.getElement().style.backgroundColor = '';
                cell.getElement().style.border = '';
                cell.getElement().title = '';
            }
        });
    }

    private hasValidationErrors(): boolean {
        if (!this.table_) return false;

        const rows = this.table_.getRows();
        
        for (const row of rows) {
            const rowData = row.getData();
            const teamFields = ['red1', 'red2', 'red3', 'blue1', 'blue2', 'blue3'];
            
            // Get all team numbers in this match
            const teamNumbers = teamFields.map(field => parseInt(rowData[field]) || 0);
            
            // Check for team existence errors
            for (const teamNumber of teamNumbers) {
                if (teamNumber !== 0) {
                    const teamExists = this.team_data_.some(team => team.number === teamNumber);
                    if (!teamExists) {
                        return true; // Found a team that doesn't exist
                    }
                }
            }
            
            // Check for duplicates within this match (excluding 0)
            const nonZeroTeams = teamNumbers.filter(num => num !== 0);
            const uniqueTeams = new Set(nonZeroTeams);
            if (uniqueTeams.size !== nonZeroTeams.length) {
                return true; // Found duplicates within this match
            }
        }
        
        return false;
    }

    private onAddMatch(): void {
        if (this.table_) {
            let comp_level = 'qm';
            let set_number = 1;
            let comp_number = 1;

            // Get existing table data to determine next match number
            const tableData = this.table_.getData();
            
            if (tableData.length > 0) {
                // Find the last match in the table
                const lastMatch = tableData[tableData.length - 1];
                
                // If the last match is a qualification match (qm), increment the match number
                if (lastMatch.comp_level === 'qm') {
                    comp_level = 'qm';
                    set_number = 1;
                    comp_number = (lastMatch.comp_number || 0) + 1;
                } else {
                    // For non-qm matches, use default values
                    comp_level = 'qm';
                    set_number = 1;
                    comp_number = 1;
                }
            }

            // Add a new match row with calculated values
            this.table_.addRow({
                comp_level: comp_level,
                set_number: set_number,
                comp_number: comp_number,
                red1: 0,
                red2: 0,
                red3: 0,
                blue1: 0,
                blue2: 0,
                blue3: 0
            });
            this.modified_ = true ;
        }
    }

    private onImportMatches(): void {
        // Make request to backend to import matches
        this.request('execute-command', 'import-matches');
    }

    private onSaveTeams(): void {
        if (this.table_) {
            // Check for validation errors before saving
            if (this.hasValidationErrors()) {
                alert('Data not saved due to errors. Please fix all team validation errors (invalid team numbers or duplicate teams in matches) before saving.');
                return;
            }

            let data = this.table_.getData();
            this.modified_ = false ;
            this.request('set-match-data', this.convertToBackend(data));
        }
    }

    private onCancel(): void {
        this.modified_ = false ;
        this.request('execute-command', 'view-init') ;
    }

    private convertToBackend(data: any[]): ManualMatchData[] {
        let ret: ManualMatchData[] = [];
        
        for (let item of data) {
            ret.push({
                comp_level: item.comp_level || '',
                set_number: item.set_number || 0,
                match_number: item.comp_number || 0,
                red: [
                    item.red1 || 0,
                    item.red2 || 0,
                    item.red3 || 0
                ],
                blue: [
                    item.blue1 || 0,
                    item.blue2 || 0,
                    item.blue3 || 0
                ]
            });
        }
        
        return ret;
    }

    private convertFromBackend(data: any[]): any[] {
        let ret: any[] = [];
        
        for (let match of data) {
            ret.push({
                comp_level: match.comp_level,
                set_number: match.set_number,
                comp_number: match.match_number, // Note: table uses comp_number field
                red1: match.red1,
                red2: match.red2,
                red3: match.red3,
                blue1: match.blue1,
                blue2: match.blue2,
                blue3: match.blue3
            });
        }
        
        return ret;
    }
}