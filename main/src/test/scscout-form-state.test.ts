import { expect, test, vi } from "vitest" ;

import { SCScout, SCScoutInfo } from "../main/apps/scscout" ;
import { IPCNamedDataValue, IPCScoutResult } from "../shared/ipc" ;

function createScout() : any {
    const scout = Object.create(SCScout.prototype) as any ;
    scout.sent_ = [] ;
    scout.info_ = new SCScoutInfo() ;
    scout.info_.uuid_ = "event-uuid" ;
    scout.info_.tablet_ = "Tablet 41" ;
    scout.info_.teamform_ = { name: "teamform" } ;
    scout.info_.matchform_ = { name: "matchform" } ;
    scout.current_scout_ = "st-111" ;
    scout.reversed_ = false ;
    scout.alliance_ = "blue" ;
    scout.sendToRenderer = (_name: string, payload: unknown) => {
        scout.lastPayload_ = payload ;
        scout.sent_.push({ name: _name, payload }) ;
    } ;
    return scout ;
}

function createValues(text: string) : IPCNamedDataValue[] {
    return [
        {
            tag: "notes",
            value: {
                type: "string",
                value: text,
            },
        },
        {
            tag: "robot_photo",
            value: {
                type: "string",
                value: "data:image/webp;base64,AAAA",
            },
        },
    ] ;
}

test("sendForm returns cloned initialValues for team scouting", () => {
    const scout = createScout() ;
    const stored = createValues("team-111") ;

    scout.info_.results_ = [
        {
            item: "st-111",
            data: stored,
        },
    ] ;

    scout.sendForm("team") ;

    const payload = scout.lastPayload_ as { initialValues: IPCNamedDataValue[] } ;
    payload.initialValues[0].value.value = "mutated" ;

    expect(stored[0].value.value).toBe("team-111") ;
}) ;

test("cacheTeamResult stores an isolated copy", () => {
    const scout = createScout() ;
    const result: IPCScoutResult = {
        item: "st-111",
        data: createValues("team-111"),
    } ;

    scout["cacheTeamResult"](result) ;
    result.data[0].value.value = "mutated" ;

    expect(scout.info_.team_results_cache_[0].data[0].value.value).toBe("team-111") ;
}) ;

test("getTeamResultFromCache returns a cloned result", () => {
    const scout = createScout() ;
    scout.info_.team_results_cache_ = [
        {
            item: "st-111",
            data: createValues("team-111"),
        },
    ] ;

    const cached = scout["getTeamResultFromCache"]("st-111") as IPCScoutResult ;
    cached.data[0].value.value = "mutated" ;

    expect(scout.info_.team_results_cache_[0].data[0].value.value).toBe("team-111") ;
}) ;

test("syncClient blocks before connect when local scout payload is invalid", async () => {
    const scout = createScout() ;
    scout.info_.purpose_ = "team" ;
    scout.info_.results_ = [
        {
            item: "st-111",
            data: [
                {
                    tag: "cycles",
                    value: {
                        type: "integer",
                        value: "bad",
                    },
                },
            ],
        },
    ] ;

    const connect = vi.fn(() => Promise.resolve()) ;
    const conn = {
        name: () => "test-conn",
        setTraceContext: vi.fn(),
        connect,
        on: vi.fn(),
    } ;

    scout.optionallyGetResults = vi.fn(() => Promise.resolve()) ;
    scout.logSync = vi.fn() ;
    scout.getSyncStateSnapshot = vi.fn(() => ({})) ;

    scout["syncClient"](conn as any) ;
    await Promise.resolve() ;

    expect(connect).not.toHaveBeenCalled() ;
    expect(scout.sent_.some((entry: any) => entry.name === "set-status-title" && entry.payload === "Invalid Local Sync Data")).toBe(true) ;
}) ;

test("provideResults omits null and undefined fields before persisting", () => {
    const scout = createScout() ;
    scout.current_scout_ = "sm-qm-1-1-111" ;
    scout.logSync = vi.fn() ;
    scout.writeEventFile = vi.fn() ;
    scout.logger_ = { silly: vi.fn() } ;

    const input: IPCNamedDataValue[] = [
        {
            tag: "valid_integer",
            value: {
                type: "integer",
                value: 3,
            },
        },
        {
            tag: "null_typed",
            value: {
                type: "null",
                value: null,
            } as any,
        },
        {
            tag: "missing_value",
            value: undefined as any,
        },
        {
            tag: "null_value_object",
            value: null as any,
        },
        {
            tag: "string_null_payload",
            value: {
                type: "string",
                value: null,
            } as any,
        },
    ] ;

    scout.provideResults(input) ;

    expect(scout.info_.results_.length).toBe(1) ;
    expect(scout.info_.results_[0].item).toBe("sm-qm-1-1-111") ;
    expect(scout.info_.results_[0].data.map((entry: IPCNamedDataValue) => entry.tag)).toEqual(["valid_integer"]) ;
}) ;

