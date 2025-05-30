import { XeroDialog } from "../../widgets/xerodialog.js";

export class SyncSetupDialog extends XeroDialog {

    private ipaddr_? : HTMLInputElement ;
    private port_? : HTMLInputElement ;
    private ipaddr_value_ : string = '' ;
    private port_value_ : number = -1 ;

    constructor() {
        super('Edit Section Name') ;
    }

    public get ipaddr() : string {
        return this.ipaddr_value_ ;
    }

    public get port() : number {
        return this.port_value_ ;
    }

    async populateDialog(pdiv: HTMLDivElement) {
        let label ;
        let div = document.createElement('div') ;
        div.className = 'xero-sync-setup-dialog-rowdiv' ;

        this.ipaddr_ = document.createElement('input') ;
        this.ipaddr_.type = 'text' ;
        this.ipaddr_.className = 'xero-sync-setup-dialog-ipaddr' ;
        this.ipaddr_.placeholder = 'IP Address' ;

        label = document.createElement('label') ;
        label.className = 'xero-sync-setup-dialog-ipaddr-label' ;
        label.textContent = 'IP Address:' ;
        label.appendChild(this.ipaddr_) ;
        div.appendChild(label) ;

        this.port_ = document.createElement('input') ;
        this.port_.type = 'number' ;
        this.port_.className = 'xero-sync-setup-dialog-port' ;
        this.port_.placeholder = 'Port Number' ;
        this.port_.min = '1' ;
        this.port_.max = '65535' ;
        this.port_.value = '45455' ;

        label = document.createElement('label') ;
        label.className = 'xero-sync-setup-dialog-port-label' ;
        label.textContent = 'Port Number:' ;
        label.appendChild(this.port_) ;
        div.appendChild(label) ;

        pdiv.appendChild(div) ;
    }

    onInit() {
        this.ipaddr_?.focus() ;
    }

    okButton(event: Event) {
        this.ipaddr_value_ = this.ipaddr_?.value.trim() || '' ;
        this.port_value_ = parseInt(this.port_?.value.trim() || '-1') ;        
        super.okButton(event) ;
    }
}
