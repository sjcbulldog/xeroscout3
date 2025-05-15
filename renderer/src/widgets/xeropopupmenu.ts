import {  EventEmitter  } from "events";
import {  XeroPoint  } from "./xerogeom.js";

export class XeroPopMenuItem {
    private text_: string ;
    private callback_?: () => void ;
    private submenu_? : XeroPopupMenu ;

    constructor(text: string, callback: (() => void) | undefined, submenu?: XeroPopupMenu) {
        this.text_ = text ;
        this.callback_ = callback ;
        this.submenu_ = submenu ;
    }

    public get text() : string {
        return this.text_ ;
    }

    public get action() : (() => void) | undefined {
        return this.callback_ ;
    }

    public get submenu() : XeroPopupMenu | undefined {
        return this.submenu_ ;
    }
}

export class XeroPopupMenu extends EventEmitter {
    private static childMenuOffsetX = 10 ;
    private static childMenuOffsetY = 10 ;

    private static current_? : XeroPopupMenu ;
    private parent_? : HTMLElement ;
    private items_ : XeroPopMenuItem[] ;
    private child_menu_? : XeroPopupMenu ;
    private popup_? : HTMLElement ;
    private global_click_ : (event: MouseEvent) => void ;
    private global_key_ : (event: KeyboardEvent) => void ;
    private name_ : string ; 
    private child_?: boolean ;

    public constructor(name: string, items: XeroPopMenuItem[]) {
        super() ;

        this.items_ = items ;
        this.name_ = name ;

        this.global_click_ = this.onGlobalClick.bind(this) ;
        this.global_key_ = this.onGlobalKey.bind(this) ;
    }

    private onClick(item: XeroPopMenuItem, event: MouseEvent) {
        if (item.action) {
            this.emit('menu-item-selected', item) ;
            item.action() ;
            this.closeMenu() ;
        }
        event.preventDefault() ;        
    }

    private onSubmenuShow(item: XeroPopMenuItem, event: MouseEvent) {
        this.emit('submenu-opened', item) ;

        if (item.submenu && this.parent_) {
            this.child_menu_ = item.submenu ;
            this.child_menu_.showRelative(this.parent_, new XeroPoint(event.clientX - XeroPopupMenu.childMenuOffsetX, event.clientY - XeroPopupMenu.childMenuOffsetY), true) ;
        }
        event.preventDefault() ;
    }

    private onGlobalClick(event: MouseEvent) {
        if (XeroPopupMenu.current_) {
            XeroPopupMenu.current_.closeMenu() ;
        }
    }

    private onGlobalKey(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            this.closeMenu() ;
        }
    }

    private closeInternal() {
        //
        // This will always be the top most menu in the stack
        //
        if (this.child_menu_) {
            this.child_menu_.closeInternal() ;
            this.child_menu_ = undefined ;
        }

        if (this.parent_ && this.popup_?.parentElement === this.parent_) {
            this.parent_.removeChild(this.popup_!) ;
        }

        this.emit('menu-closed') ;
        document.removeEventListener('click', this.global_click_) ;
        document.removeEventListener('keydown', this.global_key_) ;
    }

    public closeMenu() {
        XeroPopupMenu.current_?.closeInternal() ;
    }

    private closeChildMenu() {
        console.log('closeChildMenu') ;
    }

    public showRelative(win: HTMLElement, pt: XeroPoint, child?: boolean) {
        this.parent_ = win ;
        this.popup_ = document.createElement('div') ;
        this.popup_.className = 'xero-popup-menu' ;
        this.popup_.style.left = pt.x + 'px' ;
        this.popup_.style.top = pt.y + 'px' ;
        this.popup_.style.zIndex = '1000' ;
        this.child_ = child ;

        for(let item of this.items_) {
            let div = document.createElement('div') ;
            div.className = 'xero-popup-menu-item-div' ;

            let divitem = document.createElement('div') ;
            divitem.className = 'xero-popup-menu-item' ;
            divitem.innerText = item.text ;
            div.appendChild(divitem) ;

            let divsub = document.createElement('div') ;
            divsub.className = 'xero-popup-menu-submenu' ;
            if (item.submenu) {
                divsub.innerHTML = '&#x27A4;' ;
                divsub.addEventListener('click', this.onSubmenuShow.bind(this, item)) ;
                divsub.addEventListener('mouseover', this.onSubmenuShow.bind(this, item)) ;
                divitem.addEventListener('click', this.onSubmenuShow.bind(this, item)) ;
                div.addEventListener('click', this.onSubmenuShow.bind(this, item)) ;
            }
            else {
                divsub.addEventListener('click', this.onClick.bind(this, item)) ;
                divitem.addEventListener('click', this.onClick.bind(this, item)) ;
                div.addEventListener('click', this.onClick.bind(this, item)) ;                
            }
            div.appendChild(divsub) ;
            this.popup_.appendChild(div) ;
        }

        document.addEventListener('click', this.global_click_) ;
        document.addEventListener('keydown', this.global_key_) ;
        this.parent_.appendChild(this.popup_) ; 

        if (!child) {
            XeroPopupMenu.current_ = this ;
        }
        else {
            this.popup_.addEventListener('mouseleave', this.closeChildMenu.bind(this)) ;
        }
    }    
}