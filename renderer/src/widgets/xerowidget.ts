import {  XeroMainProcessInterface  } from "./xerocbtarget.js";
import {  XeroRect  } from "./xerogeom.js";

declare global {
    interface HTMLElement {
        xerodata: any;
    }
}

export class XeroWidget extends XeroMainProcessInterface {
    public readonly elem: HTMLElement;
    private parentWidget_ : XeroWidget | undefined = undefined;

    public constructor(etype: string, cname: string) {
        super();
        
        this.elem = document.createElement(etype);
        this.elem.className = cname;
    }

    public close() {
        this.unregisterAllCallbacks();
    }

    public parent(): HTMLElement {
        return this.elem.parentElement!;
    }

    public parentWidget(): XeroWidget | undefined {
        return this.parentWidget_;
    }    

    public setParent(parent: HTMLElement) {
        if (this.elem.parentElement) {
            this.elem.parentElement.removeChild(this.elem);
        }
        parent.appendChild(this.elem);
    }

    public setParentWidget(parent: XeroWidget) {
        this.parentWidget_ = parent;
        this.setParent(this.parentWidget_!.elem);
    }

    public static checkWidgetPositions(elem: HTMLElement) {
        let body = document.body;
        let bodybounds = body.getBoundingClientRect();

        let rect = elem.getBoundingClientRect();
        if (rect.left < bodybounds.left || rect.right > bodybounds.right || rect.top < bodybounds.top || rect.bottom > bodybounds.bottom) {
            console.log(`Widget tag ${elem.tagName}, class ${elem.className} is out of bounds!`) ;
            console.log(`    widget: rect.left=${rect.left}, rect.right=${rect.right}, rect.top=${rect.top}, rect.bottom=${rect.bottom}`);
            console.log(`    body: left=${bodybounds.left}, right=${bodybounds.right}, top=${bodybounds.top}, bottom=${bodybounds.bottom}`);
        }

        for(let child of elem.children) {
            XeroWidget.checkWidgetPositions(child as HTMLElement);
        }
    }
}
