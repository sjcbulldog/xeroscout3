import { SCBase } from "../apps/scbase";
import { DataRecord } from "../model/datarecord";
import { Project } from "./project";
import {
    IPCAutoAnalysisAuto,
    IPCAutoAnalysisEdge,
    IPCAutoAnalysisMatchRow,
    IPCAutoAnalysisMetricOption,
    IPCAutoAnalysisMatchStatus,
    IPCAutoAnalysisNode,
    IPCAutoAnalysisPayload,
    IPCAutoAnalysisRequest,
    IPCAutoAnalysisSelection,
    IPCAutoAnalysisTeamSummary,
    IPCAutoPlanItem,
    IPCAutoSelectorItem,
    IPCDataSet,
    IPCForm,
    IPCTypedDataValue,
} from "../../shared/ipc";
import { DataValue } from "../../shared/datavalue";

interface ParsedAuto {
    id: string ;
    name: string ;
    nodes: IPCAutoAnalysisNode[] ;
    edges: IPCAutoAnalysisEdge[] ;
}

function clamp01(value: number) : number {
    return Math.max(0, Math.min(1, value)) ;
}

export function parseAutoPlanState(serialized: string) : ParsedAuto[] {
    if (typeof serialized !== 'string' || serialized.trim().length === 0) {
        return [] ;
    }

    let parsed: any ;
    try {
        parsed = JSON.parse(serialized) ;
    }
    catch {
        return [] ;
    }

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.autos)) {
        return [] ;
    }

    const autos: ParsedAuto[] = [] ;
    for (const candidate of parsed.autos) {
        if (!candidate || typeof candidate !== 'object') {
            continue ;
        }

        const nodes: IPCAutoAnalysisNode[] = [] ;
        if (Array.isArray(candidate.nodes)) {
            for (const node of candidate.nodes) {
                if (!node || typeof node !== 'object') {
                    continue ;
                }

                if (typeof node.id !== 'string' || typeof node.action !== 'string') {
                    continue ;
                }

                if (typeof node.x !== 'number' || typeof node.y !== 'number') {
                    continue ;
                }

                nodes.push({
                    id: node.id,
                    action: node.action,
                    x: clamp01(node.x),
                    y: clamp01(node.y),
                    end: node.end === true,
                }) ;
            }
        }

        if (nodes.length === 0) {
            continue ;
        }

        const edges: IPCAutoAnalysisEdge[] = [] ;
        if (Array.isArray(candidate.edges)) {
            for (const edge of candidate.edges) {
                if (!edge || typeof edge !== 'object') {
                    continue ;
                }

                if (typeof edge.id !== 'string' || typeof edge.from !== 'string' || typeof edge.to !== 'string') {
                    continue ;
                }

                const one: IPCAutoAnalysisEdge = {
                    id: edge.id,
                    from: edge.from,
                    to: edge.to,
                } ;

                if (typeof edge.cx === 'number') {
                    one.cx = clamp01(edge.cx) ;
                }
                if (typeof edge.cy === 'number') {
                    one.cy = clamp01(edge.cy) ;
                }

                edges.push(one) ;
            }
        }

        autos.push({
            id: typeof candidate.id === 'string' ? candidate.id : `auto-${autos.length + 1}`,
            name: typeof candidate.name === 'string' && candidate.name.length > 0 ? candidate.name : `Auto ${autos.length + 1}`,
            nodes: nodes,
            edges: edges,
        }) ;
    }

    return autos ;
}

function getAutoPlanItems(form: IPCForm | undefined) : IPCAutoPlanItem[] {
    const ret: IPCAutoPlanItem[] = [] ;
    if (!form) {
        return ret ;
    }

    for (const section of form.sections) {
        for (const item of section.items) {
            if (item.type === 'autoplan') {
                ret.push(item as IPCAutoPlanItem) ;
            }
        }
    }

    return ret ;
}

function getAutoSelectorItems(form: IPCForm | undefined) : IPCAutoSelectorItem[] {
    const ret: IPCAutoSelectorItem[] = [] ;
    if (!form) {
        return ret ;
    }

    for (const section of form.sections) {
        for (const item of section.items) {
            if (item.type === 'autoselector') {
                ret.push(item as IPCAutoSelectorItem) ;
            }
        }
    }

    return ret ;
}

