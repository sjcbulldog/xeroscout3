import { EditFormControlDialog } from "./editformctrldialog.js";
import { FormControl } from "../controls/formctrl.js";
import { IPCAutoSelectorItem } from "../../../shared/ipc.js";

export class EditAutoSelectorDialog extends EditFormControlDialog {
    private image_name_?: HTMLSelectElement;
    private show_source_tag_?: HTMLInputElement;
    private images_: string[];

    constructor(formctrl: FormControl, images: string[]) {
        super('Edit Auto Selector', formctrl);
        this.images_ = images;
    }

    protected async populateDialog(pdiv: HTMLElement): Promise<void> {
        const item = this.formctrl_.item as IPCAutoSelectorItem;
        let label;

        const div = document.createElement('div');
        div.className = 'xero-popup-form-edit-dialog-rowdiv';

        this.populateTag(div);
        this.populateColors(div);

        this.image_name_ = document.createElement('select');
        this.image_name_.className = 'xero-popup-form-edit-dialog-select';
        for (const image of this.images_) {
            const option = document.createElement('option');
            option.value = image;
            option.innerText = image;
            if (image === item.fieldImage || image === item.fieldImage + '.png') {
                option.selected = true;
            }
            this.image_name_.appendChild(option);
        }

        label = document.createElement('label');
        label.className = 'xero-popup-form-edit-dialog-label';
        label.innerText = 'Field Image';
        label.appendChild(this.image_name_);
        div.appendChild(label);

        this.show_source_tag_ = document.createElement('input');
        this.show_source_tag_.type = 'checkbox';
        this.show_source_tag_.className = 'xero-popup-form-edit-dialog-checkbox';
        this.show_source_tag_.checked = item.showSourceTagInTab !== false;

        label = document.createElement('label');
        label.className = 'xero-popup-form-edit-dialog-label';
        label.innerText = 'Show Source Tag In Tabs';
        label.appendChild(this.show_source_tag_);
        div.appendChild(label);

        pdiv.appendChild(div);
    }

    protected extractData(): void {
        const item = this.formctrl_.item as IPCAutoSelectorItem;

        this.formctrl_.item.tag = this.tag_?.value || '';
        this.formctrl_.item.color = this.text_color_?.value || 'black';
        this.formctrl_.item.background = this.background_color_?.value || 'white';
        this.formctrl_.item.transparent = this.transparent_?.checked || false;

        if (this.image_name_) {
            item.fieldImage = this.image_name_.value.replace(/\.png$/i, '');
        }
        item.showSourceTagInTab = this.show_source_tag_?.checked !== false;
    }

    setFocus(): void {
        if (this.tag_) {
            this.tag_.focus();
            this.tag_.select();
        }
    }

    onInit(): void {
        setTimeout(this.setFocus.bind(this), 100);
    }
}
