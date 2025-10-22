import { XeroApp } from "../../apps/xeroapp.js";
import { XeroView } from "../xeroview.js";
import { IPCColumnDesc, IPCDataSet, IPCFormula, IPCGraphConfig, IPCGraphData, IPCDataItem, IPCMatchInfo, IPCTeamInfo } from "../../shared/ipc.js";
import { SingleTeamConfigDialog } from "./singleteamconfigdialog.js";
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
Chart.register(...registerables, ChartDataLabels);

export class SingleTeamView extends XeroView {
    private left_panel_!: HTMLDivElement ;
    private right_panel_!: HTMLDivElement ;
    private chart_container_!: HTMLDivElement ;
    private config_list_div_!: HTMLDivElement ;
    private team_list_div_!: HTMLDivElement ;
    private match_select_!: HTMLSelectElement ;
    private chart_instance_: Chart | null = null ;
    
    private dialog_: SingleTeamConfigDialog | undefined ;
    private configs_: IPCGraphConfig[] = [] ;
    private datasets_: IPCDataSet[] = [] ;
    private selected_config_index_: number = -1 ;
    private selected_teams_: Set<number> = new Set() ;
    private grouping_mode_: 'teams-within-items' | 'items-within-teams' = 'teams-within-items' ;
    private oldname_: string = '' ;
    private teamflds_: string[] = [] ;  
    private matchflds_ : string[] = [] ;
    private formulas_ : string[] = [] ;
    private teams_ : IPCTeamInfo[] = [] ;
    private matchdata_ : IPCMatchInfo[] = [] ;

    private teamfldsReceived_ : boolean = false ;
    private matchfldsReceived_ : boolean = false ;
    private formulasReceived_ : boolean = false ;    
    private datasetsReceived_ : boolean = false ;
    private teamsReceived_ : boolean = false ;
    private matchDataReceived_ : boolean = false ;
    private configsReceived_ : boolean = false ;

    constructor(app: XeroApp) {
        super(app, 'xero-single-team-view');

        // Set the view to fill its parent
        this.elem.style.width = '100%' ;
        this.elem.style.height = '100%' ;
        this.elem.style.display = 'flex' ;
        this.elem.style.flexDirection = 'column' ;

        // Register callbacks for data from backend
        this.registerCallback('send-single-team-configs', this.receivedConfigs.bind(this)) ;
        this.registerCallback('send-chart-data', this.receivedChartData.bind(this)) ;

        this.registerCallback('send-datasets', this.receivedDataSets.bind(this)) ;
        this.registerCallback('send-team-field-list', this.receivedTeamFields.bind(this)) ;
        this.registerCallback('send-match-field-list', this.receivedMatchFields.bind(this)) ;
        this.registerCallback('send-formulas', this.receivedFormulas.bind(this)) ;
        this.registerCallback('send-team-list', this.receivedTeam.bind(this)) ;

        this.registerCallback('send-match-data', this.receivedMatchData.bind(this)) ;


        // Request initial data

        this.request('get-single-team-configs') ;

        this.request('get-datasets') ;
        this.request('get-team-field-list') ;
        this.request('get-match-field-list') ;
        this.request('get-formulas') ;
        this.request('get-team-list', { nicknames: true, rank: false}) ;

        this.request('get-match-data') ;
    }

