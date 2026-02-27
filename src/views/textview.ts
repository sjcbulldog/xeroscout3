import {  XeroApp  } from "../apps/xeroapp.js";
import {  XeroLogger  } from "../utils/xerologger.js";
import {  XeroView  } from "./xeroview.js";

export class XeroTextView extends XeroView {

    constructor(app: XeroApp, arg: string) {
        super(app, 'xero-text-view') ;
        
        this.startupMessage(arg) ;
    }
    
    public setText(text: string) {
        this.elem.innerHTML = text ;
    }
}