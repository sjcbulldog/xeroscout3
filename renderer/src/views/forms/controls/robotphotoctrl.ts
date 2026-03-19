import { IPCFormScoutData, IPCImageResponse, IPCRobotPhotoCaptureRequest, IPCRobotPhotoItem, IPCScoutResult, IPCTypedDataValue } from "../../../shared/ipc.js";
import { XeroRect } from "../../../shared/xerogeom.js";
import { XeroView } from "../../xeroview.js";
import { ImageDataSource } from "../../../apps/imagesrc.js";
import { EditFormControlDialog } from "../dialogs/editformctrldialog.js";
import { EditRobotPhotoDialog } from "../dialogs/editrobotphotodialog.js";
import { FormControl } from "./formctrl.js";

export class RobotPhotoControl extends FormControl {
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
    private button_? : HTMLButtonElement ;
    private input_? : HTMLInputElement ;
    private current_key_? : string ;
    private local_data_url_? : string ;

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

        if (this.current_key_ && this.current_key_.length > 0) {
            return {
                type: 'string',
                value: this.current_key_,
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
            this.current_key_ = data.value ;
            this.local_data_url_ = undefined ;
            this.loadImageForKey(this.current_key_) ;
        }
        else {
            this.current_key_ = undefined ;
            this.local_data_url_ = undefined ;
            this.renderState() ;
        }
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
        else if (this.current_key_ && !this.local_data_url_) {
            this.loadImageForKey(this.current_key_) ;
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
        this.ctrl.style.justifyContent = 'space-between' ;
        this.ctrl.style.borderRadius = '12px' ;
        this.ctrl.style.overflow = 'hidden' ;
        this.ctrl.style.border = '1px solid #cbd5e1' ;
        this.ctrl.style.background = '#f8fafc' ;

        this.image_ = document.createElement('img') ;
        this.image_.style.width = '100%' ;
        this.image_.style.height = 'calc(100% - 42px)' ;
        this.image_.style.objectFit = 'contain' ;
        this.image_.style.background = '#e2e8f0' ;
        this.ctrl.appendChild(this.image_) ;

        this.status_ = document.createElement('div') ;
        this.status_.style.fontSize = '14px' ;
        this.status_.style.padding = '8px 10px' ;
        this.status_.style.color = '#334155' ;
        this.ctrl.appendChild(this.status_) ;

        if (this.robotItem.mode === 'capture') {
            this.button_ = document.createElement('button') ;
            this.button_.type = 'button' ;
            this.button_.addEventListener('click', this.choosePhoto.bind(this)) ;
            this.button_.style.margin = '0 10px 10px 10px' ;
            this.button_.style.padding = '8px 10px' ;
            this.button_.style.borderRadius = '8px' ;
            this.button_.style.border = '1px solid #2563eb' ;
            this.button_.style.background = '#2563eb' ;
            this.button_.style.color = 'white' ;
            this.button_.style.cursor = 'pointer' ;
            this.ctrl.appendChild(this.button_) ;

            this.input_ = document.createElement('input') ;
            this.input_.type = 'file' ;
            this.input_.accept = 'image/*' ;
            this.input_.setAttribute('capture', 'environment') ;
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

    private choosePhoto() : void {
        this.input_?.click() ;
    }

    private async photoSelected() {
        if (!this.input_ || !this.input_.files || this.input_.files.length === 0) {
            return ;
        }

        const file = this.input_.files[0] ;
        const compressed = await this.compressImage(file) ;
        const context = this.getCaptureContext() ;
        if (!compressed || !context) {
            return ;
        }

        this.current_key_ = `robot-photo-${context.eventUuid}-${context.teamNumber}` ;
        this.local_data_url_ = compressed.dataUrl ;
        this.renderState() ;

        const payload : IPCRobotPhotoCaptureRequest = {
            item: context.item,
            key: this.current_key_,
            teamNumber: context.teamNumber,
            data: compressed.base64,
            mimeType: 'image/webp',
            extension: 'webp',
        } ;
        this.view.app.request('store-robot-photo', payload) ;
        this.input_.value = '' ;
    }

    private async compressImage(file: File) : Promise<{ dataUrl: string, base64: string } | undefined> {
        const image = await this.loadFileImage(file) ;
        const canvas = document.createElement('canvas') ;
        const ctx = canvas.getContext('2d') ;
        if (!ctx) {
            return undefined ;
        }

        const dims = this.fitWithin(image.naturalWidth || image.width, image.naturalHeight || image.height, 1280, 720) ;
        canvas.width = dims.width ;
        canvas.height = dims.height ;
        ctx.drawImage(image, 0, 0, dims.width, dims.height) ;
        const dataUrl = canvas.toDataURL('image/webp', 0.85) ;
        const comma = dataUrl.indexOf(',') ;
        if (comma === -1) {
            return undefined ;
        }

        return {
            dataUrl: dataUrl,
            base64: dataUrl.substring(comma + 1),
        } ;
    }

    private loadFileImage(file: File) : Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const image = new Image() ;
            image.onload = () => {
                URL.revokeObjectURL(image.src) ;
                resolve(image) ;
            } ;
            image.onerror = () => {
                URL.revokeObjectURL(image.src) ;
                reject(new Error('Failed to load image')) ;
            } ;
            image.src = URL.createObjectURL(file) ;
        }) ;
    }