    private createUI(): void {
        this.reset() ;

        // Create main container with two-panel layout
        const container = document.createElement('div') ;
        container.style.display = 'flex' ;
        container.style.height = '100%' ;
        container.style.width = '100%' ;
        container.style.overflow = 'hidden' ;

        // Left panel for configuration management
        this.left_panel_ = document.createElement('div') ;
        this.left_panel_.style.width = '300px' ;
        this.left_panel_.style.height = '100%' ;
        this.left_panel_.style.borderRight = '1px solid #ccc' ;
        this.left_panel_.style.padding = '10px' ;
        this.left_panel_.style.display = 'flex' ;
        this.left_panel_.style.flexDirection = 'column' ;
        this.left_panel_.style.overflow = 'hidden' ;

        // Right panel for chart display
        this.right_panel_ = document.createElement('div') ;
        this.right_panel_.style.flexGrow = '1' ;
        this.right_panel_.style.padding = '10px' ;
        this.right_panel_.style.display = 'flex' ;
        this.right_panel_.style.flexDirection = 'column' ;

        // Grouping mode toggle button panel
        const buttonPanel = document.createElement('div') ;
        buttonPanel.style.marginBottom = '10px' ;
        buttonPanel.style.padding = '10px' ;
        buttonPanel.style.borderBottom = '1px solid #ccc' ;
        this.left_panel_.appendChild(buttonPanel) ;

        const toggleButton = document.createElement('button') ;
        toggleButton.innerText = 'Group: Teams within Items' ;
        toggleButton.style.width = '100%' ;
        toggleButton.style.padding = '8px' ;
        toggleButton.style.cursor = 'pointer' ;
        toggleButton.style.fontSize = '13px' ;
        toggleButton.addEventListener('click', () => {
            if (this.grouping_mode_ === 'teams-within-items') {
                this.grouping_mode_ = 'items-within-teams' ;
                toggleButton.innerText = 'Group: Items within Teams' ;
            } else {
                this.grouping_mode_ = 'teams-within-items' ;
                toggleButton.innerText = 'Group: Teams within Items' ;
            }
            // Re-render chart if data exists
            if (this.selected_config_index_ !== -1 && this.selected_teams_.size > 0) {
                this.requestChartData() ;
            }
        }) ;
        buttonPanel.appendChild(toggleButton) ;

        // Match selector
        const matchLabel = document.createElement('label') ;
        matchLabel.innerText = 'Match:' ;
        matchLabel.style.display = 'block' ;
        matchLabel.style.marginTop = '10px' ;
        matchLabel.style.marginBottom = '5px' ;
        matchLabel.style.fontWeight = 'bold' ;
        matchLabel.style.fontSize = '13px' ;
        buttonPanel.appendChild(matchLabel) ;

        this.match_select_ = document.createElement('select') ;
        this.match_select_.style.width = '100%' ;
        this.match_select_.style.padding = '6px' ;
        this.match_select_.style.fontSize = '13px' ;
        this.match_select_.addEventListener('change', () => this.onMatchSelected()) ;
        buttonPanel.appendChild(this.match_select_) ;

        this.populateMatchSelect() ;

        // Configuration list container - 1/3 of left panel height
        this.config_list_div_ = document.createElement('div') ;
        this.config_list_div_.style.height = '33.33%' ;
        this.config_list_div_.style.overflowY = 'auto' ;
        this.config_list_div_.style.marginBottom = '10px' ;
        this.config_list_div_.style.borderBottom = '1px solid #ccc' ;
        this.config_list_div_.style.paddingBottom = '10px' ;
        this.left_panel_.appendChild(this.config_list_div_) ;

        // Team list container - remaining 2/3 of left panel height
        this.team_list_div_ = document.createElement('div') ;
        this.team_list_div_.style.flexGrow = '1' ;
        this.team_list_div_.style.display = 'flex' ;
        this.team_list_div_.style.flexDirection = 'column' ;
        this.team_list_div_.style.overflow = 'hidden' ;
        this.left_panel_.appendChild(this.team_list_div_) ;

        // Chart container
        this.chart_container_ = document.createElement('div') ;
        this.chart_container_.style.flexGrow = '1' ;
        this.chart_container_.style.border = '1px solid #ddd' ;
        this.chart_container_.style.padding = '20px' ;
        this.chart_container_.style.backgroundColor = '#fafafa' ;
        this.right_panel_.appendChild(this.chart_container_) ;

        container.appendChild(this.left_panel_) ;
        container.appendChild(this.right_panel_) ;
        this.elem.appendChild(container) ;
    }

    private checkAll() {
        if (this.teamfldsReceived_ && this.matchfldsReceived_ && this.formulasReceived_ && 
            this.datasetsReceived_ && this.configsReceived_ && this.teamsReceived_ && this.matchDataReceived_) {
            this.createUI() ;
            this.displayConfigs() ;
            this.displayTeams() ;
        }
    }

    private receivedMatchData(data: IPCMatchInfo[]): void {
        this.matchdata_ = data ;
        this.matchDataReceived_ = true ;
        this.checkAll() ;
    }

    private receivedTeam(teams: IPCTeamInfo[]): void {
        this.teams_ = teams ;
        this.teamsReceived_ = true ;
        this.checkAll() ;
    }

