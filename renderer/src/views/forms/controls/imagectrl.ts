import { IPCImageItem, IPCImageResponse, IPCTypedDataValue } from "../../../ipc.js";
import { XeroRect } from "../../../widgets/xerogeom.js";
import { XeroView } from "../../xeroview.js";
import { EditFormControlDialog } from "../dialogs/editformctrldialog.js";
import { EditImageDialog } from "../dialogs/editimagectrldialog.js";
import { ImageDataSource } from "../../../apps/imagesrc.js";
import { FormControl } from "./formctrl.js";

export class ImageControl extends FormControl {
    private static item_desc_ : IPCImageItem = 
    {
        type: 'image',
        image: 'missing',
        tag: '',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: 'black',
        background: 'white',
        fontFamily: 'Arial',
        fontSize: 36,
        fontWeight: 'normal',
        fontStyle: 'normal',
        datatype: 'null',
        transparent: true,
        field: false,
        mirrorx: false,
        mirrory: false,
    } ;

    private image_? : HTMLImageElement ;
    private image_src_ : ImageDataSource;
    private tempMirrorX_ : boolean = false ;

    constructor(imsrc: ImageDataSource, view: XeroView, tag: string, bounds: XeroRect) {
        super(view, ImageControl.item_desc_) ;
        this.setTag(tag) ;
        this.setBounds(bounds) ;
        this.image_src_ = imsrc ;
    }

    public get tempMirrorX() : boolean {
        return this.tempMirrorX_ ;
    }

    public set tempMirrorX(mirror: boolean) {
        if (mirror != this.tempMirrorX_) {
            this.tempMirrorX_ = mirror ;
            this.updateImageScale() ;
        }
    }

    public setImageData(image: string) : void {
        if (this.image_) {
            this.image_.src = `data:image/png;base64,${image}`
        }
    }

    public copyObject() : FormControl {
        let image = new ImageControl(this.image_src_, this.view, this.item.tag, this.bounds) ;
        return image ;
    }

    public updateFromItem(editing: boolean, scale: number, xoff: number, yoff: number) : void {
        if (this.ctrl) {
            let item = this.item as IPCImageItem ;
            this.image_src_.getImageData(item.image)
                .then((data: IPCImageResponse) => {
                    if (data.data) {
                        if (data.newname) {
                            item.image = data.newname ;
                        }
                        this.setImageData(data.data) ;
                        this.updateImageScale() ;
     
                    }
                }) ;
            this.setPosition(scale, xoff, yoff) ;
        }
    }

    public createForEdit(parent: HTMLElement, xoff: number, yoff:number) : void  {
        super.createForEdit(parent, xoff, yoff) ;        
        this.ctrl = document.createElement('div') ;
        this.setClassList(this.ctrl, 'edit') ;

        this.image_ = document.createElement('img') ;
        this.setClassList(this.image_, 'edit', 'image') ;
        this.updateFromItem(true, 1.0, xoff, yoff) ;
        this.ctrl.appendChild(this.image_) ;
        parent.appendChild(this.ctrl) ;
    }

    public createForScouting(parent: HTMLElement, scale: number, xoff: number, yoff:number) : void  {
        super.createForScouting(parent, scale, xoff, yoff) ;        
        this.ctrl = document.createElement('div') ;
        this.setClassList(this.ctrl, 'scout') ;

        this.image_ = document.createElement('img') ;
        this.setClassList(this.image_, 'scout', 'image') ;
        this.updateFromItem(true, scale, xoff, yoff) ;
        this.ctrl.appendChild(this.image_) ;        
        parent.appendChild(this.ctrl) ;
    }    

    public createEditDialog(): EditFormControlDialog {
        return new EditImageDialog(this, this.image_src_.getImageNames()) ;
    }

    public getData() : IPCTypedDataValue | undefined {
        return undefined ;
    }

    public setData(data:IPCTypedDataValue) : void {
    }    

    private updateImageScale() : void {
        let item = this.item as IPCImageItem ;        
        if (this.effectiveMirrorX() && !item.mirrory) {
            this.image_!.style.transform = 'scaleX(-1)' ;
        }
        else if (!this.effectiveMirrorX() && item.mirrory) {
            this.image_!.style.transform = 'scaleY(-1)' ;
        }
        else if (this.effectiveMirrorX() && item.mirrory) {
            this.image_!.style.transform = 'scaleX(-1) scaleY(-1)' ;
        }
        else {
            this.image_!.style.transform = '' ;
        }  
    }    

    private effectiveMirrorX() : boolean {
        let item = this.item as IPCImageItem ;
        return this.tempMirrorX_ !== item.mirrorx ;
    }
}