import { expect, test } from "vitest" ;

import { SCScout, SCScoutInfo } from "../main/apps/scscout" ;
import { IPCNamedDataValue, IPCScoutResult } from "../shared/ipc" ;

function createScout() : any {
    const scout = Object.create(SCScout.prototype) as any ;
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
