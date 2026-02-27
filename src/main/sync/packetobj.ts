import { PacketType } from "./packettypes";


export class PacketObj {
    public type_ : PacketType ;
    public data_: Uint8Array ;

    constructor(type: number, data?: Uint8Array) {
        this.type_ = type ;

        if (data) {
            this.data_ = data ;
        }
        else {
            this.data_ = new Uint8Array(0) ;
        }
    }

    public payloadAsString() : string {
        const decoder = new TextDecoder();
        const str = decoder.decode(this.data_);
        return str;
    }
}
