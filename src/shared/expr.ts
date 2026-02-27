import { DataValue } from "./datavalue.js";
import { IPCDataValueType, IPCTypedDataValue } from "./ipc.js";

export interface IPCFunctionDef {
	name: string ;
}

export abstract class ExprNode {
	abstract getValue(varvalues: Map<string, IPCTypedDataValue>): IPCTypedDataValue  ;
	abstract variables(vars: string[]): void ;
	abstract toString() : string ;
}

export class ExprValue extends ExprNode {
	private value_: IPCTypedDataValue;

	constructor(public value: IPCTypedDataValue) {
		super();
		this.value_ = value;
	}

	public getValue(varvalues: Map<string, IPCTypedDataValue>): IPCTypedDataValue {
		return this.value_;
	}

	public variables(vars: string[]): void {
	}

	public toString(): string {
		return DataValue.toDisplayString(this.value_) ;
	}
}

export class ExprVariable extends ExprNode {
	private name_: string;

	constructor(name: string) {
		super();
		this.name_ = name;
	}

	public variables(vars: string[]): void {
		if (!vars.includes(this.name_)) {
			vars.push(this.name_);
		}
	}

	public getValue(varvalues: Map<string, IPCTypedDataValue>): IPCTypedDataValue {
		if (varvalues.has(this.name_)) {
			return varvalues.get(this.name_)!;
		}

		return {
			type: "error",
			value: new Error(`reference to undefined variable ${this.name_}`),
		};
	}

	public toString(): string {
		return this.name_;
	}
}

export class ExprFunctionDef {
	private name_: string;
	private argcnt_: number;
	private func_: (args: IPCTypedDataValue[]) => IPCTypedDataValue;

	public constructor(
		name: string,
		argcnt: number,
		func: (args: IPCTypedDataValue[]) => IPCTypedDataValue
	) {
		this.name_ = name;
		this.argcnt_ = argcnt;
		this.func_ = func;
	}

	public getValue(args: IPCTypedDataValue[]): IPCTypedDataValue {
		return this.func_(args);
	}

	public getName(): string {
		return this.name_;
	}

	public getArgCount(): number {
		return this.argcnt_;
	}
}

export class ExprFunction extends ExprNode {
	private args_?: ExprNode[];
	private name_: string;
	private func_: ExprFunctionDef;

	constructor(name: string, args: ExprNode[], fun: ExprFunctionDef) {
		super();
		this.name_ = name;
		this.func_ = fun;
		this.args_ = args;
	}

	public toString(): string {
		return `(${this.name_}${this.args_ ? ", " + this.args_.map(arg => arg.toString()).join(", ") : ""})`;
	}

	public variables(vars: string[]): void {
		if (this.args_) {
			for (let arg of this.args_) {
				arg.variables(vars);
			}
		}
	}

	public getValue(varvalues: Map<string, IPCTypedDataValue>): IPCTypedDataValue {
		if (!this.args_) {
			return {
				type: "error",
				value: new Error("no arguments for function " + this.name_),
			};
		}

		const args: IPCTypedDataValue[] = [];
		for (const arg of this.args_) {
			args.push(arg.getValue(varvalues));
		}

		if (
			args.length !== this.func_.getArgCount() &&
			this.func_.getArgCount() >= 0
		) {
			return {
				type: "error",
				value: new Error(
					`Invalid number of arguments for function '${this.name_}'`
				),
			};
		}

		return this.func_.getValue(args);
	}
}

export class ExprOperator extends ExprNode {
	private which_: string;
	private args_?: ExprNode[];

	constructor(which: string) {
		super();
		this.which_ = which;
	}

	public toString(): string {
		if (!this.args_ || this.args_.length === 0) {
			return this.which_;
		}
		else if (this.args_.length === 1) {	
			return `(${this.which_} ${this.args_[0].toString()})`;
		}
		return `(${this.args_.map(arg => arg.toString()).join(` ${this.which_} `)})`;
	}

	public variables(vars: string[]): void {
		if (this.args_) {
			for (let arg of this.args_) {
				arg.variables(vars);
			}
		}
	}

	public setArgs(args: ExprNode[]) {
		this.args_ = args;
	}

	public operatorPrecedence(): number {
		switch (this.which_) {
			case "^":
				return 1;

			case "!":
				return 2;				

			case "*":
			case "/":
			case "%":
				return 3;

			case "+":
			case "-":
				return 4;

			case "<":
			case "<=":
			case ">":
			case ">=":
				return 6;

			case "==":
			case "!=":
				return 7;

			case "&&":
				return 11;

			case "||":
				return 12;

			default:
				throw new Error('Invalid operator: ' + this.which_);
		}
	}

