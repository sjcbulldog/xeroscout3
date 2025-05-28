import { IPCSection } from "../../ipc.js";
import { XeroPoint, XeroSize } from "../../widgets/xerogeom.js";
import { XeroWidget } from "../../widgets/xerowidget.js";
import { FormControl } from "./controls/formctrl.js";

export class XeroFormEditSectionPage extends XeroWidget {
    public static fuzzyEdgeSpacing = 10 ;
    private static kUsageScale = 0.94;

    private controls_ : FormControl[] = [] ;
    private image_ : HTMLImageElement ;
    private observer_ : ResizeObserver ;
    private name_ : string ;

    public constructor(name: string) {
        super('div', 'xero-form-section-page') ;

        this.name_ = name ;
        this.image_ = document.createElement('img') ;
        this.image_.className = 'xero-form-section-image' ;
        this.elem.appendChild(this.image_) ;

        this.observer_ = new ResizeObserver(this.onResize.bind(this)) ;
        this.observer_.observe(this.elem) ;
    }

    public resetHTML() : void {
        this.elem.innerHTML = '' ;
        this.elem.appendChild(this.image_) ;
    }

    public doLayout() : void {
        for(let control of this.controls_) {
            control.resetHTMLControl() ;
            this.addControlToLayout(control) ;
        }
    }

    public get controls() : FormControl[] {
        return this.controls_ ;
    }

    public get imageSize() : XeroSize {
        let bounds = this.image_.getBoundingClientRect() ;
        return new XeroSize(bounds.width, bounds.height) ;
    }

    //
    // Find a control by its form position
    //
    public findControlsByPosition(pt: XeroPoint) : FormControl[] {
        let ret : FormControl[] = [] ;
        for(let entry of this.controls_) {
            if (entry.ctrl === undefined) {
                continue ;
            }

            if (entry.fuzzyBounds.contains(pt)) {
                ret.push(entry) ;
            }
        }

        ret.sort((a, b) => {
            if (a.bounds.width * a.bounds.height > b.bounds.width * b.bounds.height) {
                return -1 ;
            } else if (a.bounds.width * a.bounds.height < b.bounds.width * b.bounds.height) {
                return 1 ;
            }
            if (a.bounds.left < b.bounds.left) {
                return -1 ;
            }
            if (a.bounds.left > b.bounds.left) {
                return 1 ;
            }
            if (a.bounds.top < b.bounds.top) {
                return -1 ;
            }
            if (a.bounds.top > b.bounds.top) {
                return 1 ;
            }
            return 0 ;
        }) ;    
        return ret ;
    }    

    public addControl(control: FormControl) : void {
        this.controls_.push(control) ;
        this.addControlToLayout(control) ;
    }

    public removeControl(control: FormControl) : void {
        let index = this.controls_.indexOf(control) ;
        if (index >= 0) {
            control.resetHTMLControl() ;
            this.controls_.splice(index, 1) ;
        }
    }

    public setImage(data: string) : void {
        this.image_.src = `data:image/png;base64,${data}` ;
    }
    
    public removeAllControls() : void {
        this.elem.innerHTML = '' ;
        this.elem.appendChild(this.image_) ;
        this.controls_ = [] ;
    }

    private addControlToLayout(control: FormControl) : void {
        let top = this.elem.getBoundingClientRect().top ;
        control.createForEdit(this.elem, 0, top) ;
        control.ctrl!.draggable = false ;
    }

    private dumpImageSize(title: string) : void {
        let bounds = this.image_.getBoundingClientRect() ;
        console.log(`${title}: ${bounds.width.toFixed(1)} x ${bounds.height.toFixed(1)}`) ;
    }

    private onResize(entries: ResizeObserverEntry[]) : void {
        for(let entry of entries) {
            if (entry.target === this.elem) {
                
            }
        }
    }   
}
