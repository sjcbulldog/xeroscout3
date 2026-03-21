import { XeroDialog } from "../../widgets/xerodialog.js";

export class ImagePreviewDialog extends XeroDialog {
    private title_text_: string ;
    private image_data_url_: string ;

    constructor(title: string, imageDataUrl: string) {
        super(title) ;
        this.title_text_ = title ;
        this.image_data_url_ = imageDataUrl ;
        this.disableEnterKeyProcessing() ;
    }

    protected populateDialog(div: HTMLDivElement): void {
        const wrapper = document.createElement('div') ;
        wrapper.style.width = 'min(80vw, 960px)' ;
        wrapper.style.maxHeight = '70vh' ;
        wrapper.style.display = 'flex' ;
        wrapper.style.flexDirection = 'column' ;
        wrapper.style.gap = '10px' ;

        const title = document.createElement('div') ;
        title.innerText = this.title_text_ ;
        title.style.fontWeight = 'bold' ;
        wrapper.appendChild(title) ;

        const scroller = document.createElement('div') ;
        scroller.style.overflow = 'auto' ;
        scroller.style.maxHeight = 'calc(70vh - 32px)' ;
        scroller.style.padding = '8px' ;
        scroller.style.background = '#0f172a' ;
        scroller.style.borderRadius = '8px' ;

        const image = document.createElement('img') ;
        image.src = this.image_data_url_ ;
        image.alt = this.title_text_ ;
        image.style.display = 'block' ;
        image.style.maxWidth = '100%' ;
        image.style.maxHeight = 'calc(70vh - 48px)' ;
        image.style.margin = '0 auto' ;
        image.style.objectFit = 'contain' ;
        scroller.appendChild(image) ;

        wrapper.appendChild(scroller) ;
        div.appendChild(wrapper) ;
    }

    public populateButtons(div: HTMLDivElement): void {
        const close = document.createElement('button') ;
        close.innerText = 'Close' ;
        close.className = 'xero-popup-form-edit-dialog-button' ;
        close.addEventListener('click', () => this.close(false)) ;
        div.appendChild(close) ;
    }
}
