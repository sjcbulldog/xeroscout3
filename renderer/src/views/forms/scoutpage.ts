import { XeroSize } from "../../widgets/xerogeom.js";
import { XeroWidget } from "../../widgets/xerowidget.js";
import { FormControl } from "./controls/formctrl.js";
import { XeroEditFormView } from "./editformview.js";

export class XeroFormScoutSectionPage extends XeroWidget {
    private controls_ : FormControl[] = [] ;
    private image_ : HTMLImageElement ;
    private formdiv_ : HTMLDivElement ;

    public constructor(formsize: XeroSize, data: string) {
        super('div', 'xero-form-section-page') ;

        this.formdiv_ = document.createElement('div') ;
        this.formdiv_.className = 'xero-form-section-page-form' ;
        this.formdiv_.style.width = `${formsize.width}px` ;
        this.formdiv_.style.height = `${formsize.height}px` ;

        this.image_ = document.createElement('img') ;
        this.image_.className = 'xero-form-section-image' ;
        this.image_.src = `data:image/png;base64,${data}` ;
        this.formdiv_.appendChild(this.image_) ;
        this.elem.appendChild(this.formdiv_) ;
    }

    public get controls() : FormControl[] {
        return this.controls_ ;
    }

    public addControl(control: FormControl) : void {
        this.controls_.push(control) ;
        this.addControlToLayout(control) ;
    }

    public setImage(data: string) : void {
        this.image_.src = `data:image/png;base64,${data}` ;
    }

    public doLayout() : void {
        this.elem.innerHTML = '' ;
        this.elem.appendChild(this.image_) ;

        for(let control of this.controls_) {
            control.resetHTMLControl() ;
            this.addControlToLayout(control) ;
        }
    }

    public getControlByTag(tag: string) : FormControl | undefined {
        for(let control of this.controls_) {
            if (control.item.tag === tag) {
                return control ;
            }
        }
        return undefined ;
    }   

    private addControlToLayout(control: FormControl) : void {
        let bounds = this.elem.getBoundingClientRect() ;
        let fbounds = this.formdiv_.getBoundingClientRect() ;        

        console.log(`Adding control ${control.item.tag} bounds ${JSON.stringify(bounds)} to form bounds ${JSON.stringify(fbounds)}`) ;

        control.createForScouting(this.formdiv_, fbounds.left, fbounds.top) ;
    }
}
