import { SCBase } from "../apps/scbase";
import { DataRecord } from "../model/datarecord";
import { Project } from "./project";
import {
    IPCAutoAnalysisAuto,
    IPCAutoAnalysisEdge,
    IPCAutoAnalysisMatchRow,
    IPCAutoAnalysisMatchStatus,
    IPCAutoAnalysisNode,
    IPCAutoAnalysisPayload,
    IPCAutoAnalysisSelection,
    IPCAutoAnalysisTeamSummary,
    IPCAutoPlanItem,
    IPCAutoSelectorItem,
    IPCForm,
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

export async function generateAutoAnalysisData(project: Project) : Promise<IPCAutoAnalysisPayload> {
    const teamFormObj = project.form_mgr_?.getForm('team') ;
    const matchFormObj = project.form_mgr_?.getForm('match') ;
    const teamForm = teamFormObj instanceof Error ? undefined : teamFormObj ;
    const matchForm = matchFormObj instanceof Error ? undefined : matchFormObj ;
    const plannerItems = getAutoPlanItems(teamForm) ;
    const selectorItems = getAutoSelectorItems(matchForm) ;
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
        }) ;
        matchesByTeam.set(teamNumber, rows) ;
    }

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
    } ;

    return ret ;
}
