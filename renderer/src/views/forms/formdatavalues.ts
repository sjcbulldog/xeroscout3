import { IPCNamedDataValue, IPCTypedDataValue } from "../../ipc.js";


export class XeroFormDataValues {
    private dvalues_ : IPCNamedDataValue[] ;

    public constructor(dvalues: IPCNamedDataValue[]) {
        this.dvalues_ = dvalues;
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
            this.dvalues_[index].value = value;
        }
    }
}
