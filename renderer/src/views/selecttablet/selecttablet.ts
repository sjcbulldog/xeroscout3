import { XeroApp } from "../../apps/xeroapp.js";
import { IPCTabletDefn } from "../../shared/ipc.js";
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
        this.tablets_ = data ;
        this.dialog_ = new SelectTabletDialog(data) ;
        this.dialog_.on('closed', this.dialogClosed.bind(this)) ;
        this.dialog_.showRelative(this.elem, 100, 100) ;
    }

    private dialogClosed(changed: boolean) {
        const dialog = this.dialog_ ;
        this.dialog_ = undefined ;

        if (!dialog) {
            return ;
        }

        if (dialog.selectedTablet) {
            this.request('set-tablet-name-purpose', dialog.selectedTablet) ;
            return ;
        }

        if (changed) {
            alert('No tablet selected') ;
            this.dialog_ = new SelectTabletDialog(this.tablets_) ;
            this.dialog_.on('closed', this.dialogClosed.bind(this)) ;
            this.dialog_.showRelative(this.elem, 100, 100) ;
        }
    }
}
