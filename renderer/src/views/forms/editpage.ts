import { IPCSize } from "../../shared/ipc.js";
import { XeroPoint, XeroRect, XeroSize } from "../../shared/xerogeom.js";
import { XeroWidget } from "../../widgets/xerowidget.js";
import { FormControl } from "./controls/formctrl.js";

export class XeroFormEditSectionPage extends XeroWidget {
    public static fuzzyEdgeSpacing = 10 ;

    private controls_ : FormControl[] = [] ;
    private holder_ : HTMLDivElement ;
    private formdiv_ : HTMLDivElement ;

    public constructor(name: string, sz: IPCSize) {
        super('div', 'xero-form-section-page') ;

        this.holder_ = document.createElement('div') ;
        this.holder_.className = 'xero-form-section-page-holder' ;
        this.holder_.addEventListener('scroll', this.holderScrolled.bind(this)) ;
        this.elem.appendChild(this.holder_) ;

        this.formdiv_ = document.createElement('div') ;
        this.formdiv_.className = 'xero-form-section-page-form' ;

        this.formdiv_.style.width = `${sz.width}px` ;
        this.formdiv_.style.height = `${sz.height}px` ;

        this.holder_.appendChild(this.formdiv_) ;
    }

    public setPageSize(sz: IPCSize) : void {
        this.formdiv_.style.width = `${sz.width}px` ;
        this.formdiv_.style.height = `${sz.height}px` ;
    }

    public get form() : HTMLDivElement {
        return this.formdiv_ ;
    }

    public resetHTML() : void {
        this.formdiv_.innerHTML = '' ;
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

    public unlockAllControls() : void {
        for(let control of this.controls_) {    
            control.locked = false ;
        }
    }
        
    //
    // Find a control by its form position
    //
    public findControlsByPosition(pt: XeroPoint, locked: boolean = false) : FormControl[] {
        let ret : FormControl[] = [] ;
        for(let entry of this.controls_) {
            if (entry.ctrl === undefined || entry.locked !== locked) {
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

    public findInterectingControls(ctrl: FormControl, filter?: (c: FormControl) => boolean) : FormControl[] {
        let ret : FormControl[] = [] ;
        for(let entry of this.controls_) {
            if (entry === ctrl || entry.ctrl === undefined || entry.locked) {
                continue ;
            }

            if (filter && !filter(entry)) {
                continue ;
            }

            if (entry.bounds.intersects(ctrl.bounds)) {
                ret.push(entry) ;
            }
        }
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
    
    public removeAllControls() : void {
        this.formdiv_.innerHTML = '' ;
        this.controls_ = [] ;
    }

    public getPlaceOffset() : XeroSize {
        let bounds = this.elem.getBoundingClientRect() ;
        let fbounds = this.formdiv_.getBoundingClientRect() ;
        return new XeroSize(fbounds.left - bounds.left + this.formdiv_.scrollLeft, fbounds.top + this.formdiv_.scrollTop) ;
    }

    private holderScrolled(ev: Event) : void {
        this.resetHTML() ;
        this.doLayout() ;
    }

    private getClipRect(ctrl: FormControl) : string | undefined {
        let cbounds : XeroRect = XeroRect.fromDOMRect(ctrl.ctrl!.getBoundingClientRect()) ;
        let fbounds : XeroRect = XeroRect.fromDOMRect(this.holder_.getBoundingClientRect()) ;

        let vbounds = fbounds.offset(new XeroSize(this.holder_.scrollLeft, this.holder_.scrollTop)) ;
        
        let ints = fbounds.intersection(cbounds) ;

        let left = -10 ;
        let right = -10 ;
        let top = -10 ;
        let bottom = -10 ;

        if (cbounds.left < fbounds.left) {
            left = fbounds.left - cbounds.left ;
        }

        if (cbounds.top < fbounds.top) {
            top = fbounds.top - cbounds.top ;
        }

        let clip = `inset(${top}px ${right}px ${bottom}px ${left}px)` ;
        return clip ;
    }

    private addControlToLayout(control: FormControl) : void {
        let sz = this.getPlaceOffset() ;
        control.createForEdit(this.formdiv_, sz.width, sz.height) ;

        let clip = this.getClipRect(control) ;
        if (clip !== undefined) {
            control.ctrl!.style.clipPath = clip ;
        }
    }
}