	public getValue(varvalues: Map<string, IPCTypedDataValue>): IPCTypedDataValue {
		if (!this.args_) {
			return {
				type: "error",
				value: new Error("no arguments for operator " + this.which_),
			};
		}

		const args: IPCTypedDataValue[] = [];
		for (const arg of this.args_) {
			args.push(arg.getValue(varvalues));
		}

		let ret: IPCTypedDataValue = {
			type: "error",
			value: new Error("invalid operator " + this.which_),
		};

		switch (this.which_) {
			case "+":
				ret = this.operPlus(args[0], args[1]);
				break;
			case "-":
				ret = this.operMinus(args[0], args[1]);
				break;
			case "*":
				ret = this.operMul(args[0], args[1]);
				break;
			case "/":
				ret = this.operDiv(args[0], args[1]);
				break;
			case "%":
				ret = this.operMod(args[0], args[1]);
				break;
			case "^":
				ret = this.operPow(args[0], args[1]);
				break;
			case "==":
				ret = this.operEqual(args[0], args[1]);
				break;
			case "!=":
				ret = this.operNotEqual(args[0], args[1]);
				break;
			case "<":
				ret = this.operLess(args[0], args[1]);
				break;
			case "<=":
				ret = this.operLessEqual(args[0], args[1]);
				break;
			case ">":
				ret = this.operGreater(args[0], args[1]);
				break;
			case ">=":
				ret = this.operGreaterEqual(args[0], args[1]);
				break;
			case "&&":
				ret = this.operAnd(args[0], args[1]);
				break;
			case "||":
				ret = this.operOr(args[0], args[1]);
				break;
			case "!":
				ret = this.operNot(args[0]);
				break;
		}
		return ret;
	}

	private operPlus(a: IPCTypedDataValue, b: IPCTypedDataValue): IPCTypedDataValue {
		let ret: IPCTypedDataValue = {
			type: "error" as IPCDataValueType,
			value: new Error("operatorn + invalid argument types"),
		};

		if (
			DataValue.isString(a) &&
			DataValue.isString(b)
		) {
			ret = {
				type: "string",
				value: (a.value as string) + (b.value as string),
			};
		} else if (
			DataValue.isInteger(a) &&
			DataValue.isInteger(b)
		) {
			ret = {
				type: "integer",
				value: (a.value as number) + (b.value as number),
			};
		} else if (
			DataValue.isNumber(a) &&
			DataValue.isNumber(b)
		) {
			ret = {
				type: "real",
				value: (a.value as number) + (b.value as number),
			};
		}

		return ret;
	}

	private operMinus(a: IPCTypedDataValue, b: IPCTypedDataValue): IPCTypedDataValue {
		let ret: IPCTypedDataValue = {
			type: "error" as IPCDataValueType,
			value: new Error("operatorn + invalid argument types"),
		};

		if (
			DataValue.isInteger(a) &&
			DataValue.isInteger(b)
		) {
			ret = {
				type: "integer",
				value: (a.value as number) - (b.value as number),
			};
		} else if (
			DataValue.isNumber(a) &&
			DataValue.isNumber(b)
		) {
			ret = {
				type: "real",
				value: (a.value as number) - (b.value as number),
			};
		}

		return ret;
	}

	private operMul(a: IPCTypedDataValue, b: IPCTypedDataValue): IPCTypedDataValue {
		let ret: IPCTypedDataValue = {
			type: "error" as IPCDataValueType,
			value: new Error("operatorn + invalid argument types"),
		};

		if (
			DataValue.isInteger(a) &&
			DataValue.isInteger(b)
		) {
			ret = {
				type: "integer",
				value: (a.value as number) * (b.value as number),
			};
		} else if (
			DataValue.isNumber(a) &&
			DataValue.isNumber(b)
		) {
			ret = {
				type: "real",
				value: (a.value as number) * (b.value as number),
			};
		}

		return ret;
	}

	private operDiv(a: IPCTypedDataValue, b: IPCTypedDataValue): IPCTypedDataValue {
		let ret: IPCTypedDataValue = {
			type: "error" as IPCDataValueType,
			value: new Error("operatorn + invalid argument types"),
		};

		if (
			DataValue.isInteger(a) &&
			DataValue.isInteger(b)
		) {
			// integer division
			if ((b.value as number) === 0) {
				ret = {
					type: "error" as IPCDataValueType,
					value: new Error("division by zero"),
				};
			} else {
				ret = {
					type: "integer",
					value: Math.floor((a.value as number) / (b.value as number)),
				};
			}
		} else if (
			DataValue.isNumber(a) &&
			DataValue.isNumber(b)
		) {
			if ((b.value as number) === 0.0) {
				ret = {
					type: "error" as IPCDataValueType,
					value: new Error("division by zero"),
				};
			} else {
				ret = {
					type: "real",
					value: (a.value as number) / (b.value as number),
				};
			}
		}

		return ret;
	}

