import { expect, test } from "vitest" ;
import { SCBase } from "../main/apps/scbase" ;

type MatchLike = {
    comp_level: string ;
    match_number: number | string ;
    set_number: number | string ;
} ;

const compare = (a: MatchLike, b: MatchLike): number => {
    const sortCompFun = (SCBase as any).prototype.sortCompFun as (this: any, x: MatchLike, y: MatchLike) => number ;
    const mapMatchType = (SCBase as any).prototype.mapMatchType as (mtype: string) => number ;
    return sortCompFun.call({ mapMatchType }, a, b) ;
} ;

test("sortCompFun sorts numeric match_number values numerically even when strings", () => {
    const matches: MatchLike[] = [
        { comp_level: "qm", match_number: "10", set_number: "1" },
        { comp_level: "qm", match_number: "2", set_number: "1" },
        { comp_level: "qm", match_number: "1", set_number: "1" },
    ] ;

    matches.sort(compare) ;
    expect(matches.map((m) => Number(m.match_number))).toEqual([1, 2, 10]) ;
}) ;

test("sortCompFun uses set_number as numeric tie-breaker", () => {
    const matches: MatchLike[] = [
        { comp_level: "sf", match_number: "1", set_number: "10" },
        { comp_level: "sf", match_number: "1", set_number: "2" },
        { comp_level: "sf", match_number: "1", set_number: "1" },
    ] ;

    matches.sort(compare) ;
    expect(matches.map((m) => Number(m.set_number))).toEqual([1, 2, 10]) ;
}) ;
