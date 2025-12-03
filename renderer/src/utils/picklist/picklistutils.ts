import { IPCPickListConfig, IPCDataItem } from "../../shared/ipc.js" ;

export function ensurePickListConfigDefaults(config: IPCPickListConfig): void {
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

export function createPickListColumnFieldKey(column: IPCDataItem): string {
    const raw = `${column.dataset || 'default'}|${column.name || ''}|${column.label || ''}` ;
    let base = raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') ;
    if (!base) {
        base = 'column' ;
    }
    const hash = hashString(raw) ;
    return `data_${base}_${hash}` ;
}

function hashString(value: string): string {
    let hash = 0 ;
    for (let i = 0; i < value.length; i++) {
        hash = (hash << 5) - hash + value.charCodeAt(i) ;
        hash |= 0 ;
    }
    return Math.abs(hash).toString(36) ;
}

export function interpolateColor(startHex: string, endHex: string, ratio: number): string {
    const start = hexToRgb(startHex) ;
    const end = hexToRgb(endHex) ;
    const r = Math.round(start.r + (end.r - start.r) * ratio) ;
    const g = Math.round(start.g + (end.g - start.g) * ratio) ;
    const b = Math.round(start.b + (end.b - start.b) * ratio) ;
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}` ;
}

export function computePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) {
        return 0 ;
    }
    const index = (sortedValues.length - 1) * percentile ;
    const lower = Math.floor(index) ;
    const upper = Math.ceil(index) ;
    if (lower === upper) {
        return sortedValues[lower] ;
    }
    const weight = index - lower ;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight ;
}

function hexToRgb(hex: string): { r: number ; g: number ; b: number } {
    const normalized = hex.replace('#', '') ;
    const bigint = parseInt(normalized, 16) ;
    const r = (bigint >> 16) & 255 ;
    const g = (bigint >> 8) & 255 ;
    const b = bigint & 255 ;
    return { r, g, b } ;
}

function componentToHex(component: number): string {
    const hex = component.toString(16) ;
    return hex.length === 1 ? `0${hex}` : hex ;
}