test("provideResults does not persist when no valid current scout item is active", () => {
    const scout = createScout() ;
    scout.current_scout_ = undefined ;
    scout.logSync = vi.fn() ;
    scout.writeEventFile = vi.fn() ;
    scout.logger_ = { silly: vi.fn() } ;
    scout.resultPromiseResolve_ = vi.fn() ;

    scout.provideResults(createValues("ignored")) ;

    expect(scout.info_.results_.length).toBe(0) ;
    expect(scout.writeEventFile).not.toHaveBeenCalled() ;
    expect(scout.resultPromiseResolve_).toBeUndefined() ;
    expect(scout.sent_.some((entry: any) => entry.name === "set-status-title" && entry.payload === "Invalid Local Scout State")).toBe(true) ;
}) ;

test("provideResults persists when explicit scoutItem is provided even if current scout is undefined", () => {
    const scout = createScout() ;
    scout.current_scout_ = undefined ;
    scout.logSync = vi.fn() ;
    scout.writeEventFile = vi.fn() ;
    scout.logger_ = { silly: vi.fn() } ;

    scout.provideResults(createValues("explicit"), "sm-qm-1-1-111") ;

    expect(scout.info_.results_.length).toBe(1) ;
    expect(scout.info_.results_[0].item).toBe("sm-qm-1-1-111") ;
    expect(scout.writeEventFile).toHaveBeenCalled() ;
}) ;

test("getCurrentResults requests renderer payload for the active scout item", () => {
    const scout = createScout() ;

    scout["sendToRenderer"] = (_name: string, payload: unknown) => {
        scout.sent_.push({ name: _name, payload }) ;
    } ;

    scout["getCurrentResults"]() ;

    const request = scout.sent_.find((entry: any) => entry.name === "request-results") ;
    expect(request).toBeDefined() ;
    expect(request.payload).toEqual({ scoutItem: "st-111" }) ;
    expect(scout.pending_result_request_item_).toBe("st-111") ;
}) ;

test("provideResults prefers pending requested scout item when current scout changed", () => {
    const scout = createScout() ;
    scout.logSync = vi.fn() ;
    scout.writeEventFile = vi.fn() ;
    scout.logger_ = { silly: vi.fn() } ;
    scout.pending_result_request_item_ = "sm-qm-1-1-111" ;
    scout.current_scout_ = "sm-qm-1-2-222" ;

    scout.provideResults(createValues("old-match-values")) ;

    expect(scout.info_.results_.length).toBe(1) ;
    expect(scout.info_.results_[0].item).toBe("sm-qm-1-1-111") ;
    expect(scout.pending_result_request_item_).toBeUndefined() ;
}) ;

test("showSyncValidationError includes diagnostic JSON for local sync validation failures", () => {
    const scout = createScout() ;
    scout.logSync = vi.fn() ;
    scout.info_.results_ = [
        {
            item: undefined as any,
            data: createValues("bad"),
        } as any,
    ] ;

    scout["showSyncValidationError"]("Invalid Local Sync Data", [
        "ScoutSyncPreflight.results[0].item expected string but got undefined",
    ]) ;

    const statusText = scout.sent_.find((entry: any) => entry.name === "set-status-text")?.payload as string ;
    expect(statusText.includes("Diagnostic JSON (copy/paste):")).toBe(true) ;
    expect(statusText.includes("\"failingResultIndex\": 0")).toBe(true) ;
}) ;

test("resetCurrentMatchCmd removes only the active match result and refreshes match form", () => {
    const scout = createScout() ;
    scout.current_scout_ = "sm-qm-1-1-111" ;
    scout.writeEventFile = vi.fn() ;
    scout.logSync = vi.fn() ;
    scout.sendForm = vi.fn() ;
    scout.info_.results_ = [
        {
            item: "sm-qm-1-1-111",
            data: createValues("active"),
        },
        {
            item: "sm-qm-1-2-222",
            data: createValues("other"),
        },
        {
            item: "st-111",
            data: createValues("team"),
        },
    ] ;

    scout["resetCurrentMatchCmd"]() ;

    expect(scout.info_.results_.map((r: IPCScoutResult) => r.item)).toEqual(["sm-qm-1-2-222", "st-111"]) ;
    expect(scout.writeEventFile).toHaveBeenCalledTimes(1) ;
    expect(scout.sendForm).toHaveBeenCalledWith("match") ;
    expect(scout.sent_.some((entry: any) => entry.name === "send-nav-highlight" && entry.payload === "sm-qm-1-1-111")).toBe(true) ;
}) ;

test("executeCommand reset-current-match bypasses optionallyGetResults pre-save flow", () => {
    const scout = createScout() ;
    scout.optionallyGetResults = vi.fn(() => Promise.resolve()) ;
    scout.executeCommandInternal = vi.fn() ;

    scout.executeCommand("reset-current-match") ;

    expect(scout.optionallyGetResults).not.toHaveBeenCalled() ;
    expect(scout.executeCommandInternal).toHaveBeenCalledWith("reset-current-match") ;
}) ;
