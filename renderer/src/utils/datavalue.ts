import { IPCDataValue, IPCDataValueType } from "../ipc";

export class DataValue {

    public static fromString(value: string): IPCDataValue {
        return {
            type: 'string',
            value: value
        };
    }
    public static fromInteger(value: number): IPCDataValue {
        return {
            type: 'integer',
            value: value
        };
    }
    public static fromReal(value: number): IPCDataValue {
        return {
            type: 'real',
            value: value
        };
    } 

    public static fromBoolean(value: boolean): IPCDataValue {
        return {
            type: 'boolean',
            value: value
        };
    }

    public static fromNull(): IPCDataValue {
        return {
            type: 'null',
            value: null
        };
    }

    public static fromError(value: Error) : IPCDataValue {
        return {
            type: 'error',
            value: value.message
        };
    }

    public static equals(a: IPCDataValue, b: IPCDataValue): boolean {  
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
            if (a.value.length !== b.value.length) {
                return false;
            }
            for (let i = 0; i < a.value.length; i++) {
                if (!DataValue.equals(a.value[i], b.value[i])) {
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

    public static isNull(a:IPCDataValue) : boolean {
        return a.type === 'null' ;
    }

    public static isInteger(a:IPCDataValue) : boolean {
        return a.type === 'integer';
    }

    public static isReal(a:IPCDataValue) : boolean {
        return a.type === 'real';
    }

    public static isNumber(a:IPCDataValue) : boolean {
        return a.type === 'integer' || a.type === 'real';
    }   

    public static isString(a:IPCDataValue) : boolean {
        return a.type === 'string';
    }

    public static isBoolean(a:IPCDataValue) : boolean {
        return a.type === 'boolean';
    }

    public static isArray(a:IPCDataValue) : boolean {
        return a.type === 'array';
    }

    public static isError(a:IPCDataValue) : boolean {
        return a.type === 'error';
    }

    public static toBoolean(a:IPCDataValue) : boolean {
        if (a.type !== 'boolean') {
            throw new Error(`Cannot convert ${a.type} to boolean`);
        }
        return a.value as boolean;
    }

    public static toString(a:IPCDataValue) : string {
        if (a.type !== 'string') {
            throw new Error(`Cannot convert ${a.type} to string`);
        }
        return a.value as string;
    }

    public static toReal(a:IPCDataValue) : number {
        if (a.type !== 'real' && a.type !== 'integer') {
            throw new Error(`Cannot convert ${a.type} to number`);
        }
        return a.value as number;
    }

    public static toInteger(a:IPCDataValue) : number {
        if (a.type !== 'integer') {
            throw new Error(`Cannot convert ${a.type} to integer`);
        }
        return a.value as number;
    }

    public static toArray(a:IPCDataValue) : Array<IPCDataValue> {
        if (a.type !== 'array') {
            throw new Error(`Cannot convert ${a.type} to array`);
        }
        return a.value as Array<IPCDataValue>;
    }

    public static toDisplayString(a:IPCDataValue) : string {
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

    public static toValueString(a: IPCDataValue) : string {
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
