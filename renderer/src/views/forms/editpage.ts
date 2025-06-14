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
        return XeroSize.zero ;
    }

    private holderScrolled(ev: Event) : void {
        this.resetHTML() ;
        this.doLayout() ;
    }

    private getClipRect(ctrl: FormControl) : string | undefined {
        let cbounds : XeroRect = XeroRect.fromDOMRect(ctrl.ctrl!.getBoundingClientRect()) ;
        let fbounds : XeroRect = XeroRect.fromDOMRect(this.holder_.getBoundingClientRect()) ;

        let left = -4 ;
        let right = -8 ;
        let top = -4 ;
        let bottom = -8 ;

        let vsbar = 0 ;
        let hsbar = 0 ;

        if (this.holder_.clientWidth !== this.holder_.scrollWidth) {
            vsbar = this.holder_.offsetWidth - this.holder_.clientWidth ;
        }

        if (this.holder_.clientHeight !== this.holder_.scrollHeight) {
            hsbar = this.holder_.offsetHeight - this.holder_.clientHeight ;
        }

        if (cbounds.left < fbounds.left) {
            left = fbounds.left - cbounds.left ;
        }

        if (cbounds.right > fbounds.right) {
            right = cbounds.right - fbounds.right  + vsbar ;
        }

        if (cbounds.top < fbounds.top) {
            top = fbounds.top - cbounds.top ;
        }

        if (cbounds.bottom > fbounds.bottom) {
            bottom = cbounds.bottom - fbounds.bottom + hsbar ;
        }

        console.log(`Clip rect: ${left}, ${right}, ${top}, ${bottom}`) ;
        console.log(`  Control bounds: ${cbounds}`) ;
        console.log(`  Form bounds: ${fbounds}`) ;
        console.log('\n\n') ;

        let clip = `inset(${top}px ${right}px ${bottom}px ${left}px)` ;
        return clip ;
    }

    public clipControl(control: FormControl) : void {
        if (control.ctrl === undefined) {
            return ;
        }
        let clip = this.getClipRect(control) ;
        if (clip !== undefined) {
            control.ctrl.style.clipPath = clip ;
        } else {
            control.ctrl.style.clipPath = '' ;
        }
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