	private operMod(a: IPCTypedDataValue, b: IPCTypedDataValue): IPCTypedDataValue {
		let ret: IPCTypedDataValue = {
			type: "error" as IPCDataValueType,
			value: new Error("operatorn + invalid argument types"),
		};

		if (
			DataValue.isInteger(a) &&
			DataValue.isInteger(b)
		) {
			if ((b.value as number) === 0) {
				ret = {
					type: "error" as IPCDataValueType,
					value: new Error("division by zero"),
				};
			} else {
				ret = {
					type: "integer",
					value: (a.value as number) % (b.value as number),
				};
			}
		} else if (
			DataValue.isNumber(a) &&
			DataValue.isNumber(b)
		) {
			if ((b.value as number) === 0.0) {
				ret = {
					type: "error" as IPCDataValueType,
					value: new Error("division by zero"),
				};
			} else {
				ret = {
					type: "real",
					value: (a.value as number) % (b.value as number),
				};
			}
		}

		return ret;
	}

	private operPow(a: IPCTypedDataValue, b: IPCTypedDataValue): IPCTypedDataValue {
		let ret: IPCTypedDataValue = {
			type: "error" as IPCDataValueType,
			value: new Error("operatorn + invalid argument types"),
		};

		if (
			DataValue.isInteger(a) &&
			DataValue.isInteger(b)
		) {
			if ((b.value as number) === 0) {
				ret = {
					type: "integer",
					value: 1,
				};
			} else if ((a.value as number) === 0) {
				ret = {
					type: "integer",
					value: 0,
				};
			} else {
				ret = {
					type: "integer",
					value: Math.pow((a.value as number), (b.value as number)),
				};
			}
		} else if (
			DataValue.isNumber(a) &&
			DataValue.isNumber(b)
		) {
			if ((b.value as number) === 0.0) {
				ret = {
					type: "real",
					value: 1.0,
				};
			} else if ((a.value as number) === 0.0) {
				ret = {
					type: "real",
					value: 0.0,
				};
			} else {
				ret = {
					type: "real",
					value: Math.pow((a.value as number), (b.value as number)),
				};
			}
		}

		return ret;
	}

	private operEqual(a: IPCTypedDataValue, b: IPCTypedDataValue): IPCTypedDataValue {
		let ret: IPCTypedDataValue = {
			type: "error" as IPCDataValueType,
			value: new Error("operatorn + invalid argument types"),
		};

		if (DataValue.isString(a) && DataValue.isString(b)) {
			ret = {
				type: "boolean",
				value: a.value === b.value,
			};
		} else if (DataValue.isNumber(a) &&	DataValue.isNumber(b)) {
			ret = {
				type: "boolean",
				value: a.value === b.value,
			};
		}
		else if (DataValue.isBoolean(a) && DataValue.isBoolean(b)) {
			ret = {
				type: "boolean",
				value: a.value === b.value,
			};	
		}

		return ret;
	}

	private operNotEqual(a: IPCTypedDataValue, b: IPCTypedDataValue): IPCTypedDataValue {
		let ret: IPCTypedDataValue = {
			type: "error" as IPCDataValueType,
			value: new Error("operatorn + invalid argument types"),
		};

		if (DataValue.isString(a) && DataValue.isString(b)) {
			ret = {
				type: "boolean",
				value: a.value !== b.value,
			};
		} else if (DataValue.isNumber(a) &&	DataValue.isNumber(b)) {
			ret = {
				type: "boolean",
				value: a.value !== b.value,
			};
		}
		else if (DataValue.isBoolean(a) && DataValue.isBoolean(b)) {
			ret = {
				type: "boolean",
				value: a.value !== b.value,
			};	
		}

		return ret;
	}

	private operLess(a: IPCTypedDataValue, b: IPCTypedDataValue): IPCTypedDataValue {
		let ret: IPCTypedDataValue = {
			type: "error" as IPCDataValueType,
			value: new Error("operatorn + invalid argument types"),
		};

		if (
			DataValue.isString(a) &&
			DataValue.isString(b)
		) {
			ret = {
				type: "boolean",
				value: a.toString() < b.toString(),
			};
		} else if (
			DataValue.isNumber(a) &&
			DataValue.isNumber(b)
		) {
			ret = {
				type: "boolean",
				value: (a.value as number) < (b.value as number),
			}
		}

		return ret;
	}

	private operLessEqual(a: IPCTypedDataValue, b: IPCTypedDataValue): IPCTypedDataValue {
		let ret: IPCTypedDataValue = {
			type: "error" as IPCDataValueType,
			value: new Error("operatorn + invalid argument types"),
		};

		if (
			DataValue.isString(a) &&
			DataValue.isString(b)
		) {
			ret = {
				type: "boolean",
				value: (a.value as string) <= (b.value as string),
			};
		} else if (
			DataValue.isNumber(a) &&
			DataValue.isNumber(b)
		) {
			ret = {
				type: "boolean",
				value: (a.value as number) <= (b.value as number),
			};
		}

		return ret;
	}

