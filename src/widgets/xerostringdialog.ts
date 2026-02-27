import { XeroDialog } from "./xerodialog.js";

export class XeroStringDialog extends XeroDialog {
    private message_: string;
    private defaultValue_?: string;
    private placeholder_?: string;
    private inputElement_?: HTMLInputElement;
    private resultValue_?: string;

    constructor(title: string, message: string, defaultValue?: string, placeholder?: string) {
        super(title, false); // false means OK/Cancel buttons, not Yes/No
        this.message_ = message;
        this.defaultValue_ = defaultValue;
        this.placeholder_ = placeholder;
    }

    protected populateDialog(div: HTMLDivElement): void {
        // Create message label
        if (this.message_) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'xero-string-dialog-message';
            messageDiv.innerHTML = this.message_;
            div.appendChild(messageDiv);
        }

        // Create input field
        this.inputElement_ = document.createElement('input');
        this.inputElement_.type = 'text';
        this.inputElement_.className = 'xero-string-dialog-input';
        
        if (this.defaultValue_) {
            this.inputElement_.value = this.defaultValue_;
        }
        
        if (this.placeholder_) {
            this.inputElement_.placeholder = this.placeholder_;
        }

        div.appendChild(this.inputElement_);
    }

    protected onInit(): void {
        // Set focus to the input field and select the text if there's a default value
        if (this.inputElement_) {
            this.inputElement_.focus();
            if (this.defaultValue_) {
                this.inputElement_.select();
            }
        }
    }

    protected isOKToClose(ok: boolean): boolean {
        if (ok && this.inputElement_) {
            // Store the result when OK is pressed
            this.resultValue_ = this.inputElement_.value;
        } else {
            // Clear result when Cancel is pressed
            this.resultValue_ = undefined;
        }
        return true;
    }

    public getResult(): string | undefined {
        return this.resultValue_;
    }

    // Expose inherited methods for use in the application
    public showCentered(win: HTMLElement): void {
        super.showCentered(win);
    }

    public showRelative(win: HTMLElement, x: number, y: number): void {
        super.showRelative(win, x, y);
    }

    // Expose EventEmitter methods
    public on(event: string, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    public once(event: string, listener: (...args: any[]) => void): this {
        return super.once(event, listener);
    }
}