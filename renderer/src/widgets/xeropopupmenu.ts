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
    private parent_? : HTMLElement ;
    private items_ : XeroPopMenuItem[] ;
    private child_menu_? : XeroPopupMenu ;
    private parent_menu_? : XeroPopupMenu ;
    private item_map_ : Map<HTMLElement, XeroPopMenuItem> = new Map() ;
    private popup_? : HTMLElement ;
    private global_click_ : (event: MouseEvent) => void ;
    private global_key_ : (event: KeyboardEvent) => void ;
    private name_ : string ; 

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
    }

    private onSubmenuClick(item: XeroPopMenuItem, event: MouseEvent) {
        this.emit('submenu-opened', item) ;

        if (item.submenu && this.parent_) {
            this.child_menu_ = item.submenu ;
            item.submenu.parent_menu_ = this ;
            this.child_menu_.showRelative(this.parent_, new XeroPoint(event.clientX, event.clientY)) ;
        }
    }

    private onGlobalClick(event: MouseEvent) {
    }

    private onGlobalKey(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            this.closeMenu() ;
        }
    }

    public closeMenu() {
        if (this.popup_ && this.parent_ && this.parent_.contains(this.popup_)) {
            this.parent_.removeChild(this.popup_) ;
            this.popup_ = undefined ;
        }

        if (this.parent_menu_) {
            this.parent_menu_.closeMenu() ;
        }
        else {
            this.emit('menu-closed') ;
            document.removeEventListener('click', this.global_click_) ;
            document.removeEventListener('keydown', this.global_key_) ;
        }
    }

    public showRelative(win: HTMLElement, pt: XeroPoint) {
        this.parent_ = win ;
        this.popup_ = document.createElement('div') ;
        this.popup_.className = 'xero-popup-menu' ;
        this.popup_.style.left = pt.x + 'px' ;
        this.popup_.style.top = pt.y + 'px' ;
        this.popup_.style.zIndex = '1000' ;

        for(let item of this.items_) {
            let div = document.createElement('div') ;
            div.className = 'xero-popup-menu-item' ;

            this.item_map_.set(div, item) ;
            if (item.submenu) {
                div.onclick = this.onSubmenuClick.bind(this, item) ;
                div.innerHTML += item.text + '&nbsp;&nbsp;&nbsp;&nbsp;&#x27A4;' ;
            } else {
                div.innerText = item.text ;
                div.onclick = this.onClick.bind(this, item) ;
            }
            this.popup_.appendChild(div) ;
        }

        document.addEventListener('click', this.global_click_) ;
        document.addEventListener('keydown', this.global_key_) ;
        this.parent_.appendChild(this.popup_) ; 
    }    
}