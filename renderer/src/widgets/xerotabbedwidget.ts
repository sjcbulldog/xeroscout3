import { XeroWidget } from "./xerowidget.js";

export class XeroTabbedWidget extends XeroWidget {
    private tabbar_? : HTMLDivElement ;
    private contents_: HTMLElement[] ;
    private names_ : string[] ;
    private selected_? : HTMLElement ;
    private selected_page_ : number ;
    private filler_ : HTMLElement ;

    public constructor() {
        super('div', 'xero-tabbed-widget-top') ;

        this.tabbar_ = document.createElement('div') ;
        this.tabbar_.className = 'xero-tabbed-widget-bar' ;
        this.elem.appendChild(this.tabbar_) ;

        this.contents_ = [] ;
        this.names_ = [] ;
        this.selected_page_ = -1 ;

        this.filler_ = document.createElement('div') ;
        this.filler_.className = 'xero-tabbed-widget-filler' ;
        this.tabbar_.appendChild(this.filler_) ;
    }

    public get selectedPageNumber() : number {
        return this.selected_page_ ;
    }

    public get selectedPage() : HTMLElement | undefined {
        return this.selected_ ;
    }

    public renamePage(index: number, name: string) : void { 
        if (index < 0 || index >= this.names_.length) {
            throw new Error('renamePage: invalid page index') ;
        }

        this.names_[index] = name ;
        (this.tabbar_!.children[index] as HTMLElement).innerText = name ;
    }

    public movePageLeft(index: number) : void {
        if (index < 1 || index >= this.names_.length) {
            throw new Error('movePageLeft: invalid page index') ;
        }
        let temp = this.names_[index] ;
        this.names_[index] = this.names_[index - 1] ;
        this.names_[index - 1] = temp ;

        let temp2 = this.contents_[index] ;
        this.contents_[index] = this.contents_[index - 1] ;
        this.contents_[index - 1] = temp2 ;

        this.tabbar_!.insertBefore(this.tabbar_!.children[index], this.tabbar_!.children[index - 1]) ;
    }
    
    public movePageRight(index: number) : void {
        if (index < 0 || index >= this.names_.length - 1) {
            throw new Error('movePageRight: invalid page index') ;
        }
        let temp = this.names_[index] ;
        this.names_[index] = this.names_[index + 1] ;
        this.names_[index + 1] = temp ;

        let temp2 = this.contents_[index] ;
        this.contents_[index] = this.contents_[index + 1] ;
        this.contents_[index + 1] = temp2 ;

        this.tabbar_!.insertBefore(this.tabbar_!.children[index + 1], this.tabbar_!.children[index]) ;
    }
        

    public addPage(name: string, content: HTMLElement) : void {
        this.names_.push(name) ;
        this.contents_.push(content) ;

        let tab = document.createElement('div') ;
        tab.classList.add('xero-tabbed-widget-tab') ;        
        tab.classList.add('xero-tabbed-widget-tab-unselected') ;
        tab.innerText = name ;
        
        this.tabbar_!.removeChild(this.filler_) ;
        this.tabbar_!.appendChild(tab) ;
        this.tabbar_!.appendChild(this.filler_) ;

        tab.addEventListener('click', this.tabButtonClicked.bind(this, this.names_.length - 1)) ;   
    }

    public removePage(which: number) : void {
        if (which < 0 || which >= this.contents_.length) {
            throw new Error('removePage: invalid page index') ;
        }

        let changed = false ;
        if (which === this.selected_page_) {
            changed = true ;
        }

        this.names_.splice(which, 1) ;
        this.contents_.splice(which, 1) ;
        this.tabbar_!.removeChild(this.tabbar_!.children[which]) ;
    }

    public selectPage(index: number) : void {
        if (index < 0 || index >= this.contents_.length) {
            throw new Error('selectPage: invalid page index') ;
        }

        if (this.selected_ !== undefined) {
            this.tabbar_!.children[this.selected_page_].classList.remove('xero-tabbed-widget-tab-selected') ;
            this.tabbar_!.children[this.selected_page_].classList.add('xero-tabbed-widget-tab-unselected') ;
            this.elem.removeChild(this.selected_) ;
            this.selected_ = undefined ;
            this.selected_page_ = -1 ;

        }

        this.elem.appendChild(this.contents_[index]) ;
        this.selected_ = this.contents_[index] ;
        this.selected_page_ = index ;
        this.tabbar_!.children[this.selected_page_].classList.add('xero-tabbed-widget-tab-selected') ;
        this.tabbar_!.children[this.selected_page_].classList.remove('xero-tabbed-widget-tab-unselected') ;
    }

    private tabButtonClicked(index: number) : void {
        this.selectPage(index) ;
    }
}