import { expect, test } from "vitest";
import { generateAutoAnalysisData, parseAutoPlanState } from "../main/project/autoanalysis";
import { DataRecord } from "../main/model/datarecord";
import { DataValue } from "../shared/datavalue";
import { IPCAutoPlanItem, IPCAutoSelectorItem, IPCForm } from "../shared/ipc";

test("parseAutoPlanState parses valid multi-auto state", () => {
    const autos = parseAutoPlanState(JSON.stringify({
        version: 1,
        autos: [
            {
                id: "auto-1",
                name: "Left",
                nodes: [
                    { id: "n1", action: "Start", x: 0.1, y: 0.2, end: false },
                    { id: "n2", action: "Shoot", x: 0.5, y: 0.6, end: true }
                ],
                edges: [
                    { id: "e1", from: "n1", to: "n2", cx: 0.3, cy: 0.4 }
                ]
            },
            {
                id: "auto-2",
                name: "Right",
                nodes: [
                    { id: "n3", action: "Start", x: 1.3, y: -0.2, end: false }
                ],
                edges: []
            }
        ]
    })) ;

    expect(autos).toHaveLength(2) ;
    expect(autos[0].name).toBe("Left") ;
    expect(autos[1].nodes[0].x).toBe(1) ;
    expect(autos[1].nodes[0].y).toBe(0) ;
});

test("parseAutoPlanState rejects malformed payloads", () => {
    expect(parseAutoPlanState("not-json")).toEqual([]) ;
    expect(parseAutoPlanState(JSON.stringify({ autos: [{ id: "auto-1", name: "Bad", nodes: [] }] }))).toEqual([]) ;
});

test("generateAutoAnalysisData adds match metric values and per-auto averages", async () => {
    const plannerItem: IPCAutoPlanItem = {
        type: "autoplan",
        tag: "auto_plan",
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fontFamily: "",
        fontSize: 12,
        fontStyle: "",
        fontWeight: "",
        color: "",
        background: "",
        transparent: true,
        datatype: "string",
        fieldImage: "field2025",
        approvedActions: [],
        allowMultipleAutos: true,
    } ;

    const selectorItem: IPCAutoSelectorItem = {
        type: "autoselector",
        tag: "selected_auto",
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fontFamily: "",
        fontSize: 12,
        fontStyle: "",
        fontWeight: "",
        color: "",
        background: "",
        transparent: true,
        datatype: "string",
        fieldImage: "field2025",
    } ;

    const teamForm: IPCForm = {
        purpose: "team",
        tablet: { name: "tablet", size: { width: 0, height: 0 } },
        sections: [{ name: "Auto", items: [plannerItem] }],
    } ;

    const matchForm: IPCForm = {
        purpose: "match",
        tablet: { name: "tablet", size: { width: 0, height: 0 } },
        sections: [{ name: "Auto", items: [selectorItem] }],
    } ;

    const teamRecord = new DataRecord() ;
    teamRecord.addfield("team_number", DataValue.fromInteger(1234)) ;
    teamRecord.addfield("auto_plan", DataValue.fromString(JSON.stringify({
        autos: [
            {
                id: "left",
                name: "Left",
                nodes: [{ id: "n1", action: "Start", x: 0.1, y: 0.2, end: true }],
                edges: [],
            },
            {
                id: "right",
                name: "Right",
                nodes: [{ id: "n2", action: "Start", x: 0.3, y: 0.4, end: true }],
                edges: [],
            }
        ]
    }))) ;

    const match1 = new DataRecord() ;
    match1.addfield("team_key", DataValue.fromString("frc1234")) ;
    match1.addfield("comp_level", DataValue.fromString("qm")) ;
    match1.addfield("set_number", DataValue.fromInteger(1)) ;
    match1.addfield("match_number", DataValue.fromInteger(1)) ;
    match1.addfield("alliance", DataValue.fromString("red")) ;
    match1.addfield("selected_auto", DataValue.fromString("Left")) ;

    const match2 = new DataRecord() ;
    match2.addfield("team_key", DataValue.fromString("frc1234")) ;
    match2.addfield("comp_level", DataValue.fromString("qm")) ;
    match2.addfield("set_number", DataValue.fromInteger(1)) ;
    match2.addfield("match_number", DataValue.fromInteger(2)) ;
    match2.addfield("alliance", DataValue.fromString("blue")) ;
    match2.addfield("selected_auto", DataValue.fromString("Right")) ;

    const metricValues = new Map<string, number>([
        ["qm:1:1:auto_points", 12],
        ["qm:1:2:auto_points", 6],
    ]) ;

    const project: any = {
        form_mgr_: {
            getForm: (purpose: string) => purpose === "team" ? teamForm : matchForm,
        },
        data_mgr_: {
            teamColumnDescriptors: [{ name: "team_number", type: "integer", source: "base", editable: false }],
            matchColumnDescriptors: [{ name: "selected_auto", type: "string", source: "form", editable: false }],
            getAllTeamData: async () => [teamRecord],
            getAllMatchData: async () => [match1, match2],
            getData: async (ds: any, field: string) => {
                const matchKey = `${ds.matches.comp_level}:${ds.matches.set_number}:${ds.matches.match_number}:${field}` ;
                const value = metricValues.get(matchKey) ;
                return value !== undefined ? DataValue.fromInteger(value) : DataValue.fromError(new Error("missing")) ;
            },
        },
        formula_mgr_: {
            formulas: [{ name: "auto_points", desc: "", formula: "score", owner: "central" }],
            formulaNames: ["auto_points"],
        },
        team_mgr_: {
            getTeams: () => [{ team_number: 1234, nickname: "RoboCats" }],
        },
        match_mgr_: {
            findMatchByInfo: () => undefined,
        },
    } ;

    const payload = await generateAutoAnalysisData(project, {
        selectedMetrics: ["auto_points"],
        averageFormula: "auto_points",
    }) ;

    expect(payload.selectedMetrics).toEqual(["auto_points"]) ;
    expect(payload.selectedAverageFormula).toBe("auto_points") ;
    expect(payload.matchesByTeam["1234"][0].metricValues["auto_points"]).toBe("12") ;
    expect(payload.matchesByTeam["1234"][1].metricValues["auto_points"]).toBe("6") ;
    expect(payload.autosByTeam["1234"][0].autoName).toBe("Left") ;
    expect(payload.autosByTeam["1234"][0].averageValue).toBe(12) ;
    expect(payload.autosByTeam["1234"][0].averageCount).toBe(1) ;
    expect(payload.autosByTeam["1234"][1].averageValue).toBe(6) ;
    expect(payload.autosByTeam["1234"][1].averageCount).toBe(1) ;
});
