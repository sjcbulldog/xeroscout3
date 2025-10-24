import { XeroApp } from "../../apps/xeroapp.js";
import { DataValue } from "../../shared/datavalue.js";
import { IPCPickListConfig, IPCTeamInfo, IPCPickListData, IPCDataSet, IPCColumnDesc, IPCFormula, IPCPickListTeamData, IPCDataItem } from "../../shared/ipc.js";
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
        this.table_container_.style.border = '1px solid #dee2e6' ;
        this.table_container_.style.borderRadius = '4px' ;
        this.table_container_.style.backgroundColor = '#fff' ;
        this.table_container_.style.overflow = 'hidden' ;
        this.table_container_.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)' ;
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

        const isCoach = this.app.appType === 'coach' ;

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

        // Buttons container - only show for non-coach users
        if (!isCoach) {
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
        }

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

            // Action buttons container - only show for non-coach users
            if (!isCoach) {
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
            }

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

                if (index === this.selected_config_index_) {
                    // Refresh table if edited config is currently selected
                    this.request('get-picklist-data', this.configs_[index].name) ;
                }
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
                width: data.config.positionWidth || 80,
                hozAlign: 'center',
                frozen: true,
                headerSort: false,
                resizable: true,
                cssClass: 'picklist-position-column'
            },
            {
                title: 'Team',
                field: 'teamNumber',
                width: data.config.teamWidth || 100,
                hozAlign: 'center',
                frozen: true,
                headerSort: false,
                resizable: true,
                cssClass: 'picklist-team-column'
            },
            {
                title: 'Nickname',
                field: 'nickname',
                width: data.config.nicknameWidth || 200,
                frozen: true,
                headerSort: false,
                resizable: true,
                cssClass: 'picklist-nickname-column'
            }
        ] ;

        // Add columns from config
        for (let i = 0; i < data.config.columns.length; i++) {
            const col = data.config.columns[i] ;
            columns.push({
                title: col.label,
                field: `col_${i}`,
                width: col.width || 150,
                headerSort: false,
                hozAlign: 'center',
                resizable: true,
                headerMenu: undefined as any // Allow moving this column
            }) ;
        }

        // Add notes column
        columns.push({
            title: 'Notes',
            field: 'notes',
            width: data.config.notesWidth || 250,
            editor: 'input',
            headerSort: false,
            resizable: true,
            frozen: true, // Keep notes column frozen on the right
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
                    const column = data.config.columns[j] ;
                    let displayValue = '' ;
                    if (value && value.value !== null && value.value !== undefined) {
                        // Format numbers with specified decimal places
                        if (value.type === 'real') {
                            const decimals = column.decimals !== undefined ? column.decimals : 2 ;
                            displayValue = DataValue.toReal(value).toFixed(decimals) ;
                        } else {
                            displayValue = DataValue.toDisplayString(value) ;
                        }
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
            movableColumns: true, // Enable column reordering
            selectableRows: false, // Disable row selection
            headerSort: false, // Disable column sorting to maintain custom order
            rowFormatter: (row: RowComponent) => {
                const rowElement = row.getElement() ;
                const data = row.getData() ;
                const position = data.position as number ;
                
                // Modern alternating row colors with better contrast
                if (position % 2 === 0) {
                    rowElement.style.backgroundColor = '#f8f9fa' ;
                } else {
                    rowElement.style.backgroundColor = '#ffffff' ;
                }
                
                // Add hover effect
                rowElement.style.transition = 'background-color 0.2s ease' ;
                
                rowElement.addEventListener('mouseenter', () => {
                    rowElement.style.backgroundColor = '#e3f2fd' ;
                }) ;
                
                rowElement.addEventListener('mouseleave', () => {
                    if (position % 2 === 0) {
                        rowElement.style.backgroundColor = '#f8f9fa' ;
                    } else {
                        rowElement.style.backgroundColor = '#ffffff' ;
                    }
                }) ;
            }
        }) ;

        // Handle row reordering
        this.table_.on('rowMoved', () => {
            this.updatePositionsAfterMove() ;
        }) ;

        // Handle column reordering
        this.table_.on('columnMoved', (column: any, columns: any[]) => {
            this.onColumnMoved(columns) ;
        }) ;

        // Handle column resizing
        this.table_.on('columnResized', (column: any) => {
            this.onColumnResized(column) ;
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

    private onColumnResized(column: any): void {
        if (this.selected_config_index_ < 0 || !this.configs_[this.selected_config_index_]) return ;

        const field = column.getField() ;
        const width = column.getWidth() ;

        // Check for fixed columns
        if (field === 'position') {
            this.configs_[this.selected_config_index_].positionWidth = width ;
            this.request('save-picklist-config', this.configs_) ;
        } else if (field === 'teamNumber') {
            this.configs_[this.selected_config_index_].teamWidth = width ;
            this.request('save-picklist-config', this.configs_) ;
        } else if (field === 'nickname') {
            this.configs_[this.selected_config_index_].nicknameWidth = width ;
            this.request('save-picklist-config', this.configs_) ;
        } else if (field === 'notes') {
            this.configs_[this.selected_config_index_].notesWidth = width ;
            this.request('save-picklist-config', this.configs_) ;
        } else {
            // Check if this is a data column (col_0, col_1, etc.)
            const match = field.match(/^col_(\d+)$/) ;
            if (match) {
                const colIndex = parseInt(match[1]) ;
                if (colIndex >= 0 && colIndex < this.configs_[this.selected_config_index_].columns.length) {
                    this.configs_[this.selected_config_index_].columns[colIndex].width = width ;
                    // Save to backend
                    this.request('save-picklist-config', this.configs_) ;
                }
            }
        }
    }

    private onColumnMoved(columns: any[]): void {
        if (this.selected_config_index_ < 0 || !this.configs_[this.selected_config_index_]) return ;

        // Get the current column order from Tabulator
        // We need to extract only the data columns (col_0, col_1, etc.) and determine their new order
        const dataColumnFields: string[] = [] ;
        
        for (const col of columns) {
            const field = col.getField() ;
            // Only process data columns (col_0, col_1, etc.), skip fixed columns
            if (field && field.startsWith('col_')) {
                dataColumnFields.push(field) ;
            }
        }

        // Create a mapping from old column field names to their original indices
        const oldIndexMap = new Map<string, number>() ;
        for (let i = 0; i < this.configs_[this.selected_config_index_].columns.length; i++) {
            oldIndexMap.set(`col_${i}`, i) ;
        }

        // Build the new column order based on the field order
        const newColumns: IPCDataItem[] = [] ;
        for (const field of dataColumnFields) {
            const oldIndex = oldIndexMap.get(field) ;
            if (oldIndex !== undefined && oldIndex < this.configs_[this.selected_config_index_].columns.length) {
                newColumns.push(this.configs_[this.selected_config_index_].columns[oldIndex]) ;
            }
        }

        // Update the config with the new column order
        if (newColumns.length > 0) {
            this.configs_[this.selected_config_index_].columns = newColumns ;
            // Save to backend
            this.request('save-picklist-config', this.configs_) ;
            
            // Refresh the table to update field names to match new indices
            this.request('get-picklist-data', { name: this.configs_[this.selected_config_index_].name }) ;
        }
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