    private receivedConfigs(configs: IPCGraphConfig[]): void {
        this.configs_ = configs ;
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

    private receivedChartData(data: IPCGraphData): void {
        // This will be called when chart data is received from backend
        this.renderChart(data) ;
    }

    private displayConfigs(): void {
        this.config_list_div_.innerHTML = '' ;

        // Title
        const title = document.createElement('h3') ;
        title.innerText = 'Configurations' ;
        title.style.marginTop = '0' ;
        title.style.marginBottom = '10px' ;
        this.config_list_div_.appendChild(title) ;

        // Display all configurations
        for (let i = 0; i < this.configs_.length; i++) {
            const config = this.configs_[i] ;
            const div = document.createElement('div') ;
            div.style.cursor = 'pointer' ;
            div.style.padding = '8px' ;
            div.style.marginBottom = '5px' ;
            div.style.borderRadius = '3px' ;
            div.style.position = 'relative' ;
            div.style.display = 'flex' ;
            div.style.alignItems = 'center' ;
            div.style.justifyContent = 'space-between' ;

            // Create text span for config name
            const nameSpan = document.createElement('span') ;
            nameSpan.innerText = config.name ;
            nameSpan.style.flexGrow = '1' ;
            div.appendChild(nameSpan) ;

            // Create delete icon
            const deleteIcon = document.createElement('span') ;
            deleteIcon.innerHTML = '🗑️' ;
            deleteIcon.style.cursor = 'pointer' ;
            deleteIcon.style.fontSize = '18px' ;
            deleteIcon.style.fontWeight = 'bold' ;
            deleteIcon.style.filter = 'brightness(1.3) contrast(1.2)' ;
            deleteIcon.style.padding = '4px' ;
            deleteIcon.style.marginLeft = '10px' ;
            deleteIcon.title = 'Delete configuration' ;

            // Add click handler for delete icon
            deleteIcon.addEventListener('click', (e) => {
                e.stopPropagation() ;
                this.deleteConfig(i) ;
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

            div.appendChild(deleteIcon) ;

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
                    if (this.selected_config_index_ !== i) {
                        div.style.backgroundColor = '#e0e0e0' ;
                    }
                }) ;
                div.addEventListener('mouseleave', () => {
                    if (this.selected_config_index_ !== i) {
                        div.style.backgroundColor = '#f0f0f0' ;
                    }
                }) ;
            }

            // Add single-click handler to select the config
            nameSpan.addEventListener('click', () => this.selectConfig(i)) ;

            // Add double-click handler to edit the config
            nameSpan.addEventListener('dblclick', () => this.editConfig(i)) ;

            this.config_list_div_.appendChild(div) ;
        }

        // Add "New Configuration" button
        const addButton = document.createElement('div') ;
        addButton.style.cursor = 'pointer' ;
        addButton.style.padding = '8px' ;
        addButton.style.marginTop = '10px' ;
        addButton.style.marginBottom = '5px' ;
        addButton.style.borderRadius = '3px' ;
        addButton.style.backgroundColor = '#f0f0f0' ;
        addButton.style.fontStyle = 'italic' ;
        addButton.style.color = '#666' ;
        addButton.style.borderTop = '1px solid #ccc' ;
        addButton.style.paddingTop = '10px' ;
        addButton.innerText = 'Add New Configuration' ;

        addButton.addEventListener('click', this.addNewConfig.bind(this)) ;
        addButton.addEventListener('mouseenter', () => {
            addButton.style.backgroundColor = '#e0e0e0' ;
        }) ;
        addButton.addEventListener('mouseleave', () => {
            addButton.style.backgroundColor = '#f0f0f0' ;
        }) ;

        this.config_list_div_.appendChild(addButton) ;
    }

