import {  XeroApp  } from "../apps/xeroapp.js";
import { XeroPoint } from "../widgets/xerogeom.js";
import { XeroPopup } from "../widgets/xeropopup.js";
import {  XeroWidget  } from "../widgets/xerowidget.js";

export class XeroView extends XeroWidget {
    private app_ : XeroApp ;
    private hint_popup_ : XeroPopup ;
    private hintid_ : string | undefined ;

    constructor(app: XeroApp, cname: string) {
        super('div', cname) ;
        this.app_ = app ;
        this.hint_popup_ = new XeroPopup() ;
        this.hint_popup_.on('set-hint-hidden', this.hintClosed.bind(this)) ;    
    }

    public get app() : XeroApp {
        return this.app_ ;
    }

    public reset() {
        this.elem.innerHTML = "" ;
    }

    public resetElem(elem: HTMLElement) {
        elem.innerHTML = "" ;
    }

    private hintClosed(hidden: boolean) {
        if (hidden) {
            this.request('set-hint-hidden', this.hintid_) ;
        }
    }

    protected displayHint(id: string, pt: XeroPoint) {
        this.hintid_ = id ;
        let hint = this.app_.hintDB.getHint(id) ;
        if (hint && !hint.hidden) {
            this.hint_popup_.showPopup(this.elem, 'Hint', hint.text, 'Hide this hint', pt) ; 
        } 
    }
}
