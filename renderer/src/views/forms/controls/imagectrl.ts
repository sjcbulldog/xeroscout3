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
        transparent: true
    } ;

    private image_? : HTMLImageElement ;
    private image_src_ : ImageDataSource;

    constructor(imsrc: ImageDataSource, view: XeroView, tag: string, bounds: XeroRect) {
        super(view, ImageControl.item_desc_) ;
        this.setTag(tag) ;
        this.setBounds(bounds) ;
        this.image_src_ = imsrc ;
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
}