    private displayTeams(): void {
        this.team_list_div_.innerHTML = '' ;

        // Header with title and buttons
        const header = document.createElement('div') ;
        header.style.display = 'flex' ;
        header.style.justifyContent = 'space-between' ;
        header.style.alignItems = 'center' ;
        header.style.marginBottom = '10px' ;

        const title = document.createElement('h3') ;
        title.innerText = 'Teams' ;
        title.style.margin = '0' ;
        header.appendChild(title) ;

        // Buttons container
        const buttonContainer = document.createElement('div') ;
        buttonContainer.style.display = 'flex' ;
        buttonContainer.style.gap = '5px' ;

        // Select All button
        const selectAllBtn = document.createElement('button') ;
        selectAllBtn.innerText = 'All' ;
        selectAllBtn.style.padding = '4px 8px' ;
        selectAllBtn.style.fontSize = '12px' ;
        selectAllBtn.style.cursor = 'pointer' ;
        selectAllBtn.addEventListener('click', () => this.selectAllTeams()) ;
        buttonContainer.appendChild(selectAllBtn) ;

        // Unselect All button
        const unselectAllBtn = document.createElement('button') ;
        unselectAllBtn.innerText = 'None' ;
        unselectAllBtn.style.padding = '4px 8px' ;
        unselectAllBtn.style.fontSize = '12px' ;
        unselectAllBtn.style.cursor = 'pointer' ;
        unselectAllBtn.addEventListener('click', () => this.unselectAllTeams()) ;
        buttonContainer.appendChild(unselectAllBtn) ;

        header.appendChild(buttonContainer) ;
        this.team_list_div_.appendChild(header) ;

        // Create scrollable container for team items
        const scrollContainer = document.createElement('div') ;
        scrollContainer.style.flexGrow = '1' ;
        scrollContainer.style.overflowY = 'auto' ;
        scrollContainer.style.overflowX = 'hidden' ;
        scrollContainer.style.border = '1px solid #ccc' ;
        scrollContainer.style.borderRadius = '3px' ;
        scrollContainer.style.padding = '5px' ;

        // Display all teams
        for (const team of this.teams_) {
            const div = document.createElement('div') ;
            div.style.cursor = 'pointer' ;
            div.style.padding = '8px' ;
            div.style.marginBottom = '5px' ;
            div.style.borderRadius = '3px' ;

            // Create text for team
            const teamText = document.createElement('span') ;
            teamText.innerText = `${team.number} - ${team.nickname}` ;
            div.appendChild(teamText) ;

            // Apply selection styling
            if (this.selected_teams_.has(team.number)) {
                div.style.backgroundColor = '#007acc' ;
                div.style.color = 'white' ;
            } else {
                div.style.backgroundColor = '#f0f0f0' ;
                div.style.color = '' ;
            }

            // Add hover effects for non-selected items
            if (!this.selected_teams_.has(team.number)) {
                div.addEventListener('mouseenter', () => {
                    if (!this.selected_teams_.has(team.number)) {
                        div.style.backgroundColor = '#e0e0e0' ;
                    }
                }) ;
                div.addEventListener('mouseleave', () => {
                    if (!this.selected_teams_.has(team.number)) {
                        div.style.backgroundColor = '#f0f0f0' ;
                    }
                }) ;
            }

            // Add click handler to toggle the team
            div.addEventListener('click', () => this.toggleTeam(team.number)) ;

            scrollContainer.appendChild(div) ;
        }

        this.team_list_div_.appendChild(scrollContainer) ;
    }

    private toggleTeam(teamNumber: number): void {
        if (this.selected_teams_.has(teamNumber)) {
            this.selected_teams_.delete(teamNumber) ;
        } else {
            this.selected_teams_.add(teamNumber) ;
        }
        this.resetMatchSelector() ;
        this.displayTeams() ;
        
        // If a config is selected, request chart data
        if (this.selected_config_index_ !== -1) {
            this.requestChartData() ;
        }
    }

    private selectAllTeams(): void {
        this.selected_teams_.clear() ;
        for (const team of this.teams_) {
            this.selected_teams_.add(team.number) ;
        }
        this.resetMatchSelector() ;
        this.displayTeams() ;
        
        // If a config is selected, request chart data
        if (this.selected_config_index_ !== -1) {
            this.requestChartData() ;
        }
    }

    private unselectAllTeams(): void {
        this.selected_teams_.clear() ;
        this.resetMatchSelector() ;
        this.displayTeams() ;
        this.clearChart() ;
    }

    private selectTeam(teamNumber: number): void {
        this.selected_teams_.clear() ;
        this.selected_teams_.add(teamNumber) ;
        this.resetMatchSelector() ;
        this.displayTeams() ;
        
        // If a config is selected, request chart data
        if (this.selected_config_index_ !== -1) {
            this.requestChartData() ;
        }
    }

    private resetMatchSelector(): void {
        // Reset the match selector to default "-- Select Match --" option
        if (this.match_select_) {
            this.match_select_.value = '' ;
        }
    }

