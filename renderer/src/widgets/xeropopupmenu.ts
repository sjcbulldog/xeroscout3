import {  EventEmitter  } from "events";
import {  XeroPoint  } from "../shared/xerogeom.js";

export class XeroPopupMenuItem {
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

    public isSubDiv(elem: HTMLElement) : boolean {
        return this.sub_ === elem ;
    }

    public isItemDiv(elem: HTMLElement) : boolean { 
        return this.item_ === elem ;
    }

    public isTopDiv(elem: HTMLElement) : boolean {  
        return this.topdiv_ === elem ;
    }
}

export class XeroPopupMenu extends EventEmitter {
    private static MenuItemTopDivClassName = 'xero-popup-menu-item-div' ;

    //
    // There can only be one menu open at a time, so we use a static variable to track the current menu
    // This is the topmost menu in the stack
    //
    private static top_most_menu_? : XeroPopupMenu ;

    private parent_? : HTMLElement ;
    private items_ : XeroPopupMenuItem[] ;
    private child_menu_? : XeroPopupMenu ;
    private popup_? : HTMLElement ;
    private global_click_ : (event: MouseEvent) => void ;
    private global_key_ : (event: KeyboardEvent) => void ;
    private mouse_move_bind_ : (event: MouseEvent) => void ;    
    private name_ : string ; 
    private child_?: boolean ;
    private can_close_ : boolean  = true ;

    public constructor(name: string, items: XeroPopupMenuItem[]) {
        super() ;

        this.items_ = items ;
        this.name_ = name ;

        this.global_click_ = this.onGlobalClick.bind(this) ;
        this.global_key_ = this.onGlobalKey.bind(this) ;
        this.mouse_move_bind_ = this.onGlobalMouseMove.bind(this) ;
    }

    private onClick(item: XeroPopupMenuItem, event: MouseEvent) {
        if (item.action) {
            this.emit('menu-item-selected', item) ;
            item.action() ;
            XeroPopupMenu.top_most_menu_!.closeMenu() ;
        }
        event.preventDefault() ;
        event.stopPropagation() ;        
    }

    private onSubmenuShow(item: XeroPopupMenuItem, event: MouseEvent) {
        this.emit('submenu-opened', item) ;

        if (this.child_menu_) {
            this.closeChildren() ;
        }

        if (item.submenu && this.parent_) {
            this.child_menu_ = item.submenu ;
            this.child_menu_.can_close_ = false ;
            let bounds = item.topdiv?.getBoundingClientRect() ;
            let y = (bounds!.top + bounds!.bottom) / 2 ;
            this.child_menu_.showRelativeInternal(this.parent_, new XeroPoint(bounds!.right, y), true) ;
        }
        event.stopPropagation() ;
        event.preventDefault() ;
    }

    private onGlobalClick(event: MouseEvent) {
        if (XeroPopupMenu.top_most_menu_ && event.target) {
            //
            // See if this is a click outside of any menu elements,  in 
            // this case we close the menu
            //
            let elem = event.target as HTMLElement ;
            let ret = this.findMenuItemElement(event.target as HTMLElement) ;
            if (!ret) {
                XeroPopupMenu.top_most_menu_.closeMenu() ;
            }
        }
    }

    private onGlobalKey(event: KeyboardEvent) {
        //
        // If the user presses the escape key, close the menu
        //
        if (event.key === 'Escape') {
            this.closeMenu() ;
        }
    }

    public closeMenu() {
        if (this !== XeroPopupMenu.top_most_menu_) {
            throw new Error("closeMenu: not the top menu") ;
        }

        this.closeMenuInternal() ;

        document.removeEventListener('mousemove', this.mouse_move_bind_) ;
        document.removeEventListener('click', this.global_click_) ;
        document.removeEventListener('keydown', this.global_key_) ;

        this.emit('menu-closed') ;
    }

    private removeFromParent() {
        if (this.parent_ && this.popup_?.parentElement === this.parent_) {
            this.parent_.removeChild(this.popup_!) ;
        }        
    }

    private closeMenuInternal() {
        this.closeChildren() ;
        this.removeFromParent() ;
    }

    private closeChildren() {
        if (this.child_menu_) {
            this.child_menu_.closeMenuInternal() ;
            this.child_menu_ = undefined ;
        }
    }

    private onSubmenuClick(item: XeroPopupMenuItem, event: MouseEvent) {
        event.preventDefault() ;
        event.stopPropagation() ;
    }   

    public showRelative(win: HTMLElement, pt: XeroPoint) {
        this.showRelativeInternal(win, pt, false) ;
    }

