import { XeroDialog } from "../../widgets/xerodialog.js";
import { IPCDataSet, IPCGraphConfig, IPCGraphItem } from "../../shared/ipc.js";

export class SingleTeamConfigDialog extends XeroDialog {
    private config_name_?: HTMLInputElement ;
    private items_container_?: HTMLDivElement ;
    
    private new_: boolean = true ;
    private config_: IPCGraphConfig ;
    private datasets_: IPCDataSet[] = [] ;
    private teamflds_: string[] = [] ;
    private matchflds_: string[] = [] ;
    private formulas_: string[] = [] ;
    
    // Track the type for each item index to preserve user's selection
    private itemTypes_: Map<number, 'team-field' | 'match-field' | 'formula'> = new Map() ;

    constructor(config: IPCGraphConfig, datasets: IPCDataSet[], teamflds: string[], matchflds: string[], formulas: string[], isNew: boolean) {
        super('Edit Single Team Configuration') ;
        this.config_ = config ;
        this.datasets_ = datasets ;
        this.new_ = isNew ;
        this.teamflds_ = teamflds ;
        this.matchflds_ = matchflds ;
        this.formulas_ = formulas ;
    }

    public get isNew(): boolean {
        return this.new_ ;
    }

    public get config(): IPCGraphConfig {
        return this.config_ ;
    }

    async populateDialog(pdiv: HTMLDivElement): Promise<void> {
        const div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;
        div.style.minWidth = '600px' ;

        // Configuration Name
        this.config_name_ = document.createElement('input') ;
        this.config_name_.type = 'text' ;
        this.config_name_.className = 'xero-popup-form-edit-dialog-input' ;
        this.config_name_.value = this.config_.name ;

        let label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Configuration Name' ;
        label.appendChild(this.config_name_) ;
        div.appendChild(label) ;

        // Plot Items Section
        const itemsTitle = document.createElement('h4') ;
        itemsTitle.innerText = 'Plot Items' ;
        itemsTitle.style.marginTop = '20px' ;
        itemsTitle.style.marginBottom = '10px' ;
        div.appendChild(itemsTitle) ;

        // Container for plot items
        this.items_container_ = document.createElement('div') ;
        this.items_container_.style.border = '1px solid #ccc' ;
        this.items_container_.style.padding = '10px' ;
        this.items_container_.style.marginBottom = '10px' ;
        this.items_container_.style.maxHeight = '300px' ;
        this.items_container_.style.overflowY = 'auto' ;
        div.appendChild(this.items_container_) ;

        // Populate existing items
        this.renderItems() ;

        // Add Item Button
        const addButton = document.createElement('button') ;
        addButton.innerText = 'Add Plot Item' ;
        addButton.className = 'xero-popup-form-edit-dialog-button' ;
        addButton.style.marginTop = '10px' ;
        addButton.addEventListener('click', this.addPlotItem.bind(this)) ;
        div.appendChild(addButton) ;

        pdiv.appendChild(div) ;
    }

    private renderItems(): void {
        if (!this.items_container_) return ;

        this.items_container_.innerHTML = '' ;

        if (this.config_.leftitems.length === 0) {
            const emptyMsg = document.createElement('p') ;
            emptyMsg.innerText = 'No plot items yet. Click "Add Plot Item" to add one.' ;
            emptyMsg.style.color = '#999' ;
            emptyMsg.style.fontStyle = 'italic' ;
            this.items_container_.appendChild(emptyMsg) ;
            return ;
        }

        for (let i = 0; i < this.config_.leftitems.length; i++) {
            const item = this.config_.leftitems[i] ;
            const itemDiv = this.createItemRow(item, i) ;
            this.items_container_.appendChild(itemDiv) ;
        }
    }

    private determineItemType(item: IPCGraphItem, index: number): 'team-field' | 'match-field' | 'formula' {
        // First check if we have an explicitly set type for this item
        if (this.itemTypes_.has(index)) {
            return this.itemTypes_.get(index)! ;
        }
        
        // If not, try to auto-detect based on the item's name
        // If name is in team fields, it's a team field
        if (this.teamflds_.includes(item.name)) {
            return 'team-field' ;
        }
        // If name is in match fields, it's a match field
        if (this.matchflds_.includes(item.name)) {
            return 'match-field' ;
        }
        // Otherwise it's a formula
        return 'formula' ;
    }

