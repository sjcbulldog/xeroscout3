import {  EventEmitter  } from "events";

export abstract class XeroDialog extends EventEmitter {
    private static first_ : boolean = true ;
    private title_ : string ;
    private moving_ : boolean ;
    private parent_? : HTMLElement ;
    private popup_? : HTMLDivElement ;
    private topbar_? : HTMLDivElement ;
    private client_area_? : HTMLDivElement ;
    private button_area_? : HTMLDivElement ;
    private startx_ : number = 0 ;
    private starty_ : number = 0 ;
    private startleft_ : number = 0 ;
    private starttop_ : number = 0 ;
    private process_enter_key_ : boolean = true ;
    private mouse_move_handler_ : (event: MouseEvent) => void ;
    private mouse_up_handler_ : (event: MouseEvent) => void ;
    private key_down_handler_ : (event: KeyboardEvent) => void ;

    private yes_no_? : boolean ;

    constructor(title: string, yes_no: boolean = false) {
        super() ;

        this.yes_no_ = yes_no ;
        this.title_ = title ;
        this.moving_ = false ;

        this.mouse_move_handler_ = this.mouseMove.bind(this) ;
        this.mouse_up_handler_ = this.mouseUp.bind(this) ;
        this.key_down_handler_ = this.keyDown.bind(this) ;
    }

    public disableEnterKeyProcessing() {
        this.process_enter_key_ = false ;
    }

    public get popup() : HTMLDivElement | undefined {
        return this.popup_ ;
    }

    public showRelative(win: HTMLElement, x: number, y: number) {
        this.parent_ = win ;
        this.prePlaceInit() ;

        this.popup_!.style.left = x + 'px' ;
        this.popup_!.style.top = y + 'px' ;

        this.postPlaceInit() ;
    }

    private centerDialog() {
        let pbounds = this.parent_!.offsetParent!.getBoundingClientRect() ;
        let dbounds = this.popup_!.getBoundingClientRect() ;

        let left = (pbounds.width / 2) - (dbounds.width / 2) ;
        let top = (pbounds.height / 2) - (dbounds.height / 2) ;

        this.popup_!.style.left = left + 'px' ;
        this.popup_!.style.top = top + 'px' ;
    }

    public showCentered(win: HTMLElement) {
        this.parent_ = win ;
        this.prePlaceInit() ;

        if (XeroDialog.first_) {
            setTimeout(this.centerDialog.bind(this), 100) ;
            XeroDialog.first_ = false ;
        }
        else {
            setTimeout(this.centerDialog.bind(this), 10) ;
        }
        this.postPlaceInit() ;
    }

    private postPlaceInit() {
        document.addEventListener('keydown', this.key_down_handler_) ;
        this.topbar_!.addEventListener('mousedown', this.mouseDown.bind(this)) ;
    }

    private prePlaceInit() {
        this.popup_ = document.createElement('div') ;
        this.popup_.className = 'xero-popup-form-edit-dialog' ;
        this.popup_.style.zIndex = '1100' ;

        this.topbar_ = document.createElement('div') ;
        this.topbar_.className = 'xero-popup-form-edit-dialog-topbar' ;
        if (this.title_) {
            this.topbar_.innerHTML = this.title_ ;
        }
        this.popup_.appendChild(this.topbar_) ;

        this.client_area_ = document.createElement('div') ;
        this.client_area_.className = 'xero-popup-form-edit-dialog-client' ;
        this.popup_.appendChild(this.client_area_) ;

        this.button_area_ = document.createElement('div') ;
        this.button_area_.className = 'xero-popup-form-edit-dialog-buttons' ;
        this.popup_.appendChild(this.button_area_) ;

        this.populateDialog(this.client_area_) 
        this.populateButtons(this.button_area_) ;

        this.parent_!.appendChild(this.popup_!) ;
        this.onInit() ;        
    }

    protected abstract populateDialog(div: HTMLDivElement) : void ;

    protected onInit() : void {
        //
        // Can be used by derived classes to do any initialization
        // after the dialog is shown, like setting focus on a specific
        // control.
        //
    }

    private mouseDown(event: MouseEvent ) {
        if (event.button === 0 && this.popup_) {
            this.moving_ = true ;
            this.startx_ = event.clientX ;
            this.starty_ = event.clientY ;

            this.startleft_ = parseInt(this.popup_.style.left) ;
            this.starttop_ = parseInt(this.popup_.style.top) ;

            document.addEventListener('mousemove', this.mouse_move_handler_) ;
            document.addEventListener('mouseup', this.mouse_up_handler_) ;
        }
    }

    private mouseMove(event: MouseEvent) {
        if (this.moving_ && this.popup_ ) {
            let dx = event.clientX - this.startx_ ;
            let dy = event.clientY - this.starty_ ;
            let left = this.startleft_ + dx ;
            let top = this.starttop_ + dy ;
            this.popup_.style.left = left + 'px' ;
            this.popup_.style.top = top + 'px' ;
        }
    }

    private mouseUp(event: MouseEvent) {
        if (this.moving_) {
            this.moving_ = false ;
            document.removeEventListener('mousemove', this.mouse_move_handler_) ;
            document.removeEventListener('mouseup', this.mouse_up_handler_) ;
        }
    }

    private keyDown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            this.pressCancelButton(event) ;
        }
        else if (event.key === 'Enter' && this.process_enter_key_) {
            this.pressOKButton(event) ;
        }
    }

    private pressOKButton(event: Event) {
        if (this.isOKToClose(true)) {
            this.okButton(event) ;
            this.close(true) ;
        }
    }

    private pressCancelButton(event: Event) {
        if (this.isOKToClose(false)) {
            this.cancelButton(event) ;
            this.close(false) ;
        }
    }

    public okButton(event: Event) {
    }

    public cancelButton(event: Event) {
    }

    protected isOKToClose(ok: boolean) : boolean { 
        return true ;
    }

    public populateButtons(div: HTMLDivElement) {
        let okbutton = document.createElement('button') ;
        okbutton.innerText = this.yes_no_ ? 'Yes' : 'OK' ;
        okbutton.className = 'xero-popup-form-edit-dialog-button' ;
        okbutton.addEventListener('click', this.pressOKButton.bind(this)) ;
        div.appendChild(okbutton) ;

        let cancelbutton = document.createElement('button') ;
        cancelbutton.innerText = this.yes_no_ ? 'No' : 'Cancel' ;
        cancelbutton.className = 'xero-popup-form-edit-dialog-button' ;
        cancelbutton.addEventListener('click', this.pressCancelButton.bind(this)) ;
        div.appendChild(cancelbutton) ;
    }

    public close(changed: boolean) {
        document.removeEventListener('keydown', this.key_down_handler_) ;

        if (this.popup_ && this.parent_ && this.parent_.contains(this.popup_)) {
            this.parent_.removeChild(this.popup_) ;
            this.popup_ = undefined ;
        }

        this.emit('closed', changed) ;
    }
}