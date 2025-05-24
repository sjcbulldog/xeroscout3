import {  EditFormControlDialog  } from "./editformctrldialog.js";
import {  FormControl  } from "../controls/formctrl.js";
import {  IPCImageItem, IPCLabelItem  } from "../../../ipc.js";

export class EditImageDialog extends EditFormControlDialog {
    private image_name_? : HTMLSelectElement ;
    private images_ : string[] ;

    constructor(formctrl: FormControl, images: string[]) {
        super('Edit Label', formctrl) ;
        this.images_ = images ;
    }

    protected async populateDialog(pdiv: HTMLElement) : Promise<void> {
        let item = this.formctrl_.item as IPCImageItem ;
        let option : HTMLOptionElement ;

        let label ;
        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.image_name_ = document.createElement('select') ;
        this.image_name_.className = "xero-popup-form-edit-dialog-select";

        for(let image of this.images_) {
            option = document.createElement("option");
            option.value = image;
            option.innerText = image;
            if (image === item.image) {
                option.selected = true ;
            }
            this.image_name_.appendChild(option);
        }

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Image' ;
        label.appendChild(this.image_name_) ;
        div.appendChild(label) ;

        this.populateColors(div) ;
        await this.populateFontSelector(div) ;
        pdiv.appendChild(div) ;
    }

    protected extractData() : void {
        let item = this.formctrl_.item as IPCImageItem ;
        item.image = this.image_name_!.value ;
        item.fontFamily = this.font_name_!.value ;
        item.fontSize = parseInt(this.font_size_!.value) ;
        item.fontStyle = this.font_style_!.value ;
        item.fontWeight = this.font_weight_!.value ;
        item.color = this.text_color_!.value ;
        item.background = this.background_color_!.value ;
        item.transparent = this.transparent_!.checked ;
    }

    setFocus() {
        if (this.image_name_) {
            this.image_name_.focus() ;
        }
    }

    onInit() {
        setTimeout(this.setFocus.bind(this), 100) ;
    }    
}