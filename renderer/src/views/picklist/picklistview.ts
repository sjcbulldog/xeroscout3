import { XeroApp } from "../../apps/xeroapp.js";
import { IPCPickListConfig, IPCTeamInfo, IPCPickListData, IPCDataSet, IPCColumnDesc, IPCFormula, IPCPickListTeamData } from "../../shared/ipc.js";
import { XeroView } from "../xeroview.js";
import { PickListConfigDialog } from "./picklistconfigdialog.js";
import { TabulatorFull as Tabulator, ColumnDefinition, RowComponent } from 'tabulator-tables';

export class PickListView extends XeroView {
    private left_panel_!: HTMLDivElement ;
    private right_panel_!: HTMLDivElement ;
    private config_list_div_!: HTMLDivElement ;
    private table_container_!: HTMLDivElement ;
    private table_: Tabulator | null = null ;
    
    private dialog_: PickListConfigDialog | undefined ;
    private configs_: IPCPickListConfig[] = [] ;
    private selected_config_index_: number = -1 ;
    private teams_: IPCTeamInfo[] = [] ;
    private datasets_: IPCDataSet[] = [] ;
    private teamflds_: string[] = [] ;
    private matchflds_: string[] = [] ;
    private formulas_: string[] = [] ;
    
    private teamfldsReceived_: boolean = false ;
    private matchfldsReceived_: boolean = false ;
    private formulasReceived_: boolean = false ;
    private datasetsReceived_: boolean = false ;
    private teamsReceived_: boolean = false ;
    private configsReceived_: boolean = false ;

    constructor(app: XeroApp) {
        super(app, 'xero-picklist-view') ;

        // Set the view to fill its parent
        this.elem.style.width = '100%' ;
        this.elem.style.height = '100%' ;
        this.elem.style.display = 'flex' ;
        this.elem.style.flexDirection = 'column' ;

        // Register callbacks for data from backend
        this.registerCallback('send-picklist-configs', this.receivedConfigs.bind(this)) ;
        this.registerCallback('send-picklist-data', this.receivedPickListData.bind(this)) ;

        this.registerCallback('send-datasets', this.receivedDataSets.bind(this)) ;
        this.registerCallback('send-team-field-list', this.receivedTeamFields.bind(this)) ;
        this.registerCallback('send-match-field-list', this.receivedMatchFields.bind(this)) ;
        this.registerCallback('send-formulas', this.receivedFormulas.bind(this)) ;
        this.registerCallback('send-team-list', this.receivedTeams.bind(this)) ;


        // Request initial data from backend
        this.request('get-picklist-configs') ;

        this.request('get-datasets') ;
        this.request('get-team-field-list') ;
        this.request('get-match-field-list') ;
        this.request('get-formulas') ;
        this.request('get-team-list', { nicknames: true, rank: true }) ;
    }

    private createUI(): void {
        // Create main container with left and right panels
        const container = document.createElement('div') ;
        container.style.display = 'flex' ;
        container.style.width = '100%' ;
        container.style.height = '100%' ;
        container.style.overflow = 'hidden' ;

        // Left panel for picklist configuration management
        this.left_panel_ = document.createElement('div') ;
        this.left_panel_.style.width = '300px' ;
        this.left_panel_.style.height = '100%' ;
        this.left_panel_.style.borderRight = '1px solid #ccc' ;
        this.left_panel_.style.padding = '10px' ;
        this.left_panel_.style.display = 'flex' ;
        this.left_panel_.style.flexDirection = 'column' ;
        this.left_panel_.style.overflow = 'hidden' ;

        // Right panel for table display
        this.right_panel_ = document.createElement('div') ;
        this.right_panel_.style.flexGrow = '1' ;
        this.right_panel_.style.padding = '10px' ;
        this.right_panel_.style.display = 'flex' ;
        this.right_panel_.style.flexDirection = 'column' ;

        // Configuration list container
        this.config_list_div_ = document.createElement('div') ;
        this.config_list_div_.style.flexGrow = '1' ;
        this.config_list_div_.style.overflowY = 'auto' ;
        this.left_panel_.appendChild(this.config_list_div_) ;

        // Table container
        this.table_container_ = document.createElement('div') ;
        this.table_container_.style.flexGrow = '1' ;
        this.table_container_.style.border = '1px solid #ddd' ;
        this.table_container_.style.backgroundColor = '#fff' ;
        this.right_panel_.appendChild(this.table_container_) ;

        container.appendChild(this.left_panel_) ;
        container.appendChild(this.right_panel_) ;
        this.elem.appendChild(container) ;
    }

