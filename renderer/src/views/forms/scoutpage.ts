import { XeroWidget } from "../../widgets/xerowidget.js";
import { FormControl } from "./controls/formctrl.js";
import { XeroEditFormView } from "./editformview.js";

export class XeroFormScoutSectionPage extends XeroWidget {
    private static kUsageScale = 0.98 ;

    private controls_ : FormControl[] = [] ;
    private image_ : HTMLImageElement ;
    private observer_ : ResizeObserver ;

    public constructor(data: string) {
        super('div', 'xero-form-section-page') ;

        this.image_ = document.createElement('img') ;
        this.image_.className = 'xero-form-section-image' ;
        this.image_.src = `data:image/png;base64,${data}` ;
        this.elem.appendChild(this.image_) ;

        this.observer_ = new ResizeObserver(this.onResize.bind(this)) ;
        this.observer_.observe(this.elem) ;
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

    private onResize(entries: ResizeObserverEntry[]) : void {
        for(let entry of entries) {
            if (entry.target === this.elem) {
                this.image_.style.width = `${entry.contentRect.width * XeroFormScoutSectionPage.kUsageScale}px` ;
                this.image_.style.height = `${entry.contentRect.height * XeroFormScoutSectionPage.kUsageScale}px` ;
            }
        }        
    }

    private addControlToLayout(control: FormControl) : void {
        let top = this.elem.getBoundingClientRect().top ;
        control.createForScouting(this.elem, 0, top) ;
        control.ctrl!.draggable = false ;
    }
}
