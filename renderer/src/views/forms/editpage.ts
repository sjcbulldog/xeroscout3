import { XeroPoint } from "../../widgets/xerogeom.js";
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

    public doLayout() : void {
        for(let control of this.controls_) {
            this.removeControlFromLayout(control) ;
            this.addControlToLayout(control) ;
        }
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

    //
    // Find a control by its form position
    //
    public findControlByPosition(pt: XeroPoint) : HTMLElement | undefined {

        for(let entry of this.controls_) {
            if (entry.ctrl === undefined) {
                continue ;
            }


            if (entry.fuzzyBounds.contains(pt)) {
                return entry.ctrl ;
            }
        }
        return undefined ;
    }    

    public addControl(control: FormControl) : void {
        this.controls_.push(control) ;
        this.addControlToLayout(control) ;
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

    private removeControlFromLayout(control: FormControl) : void {
        if (control.ctrl && control.ctrl.parentElement) {
            control.ctrl.parentElement.removeChild(control.ctrl) ;
        }
    }

    private addControlToLayout(control: FormControl) : void {
        let top = this.elem.getBoundingClientRect().top ;
        control.createForEdit(this.elem, 0, top) ;
    }
}
