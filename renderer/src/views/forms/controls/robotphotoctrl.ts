import { IPCRobotPhotoItem, IPCScoutResult, IPCTypedDataValue } from "../../../shared/ipc.js";
import { XeroRect } from "../../../shared/xerogeom.js";
import { XeroView } from "../../xeroview.js";
import { ImageDataSource } from "../../../apps/imagesrc.js";
import { EditFormControlDialog } from "../dialogs/editformctrldialog.js";
import { EditRobotPhotoDialog } from "../dialogs/editrobotphotodialog.js";
import { RobotPhotoCaptureDialog } from "../dialogs/robotphotocapturedialog.js";
import { FormControl } from "./formctrl.js";

export class RobotPhotoControl extends FormControl {
    private static readonly acceptedImageTypes_ = [
        '.jpg',
        '.jpeg',
        '.png',
        '.webp',
        '.gif',
        '.bmp',
        '.tif',
        '.tiff',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/bmp',
        'image/tiff',
    ].join(',') ;
    private static readonly maxLongEdge_ = 960 ;
    private static readonly webpQuality_ = 0.85 ;

    private static readonly item_desc_ : IPCRobotPhotoItem = {
        type: 'robotphoto',
        tag: '',
        x: 0,
        y: 0,
        width: 280,
        height: 220,
        color: 'black',
        background: '#f3f4f6',
        fontFamily: 'Arial',
        fontSize: 20,
        fontWeight: 'normal',
        fontStyle: 'normal',
        datatype: 'string',
        transparent: false,
        mode: 'capture',
    } ;

    private image_src_ : ImageDataSource ;
    private image_? : HTMLImageElement ;
    private status_? : HTMLDivElement ;
    private camera_button_? : HTMLButtonElement ;
    private pick_button_? : HTMLButtonElement ;
    private input_? : HTMLInputElement ;
    private current_value_? : string ;
    private capture_dialog_? : RobotPhotoCaptureDialog ;

    constructor(imsrc: ImageDataSource, view: XeroView, tag: string, bounds: XeroRect) {
        super(view, RobotPhotoControl.item_desc_) ;
        this.image_src_ = imsrc ;
        this.setTag(tag) ;
        this.setBounds(bounds) ;
    }

    protected copyObject() : FormControl {
        return new RobotPhotoControl(this.image_src_, this.view, this.item.tag, this.bounds) ;
    }

    public createEditDialog(): EditFormControlDialog {
        return new EditRobotPhotoDialog(this) ;
    }

    public getData() : IPCTypedDataValue | undefined {
        if (this.robotItem.mode === 'display') {
            return undefined ;
        }

        if (this.current_value_ && this.current_value_.length > 0) {
            return {
                type: 'string',
                value: this.current_value_,
            } ;
        }

        return {
            type: 'null',
            value: null,
        } ;
    }

    public setData(data: IPCTypedDataValue) : void {
        if (this.robotItem.mode !== 'capture') {
            return ;
        }

        if (data.type === 'string' && typeof data.value === 'string' && data.value.length > 0) {
            this.current_value_ = data.value ;
        }
        else {
            this.current_value_ = undefined ;
        }

        this.renderState() ;
    }

    public updateFromItem(editing: boolean, scale: number, xoff: number, yoff: number) : void {
        if (!this.ctrl) {
            return ;
        }

        this.setPosition(scale, xoff, yoff, 900) ;
        if (editing) {
            if (this.status_) {
                this.status_.innerText = this.robotItem.mode === 'capture' ? 'Robot Photo Capture' : 'Robot Photo Display' ;
            }
            return ;
        }

        if (this.robotItem.mode === 'display') {
            this.refreshFromActiveTeamResult() ;
        }
        else {
            this.renderState() ;
        }
    }

    public createForEdit(parent: HTMLElement, xoff: number, yoff:number) : void  {
        super.createForEdit(parent, xoff, yoff) ;
        this.ctrl = document.createElement('div') ;
        this.ctrl.style.border = '2px dashed #94a3b8' ;
        this.ctrl.style.borderRadius = '12px' ;
        this.ctrl.style.background = '#f8fafc' ;
        this.ctrl.style.display = 'flex' ;
        this.ctrl.style.alignItems = 'center' ;
        this.ctrl.style.justifyContent = 'center' ;

        this.status_ = document.createElement('div') ;
        this.status_.style.padding = '12px' ;
        this.status_.style.textAlign = 'center' ;
        this.status_.style.fontSize = '18px' ;
        this.ctrl.appendChild(this.status_) ;
        this.updateFromItem(true, 1.0, xoff, yoff) ;
        parent.appendChild(this.ctrl) ;
    }