	private operGreater(a: IPCTypedDataValue, b: IPCTypedDataValue): IPCTypedDataValue {
		let ret: IPCTypedDataValue = {
			type: "error" as IPCDataValueType,
			value: new Error("operatorn + invalid argument types"),
		};

		if (
			DataValue.isString(a) &&
			DataValue.isString(b)
		) {
			ret = {
				type: "boolean",
				value: (a.value as string) > (b.value as string),
			};
		} else if (
			DataValue.isNumber(a) &&
			DataValue.isNumber(b)
		) {
			ret = {
				type: "boolean",
				value: (a.value as number) > (b.value as number),
			};
		}

		return ret;
	}

	private operGreaterEqual(a: IPCTypedDataValue, b: IPCTypedDataValue): IPCTypedDataValue {
		let ret: IPCTypedDataValue = {
			type: "error" as IPCDataValueType,
			value: new Error("operatorn + invalid argument types"),
		};

		if (
			DataValue.isString(a) &&
			DataValue.isString(b)
		) {
			ret = {
				type: "boolean",
				value: (a.value as string) >= (b.value as string),
			};
		} else if (
			DataValue.isNumber(a) &&
			DataValue.isNumber(b)
		) {
			ret = {
				type: "boolean",
				value: (a.value as number) >= (b.value as number),
			};
		}

		return ret;
	}

	private operAnd(a: IPCTypedDataValue, b: IPCTypedDataValue): IPCTypedDataValue {
		let ret: IPCTypedDataValue = {
			type: "error" as IPCDataValueType,
			value: new Error("operatorn + invalid argument types"),
		};

		if (
			DataValue.isBoolean(a) &&
			DataValue.isBoolean(b)
		) {
			ret = {
				type: "boolean",
				value: a.value && b.value,
			};
		}

		return ret;
	}

	private operOr(a: IPCTypedDataValue, b: IPCTypedDataValue): IPCTypedDataValue {
		let ret: IPCTypedDataValue = {
			type: "error" as IPCDataValueType,
			value: new Error("operatorn + invalid argument types"),
		};

		if (
			DataValue.isBoolean(a) &&
			DataValue.isBoolean(b)
		) {
			ret = {
				type: "boolean",
				value: a.value || b.value,
			};
		}

		return ret;
	}

	private operNot(a: IPCTypedDataValue): IPCTypedDataValue {
		let ret: IPCTypedDataValue = {
			type: "error" as IPCDataValueType,
			value: new Error("operatorn + invalid argument types"),
		};

		if (DataValue.isBoolean(a)) {
			ret = {
				type: "boolean",
				value: !a.value,
			};
		}

		return ret;
	}
}

class ExprArray extends ExprNode {
	private args_: ExprNode[];

	constructor(args: ExprNode[]) {
		super();
		this.args_ = args;
	}

	public toString(): string {
		return `[${this.args_.map(arg => arg.toString()).join(", ")}]`;
	}

	public variables(vars: string[]): void {
		if (this.args_) {
			for (let arg of this.args_) {
				arg.variables(vars);
			}
		}
	}

	public getValue(varvalues: Map<string, IPCTypedDataValue>): IPCTypedDataValue {
		const args: IPCTypedDataValue[] = [];
		for (const arg of this.args_) {
			args.push(arg.getValue(varvalues));
		}

		return {
			type: "array",
			value: args,
		};
	}
}

export class Expr {
	private expr_: ExprNode | null;
	private err_: Error | null;
	private str_: string;

	private static inited_: boolean = false;
	private static functions_: Map<string, ExprFunctionDef> = new Map<string, ExprFunctionDef>();

	private constructor(str: string, node: ExprNode | null, err: Error | null) {
		this.expr_ = node;
		this.err_ = err;
		this.str_ = str;
	}

	public static availableFunctions() : IPCFunctionDef[] {
		if (!Expr.inited_) {
			Expr.initFunctions();
		}

		let ret: IPCFunctionDef[] = [];
		for (let func of Expr.functions_.values()) {
			ret.push({
				name: func.getName(),
			}) ;
		}
		return ret;
	}

	public static registerFunction(
		name: string,
		argcnt: number,
		func: (args: IPCTypedDataValue[]) => IPCTypedDataValue
	): void {
		if (Expr.functions_.has(name)) {
			throw new Error("Function already registered");
		}
		Expr.functions_.set(name, new ExprFunctionDef(name, argcnt, func));
	}

	public toString(orig?: boolean) : string {
		if (orig) {
			return this.str_;
		}
		else if (this.hasError()) {
			return `error: ${this.getErrorMessage()}`;
		}
		return this.expr_!.toString() ;
	}

	public hasError(): boolean {
		return this.err_ !== null;
	}

	public getError(): Error | null {
		return this.err_;
	}

	public getErrorMessage(): string {
		if (this.err_) {
			return this.err_.message;
		}
		return "";
	}

	public getString(): string {
		return this.str_;
	}

	public evaluate(varvalues: Map<string, IPCTypedDataValue>): IPCTypedDataValue {
		if (this.hasError()) {
			return {
				type: "error",
				value: this.err_,
			};
		}
		let ret = this.expr_!.getValue(varvalues);
		return ret;
	}

	public variables(): string[] {
		let ret: string[] = [];
		if (this.expr_) {
			this.expr_.variables(ret);
		}
		return ret;
	}