function compareMatchOrder(a: IPCAutoAnalysisMatchRow, b: IPCAutoAnalysisMatchRow) : number {
    const order = ['qm', 'ef', 'qf', 'sf', 'f'] ;
    const ai = order.indexOf(a.comp_level) ;
    const bi = order.indexOf(b.comp_level) ;
    const ao = ai >= 0 ? ai : 999 ;
    const bo = bi >= 0 ? bi : 999 ;

    if (ao !== bo) {
        return ao - bo ;
    }
    if (a.set_number !== b.set_number) {
        return a.set_number - b.set_number ;
    }
    return a.match_number - b.match_number ;
}

function compareMetricOptions(a: IPCAutoAnalysisMetricOption, b: IPCAutoAnalysisMetricOption) : number {
    if (a.kind !== b.kind) {
        return a.kind.localeCompare(b.kind) ;
    }

    return a.value.localeCompare(b.value) ;
}

function selectionStatus(value: string, matching: IPCAutoAnalysisAuto[]) : { status: IPCAutoAnalysisMatchStatus, matchedAutoKeys: string[] } {
    if (value.length === 0) {
        return { status: 'blank', matchedAutoKeys: [] } ;
    }
    if (value === 'Other') {
        return { status: 'other', matchedAutoKeys: [] } ;
    }
    if (matching.length === 1) {
        return { status: 'matched', matchedAutoKeys: [matching[0].key] } ;
    }
    if (matching.length > 1) {
        return { status: 'ambiguous', matchedAutoKeys: matching.map(a => a.key) } ;
    }
    return { status: 'unknown', matchedAutoKeys: [] } ;
}

function getStringValue(record: DataRecord, key: string) : string {
    const value = record.value(key) ;
    if (!value || DataValue.isNull(value)) {
        return '' ;
    }

    try {
        return DataValue.toString(value) ;
    }
    catch {
        return '' ;
    }
}

function getIntegerValue(record: DataRecord, key: string) : number | undefined {
    const value = record.value(key) ;
    if (!value || DataValue.isNull(value)) {
        return undefined ;
    }

    try {
        return DataValue.toInteger(value) ;
    }
    catch {
        return undefined ;
    }
}

function deriveAlliance(project: Project, record: DataRecord, teamNumber: number) : string {
    const stored = getStringValue(record, 'alliance') ;
    if (stored.length > 0) {
        return stored ;
    }

    const compLevel = getStringValue(record, 'comp_level') ;
    const setNumber = getIntegerValue(record, 'set_number') ;
    const matchNumber = getIntegerValue(record, 'match_number') ;
    if (compLevel.length === 0 || setNumber === undefined || matchNumber === undefined) {
        return '' ;
    }

    const match = project.match_mgr_?.findMatchByInfo(compLevel, setNumber, matchNumber) ;
    if (!match) {
        return '' ;
    }

    if (match.alliances.red.team_keys.some(key => SCBase.keyToTeamNumber(key) === teamNumber)) {
        return 'red' ;
    }
    if (match.alliances.blue.team_keys.some(key => SCBase.keyToTeamNumber(key) === teamNumber)) {
        return 'blue' ;
    }
    return '' ;
}

function getMetricOptions(project: Project) : IPCAutoAnalysisMetricOption[] {
    const options = new Map<string, IPCAutoAnalysisMetricOption>() ;

    for (const col of project.data_mgr_?.teamColumnDescriptors || []) {
        options.set(`team:${col.name}`, {
            value: col.name,
            label: `Team Tag: ${col.name}`,
            kind: 'team-field',
        }) ;
    }

    for (const col of project.data_mgr_?.matchColumnDescriptors || []) {
        options.set(`match:${col.name}`, {
            value: col.name,
            label: `Match Tag: ${col.name}`,
            kind: 'match-field',
        }) ;
    }

    for (const formula of project.formula_mgr_?.formulas || []) {
        options.set(`formula:${formula.name}`, {
            value: formula.name,
            label: `Formula: ${formula.name}`,
            kind: 'formula',
        }) ;
    }

    return [...options.values()].sort(compareMetricOptions) ;
}

function createSpecificDataSet(row: IPCAutoAnalysisMatchRow) : IPCDataSet {
    return {
        name: '',
        formula: '',
        matches: {
            kind: 'specific',
            comp_level: row.comp_level,
            set_number: row.set_number,
            match_number: row.match_number,
        }
    } ;
}

async function evaluateMetricValue(
    project: Project,
    cache: Map<string, IPCTypedDataValue>,
    field: string,
    teamNumber: number,
    row: IPCAutoAnalysisMatchRow
) : Promise<IPCTypedDataValue> {
    const key = `${field}|${teamNumber}|${row.comp_level}|${row.set_number}|${row.match_number}` ;
    if (cache.has(key)) {
        return cache.get(key)! ;
    }

    let value: IPCTypedDataValue ;
    try {
        value = await project.data_mgr_!.getData(createSpecificDataSet(row), field, teamNumber) ;
    }
    catch(err) {
        const obj = err instanceof Error ? err : new Error(String(err)) ;
        value = DataValue.fromError(obj) ;
    }

    cache.set(key, value) ;
    return value ;
}

