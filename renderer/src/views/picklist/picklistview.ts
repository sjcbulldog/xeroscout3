import { XeroApp } from "../../apps/xeroapp.js";
import { XeroView } from "../xeroview.js";

export class PickListView extends XeroView {
    private picklist_div_ : HTMLDivElement | null = null ;
    private modified_ : boolean = false ;

    constructor(app: XeroApp) {
        super(app, 'xero-picklist-view') ;

        this.createUI() ;
    }

    private createUI(): void {
    }  
} 