
export interface OneScoutField {
    tag: string,
    value: any
}

export interface OneScoutResult {
    item?: string,
    data: Array<OneScoutField>
}

export interface ScoutingData {
    tablet: string,
    purpose: string,
    results: Array<OneScoutResult>
}