    private createItemRow(item: IPCGraphItem, index: number): HTMLDivElement {
        const row = document.createElement('div') ;
        row.style.display = 'flex' ;
        row.style.flexDirection = 'column' ;
        row.style.gap = '8px' ;
        row.style.marginBottom = '10px' ;
        row.style.padding = '10px' ;
        row.style.backgroundColor = '#f9f9f9' ;
        row.style.borderRadius = '3px' ;

        // Determine current type
        const currentType = this.determineItemType(item, index) ;

        // First row: Type selector and delete button
        const typeRow = document.createElement('div') ;
        typeRow.style.display = 'flex' ;
        typeRow.style.gap = '10px' ;
        typeRow.style.alignItems = 'center' ;

        // Type selector
        const typeSelect = document.createElement('select') ;
        typeSelect.style.flex = '1' ;
        typeSelect.style.padding = '5px' ;

        let option = document.createElement('option') ;
        option.value = 'team-field' ;
        option.innerText = 'Team Field' ;
        if (currentType === 'team-field') option.selected = true ;
        typeSelect.appendChild(option) ;

        option = document.createElement('option') ;
        option.value = 'match-field' ;
        option.innerText = 'Match Field' ;
        if (currentType === 'match-field') option.selected = true ;
        typeSelect.appendChild(option) ;

        option = document.createElement('option') ;
        option.value = 'formula' ;
        option.innerText = 'Formula' ;
        if (currentType === 'formula') option.selected = true ;
        typeSelect.appendChild(option) ;

        typeSelect.addEventListener('change', () => {
            // Store the new type in our map
            this.itemTypes_.set(index, typeSelect.value as 'team-field' | 'match-field' | 'formula') ;
            
            // Clear name and dataset when type changes
            this.config_.leftitems[index].name = '' ;
            if (typeSelect.value === 'team-field') {
                this.config_.leftitems[index].dataset = '' ;
            }
            // Re-render to update UI
            this.renderItems() ;
        }) ;

        // Delete button
        const deleteBtn = document.createElement('span') ;
        deleteBtn.innerHTML = '🗑️' ;
        deleteBtn.style.cursor = 'pointer' ;
        deleteBtn.style.fontSize = '18px' ;
        deleteBtn.style.fontWeight = 'bold' ;
        deleteBtn.style.filter = 'brightness(1.3) contrast(1.2)' ;
        deleteBtn.style.padding = '4px' ;
        deleteBtn.title = 'Delete item' ;
        deleteBtn.addEventListener('click', () => {
            this.config_.leftitems.splice(index, 1) ;
            
            // Update the itemTypes_ map: remove the deleted index and shift all higher indices down
            this.itemTypes_.delete(index) ;
            const updatedTypes = new Map<number, 'team-field' | 'match-field' | 'formula'>() ;
            for (const [key, value] of this.itemTypes_.entries()) {
                if (key > index) {
                    updatedTypes.set(key - 1, value) ;
                } else if (key < index) {
                    updatedTypes.set(key, value) ;
                }
            }
            this.itemTypes_ = updatedTypes ;
            
            this.renderItems() ;
        }) ;
        deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.backgroundColor = '#ff4444' ;
            deleteBtn.style.borderRadius = '3px' ;
        }) ;
        deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.backgroundColor = '' ;
            deleteBtn.style.borderRadius = '' ;
        }) ;

        typeRow.appendChild(typeSelect) ;
        typeRow.appendChild(deleteBtn) ;
        row.appendChild(typeRow) ;

        // Second row: Field selection dropdown + dataset dropdown
        const fieldRow = document.createElement('div') ;
        fieldRow.style.display = 'flex' ;
        fieldRow.style.gap = '10px' ;
        fieldRow.style.alignItems = 'center' ;

        // Create the field/formula select dropdown
        const fieldSelect = document.createElement('select') ;
        fieldSelect.style.flex = '1' ;
        fieldSelect.style.padding = '5px' ;

        // Populate based on current type
        this.populateFieldSelect(fieldSelect, currentType, item.name) ;

        fieldSelect.addEventListener('change', () => {
            this.config_.leftitems[index].name = fieldSelect.value ;
        }) ;

        fieldRow.appendChild(fieldSelect) ;

        // Dataset dropdown - only enabled for expression and match-field
        const datasetSelect = this.createDatasetSelect(item, index) ;
        if (currentType === 'team-field') {
            datasetSelect.disabled = true ;
            datasetSelect.style.backgroundColor = '#f0f0f0' ;
            datasetSelect.style.color = '#999' ;
        }
        fieldRow.appendChild(datasetSelect) ;

        row.appendChild(fieldRow) ;

        // Third row: Label input
        const labelRow = document.createElement('div') ;
        labelRow.style.display = 'flex' ;
        labelRow.style.gap = '10px' ;

        const labelInput = document.createElement('input') ;
        labelInput.type = 'text' ;
        labelInput.value = item.label || '' ;
        labelInput.placeholder = 'Display label (optional)' ;
        labelInput.style.flex = '1' ;
        labelInput.style.padding = '5px' ;
        labelInput.addEventListener('change', () => {
            this.config_.leftitems[index].label = labelInput.value ;
        }) ;

        labelRow.appendChild(labelInput) ;
        row.appendChild(labelRow) ;

        return row ;
    }

    private createDatasetSelect(item: IPCGraphItem, index: number): HTMLSelectElement {
        const datasetSelect = document.createElement('select') ;
        datasetSelect.style.flex = '1' ;
        datasetSelect.style.padding = '5px' ;

        let option = document.createElement('option') ;
        option.value = '' ;
        option.innerText = 'Select dataset...' ;
        datasetSelect.appendChild(option) ;

        for (const dataset of this.datasets_) {
            option = document.createElement('option') ;
            option.value = dataset.name ;
            option.innerText = dataset.name ;
            if (item.dataset === dataset.name) {
                option.selected = true ;
            }
            datasetSelect.appendChild(option) ;
        }

        datasetSelect.addEventListener('change', () => {
            this.config_.leftitems[index].dataset = datasetSelect.value ;
        }) ;

        return datasetSelect ;
    }

    private populateFieldSelect(selectElement: HTMLSelectElement, type: 'team-field' | 'match-field' | 'formula', currentValue: string): void {
        // Clear existing options
        selectElement.innerHTML = '' ;

        let option: HTMLOptionElement ;

        if (type === 'team-field') {
            // Populate with team fields
            option = document.createElement('option') ;
            option.value = '' ;
            option.innerText = 'Select team field...' ;
            selectElement.appendChild(option) ;

            for (const field of this.teamflds_) {
                option = document.createElement('option') ;
                option.value = field ;
                option.innerText = field ;
                if (currentValue === field) option.selected = true ;
                selectElement.appendChild(option) ;
            }
        } else if (type === 'match-field') {
            // Populate with match fields
            option = document.createElement('option') ;
            option.value = '' ;
            option.innerText = 'Select match field...' ;
            selectElement.appendChild(option) ;

            for (const field of this.matchflds_) {
                option = document.createElement('option') ;
                option.value = field ;
                option.innerText = field ;
                if (currentValue === field) option.selected = true ;
                selectElement.appendChild(option) ;
            }
        } else {
            // Expression - populate with formulas
            option = document.createElement('option') ;
            option.value = '' ;
            option.innerText = 'Select formula or enter expression...' ;
            selectElement.appendChild(option) ;

            for (const formula of this.formulas_) {
                option = document.createElement('option') ;
                option.value = formula ;
                option.innerText = formula ;
                if (currentValue === formula) option.selected = true ;
                selectElement.appendChild(option) ;
            }
        }
    }

    private addPlotItem(): void {
        const newItem: IPCGraphItem = {
            label: '',
            name: '',
            dataset: ''
        } ;

        this.config_.leftitems.push(newItem) ;
        this.renderItems() ;
    }

    onInit(): void {
        if (this.config_name_) {
            this.config_name_.focus() ;
            this.config_name_.select() ;
        }
    }

    okButton(event: Event): void {
        // Extract data back to the config before closing
        if (this.config_name_) {
            this.config_.name = this.config_name_.value ;
        }

        // Validate that all items have required fields
        let hasErrors = false ;
        let errorMessage = '' ;
        
        for (let i = 0; i < this.config_.leftitems.length; i++) {
            const item = this.config_.leftitems[i] ;
            if (!item.name) {
                hasErrors = true ;
                errorMessage = 'All plot items must have a field or formula selected.' ;
                break ;
            }
            
            // Determine type to check dataset requirement
            const itemType = this.determineItemType(item, i) ;
            
            // Team fields don't need a dataset, but match fields and expressions do
            if ((itemType === 'match-field' || itemType === 'formula') && !item.dataset) {
                hasErrors = true ;
                errorMessage = 'Match fields and formulas must have a dataset selected.' ;
                break ;
            }
        }

        if (hasErrors) {
            alert(errorMessage) ;
            return ;
        }

        super.okButton(event) ;
    }
}
