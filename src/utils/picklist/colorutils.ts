import { IPCPickListConfig } from "../../shared/ipc.js" ;
import { computePercentile, interpolateColor } from "./picklistutils.js" ;
import { CellComponent, RowComponent } from "tabulator-tables" ;

export type GradientOptions = { save: boolean ; silent?: boolean } ;
type SaveConfigsFn = (configs: IPCPickListConfig[]) => void ;
export type PaletteState = {
    paletteEl: HTMLDivElement | null ;
    documentListener: ((event: MouseEvent) => void) | null ;
    keyListener: ((event: KeyboardEvent) => void) | null ;
} ;

export function getStoredCellColor(configs: IPCPickListConfig[], selectedIndex: number, cell: CellComponent, rowColorField: string): string {
    if (selectedIndex < 0) {
        return '' ;
    }

    const config = configs[selectedIndex] ;
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

export function applyCellColor(configs: IPCPickListConfig[], selectedIndex: number, cell: CellComponent, color: string, rowColorField: string, saveConfigs: SaveConfigsFn): void {
    if (selectedIndex < 0) {
        return ;
    }

    const config = configs[selectedIndex] ;
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
        if (!config.cellColors[rowColorField]) {
            config.cellColors[rowColorField] = {} ;
        }
        if (color) {
            config.cellColors[rowColorField]![teamNumber] = color ;
        } else if (config.cellColors[rowColorField]) {
            delete config.cellColors[rowColorField]![teamNumber] ;
            if (Object.keys(config.cellColors[rowColorField]!).length === 0) {
                delete config.cellColors[rowColorField] ;
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

    applyStoredColorsToRow(configs, selectedIndex, cell.getRow(), rowColorField) ;
    saveConfigs(configs) ;
}

export function applyStoredColorsToRow(configs: IPCPickListConfig[], selectedIndex: number, row: RowComponent, rowColorField: string): void {
    if (selectedIndex < 0) {
        return ;
    }

    const config = configs[selectedIndex] ;
    if (!config.cellColors) {
        return ;
    }

    const rowData = row.getData() ;
    const teamNumber = rowData.teamNumber as number | undefined ;
    if (teamNumber === undefined || teamNumber === null) {
        return ;
    }

    const rowFieldColors = config.cellColors[rowColorField] ;
    const rowBaseColor = rowFieldColors ? rowFieldColors[teamNumber] : '' ;

    row.getCells().forEach((cell) => {
        const field = cell.getField() ;
        const fieldColors = config.cellColors![field] ;
        const cellSpecificColor = fieldColors ? fieldColors[teamNumber] : '' ;
        const color = cellSpecificColor || rowBaseColor || '' ;
        const element = cell.getElement() ;
        element.style.backgroundColor = color || '' ;
    }) ;
}

export function applyGradientToColumn(configs: IPCPickListConfig[], selectedIndex: number, table: any, field: string, options: GradientOptions, rowColorField: string, saveConfigs: SaveConfigsFn, alertFn: (message: string) => void = alert): void {
    if (!table || selectedIndex < 0) {
        return ;
    }

    const silent = options.silent ?? false ;
    const config = configs[selectedIndex] ;
    const rows = table.getRows() as RowComponent[] ;

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
            alertFn('No numeric values found in this column for conditional formatting.') ;
        }
        clearGradientForColumn(configs, selectedIndex, table, field, { save: options.save, silent: true }, rowColorField, saveConfigs) ;
        return ;
    }

    numericEntries.sort((a, b) => a.value - b.value) ;
    const sortedValues = numericEntries.map(entry => entry.value).sort((a, b) => a - b) ;
    const min = sortedValues[0] ;
    const q1 = computePercentile(sortedValues, 0.25) ;
    const median = computePercentile(sortedValues, 0.5) ;
    const q3 = computePercentile(sortedValues, 0.75) ;
    const max = sortedValues[sortedValues.length - 1] ;

    if (!config.cellColors) {
        config.cellColors = {} ;
    }
    config.cellColors[field] = {} ;

    const stops = [
        { value: min, color: '#e67c73' },
        { value: q1, color: '#f3a96d' },
        { value: median, color: '#ffd666' },
        { value: q3, color: '#abc978' },
        { value: max, color: '#57bb8a' }
    ] ;

    const isFlat = max === min ;
    numericEntries.forEach(entry => {
        if (isFlat) {
            config.cellColors![field]![entry.team] = stops[2].color ;
            return ;
        }

        for (let i = 0; i < stops.length - 1; i++) {
            const start = stops[i] ;
            const end = stops[i + 1] ;
            const reachedEnd = i === stops.length - 2 ;
            if (entry.value <= end.value || reachedEnd) {
                const span = end.value - start.value ;
                const ratio = span === 0 ? 0 : (entry.value - start.value) / span ;
                const color = interpolateColor(start.color, end.color, Math.max(0, Math.min(1, ratio))) ;
                config.cellColors![field]![entry.team] = color ;
                return ;
            }
        }
    }) ;

    config.columnGradients![field] = 'box5' ;
    rows.forEach(row => applyStoredColorsToRow(configs, selectedIndex, row, rowColorField)) ;

    if (options.save) {
        saveConfigs(configs) ;
    }
}

export function ensurePaletteElement(state: PaletteState): HTMLDivElement {
    if (!state.paletteEl) {
        state.paletteEl = document.createElement('div') ;
        state.paletteEl.style.position = 'fixed' ;
        state.paletteEl.style.zIndex = '3000' ;
        state.paletteEl.style.backgroundColor = '#ffffff' ;
        state.paletteEl.style.border = '1px solid rgba(0,0,0,0.15)' ;
        state.paletteEl.style.borderRadius = '6px' ;
        state.paletteEl.style.boxShadow = '0 8px 20px rgba(0,0,0,0.18)' ;
        state.paletteEl.style.padding = '8px' ;
        state.paletteEl.style.display = 'none' ;
        state.paletteEl.style.gridTemplateColumns = 'repeat(6, 24px)' ;
        state.paletteEl.style.gap = '6px' ;
    }

    if (state.paletteEl && !document.body.contains(state.paletteEl)) {
        document.body.appendChild(state.paletteEl) ;
    }

    return state.paletteEl! ;
}

export function hideColorPalette(state: PaletteState): void {
    if (state.paletteEl) {
        state.paletteEl.style.display = 'none' ;
        state.paletteEl.style.visibility = 'hidden' ;
        state.paletteEl.style.pointerEvents = 'none' ;
    }

    if (state.documentListener) {
        document.removeEventListener('mousedown', state.documentListener) ;
        state.documentListener = null ;
    }

    if (state.keyListener) {
        document.removeEventListener('keydown', state.keyListener, true) ;
        state.keyListener = null ;
    }
}

export function showColorPalette(options: {
    event: UIEvent ;
    cell: CellComponent ;
    configs: IPCPickListConfig[] ;
    selectedIndex: number ;
    rowColorField: string ;
    colorOptions: string[] ;
    paletteState: PaletteState ;
    saveConfigs: SaveConfigsFn ;
    hideHeaderMenu: () => void ;
}): void {
    const mouseEvent = options.event as MouseEvent ;
    mouseEvent.preventDefault() ;
    mouseEvent.stopPropagation() ;

    if (options.selectedIndex < 0) {
        return ;
    }

    options.hideHeaderMenu() ;

    const palette = ensurePaletteElement(options.paletteState) ;
    hideColorPalette(options.paletteState) ;

    palette.innerHTML = '' ;
    palette.style.display = 'grid' ;
    palette.style.visibility = 'hidden' ;
    palette.style.pointerEvents = 'none' ;

    const currentColor = getStoredCellColor(options.configs, options.selectedIndex, options.cell, options.rowColorField) ;

    options.colorOptions.forEach(color => {
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
            applyCellColor(options.configs, options.selectedIndex, options.cell, color, options.rowColorField, options.saveConfigs) ;
            hideColorPalette(options.paletteState) ;
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
        applyCellColor(options.configs, options.selectedIndex, options.cell, '', options.rowColorField, options.saveConfigs) ;
        hideColorPalette(options.paletteState) ;
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

    options.paletteState.documentListener = (e: MouseEvent) => {
        const target = e.target as Node | null ;
        if (options.paletteState.paletteEl && target && !options.paletteState.paletteEl.contains(target)) {
            hideColorPalette(options.paletteState) ;
        }
    } ;
    document.addEventListener('mousedown', options.paletteState.documentListener) ;

    options.paletteState.keyListener = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            hideColorPalette(options.paletteState) ;
        }
    } ;
    document.addEventListener('keydown', options.paletteState.keyListener, true) ;
}

export function clearGradientForColumn(configs: IPCPickListConfig[], selectedIndex: number, table: any, field: string, options: GradientOptions, rowColorField: string, saveConfigs: SaveConfigsFn): void {
    if (selectedIndex < 0) {
        return ;
    }

    const config = configs[selectedIndex] ;
    if (config.cellColors && config.cellColors[field]) {
        delete config.cellColors[field] ;
    }
    if (config.columnGradients && config.columnGradients[field]) {
        delete config.columnGradients[field] ;
    }
    if (config.columnGradients && Object.keys(config.columnGradients).length === 0) {
        config.columnGradients = {} ;
    }

    if (table) {
        (table.getRows() as RowComponent[]).forEach(row => applyStoredColorsToRow(configs, selectedIndex, row, rowColorField)) ;
    }

    if (options.save) {
        saveConfigs(configs) ;
    }
}

export function applySavedGradients(configs: IPCPickListConfig[], selectedIndex: number, table: any, rowColorField: string, saveConfigs: SaveConfigsFn): void {
    if (!table || selectedIndex < 0) {
        return ;
    }

    const config = configs[selectedIndex] ;
    if (!config.columnGradients) {
        return ;
    }

    Object.keys(config.columnGradients).forEach(field => {
        applyGradientToColumn(configs, selectedIndex, table, field, { save: false, silent: true }, rowColorField, saveConfigs) ;
    }) ;
}
