import { DataValue } from "../../shared/datavalue";
import { IPCTypedDataValue } from "../../shared/ipc";

export class DataRecord {
    private data_ : Map<string, IPCTypedDataValue> ;


    public constructor() {
        this.data_ = new Map<string, IPCTypedDataValue>() ;
    }

    public addfield(name: string, value : IPCTypedDataValue) {
        this.data_.set(name, value) ;
    }

    public keys() : string[] {
        let ret: string[] = [] ;

        for(let key of this.data_.keys()) {
            ret.push(key) ;
        }
        return ret ;
    }

    public has(key: string) : boolean {
        return this.data_.has(key) ;
    }

    public value(key: string) : IPCTypedDataValue | undefined {
        return this.data_.get(key) ;
    }

    public get jsonObj() : any {
        let obj: any = {} ;
        for(let key of this.data_.keys()) {
            try {
                let dval = this.value(key) ;
                if (dval) {
                    obj[key] = DataValue.toSQLite3Value(dval) ;
                }
                else {
                    obj[key] = 'MissingData' ;
                }
            }
            catch(err) {
                return undefined ;
            }
        }
        return obj ;
    }
}
