import {  IPCFormItem  } from "../../../ipc.js";
import {  XeroPoint, XeroRect, XeroSize  } from "../../../widgets/xerogeom.js";
import {  XeroView  } from "../../xeroview.js";
import {  EditFormControlDialog  } from "../dialogs/editformctrldialog.js";

export type FormDisplayStyle = 'none' | 'selected' | 'highlighted' ;

export abstract class FormControl {
    public static fuzzyEdgeSpacing = 10 ;
    public static kMinimumWidth = 20 ;
    public static kMinimumHeight = 20 ;

    private view_ : XeroView ;
    private item_ : IPCFormItem ;
    private ctrl_? : HTMLElement ;
    private origional_bounds_? : XeroRect ;
    private offset_? : XeroPoint ;
    private style_ : FormDisplayStyle = 'none' ;
    
    constructor(view: XeroView, item: IPCFormItem) {
        this.item_ = JSON.parse(JSON.stringify(item)) ;
        this.view_ = view ;
    }

    public get view() : XeroView {
        return this.view_ ;
    }

    public get bounds() : XeroRect {
        return new XeroRect(this.item.x, this.item.y, this.item.width, this.item.height) ;
    }

    public get fuzzyBounds() : XeroRect {
        return new XeroRect(this.item.x - FormControl.fuzzyEdgeSpacing, this.item.y - FormControl.fuzzyEdgeSpacing,
                            this.item.width + (2 * FormControl.fuzzyEdgeSpacing), this.item.height + (2 * FormControl.fuzzyEdgeSpacing)) ;
    }

    public get originalBounds() : XeroRect {
        if (this.origional_bounds_ === undefined) {
            return this.bounds ;
        }
        
        return this.origional_bounds_! ;
    }

    public get size() : XeroSize {
        return new XeroSize(this.item.width, this.item.height) ;
    }

    public get position() : XeroPoint {
        return new XeroPoint(this.item.x, this.item.y) ;
    }
    
    public get displayStyle() : FormDisplayStyle {   
        return this.style_ ;
    }

    public set displayStyle(style: FormDisplayStyle) {
        this.style_ = style ;
        if (this.ctrl_) {
            switch (style) {
                case 'none':
                    this.ctrl_.style.border = 'none' ;
                    this.ctrl_.style.margin = '4px' ;
                    break ;
                case 'selected':
                    this.ctrl_.style.borderStyle = 'solid' ;
                    this.ctrl_.style.borderWidth = '4px' ;
                    this.ctrl_.style.borderColor = 'red' ;
                    this.ctrl_.style.margin = '0px' ;                            
                    break ;
                case 'highlighted':
                    this.ctrl_.style.borderStyle = 'dashed' ;
                    this.ctrl_.style.borderWidth = '4px' ;
                    this.ctrl_.style.borderColor = 'red' ;
                    this.ctrl_.style.margin = '0px' ;                    
                    break ;
            }
        }
    }

    public positionUpdated() {
        if (this.ctrl_) {
            this.ctrl_.style.left = (this.item.x + this.offset.x) + 'px' ;
            this.ctrl_.style.top = (this.item.y + this.offset.y) + 'px' ;
            this.ctrl_.style.width = this.item.width + 'px' ;
            this.ctrl_.style.height = this.item.height + 'px' ;
        }
    }

    private isNear(pt: number, edge: number) {
        let ret = false ;

        let upper = edge + FormControl.fuzzyEdgeSpacing ;
        let lower = edge - FormControl.fuzzyEdgeSpacing ;
        if (pt >= lower && pt <= upper) {
            ret = true ;
        }
        return ret ;
    }

    private isWithin(pt: number, minv: number, maxv: number) {
        console.log(`compare ${pt} ${minv - FormControl.fuzzyEdgeSpacing} ${maxv + FormControl.fuzzyEdgeSpacing}` )
        return pt > minv - FormControl.fuzzyEdgeSpacing && pt < maxv + FormControl.fuzzyEdgeSpacing ;
    }

    public isRightEdge(pt: XeroPoint) {
        if (this.ctrl_ === undefined) {
            return false ;
        }

        if (this.isNear(pt.x, this.bounds.right) && this.isWithin(pt.y, this.bounds.top, this.bounds.bottom)) {
            return true ;
        }
        return false ;
    }

