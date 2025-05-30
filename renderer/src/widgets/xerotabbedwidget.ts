import { XeroWidget } from "./xerowidget.js";

export interface XeroTabbedWidgetOptions {
    fontSize?: string | number ;
    fontFamily?: string ;
    fontWeight?: string ;
    fontColor?: string ;
}

export class XeroTabbedWidget extends XeroWidget {
    private tabbar_? : HTMLDivElement ;
    private pages_: HTMLElement[] ;
    private names_ : string[] ;
    private selected_? : HTMLElement ;
    private selected_page_ : number ;
    private filler_ : HTMLElement ;
    private options_ : XeroTabbedWidgetOptions ;

    public constructor(options: XeroTabbedWidgetOptions = {}) {
        super('div', 'xero-tabbed-widget-top') ;

        this.options_ = options ;

        this.tabbar_ = document.createElement('div') ;
        this.tabbar_.className = 'xero-tabbed-widget-bar' ;
        this.elem.appendChild(this.tabbar_) ;

        this.pages_ = [] ;
        this.names_ = [] ;
        this.selected_page_ = -1 ;

        this.filler_ = document.createElement('div') ;
        this.filler_.className = 'xero-tabbed-widget-filler' ;
        this.tabbar_.appendChild(this.filler_) ;
    }

    public get selectedPageNumber() : number {
        return this.selected_page_ ;
    }

    // public get selectedPage() : HTMLElement | undefined {
    //     return this.selected_ ;
    // }

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

        let temp2 = this.pages_[index] ;
        this.pages_[index] = this.pages_[index - 1] ;
        this.pages_[index - 1] = temp2 ;

        this.tabbar_!.insertBefore(this.tabbar_!.children[index], this.tabbar_!.children[index - 1]) ;
    }
    
    public movePageRight(index: number) : void {
        if (index < 0 || index >= this.names_.length - 1) {
            throw new Error('movePageRight: invalid page index') ;
        }
        let temp = this.names_[index] ;
        this.names_[index] = this.names_[index + 1] ;
        this.names_[index + 1] = temp ;

        let temp2 = this.pages_[index] ;
        this.pages_[index] = this.pages_[index + 1] ;
        this.pages_[index + 1] = temp2 ;

        this.tabbar_!.insertBefore(this.tabbar_!.children[index + 1], this.tabbar_!.children[index]) ;
    }

    private createPageTab(name: string) : HTMLDivElement {
        let tab = document.createElement('div') ;
        tab.classList.add('xero-tabbed-widget-tab') ;        
        tab.classList.add('xero-tabbed-widget-tab-unselected') ;
        tab.innerText = name ;

        if (this.options_.fontSize) {
            if (typeof this.options_.fontSize === 'number') {
                tab.style.fontSize = this.options_.fontSize + 'px' ;
            }
            else {
                tab.style.fontSize = this.options_.fontSize ;
            }
        }

        if (this.options_.fontFamily) {
            tab.style.fontFamily = this.options_.fontFamily ;
        }

        if (this.options_.fontWeight) {
            tab.style.fontWeight = this.options_.fontWeight ;
        }

        if (this.options_.fontColor) {
            tab.style.color = this.options_.fontColor ;
        }
        
        tab.addEventListener('click', this.tabButtonClicked.bind(this, tab)) ;  
        tab.addEventListener('dblclick', this.tabButtonDoubleClicked.bind(this, tab)) ;         
        
        return tab ;
    }

    public insertPage(index: number, name: string, page: HTMLElement) : void {
        if (index < 0 || index > this.names_.length) {
            throw new Error('insertPage: invalid page index') ;
        }

        if (index === this.names_.length) {
            this.addPage(name, page) ;
            return ;
        }

        if (index === this.selected_page_) {
            this.selected_page_++ ;
        }

        page.classList.add('xero-tabbed-widget-page') ;
        this.names_.splice(index, 0, name) ;
        this.pages_.splice(index, 0, page) ;

        let tab = this.createPageTab(name) ;
        this.tabbar_!.removeChild(this.filler_) ;
        this.tabbar_!.insertBefore(tab, this.tabbar_!.children[index]) ;
        this.tabbar_!.appendChild(this.filler_) ;
    }

    public addPage(name: string, page: HTMLElement) : void {
        page.classList.add('xero-tabbed-widget-page') ;

        this.names_.push(name) ;
        this.pages_.push(page) ;

        let tab = this.createPageTab(name) ;
        
        this.tabbar_!.removeChild(this.filler_) ;
        this.tabbar_!.appendChild(tab) ;
        this.tabbar_!.appendChild(this.filler_) ;
    }

    public removePage(which: number) : void {
        if (which < 0 || which >= this.pages_.length) {
            throw new Error('removePage: invalid page index') ;
        }

        // Update the selected page if necessary
        if (which === this.selected_page_) {
            this.selected_page_ = -1 ;
            this.selected_ = undefined ;
        }        
        else if (which < this.selected_page_) {
            this.selected_page_-- ;
        }

        this.elem.removeChild(this.pages_[which]) ;
        this.pages_[which].classList.remove('xero-tabbed-widget-page') ;

        // Remove the page and tab
        this.names_.splice(which, 1) ;
        this.pages_.splice(which, 1) ;


        this.tabbar_!.removeChild(this.tabbar_!.children[which]) ;
    }

    public selectPage(index: number) : void {
        if (index < 0 || index >= this.pages_.length) {
            throw new Error('selectPage: invalid page index') ;
        }

        let oldno = this.selected_page_ ;

        this.emit('beforeSelectPage', oldno, index) ;

        if (this.selected_ !== undefined) {
            this.tabbar_!.children[this.selected_page_].classList.remove('xero-tabbed-widget-tab-selected') ;
            this.tabbar_!.children[this.selected_page_].classList.add('xero-tabbed-widget-tab-unselected') ;
            this.elem.removeChild(this.selected_) ;
            this.selected_ = undefined ;
            this.selected_page_ = -1 ;
        }

        this.elem.appendChild(this.pages_[index]) ;
        this.selected_ = this.pages_[index] ;
        this.selected_page_ = index ;
        this.tabbar_!.children[this.selected_page_].classList.add('xero-tabbed-widget-tab-selected') ;
        this.tabbar_!.children[this.selected_page_].classList.remove('xero-tabbed-widget-tab-unselected') ;

        this.emit('afterSelectPage', oldno, index) ;
    }

    private tabButtonClicked(tab: HTMLDivElement) : void {
        let index = Array.from(this.tabbar_!.children).indexOf(tab) ;
        this.selectPage(index) ;
    }

    private tabButtonDoubleClicked(tab: HTMLDivElement) : void {
        let index = Array.from(this.tabbar_!.children).indexOf(tab) ;
        this.emit('tabButtonDoubleClicked', index) ;
    }
}