    public createForScouting(parent: HTMLElement, scale: number, xoff: number, yoff:number) : void  {
        super.createForScouting(parent, scale, xoff, yoff) ;

        this.ctrl = document.createElement('div') ;
        this.ctrl.style.display = 'flex' ;
        this.ctrl.style.flexDirection = 'column' ;
        this.ctrl.style.alignItems = 'stretch' ;
        this.ctrl.style.borderRadius = '12px' ;
        this.ctrl.style.overflow = 'hidden' ;
        this.ctrl.style.border = '1px solid #cbd5e1' ;
        this.ctrl.style.background = '#f8fafc' ;

        const image_frame = document.createElement('div') ;
        image_frame.style.flex = '1 1 auto' ;
        image_frame.style.minHeight = '0' ;
        image_frame.style.background = '#e2e8f0' ;

        this.image_ = document.createElement('img') ;
        this.image_.style.width = '100%' ;
        this.image_.style.height = '100%' ;
        this.image_.style.objectFit = 'contain' ;
        image_frame.appendChild(this.image_) ;
        this.ctrl.appendChild(image_frame) ;

        this.status_ = document.createElement('div') ;
        this.status_.style.fontSize = '14px' ;
        this.status_.style.padding = '8px 10px' ;
        this.status_.style.color = '#334155' ;
        this.ctrl.appendChild(this.status_) ;

        if (this.robotItem.mode === 'capture') {
            const button_row = document.createElement('div') ;
            button_row.style.display = 'flex' ;
            button_row.style.gap = '8px' ;
            button_row.style.padding = '0 10px 10px 10px' ;

            this.camera_button_ = document.createElement('button') ;
            this.camera_button_.type = 'button' ;
            this.camera_button_.innerText = 'Take a Photo' ;
            this.camera_button_.addEventListener('click', this.openCamera.bind(this)) ;
            this.camera_button_.style.flex = '7 1 0%' ;
            this.stylePrimaryButton(this.camera_button_) ;
            button_row.appendChild(this.camera_button_) ;

            this.pick_button_ = document.createElement('button') ;
            this.pick_button_.type = 'button' ;
            this.pick_button_.innerText = 'Pick' ;
            this.pick_button_.addEventListener('click', this.pickPhoto.bind(this)) ;
            this.pick_button_.style.flex = '3 1 0%' ;
            this.styleSecondaryButton(this.pick_button_) ;
            button_row.appendChild(this.pick_button_) ;

            this.ctrl.appendChild(button_row) ;

            this.input_ = document.createElement('input') ;
            this.input_.type = 'file' ;
            this.input_.accept = RobotPhotoControl.acceptedImageTypes_ ;
            this.input_.style.display = 'none' ;
            this.input_.addEventListener('change', this.photoSelected.bind(this)) ;
            this.ctrl.appendChild(this.input_) ;
        }

        parent.appendChild(this.ctrl) ;
        this.updateFromItem(false, scale, xoff, yoff) ;
    }

    private get robotItem() : IPCRobotPhotoItem {
        return this.item as IPCRobotPhotoItem ;
    }

    private stylePrimaryButton(button: HTMLButtonElement) {
        button.style.padding = '8px 10px' ;
        button.style.borderRadius = '8px' ;
        button.style.border = '1px solid #2563eb' ;
        button.style.background = '#2563eb' ;
        button.style.color = 'white' ;
        button.style.cursor = 'pointer' ;
        button.style.fontWeight = '600' ;
    }

    private styleSecondaryButton(button: HTMLButtonElement) {
        button.style.padding = '8px 10px' ;
        button.style.borderRadius = '8px' ;
        button.style.border = '1px solid #94a3b8' ;
        button.style.background = 'white' ;
        button.style.color = '#0f172a' ;
        button.style.cursor = 'pointer' ;
        button.style.fontWeight = '600' ;
    }

    private pickPhoto() : void {
        this.input_?.click() ;
    }

    private openCamera() : void {
        if (this.capture_dialog_) {
            return ;
        }

        this.capture_dialog_ = new RobotPhotoCaptureDialog() ;
        this.capture_dialog_.on('closed', (ok: boolean) => {
            const dialog = this.capture_dialog_ ;
            this.capture_dialog_ = undefined ;
            if (!ok || !dialog?.capturedBlob) {
                return ;
            }

            void this.applyBlob(dialog.capturedBlob) ;
        }) ;

        const parent = this.ctrl?.parentElement ?? document.body ;
        this.capture_dialog_.showCentered(parent) ;
    }

    private async photoSelected() {
        if (!this.input_ || !this.input_.files || this.input_.files.length === 0) {
            return ;
        }

        const file = this.input_.files[0] ;
        await this.applyBlob(file) ;
        this.input_.value = '' ;
    }

    private async applyBlob(blob: Blob) : Promise<void> {
        try {
            this.current_value_ = await this.convertBlobToWebP(blob) ;
            this.renderState() ;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to process the selected image.' ;
            alert(message) ;
        }
    }