    private checkAll() {
        if (this.teamfldsReceived_ && this.matchfldsReceived_ && this.formulasReceived_ && 
            this.datasetsReceived_ && this.configsReceived_ && this.teamsReceived_) {
            this.createUI() ;
            this.displayConfigs() ;
        }
    }

    private receivedTeams(teams: IPCTeamInfo[]): void {
        this.teams_ = teams ;
        this.teamsReceived_ = true ;
        this.checkAll() ;
    }

    private receivedConfigs(configs: IPCPickListConfig[]): void {
        this.configs_ = configs ;
        if (!this.configs_) {
            this.configs_ = [] ;
        }
        this.configsReceived_ = true ;
        this.checkAll() ;
    }

    private receivedDataSets(datasets: IPCDataSet[]): void {
        this.datasets_ = datasets ;
        this.datasetsReceived_ = true ;
        this.checkAll() ;
    }

    private receivedTeamFields(fields: IPCColumnDesc[]): void {
        this.teamflds_ = fields.map(f => f.name) ;
        this.teamfldsReceived_ = true ;
        this.checkAll() ;
    }

    private receivedMatchFields(fields: IPCColumnDesc[]): void {
        this.matchflds_ = fields.map(f => f.name) ;
        this.matchfldsReceived_ = true ;
        this.checkAll() ;
    }

    private receivedFormulas(formulas: IPCFormula[]): void {
        this.formulas_ = formulas.map(f => f.name) ;
        this.formulasReceived_ = true ;
        this.checkAll() ;
    }

    private receivedPickListData(data: IPCPickListData): void {
        this.renderTable(data) ;
    }

    private displayConfigs(): void {
        this.config_list_div_.innerHTML = '' ;

        // Header with title and buttons
        const header = document.createElement('div') ;
        header.style.display = 'flex' ;
        header.style.justifyContent = 'space-between' ;
        header.style.alignItems = 'center' ;
        header.style.marginBottom = '10px' ;

        const title = document.createElement('h3') ;
        title.innerText = 'Pick Lists' ;
        title.style.margin = '0' ;
        header.appendChild(title) ;

        // Buttons container
        const buttonContainer = document.createElement('div') ;
        buttonContainer.style.display = 'flex' ;
        buttonContainer.style.gap = '5px' ;

        // Add button
        const addBtn = document.createElement('button') ;
        addBtn.innerText = '+' ;
        addBtn.style.padding = '4px 10px' ;
        addBtn.style.fontSize = '16px' ;
        addBtn.style.fontWeight = 'bold' ;
        addBtn.style.cursor = 'pointer' ;
        addBtn.title = 'Add new pick list' ;
        addBtn.addEventListener('click', () => this.addConfig()) ;
        buttonContainer.appendChild(addBtn) ;

        header.appendChild(buttonContainer) ;
        this.config_list_div_.appendChild(header) ;

        // Scrollable container for configs
        const scrollContainer = document.createElement('div') ;
        scrollContainer.style.overflowY = 'auto' ;
        scrollContainer.style.flexGrow = '1' ;

        // Display all configurations
        for (let i = 0; i < this.configs_.length; i++) {
            const config = this.configs_[i] ;
            const div = document.createElement('div') ;
            div.style.cursor = 'pointer' ;
            div.style.padding = '10px' ;
            div.style.marginBottom = '5px' ;
            div.style.borderRadius = '3px' ;
            div.style.display = 'flex' ;
            div.style.justifyContent = 'space-between' ;
            div.style.alignItems = 'center' ;

            // Config name
            const nameSpan = document.createElement('span') ;
            nameSpan.innerText = config.name ;
            div.appendChild(nameSpan) ;

            // Action buttons container
            const actions = document.createElement('div') ;
            actions.style.display = 'flex' ;
            actions.style.gap = '5px' ;

            // Edit button
            const editBtn = document.createElement('span') ;
            editBtn.innerHTML = '✏️' ;
            editBtn.style.cursor = 'pointer' ;
            editBtn.style.fontSize = '14px' ;
            editBtn.title = 'Edit configuration' ;
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation() ;
                this.editConfig(i) ;
            }) ;
            actions.appendChild(editBtn) ;

