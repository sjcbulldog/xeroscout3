import { IPCSection, IPCSize } from "../../ipc.js";
import { XeroPoint, XeroSize } from "../../widgets/xerogeom.js";
import { XeroWidget } from "../../widgets/xerowidget.js";
import { FormControl } from "./controls/formctrl.js";

export class XeroFormEditSectionPage extends XeroWidget {
    public static fuzzyEdgeSpacing = 10 ;
    private static kUsageScale = 0.94;

    private controls_ : FormControl[] = [] ;
    private image_ : HTMLImageElement ;
    private formdiv_ : HTMLDivElement ;
    private size_ : XeroSize ;
    private name_ : string ;

    public constructor(name: string, sz: XeroSize) {
        super('div', 'xero-form-section-page') ;

        this.name_ = name ;
        this.size_ = sz ;
        this.formdiv_ = document.createElement('div') ;
        this.formdiv_.className = 'xero-form-section-page-form' ;

        this.formdiv_.style.width = `${sz.width}px` ;
        this.formdiv_.style.height = `${sz.height}px` ;

        this.image_ = document.createElement('img') ;
        this.image_.className = 'xero-form-section-image' ;
        this.formdiv_.appendChild(this.image_) ;

        this.elem.appendChild(this.formdiv_) ;
    }

    public setPageSize(sz: XeroSize) : void {
        this.size_ = sz ;
        this.formdiv_.style.width = `${sz.width}px` ;
        this.formdiv_.style.height = `${sz.height}px` ;
    }

    public get form() : HTMLDivElement {
        return this.formdiv_ ;
    }

    public resetHTML() : void {
        this.formdiv_.innerHTML = '' ;
        this.formdiv_.appendChild(this.image_) ;
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
        this.formdiv_.innerHTML = '' ;
        this.formdiv_.appendChild(this.image_) ;
        this.controls_ = [] ;
    }

    public scaleControlsToImageSize(imsize: IPCSize) : void {
        let sx = this.imageSize.width / imsize.width ;
        let sy = this.imageSize.height / imsize.height ;

        for(let control of this.controls_) {
            control.scale(sx, sy) ;
            control.resetHTMLControl() ;
            this.addControlToLayout(control) ;
        }
    }

    private addControlToLayout(control: FormControl) : void {
        let bounds = this.elem.getBoundingClientRect() ;
        let fbounds = this.formdiv_.getBoundingClientRect() ;
        control.createForEdit(this.formdiv_, fbounds.left - bounds.left, fbounds.top) ;
    }
}
