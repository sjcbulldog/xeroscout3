import EventEmitter from "events";
import { XeroPoint } from "../shared/xerogeom.js";


export class XeroPopup extends EventEmitter {
    private popup_ : HTMLDivElement  ;
    private popup_div_ : HTMLDivElement ;
    private popup_title_ : HTMLDivElement ;
    private popup_title_text_ : HTMLDivElement ;
    private popup_title_x_ : HTMLDivElement ;
    private popup_text_ : HTMLDivElement ;
    private chkbox_ : HTMLInputElement ;
    private chkbox_label_ : HTMLLabelElement ;

    constructor() {
        super() ;

        this.popup_ = document.createElement("div") ;
        this.popup_.className = "xero-popup-top" ;

        this.popup_div_ = document.createElement("div") ;
        this.popup_div_.className = "xero-popup-div" ;
        this.popup_.appendChild(this.popup_div_) ;

        this.popup_title_ = document.createElement("div") ;
        this.popup_title_.className = "xero-popup-title" ;
        this.popup_div_.appendChild(this.popup_title_) ;

        this.popup_title_text_ = document.createElement("div") ;
        this.popup_title_text_.className = "xero-popup-title-text" ;
        this.popup_title_.appendChild(this.popup_title_text_) ;

        this.popup_title_x_ = document.createElement("div") ;
        this.popup_title_x_.className = "xero-popup-title-x" ;
        this.popup_title_x_.innerHTML = '&#x1F5D9' ;
        this.popup_title_.appendChild(this.popup_title_x_) ;
        this.popup_title_x_.addEventListener("click", () => {
            this.closePopup() ;
        }) ;

        this.popup_text_ = document.createElement("div") ;
        this.popup_text_.className = "xero-popup-text" ;
        this.popup_div_.appendChild(this.popup_text_) ;

        this.chkbox_ = document.createElement("input") ;
        this.chkbox_.type = "checkbox" ;
        this.chkbox_.className = "xero-popup-checkbox" ;

        this.chkbox_label_ = document.createElement("label") ;
        this.chkbox_label_.className = "xero-popup-checkbox-label" ;
        this.chkbox_label_.appendChild(this.chkbox_) ;
        this.popup_div_.appendChild(this.chkbox_label_) ;
    }

    showPopup(parent: HTMLElement, title: string, text: string, chkbox: string, pt: XeroPoint) {
        this.popup_title_text_.innerHTML = ''; 
        this.popup_text_.innerHTML = text ;
        this.chkbox_label_.innerHTML = chkbox ;
        this.chkbox_label_.appendChild(this.chkbox_) ;

        this.popup_.style.left = pt.x + "px" ;
        this.popup_.style.top = pt.y + "px" ;

        if (this.popup_.parentElement) {
            this.popup_.parentElement.removeChild(this.popup_) ;
        }
        parent.appendChild(this.popup_) ;
    }

    closePopup() {
        if (this.popup_ && this.popup_.parentElement) {
            this.popup_.parentElement.removeChild(this.popup_) ;
        }

        this.emit("popup-closed", this.chkbox_.checked) ;
    }
}