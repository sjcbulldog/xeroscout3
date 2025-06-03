import { XeroSize } from "../../widgets/xerogeom.js";
import { XeroWidget } from "../../widgets/xerowidget.js";
import { FormControl } from "./controls/formctrl.js";
import { XeroEditFormView } from "./editformview.js";

export class XeroFormScoutSectionPage extends XeroWidget {
    private controls_ : FormControl[] = [] ;
    private formdiv_ : HTMLDivElement ;
    private observer_ : ResizeObserver ;
    private size_ : XeroSize ;
    private scale_ : number = 1.0 ;

    public constructor(formsize: XeroSize) {
        super('div', 'xero-form-section-page') ;

        this.size_ = formsize ;

        this.formdiv_ = document.createElement('div') ;
        this.formdiv_.className = 'xero-form-section-scout-page-form' ;
        this.elem.appendChild(this.formdiv_) ;

        this.observer_ = new ResizeObserver(this.resized.bind(this)) ;
        this.observer_.observe(this.elem) ;
    }

    public get controls() : FormControl[] {
        return this.controls_ ;
    }

    public addControl(control: FormControl) : void {
        this.controls_.push(control) ;
        this.addControlToLayout(control) ;
    }

    public doLayout() : void {
        this.formdiv_.innerHTML = '' ;

        let fbounds = this.formdiv_.getBoundingClientRect() ;
        let xscale = fbounds.width / this.size_.width ;
        let yscale = fbounds.height / this.size_.height ;
        this.scale_ = Math.min(xscale, yscale) ;

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

    public getPlaceOffset() : XeroSize {
        let bounds = this.elem.getBoundingClientRect() ;
        let fbounds = this.formdiv_.getBoundingClientRect() ;
        return new XeroSize(fbounds.left - bounds.left, fbounds.top) ;
    }

    private addControlToLayout(control: FormControl) : void {
        let offset = this.getPlaceOffset() ;
        control.createForScouting(this.formdiv_, this.scale_, offset.width, offset.height) 
    }

    private resized(entries: ResizeObserverEntry[]) : void {
        for(let entry of entries) {
            if (entry.target === this.elem) {
                this.doLayout() ;
            }
        }
    }
}