	public static parse(str: string): Expr {
		if (!Expr.inited_) {
			Expr.initFunctions();
		}

		let result = Expr.parseNode(str, 0);
		if (result instanceof Error) {
			return new Expr(str, null, result as Error);
		}

		let index = Expr.skipSpaces(str, result[0]);
		if (index != str.length) {
			return new Expr(str, null, new Error("Invalid expression"));
		}

		return new Expr(str, result[1], null);
	}

	private static initFunctions(): void {
		Expr.registerFunction("int", 1, (args: IPCTypedDataValue[]) => {
			let ret: IPCTypedDataValue;

			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function int"),
				};
			}

			if (DataValue.isInteger(args[0])) {
				ret = args[0];
			} else if (DataValue.isReal(args[0])) {
				if ((args[0].value as number) > Number.MAX_SAFE_INTEGER) {
					ret = {
						type: "error",
						value: new Error("Integer overflow"),
					};
				} else if ((args[0].value as number) < Number.MIN_SAFE_INTEGER) {
					ret = {
						type: "error",
						value: new Error("Integer underflow"),
					};
				} else if ((args[0].value as number) > 0) {
					ret = {
						type: "integer",
						value: Math.floor((args[0].value as number)),
					};
				} else {
					ret = {
						type: "integer",
						value: Math.ceil((args[0].value as number)),
					};
				}
			} else {
				ret = {
					type: "error",
					value: new Error("Invalid argument type for function int"),
				};
			}
			return ret;
		});

		Expr.registerFunction("abs", 1, (args: IPCTypedDataValue[]) => {
			let ret: IPCTypedDataValue;

			if (args.length !== 1) {
				ret = {
					type: "error",
					value: new Error("Invalid number of arguments for function abs"),
				};
			} else if (DataValue.isInteger(args[0])) {
				ret = {
					type: "integer",
					value: Math.abs((args[0].value as number)),
				};
			} else if (DataValue.isReal(args[0])) {
				ret = {
					type: "real",
					value: Math.abs((args[0].value as number)),
				};
			} else {
				ret = {
					type: "error",
					value: new Error("Invalid argument type for function abs"),
				};
			}
			return ret;
		});

		Expr.registerFunction("ceil", 1, (args: IPCTypedDataValue[]) => {
			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function ceil"),
				};
			}
			return {
				type: "integer",
				value: Math.ceil((args[0].value as number)),
			};
		});

		Expr.registerFunction("floor", 1, (args: IPCTypedDataValue[]) => {
			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function floor"),
				};
			}
			return {
				type: "integer",
				value: Math.floor((args[0].value as number)),
			};
		});

		Expr.registerFunction("round", 1, (args: IPCTypedDataValue[]) => {
			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function round"),
				};
			}
			return {
				type: "integer",
				value: Math.round((args[0].value as number)),
			}
		}) ;

		Expr.registerFunction("sqrt", 1, (args: IPCTypedDataValue[]) => {
			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function sqrt"),
				};
			}

			return {
				type: "real",
				value: Math.sqrt((args[0].value as number)),
			}
		}) ;

		Expr.registerFunction("sin", 1, (args: IPCTypedDataValue[]) => {
			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function sin"),
				};
			}
			return {
				type: "real",
				value: Math.sin((args[0].value as number)),
			}
		});

		Expr.registerFunction("cos", 1, (args: IPCTypedDataValue[]) => {
			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function cos"),
				};
			}

			return {
				type: "real",
				value: Math.cos((args[0].value as number)),
			}
		});

		Expr.registerFunction("tan", 1, (args: IPCTypedDataValue[]) => {
			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function tan"),
				};
			}
			return {
				type: "real",
				value: Math.tan((args[0].value as number)),
			}
		});

		Expr.registerFunction("asin", 1, (args: IPCTypedDataValue[]) => {
			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function asin"),
				};
			}
			return {
				type: "real",
				value: Math.asin((args[0].value as number)),
			}
		});

		Expr.registerFunction("acos", 1, (args: IPCTypedDataValue[]) => {
			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function acos"),
				};
			}
				return {
						type: "real",
						value: Math.acos((args[0].value as number)),
				}
		});

		Expr.registerFunction("atan", 1, (args: IPCTypedDataValue[]) => {
			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function atan"),
				};
			}
				return {
						type: "real",
						value: Math.atan((args[0].value as number)),
				}
		});

		Expr.registerFunction("atan2", 2, (args: IPCTypedDataValue[]) => {
			if (args.length !== 2) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function atan2"),
				};
			}
				return {
						type: "real",
						value: Math.atan2((args[0].value as number), (args[1].value as number)),
				}
		});

		Expr.registerFunction("exp", 1, (args: IPCTypedDataValue[]) => {
			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function exp"),
				};
			}
				return {
						type: "real",
						value: Math.exp((args[0].value as number)),
				}
		});

		Expr.registerFunction("log", 1, (args: IPCTypedDataValue[]) => {
			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function log"),
				};
			}
			return {
				type: "real",
				value: Math.log((args[0].value as number)),
			}
		});

		Expr.registerFunction("log10", 1, (args: IPCTypedDataValue[]) => {
			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function log10"),
				};
			}
			return {
				type: "real",
				value: Math.log10((args[0].value as number)),
			}
		});

		Expr.registerFunction("log2", 1, (args: IPCTypedDataValue[]) => {
			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function log2"),
				};
			}
			return {
				type: "real",
				value: Math.log2((args[0].value as number)),
			}
		});

		Expr.registerFunction("ln", 1, (args: IPCTypedDataValue[]) => {
			if (args.length !== 1) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function ln"),
				};
			}
				return {
						type: "real",
						value: Math.log((args[0].value as number)),
				}
		});

		Expr.registerFunction("logn", 2, (args: IPCTypedDataValue[]) => {
			if (args.length !== 2) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function logn"),
				};
			}
			return {
				type: "real",
				value: Math.log((args[0].value as number)) / Math.log((args[1].value as number)),
			}
		});

		Expr.registerFunction("average", -1, (args: IPCTypedDataValue[]) => {
			if (args.length === 0) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function average"),
				};
			}

			let result: IPCTypedDataValue[] = [];
			Expr.flatten(args, result);
			let sum = 0.0;
			let count = 0;
			for (let i = 0; i < result.length; i++) {
				if (DataValue.isError(result[i])) {
					return result[i];
				} else if (DataValue.isNull(result[i])) {
					continue;
				} else if (!DataValue.isNumber(result[i])) {
					return {
						type: "error",
						value: new Error("Invalid argument type for function average"),
					};
				}
				sum += (result[i].value as number);
				count++;
			}

			if (count === 0) {
				return {
					type: "error",
					value: new Error("No non-null values for function average"),
				};
			}

			return {
				type: "real",
				value: sum / count,
			}
		});

		Expr.inited_ = true;

		Expr.registerFunction("sum", -1, (args: IPCTypedDataValue[]) => {
			if (args.length === 0) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function average"),
				};
			}

			let result: IPCTypedDataValue[] = [];
			Expr.flatten(args, result);
			let sum = 0.0;
			for (let i = 0; i < result.length; i++) {
				if (DataValue.isError(result[i])) {
					return result[i];
				} else if (!DataValue.isNumber(result[i])) {
					return {
						type: "error",
						value: new Error("Invalid argument type for function average"),
					};
				}
				sum += (result[i].value as number) ;
			}

			return {
				type: "real",
				value: sum,
			}
		});

		Expr.registerFunction("median", -1, (args: IPCTypedDataValue[]) => {
			if (args.length === 0) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function average"),
				};
			}

			let result: IPCTypedDataValue[] = [];
			Expr.flatten(args, result);

			for (let i = 0; i < result.length; i++) {
				if (DataValue.isError(result[i])) {
					return result[i];
				} else if (!DataValue.isNumber(result[i])) {
					return {
						type: "error",
						value: new Error("Invalid argument type for function average"),
					};
				}
			}

			result.sort((a: IPCTypedDataValue, b: IPCTypedDataValue) => {
				return (a.value as number) - (b.value as number) ;
			});

			let len = result.length / 2;
			if (result.length % 2 === 0) {
				return {
						type: "real",
						value: ((result[len - 1].value as number) + (result[len].value as number)) / 2.0,
				}
			} else {
				return {
						type: "real",
						value: result[Math.floor(len)].value,
				}
			}
		});

		Expr.registerFunction("variance", -1, (args: IPCTypedDataValue[]) => {
			if (args.length === 0) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function average"),
				};
			}

			let result: IPCTypedDataValue[] = [];
			Expr.flatten(args, result);

			let sum = 0.0;
			for (let i = 0; i < result.length; i++) {
				if (DataValue.isError(result[i])) {
					return result[i];
				} else if (!DataValue.isNumber(result[i])) {
					return {
						type: "error",
						value: new Error("Invalid argument type for function average"),
					};
				}
				sum += result[i].value as number ;
			}

			let sum2 = 0.0;
			for (let i = 0; i < result.length; i++) {
				sum2 += Math.pow(result[i].value as number - sum, 2);
			}

			return {
				type: "real",
				value: sum2 / result.length,
			}
		});

		Expr.registerFunction("stddev", -1, (args: IPCTypedDataValue[]) => {
			if (args.length === 0) {
				return {
					type: "error",
					value: new Error("Invalid number of arguments for function average"),
				};
			}

			let result: IPCTypedDataValue[] = [];
			Expr.flatten(args, result);

			let sum = 0.0;
			for (let i = 0; i < result.length; i++) {
				if (DataValue.isError(result[i])) {
					return result[i];
				} else if (!DataValue.isNumber(result[i])) {
					return {
						type: "error",
						value: new Error("Invalid argument type for function average"),
					};
				}
				sum += result[i].value as number ;
			}

			let avg = sum / result.length;
			let sum2 = 0.0;
			for (let i = 0; i < result.length; i++) {
				sum2 += Math.pow(result[i].value as number - avg, 2);
			}

			return {
				type: "real",
				value: Math.sqrt(sum2 / result.length),
			}
		});

		Expr.inited_ = true;
	}

	private static flatten(args: IPCTypedDataValue[], result: IPCTypedDataValue[]): void {
		for (let arg of args) {
			if (arg.type === "array") {
				Expr.flatten(arg.value as any[], result);
			} else {
				result.push(arg);
			}
		}
	}

	private static skipSpaces(str: string, index: number): number {
		while (index < str.length && str[index] === " ") {
			index++;
		}
		return index;
	}

	private static isDigit(c: string): boolean {
		return c >= "0" && c <= "9";
	}

	private static isAlpha(c: string): boolean {
		return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
	}

	private static parseOperand(
		str: string,
		index: number
	): [number, ExprNode] | Error {
		let ret: [number, ExprNode] | Error = new Error("error parsing operand");

		index = Expr.skipSpaces(str, index);
		if (index >= str.length) {
			return new Error("Invalid operand");
		}

		if (str.substring(index).startsWith("(")) {
			let result = Expr.parseNode(str, index + 1);
			if (result instanceof Error) {
				return result;
			}

			index = Expr.skipSpaces(str, result[0]);
			if (index >= str.length || str.charAt(index) !== ")") {
				return new Error("Invalid operand");
			}
			index++;
			ret = [index, result[1]];
		} else if (
			Expr.isDigit(str.charAt(index)) ||
			str.charAt(index) === "-" ||
			str.charAt(index) === "+"
		) {
			let start = index;

			if (str.charAt(index) === "-" || str.charAt(index) === "+") {
				index++;
			}
			while (index < str.length && Expr.isDigit(str.charAt(index))) {
				index++;
			}

			if (index < str.length && str.charAt(index) === ".") {
				index++;
				while (index < str.length && Expr.isDigit(str.charAt(index))) {
					index++;
				}
			}

			if (index < str.length && str.charAt(index).toLowerCase() === "e") {
				index++;
				if (
					index < str.length &&
					(str.charAt(index) === "+" || str.charAt(index) === "-")
				) {
					index++;
				}
				while (index < str.length && Expr.isDigit(str.charAt(index))) {
					index++;
				}
			}

			let num = str.substring(start, index);

			let v: IPCTypedDataValue = {
				type: "error",
				value: new Error("Invalid number"),
			};
			if (num.match(/^[+-]?\d+$/)) {
				v =  {
						type: "integer",
						value: Number.parseInt(num),
				};
			} else {
				let fv = Number.parseFloat(num);
				if (Number.isNaN(fv)) {
					return new Error("Invalid number");
				}
				v = {
						type: "real",
						value: fv,
				}
			}
			ret = [index, new ExprValue(v)];
		} else if (Expr.isAlpha(str.charAt(index))) {
			let start = index;
			while (
				index < str.length &&
				(Expr.isAlpha(str.charAt(index)) ||
					Expr.isDigit(str.charAt(index)) ||
					str.charAt(index) === "_")
			) {
				index++;
			}

			let name = str.substring(start, index);
			let args: ExprNode[] = [];

			if (name.toLowerCase() === "true") {
				ret = [index, new ExprValue({ type: "boolean", value: true })];
			} else if (name.toLowerCase() === "false") {
				ret = [index, new ExprValue({ type: "boolean", value: false })];
			} else if (str.charAt(index) === "(") {
				// This is a function call
				index++;
				while (true) {
					let andresult = Expr.parseNode(str, index);
					if (andresult instanceof Error) {
						return andresult;
					}

					index = andresult[0];
					args.push(andresult[1]);

					index = Expr.skipSpaces(str, index);
					if (index >= str.length) {
						return new Error("Invalid function call");
					}
					if (str.charAt(index) === ",") {
						index++;
					} else if (str.charAt(index) === ")") {
						index++;
						break;
					} else {
						return new Error("Invalid function call");
					}
				}

				if (!Expr.functions_.has(name)) {
					return new Error("function " + name + " not found");
				}

				let func = Expr.functions_.get(name)!;
				if (args.length !== func.getArgCount() && func.getArgCount() >= 0) {
					return new Error("Invalid number of arguments for function " + name);
				}
				ret = [index, new ExprFunction(name, args, func)];
			} else {
				// This is a variable
				ret = [index, new ExprVariable(name)];
			}
		} else if (str.charAt(index) === "!") {
			index++;
			let result = Expr.parseNode(str, index);
			if (result instanceof Error) {
				return result;
			}

			index = result[0];
			ret = [index, new ExprOperator("!")];
			(ret[1] as ExprOperator).setArgs([result[1]]);
		} else if (str.charAt(index) === "[") {
			index++;
			let args: ExprNode[] = [];
			while (true) {
				let andresult = Expr.parseNode(str, index);
				if (andresult instanceof Error) {
					return andresult;
				}

				index = andresult[0];
				args.push(andresult[1]);

				index = Expr.skipSpaces(str, index);
				if (index >= str.length) {
					return new Error("Invalid array");
				}
				if (str.charAt(index) === ",") {
					index++;
				} else if (str.charAt(index) === "]") {
					index++;
					break;
				} else {
					return new Error("Invalid array");
				}
			}

			ret = [index, new ExprArray(args)];
		} else if (str.charAt(index) === "'") {
			index++;
			let start = index;
			while (index < str.length && str.charAt(index) !== "'") {
				if (str.charAt(index) === "\\") {
					index++;
				}
				index++;
			}
			if (index >= str.length) {
				return new Error("Invalid string");
			}
			let strval = str.substring(start, index);
			ret = [index + 1, new ExprValue({ type: "string", value: strval })];
		} else if (str.charAt(index) === '"') {
			index++;
			let start = index;
			while (index < str.length && str.charAt(index) !== '"') {
				if (str.charAt(index) === "\\") {
					index++;
				}
				index++;
			}
			if (index >= str.length) {
				return new Error("Invalid string");
			}
			let strval = str.substring(start, index);
			ret = [index + 1, new ExprValue({ type: "string", value: strval })];
		} else {
			return new Error("Invalid operand");
		}

		return ret;
	}

	private static parseOperator(
		str: string,
		index: number
	): [number, ExprOperator] | Error | null {
		index = Expr.skipSpaces(str, index);
		if (index >= str.length) {
			return null;
		}

		if (str.substring(index).startsWith("+")) {
			index++;
			return [index, new ExprOperator("+")];
		} else if (str.substring(index).startsWith("-")) {
			index++;
			return [index, new ExprOperator("-")];
		} else if (str.substring(index).startsWith("*")) {
			index++;
			return [index, new ExprOperator("*")];
		} else if (str.substring(index).startsWith("/")) {
			index++;
			return [index, new ExprOperator("/")];
		} else if (str.substring(index).startsWith("%")) {
			index++;
			return [index, new ExprOperator("%")];
		} else if (str.substring(index).startsWith("^")) {
			index++;
			return [index, new ExprOperator("^")];
		} else if (str.substring(index).startsWith("==")) {
			index += 2;
			return [index, new ExprOperator("==")];
		} else if (str.substring(index).startsWith("!=")) {
			index += 2;
			return [index, new ExprOperator("!=")];
		} else if (str.substring(index).startsWith("<=")) {
			index += 2;
			return [index, new ExprOperator("<=")];
		} else if (str.substring(index).startsWith("<")) {
			index++;
			return [index, new ExprOperator("<")];
		} else if (str.substring(index).startsWith(">=")) {
			index += 2;
			return [index, new ExprOperator(">=")];
		} else if (str.substring(index).startsWith(">")) {
			index++;
			return [index, new ExprOperator(">")];
		} else if (str.substring(index).startsWith("&&")) {
			index += 2;
			return [index, new ExprOperator("&&")];
		} else if (str.substring(index).startsWith("||")) {
			index += 2;
			return [index, new ExprOperator("||")];
		}

		return null;
	}

	private static parseNode(
		str: string,
		index: number
	): [number, ExprNode] | Error {
		let ret = new ExprValue({
			type: "error",
			value: new Error("Not implemented"),
		});

		let operands: ExprNode[] = [];
		let operators: ExprOperator[] = [];

		let operand1 = Expr.parseOperand(str, index);
		if (operand1 instanceof Error) {
			return operand1;
		}

		index = operand1[0];
		operands.push(operand1[1]);

		let operator1 = Expr.parseOperator(str, index);
		if (operator1 instanceof Error) {
			return operator1;
		}

		if (operator1 === null) {
			return [index, operands[0]];
		}

		index = operator1[0];
		operators.push(operator1[1]);

		while (index < str.length) {
			let operand2 = Expr.parseOperand(str, index);
			if (operand2 instanceof Error) {
				return operand2;
			}

			index = Expr.skipSpaces(str, operand2[0]);
			operands.push(operand2[1]);

			let operator2 = Expr.parseOperator(str, index);
			if (operator2 instanceof Error) {
				return operator2;
			}

			if (operator2 === null) {
				break;
			}

			index = operator2[0];
			while (operators.length > 0 && operators[operators.length - 1].operatorPrecedence() < operator2[1].operatorPrecedence()) {
				let operand1 = operands.pop();
				let operand2 = operands.pop();
				let operator = operators.pop()!;
				operator.setArgs([operand2!, operand1!]);
				operands.push(operator);
			}
			operators.push(operator2[1]);
		}

		while (operators.length > 0) {
			let operand1 = operands.pop();
			let operand2 = operands.pop();
			let operator = operators.pop()!;
			operator.setArgs([operand2!, operand1!]);
			operands.push(operator);
		}

		return [index, operands.pop()!];
	}
}
