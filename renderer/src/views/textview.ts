import {  XeroApp  } from "../apps/xeroapp.js";
import {  XeroLogger  } from "../utils/xerologger.js";
import {  XeroView  } from "./xeroview.js";

export class XeroTextView extends XeroView {
    private message_: string ;
    private empty_div_: HTMLDivElement ;
    private span_: HTMLSpanElement ;

    constructor(app: XeroApp, arg: string) {
        super(app, 'xero-text-view') ;

        let logger = XeroLogger.getInstance() ;
        logger.debug(`XeroTextView: constructor: arg=${JSON.stringify(arg)}`) ;

        this.message_ = arg ;
        if (!this.message_) {
            this.message_ = "Invalid Text View Request" ;
        }

        this.empty_div_ = document.createElement("div") ;
        this.empty_div_.className = "xero-text-div" ;
    
        this.span_ = document.createElement("span") ;
        this.span_.className = "xero-text-span" ;
        this.span_.innerHTML = "<b>" + this.message_ + "</b>" ;
        
        this.empty_div_.append(this.span_);

        this.reset() ;
        this.elem.append(this.empty_div_) ;
    }
    
    public setText(text: string) {
        this.elem.innerHTML = text ;
    }
}