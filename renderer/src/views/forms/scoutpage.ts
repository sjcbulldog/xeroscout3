import { XeroWidget } from "../../widgets/xerowidget.js";
import { FormControl } from "./controls/formctrl.js";
import { XeroEditFormView } from "./editformview.js";

export class XeroFormScoutSectionPage extends XeroWidget {
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

    public addControl(control: FormControl) : void {
        this.controls_.push(control) ;

        let top = this.elem.getBoundingClientRect().top ;
        control.createForScouting(this.elem, 0, top) ;
    }

    public setImage(data: string) : void {
        this.image_.src = `data:image/jpg;base64,${data}` ;
    }

    public doLayout() : void {
        this.removeAllControls() ;
        for(let control of this.controls_) {
            control.resetHTMLControl() ;
            this.addControlToLayout(control) ;
        }
    }

    private removeAllControls() : void {
        this.elem.innerHTML = '' ;
        this.elem.appendChild(this.image_) ;
    }    

    private addControlToLayout(control: FormControl) : void {
        let top = this.elem.getBoundingClientRect().top ;
        control.createForScouting(this.elem, 0, top) ;
        control.ctrl!.draggable = false ;
    }
}
