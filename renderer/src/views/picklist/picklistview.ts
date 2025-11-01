import { XeroApp } from "../../apps/xeroapp.js";
import { DataValue } from "../../shared/datavalue.js";
import { IPCPickListConfig, IPCTeamInfo, IPCPickListData, IPCDataSet, IPCColumnDesc, IPCFormula, IPCPickListTeamData, IPCDataItem } from "../../shared/ipc.js";
import { XeroView } from "../xeroview.js";
import { PickListConfigDialog } from "./picklistconfigdialog.js";
import { TabulatorFull as Tabulator, ColumnDefinition, RowComponent, CellComponent, ColumnComponent } from 'tabulator-tables';

export class PickListView extends XeroView {
    private static readonly ROW_COLOR_FIELD = '__row__' ;
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

    private colorPaletteEl_: HTMLDivElement | null = null ;
    private paletteDocumentListener_: ((event: MouseEvent) => void) | null = null ;
    private paletteKeyListener_: ((event: KeyboardEvent) => void) | null = null ;
    private readonly colorOptions_: string[] = [
        '#ffffff',
        '#f28b82', '#fbbc04', '#fff475', '#ccff90', '#a7ffeb',
        '#cbf0f8', '#aecbfa', '#d7aefb', '#fdcfe8', '#e6c9a8', '#e8eaed'
    ] ;
    private headerMenuEl_: HTMLDivElement | null = null ;
    private headerMenuDocumentListener_: ((event: MouseEvent) => void) | null = null ;
    private headerMenuKeyListener_: ((event: KeyboardEvent) => void) | null = null ;

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
        this.right_panel_.style.minWidth = '0' ;
        this.right_panel_.style.padding = '10px' ;
        this.right_panel_.style.display = 'flex' ;
        this.right_panel_.style.flexDirection = 'column' ;
        this.right_panel_.style.overflow = 'hidden' ;

        // Configuration list container
        this.config_list_div_ = document.createElement('div') ;
        this.config_list_div_.style.flexGrow = '1' ;
        this.config_list_div_.style.overflowY = 'auto' ;
        this.left_panel_.appendChild(this.config_list_div_) ;

