import { IPCRobotViewerItem, IPCScoutResult, IPCTypedDataValue } from "../../../shared/ipc.js";
import { XeroRect } from "../../../shared/xerogeom.js";
import { XeroView } from "../../xeroview.js";
import { EditFormControlDialog } from "../dialogs/editformctrldialog.js";
import { EditRobotViewerDialog } from "../dialogs/editrobotviewerdialog.js";
import { FormControl } from "./formctrl.js";

export class RobotViewerControl extends FormControl {
    private static readonly item_desc_ : IPCRobotViewerItem = {
        type: 'robotviewer',
        tag: '',
        x: 0,
        y: 0,
        width: 280,
        height: 220,
        color: 'black',
        background: '#f8fafc',
        fontFamily: 'Arial',
        fontSize: 20,
        fontWeight: 'normal',
        fontStyle: 'normal',
        datatype: 'null',
        transparent: false,
    } ;

    private image_? : HTMLImageElement ;
    private status_? : HTMLDivElement ;

    constructor(view: XeroView, tag: string, bounds: XeroRect) {
        super(view, RobotViewerControl.item_desc_) ;
        this.setTag(tag) ;
        this.setBounds(bounds) ;
    }

    protected copyObject(): FormControl {
        return new RobotViewerControl(this.view, this.item.tag, this.bounds) ;
    }

    public createEditDialog(): EditFormControlDialog {
        return new EditRobotViewerDialog(this) ;
    }

    public getData(): IPCTypedDataValue | undefined {
        return undefined ;
    }

    public setData(_data: IPCTypedDataValue): void {
    }

    public updateFromItem(editing: boolean, scale: number, xoff: number, yoff: number): void {
        if (!this.ctrl) {
            return ;
        }

        this.setPosition(scale, xoff, yoff, 900) ;
        if (editing) {
            if (this.status_) {
                this.status_.innerText = 'Robot Viewer' ;
            }
            return ;
        }

        this.refreshFromActiveTeamResult() ;
    }

    public createForEdit(parent: HTMLElement, xoff: number, yoff: number): void {
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

    public createForScouting(parent: HTMLElement, scale: number, xoff: number, yoff: number): void {
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

        parent.appendChild(this.ctrl) ;
        this.updateFromItem(false, scale, xoff, yoff) ;
    }

    private refreshFromActiveTeamResult() {
        if (!this.image_ || !this.status_) {
            return ;
        }

        const result = this.getActiveTeamResult() ;
        if (!result) {
            this.image_.removeAttribute('src') ;
            this.status_.innerText = 'No robot photo available' ;
            return ;
        }

        for (const one of result.data) {
            if (one.value.type !== 'string' || typeof one.value.value !== 'string') {
                continue ;
            }

            if (this.isImageDataUrl(one.value.value)) {
                this.image_.src = one.value.value ;
                this.status_.innerText = 'Robot photo ready' ;
                return ;
            }
        }

        this.image_.removeAttribute('src') ;
        this.status_.innerText = 'No robot photo available' ;
    }

    private isImageDataUrl(value: string): boolean {
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
