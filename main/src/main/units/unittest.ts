// import { Expr } from "../expr/expr";

export function runUnitTests() : void {
}


//     console.log("Running unit tests...") ;
    
//     testExpression("1", new Map<string, DataValue>(), DataValue.fromInteger(1)) ;
//     testExpression("0", new Map<string, DataValue>(), DataValue.fromInteger(0)) ;
//     testExpression("-1", new Map<string, DataValue>(), DataValue.fromInteger(-1)) ;
//     testExpression("1.0", new Map<string, DataValue>(), DataValue.fromReal(1.0)) ;
//     testExpression("0.0", new Map<string, DataValue>(), DataValue.fromReal(0.0)) ;
//     testExpression("-1.0", new Map<string, DataValue>(), DataValue.fromReal(-1.0)) ;
//     testExpression("1.2e2", new Map<string, DataValue>(), DataValue.fromReal(120.0)) ;
//     testExpression("1.2e-2", new Map<string, DataValue>(), DataValue.fromReal(0.012)) ;

//     testExpression("true", new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression("false", new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;

//     testExpression("1 + 2", new Map<string, DataValue>(), DataValue.fromInteger(3)) ;
//     testExpression("10 - 4", new Map<string, DataValue>(), DataValue.fromInteger(6)) ;
//     testExpression("2 * 3", new Map<string, DataValue>(), DataValue.fromInteger(6)) ;
//     testExpression("8 / 2", new Map<string, DataValue>(), DataValue.fromInteger(4)) ;
//     testExpression("2 ^ 3", new Map<string, DataValue>(), DataValue.fromInteger(8)) ;
//     testExpression("9 % 4", new Map<string, DataValue>(), DataValue.fromInteger(1)) ;
//     testExpression("3 == 3", new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression("3 == 4", new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;
//     testExpression("3 != 4", new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression("3 != 3", new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;
//     testExpression("3 < 4", new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression("3 < 3", new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;
//     testExpression ("4 < 3", new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;
//     testExpression("3 <= 4", new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression("3 <= 3", new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression("4 <= 3", new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;
//     testExpression("3 > 4", new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;
//     testExpression("3 > 3", new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;
//     testExpression("4 > 3", new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression("3 >= 4", new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;
//     testExpression("3 >= 3", new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression("4 >= 3", new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;

//     testExpression("1 + 2 * 3", new Map<string, DataValue>(), DataValue.fromInteger(7)) ;
//     testExpression("1 + 2 * 3 - 4", new Map<string, DataValue>(), DataValue.fromInteger(3)) ;
//     testExpression("1 + 2 * 3 - 4 / 2", new Map<string, DataValue>(), DataValue.fromInteger(5)) ;
//     testExpression("(1 + 2) * (3 - 4)", new Map<string, DataValue>(), DataValue.fromInteger(-3)) ;

//     testExpression("true && true", new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression("true && false", new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;
//     testExpression("false && true", new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;
//     testExpression("false && false", new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;
//     testExpression("true || true", new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression("true || false", new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression("false || true", new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression("false || false", new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;

//     testExpression("'hello' + ' ' + 'world'", new Map<string, DataValue>(), DataValue.fromString("hello world")) ; 
//     testExpression('"hello" < "world"', new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression('"hello" > "world"', new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;
//     testExpression('"hello" == "world"', new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;
//     testExpression('"hello" != "world"', new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression('"hello" <= "world"', new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression('"hello" >= "world"', new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;
//     testExpression('"hello" == "hello"', new Map<string, DataValue>(), DataValue.fromBoolean(true)) ;
//     testExpression('"hello" != "hello"', new Map<string, DataValue>(), DataValue.fromBoolean(false)) ;

//     testExpression("abs(-4)", new Map<string, DataValue>(), DataValue.fromInteger(4)) ;
//     testExpression("abs(-4.2)", new Map<string, DataValue>(), DataValue.fromReal(4.2)) ;
//     testExpression("abs(4)", new Map<string, DataValue>(), DataValue.fromInteger(4)) ;
//     testExpression("abs(4.2)", new Map<string, DataValue>(), DataValue.fromReal(4.2)) ;
    
//     testExpression("[1.1, 2.2, 3.3]", new Map<string, DataValue>(), DataValue.fromArray([DataValue.fromReal(1.1), DataValue.fromReal(2.2), DataValue.fromReal(3.3)])) ;
//     testExpression("average(1.0, 2, 3.0)", new Map<string, DataValue>(), DataValue.fromReal(2.0)) ;
//     testExpression("average([1.0, 2, 3.0])", new Map<string, DataValue>(), DataValue.fromReal(2.0)) ;
//     testExpression("average([1.0, 2, 3.0], 4)", new Map<string, DataValue>(), DataValue.fromReal(2.5)) ;
//     testExpression("average([1.0, 2, 3.0], 4, 5)", new Map<string, DataValue>(), DataValue.fromReal(3.0)) ;
//     testExpression("average([1.0, 2, 3.0], [4, 5, 6])", new Map<string, DataValue>(), DataValue.fromReal(3.5)) ;

//     testExpression("median(1, 2, 3)", new Map<string, DataValue>(), DataValue.fromReal(2)) ;
//     testExpression("median([1, 2, 3, 4])", new Map<string, DataValue>(), DataValue.fromReal(2.5)) ; 

//     testExpression("int(1.2)", new Map<string, DataValue>(), DataValue.fromInteger(1)) ;
//     testExpression("int(-1.8)", new Map<string, DataValue>(), DataValue.fromInteger(-1)) ;

//     testExpression("int(1000.0 * stddev(1, 2, 3, 4, 5, 6, 7, 8, 9, 10))", new Map<string, DataValue>(), DataValue.fromInteger(2872)) ;

//     let vars = new Map<string, DataValue>() ;
//     vars.set("x", DataValue.fromInteger(2)) ;
//     vars.set("y", DataValue.fromInteger(3)) ;
//     testExpression("x + y", vars, DataValue.fromInteger(5)) ;

//     vars.clear() ;
//     vars.set("xxx", DataValue.fromString("hello")) ;
//     vars.set("yyy", DataValue.fromString(" ")) ;
//     vars.set("zzz", DataValue.fromString("world")) ;
//     testExpression("xxx + yyy + zzz", vars, DataValue.fromString("hello world")) ;
// }

// function testExpression(exprstr: string, vars: Map<string, DataValue>, expected: DataValue) : boolean {
//     let expr = Expr.parse(exprstr) ;
//     if (expr.hasError()) {
//         console.log(`Error parsing expression '${expr.getString()}: ${expr.getErrorMessage()} `) ;
//         return false ;
//     }

//     let v = expr.evaluate(vars) ;
//     if (v instanceof Error) {
//         console.log("Error evaluating expression: " + v.message) ;
//         return false ;
//     }

//     if (!v.equals(expected)) {
//         console.log(`Error: expression '${exprstr}': expected ${expected.toValueString()}, got ${v.toValueString()}`) ;
//         return false ;
//     }

//     console.log(`Passed: expression '${exprstr}' evaluated to ${v.toValueString()}`) ;  
//     return true ;
// }