import { XeroDialog } from "./xerodialog.js";

export class XeroTextDialog extends XeroDialog {
    private message_: string;
    private text_: string;
    private textarea_?: HTMLTextAreaElement;

    constructor(title: string, message: string, text: string) {
        super(title, false);
        this.message_ = message;
        this.text_ = text;
    }

    protected populateDialog(div: HTMLDivElement): void {
        if (this.message_) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'xero-string-dialog-message';
            messageDiv.innerHTML = this.message_;
            div.appendChild(messageDiv);
        }

        this.textarea_ = document.createElement('textarea');
        this.textarea_.className = 'xero-popup-form-edit-dialog-textarea';
        this.textarea_.rows = 16;
        this.textarea_.value = this.text_;
        this.textarea_.readOnly = true;
        div.appendChild(this.textarea_);
    }

    protected onInit(): void {
        this.disableEnterKeyProcessing();
        if (this.textarea_) {
            this.textarea_.focus();
            this.textarea_.select();
        }
    }
}
