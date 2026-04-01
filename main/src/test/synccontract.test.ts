import { expect, test } from "vitest" ;

import {
    parseProjectInfoPayload,
    stringifyCoachGraphsPayload,
    stringifyScoutResultsPayload,
    validateCoachSyncPreflight,
} from "../shared/synccontract" ;

test("stringifyScoutResultsPayload accepts a valid scout payload", () => {
    const result = stringifyScoutResultsPayload({
        tablet: "Tablet 41",
        purpose: "team",
        results: [
            {
                item: "st-111",
                data: [
                    {
                        tag: "notes",
                        value: {
                            type: "string",
                            value: "ready",
                        },
                    },
                ],
            },
        ],
    }) ;

    expect(result.ok).toBe(true) ;
}) ;

test("stringifyScoutResultsPayload rejects duplicate result items", () => {
    const result = stringifyScoutResultsPayload({
        tablet: "Tablet 41",
        purpose: "team",
        results: [
            { item: "st-111", data: [] },
            { item: "st-111", data: [] },
        ],
    }) ;

    expect(result.ok).toBe(false) ;
    if (!result.ok) {
        expect(result.errors.join("\n")).toContain("duplicates item 'st-111'") ;
    }
}) ;

test("stringifyScoutResultsPayload rejects mismatched typed values", () => {
    const result = stringifyScoutResultsPayload({
        tablet: "Tablet 41",
        purpose: "team",
        results: [
            {
                item: "st-111",
                data: [
                    {
                        tag: "cycles",
                        value: {
                            type: "integer",
                            value: "five",
                        },
                    },
                ],
            },
        ],
    }) ;

    expect(result.ok).toBe(false) ;
    if (!result.ok) {
        expect(result.errors.join("\n")).toContain("expected finite number") ;
    }
}) ;

test("validateCoachSyncPreflight rejects non-coach-owned graph payloads", () => {
    const result = validateCoachSyncPreflight([
        {
            name: "Graph",
            xlabel: "X",
            yleft: "Y",
            yright: "",
            title: "Graph",
            type: "line",
            teams: [111],
            leftitems: [],
            rightitems: [],
            owner: "central",
        },
    ], []) ;

    expect(result.ok).toBe(false) ;
    if (!result.ok) {
        expect(result.errors.join("\n")).toContain("must be 'coach'") ;
    }
}) ;

test("stringifyCoachGraphsPayload rejects unknown keys", () => {
    const result = stringifyCoachGraphsPayload([
        {
            name: "Graph",
            xlabel: "X",
            yleft: "Y",
            yright: "",
            title: "Graph",
            type: "line",
            teams: [111],
            leftitems: [],
            rightitems: [],
            owner: "coach",
            unexpected: true,
        },
    ]) ;

    expect(result.ok).toBe(false) ;
    if (!result.ok) {
        expect(result.errors.join("\n")).toContain("unknown key 'unexpected'") ;
    }
}) ;

test("parseProjectInfoPayload rejects malformed project metadata", () => {
    const result = parseProjectInfoPayload(JSON.stringify({
        uuid_: "event-uuid",
        locked_: true,
        hidden_hints_: [],
        data_info_: {},
    })) ;

    expect(result.ok).toBe(false) ;
    if (!result.ok) {
        expect(result.errors.join("\n")).toContain("data_info_.scouted_team_ expected array") ;
        expect(result.errors.join("\n")).toContain("dataset_info_ expected object") ;
    }
}) ;