    private populateMatchSelect(): void {
        // Clear existing options
        this.match_select_.innerHTML = '' ;

        // Add default option
        const defaultOption = document.createElement('option') ;
        defaultOption.value = '' ;
        defaultOption.text = '-- Select Match --' ;
        this.match_select_.appendChild(defaultOption) ;

        // Define comp_level sort order
        const compLevelOrder: { [key: string]: number } = {
            'qm': 1,
            'sf': 2,
            'f': 3
        } ;

        // Sort matches
        const sortedMatches = [...this.matchdata_].sort((a, b) => {
            // First by comp_level
            const orderA = compLevelOrder[a.comp_level] || 999 ;
            const orderB = compLevelOrder[b.comp_level] || 999 ;
            if (orderA !== orderB) {
                return orderA - orderB ;
            }

            // Then by set_number
            if (a.set_number !== b.set_number) {
                return a.set_number - b.set_number ;
            }

            // Finally by match_number
            return a.match_number - b.match_number ;
        }) ;

        // Add option for each match
        for (const match of sortedMatches) {
            const option = document.createElement('option') ;
            option.value = `${match.comp_level}-${match.match_number}-${match.set_number}` ;
            option.text = `${match.comp_level}-${match.match_number}-${match.set_number}` ;
            this.match_select_.appendChild(option) ;
        }
    }

    private onMatchSelected(): void {
        const selectedValue = this.match_select_.value ;
        if (!selectedValue) {
            // No match selected, do nothing
            return ;
        }

        // Find the selected match
        const parts = selectedValue.split('-') ;
        const compLevel = parts[0] ;
        const matchNumber = parseInt(parts[1]) ;
        const setNumber = parseInt(parts[2]) ;

        const match = this.matchdata_.find(m => 
            m.comp_level === compLevel && 
            m.match_number === matchNumber && 
            m.set_number === setNumber
        ) ;

        if (!match) {
            return ;
        }

        // Clear current team selections
        this.selected_teams_.clear() ;

        // Add all teams from the match
        const teamNumbers = [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3] ;
        for (const teamNumber of teamNumbers) {
            if (teamNumber > 0) { // Only add valid team numbers
                this.selected_teams_.add(teamNumber) ;
            }
        }

        // Refresh the team display
        this.displayTeams() ;

        // If a config is selected, request chart data
        if (this.selected_config_index_ !== -1) {
            this.requestChartData() ;
        }
    }

    private selectConfig(index: number): void {
        this.selected_config_index_ = index ;
        this.displayConfigs() ;
        
        // If teams are selected, request chart data for this config
        if (this.selected_teams_.size > 0) {
            this.requestChartData() ;
        }
    }

    private editConfig(index: number): void {
        if (this.dialog_) {
            return ;
        }

        this.oldname_ = this.configs_[index].name ;

        // Create a deep copy of the config to edit
        const originalConfig = this.configs_[index] ;
        const configCopy: IPCGraphConfig = {
            name: originalConfig.name,
            xlabel: originalConfig.xlabel || '',
            yleft: originalConfig.yleft || '',
            yright: originalConfig.yright || '',
            title: originalConfig.title || '',
            type: originalConfig.type || 'bar',
            teams: [],
            leftitems: originalConfig.leftitems.map(item => ({
                label: item.label,
                name: item.name,
                dataset: item.dataset
            })),
            rightitems: originalConfig.rightitems?.map(item => ({
                label: item.label,
                name: item.name,
                dataset: item.dataset
            })) || []
        } ;

        this.dialog_ = new SingleTeamConfigDialog(configCopy, this.datasets_, this.teamflds_, this.matchflds_, this.formulas_, false) ;
        this.dialog_.on('closed', this.configDialogClosed.bind(this)) ;
        this.dialog_.showCentered(this.elem.parentElement!) ;
    }

    private addNewConfig(): void {
        if (this.dialog_) {
            return ;
        }

        const newConfig: IPCGraphConfig = {
            name: 'New Configuration',
            xlabel: '',
            yleft: '',
            yright: '',
            title: '',
            type: 'bar',
            teams: [],
            leftitems: [],
            rightitems: []
        } ;

        this.dialog_ = new SingleTeamConfigDialog(newConfig, this.datasets_, this.teamflds_, this.matchflds_, this.formulas_, true) ;
        this.dialog_.on('closed', this.configDialogClosed.bind(this)) ;
        this.dialog_.showCentered(this.elem.parentElement!) ;
    }

