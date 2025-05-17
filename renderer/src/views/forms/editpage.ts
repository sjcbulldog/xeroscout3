import { XeroWidget } from "../../widgets/xerowidget.js";
import { FormControl } from "./controls/formctrl.js";
import { XeroEditFormView } from "./editformview.js";

export class XeroFormEditSectionPage extends XeroWidget {
    public static fuzzyEdgeSpacing = 10 ;

    private controls_ : FormControl[] = [] ;
    private image_ : HTMLImageElement ;

    public constructor(data: string) {
        super('div', 'xero-form-section-page') ;

        this.image_ = document.createElement('img') ;
        this.image_.className = 'xero-form-section-image' ;
        this.image_.src = `data:image/jpg;base64,${data}` ;
    }

    public get controls() : FormControl[] {
        return this.controls_ ;
    }

    public findFormControlFromHTMLElement(elem: HTMLElement) : FormControl | undefined {
        for(let frmctrl of this.controls_) {
            if (frmctrl.ctrl === elem) {
                return frmctrl ;
            }
        }
        return undefined ;
    }

    public findControlByPosition(x: number, y: number) : HTMLElement | undefined {
        for(let entry of this.controls_) {
            if (entry.ctrl === undefined) {
                continue ;
            }

            let ctrl = entry.ctrl ;
            let item = entry.item ;

            let rect = ctrl.getBoundingClientRect() ;
            if (x >= rect.left - XeroFormEditSectionPage.fuzzyEdgeSpacing && x <= rect.right + XeroFormEditSectionPage.fuzzyEdgeSpacing && 
                    y >= rect.top - XeroFormEditSectionPage.fuzzyEdgeSpacing && y <= rect.bottom + XeroFormEditSectionPage.fuzzyEdgeSpacing) {
                return ctrl ;
            }
        }
        return undefined ;
    }    

    public addControl(control: FormControl) : void {
        this.controls_.push(control) ;

        let top = this.elem.getBoundingClientRect().top ;
        control.createForEdit(this.elem, 0, top) ;
    }

    public removeControl(control: FormControl) : void {
        let index = this.controls_.indexOf(control) ;
        if (index >= 0) {
            if (control.ctrl && control.ctrl.parentElement) {
                control.ctrl.parentElement.removeChild(control.ctrl) ;
            }
            this.controls_.splice(index, 1) ;
        }
    }

    public setImage(data: string) : void {
        this.image_.src = `data:image/jpg;base64,${data}` ;
    }
    
    public removeAllControls() : void {
        this.elem.innerHTML = '' ;
        this.controls_ = [] ;
    }

    private get image() : HTMLImageElement {
        return this.image_ ;
    }
}