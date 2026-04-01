import {  XeroWidget  } from "./xerowidget.js";

export class XeroStatusBar extends XeroWidget {
    private left_status_ : HTMLElement ;
    private middle_status_ : HTMLElement ;
    private right_status_ : HTMLElement ;

    constructor() {
        super('div', 'xero-status-bar');
        this.setTestId('status-bar') ;

        this.left_status_ = document.createElement('div') ;
        this.left_status_.className = 'xero-status-bar-left' ;
        this.left_status_.setAttribute('data-testid', 'status-left') ;
        this.elem.appendChild(this.left_status_) ;

        this.middle_status_ = document.createElement('div') ;
        this.middle_status_.className = 'xero-status-bar-middle' ;
        this.middle_status_.setAttribute('data-testid', 'status-middle') ;
        this.elem.appendChild(this.middle_status_) ;

        this.right_status_ = document.createElement('div') ;
        this.right_status_.className = 'xero-status-bar-right' ;
        this.right_status_.setAttribute('data-testid', 'status-right') ;
        this.elem.appendChild(this.right_status_) ;
    }

    public getLeftStatus() : HTMLElement {
        return this.left_status_ ;
    }

    public setLeftStatus(text: string | undefined) : void {
        if (text) {
            this.left_status_.innerHTML = text ;
        }
    }

    public getMiddleStatus() : HTMLElement {
        return this.middle_status_ ;
    }

    public setMiddleStatus(text: string | undefined) : void {
        if (text !== undefined) {
            this.middle_status_.innerHTML = text ;
        }
    }

    public getRightStatus() : HTMLElement {
        return this.right_status_ ;
    }

    public setRightStatus(text: string | undefined) : void {
        if (text !== undefined) {
            this.right_status_.innerHTML = text ;
        }
    }
}

export class XeroStatusWindow extends XeroWidget {
    private status_ : XeroStatusBar ;
    private mainview_ : XeroWidget ;
    private status_bar_height_ = 24 ;

    constructor(child: XeroWidget) {
        super('div', 'xero-status-win');
        this.setTestId('status-window') ;

        this.mainview_ = new XeroWidget('div', 'xero-status-win-mainview') ;
        this.mainview_.setTestId('status-mainview') ;
        this.mainview_.setParentWidget(this) ;
        this.mainview_.elem.style.height = `calc(100% - ${this.status_bar_height_}px)` ;
        this.mainview_.elem.style.width = '100%' ;

        child.setParentWidget(this.mainview_) ;

        this.status_ = new XeroStatusBar() ;
        this.status_.setParentWidget(this) ;
        this.status_.elem.style.height = `${this.status_bar_height_} px` ;
    }

    public statusBar() : XeroStatusBar { 
        return this.status_ ;
    }
}