    private deleteConfig(index: number): void {
        if (confirm(`Are you sure you want to delete the configuration "${this.configs_[index].name}"?`)) {
            this.configs_.splice(index, 1) ;

            // Adjust selected index if necessary
            if (this.selected_config_index_ === index) {
                this.selected_config_index_ = -1 ;
            } else if (this.selected_config_index_ > index) {
                this.selected_config_index_-- ;
            }

            // Update the backend
            this.request('update-single-team-configs', this.configs_) ;
            this.displayConfigs() ;
            this.clearChart() ;
        }
    }

    private configDialogClosed(changed: boolean): void {
        if (changed && this.dialog_) {
            if (this.dialog_.isNew) {
                // Add new configuration
                this.configs_.push(this.dialog_.config) ;
            } else {
                // Update existing configuration
                const i = this.configs_.findIndex(c => c.name === this.oldname_) ;
                if (i !== -1) {
                    this.configs_[i] = this.dialog_.config ;
                }
            }

            // Update backend
            this.request('update-single-team-configs', this.configs_) ;
            this.displayConfigs() ;

            // Refresh chart if this config is selected and teams are selected
            if (this.selected_config_index_ !== -1 && this.selected_teams_.size > 0) {
                this.requestChartData() ;
            }
        }
        this.dialog_ = undefined ;
    }

    private requestChartData(): void {
        if (this.selected_config_index_ === -1 || this.selected_teams_.size === 0) {
            return ;
        }

        const config = this.configs_[this.selected_config_index_] ;
        config.teams = Array.from(this.selected_teams_) ;
        this.request('get-chart-data', config) ;
    }

