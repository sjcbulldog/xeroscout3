import { XeroDialog } from "../../../widgets/xerodialog.js";

export class RobotPhotoCaptureDialog extends XeroDialog {
    private static readonly previewWidth_ = 640 ;
    private static readonly previewHeight_ = 480 ;

    private video_? : HTMLVideoElement ;
    private preview_? : HTMLImageElement ;
    private status_? : HTMLDivElement ;
    private capture_button_? : HTMLButtonElement ;
    private use_button_? : HTMLButtonElement ;
    private stream_? : MediaStream ;
    private captured_blob_? : Blob ;
    private preview_data_url_? : string ;

    constructor() {
        super('Take a Robot Photo') ;
        this.disableEnterKeyProcessing() ;
    }

    public get capturedBlob() : Blob | undefined {
        return this.captured_blob_ ;
    }

    protected populateDialog(div: HTMLDivElement): void {
        div.style.display = 'flex' ;
        div.style.flexDirection = 'column' ;
        div.style.gap = '12px' ;
        div.style.minWidth = '700px' ;

        const frame = document.createElement('div') ;
        frame.style.position = 'relative' ;
        frame.style.width = `${RobotPhotoCaptureDialog.previewWidth_}px` ;
        frame.style.height = `${RobotPhotoCaptureDialog.previewHeight_}px` ;
        frame.style.borderRadius = '12px' ;
        frame.style.overflow = 'hidden' ;
        frame.style.background = '#0f172a' ;
        frame.style.display = 'flex' ;
        frame.style.alignItems = 'center' ;
        frame.style.justifyContent = 'center' ;

        this.video_ = document.createElement('video') ;
        this.video_.autoplay = true ;
        this.video_.playsInline = true ;
        this.video_.muted = true ;
        this.video_.style.width = '100%' ;
        this.video_.style.height = '100%' ;
        this.video_.style.objectFit = 'cover' ;
        frame.appendChild(this.video_) ;

        this.preview_ = document.createElement('img') ;
        this.preview_.style.display = 'none' ;
        this.preview_.style.width = '100%' ;
        this.preview_.style.height = '100%' ;
        this.preview_.style.objectFit = 'contain' ;
        this.preview_.style.background = '#0f172a' ;
        frame.appendChild(this.preview_) ;

        div.appendChild(frame) ;

        this.status_ = document.createElement('div') ;
        this.status_.style.fontSize = '14px' ;
        this.status_.style.color = '#334155' ;
        this.status_.innerText = 'Align the robot in frame, then capture the photo.' ;
        div.appendChild(this.status_) ;
    }

    public override populateButtons(div: HTMLDivElement): void {
        this.capture_button_ = document.createElement('button') ;
        this.capture_button_.innerText = 'Capture' ;
        this.capture_button_.className = 'xero-popup-form-edit-dialog-button' ;
        this.capture_button_.addEventListener('click', this.captureOrRetake.bind(this)) ;
        div.appendChild(this.capture_button_) ;

        this.use_button_ = document.createElement('button') ;
        this.use_button_.innerText = 'Use Photo' ;
        this.use_button_.className = 'xero-popup-form-edit-dialog-button' ;
        this.use_button_.disabled = true ;
        this.use_button_.addEventListener('click', this.okButton.bind(this)) ;
        div.appendChild(this.use_button_) ;

        const cancel_button = document.createElement('button') ;
        cancel_button.innerText = 'Cancel' ;
        cancel_button.className = 'xero-popup-form-edit-dialog-button' ;
        cancel_button.addEventListener('click', this.cancelButton.bind(this)) ;
        div.appendChild(cancel_button) ;
    }

    protected override onInit(): void {
        setTimeout(() => {
            void this.startCamera() ;
        }, 0) ;
    }

    protected override isOKToClose(ok: boolean): boolean {
        if (!ok) {
            this.captured_blob_ = undefined ;
            return true ;
        }

        if (!this.captured_blob_) {
            this.showAlert('Capture a photo before continuing.', 'Robot Photo') ;
            return false ;
        }

        return true ;
    }

    public override close(changed: boolean): void {
        this.stopCamera() ;
        this.preview_data_url_ = undefined ;
        super.close(changed) ;
    }

    private async startCamera() : Promise<void> {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (this.status_) {
                this.status_.innerText = 'This device does not expose camera access to the app.' ;
            }
            return ;
        }

        try {
            this.stream_ = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            }) ;

            if (this.video_) {
                this.video_.srcObject = this.stream_ ;
                await this.video_.play() ;
            }

            if (this.status_) {
                this.status_.innerText = 'Camera ready. Capture the photo when the robot is centered.' ;
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to open the camera.' ;
            if (this.status_) {
                this.status_.innerText = message ;
            }
        }
    }

    private stopCamera() {
        if (this.video_) {
            this.video_.pause() ;
            this.video_.srcObject = null ;
        }

        if (this.stream_) {
            for (const track of this.stream_.getTracks()) {
                track.stop() ;
            }
            this.stream_ = undefined ;
        }
    }

    private captureOrRetake() {
        if (this.captured_blob_) {
            this.resetCapture() ;
            return ;
        }

        void this.captureFrame() ;
    }

    private resetCapture() {
        this.captured_blob_ = undefined ;
        this.preview_data_url_ = undefined ;

        if (this.preview_) {
            this.preview_.removeAttribute('src') ;
            this.preview_.style.display = 'none' ;
        }

        if (this.video_) {
            this.video_.style.display = 'block' ;
        }

        if (this.capture_button_) {
            this.capture_button_.innerText = 'Capture' ;
        }

        if (this.use_button_) {
            this.use_button_.disabled = true ;
        }

        if (this.status_) {
            this.status_.innerText = 'Camera ready. Capture the photo when the robot is centered.' ;
        }
    }

    private async captureFrame() : Promise<void> {
        if (!this.video_ || this.video_.videoWidth <= 0 || this.video_.videoHeight <= 0) {
            if (this.status_) {
                this.status_.innerText = 'The camera is not ready yet.' ;
            }
            return ;
        }

        const canvas = document.createElement('canvas') ;
        canvas.width = this.video_.videoWidth ;
        canvas.height = this.video_.videoHeight ;

        const ctx = canvas.getContext('2d') ;
        if (!ctx) {
            if (this.status_) {
                this.status_.innerText = 'Unable to capture the photo.' ;
            }
            return ;
        }

        ctx.drawImage(this.video_, 0, 0, canvas.width, canvas.height) ;
        const blob = await new Promise<Blob | undefined>((resolve) => {
            canvas.toBlob((created) => {
                resolve(created ?? undefined) ;
            }, 'image/png') ;
        }) ;

        if (!blob) {
            if (this.status_) {
                this.status_.innerText = 'Unable to capture the photo.' ;
            }
            return ;
        }

        this.captured_blob_ = blob ;
        this.preview_data_url_ = canvas.toDataURL('image/png') ;

        if (this.preview_) {
            this.preview_.src = this.preview_data_url_ ;
            this.preview_.style.display = 'block' ;
        }

        if (this.video_) {
            this.video_.style.display = 'none' ;
        }

        if (this.capture_button_) {
            this.capture_button_.innerText = 'Retake' ;
        }

        if (this.use_button_) {
            this.use_button_.disabled = false ;
        }

        if (this.status_) {
            this.status_.innerText = 'Photo captured. Use it or retake it.' ;
        }
    }
}
