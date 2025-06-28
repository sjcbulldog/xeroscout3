import { expect, test } from "vitest";
import { Expr } from "../shared/expr";
import { IPCDataValue, IPCTypedDataValue } from "../shared/ipc";
import { DataValue } from "../shared/datavalue";

test('expr: bad parse', () => {
    let str = 'mal4 + == 3' ;
    let expr = Expr.parse(str) ;
    expect(expr.hasError()).toBe(true) ;
}) ;

test('expr: precedence', () => {
    let str = '1 + 2 + 3 + 4 != 10' ;
    let expr = Expr.parse(str) ;
    expect(expr).toBeDefined() ;
    expect(expr.hasError()).toBe(false) ;
    let v = expr.evaluate(new Map<string, IPCTypedDataValue>()) ;
    expect(v).toBeDefined() ;
    expect(v.type).toBe('boolean') ;
    expect(v.value).toBe(false) ;
}) ;

// test('expr', () => {
//     let str = 'mal4 + mal3 + mal2 + mal1 != ba_autoCoralCount' ;
//     let expr = Expr.parse(str) ;
//     expect(expr).toBeDefined() ;
//     expect(expr.hasError()).toBe(false) ;

//     let values : Map<string, IPCTypedDataValue> = new Map<string, IPCTypedDataValue>() ;
//     values.set('mal1', DataValue.fromInteger(1)) ;
//     values.set('mal2', DataValue.fromInteger(2)) ;
//     values.set('mal3', DataValue.fromInteger(3)) ;
//     values.set('mal4', DataValue.fromInteger(4)) ;
//     values.set('ba_autoCoralCount', DataValue.fromInteger(10)) ;
//     let v = expr.evaluate(values) ;
//     expect(v).toBeDefined() ;
//     expect(v.type).toBe('boolean') ;
//     expect(v.value).toBe(true) ;
// }) ;