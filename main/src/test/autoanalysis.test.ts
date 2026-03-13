import { expect, test } from "vitest";
import { parseAutoPlanState } from "../main/project/autoanalysis";

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