            // Delete button
            const deleteBtn = document.createElement('span') ;
            deleteBtn.innerHTML = '🗑️' ;
            deleteBtn.style.cursor = 'pointer' ;
            deleteBtn.style.fontSize = '14px' ;
            deleteBtn.title = 'Delete configuration' ;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation() ;
                this.deleteConfig(i) ;
            }) ;
            actions.appendChild(deleteBtn) ;

            div.appendChild(actions) ;

            // Apply selection styling
            if (i === this.selected_config_index_) {
                div.style.backgroundColor = '#007acc' ;
                div.style.color = 'white' ;
            } else {
                div.style.backgroundColor = '#f0f0f0' ;
                div.style.color = '' ;
            }

            // Add hover effects for non-selected items
            if (i !== this.selected_config_index_) {
                div.addEventListener('mouseenter', () => {
                    if (i !== this.selected_config_index_) {
                        div.style.backgroundColor = '#e0e0e0' ;
                    }
                }) ;
                div.addEventListener('mouseleave', () => {
                    if (i !== this.selected_config_index_) {
                        div.style.backgroundColor = '#f0f0f0' ;
                    }
                }) ;
            }

            // Add click handler to select the config
            div.addEventListener('click', () => this.selectConfig(i)) ;

            scrollContainer.appendChild(div) ;
        }

        this.config_list_div_.appendChild(scrollContainer) ;
    }

    private selectConfig(index: number): void {
        this.selected_config_index_ = index ;
        this.displayConfigs() ;
        
        // Request picklist data for this configuration
        if (index >= 0 && index < this.configs_.length) {
            this.request('get-picklist-data', this.configs_[index].name) ;
        }
    }

    private addConfig(): void {
        const newConfig: IPCPickListConfig = {
            name: 'New Pick List',
            teams: this.teams_.map(t => t.number),
            columns: [],
            notes: []
        } ;

        this.dialog_ = new PickListConfigDialog(newConfig, this.datasets_, this.teamflds_, this.matchflds_, this.formulas_, true) ;
        this.dialog_.on('closed', (result: boolean) => {
            if (result && this.dialog_) {
                this.configs_.push(this.dialog_.config) ;
                this.request('save-picklist-config', this.configs_) ;
                this.displayConfigs() ;
            }
            this.dialog_ = undefined ;
        }) ;
        this.dialog_.showCentered(this.elem) ;
    }

    private editConfig(index: number): void {
        if (index < 0 || index >= this.configs_.length) return ;

        const config = this.configs_[index] ;
        this.dialog_ = new PickListConfigDialog(config, this.datasets_, this.teamflds_, this.matchflds_, this.formulas_, false) ;
        this.dialog_.on('closed', (result: boolean) => {
            if (result && this.dialog_) {
                this.request('save-picklist-config', this.configs_) ;
                this.displayConfigs() ;
            }
            this.dialog_ = undefined ;
        }) ;
        this.dialog_.showCentered(this.elem) ;
    }

    private deleteConfig(index: number): void {
        if (index < 0 || index >= this.configs_.length) return ;

        const config = this.configs_[index] ;
        if (confirm(`Are you sure you want to delete the pick list "${config.name}"?`)) {
            this.request('delete-picklist-config', config.name) ;
            this.configs_.splice(index, 1) ;
            
            if (this.selected_config_index_ === index) {
                this.selected_config_index_ = -1 ;
                this.clearTable() ;
            } else if (this.selected_config_index_ > index) {
                this.selected_config_index_-- ;
            }
            
            this.displayConfigs() ;
        }
    }

    private renderTable(data: IPCPickListData): void {
        this.table_container_.innerHTML = '' ;

        if (!data || !data.config || !data.config.teams || data.config.teams.length === 0) {
            const noData = document.createElement('p') ;
            noData.innerText = 'No teams in this pick list.' ;
            noData.style.color = '#666' ;
            noData.style.textAlign = 'center' ;
            noData.style.marginTop = '50px' ;
            this.table_container_.appendChild(noData) ;
            return ;
        }

        // Build column definitions
        const columns: ColumnDefinition[] = [
            {
                title: 'Position',
                field: 'position',
                width: 80,
                hozAlign: 'center',
                frozen: true
            },
            {
                title: 'Team',
                field: 'teamNumber',
                width: 100,
                hozAlign: 'center',
                frozen: true
            },
            {
                title: 'Nickname',
                field: 'nickname',
                width: 200,
                frozen: true
            }
        ] ;

        // Add columns from config
        for (let i = 0; i < data.config.columns.length; i++) {
            const col = data.config.columns[i] ;
            columns.push({
                title: col.label,
                field: `col_${i}`,
                width: 150
            }) ;
        }

        // Add notes column
        columns.push({
            title: 'Notes',
            field: 'notes',
            width: 250,
            editor: 'input',
            cellEdited: (cell: any) => {
                this.onNotesEdited(cell) ;
            }
        }) ;

        // Build table data - iterate through config.teams to maintain order
        const tableData: any[] = [] ;
        for (let i = 0; i < data.config.teams.length; i++) {
            const teamNumber = data.config.teams[i] ;
            const team = this.teams_.find(t => t.number === teamNumber) ;
            
            // Find the data for this team
            const teamData = data.data.find(td => td.team === teamNumber) ;
            
            const row: any = {
                position: i + 1,
                teamNumber: teamNumber,
                nickname: team ? team.nickname : '',
                notes: (data.config.notes && data.config.notes[i]) ? data.config.notes[i] : '',
                _teamIndex: i
            } ;

            // Add column values if team data exists
            if (teamData) {
                for (let j = 0; j < teamData.values.length && j < data.config.columns.length; j++) {
                    const value = teamData.values[j] ;
                    let displayValue = '' ;
                    if (value && value.value !== null && value.value !== undefined) {
                        displayValue = String(value.value) ;
                    }
                    row[`col_${j}`] = displayValue ;
                }
            } else {
                // No data for this team - fill with empty values
                for (let j = 0; j < data.config.columns.length; j++) {
                    row[`col_${j}`] = '' ;
                }
            }

            tableData.push(row) ;
        }

        // Create tabulator table
        this.table_ = new Tabulator(this.table_container_, {
            data: tableData,
            columns: columns,
            layout: 'fitData',
            height: '100%',
            movableRows: true,
            rowFormatter: (row: RowComponent) => {
                // Add alternating row colors
                const data = row.getData() ;
                const position = data.position as number ;
                if (position % 2 === 0) {
                    row.getElement().style.backgroundColor = '#f9f9f9' ;
                }
            }
        }) ;

        // Handle row reordering
        this.table_.on('rowMoved', () => {
            this.updatePositionsAfterMove() ;
        }) ;
    }

    private onNotesEdited(cell: any): void {
        if (!this.table_ || this.selected_config_index_ < 0) return ;

        const rowData = cell.getRow().getData() ;
        const teamIndex = rowData._teamIndex as number ;
        const newNotes = cell.getValue() ;

        // Update the notes array
        if (!this.configs_[this.selected_config_index_].notes) {
            this.configs_[this.selected_config_index_].notes = [] ;
        }
        
        // Ensure notes array is the right length
        while (this.configs_[this.selected_config_index_].notes.length <= teamIndex) {
            this.configs_[this.selected_config_index_].notes.push('') ;
        }
        
        this.configs_[this.selected_config_index_].notes[teamIndex] = newNotes ;

        // Save to backend
        this.request('save-picklist-config', this.configs_) ;
    }

    private updatePositionsAfterMove(): void {
        if (!this.table_) return ;

        const rows = this.table_.getRows() ;
        const newTeamOrder: number[] = [] ;
        const newNotes: string[] = [] ;

        // Update positions and collect new team order and notes
        rows.forEach((row, index) => {
            row.update({ position: index + 1, _teamIndex: index }) ;
            const rowData = row.getData() ;
            const teamNumber = rowData.teamNumber ;
            const notes = rowData.notes || '' ;
            newTeamOrder.push(teamNumber) ;
            newNotes.push(notes) ;
        }) ;

        // Update the config with new team order and notes
        if (this.selected_config_index_ >= 0 && this.selected_config_index_ < this.configs_.length) {
            this.configs_[this.selected_config_index_].teams = newTeamOrder ;
            this.configs_[this.selected_config_index_].notes = newNotes ;
            // Save to backend
            this.request('save-picklist-config', this.configs_) ;
        }
    }

    private clearTable(): void {
        this.table_container_.innerHTML = '' ;
        const msg = document.createElement('p') ;
        msg.innerText = 'Select a pick list to view teams.' ;
        msg.style.color = '#999' ;
        msg.style.textAlign = 'center' ;
        msg.style.marginTop = '50px' ;
        this.table_container_.appendChild(msg) ;
    }
} 