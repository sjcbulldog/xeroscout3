import { XeroWidget } from "../widgets/xerowidget.js";

export class ResizeBar extends XeroWidget {
    private text_ : boolean ;
    private divs_ : HTMLDivElement[] = [];

    constructor(count: number, text: boolean = false) {
        super('div', 'resize-bar');

        this.text_ = text;
        for(let i = 0 ; i < count ; i++) {
            const div = document.createElement('div');
            div.className = 'resize-bar-div';
            this.divs_.push(div);
            this.elem.appendChild(div);

            if (this.text_) {
                let pcnt = (i + 1) / count * 100.0 ;
                div.innerText = pcnt.toFixed(0) ;
            }

            div.addEventListener('click', this.divSelected.bind(this, i));
        }
    }
    
    private divSelected(which: number) {
        this.emit('resized', which / this.divs_.length * 100) ;
    }
}