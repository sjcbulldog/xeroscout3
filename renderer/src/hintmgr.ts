import { IPCHint } from "./ipc.js";
import { XeroMainProcessInterface } from "./widgets/xerocbtarget.js";

export class HintManager extends XeroMainProcessInterface {
    private hintdb_ : Map<string, IPCHint> = new Map<string, IPCHint>() ;

    public constructor() {
        super() ;

        this.registerCallback('send-hint-db', this.hintDBReceived) ;
        this.request('get-hint-db') ;
    }

    public getHint(hintid: string) : IPCHint | undefined {
        return this.hintdb_.get(hintid)! ;
    }

    public setHintClosed(hintid: string) : void {
        this.request('set-hint-closed', hintid) ;
    }

    private hintDBReceived(db: IPCHint[]) {
        this.hintdb_.clear() ;
        for(let hint of db) {
            this.hintdb_.set(hint.id, hint) ;
        }
    }
}