    private loadBlobImage(blob: Blob) : Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const image = new Image() ;
            const object_url = URL.createObjectURL(blob) ;
            image.onload = () => {
                URL.revokeObjectURL(object_url) ;
                resolve(image) ;
            } ;
            image.onerror = () => {
                URL.revokeObjectURL(object_url) ;
                reject(new Error('The selected image format could not be opened.')) ;
            } ;
            image.src = object_url ;
        }) ;
    }

    private async convertBlobToWebP(blob: Blob) : Promise<string> {
        if (typeof createImageBitmap === 'function') {
            try {
                const bitmap = await createImageBitmap(blob) ;
                try {
                    return await this.convertDrawableToWebP(bitmap, bitmap.width, bitmap.height) ;
                }
                finally {
                    bitmap.close() ;
                }
            }
            catch {
                // Fall back to HTMLImageElement decoding below.
            }
        }

        const image = await this.loadBlobImage(blob) ;
        return this.convertDrawableToWebP(image, image.naturalWidth || image.width, image.naturalHeight || image.height) ;
    }

    private async convertDrawableToWebP(source: CanvasImageSource, width: number, height: number) : Promise<string> {
        const canvas = document.createElement('canvas') ;
        const ctx = canvas.getContext('2d') ;
        if (!ctx) {
            throw new Error('Unable to process the image.') ;
        }

        const dims = this.fitWithin(width, height, RobotPhotoControl.maxLongEdge_) ;
        canvas.width = dims.width ;
        canvas.height = dims.height ;
        ctx.drawImage(source, 0, 0, dims.width, dims.height) ;

        const blob = await new Promise<Blob | undefined>((resolve) => {
            canvas.toBlob((created) => {
                resolve(created ?? undefined) ;
            }, 'image/webp', RobotPhotoControl.webpQuality_) ;
        }) ;

        if (blob) {
            return this.readBlobAsDataUrl(blob) ;
        }

        const fallback = canvas.toDataURL('image/webp', RobotPhotoControl.webpQuality_) ;
        if (!this.isImageDataUrl(fallback)) {
            throw new Error('Unable to convert the image for storage.') ;
        }
        return fallback ;
    }

    private readBlobAsDataUrl(blob: Blob) : Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader() ;
            reader.onload = () => {
                if (typeof reader.result === 'string' && this.isImageDataUrl(reader.result)) {
                    resolve(reader.result) ;
                }
                else {
                    reject(new Error('Unable to convert the image for storage.')) ;
                }
            } ;
            reader.onerror = () => {
                reject(new Error('Unable to convert the image for storage.')) ;
            } ;
            reader.readAsDataURL(blob) ;
        }) ;
    }

    private fitWithin(width: number, height: number, maxLongEdge: number) : { width: number, height: number } {
        if (width <= 0 || height <= 0) {
            return { width: 1, height: 1 } ;
        }

        const scale = Math.min(maxLongEdge / Math.max(width, height), 1.0) ;
        return {
            width: Math.max(1, Math.round(width * scale)),
            height: Math.max(1, Math.round(height * scale)),
        } ;
    }

    private renderState() {
        if (!this.image_ || !this.status_) {
            return ;
        }

        this.image_.onerror = () => {
            this.image_?.removeAttribute('src') ;
            if (this.status_) {
                this.status_.innerText = 'Unable to display robot photo' ;
            }
        } ;

        if (this.current_value_ && this.isImageDataUrl(this.current_value_)) {
            this.image_.src = this.current_value_ ;
            this.status_.innerText = 'Robot photo ready' ;
        }
        else if (this.robotItem.mode === 'display') {
            this.image_.removeAttribute('src') ;
            this.status_.innerText = 'No robot photo available' ;
        }
        else {
            this.image_.removeAttribute('src') ;
            this.status_.innerText = 'No robot photo selected' ;
        }
    }

    private refreshFromActiveTeamResult() {
        const result = this.getActiveTeamResult() ;
        if (!result) {
            this.current_value_ = undefined ;
            this.renderState() ;
            return ;
        }

        for (const one of result.data) {
            if (one.value.type !== 'string' || typeof one.value.value !== 'string') {
                continue ;
            }

            if (this.isImageDataUrl(one.value.value)) {
                this.current_value_ = one.value.value ;
                this.renderState() ;
                return ;
            }
        }

        this.current_value_ = undefined ;
        this.renderState() ;
    }

    private isImageDataUrl(value: string) : boolean {
        return /^data:image\/[a-z0-9.+-]+;base64,/i.test(value) ;
    }

    private getActiveTeamResult() : IPCScoutResult | undefined {
        const view = this.view as any ;
        if (view && typeof view.getActiveTeamResult === 'function') {
            return view.getActiveTeamResult() ;
        }
        return undefined ;
    }
}
