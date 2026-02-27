import {  XeroWidget  } from "../widgets/xerowidget.js";

export class MessageOverlay extends XeroWidget {
    private static status_height_ = 300;

    private text_msg_: string = '';
    private title_msg_: string = '';

    private title_div_?: HTMLDivElement ;
    private title_ ?: HTMLSpanElement ;
    private close_ ?: HTMLSpanElement ;
    private text_ ?: HTMLSpanElement ;

    private parent_ : XeroWidget ;

    public constructor(parent: XeroWidget) {
        super('div', 'xero-status-overlay');

        this.parent_ = parent ;
        this.elem.style.zIndex = '2000' ;

        this.registerCallback('set-status-visible', this.setVisible.bind(this));
        this.registerCallback('set-status-text', this.setText.bind(this, false));
        this.registerCallback('set-status-html', this.setText.bind(this, true));
        this.registerCallback('set-status-title', this.setTitle.bind(this));
        this.registerCallback("set-status-close-button-visible", this.setCloseButtonVisible.bind(this));

        this.title_div_ = document.createElement('div');
        this.title_div_.classList.add('xero-status-overlay-title-div');
        this.elem.appendChild(this.title_div_);

        this.title_ = document.createElement('span');
        this.title_.classList.add('xero-status-overlay-title');
        this.title_div_!.appendChild(this.title_);

        this.close_ = document.createElement('span');
        this.close_!.classList.add('xero-status-overlay-close');
        this.close_.classList.add('xero-status-overlay-close-hidden');
        this.close_.innerHTML = '&#x1F5D9';
        this.close_.addEventListener('click', this.closeButtonClicked.bind(this));
        this.title_div_!.appendChild(this.close_);

        this.text_ = document.createElement('span');
        this.text_.classList.add('xero-status-overlay-text');
        this.elem.appendChild(this.text_);

        let body = document.body ;
        body.appendChild(this.elem) ;

        this.setVisible(false);
    }

    private closeButtonClicked() {
        this.setVisible(false);
    }

    public setText(html: boolean, args: any) {
        if (args) {
            this.text_msg_ = args as string ;
            if (html) {
                this.text_!.innerHTML = this.text_msg_;
            }
            else {
                this.text_!.innerText = this.text_msg_;
            }
        }
    }

    public setTitle(args: any) {
        if (args) {
            this.title_msg_ = args as string;
            this.title_!.innerHTML = this.title_msg_;
        }
    }

    public setVisible(args: any) {
        if (args) {
            this.elem.classList.add('xero-status-overlay-visible');
            this.elem.classList.remove('xero-status-overlay-hidden');

            let bounds = this.parent_.elem.getBoundingClientRect() ;

            this.elem.style.left = `${bounds.left}px` ;
            this.elem.style.top = `${bounds.bottom - MessageOverlay.status_height_}px`
            this.elem.style.width = `${bounds.width}px` ;
            this.elem.style.height = `${MessageOverlay.status_height_}px` ;
        }
        else {
            this.elem.classList.remove('xero-status-overlay-visible');
            this.elem.classList.add('xero-status-overlay-hidden');
        }
    }

    public setCloseButtonVisible(args: any) {
        if (args) {
            this.close_!.classList.remove('xero-status-overlay-close-hidden');
            this.close_!.classList.add('xero-status-overlay-close-visible');
        }
        else {
            this.close_!.classList.remove('xero-status-overlay-close-visible');
            this.close_!.classList.add('xero-status-overlay-close-hidden');
        }
    }
}