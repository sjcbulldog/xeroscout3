import { XeroApp } from "../../apps/xeroapp.js";
import { IPCSetView } from "../../shared/ipc.js";
import { XeroView } from "../xeroview.js";
import { SyncSetupDialog } from "./syncdialog.js";

export class XeroSyncIPAddrView extends XeroView {
    private dialog_ : SyncSetupDialog ;

    constructor(app: XeroApp) {
        super(app, 'xero-sync-ip-addr') ;

        this.dialog_ = new SyncSetupDialog() ;
        this.dialog_.on('closed', this.dialogClosed.bind(this)) ;         
    }

    public onVisible() {
        this.dialog_.showCentered(this.elem) ;        
    }

    private dialogClosed(changed: boolean) {
        if (changed) {
            this.request('sync-ipaddr', { ipaddr: this.dialog_.ipaddr, port: this.dialog_.port }) ;
        }
        else {
            let newview: IPCSetView = {
                view: "text",
                args: ['Sync Cancelled']
            };
            this.app.updateView(newview);
        }
    }
}