import { XeroDialog } from "./xerodialog.js";

export class XeroYesNo extends XeroDialog {

    private span_? : HTMLSpanElement ;
    private question_ : string ;

    constructor(title:string, question: string) {
        super(title, true) ;

        this.question_ = question ;

    }

    async populateDialog(pdiv: HTMLDivElement) {
        this.span_ = document.createElement('span') ;
        this.span_.innerText = this.question_ ;

        pdiv.appendChild(this.span_) ;
    }
}
