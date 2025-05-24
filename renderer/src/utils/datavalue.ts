import { IPCNamedDataValue, IPCDataValueType } from "../ipc.js";

export class DataValue {

    public static fromString(value: string): IPCNamedDataValue {
        return {
            type: 'string',
            value: value
        };
    }
    public static fromInteger(value: number): IPCNamedDataValue {
        return {
            type: 'integer',
            value: value
        };
    }
    public static fromReal(value: number): IPCNamedDataValue {
        return {
            type: 'real',
            value: value
        };
    } 

    public static fromBoolean(value: boolean): IPCNamedDataValue {
        return {
            type: 'boolean',
            value: value
        };
    }

    public static fromNull(): IPCNamedDataValue {
        return {
            type: 'null',
            value: null
        };
    }

    public static fromError(value: Error) : IPCNamedDataValue {
        return {
            type: 'error',
            value: value.message
        };
    }

    public static equals(a: IPCNamedDataValue, b: IPCNamedDataValue): boolean {  
        if (a.type !== b.type) {
            return false;
        }

        if (a.value === null && b.value === null) {
            return true;
        }

        if (a.value === null || b.value === null) {
            return false;
        }

        if (a.type === 'array') {
            if ((a.value as any[]).length !== (b.value as any[]).length) {
                return false;
            }
            for (let i = 0; i < (a.value as any[]).length; i++) {
                if (!DataValue.equals((a.value as any[])[i], (b.value as any[])[i])) {
                    return false;
                }
            }
            return true;
        }

        return a.value === b.value;
    }

    public static isValidType(type: IPCDataValueType): boolean {
        return ['integer', 'real', 'string', 'boolean', 'error', 'array'].includes(type);
    }

    public static isNull(a:IPCNamedDataValue) : boolean {
        return a.type === 'null' ;
    }

    public static isInteger(a:IPCNamedDataValue) : boolean {
        return a.type === 'integer';
    }

    public static isReal(a:IPCNamedDataValue) : boolean {
        return a.type === 'real';
    }

    public static isNumber(a:IPCNamedDataValue) : boolean {
        return a.type === 'integer' || a.type === 'real';
    }   

    public static isString(a:IPCNamedDataValue) : boolean {
        return a.type === 'string';
    }

    public static isBoolean(a:IPCNamedDataValue) : boolean {
        return a.type === 'boolean';
    }

    public static isArray(a:IPCNamedDataValue) : boolean {
        return a.type === 'array';
    }

    public static isError(a:IPCNamedDataValue) : boolean {
        return a.type === 'error';
    }

    public static toBoolean(a:IPCNamedDataValue) : boolean {
        if (a.type !== 'boolean') {
            throw new Error(`Cannot convert ${a.type} to boolean`);
        }
        return a.value as boolean;
    }

    public static toString(a:IPCNamedDataValue) : string {
        if (a.type !== 'string') {
            throw new Error(`Cannot convert ${a.type} to string`);
        }
        return a.value as string;
    }

    public static toReal(a:IPCNamedDataValue) : number {
        if (a.type !== 'real' && a.type !== 'integer') {
            throw new Error(`Cannot convert ${a.type} to number`);
        }
        return a.value as number;
    }

    public static toInteger(a:IPCNamedDataValue) : number {
        if (a.type !== 'integer') {
            throw new Error(`Cannot convert ${a.type} to integer`);
        }
        return a.value as number;
    }

    public static toArray(a:IPCNamedDataValue) : Array<IPCNamedDataValue> {
        if (a.type !== 'array') {
            throw new Error(`Cannot convert ${a.type} to array`);
        }
        return a.value as Array<IPCNamedDataValue>;
    }

    public static toDisplayString(a:IPCNamedDataValue) : string {
        let ret = '' ;

        if (a.value === null) {
            ret = 'null' ; 
        }
        else if (a.type === 'string') {
            ret = DataValue.toString(a) ;
        }
        else if (a.type === 'boolean') {
            ret = DataValue.toBoolean(a) ? 'true' : 'false' ;
        }
        else if (a.type === 'integer') {
            ret = DataValue.toInteger(a).toString() ;
        }
        else if (a.type === 'real') {
            ret = DataValue.toReal(a).toString() ;
        }
        else if (a.type === 'array') {
            ret = '[' ;
            for(const v of DataValue.toArray(a)) {
                ret += `${DataValue.toDisplayString(v)},` ;
            }
            if (ret.length > 1) {
                ret = ret.slice(0, -1) ; // remove last comma
            }
            ret += ']' ;
        }
        else if (a.type === 'error') {
            ret = `Error: ${DataValue.toString(a)}`;
        }
        else {
            ret = `Unknown type: ${a.type}`;
        }

        return ret;
    }

    public static toValueString(a: IPCNamedDataValue) : string {
        let ret = '' ;

        if (a.value === null) {
           ret = 'null' ; 
        }
        else if (a.type === 'string') {
            ret = `'` ;
            for(const c of DataValue.toString(a)) {
                if (c === "'") {
                    ret += `''` ;
                }
                else {
                    ret += c ;
                }
            }
            ret += `'` ;
        }
        else if (a.type === 'boolean') {
            ret = DataValue.toBoolean(a) ? '1' : '0' ;
        }
        else if (a.type === 'integer') {
            ret = DataValue.toInteger(a).toString() ;
        }
        else if (a.type === 'real') {
            ret = DataValue.toReal(a).toString() ;
        }
        else if (a.type === 'array') {
            ret = '[' ;
            for(const v of DataValue.toArray(a)) {
                ret += `${DataValue.toValueString(v)},` ;
            }
            if (ret.length > 1) {
                ret = ret.slice(0, -1) ; // remove last comma
            }
            ret += ']' ;
        }
        else if (a.type === 'error') {
            ret = `Error: ${DataValue.toString(a)}`;
        }
        else {
            ret = `Unknown type: ${a.type}`;
        }

        return ret;
    }
}