        // Table container
        this.table_container_ = document.createElement('div') ;
        this.table_container_.style.flexGrow = '1' ;
        this.table_container_.style.minWidth = '0' ;
        this.table_container_.style.border = '1px solid #dee2e6' ;
        this.table_container_.style.borderRadius = '4px' ;
        this.table_container_.style.backgroundColor = '#fff' ;
        this.table_container_.style.overflowX = 'auto' ;
        this.table_container_.style.overflowY = 'hidden' ;
        this.table_container_.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)' ;
        this.table_container_.addEventListener('scroll', () => {
            this.hideColorPalette() ;
            this.hideHeaderMenu() ;
        }) ;
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
        this.configs_ = configs || [] ;
        this.configs_.forEach(config => this.ensureConfigDefaults(config)) ;
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
        console.log('[PickListView] received picklist data', {
            name: data?.config?.name,
            columns: data?.config?.columns?.length,
            teams: data?.config?.teams?.length,
            dataRows: data?.data?.length
        }) ;
        try {
            this.ensureConfigDefaults(data.config) ;
            this.renderTable(data) ;
        } catch (err) {
            console.error('[PickListView] failed to render picklist', err) ;
            this.table_container_.innerHTML = '' ;
            const msg = document.createElement('p') ;
            msg.innerText = 'Error rendering pick list. Check console for details.' ;
            msg.style.color = '#c00' ;
            msg.style.textAlign = 'center' ;
            msg.style.marginTop = '50px' ;
            this.table_container_.appendChild(msg) ;
            throw err ;
        }
    }

    private ensureConfigDefaults(config: IPCPickListConfig): void {
        if (!config.notes) {
            config.notes = [] ;
        }
        if (!config.cellColors) {
            config.cellColors = {} ;
        }
        if (!config.columnGradients) {
            config.columnGradients = {} ;
        }
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

        // Buttons container - show add button for all users
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

            // Action buttons container - only show if owner matches current app type
            const canModify = config.owner === this.app.appType ;
            if (canModify) {
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
            div.addEventListener('click', () => {
                console.log('[PickListView] selecting config', this.configs_[i]?.name) ;
                this.selectConfig(i) ;
            }) ;

            scrollContainer.appendChild(div) ;
        }

        this.config_list_div_.appendChild(scrollContainer) ;
    }

    private selectConfig(index: number): void {
        this.hideColorPalette() ;
        this.hideHeaderMenu() ;
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
            notes: [],
            owner: this.app.appType,
            cellColors: {},
            columnGradients: {}
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
        console.log('[PickListView] rendering table', {
            name: data?.config?.name,
            columns: data?.config?.columns?.length,
            teams: data?.config?.teams?.length
        }) ;
        this.table_container_.innerHTML = '' ;
        this.hideColorPalette() ;
        this.hideHeaderMenu() ;

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
                headerSort: true,
                resizable: true,
                cssClass: 'picklist-position-column'
            },
            {
                title: 'Team',
                field: 'teamNumber',
                width: data.config.teamWidth || 100,
                hozAlign: 'center',
                frozen: true,
                headerSort: true,
                resizable: true,
                cssClass: 'picklist-team-column'
            },
            {
                title: 'Nickname',
                field: 'nickname',
                width: data.config.nicknameWidth || 200,
                frozen: true,
                headerSort: true,
                resizable: true,
                cssClass: 'picklist-nickname-column'
            }
        ] ;

        const dataColumnFieldKeys: string[] = [] ;

        // Add columns from config
        for (let i = 0; i < data.config.columns.length; i++) {
            const col = data.config.columns[i] ;
            const fieldKey = this.createColumnFieldKey(col) ;
            dataColumnFieldKeys.push(fieldKey) ;
            columns.push({
                title: col.label,
                field: fieldKey,
                width: col.width || 150,
                headerSort: true,
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
            headerSort: true,
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
                    const fieldKey = dataColumnFieldKeys[j] ;
                    if (fieldKey) {
                        row[fieldKey] = displayValue ;
                    }
                }
            } else {
                // No data for this team - fill with empty values
                for (let j = 0; j < data.config.columns.length; j++) {
                    const fieldKey = dataColumnFieldKeys[j] ;
                    if (fieldKey) {
                        row[fieldKey] = '' ;
                    }
                }
            }

            tableData.push(row) ;
        }

        // Create tabulator table
        const tableOptions: any = {
            data: tableData,
            columns: columns,
            layout: 'fitDataTable',
            height: '100%',
            movableRows: true,
            movableColumns: true, // Enable column reordering
            selectableRows: false, // Disable row selection
            headerSort: true, // Disable column sorting to maintain custom order
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

                this.applyStoredColorsToRow(row) ;
            }
        } ;

        this.table_ = new Tabulator(this.table_container_, tableOptions) ;

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

        this.table_.on('cellContext', (event: UIEvent, cell: CellComponent) => {
            this.showColorPalette(event, cell) ;
        }) ;

        this.table_.on('headerContext', (event: UIEvent, column: ColumnComponent) => {
            this.showHeaderContextMenu(event, column) ;
        }) ;

        this.applySavedGradients() ;
    }

    private ensurePaletteElement(): HTMLDivElement {
        if (!this.colorPaletteEl_) {
            this.colorPaletteEl_ = document.createElement('div') ;
            this.colorPaletteEl_.style.position = 'fixed' ;
            this.colorPaletteEl_.style.zIndex = '3000' ;
            this.colorPaletteEl_.style.backgroundColor = '#ffffff' ;
            this.colorPaletteEl_.style.border = '1px solid rgba(0,0,0,0.15)' ;
            this.colorPaletteEl_.style.borderRadius = '6px' ;
            this.colorPaletteEl_.style.boxShadow = '0 8px 20px rgba(0,0,0,0.18)' ;
            this.colorPaletteEl_.style.padding = '8px' ;
            this.colorPaletteEl_.style.display = 'none' ;
            this.colorPaletteEl_.style.gridTemplateColumns = 'repeat(6, 24px)' ;
            this.colorPaletteEl_.style.gap = '6px' ;
        }

        if (this.colorPaletteEl_ && !document.body.contains(this.colorPaletteEl_)) {
            document.body.appendChild(this.colorPaletteEl_) ;
        }

        return this.colorPaletteEl_! ;
    }

    private showColorPalette(event: UIEvent, cell: CellComponent): void {
        const mouseEvent = event as MouseEvent ;
        mouseEvent.preventDefault() ;
        mouseEvent.stopPropagation() ;

        if (this.selected_config_index_ < 0) {
            return ;
        }

        this.hideHeaderMenu() ;

        const palette = this.ensurePaletteElement() ;
        this.hideColorPalette() ;

        palette.innerHTML = '' ;
        palette.style.display = 'grid' ;
        palette.style.visibility = 'hidden' ;
        palette.style.pointerEvents = 'none' ;

        const currentColor = this.getStoredCellColor(cell) ;

        this.colorOptions_.forEach(color => {
            const swatch = document.createElement('button') ;
            swatch.type = 'button' ;
            swatch.style.width = '24px' ;
            swatch.style.height = '24px' ;
            swatch.style.borderRadius = '4px' ;
            swatch.style.border = '1px solid rgba(0,0,0,0.25)' ;
            swatch.style.padding = '0' ;
            swatch.style.margin = '0' ;
            swatch.style.cursor = 'pointer' ;
            swatch.style.backgroundColor = color ;
            swatch.title = color === '#ffffff' ? 'White' : color ;

            if (currentColor && currentColor.toLowerCase() === color.toLowerCase()) {
                swatch.style.outline = '2px solid #1a73e8' ;
            } else {
                swatch.style.outline = 'none' ;
            }

            swatch.addEventListener('click', (e) => {
                e.stopPropagation() ;
                this.applyCellColor(cell, color) ;
                this.hideColorPalette() ;
            }) ;

            palette.appendChild(swatch) ;
        }) ;

        const clearButton = document.createElement('button') ;
        clearButton.type = 'button' ;
        clearButton.innerText = 'Clear color' ;
        clearButton.style.gridColumn = 'span 6' ;
        clearButton.style.marginTop = '4px' ;
        clearButton.style.padding = '4px 6px' ;
        clearButton.style.fontSize = '12px' ;
        clearButton.style.border = '1px solid rgba(0,0,0,0.2)' ;
        clearButton.style.borderRadius = '4px' ;
        clearButton.style.cursor = 'pointer' ;
        clearButton.style.backgroundColor = '#f5f5f5' ;
        if (!currentColor) {
            clearButton.style.backgroundColor = '#e8f0fe' ;
            clearButton.style.borderColor = '#1a73e8' ;
        }
        clearButton.addEventListener('click', (e) => {
            e.stopPropagation() ;
            this.applyCellColor(cell, '') ;
            this.hideColorPalette() ;
        }) ;

        palette.appendChild(clearButton) ;

        const paletteRect = palette.getBoundingClientRect() ;
        const estimatedWidth = paletteRect.width || 200 ;
        const estimatedHeight = paletteRect.height || 140 ;
        const margin = 8 ;
        let left = mouseEvent.clientX ;
        let top = mouseEvent.clientY ;

        if (left + estimatedWidth > window.innerWidth - margin) {
            left = window.innerWidth - estimatedWidth - margin ;
        }
        if (top + estimatedHeight > window.innerHeight - margin) {
            top = window.innerHeight - estimatedHeight - margin ;
        }

        palette.style.left = `${Math.max(margin, left)}px` ;
        palette.style.top = `${Math.max(margin, top)}px` ;
        palette.style.visibility = 'visible' ;
        palette.style.pointerEvents = 'auto' ;

        this.paletteDocumentListener_ = (e: MouseEvent) => {
            const target = e.target as Node | null ;
            if (this.colorPaletteEl_ && target && !this.colorPaletteEl_.contains(target)) {
                this.hideColorPalette() ;
            }
        } ;
        document.addEventListener('mousedown', this.paletteDocumentListener_) ;

        this.paletteKeyListener_ = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this.hideColorPalette() ;
            }
        } ;
        document.addEventListener('keydown', this.paletteKeyListener_, true) ;
    }

    private hideColorPalette(): void {
        if (this.colorPaletteEl_) {
            this.colorPaletteEl_.style.display = 'none' ;
            this.colorPaletteEl_.style.visibility = 'hidden' ;
            this.colorPaletteEl_.style.pointerEvents = 'none' ;
        }

        if (this.paletteDocumentListener_) {
            document.removeEventListener('mousedown', this.paletteDocumentListener_) ;
            this.paletteDocumentListener_ = null ;
        }

        if (this.paletteKeyListener_) {
            document.removeEventListener('keydown', this.paletteKeyListener_, true) ;
            this.paletteKeyListener_ = null ;
        }

    }

    private ensureHeaderMenuElement(): HTMLDivElement {
        if (!this.headerMenuEl_) {
            this.headerMenuEl_ = document.createElement('div') ;
            this.headerMenuEl_.style.position = 'fixed' ;
            this.headerMenuEl_.style.zIndex = '3000' ;
            this.headerMenuEl_.style.display = 'none' ;
            this.headerMenuEl_.style.flexDirection = 'column' ;
            this.headerMenuEl_.style.minWidth = '220px' ;
            this.headerMenuEl_.style.backgroundColor = '#ffffff' ;
            this.headerMenuEl_.style.border = '1px solid rgba(0,0,0,0.15)' ;
            this.headerMenuEl_.style.borderRadius = '6px' ;
            this.headerMenuEl_.style.boxShadow = '0 8px 20px rgba(0,0,0,0.18)' ;
            this.headerMenuEl_.style.padding = '6px' ;
        }

        if (this.headerMenuEl_ && !document.body.contains(this.headerMenuEl_)) {
            document.body.appendChild(this.headerMenuEl_) ;
        }

        return this.headerMenuEl_! ;
    }

    private showHeaderContextMenu(event: UIEvent, column: ColumnComponent): void {
        const mouseEvent = event as MouseEvent ;
        mouseEvent.preventDefault() ;
        mouseEvent.stopPropagation() ;

        const field = column.getField() ;
        if (!field) {
            return ;
        }

        this.hideColorPalette() ;
        this.hideHeaderMenu() ;

        const menu = this.ensureHeaderMenuElement() ;
        menu.innerHTML = '' ;
        menu.style.display = 'flex' ;
        menu.style.visibility = 'hidden' ;
        menu.style.pointerEvents = 'none' ;

        const applyButton = document.createElement('button') ;
        applyButton.type = 'button' ;
        applyButton.innerText = 'Apply red → green gradient' ;
        applyButton.style.padding = '6px 8px' ;
        applyButton.style.margin = '2px 0' ;
        applyButton.style.border = '1px solid rgba(0,0,0,0.2)' ;
        applyButton.style.borderRadius = '4px' ;
        applyButton.style.cursor = 'pointer' ;
        applyButton.style.backgroundColor = '#f5f5f5' ;
        applyButton.addEventListener('click', (e) => {
            e.stopPropagation() ;
            this.applyGradientToColumn(field, { save: true, silent: false }) ;
            this.hideHeaderMenu() ;
        }) ;
        menu.appendChild(applyButton) ;

        const clearButton = document.createElement('button') ;
        clearButton.type = 'button' ;
        clearButton.innerText = 'Clear conditional formatting' ;
        clearButton.style.padding = '6px 8px' ;
        clearButton.style.margin = '4px 0 2px 0' ;
        clearButton.style.border = '1px solid rgba(0,0,0,0.2)' ;
        clearButton.style.borderRadius = '4px' ;
        clearButton.style.cursor = 'pointer' ;
        clearButton.style.backgroundColor = '#f5f5f5' ;

        const config = this.selected_config_index_ >= 0 ? this.configs_[this.selected_config_index_] : undefined ;
        const hasGradient = !!(config && config.columnGradients && config.columnGradients[field]) ;
        clearButton.disabled = !hasGradient ;
        clearButton.style.opacity = clearButton.disabled ? '0.6' : '1' ;

        clearButton.addEventListener('click', (e) => {
            e.stopPropagation() ;
            this.clearGradientForColumn(field, { save: true }) ;
            this.hideHeaderMenu() ;
        }) ;
        menu.appendChild(clearButton) ;

        const margin = 8 ;
        const estimatedSize = menu.getBoundingClientRect() ;
        const estimatedWidth = estimatedSize.width || 220 ;
        const estimatedHeight = estimatedSize.height || 90 ;
        let left = mouseEvent.clientX ;
        let top = mouseEvent.clientY ;

        if (left + estimatedWidth > window.innerWidth - margin) {
            left = window.innerWidth - estimatedWidth - margin ;
        }
        if (top + estimatedHeight > window.innerHeight - margin) {
            top = window.innerHeight - estimatedHeight - margin ;
        }

        menu.style.left = `${Math.max(margin, left)}px` ;
        menu.style.top = `${Math.max(margin, top)}px` ;
        menu.style.visibility = 'visible' ;
        menu.style.pointerEvents = 'auto' ;


        this.headerMenuDocumentListener_ = (e: MouseEvent) => {
            const target = e.target as Node | null ;
            if (this.headerMenuEl_ && target && !this.headerMenuEl_.contains(target)) {
                this.hideHeaderMenu() ;
            }
        } ;
        document.addEventListener('mousedown', this.headerMenuDocumentListener_) ;

        this.headerMenuKeyListener_ = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this.hideHeaderMenu() ;
            }
        } ;
        document.addEventListener('keydown', this.headerMenuKeyListener_, true) ;
    }

    private hideHeaderMenu(): void {
        if (this.headerMenuEl_) {
            this.headerMenuEl_.style.display = 'none' ;
            this.headerMenuEl_.style.visibility = 'hidden' ;
            this.headerMenuEl_.style.pointerEvents = 'none' ;
        }

        if (this.headerMenuDocumentListener_) {
            document.removeEventListener('mousedown', this.headerMenuDocumentListener_) ;
            this.headerMenuDocumentListener_ = null ;
        }

        if (this.headerMenuKeyListener_) {
            document.removeEventListener('keydown', this.headerMenuKeyListener_, true) ;
            this.headerMenuKeyListener_ = null ;
        }

    }

    private getStoredCellColor(cell: CellComponent): string {
        if (this.selected_config_index_ < 0) {
            return '' ;
        }

        const config = this.configs_[this.selected_config_index_] ;
        if (!config || !config.cellColors) {
            return '' ;
        }

        const field = cell.getField() ;
        const rowData = cell.getRow().getData() ;
        const teamNumber = rowData.teamNumber as number | undefined ;

        if (teamNumber === undefined || teamNumber === null) {
            return '' ;
        }

        const fieldColors = config.cellColors[field] ;
        if (!fieldColors) {
            return '' ;
        }

        return fieldColors[teamNumber] || '' ;
    }

    private applyCellColor(cell: CellComponent, color: string): void {
        if (this.selected_config_index_ < 0) {
            return ;
        }

        const config = this.configs_[this.selected_config_index_] ;
        if (!config.cellColors) {
            config.cellColors = {} ;
        }

        const field = cell.getField() ;
        const rowData = cell.getRow().getData() ;
        const teamNumber = rowData.teamNumber as number | undefined ;

        if (teamNumber === undefined || teamNumber === null) {
            return ;
        }

        if (field === 'position') {
            const rowField = PickListView.ROW_COLOR_FIELD ;
            if (!config.cellColors[rowField]) {
                config.cellColors[rowField] = {} ;
            }
            if (color) {
                config.cellColors[rowField]![teamNumber] = color ;
            } else if (config.cellColors[rowField]) {
                delete config.cellColors[rowField]![teamNumber] ;
                if (Object.keys(config.cellColors[rowField]!).length === 0) {
                    delete config.cellColors[rowField] ;
                }
            }
        }

        if (!config.cellColors[field]) {
            config.cellColors[field] = {} ;
        }

        if (color) {
            config.cellColors[field]![teamNumber] = color ;
        } else if (config.cellColors[field]) {
            delete config.cellColors[field]![teamNumber] ;
            if (Object.keys(config.cellColors[field]!).length === 0) {
                delete config.cellColors[field] ;
            }
        }

        this.applyStoredColorsToRow(cell.getRow()) ;

        this.request('save-picklist-config', this.configs_) ;
    }

    private applyStoredColorsToRow(row: RowComponent): void {
        if (this.selected_config_index_ < 0) {
            return ;
        }

        const config = this.configs_[this.selected_config_index_] ;
        if (!config.cellColors) {
            return ;
        }

        const rowData = row.getData() ;
        const teamNumber = rowData.teamNumber as number | undefined ;
        if (teamNumber === undefined || teamNumber === null) {
            return ;
        }

        const rowFieldColors = config.cellColors[PickListView.ROW_COLOR_FIELD] ;
        const rowBaseColor = rowFieldColors ? rowFieldColors[teamNumber] : '' ;

        row.getCells().forEach((cell) => {
            const field = cell.getField() ;
            const fieldColors = config.cellColors![field] ;
            const cellSpecificColor = fieldColors ? fieldColors[teamNumber] : '' ;
            const color = cellSpecificColor || rowBaseColor || '' ;
            const element = cell.getElement() ;
            if (color) {
                element.style.backgroundColor = color ;
            } else {
                element.style.backgroundColor = '' ;
            }
        }) ;
    }

    private createColumnFieldKey(column: IPCDataItem): string {
        const raw = `${column.dataset || 'default'}|${column.name || ''}|${column.label || ''}` ;
        let base = raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') ;
        if (!base) {
            base = 'column' ;
        }
        const hash = this.hashString(raw) ;
        return `data_${base}_${hash}` ;
    }

    private hashString(value: string): string {
        let hash = 0 ;
        for (let i = 0; i < value.length; i++) {
            hash = (hash << 5) - hash + value.charCodeAt(i) ;
            hash |= 0 ;
        }
        return Math.abs(hash).toString(36) ;
    }

    private applyGradientToColumn(field: string, options: { save: boolean ; silent?: boolean }): void {
        if (!this.table_ || this.selected_config_index_ < 0) {
            return ;
        }

        const silent = options.silent ?? false ;
        const config = this.configs_[this.selected_config_index_] ;
        const rows = this.table_.getRows() ;

        const numericEntries: Array<{ team: number ; value: number ; row: RowComponent }> = [] ;

        rows.forEach(row => {
            const data = row.getData() ;
            const teamNumber = data.teamNumber as number | undefined ;
            if (teamNumber === undefined || teamNumber === null) {
                return ;
            }
            const cell = row.getCell(field) ;
            if (!cell) {
                return ;
            }
            const rawValue = cell.getValue() ;
            let numericValue: number ;
            if (typeof rawValue === 'number') {
                numericValue = rawValue ;
            } else if (typeof rawValue === 'string') {
                numericValue = parseFloat(rawValue) ;
            } else {
                numericValue = Number(rawValue) ;
            }
            if (Number.isFinite(numericValue)) {
                numericEntries.push({ team: teamNumber, value: numericValue, row }) ;
            }
        }) ;

        if (numericEntries.length === 0) {
            delete config.columnGradients![field] ;
            if (!silent) {
                alert('No numeric values found in this column for conditional formatting.') ;
            }
            this.clearGradientForColumn(field, { save: options.save, silent: true }) ;
            return ;
        }

        numericEntries.sort((a, b) => a.value - b.value) ;
        const min = numericEntries[0].value ;
        const max = numericEntries[numericEntries.length - 1].value ;

        if (!config.cellColors) {
            config.cellColors = {} ;
        }
        config.cellColors[field] = {} ;

        const denominator = max - min ;
        numericEntries.forEach(entry => {
            let ratio = denominator === 0 ? 0.5 : (entry.value - min) / denominator ;
            ratio = Math.max(0, Math.min(1, ratio)) ;
            const color = this.interpolateColor('#f44336', '#4caf50', ratio) ;
            config.cellColors![field]![entry.team] = color ;
        }) ;

        config.columnGradients![field] = 'minmax' ;

        // Apply formatting to each row
        rows.forEach(row => this.applyStoredColorsToRow(row)) ;

        if (options.save) {
            this.request('save-picklist-config', this.configs_) ;
        }
    }

    private clearGradientForColumn(field: string, options: { save: boolean ; silent?: boolean }): void {
        if (this.selected_config_index_ < 0) {
            return ;
        }

        const config = this.configs_[this.selected_config_index_] ;
        if (config.cellColors && config.cellColors[field]) {
            delete config.cellColors[field] ;
        }
        if (config.columnGradients && config.columnGradients[field]) {
            delete config.columnGradients[field] ;
        }
        if (config.columnGradients && Object.keys(config.columnGradients).length === 0) {
            config.columnGradients = {} ;
        }

        if (this.table_) {
            this.table_.getRows().forEach(row => this.applyStoredColorsToRow(row)) ;
        }

        if (options.save) {
            this.request('save-picklist-config', this.configs_) ;
        }
    }

    private applySavedGradients(): void {
        if (!this.table_ || this.selected_config_index_ < 0) {
            return ;
        }

        const config = this.configs_[this.selected_config_index_] ;
        if (!config.columnGradients) {
            return ;
        }

        Object.keys(config.columnGradients).forEach(field => {
            this.applyGradientToColumn(field, { save: false, silent: true }) ;
        }) ;
    }

    private interpolateColor(startHex: string, endHex: string, ratio: number): string {
        const start = this.hexToRgb(startHex) ;
        const end = this.hexToRgb(endHex) ;
        const r = Math.round(start.r + (end.r - start.r) * ratio) ;
        const g = Math.round(start.g + (end.g - start.g) * ratio) ;
        const b = Math.round(start.b + (end.b - start.b) * ratio) ;
        return `#${this.componentToHex(r)}${this.componentToHex(g)}${this.componentToHex(b)}` ;
    }

    private hexToRgb(hex: string): { r: number ; g: number ; b: number } {
        const normalized = hex.replace('#', '') ;
        const bigint = parseInt(normalized, 16) ;
        const r = (bigint >> 16) & 255 ;
        const g = (bigint >> 8) & 255 ;
        const b = bigint & 255 ;
        return { r, g, b } ;
    }

    private componentToHex(component: number): string {
        const hex = component.toString(16) ;
        return hex.length === 1 ? `0${hex}` : hex ;
    }

    private findDataColumnIndex(field: string): number {
        if (this.selected_config_index_ < 0) {
            return -1 ;
        }

        const config = this.configs_[this.selected_config_index_] ;
        for (let i = 0; i < config.columns.length; i++) {
            if (this.createColumnFieldKey(config.columns[i]) === field) {
                return i ;
            }
        }

        return -1 ;
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
            const colIndex = this.findDataColumnIndex(field) ;
            if (colIndex >= 0 && colIndex < this.configs_[this.selected_config_index_].columns.length) {
                this.configs_[this.selected_config_index_].columns[colIndex].width = width ;
                this.request('save-picklist-config', this.configs_) ;
            }
        }
    }

    private onColumnMoved(columns: ColumnComponent[]): void {
        if (this.selected_config_index_ < 0) {
            return ;
        }

        const config = this.configs_[this.selected_config_index_] ;
        if (!config || !config.columns || config.columns.length === 0) {
            return ;
        }

        const fieldToColumn = new Map<string, IPCDataItem>() ;
        config.columns.forEach(col => fieldToColumn.set(this.createColumnFieldKey(col), col)) ;

        const newOrder: IPCDataItem[] = [] ;
        const seenFields = new Set<string>() ;

        columns.forEach(column => {
            const field = column.getField() ;
            const dataColumn = fieldToColumn.get(field) ;
            if (dataColumn && !seenFields.has(field)) {
                newOrder.push(dataColumn) ;
                seenFields.add(field) ;
            }
        }) ;

        // Preserve any columns Tabulator did not report (e.g., hidden)
        config.columns.forEach(col => {
            const field = this.createColumnFieldKey(col) ;
            if (!seenFields.has(field)) {
                newOrder.push(col) ;
            }
        }) ;

        if (newOrder.length === config.columns.length) {
            config.columns = newOrder ;
            this.request('save-picklist-config', this.configs_) ;
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
        this.hideColorPalette() ;
        this.hideHeaderMenu() ;
        this.table_container_.innerHTML = '' ;
        const msg = document.createElement('p') ;
        msg.innerText = 'Select a pick list to view teams.' ;
        msg.style.color = '#999' ;
        msg.style.textAlign = 'center' ;
        msg.style.marginTop = '50px' ;
        this.table_container_.appendChild(msg) ;
    }
} 
