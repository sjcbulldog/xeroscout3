import {  IPCFormItem  } from "../../../ipc.js";
import {  XeroRect  } from "../../../widgets/xerogeom.js";
import {  XeroView  } from "../../xeroview.js";
import {  EditFormControlDialog  } from "../dialogs/editformctrldialog.js";

export abstract class FormControl {
    private view_ : XeroView ;
    private item_ : IPCFormItem ;
    private ctrl_? : HTMLElement ;

    constructor(view: XeroView, item: IPCFormItem) {
        this.item_ = JSON.parse(JSON.stringify(item)) ;
        this.view_ = view ;
    }

    public get view() : XeroView {
        return this.view_ ;
    }

    public bounds() : XeroRect {
        return new XeroRect(this.item_.x, this.item_.y, this.item_.width, this.item_.height) ;
    }

    public get item() : IPCFormItem {
        return this.item_ ;
    }

    public get ctrl() : HTMLElement | undefined {
        return this.ctrl_ ;
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

    public update(item: IPCFormItem) {
        this.item_ = item ;
    }

    public abstract updateFromItem(editing: boolean, xoff?: number, yoff?: number) : void ;
    public abstract createForEdit(parent: HTMLElement, xoff: number, yoff:number) : void ;
    public abstract createForScouting(parent: HTMLElement, xoff: number, yoff:number) : void ;
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