    private fitWithin(width: number, height: number, maxLandscapeWidth: number, maxLandscapeHeight: number) : { width: number, height: number } {
        if (width <= 0 || height <= 0) {
            return { width: 1, height: 1 } ;
        }

        let maxWidth = maxLandscapeWidth ;
        let maxHeight = maxLandscapeHeight ;
        if (height > width) {
            maxWidth = maxLandscapeHeight ;
            maxHeight = maxLandscapeWidth ;
        }

        const scale = Math.min(maxWidth / width, maxHeight / height, 1.0) ;
        return {
            width: Math.max(1, Math.round(width * scale)),
            height: Math.max(1, Math.round(height * scale)),
        } ;
    }

    private renderState() {
        if (!this.image_ || !this.status_) {
            return ;
        }

        if (this.local_data_url_) {
            this.image_.src = this.local_data_url_ ;
            this.status_.innerText = 'Robot photo ready' ;
        }
        else if (this.current_key_) {
            this.status_.innerText = 'Robot photo loading...' ;
        }
        else if (this.robotItem.mode === 'display') {
            this.image_.removeAttribute('src') ;
            this.status_.innerText = 'No robot photo available' ;
        }
        else {
            this.image_.removeAttribute('src') ;
            this.status_.innerText = 'No robot photo selected' ;
        }

        if (this.button_) {
            this.button_.innerText = this.current_key_ ? 'Retake Photo' : 'Take Photo' ;
        }
    }

    private loadImageForKey(key: string) {
        this.image_src_.getImageData(key)
            .then((data: IPCImageResponse) => {
                if (data.data && this.image_) {
                    this.local_data_url_ = this.image_src_.buildDataUrl(data) ;
                    this.image_.src = this.local_data_url_ ;
                    if (this.status_) {
                        this.status_.innerText = 'Robot photo ready' ;
                    }
                    if (this.button_) {
                        this.button_.innerText = 'Retake Photo' ;
                    }
                }
            })
            .catch(() => {
                if (this.status_) {
                    this.status_.innerText = this.robotItem.mode === 'display' ? 'No robot photo available' : 'Unable to load robot photo' ;
                }
            }) ;
    }

    private refreshFromActiveTeamResult() {
        const result = this.getActiveTeamResult() ;
        if (!result) {
            this.current_key_ = undefined ;
            this.local_data_url_ = undefined ;
            this.renderState() ;
            return ;
        }

        for (const one of result.data) {
            if (one.value.type === 'string' && typeof one.value.value === 'string' && this.isRobotPhotoKey(one.value.value)) {
                this.current_key_ = one.value.value ;
                this.local_data_url_ = undefined ;
                this.loadImageForKey(this.current_key_) ;
                return ;
            }
        }

        this.current_key_ = undefined ;
        this.local_data_url_ = undefined ;
        this.renderState() ;
    }

    private isRobotPhotoKey(value: string) : boolean {
        return value.startsWith('robot-photo-') ;
    }

    private getActiveTeamResult() : IPCScoutResult | undefined {
        const view = this.view as any ;
        if (view && typeof view.getActiveTeamResult === 'function') {
            return view.getActiveTeamResult() ;
        }
        return undefined ;
    }

    private getCaptureContext() : { item: string, teamNumber: number, eventUuid: string } | undefined {
        const view = this.view as any ;
        if (!view || typeof view.getScoutItemId !== 'function') {
            return undefined ;
        }

        const item = view.getScoutItemId() as string | undefined ;
        const formInfo = view.getFormInfo ? view.getFormInfo() as IPCFormScoutData | undefined : undefined ;
        const eventUuid = formInfo?.eventUuid ;
        if (!item || !eventUuid || !item.startsWith('st-')) {
            return undefined ;
        }

        return {
            item: item,
            teamNumber: +item.substring(3),
            eventUuid: eventUuid,
        } ;
    }
}
