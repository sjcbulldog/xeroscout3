import { EditFormControlDialog } from "./editformctrldialog.js";
import { FormControl } from "../controls/formctrl.js";
import { IPCAutoPlanItem } from "../../../shared/ipc.js";

export class EditAutoPlanDialog extends EditFormControlDialog {
    private image_name_?: HTMLSelectElement;
    private actions_?: HTMLTextAreaElement;
    private allow_multi_?: HTMLInputElement;
    private images_: string[];

    constructor(formctrl: FormControl, images: string[]) {
        super('Edit Auto Planner', formctrl);
        this.images_ = images;
    }

    protected async populateDialog(pdiv: HTMLElement): Promise<void> {
        const item = this.formctrl_.item as IPCAutoPlanItem;
        let label;
        const div = document.createElement('div');
        div.className = 'xero-popup-form-edit-dialog-rowdiv';

        this.image_name_ = document.createElement('select');
        this.image_name_.className = 'xero-popup-form-edit-dialog-select';
        for (const image of this.images_) {
            const option = document.createElement('option');
            option.value = image;
            option.innerText = image;
            if (image === item.fieldImage) {
                option.selected = true;
            }
            this.image_name_.appendChild(option);
        }
        label = document.createElement('label');
        label.className = 'xero-popup-form-edit-dialog-label';
        label.innerText = 'Field Image';
        label.appendChild(this.image_name_);
        div.appendChild(label);

        this.actions_ = document.createElement('textarea');
        this.actions_.className = 'xero-popup-form-edit-dialog-textarea';
        this.actions_.rows = 6;
        this.actions_.value = (item.approvedActions || []).join('\n');
        label = document.createElement('label');
        label.className = 'xero-popup-form-edit-dialog-label';
        label.innerText = 'Approved Actions (one per line)';
        label.appendChild(this.actions_);
        div.appendChild(label);

        this.allow_multi_ = document.createElement('input');
        this.allow_multi_.type = 'checkbox';
        this.allow_multi_.className = 'xero-popup-form-edit-dialog-checkbox';
        this.allow_multi_.checked = item.allowMultipleAutos;
        label = document.createElement('label');
        label.className = 'xero-popup-form-edit-dialog-label';
        label.innerText = 'Allow Multiple Autos';
        label.appendChild(this.allow_multi_);
        div.appendChild(label);

        pdiv.appendChild(div);
    }

    protected extractData(): void {
        const item = this.formctrl_.item as IPCAutoPlanItem;
        item.fieldImage = this.image_name_!.value.replace(/\.png$/i, '');
        const raw = this.actions_!.value.split(/\r?\n|,/);
        const actions = raw.map(v => v.trim()).filter(v => v.length > 0);
        const normalized: string[] = [];
        for (const action of actions) {
            if (!normalized.includes(action)) {
                normalized.push(action);
            }
        }
        for (const required of ['Start', 'End']) {
            if (!normalized.includes(required)) {
                normalized.unshift(required);
            }
        }
        item.approvedActions = normalized;
        item.allowMultipleAutos = this.allow_multi_!.checked;
    }

    setFocus(): void {
        if (this.image_name_) {
            this.image_name_.focus();
        }
    }

    onInit(): void {
        setTimeout(this.setFocus.bind(this), 100);
    }
}