    private dumpMenuList() : string {
        let str = "" ;
        let menu = XeroPopupMenu.top_most_menu_ ;
        while (menu) {
            if (str.length > 0) {
                str += " -> " ;
            }
            str += menu.name_ ;
            menu = menu.child_menu_ ;
        }
        return str ;
    }

    private findMenuItemElement(elem: HTMLElement) : [ XeroPopupMenu, XeroPopupMenuItem ] | undefined {
        let melem : HTMLElement | null = elem ;
        while (melem && melem !== document.body) {
            if (melem.classList.contains(XeroPopupMenu.MenuItemTopDivClassName)) {
                break ;
            }
            melem = melem.parentElement ;
        }

        if (!melem || melem === document.body) {
            return undefined ;
        }

        let menu = XeroPopupMenu.top_most_menu_ ;
        while (menu) {
            for (let item of menu.items_) {
                if (item.topdiv === melem) {
                    return [ menu, item ] ;
                }
            }
            menu = menu.child_menu_ ;
        }
        return undefined ;
    }

    private onItemMouseEnter(event: MouseEvent) {
        let ret = this.findMenuItemElement(event.target as HTMLElement) ;
        if (!ret) {
            return ;
        }

        let [ menu, item ] = ret ;
        if (menu.child_menu_) {
            // We are in the item div, and there is a child, close it
            menu.closeChildren() ;
        }
    }

    private onSubmenuMouseEnter(event: MouseEvent) {
        let ret = this.findMenuItemElement(event.target as HTMLElement) ;
        if (!ret) {
            return ;
        }

        let [ menu, item ] = ret ;
        if (item.isSubDiv(event.target as HTMLElement)) {
            if (!menu.child_menu_) {
                // We are in the arrow for a submenu, and there is not child, show the child
                this.onSubmenuShow(item, event) ;
            }
            else if (menu.child_menu_ !== item.submenu) {
                // We are in the arrow for a submenu, and there is a child but it is not the right child
                this.onSubmenuShow(item, event) ;
            }
        }
        else if (item.isItemDiv(event.target as HTMLElement) || item.isTopDiv(event.target as HTMLElement)) {
            //
            // We are in the item div or top div, so if there is a child, close it
            //
            if (menu.child_menu_) {
                menu.closeChildren() ;
            }
        }
        else {
            // We are not in any of the menu items, so we do nothing
        }
    }


    private onGlobalMouseMove(event: MouseEvent) {
        event.preventDefault() ;
        event.stopPropagation() ;
    }

    private showRelativeInternal(win: HTMLElement, pt: XeroPoint, child: boolean) {
        let bounds = win.getBoundingClientRect() ;

        this.parent_ = win ;
        this.popup_ = document.createElement('div') ;
        this.popup_.className = 'xero-popup-menu' ;
        this.popup_.style.left = (pt.x - bounds.left) + 'px' ;
        this.popup_.style.top = (pt.y - bounds.top) + 'px' ;
        this.popup_.style.zIndex = '1000' ;
        this.child_ = child ;

        for(let item of this.items_) {
            item.topdiv = document.createElement('div') ;
            item.topdiv.className = XeroPopupMenu.MenuItemTopDivClassName ;

            item.itemDiv = document.createElement('div') ;
            item.itemDiv.className = 'xero-popup-menu-item' ;
            item.itemDiv.innerText = item.text ;
            item.itemDiv.addEventListener('mouseenter', this.onItemMouseEnter.bind(this)) ;
            item.topdiv.appendChild(item.itemDiv) ;

            item.subDiv = document.createElement('div') ;
            item.subDiv.className = 'xero-popup-menu-submenu' ;
            if (item.submenu) {
                item.subDiv.addEventListener('mouseenter', this.onSubmenuMouseEnter.bind(this)) ;
                item.subDiv.innerHTML = '&#x27A4;' ;
                item.subDiv.addEventListener('click', this.onSubmenuClick.bind(this, item)) ;
                item.itemDiv.addEventListener('click', this.onSubmenuClick.bind(this, item)) ;
                item.topdiv.addEventListener('click', this.onSubmenuClick.bind(this, item)) ;
            }
            else {
                item.itemDiv.addEventListener('click', this.onClick.bind(this, item)) ;
            }
            item.topdiv.appendChild(item.subDiv) ;
            this.popup_.appendChild(item.topdiv) ;
        }

        this.parent_.appendChild(this.popup_) ; 

        if (!child) {
            XeroPopupMenu.top_most_menu_ = this ;
            document.addEventListener('click', this.global_click_) ;
            document.addEventListener('keydown', this.global_key_) ;            
            document.addEventListener('mousemove', this.mouse_move_bind_) ;
        }
    }    
}