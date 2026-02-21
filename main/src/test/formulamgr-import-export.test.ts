import { expect, test } from "vitest";
import winston from "winston";
import { FormulaInfo, FormulaManager } from "../main/project/formulamgr";

function createManager(appType: "central" | "coach" = "central") {
    const info = new FormulaInfo() ;
    let writes = 0 ;
    const logger = winston.createLogger({
        silent: true,
    }) ;

    const mgr = new FormulaManager(logger, () => {
        writes++ ;
    }, info, appType) ;

    return { mgr, info, getWrites: () => writes } ;
}

test("import valid object adds formulas", () => {
    const { mgr } = createManager("central") ;
    const payload = {
        version: 1,
        formulas: [
            { name: "f1", desc: "d1", formula: "a + b" },
            { name: "f2", desc: "d2", formula: "x > 3" },
        ]
    } ;

    const result = mgr.importFormulas(payload, { duplicatePolicy: "keep" }) ;
    expect(result.read).toBe(2) ;
    expect(result.added).toBe(2) ;
    expect(result.updated).toBe(0) ;
    expect(result.skipped).toBe(0) ;
    expect(mgr.formulas.length).toBe(2) ;
    expect(mgr.formulas[0].owner).toBe("central") ;
});

test("import duplicate with keep skips updates", () => {
    const { mgr } = createManager("central") ;
    mgr.addFormula("f1", "orig", "a + 1") ;

    const payload = {
        version: 1,
        formulas: [
            { name: "f1", desc: "new", formula: "a + 2" },
            { name: "f2", desc: "d2", formula: "b + 3" },
        ]
    } ;

    const result = mgr.importFormulas(payload, { duplicatePolicy: "keep" }) ;
    expect(result.added).toBe(1) ;
    expect(result.updated).toBe(0) ;
    expect(result.skipped).toBe(1) ;
    expect(mgr.formulas.find((f) => f.name === "f1")?.formula).toBe("a + 1") ;
});

test("import duplicate with overwrite updates existing formula", () => {
    const { mgr } = createManager("central") ;
    mgr.addFormula("f1", "orig", "a + 1") ;

    const payload = {
        version: 1,
        formulas: [
            { name: "f1", desc: "new", formula: "a + 2" },
        ]
    } ;

    const result = mgr.importFormulas(payload, { duplicatePolicy: "overwrite" }) ;
    expect(result.added).toBe(0) ;
    expect(result.updated).toBe(1) ;
    expect(result.skipped).toBe(0) ;
    expect(mgr.formulas.find((f) => f.name === "f1")?.desc).toBe("new") ;
    expect(mgr.formulas.find((f) => f.name === "f1")?.formula).toBe("a + 2") ;
});

test("import assigns owner to current app type", () => {
    const { mgr } = createManager("central") ;
    const payload = {
        version: 1,
        formulas: [
            { name: "f1", desc: "d1", formula: "a + b", owner: "coach" },
        ]
    } ;

    mgr.importFormulas(payload, { duplicatePolicy: "keep" }) ;
    expect(mgr.formulas.find((f) => f.name === "f1")?.owner).toBe("central") ;
});

test("import rejects invalid root shape", () => {
    const { mgr } = createManager("central") ;
    const payload = {
        formulas: [{ name: "f1", desc: "d1", formula: "a + b" }]
    } ;

    expect(() => mgr.importFormulas(payload, { duplicatePolicy: "keep" })).toThrowError(/version/) ;
});

test("import rejects invalid entry types", () => {
    const { mgr } = createManager("central") ;
    const payload = {
        version: 1,
        formulas: [{ name: "f1", desc: "d1", formula: 12 }]
    } ;

    expect(() => mgr.importFormulas(payload, { duplicatePolicy: "keep" })).toThrowError(/formula/) ;
});

test("export returns version 1 and excludes owner", () => {
    const { mgr } = createManager("central") ;
    mgr.addFormula("f1", "d1", "x + 1") ;

    const exported = mgr.exportFormulas() ;
    expect(exported.version).toBe(1) ;
    expect(exported.formulas.length).toBe(1) ;
    expect(exported.formulas[0].name).toBe("f1") ;
    expect((exported.formulas[0] as any).owner).toBeUndefined() ;
});

test("export/import round trip preserves formula content", () => {
    const { mgr } = createManager("central") ;
    mgr.addFormula("f1", "d1", "x + 1") ;
    mgr.addFormula("f2", "d2", "y > 3") ;

    const exported = mgr.exportFormulas() ;
    const { mgr: mgr2 } = createManager("coach") ;
    const result = mgr2.importFormulas(exported, { duplicatePolicy: "keep" }) ;
    expect(result.added).toBe(2) ;
    expect(mgr2.formulas.map((f) => f.name).sort()).toEqual(["f1", "f2"]) ;
    expect(mgr2.formulas.find((f) => f.name === "f1")?.formula).toBe("x + 1") ;
    expect(mgr2.formulas.find((f) => f.name === "f2")?.formula).toBe("y > 3") ;
    expect(mgr2.formulas.find((f) => f.name === "f1")?.owner).toBe("coach") ;
});

