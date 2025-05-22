import { IPCHint } from "./ipc.js";
import { XeroMainProcessInterface } from "./widgets/xerocbtarget.js";

export class HintManager extends XeroMainProcessInterface {
    private hint_map_ : Map<string, IPCHint> ;

    public constructor() {
        super() ;

        this.hint_map_ = new Map<string, IPCHint>() ;
        this.registerCallback('send-hint-db', this.hintDBReceived.bind(this)) ;
        this.request('get-hint-db') ;
    }

    public getHint(hintid: string) : IPCHint | undefined {
        return this.hint_map_.get(hintid)! ;
    }

    public setHintClosed(hintid: string) : void {
        if (this.hint_map_.has(hintid)) {
            this.hint_map_.get(hintid)!.hidden = true ;
        }
        this.request('set-hint-hidden', hintid) ;
    }

    private hintDBReceived(db: IPCHint[]) {
        this.hint_map_.clear() ;
        for(let hint of db) {
            this.hint_map_.set(hint.id, hint) ;
        }
    }
}