    public isLeftEdge(pt: XeroPoint) {
        if (this.ctrl_ === undefined) {
            return false ;
        }
        if (this.isNear(pt.x, this.bounds.left) && this.isWithin(pt.y, this.bounds.top, this.bounds.bottom)) {
            return true ;
        }
        return false ;
    }

    public isTopEdge(pt: XeroPoint) {
        if (this.ctrl_ === undefined) {
            return false ;
        }
        if (this.isNear(pt.y, this.bounds.top) && this.isWithin(pt.x, this.bounds.left, this.bounds.right)) {
            return true ;
        }
        return false ;
    }

    public isBottomEdge(pt: XeroPoint) {
        if (this.ctrl_ === undefined) {
            return false ;
        }
        if (this.isNear(pt.y, this.bounds.bottom) && this.isWithin(pt.x, this.bounds.left, this.bounds.right)) {
            return true ;
        }
        return false ;
    }

    public getEdgeFlags(pt: XeroPoint) : [boolean, boolean, boolean, boolean] {
        let left = this.isLeftEdge(pt) ;
        let right = this.isRightEdge(pt) ;
        let top = this.isTopEdge(pt) ;
        let bottom = this.isBottomEdge(pt) ;

        return [top, left, bottom, right] ;
    }

    public get item() : IPCFormItem {
        return this.item_ ;
    }

    public get ctrl() : HTMLElement | undefined {
        return this.ctrl_ ;
    }

    public resetHTMLControl() {
        if (this.ctrl_ && this.ctrl_.parentElement) {
            this.ctrl_.parentElement.removeChild(this.ctrl_) ;
        }
        this.ctrl_ = undefined ;
    }

    public set ctrl(ctrl: HTMLElement) {
        this.ctrl_ = ctrl ;
    }

    public clone(tag: string) : FormControl {
        let t = typeof this ;
        let ret = this.copyObject() ;
        ret.item_ = JSON.parse(JSON.stringify(this.item_)) ;
        ret.item_.tag = tag ;
        return ret ;
    }

    public get offset() : XeroPoint {
        if (this.offset_ === undefined) {
            return new XeroPoint(0, 0) ;
        }

        return this.offset_ ;
    }

    public setOriginalBounds() {
        this.origional_bounds_ = new XeroRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height) ;
    }

    public update(item: IPCFormItem) {
        this.item_ = item ;
    }

    public abstract updateFromItem(editing: boolean, xoff?: number, yoff?: number) : void ;

    public createForEdit(parent: HTMLElement, xoff: number, yoff:number) : void {
        if(this.ctrl_ !== undefined) {
            throw new Error('Control already created') ;    
        }

        this.offset_ = new XeroPoint(xoff, yoff) ;
    }

    public createForScouting(parent: HTMLElement, xoff: number, yoff:number) : void  {
        if(this.ctrl_ !== undefined) {
            throw new Error('Control already created') ;    
        }
                
        this.offset_ = new XeroPoint(xoff, yoff) ;
    }

    public abstract createEditDialog() : EditFormControlDialog ;
    public abstract getData() : void ;
    public abstract setData(data: any) : void ;
    protected abstract copyObject() : FormControl ;

    protected setTag(tag: string) {
        this.item_.tag = tag ;
    }

    protected setPosition(xoff:number, yoff:number, zpos?: number) {
        if (xoff !== undefined && yoff !== undefined && this.ctrl) {
            this.ctrl.style.left = (this.item.x + xoff) + 'px' ;
            this.ctrl.style.top = (this.item.y + yoff) + 'px' ;
            this.ctrl.style.width = this.item.width + 'px' ;
            this.ctrl.style.height = this.item.height + 'px' ;
            this.ctrl.style.position = 'absolute' ;            
            this.ctrl.style.margin = '4px' ;     
            this.ctrl.style.zIndex = zpos ? zpos.toString() : '1000' ;
        }
    }

    protected setBounds(bounds: XeroRect) {
        this.item_.x = bounds.x ;
        this.item_.y = bounds.y ;
        this.item_.width = bounds.width ;
        this.item_.height = bounds.height ;
    }

    protected setClassList(ctrl: HTMLElement, oper: string, child?: string) {       
        let name: string ;

        name = 'xero-form-' + this.item.type + (child ? '-' + child : '') ;
        ctrl.classList.add(name) ;

        name = 'xero-form-' + oper + '-' + this.item.type + (child ? '-' + child : '') ;
        ctrl.classList.add(name) ;

        name = 'xero-form-' + oper + '-item' ;
        ctrl.classList.add(name) ;
    }
}