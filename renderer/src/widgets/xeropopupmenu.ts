import {  EventEmitter  } from "events";
import {  XeroPoint  } from "./xerogeom.js";

export class XeroPopMenuItem {
    private text_: string ;
    private callback_?: () => void ;
    private submenu_? : XeroPopupMenu ;
    private topdiv_? : HTMLElement ;
    private item_?: HTMLElement ;
    private sub_? : HTMLElement ;

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

    public set topdiv(div: HTMLElement) {
        this.topdiv_ = div ;
    }   

    public get topdiv() : HTMLElement | undefined {
        return this.topdiv_ ;
    }

    public set itemDiv(item: HTMLElement) {
        this.item_ = item ;
    }

    public get itemDiv() : HTMLElement | undefined {
        return this.item_ ;
    }

    public set subDiv(sub: HTMLElement) {
        this.sub_ = sub ;
    }

    public get subDiv() : HTMLElement | undefined {
        return this.sub_ ;
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

        this.removeFromParent() ;

        this.emit('menu-closed') ;
        document.removeEventListener('click', this.global_click_) ;
        document.removeEventListener('keydown', this.global_key_) ;
    }

    public closeMenu() {
        if (this.child_menu_) {
            this.child_menu_.closeMenu() ;
        }

        this.removeFromParent() ;
    }

    private removeFromParent() {
        if (this.parent_ && this.popup_?.parentElement === this.parent_) {
            this.parent_.removeChild(this.popup_!) ;
        }        
    }

    private closeChildMenuInternal(child: XeroPopupMenu) {
        if (this.child_menu_ === child) {
            this.child_menu_.removeFromParent() ;
            this.child_menu_ = undefined ;
        }
    }

    private closeChildMenu() {
        if (XeroPopupMenu.current_) {
            XeroPopupMenu.current_.closeChildMenuInternal(this) ;
        }
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
            item.topdiv = document.createElement('div') ;
            item.topdiv.className = 'xero-popup-menu-item-div' ;

            item.itemDiv = document.createElement('div') ;
            item.itemDiv.className = 'xero-popup-menu-item' ;
            item.itemDiv.innerText = item.text ;
            item.topdiv.appendChild(item.itemDiv) ;

            item.subDiv = document.createElement('div') ;
            item.subDiv.className = 'xero-popup-menu-submenu' ;
            if (item.submenu) {
                item.subDiv.innerHTML = '&#x27A4;' ;
                item.subDiv.addEventListener('mouseover', this.onSubmenuShow.bind(this, item)) ;
            }
            else {
                item.itemDiv.addEventListener('click', this.onClick.bind(this, item)) ;
            }
            item.topdiv.appendChild(item.subDiv) ;
            this.popup_.appendChild(item.topdiv) ;
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