import { XeroSize } from "../../shared/xerogeom.js";
import { XeroWidget } from "../../widgets/xerowidget.js";
import { FormControl } from "./controls/formctrl.js";
import { ImageControl } from "./controls/imagectrl.js";
import { XeroEditFormView } from "./editformview.js";
import { XeroFormDataValues } from "./formdatavalues.js";

export class XeroFormScoutSectionPage extends XeroWidget {
    private data_ : XeroFormDataValues ;
    private controls_ : FormControl[] = [] ;
    private formdiv_ : HTMLDivElement ;
    private observer_ : ResizeObserver ;
    private size_ : XeroSize ;
    private scale_ : number = 1.0 ;
    private reversed_ : boolean = false ;
    private color_: string = 'blue' ;

    public constructor(data: XeroFormDataValues, formsize: XeroSize, color: string, reversed: boolean) {
        super('div', 'xero-form-section-page') ;

        this.data_ = data ;
        this.size_ = formsize ;
        this.color_ = color ;
        this.reversed_ = reversed ;

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

    private isOverField(control: FormControl) : FormControl | undefined {
        let bounds = control.bounds ;

        for(let ctrl of this.controls_) {
            if (ctrl !== control && ctrl.item.type === 'image') {
                let imgctrl = ctrl as ImageControl ;
                if (imgctrl.field && imgctrl.bounds.intersects(bounds)) {
                    return imgctrl ;
                }
            }
        }
        return undefined ;
    }

    private addControlToLayout(control: FormControl) : void {
        let offset = this.getPlaceOffset() ;
        let image = this.isOverField(control) ;
        if (image && this.color_ !== 'blue' && !this.reversed_) {
            let dl = this.scale_ * (control.bounds.left - image.bounds.left) ;
            let x2 = this.scale_ * image.bounds.right - dl - this.scale_ * control.bounds.width ;
            let dx = x2 - this.scale_ * control.bounds.left ;
            offset = new XeroSize(offset.width + dx, offset.height) ;
        }
        control.createForScouting(this.formdiv_, this.scale_, offset.width, offset.height) 

        if (control.item.type === 'image') {
            let imgctrl = control as ImageControl ;
            if (imgctrl.field) {
                imgctrl.tempMirrorX = this.reversed_ ;
            }
        }

        let data = this.data_.get(control.item.tag) ;
        if (data) {
            control.setData(data) ;
        }
    }

    private resized(entries: ResizeObserverEntry[]) : void {
        for(let entry of entries) {
            if (entry.target === this.elem) {
                this.doLayout() ;
            }
        }
    }
}
