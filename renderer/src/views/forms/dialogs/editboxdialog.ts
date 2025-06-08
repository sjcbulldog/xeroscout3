import {  EditFormControlDialog  } from "./editformctrldialog.js";
import {  FormControl  } from "../controls/formctrl.js";
import { IPCBoxItem } from "../../../shared/ipc.js";

export class EditBoxDialog extends EditFormControlDialog {
    private border_style_? : HTMLSelectElement ;
    private border_width_? : HTMLInputElement ;
    private border_radius_? : HTMLInputElement ;
    private shadow_? : HTMLInputElement ;

    constructor(formctrl: FormControl) {
        super('Edit Box', formctrl) ;
    }

    protected async populateDialog(pdiv: HTMLElement) : Promise<void> {
        let option: HTMLOptionElement ;
        let item = this.formctrl_.item as IPCBoxItem ;

        let label ;
        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.border_width_ = document.createElement('input') ;
        this.border_width_.type = 'number' ;
        this.border_width_.className = 'xero-popup-form-edit-dialog-input' ;
        this.border_width_.value = `${item.borderWidth}`;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Border Width' ;
        label.appendChild(this.border_width_) ;
        div.appendChild(label) ;

        this.border_style_ = document.createElement('select') ;
        this.border_style_.className = 'xero-popup-form-edit-dialog-select' ;
        this.addOption(this.border_style_, 'Solid', 'solid') ;
        this.addOption(this.border_style_, 'Dashed', 'dashed') ;
        this.addOption(this.border_style_, 'Dotted', 'dotted') ;
        this.addOption(this.border_style_, 'Double', 'double') ;
        this.addOption(this.border_style_, 'Groove', 'groove') ;
        this.addOption(this.border_style_, 'Ridge', 'ridge') ;
        this.addOption(this.border_style_, 'Inset', 'inset') ;
        this.addOption(this.border_style_, 'Outset', 'outset') ;
        this.border_style_.value = item.borderStyle ;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Border Style' ;
        label.appendChild(this.border_style_) ;
        div.appendChild(label) ;

        this.border_radius_ = document.createElement('input') ;
        this.border_radius_.type = 'number' ;
        this.border_radius_.className = 'xero-popup-form-edit-dialog-input' ;
        this.border_radius_.value = `${item.borderRadius}`;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Border Radius' ;
        label.appendChild(this.border_radius_) ;
        div.appendChild(label) ;
        
        this.shadow_ = document.createElement("input");
        this.shadow_.type = "checkbox";
        this.shadow_.checked = item.borderShadow;
        this.shadow_.className = "xero-popup-form-edit-dialog-checkbox";

        label = document.createElement("label");
        label.className = "xero-popup-form-edit-dialog-label";
        label.innerText = "Shadow";
        label.appendChild(this.shadow_);
        div.appendChild(label);

        div.appendChild(label) ;

        this.populateForegroundColor(div) ;
        pdiv.appendChild(div) ;
    }

    private addOption(select: HTMLSelectElement, text: string, value: string) : void {
        let option = document.createElement('option') ;
        option.value = value ;
        option.innerText = text ;
        select.appendChild(option) ;
    }

    protected extractData() : void {
        let item = this.formctrl_.item as IPCBoxItem ;
        item.color = this.text_color_!.value ;
        item.borderRadius = parseInt(this.border_radius_!.value) ;
        item.borderWidth = parseInt(this.border_width_!.value) ;
        item.borderStyle = this.border_style_!.value ;
        item.borderShadow = this.shadow_!.checked ;
    }
}