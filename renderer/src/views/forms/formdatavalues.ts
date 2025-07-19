import { DataValue } from "../../shared/datavalue.js";
import { IPCNamedDataValue, IPCTypedDataValue } from "../../shared/ipc.js";


export class XeroFormDataValues {
    private dvalues_ : IPCNamedDataValue[] ;
    private dirty_ : boolean = false ;

    public constructor(dvalues: IPCNamedDataValue[] = []) {
        this.dvalues_ = dvalues;
    }

    public get dirty(): boolean {
        return this.dirty_; 
    }

    public set dirty(value: boolean) {
        this.dirty_ = value;
    }

    public get values() : IPCNamedDataValue[] {
        return this.dvalues_;
    }

    public get(tag: string): IPCTypedDataValue | undefined {
        let dvalue = this.dvalues_.find((dvalue) => dvalue.tag === tag);
        if (dvalue === undefined) {
            return undefined;
        }
        return dvalue.value;
    }

    public set(tag: string, value: IPCTypedDataValue): void {
        const index = this.dvalues_.findIndex((dvalue) => dvalue.tag === tag);
        if (index !== -1) {
            if (!DataValue.equals(this.dvalues_[index].value, value)) {
                this.dvalues_[index].value = value;
                this.dirty_ = true;
            }
        }
        else {
            this.dvalues_.push({ tag, value });
            this.dirty_ = true;
        }
    }
}