async function populateSelectedMetrics(
    project: Project,
    matchesByTeam: Map<number, IPCAutoAnalysisMatchRow[]>,
    selectedMetrics: string[],
    cache: Map<string, IPCTypedDataValue>
) {
    if (selectedMetrics.length === 0) {
        return ;
    }

    for (const [teamNumber, rows] of matchesByTeam.entries()) {
        for (const row of rows) {
            for (const selectedMetric of selectedMetrics) {
                const value = await evaluateMetricValue(project, cache, selectedMetric, teamNumber, row) ;
                if (DataValue.isError(value)) {
                    row.metricErrors[selectedMetric] = DataValue.toDisplayString(value) ;
                    delete row.metricValues[selectedMetric] ;
                }
                else {
                    row.metricValues[selectedMetric] = DataValue.toDisplayString(value) ;
                    delete row.metricErrors[selectedMetric] ;
                }
            }
        }
    }
}

async function populateAutoAverages(
    project: Project,
    autosByTeam: Map<number, IPCAutoAnalysisAuto[]>,
    matchesByTeam: Map<number, IPCAutoAnalysisMatchRow[]>,
    averageFormula: string,
    cache: Map<string, IPCTypedDataValue>
) {
    if (averageFormula.length === 0) {
        return ;
    }

    for (const [teamNumber, autos] of autosByTeam.entries()) {
        const rows = matchesByTeam.get(teamNumber) || [] ;
        for (const auto of autos) {
            let sum = 0 ;
            let count = 0 ;

            for (const row of rows) {
                let matched = false ;
                for (const selection of row.selections) {
                    if (selection.matchedAutoKeys.includes(auto.key)) {
                        matched = true ;
                        break ;
                    }
                }

                if (!matched) {
                    continue ;
                }

                const value = await evaluateMetricValue(project, cache, averageFormula, teamNumber, row) ;
                if (DataValue.isNumber(value)) {
                    sum += DataValue.toReal(value) ;
                    count++ ;
                }
            }

            auto.averageCount = count ;
            auto.averageValue = count > 0 ? sum / count : undefined ;
        }
    }
}

