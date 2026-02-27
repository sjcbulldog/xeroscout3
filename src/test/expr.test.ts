import { expect, test } from "vitest";
import { Expr } from "../shared/expr";
import { IPCDataValue, IPCTypedDataValue } from "../shared/ipc";
import { DataValue } from "../shared/datavalue";

test('bad parse', () => {
    let str = 'mal4 + == 3' ;
    let expr = Expr.parse(str) ;
    expect(expr.hasError()).toBe(true) ;
}) ;

test('expr: prec1', () => {
    let str = '1 + 2 + 3 + 4 != 10' ;
    let expr = Expr.parse(str) ;
    expect(expr).toBeDefined() ;
    expect(expr.hasError()).toBe(false) ;
    let v = expr.evaluate(new Map<string, IPCTypedDataValue>()) ;
    expect(v).toBeDefined() ;
    expect(v.type).toBe('boolean') ;
    expect(v.value).toBe(false) ;
}) ;

test('expr: prec2', () => {
    let str = '1 + 2 * 3 ^ 5 + 6 * 7' ;
    let expr = Expr.parse(str) ;
    expect(expr).toBeDefined() ;
    expect(expr.hasError()).toBe(false) ;
    let s = expr.toString() ;
    let v = expr.evaluate(new Map<string, IPCTypedDataValue>()) ;
    expect(v).toBeDefined() ;
    expect(v.type).toBe('integer') ;
    expect(v.value).toBe(529) ;
}) ;

test('expr: prec3', () => {
    let str = '8 ^ 2 * 3 + 5 * 6 ^ 7' ;
    let expr = Expr.parse(str) ;
    expect(expr).toBeDefined() ;
    expect(expr.hasError()).toBe(false) ;
    let s = expr.toString() ;
    let v = expr.evaluate(new Map<string, IPCTypedDataValue>()) ;
    expect(v).toBeDefined() ;
    expect(v.type).toBe('integer') ;
    expect(v.value).toBe(1399872) ;
}) ;

test('expr: prec4', () => {
    let str = '(ma1 + ma2 + ma3 + ma4 > 0) && (maleave == false)' ;
    let expr = Expr.parse(str) ;
    expect(expr).toBeDefined() ;
    expect(expr.hasError()).toBe(false) ;

    let values : Map<string, IPCTypedDataValue> = new Map<string, IPCTypedDataValue>() ;
    values.set('ma1', DataValue.fromInteger(1)) ;
    values.set('ma2', DataValue.fromInteger(2)) ;
    values.set('ma3', DataValue.fromInteger(3)) ;
    values.set('ma4', DataValue.fromInteger(4)) ;
    values.set('maleave', DataValue.fromBoolean(false)) ;

    let v = expr.evaluate(values) ;
    expect(v).toBeDefined() ;
    expect(v.type).toBe('boolean') ;
    expect(v.value).toBe(true) ;
}) ;

test('expr: eval1', () => {
    let str = '!a == b' ;
    let expr = Expr.parse(str) ;
    expect(expr).toBeDefined() ;
    expect(expr.hasError()).toBe(false) ;

    let values : Map<string, IPCTypedDataValue> = new Map<string, IPCTypedDataValue>() ;
    values.set('a', DataValue.fromBoolean(true)) ;
    values.set('b', DataValue.fromBoolean(false)) ;

    let s = expr.toString() ;
    let v = expr.evaluate(values) ;
    expect(v).toBeDefined() ;
    expect(v.type).toBe('boolean') ;
    expect(v.value).toBe(true) ;
}) ;

test('expr: eval1', () => {
    let str = '!!a == b' ;
    let expr = Expr.parse(str) ;
    expect(expr).toBeDefined() ;
    expect(expr.hasError()).toBe(false) ;

    let values : Map<string, IPCTypedDataValue> = new Map<string, IPCTypedDataValue>() ;
    values.set('a', DataValue.fromBoolean(true)) ;
    values.set('b', DataValue.fromBoolean(false)) ;

    let s = expr.toString() ;
    let v = expr.evaluate(values) ;
    expect(v).toBeDefined() ;
    expect(v.type).toBe('boolean') ;
    expect(v.value).toBe(false) ;
}) ;

test('expr: coral use case', () => {
    let str = 'mal4 + mal3 + mal2 + mal1 != ba_autoCoralCount' ;
    let expr = Expr.parse(str) ;
    expect(expr).toBeDefined() ;
    expect(expr.hasError()).toBe(false) ;

    let values : Map<string, IPCTypedDataValue> = new Map<string, IPCTypedDataValue>() ;
    values.set('mal1', DataValue.fromInteger(1)) ;
    values.set('mal2', DataValue.fromInteger(2)) ;
    values.set('mal3', DataValue.fromInteger(3)) ;
    values.set('mal4', DataValue.fromInteger(4)) ;
    values.set('ba_autoCoralCount', DataValue.fromInteger(8)) ;
    let v = expr.evaluate(values) ;
    expect(v).toBeDefined() ;
    expect(v.type).toBe('boolean') ;
    expect(v.value).toBe(true) ;
}) ;