    private renderChart(data: IPCGraphData): void {
        // Destroy existing chart if present
        if (this.chart_instance_) {
            this.chart_instance_.destroy() ;
            this.chart_instance_ = null ;
        }

        this.chart_container_.innerHTML = '' ;

        // Get the config for xlabel, ylabel, and title
        const config = this.configs_[this.selected_config_index_] ;

        if (!data || !data.items || data.items.length === 0) {
            const noData = document.createElement('p') ;
            noData.innerText = 'No data available for this configuration.' ;
            noData.style.color = '#666' ;
            noData.style.textAlign = 'center' ;
            noData.style.marginTop = '50px' ;
            this.chart_container_.appendChild(noData) ;
            return ;
        }

        // Create canvas for Chart.js
        const canvas = document.createElement('canvas') ;
        canvas.style.width = '100%' ;
        canvas.style.height = '100%' ;
        this.chart_container_.appendChild(canvas) ;

        // Helper function to determine which axis an item belongs to
        const getItemAxis = (itemName: string): 'left' | 'right' => {
            // Check if item is in leftitems
            if (config.leftitems.some(item => item.name === itemName)) {
                return 'left' ;
            }
            // Check if item is in rightitems
            if (config.rightitems && config.rightitems.some(item => item.name === itemName)) {
                return 'right' ;
            }
            // Default to left if not found
            return 'left' ;
        } ;

        // Check if we need a right axis
        const hasRightAxis = data.items.some(item => getItemAxis(item.name) === 'right') ;

        // Define colors for different teams
        const teamColors = [
            'rgba(0, 122, 204, 0.8)',   // Blue
            'rgba(255, 99, 132, 0.8)',  // Red
            'rgba(75, 192, 192, 0.8)',  // Teal
            'rgba(255, 206, 86, 0.8)',  // Yellow
            'rgba(153, 102, 255, 0.8)', // Purple
            'rgba(255, 159, 64, 0.8)',  // Orange
            'rgba(46, 204, 113, 0.8)',  // Green
            'rgba(231, 76, 60, 0.8)',   // Dark Red
        ] ;

        let labels: string[] = [] ;
        let datasets: any[] = [] ;

        if (this.grouping_mode_ === 'items-within-teams') {
            // Group by team: X-axis shows teams, each item is a separate dataset
            labels = data.teams.map(t => `Team ${t}`) ;
            
            // Create a dataset for each item
            for (let itemIndex = 0; itemIndex < data.items.length; itemIndex++) {
                const item = data.items[itemIndex] ;
                const itemData: number[] = [] ;
                const itemAxis = getItemAxis(item.name) ;
                
                // For each team, get this item's value
                for (let teamIndex = 0; teamIndex < data.teams.length; teamIndex++) {
                    let displayValue: number | null = null ;
                    if (item.values && item.values.length > teamIndex) {
                        const typedValue = item.values[teamIndex] ;
                        if (typedValue && (typedValue.type === 'integer' || typedValue.type === 'real')) {
                            displayValue = typedValue.value as number ;
                        }
                    }
                    itemData.push(displayValue !== null ? displayValue : 0) ;
                }
                
                datasets.push({
                    label: item.name,
                    data: itemData,
                    backgroundColor: teamColors[itemIndex % teamColors.length],
                    borderColor: teamColors[itemIndex % teamColors.length].replace('0.8', '1'),
                    borderWidth: 1,
                    yAxisID: itemAxis === 'left' ? 'y' : 'y1'
                }) ;
            }
        } else {
            // Group by item: X-axis shows items, each team is a separate dataset
            labels = data.items.map(item => item.name) ;
            
            // Create a dataset for each team
            for (let teamIndex = 0; teamIndex < data.teams.length; teamIndex++) {
                const teamNumber = data.teams[teamIndex] ;
                const teamColor = teamColors[teamIndex % teamColors.length] ;
                const teamData: number[] = [] ;
                
                // For each item, get this team's value
                for (const item of data.items) {
                    let displayValue: number | null = null ;
                    if (item.values && item.values.length > teamIndex) {
                        const typedValue = item.values[teamIndex] ;
                        if (typedValue && (typedValue.type === 'integer' || typedValue.type === 'real')) {
                            displayValue = typedValue.value as number ;
                        }
                    }
                    teamData.push(displayValue !== null ? displayValue : 0) ;
                }
                
                // In this mode, all items in a dataset belong to the same team
                // We need to determine axis based on the items being displayed
                // For simplicity, we'll use 'y' and let individual items override if needed
                datasets.push({
                    label: `Team ${teamNumber}`,
                    data: teamData,
                    backgroundColor: teamColor,
                    borderColor: teamColor.replace('0.8', '1'),
                    borderWidth: 1,
                    yAxisID: 'y'  // Default to left axis for teams
                }) ;
            }
        }

        // Build scales configuration
        const scalesConfig: any = {
            x: {
                title: {
                    display: !!config?.xlabel,
                    text: config?.xlabel || '',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                beginAtZero: true,
                title: {
                    display: !!config?.yleft,
                    text: config?.yleft || 'Left Axis',
                    font: {
                        size: 18,
                        weight: 'bold'
                    }
                }
            }
        } ;

        // Add right axis only if needed
        if (hasRightAxis) {
            scalesConfig.y1 = {
                type: 'linear',
                display: true,
                position: 'right',
                beginAtZero: true,
                title: {
                    display: true,
                    text: config?.yright || 'Right Axis',
                    font: {
                        size: 18,
                        weight: 'bold'
                    }
                },
                grid: {
                    drawOnChartArea: false  // Only draw grid lines for left axis
                }
            } ;
        }

        // Create Chart.js configuration
        const chartConfig: ChartConfiguration = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: !!config?.title,
                        text: config?.title || `${data.config || 'Chart'}`,
                        font: {
                            size: 18,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'start',
                        rotation: -90,
                        color: '#fff',
                        font: {
                            weight: 'bold',
                            size: 16
                        },
                        formatter: (value: any) => {
                            // Only show label if value is not zero
                            if (value === 0 || value === null || value === undefined) {
                                return '';
                            }
                            // Format the number to show up to 2 decimal places
                            if (typeof value === 'number') {
                                return value % 1 === 0 ? value.toString() : value.toFixed(2);
                            }
                            return value;
                        },
                        // Only display if there's enough space in the bar
                        display: (context: any) => {
                            const value = context.dataset.data[context.dataIndex];
                            return value && Math.abs(value) > 0;
                        }
                    }
                },
                scales: scalesConfig
            }
        } ;

        // Create the chart
        this.chart_instance_ = new Chart(canvas, chartConfig) ;
    }

    private clearChart(): void {
        this.chart_container_.innerHTML = '' ;
        const msg = document.createElement('p') ;
        msg.innerText = 'Select a configuration and team to view the chart.' ;
        msg.style.color = '#999' ;
        msg.style.textAlign = 'center' ;
        msg.style.marginTop = '50px' ;
        this.chart_container_.appendChild(msg) ;
    }

    public setTeam(teamNumber: number): void {
        this.selected_teams_.clear() ;
        this.selected_teams_.add(teamNumber) ;
        this.displayTeams() ;
        if (this.selected_config_index_ !== -1) {
            this.requestChartData() ;
        }
    }
}