export async function generateAutoAnalysisData(project: Project, request?: IPCAutoAnalysisRequest) : Promise<IPCAutoAnalysisPayload> {
    const teamFormObj = project.form_mgr_?.getForm('team') ;
    const matchFormObj = project.form_mgr_?.getForm('match') ;
    const teamForm = teamFormObj instanceof Error ? undefined : teamFormObj ;
    const matchForm = matchFormObj instanceof Error ? undefined : matchFormObj ;
    const plannerItems = getAutoPlanItems(teamForm) ;
    const selectorItems = getAutoSelectorItems(matchForm) ;
    const metricOptions = getMetricOptions(project) ;
    const averageFormulaOptions = [...(project.formula_mgr_?.formulaNames || [])].sort((a, b) => a.localeCompare(b)) ;
    const validMetrics = new Set(metricOptions.map((one) => one.value)) ;
    const validAverageFormulas = new Set(averageFormulaOptions) ;
    const selectedMetrics = Array.isArray(request?.selectedMetrics) ?
        request!.selectedMetrics.filter((one, index, arr) => typeof one === 'string' && validMetrics.has(one) && arr.indexOf(one) === index) :
        [] ;
    const selectedAverageFormula = request?.averageFormula && validAverageFormulas.has(request.averageFormula) ? request.averageFormula : '' ;
    const teamRows = await project.data_mgr_!.getAllTeamData() ;
    const matchRows = await project.data_mgr_!.getAllMatchData() as DataRecord[] ;
    const teams = project.team_mgr_?.getTeams() || [] ;

    const teamNames = new Map<number, string>() ;
    const summaries = new Map<number, IPCAutoAnalysisTeamSummary>() ;
    for (const team of teams) {
        teamNames.set(team.team_number, team.nickname || '') ;
        summaries.set(team.team_number, {
            teamNumber: team.team_number,
            teamName: team.nickname || '',
            autoCount: 0,
            matchCount: 0,
        }) ;
    }

    const autosByTeam = new Map<number, IPCAutoAnalysisAuto[]>() ;
    for (const record of teamRows) {
        const teamNumber = getIntegerValue(record, 'team_number') ;
        if (teamNumber === undefined) {
            continue ;
        }

        if (!summaries.has(teamNumber)) {
            summaries.set(teamNumber, {
                teamNumber: teamNumber,
                teamName: teamNames.get(teamNumber) || '',
                autoCount: 0,
                matchCount: 0,
            }) ;
        }

        const autos: IPCAutoAnalysisAuto[] = autosByTeam.get(teamNumber) || [] ;
        for (const item of plannerItems) {
            const serialized = getStringValue(record, item.tag) ;
            if (serialized.length === 0) {
                continue ;
            }

            for (const auto of parseAutoPlanState(serialized)) {
                autos.push({
                    key: `${item.tag}:${auto.id}`,
                    teamNumber: teamNumber,
                    teamName: teamNames.get(teamNumber) || '',
                    sourceTag: item.tag,
                    fieldImage: item.fieldImage,
                    autoId: auto.id,
                    autoName: auto.name,
                    nodes: auto.nodes,
                    edges: auto.edges,
                    averageCount: 0,
                }) ;
            }
        }

        autosByTeam.set(teamNumber, autos) ;
    }

    for (const [teamNumber, autos] of autosByTeam.entries()) {
        const summary = summaries.get(teamNumber) ;
        if (summary) {
            summary.autoCount = autos.length ;
        }
    }

    const matchesByTeam = new Map<number, IPCAutoAnalysisMatchRow[]>() ;
    for (const record of matchRows) {
        const teamKey = getStringValue(record, 'team_key') ;
        if (teamKey.length === 0) {
            continue ;
        }

        const teamNumber = SCBase.keyToTeamNumber(teamKey) ;
        if (!summaries.has(teamNumber)) {
            summaries.set(teamNumber, {
                teamNumber: teamNumber,
                teamName: teamNames.get(teamNumber) || '',
                autoCount: autosByTeam.get(teamNumber)?.length || 0,
                matchCount: 0,
            }) ;
        }

        const teamAutos = autosByTeam.get(teamNumber) || [] ;
        const selections: IPCAutoAnalysisSelection[] = selectorItems.map(item => {
            const value = getStringValue(record, item.tag) ;
            const matching = teamAutos.filter(auto => auto.autoName === value) ;
            const status = selectionStatus(value, matching) ;
            return {
                tag: item.tag,
                value: value,
                status: status.status,
                matchedAutoKeys: status.matchedAutoKeys,
            } ;
        }) ;

        const compLevel = getStringValue(record, 'comp_level') ;
        const setNumber = getIntegerValue(record, 'set_number') || 0 ;
        const matchNumber = getIntegerValue(record, 'match_number') || 0 ;
        const rows = matchesByTeam.get(teamNumber) || [] ;
        rows.push({
            teamNumber: teamNumber,
            comp_level: compLevel,
            set_number: setNumber,
            match_number: matchNumber,
            alliance: deriveAlliance(project, record, teamNumber),
            selections: selections,
            metricValues: {},
            metricErrors: {},
        }) ;
        matchesByTeam.set(teamNumber, rows) ;
    }

    const valueCache = new Map<string, IPCTypedDataValue>() ;
    await populateSelectedMetrics(project, matchesByTeam, selectedMetrics, valueCache) ;
    await populateAutoAverages(project, autosByTeam, matchesByTeam, selectedAverageFormula, valueCache) ;

    for (const [teamNumber, rows] of matchesByTeam.entries()) {
        rows.sort(compareMatchOrder) ;
        const summary = summaries.get(teamNumber) ;
        if (summary) {
            summary.matchCount = rows.length ;
        }
    }

    const autosObj: { [teamNumber: string]: IPCAutoAnalysisAuto[] } = {} ;
    for (const [teamNumber, autos] of autosByTeam.entries()) {
        autosObj[teamNumber.toString()] = autos ;
    }

    const matchesObj: { [teamNumber: string]: IPCAutoAnalysisMatchRow[] } = {} ;
    for (const [teamNumber, rows] of matchesByTeam.entries()) {
        matchesObj[teamNumber.toString()] = rows ;
    }

    const ret: IPCAutoAnalysisPayload = {
        teams: [...summaries.values()].sort((a, b) => a.teamNumber - b.teamNumber),
        autosByTeam: autosObj,
        matchesByTeam: matchesObj,
        plannerTags: plannerItems.map(item => item.tag),
        selectorTags: selectorItems.map(item => item.tag),
        metricOptions: metricOptions,
        selectedMetrics: selectedMetrics,
        averageFormulaOptions: averageFormulaOptions,
        selectedAverageFormula: selectedAverageFormula,
    } ;

    return ret ;
}
