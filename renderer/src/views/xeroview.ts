import {  XeroApp  } from "../apps/xeroapp.js";
import { XeroPoint } from "../widgets/xerogeom.js";
import { XeroPopup } from "../widgets/xeropopup.js";
import {  XeroWidget  } from "../widgets/xerowidget.js";

export class XeroView extends XeroWidget {
    private app_ : XeroApp ;
    private hint_popup_ : XeroPopup ;
    private hintid_ : string | undefined ;
    private empty_div_? : HTMLDivElement ;
    private span_?: HTMLSpanElement ;

    constructor(app: XeroApp, cname: string) {
        super('div', cname) ;
        this.app_ = app ;
        this.hint_popup_ = new XeroPopup() ;
        this.hint_popup_.on('popup-closed', this.hintClosed.bind(this)) ;
    }

    public get isOkToClose() : boolean {
        return true ;
    }

    public get app() : XeroApp {
        return this.app_ ;
    }

    public onVisible() {
        // This method can be overridden by subclasses to perform actions when the view becomes visible
    }

    public reset() {
        this.elem.innerHTML = "" ;
    }

    public resetElem(elem: HTMLElement) {
        elem.innerHTML = "" ;
    }

    public startupMessage(msg: string) {
        this.reset() ;

        this.empty_div_ = document.createElement("div") ;
        this.empty_div_.className = "xero-text-div" ;
    
        this.span_ = document.createElement("span") ;
        this.span_.className = "xero-text-span" ;
        this.span_.innerHTML = "<b>" + msg + "</b>" ;
        
        this.empty_div_.append(this.span_);
        this.elem.append(this.empty_div_) ;        
    }

    private hintClosed(hidden: boolean) {
        if (hidden) {
            this.app_.hintDB!.setHintClosed(this.hintid_!) ;
        }
    }

    protected displayHint(id: string, pt: XeroPoint) {
        this.hintid_ = id ;
        let hint = this.app_.hintDB!.getHint(id) ;
        if (hint && !hint.hidden) {
            this.hint_popup_.showPopup(this.elem, 'Hint', hint.text, 'Hide this hint', pt) ; 
        } 
    }
}
