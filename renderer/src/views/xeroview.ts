import {  XeroApp  } from "../apps/xeroapp.js";
import {  XeroWidget  } from "../widgets/xerowidget.js";

export class XeroView extends XeroWidget {
    private app_ : XeroApp ;

    constructor(app: XeroApp, cname: string) {
        super('div', cname) ;
        this.app_ = app ;
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
}
