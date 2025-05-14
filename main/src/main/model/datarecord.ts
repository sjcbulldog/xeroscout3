import { IPCDataValue } from "../../shared/ipc";
import { DataValue } from "./datavalue";

export class DataRecord {
    private data_ : Map<string, IPCDataValue> ;


    public constructor() {
        this.data_ = new Map<string, IPCDataValue>() ;
    }

    public addfield(name: string, value : IPCDataValue) {
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

    public value(key: string) : IPCDataValue | undefined {
        return this.data_.get(key) ;
    }
}
