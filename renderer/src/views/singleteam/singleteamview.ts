import { XeroApp } from "../../apps/xeroapp.js";
import { XeroView } from "../xeroview.js";
import { IPCDataSet, IPCGraphConfig, IPCGraphItem } from "../../shared/ipc.js";
import { SingleTeamConfigDialog } from "./singleteamconfigdialog.js";

export class SingleTeamView extends XeroView {
    private left_panel_!: HTMLDivElement ;
    private right_panel_!: HTMLDivElement ;
    private chart_container_!: HTMLDivElement ;
    private config_list_div_!: HTMLDivElement ;
    
    private dialog_: SingleTeamConfigDialog | undefined ;
    private configs_: IPCGraphConfig[] = [] ;
    private datasets_: IPCDataSet[] = [] ;
    private selected_config_index_: number = -1 ;
    private selected_team_: number = -1 ;
    private oldname_: string = '' ;
    private teamflds_: string[] = [] ;  
    private matchflds_ : string[] = [] ;
    private formulas_ : string[] = [] ;

    private teamfldsReceived_ : boolean = false ;
    private matchfldsReceived_ : boolean = false ;
    private formulasReceived_ : boolean = false ;    
    private datasetsReceived_ : boolean = false ;
    private configsReceived_ : boolean = false ;

    constructor(app: XeroApp) {
        super(app, 'xero-single-team-view');

        // Register callbacks for data from backend
        this.registerCallback('send-single-team-configs', this.receivedConfigs.bind(this)) ;
        this.registerCallback('send-datasets', this.receivedDataSets.bind(this)) ;
        this.registerCallback('send-team-fields', this.receivedTeamFields.bind(this)) ;
        this.registerCallback('send-match-fields', this.receivedMatchFields.bind(this)) ;
        this.registerCallback('send-formulas', this.receivedFormulas.bind(this)) ;


        // Request initial data

        this.request('get-datasets') ;
        this.request('get-team-fields') ;
        this.request('get-match-fields') ;
        this.request('get-formulas') ;
        this.request('get-single-team-configs') ;
    }

    private createUI(): void {
        this.reset() ;

        // Create main container with two-panel layout
        const container = document.createElement('div') ;
        container.style.display = 'flex' ;
        container.style.height = '100%' ;
        container.style.width = '100%' ;

        // Left panel for configuration management
        this.left_panel_ = document.createElement('div') ;
        this.left_panel_.style.width = '300px' ;
        this.left_panel_.style.borderRight = '1px solid #ccc' ;
        this.left_panel_.style.padding = '10px' ;
        this.left_panel_.style.overflowY = 'auto' ;

        // Right panel for chart display
        this.right_panel_ = document.createElement('div') ;
        this.right_panel_.style.flexGrow = '1' ;
        this.right_panel_.style.padding = '10px' ;
        this.right_panel_.style.display = 'flex' ;
        this.right_panel_.style.flexDirection = 'column' ;

        // Configuration list container
        this.config_list_div_ = document.createElement('div') ;
        this.left_panel_.appendChild(this.config_list_div_) ;

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
        if (this.teamfldsReceived_ && this.matchfldsReceived_ && this.formulasReceived_ && this.datasetsReceived_ && this.configsReceived_) {
            this.createUI() ;
            this.displayConfigs() ;
        }
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

    private receivedTeamFields(fields: string[]): void {
        this.teamflds_ = fields ;
        this.teamfldsReceived_ = true ;
        this.checkAll() ;
    }

    private receivedMatchFields(fields: string[]): void {
        this.matchflds_ = fields ;
        this.matchfldsReceived_ = true ;
        this.checkAll() ;
    }

    private receivedFormulas(formulas: string[]): void {
        this.formulas_ = formulas ;
        this.formulasReceived_ = true ;
        this.checkAll() ;
    }

    private receivedChartData(data: any): void {
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

    private selectConfig(index: number): void {
        this.selected_config_index_ = index ;
        this.displayConfigs() ;
        
        // If a team is selected, request chart data for this config
        if (this.selected_team_ !== -1) {
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
            ylabel: originalConfig.ylabel || '',
            title: originalConfig.title || '',
            type: originalConfig.type || 'bar',
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
            ylabel: '',
            title: '',
            type: 'bar',
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

            // Refresh chart if this config is selected
            if (this.selected_config_index_ !== -1 && this.selected_team_ !== -1) {
                this.requestChartData() ;
            }
        }
        this.dialog_ = undefined ;
    }

    private requestChartData(): void {
        if (this.selected_config_index_ === -1 || this.selected_team_ === -1) {
            return ;
        }

        const config = this.configs_[this.selected_config_index_] ;
        this.request('get-team-chart-data', {
            team: this.selected_team_,
            config: config
        }) ;
    }

    private renderChart(data: any): void {
        this.chart_container_.innerHTML = '' ;

        // Create a simple bar chart visualization
        const title = document.createElement('h2') ;
        title.innerText = `Team ${this.selected_team_} - ${this.configs_[this.selected_config_index_]?.name || 'Chart'}` ;
        title.style.marginTop = '0' ;
        this.chart_container_.appendChild(title) ;

        if (!data || !data.items || data.items.length === 0) {
            const noData = document.createElement('p') ;
            noData.innerText = 'No data available for this configuration.' ;
            noData.style.color = '#666' ;
            this.chart_container_.appendChild(noData) ;
            return ;
        }

        // Create bar chart
        const chartDiv = document.createElement('div') ;
        chartDiv.style.display = 'flex' ;
        chartDiv.style.flexDirection = 'column' ;
        chartDiv.style.gap = '10px' ;

        // Find max value for scaling
        const maxValue = Math.max(...data.items.map((item: any) => item.value || 0)) ;

        for (const item of data.items) {
            const barContainer = document.createElement('div') ;
            barContainer.style.display = 'flex' ;
            barContainer.style.alignItems = 'center' ;
            barContainer.style.gap = '10px' ;

            // Label
            const label = document.createElement('div') ;
            label.innerText = item.label || item.field ;
            label.style.width = '150px' ;
            label.style.fontWeight = 'bold' ;
            barContainer.appendChild(label) ;

            // Bar
            const barWrapper = document.createElement('div') ;
            barWrapper.style.flexGrow = '1' ;
            barWrapper.style.backgroundColor = '#e0e0e0' ;
            barWrapper.style.borderRadius = '3px' ;
            barWrapper.style.height = '30px' ;
            barWrapper.style.position = 'relative' ;

            const bar = document.createElement('div') ;
            bar.style.height = '100%' ;
            bar.style.backgroundColor = '#007acc' ;
            bar.style.borderRadius = '3px' ;
            bar.style.width = maxValue > 0 ? `${(item.value / maxValue) * 100}%` : '0%' ;
            bar.style.transition = 'width 0.3s ease' ;
            barWrapper.appendChild(bar) ;

            // Value display
            const value = document.createElement('div') ;
            value.innerText = item.value?.toFixed(2) || '0' ;
            value.style.position = 'absolute' ;
            value.style.right = '10px' ;
            value.style.top = '50%' ;
            value.style.transform = 'translateY(-50%)' ;
            value.style.fontWeight = 'bold' ;
            barWrapper.appendChild(value) ;

            barContainer.appendChild(barWrapper) ;
            chartDiv.appendChild(barContainer) ;
        }

        this.chart_container_.appendChild(chartDiv) ;
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
        this.selected_team_ = teamNumber ;
        if (this.selected_config_index_ !== -1) {
            this.requestChartData() ;
        }
    }
}
