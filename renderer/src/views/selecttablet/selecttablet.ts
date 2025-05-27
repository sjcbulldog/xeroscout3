import { XeroApp } from "../../apps/xeroapp.js";
import { IPCTabletDefn } from "../../ipc.js";
import { XeroView } from "../xeroview.js";
import { SelectTabletDialog } from "./selecttabletdialog.js";

export class XeroSelectTablet extends XeroView {
    private dialog_? : SelectTabletDialog ;
    private tablets_ : IPCTabletDefn [] = [] ;

    constructor(app: XeroApp) {
        super(app, 'xero-select-tablet-view') ;

        this.registerCallback('send-tablet-data', this.formCallback.bind(this));
        this.request('get-tablet-data') ;
    }

    private formCallback(data: IPCTabletDefn[]) {
        this.dialog_ = new SelectTabletDialog(data) ;
        this.dialog_.on('closed', this.dialogClosed.bind(this)) ;
        this.dialog_.showRelative(this.elem, 100, 100) ;
    }

    private dialogClosed() {
        if (this.dialog_) {
            if (this.dialog_.selectedTablet) {
                this.request('set-tablet-name-purpose', this.dialog_.selectedTablet) ;
                this.dialog_ = undefined ;
            }
            else {
                alert('No tablet selected') ;
                this.dialog_ = new SelectTabletDialog(this.tablets_) ;
                this.dialog_.on('closed', this.dialogClosed.bind(this)) ;                
            }
        }
    }
}