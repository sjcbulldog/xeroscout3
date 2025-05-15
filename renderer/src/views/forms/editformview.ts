import {  XeroApp  } from "../../apps/xeroapp.js";
import {  XeroPoint, XeroRect  } from "../../widgets/xerogeom.js";
import {  XeroPopupMenu, XeroPopMenuItem as PopupMenuItem  } from "../../widgets/xeropopupmenu.js";
import {  XeroView  } from "../xeroview.js";
import {  FormControl  } from "./controls/formctrl.js";
import {  LabelControl  } from "./controls/labelctrl.js";
import {  TextControl  } from "./controls/textctrl.js";
import {  XeroDialog  } from "../../widgets/xerodialog.js";
import {  EditSectionNameDialog  } from "./dialogs/editsectionnamedialog.js";
import {  FormObject  } from "./formobj.js";
import {  UpDownControl  } from "./controls/updownctrl.js";
import {  BooleanControl  } from "./controls/booleanctrl.js";
import {  MultipleChoiceControl  } from "./controls/choicectrl.js";
import {  SelectControl  } from "./controls/selectctrl.js";
import {  TimerControl  } from "./controls/timerctrl.js";
import {  XeroLogger  } from "../../utils/xerologger.js";
import {  IPCFormItem  } from "../../ipc.js";

type DragState = 'none' | 'ulcorner' | 'lrcorner' | 'urcorner' | 'llcorner' | 'right' | 'left' | 'top' | 'bottom' | 'move' | 'all' ;

declare global {
    interface HTMLElement {
        section_index: number ;
        xerosectname: string ;
    }
}

export class XeroEditFormView extends XeroView {    
    static buttonClassUnselected = 'xero-form-tab-button-unselected' ;
    static buttonClassSelected = 'xero-form-tab-button-selected' ;

    private static fuzzyEdgeSpacing = 10 ;
    private static moveControlAmount = 1 ;
    private static shiftMoveControlAmount = 10 ;
    private static ctrlMoveControlAmount = 50 ;

    private dragging_ : DragState = 'none' ;    
    private form_ctrls_ : FormControl[] = [] ;
    private edit_dialog_? : XeroDialog ;
    private section_menu_? : XeroPopupMenu ;
    private image_menu_? : XeroPopupMenu ;
    private popup_menu_? : XeroPopupMenu ;
    private type_: string ;
    private nameToImageMap_: Map<string, string> ;
    private ctrl_menu_ : XeroPopupMenu ;
    private form_? : FormObject ;
    private formimg_? : HTMLImageElement ;
    private currentSectionIndex_: number = -1 ;
    private titlediv_? : HTMLDivElement ;
    private bardiv_? : HTMLDivElement ;
    private selected_? : HTMLElement ;
    private image_names_ : string[] = [] ;

    private ctrlx_ : number = 0 ;
    private ctrly_ : number = 0 ;
    private basex_ : number = 0 ;
    private basey_ : number = 0 ;
    private ctrlwidth_ : number = 0 ;
    private ctrlheight_ : number = 0 ;

    private ctxbind_? : (e: MouseEvent) => void ;
    private dblclkbind_? : (e: MouseEvent) => void ;
    private keydownbind_? : (e: KeyboardEvent) => void ;
    private mouseupbind_? : (e: MouseEvent) => void ;
    private mousemovebind_? : (e: MouseEvent) => void ;
    private mouusedownbind_? : (e: MouseEvent) => void ;

    constructor(app: XeroApp, type: any) {
        super(app, 'xero-form-view') ;

        this.type_ = type ;
        this.registerCallback('send-form', this.formCallback.bind(this));
        this.registerCallback('send-images', this.receiveImages.bind(this)) ;
        this.registerCallback('send-image-data', this.receiveImageData.bind(this)) ;

        this.request('get-images') ;
        this.request('get-form', this.type_);

        this.nameToImageMap_ = new Map() ;

        let ctrlitems = [
            new PopupMenuItem('Label', this.addNewLabelCtrl.bind(this)),
            new PopupMenuItem('Text Field', this.addNewTextCtrl.bind(this)),
            new PopupMenuItem('Up/Down Field', this.addNewUpDownCtrl.bind(this)),
            new PopupMenuItem('Boolean Field', this.addNewBooleanCtrl.bind(this)),
            new PopupMenuItem('Multiple Choice', this.addNewMultipleChoiceCtrl.bind(this)),
            new PopupMenuItem('Select', this.addNewSelectCtrl.bind(this)),
            new PopupMenuItem('Timer', this.addNewTimerCtrl.bind(this)),
        ]
        this.ctrl_menu_ = new XeroPopupMenu('controls', ctrlitems) ;
    }

    findItemByTag(name: string) {
        if (this.form_) {
            for(let section of this.form_.sections) {
                if (section.items) {
                    for(let item of section.items) {
                        if (item.tag === name) {
                            return item ;
                        }
                    }
                }
            }
        }
        return undefined ;
    }

    private getUniqueTagName() : string {
        let index = 1 ;
        let name = 'tag_' + index ;

        while(true) {
            if (this.findItemByTag(name) === undefined) {
                break ;
            }
            index++ ;
            name = 'tag_' + index ;
        }

        return name ;
    }

    private addItemToCurrentSection(item: IPCFormItem) {
        if (this.form_) {
            let section = this.form_.sections[this.currentSectionIndex_] ;
            if (section.items === undefined) {
                section.items = [] ;
            }
            section.items.push(item) ;
        }
    }

    private addNewLabelCtrl() {
        if (this.formimg_) {
            let imgrect = this.formimg_.getBoundingClientRect() ;
            let formctrl = new LabelControl(this, this.getUniqueTagName(), new XeroRect(0, imgrect.top, 250, 50)) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.form_ctrls_.push(formctrl) ;

            formctrl.createForEdit(this.elem) ;
            this.modified() ;        
        }
    }

    addNewTextCtrl() {
        if (this.formimg_) {
            let imgrect = this.formimg_.getBoundingClientRect() ;
            let formctrl = new TextControl(this, this.getUniqueTagName(), new XeroRect(0, imgrect.top, 250, 50)) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.form_ctrls_.push(formctrl) ;

            formctrl.createForEdit(this.elem) ;
            this.modified() ;  
        }
    }    

    private addNewUpDownCtrl() {
        if (this.formimg_) {
            let imgrect = this.formimg_.getBoundingClientRect() ;
            let formctrl = new UpDownControl(this, this.getUniqueTagName(), new XeroRect(0, imgrect.top, 250, 50)) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.form_ctrls_.push(formctrl) ;

            formctrl.createForEdit(this.elem) ;
            this.modified() ;  
        }
    }  

    private addNewBooleanCtrl() {
        if (this.formimg_) {
            let imgrect = this.formimg_.getBoundingClientRect() ;
            let formctrl = new BooleanControl(this, this.getUniqueTagName(), new XeroRect(0, imgrect.top, 250, 50)) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.form_ctrls_.push(formctrl) ;

            formctrl.createForEdit(this.elem) ;
            this.modified() ;  
        }
    }  

    private addNewMultipleChoiceCtrl() {
        if (this.formimg_) {
            let imgrect = this.formimg_.getBoundingClientRect() ;
            let formctrl = new MultipleChoiceControl(this, this.getUniqueTagName(), new XeroRect(0, imgrect.top, 250, 50)) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.form_ctrls_.push(formctrl) ;

            formctrl.createForEdit(this.elem) ;
            this.modified() ;  
        }
    } 

    private addNewSelectCtrl() {
        if (this.formimg_) {
            let imgrect = this.formimg_.getBoundingClientRect() ;
            let formctrl = new SelectControl(this, this.getUniqueTagName(), new XeroRect(0, imgrect.top, 250, 50)) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.form_ctrls_.push(formctrl) ;

            formctrl.createForEdit(this.elem) ;
            this.modified() ;  
        }
    } 

    private addNewTimerCtrl() {
        if (this.formimg_) {
            let imgrect = this.formimg_.getBoundingClientRect() ;
            let formctrl = new TimerControl(this, this.getUniqueTagName(), new XeroRect(0, imgrect.top, 250, 50)) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.form_ctrls_.push(formctrl) ;

            formctrl.createForEdit(this.elem) ;
            this.modified() ;  
        }
    }     

    private formCallback(args: any) {
        this.initDisplay() ;

        this.form_ = new FormObject(args.form.json) ;
        if (this.form_) {
            if (this.form_.sections.length === 0) {
                // This is an empty form, so we need to add a section.
                this.addSection() ;
                this.formViewUpdateTabBar() ;
                this.modified() ;
            }
            else {
                // Make sure we have the images for the sections.
                this.updateImages() ;
                this.formViewUpdateTabBar() ;
                this.setCurrentSectionByIndex(0) ;
            }
        }
    }

    private updateControls() {
        if (!this.form_) {
            return ;
        }

        this.removeExistingControls() ;

        let section = this.form_.sections[this.currentSectionIndex_] ;
        if (section.items) {
            for(let item of section.items) {
                let formctrl ;
                if (item.type === 'label') {
                    formctrl = new LabelControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'text') {
                    formctrl = new TextControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'boolean') {  
                    formctrl = new BooleanControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'updown') {
                    formctrl = new UpDownControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'choice') {
                    formctrl = new MultipleChoiceControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'select') {
                    formctrl = new SelectControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else if (item.type === 'timer') {
                    formctrl = new TimerControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
                    formctrl.update(item) ;
                }
                else {
                    let logger = XeroLogger.getInstance() ;
                    logger.warn(`XeroEditFormView: unknown form control type ${item.type}`) ;
                }

                if (formctrl) {
                    this.form_ctrls_.push(formctrl) ;
                    formctrl.createForEdit(this.elem) ;
                }
            }
        }
    }

    private removeExistingControls() {
        for(let entry of this.form_ctrls_) {
            if (entry.ctrl) {
                if (this.elem.contains(entry.ctrl)) {
                    this.elem.removeChild(entry.ctrl) ;
                }
            }
        }
        this.form_ctrls_ = [] ;
    }

    private updateSectionDisplay() {
        if (this.form_ && this.formimg_) {
            let imname = this.form_.sections[this.currentSectionIndex_].image ;
            let data = this.nameToImageMap_.get(imname) ;
            this.formimg_.src = `data:image/jpg;base64,${data}`
            this.updateControls() ;
        }
    }

    private setCurrentSectionByIndex(sectionIndex: number) : boolean {
        if (!this.form_ || sectionIndex < 0 || sectionIndex >= this.form_.sections.length) {
            return false ;
        }

        if (this.bardiv_) {
            this.currentSectionIndex_ = sectionIndex ;
            this.bardiv_.children[this.currentSectionIndex_]!.className = XeroEditFormView.buttonClassSelected ;
            this.updateSectionDisplay() ;
        }
        return true ;
    }

    updateImages() {
        if (this.form_) {
            this.form_.resetImages() ;
            for(let image of this.form_.images) {
                this.request('get-image-data', image) ;
            }
        }  
    }

   
    addSection() {
        if (this.form_) {
            this.form_.createNewSection() ;
            this.updateImages() ;
            this.formViewUpdateTabBar() ;
            this.setCurrentSectionByIndex(this.form_.sections.length - 1) ;
            this.modified() ;
        }
    }

    deleteSection() {
        if (this.currentSectionIndex_ === -1) {
            return ;
        }

        if (this.form_ && this.bardiv_) {
            if (this.form_.sectionCount === 1) {
                window.alert('You cannot delete the last section - there must be at least one section.') ;
                return ;
            }

            this.form_.removeSectionByIndex(this.currentSectionIndex_) ;
            this.bardiv_.removeChild(this.bardiv_.children[this.currentSectionIndex_]) ;
            this.setCurrentSectionByIndex(0) ;
            this.formViewUpdateTabBar() ;
            this.modified() ;
        }
    }

    private selectBackgroundImage(image: string) {
        if (this.form_ && this.formimg_) {
            this.form_.sections[this.currentSectionIndex_].image = image ;
            this.updateImages() ;
            
            if (this.nameToImageMap_.has(image)) {
                this.formimg_.src = `data:image/jpg;base64,${this.nameToImageMap_.get(image)}` ;
            }

            this.modified() ;
        }
    }    

    private receiveImages(args: any) {
        this.image_names_ = args ;

        let items = [] ;
        for(let im of this.image_names_) {
            let item = new PopupMenuItem(im, this.selectBackgroundImage.bind(this, im)) ;
            items.push(item) ;
        }
        this.image_menu_ = new XeroPopupMenu('images', items) ;        
    }

    private receiveImageData(args: any) {
        let name = args.name ;
        let data = args.data ;

        this.nameToImageMap_.set(name, data) ;

        if (this.form_ && this.form_.sections && this.form_.sections.length !== 0) {
            let section = this.form_.sections[this.currentSectionIndex_] ;
            if (section.image === name) {
                this.updateSectionDisplay() ;
            }
        }        
    }

    private modified() : void {
        if (this.form_) {
            this.request('save-form', { type: this.type_, contents: this.form_.json}) ;
        }
    }

    private formViewSelectButton(event: MouseEvent) {
        if (this.bardiv_ && this.form_) {
            if (this.currentSectionIndex_ !== -1) {
                this.bardiv_.children[this.currentSectionIndex_].className = XeroEditFormView.buttonClassUnselected ;
            }

            let index = Array.prototype.indexOf.call(this.bardiv_.children, event.target) ;
            if (index !== -1) {
                this.setCurrentSectionByIndex(index) ;
            }
        }
    }

    private formViewUpdateTabBar() {
        if (this.bardiv_ && this.form_) {
            this.bardiv_.innerHTML = '' ;
            let index = 0 ;
            for(let section of this.form_.sections) {
                let button = document.createElement('div') ;
                button.innerText = section.name ;
                button.className = XeroEditFormView.buttonClassUnselected ;
                button.id = section + '-button' ;
                button.section_index = index++ ;
                button.addEventListener('click', this.formViewSelectButton.bind(this)) ;
                this.bardiv_.append(button) ;
            }  
        }
        return this.bardiv_ ;
    }

    private initDisplay() {
        this.reset() ;

        this.titlediv_ = document.createElement('div') ;
        this.titlediv_.className = 'xero-form-title' ;
        let tname = this.type_.charAt(0).toUpperCase() + this.type_.slice(1) ;
        this.titlediv_.innerText = tname + ' Form' ;
        this.elem.append(this.titlediv_) ;

        this.bardiv_ = document.createElement('div') ;
        this.bardiv_.className = 'xero-form-tab' ;
        this.elem.append(this.bardiv_) ;

        this.formimg_ = document.createElement('img') ;
        this.formimg_.className = 'xero-form-form' ;
        this.formimg_.style.pointerEvents = 'none' ;
        this.elem.style.userSelect = 'none' ;
        this.elem.append(this.formimg_) ;

        this.ctxbind_ = this.contextMenu.bind(this) ;
        document.addEventListener('contextmenu', this.ctxbind_) ;

        this.dblclkbind_ = this.doubleClick.bind(this) ;
        document.addEventListener('dblclick', this.dblclkbind_) ;

        this.keydownbind_ = this.onGlobalKey.bind(this) ;
        document.addEventListener('keydown', this.keydownbind_) ;

        this.mouseupbind_ = this.mouseUp.bind(this) ;
        document.addEventListener('mouseup', this.mouseupbind_) ;

        this.mousemovebind_ = this.mouseMove.bind(this) ;
        document.addEventListener('mousemove', this.mousemovebind_) ;

        this.mouusedownbind_ = this.mouseDown.bind(this) ;
        document.addEventListener('mousedown', this.mouusedownbind_) ;
    }

    private findFormControlFromCtrl(ctrl: HTMLElement) {
        for(let entry of this.form_ctrls_) {
            if (entry.ctrl === ctrl) {
                return entry ;
            }
        }
        return undefined ;
    }

    private mouseUp(event: MouseEvent) {
        this.controlRelease(event) ;
        this.app.statusBar.setMiddleStatus('') ;
    }    

    private dialogClosed() {
        this.edit_dialog_ = undefined ;
    }

    private doubleClick(event: MouseEvent) {
        if (this.selected_ && !this.edit_dialog_) {
            let formctrl = this.findFormControlFromCtrl(this.selected_) ;
            this.dragging_ = 'none' ;
            if (formctrl) {
                this.unselectCurrent() ;
                this.edit_dialog_ = formctrl.createEditDialog() ;
                this.edit_dialog_.showRelative(this.elem) ;
                this.edit_dialog_.on('closed', this.dialogClosed.bind(this)) ;
            }
        }
    }

    private onGlobalKey(event: KeyboardEvent) {
        if (!this.edit_dialog_) {
            console.log('onGlobalKey', event.key, event.ctrlKey) ;
            
            if (event.key === 'Delete') {
                this.deleteSelectedItem() ;
            }
            else if (event.key === 'v' && event.ctrlKey) {
                this.pasteSelectedItem() ;
            }
            else if (event.key === 'ArrowRight') {
                if (event.ctrlKey) {
                    this.moveSelectedItem(XeroEditFormView.ctrlMoveControlAmount, 0) ;
                }
                else if (event.shiftKey) {
                    this.moveSelectedItem(XeroEditFormView.shiftMoveControlAmount, 0) ;                    
                }
                else {
                    this.moveSelectedItem(XeroEditFormView.moveControlAmount, 0) ;
                }
            }
            else if (event.key === 'ArrowLeft') {
                if (event.ctrlKey) {
                    this.moveSelectedItem(-XeroEditFormView.ctrlMoveControlAmount, 0) ;
                }
                else if (event.shiftKey) {
                    this.moveSelectedItem(-XeroEditFormView.shiftMoveControlAmount, 0) ;
                }
                else {
                    this.moveSelectedItem(-XeroEditFormView.moveControlAmount, 0) ;
                }
            }
            else if (event.key === 'ArrowUp') {
                if (event.ctrlKey) {
                    this.moveSelectedItem(0, -XeroEditFormView.ctrlMoveControlAmount) ;
                }
                else if (event.shiftKey) {
                    this.moveSelectedItem(0, -XeroEditFormView.shiftMoveControlAmount) ;
                }
                else {
                    this.moveSelectedItem(0, -XeroEditFormView.moveControlAmount) ;
                }
            }
            else if (event.key === 'ArrowDown') {
                if (event.ctrlKey) {
                    this.moveSelectedItem(0, XeroEditFormView.ctrlMoveControlAmount) ;
                }
                else if (event.shiftKey) {
                    this.moveSelectedItem(0, XeroEditFormView.shiftMoveControlAmount) ;
                }
                else {
                    this.moveSelectedItem(0, XeroEditFormView.moveControlAmount) ;
                }
            }
        }
    }

    private moveSelectedItem(dx: number, dy: number) {
        if (this.selected_) {
            let frmctrl = this.findFormControlFromCtrl(this.selected_) ;
            if (frmctrl) {
                let x = parseInt(this.selected_!.style.left) ;
                let y = parseInt(this.selected_!.style.top) ;
                this.selected_!.style.left = (x + dx) + 'px' ;
                this.selected_!.style.top = (y + dy) + 'px' ;

                frmctrl.item.x = x + dx ;
                frmctrl.item.y = y + dy ;

                this.displaySelectedBounds() ;
                this.modified() ;
            }
        }
    }    

    private pasteSelectedItem() {
        if (this.selected_) {
            let curfrmctrl = this.findFormControlFromCtrl(this.selected_) ;
            if (curfrmctrl) {
                let tag = this.getUniqueTagName() ;
                let frmctrl = curfrmctrl.clone(tag) ;
                frmctrl.item.x += 40 ;
                frmctrl.item.y += 40 ;
                this.form_ctrls_.push(frmctrl) ;
                frmctrl.createForEdit(this.elem) ;
                this.addItemToCurrentSection(frmctrl.item) ;
                this.unselectCurrent() ;
                this.select(frmctrl.ctrl!) ;
                this.modified() ;
            }
        }
    }

    private deleteSelectedItem() {
        if (this.selected_ && this.form_) {
            let frmctrl = this.findFormControlFromCtrl(this.selected_) ;
            if (frmctrl) {
                let section = this.form_.sections[this.currentSectionIndex_] ;
                let index = section.items.indexOf(frmctrl.item) ;
                if (index !== -1) {
                    section.items.splice(index, 1) ;
                    this.removeFormCtrlItem(frmctrl) ;
                    this.elem.removeChild(this.selected_) ;
                    this.selected_ = undefined ;
                    this.dragging_ = 'none' ;
                    this.modified() ;
                }
            }
        }
    }

    private removeFormCtrlItem(frmctrl: FormControl) : boolean {
        for(let i = 0; i < this.form_ctrls_.length; i++) {
            if (this.form_ctrls_[i] === frmctrl) {
                this.form_ctrls_.splice(i, 1) ;
                return true ;
            }
        }
        return false ;
    }    

    private unselectCurrent() {
        if (this.selected_) {
            this.selected_!.style.border = 'none' ;
            this.selected_!.style.margin = '4px' ;
            this.selected_ = undefined ;
            this.dragging_ = 'none' ;
            this.app.statusBar.setMiddleStatus('') ;
        }
    }
    
    private findControlByPosition(x: number, y: number) : HTMLElement | undefined {
        for(let entry of this.form_ctrls_) {
            if (entry.ctrl === undefined) {
                continue ;
            }

            let ctrl = entry.ctrl ;
            let item = entry.item ;

            let rect = ctrl.getBoundingClientRect() ;
            if (x >= rect.left - XeroEditFormView.fuzzyEdgeSpacing && x <= rect.right + XeroEditFormView.fuzzyEdgeSpacing && 
                    y >= rect.top - XeroEditFormView.fuzzyEdgeSpacing && y <= rect.bottom + XeroEditFormView.fuzzyEdgeSpacing) {
                return ctrl ;
            }
        }
        return undefined ;
    }

    private updateMouseCursor(x:number, y: number) {
        let ctrl = this.findControlByPosition(x, y) ;
        if (ctrl === undefined) {
            this.unselectCurrent() ;
            this.elem.style.cursor = 'default' ;
            return ;
        }

        if (ctrl !== this.selected_) {
            this.unselectCurrent() ;
            this.select(ctrl) ;
        }      

        let top = this.isTopEdge(x, y, ctrl) ;
        let bottom = this.isBottomEdge(x, y, ctrl) ;
        let left = this.isLeftEdge(x, y, ctrl) ;
        let right = this.isRightEdge(x, y, ctrl) ;

        if (top && left) {
            this.elem.style.cursor = 'nwse-resize' ;
        }
        else if (top && right) {
            this.elem.style.cursor = 'nesw-resize' ;
        }
        else if (bottom && left) {
            this.elem.style.cursor = 'nesw-resize' ;
        }
        else if (bottom && right) {
            this.elem.style.cursor = 'nwse-resize' ;
        }                
        else if (right) {
            this.elem.style.cursor = 'ew-resize' ;
        }
        else if (left) {
            this.elem.style.cursor = 'ew-resize' ;
        }
        else if (top) {
            this.elem.style.cursor = 'ns-resize' ;
        }
        else if (bottom) {
            this.elem.style.cursor = 'ns-resize' ;
        }
        else {
            this.elem.style.cursor = 'move' ;
        }
    }

    private displaySelectedBounds() {
        let bar = this.app.statusBar ;
        let ctrl = this.selected_ ;
        if (ctrl) {
            let str: string = `${ctrl.offsetLeft},${ctrl.offsetTop} ${ctrl.clientWidth}x${ctrl.clientHeight}` ;
            bar.setMiddleStatus(str) ;
            console.log('displaySelectedBounds', str) ;
        }
    }

    private mouseMove(event: MouseEvent) {
        if (!document.hasFocus()) {
            return ;
        }

        if (this.dragging_ === 'all') {
            let dx = event.pageX - this.basex_ ;
            let dy = event.pageY - this.basey_ ;
            this.selected_!.style.left = (this.ctrlx_ + dx) + 'px' ;
            this.selected_!.style.top = (this.ctrly_ + dy) + 'px' ;

            let frmctrl = this.findFormControlFromCtrl(this.selected_!) ;
            if (frmctrl && frmctrl.item) {
                frmctrl.item.x = this.ctrlx_+ dx ;
                frmctrl.item.y = this.ctrly_ + dy ;
            }
            this.displaySelectedBounds() ;
            this.elem.style.cursor = 'move' ;
            this.modified() ;
        }
        else if (this.dragging_ === 'ulcorner') {
            let dx = event.pageX - this.basex_ ;
            let dy = event.pageY - this.basey_ ;
            this.selected_!.style.left = (this.ctrlx_+ dx) + 'px' ;
            this.selected_!.style.top = (this.ctrly_ + dy) + 'px' ;
            this.selected_!.style.width = (this.ctrlwidth_ - dx) + 'px' ;
            this.selected_!.style.height = (this.ctrlheight_ - dy) + 'px' ;
            let frmctrl = this.findFormControlFromCtrl(this.selected_!) ;
            if (frmctrl && frmctrl.item) {
                frmctrl.item.x = this.ctrlx_+ dx ;
                frmctrl.item.y = this.ctrly_ + dy ;
                frmctrl.item.width = this.ctrlwidth_ - dx ;
                frmctrl.item.height = this.ctrlheight_ - dy ;
            }
            this.displaySelectedBounds() ;
            this.elem.style.cursor = 'nwse-resize' ;
            this.modified() ;
        }
        else if (this.dragging_ === 'urcorner') {
            let dx = event.pageX - this.basex_ ;
            let dy = event.pageY - this.basey_ ;
            this.selected_!.style.top = (this.ctrly_ + dy) + 'px' ;
            this.selected_!.style.width = (this.ctrlwidth_ + dx) + 'px' ;
            this.selected_!.style.height = (this.ctrlheight_ - dy) + 'px' ;
            let frmctrl = this.findFormControlFromCtrl(this.selected_!) ;
            if (frmctrl && frmctrl.item) {
                frmctrl.item.y = this.ctrly_ + dy ;
                frmctrl.item.width = this.ctrlwidth_ + dx ;
                frmctrl.item.height = this.ctrlheight_ - dy ;
            }
            this.displaySelectedBounds() ;            
            this.elem.style.cursor = 'nesw-resize' ;
            this.modified() ;
        }
        else if (this.dragging_ === 'llcorner') {
            let dx = event.pageX - this.basex_ ;
            let dy = event.pageY - this.basey_ ;
            this.selected_!.style.left = (this.ctrlx_+ dx) + 'px' ;
            this.selected_!.style.width = (this.ctrlwidth_ - dx) + 'px' ;
            this.selected_!.style.height = (this.ctrlheight_ + dy) + 'px' ;
            let frmctrl = this.findFormControlFromCtrl(this.selected_!) ;
            if (frmctrl && frmctrl.item) {

                frmctrl.item.x = this.ctrlx_+ dx ;
                frmctrl.item.width = this.ctrlwidth_ - dx ;
                frmctrl.item.height = this.ctrlheight_ + dy ;
            }
            this.displaySelectedBounds() ;            
            this.elem.style.cursor = 'nesw-resize' ;
            this.modified() ;
        }
        else if (this.dragging_ === 'lrcorner') {
            let dx = event.pageX - this.basex_ ;
            let dy = event.pageY - this.basey_ ;
            this.selected_!.style.width = (this.ctrlwidth_ + dx) + 'px' ;
            this.selected_!.style.height = (this.ctrlheight_ + dy) + 'px' ;
            let frmctrl = this.findFormControlFromCtrl(this.selected_!) ;
            if (frmctrl && frmctrl.item) {
                frmctrl.item.width = this.ctrlwidth_ + dx ;
                frmctrl.item.height = this.ctrlheight_ + dy ;
            }
            this.displaySelectedBounds() ;            
            this.elem.style.cursor = 'nwse-resize' ;
            this.modified() ;
        }
        else if (this.dragging_ === 'right') {
            let dx = event.pageX - this.basex_ ;
            this.selected_!.style.width = (this.ctrlwidth_ + dx) + 'px' ;
            let frmctrl = this.findFormControlFromCtrl(this.selected_!) ;
            if (frmctrl && frmctrl.item) {
                frmctrl.item.width = this.ctrlwidth_ + dx ;
            }
            this.displaySelectedBounds() ;            
            this.elem.style.cursor = 'ew-resize' ;
            this.modified() ;
        }
        else if (this.dragging_ === 'left') {
            let dx = event.pageX - this.basex_ ;
            this.selected_!.style.left = (this.ctrlx_+ dx) + 'px' ;
            this.selected_!.style.width = (this.ctrlwidth_ - dx) + 'px' ;
            let frmctrl = this.findFormControlFromCtrl(this.selected_!) ;
            if (frmctrl && frmctrl.item) {
                frmctrl.item.x = this.ctrlx_+ dx ;
                frmctrl.item.width = this.ctrlwidth_ - dx ;
            }
            this.displaySelectedBounds() ;            
            this.elem.style.cursor = 'ew-resize' ;
            this.modified() ;
        }
        else if (this.dragging_ === 'top') {
            let dy = event.pageY - this.basey_ ;
            this.selected_!.style.top = (this.ctrly_ + dy) + 'px' ;
            this.selected_!.style.height = (this.ctrlheight_ - dy) + 'px' ;
            let frmctrl = this.findFormControlFromCtrl(this.selected_!) ;
            if (frmctrl && frmctrl.item) {
                frmctrl.item.y = this.ctrly_ + dy ;
                frmctrl.item.height = this.ctrlheight_ - dy ;
            }
            this.displaySelectedBounds() ;            
            this.elem.style.cursor = 'ns-resize' ;
            this.modified() ;
        }
        else if (this.dragging_ === 'bottom') {
            let dy = event.pageY - this.basey_ ;
            this.selected_!.style.height = (this.ctrlheight_ + dy) + 'px' ;
            let frmctrl = this.findFormControlFromCtrl(this.selected_!) ;
            if (frmctrl && frmctrl.item) {
                frmctrl.item.height = this.ctrlheight_ + dy ;
            }
            this.displaySelectedBounds() ;            
            this.elem.style.cursor = 'ns-resize' ;
            this.modified() ;
        }
        else {
            if (!this.edit_dialog_ && !this.popup_menu_) {
                this.updateMouseCursor(event.pageX, event.pageY) ;
            }
        }
    }

    private isRightEdge(x: number, y: number, ctrl: HTMLElement) {
        let rect = ctrl.getBoundingClientRect() ;
        if (x >= rect.right - XeroEditFormView.fuzzyEdgeSpacing && x <= rect.right + XeroEditFormView.fuzzyEdgeSpacing && y >= rect.top && y <= rect.bottom) {
            return true ;
        }
        return false ;
    }

    private isLeftEdge(x: number, y: number, ctrl: HTMLElement) {
        let rect = ctrl.getBoundingClientRect() ;
        if (x >= rect.left - XeroEditFormView.fuzzyEdgeSpacing && x <= rect.left + XeroEditFormView.fuzzyEdgeSpacing && y >= rect.top && y <= rect.bottom) {
            return true ;
        }
        return false ;
    }

    private isTopEdge(x: number, y: number, ctrl: HTMLElement) {
        let rect = ctrl.getBoundingClientRect() ;
        if (x >= rect.left && x <= rect.right && y >= rect.top - XeroEditFormView.fuzzyEdgeSpacing && y <= rect.top + XeroEditFormView.fuzzyEdgeSpacing) {
            return true ;
        }
        return false ;
    }

    private isBottomEdge(x: number, y: number, ctrl: HTMLElement) {
        let rect = ctrl.getBoundingClientRect() ;
        if (x >= rect.left && x <= rect.right && y >= rect.bottom - XeroEditFormView.fuzzyEdgeSpacing && y <= rect.bottom + XeroEditFormView.fuzzyEdgeSpacing) {
            return true ;
        }
        return false ;
    }

    private select(ctrl: HTMLElement) {
        this.selected_ = ctrl ;
        this.selected_!.style.borderStyle = 'solid' ;
        this.selected_!.style.borderWidth = '4px' ;
        this.selected_!.style.borderColor = 'red' ;
        this.selected_!.style.margin = '0px' 
    }

    private mouseDown(event: MouseEvent) {
        if (this.selected_ && !this.edit_dialog_ && !this.popup_menu_) {
            let top = this.isTopEdge(event.pageX, event.pageY, this.selected_) ;
            let bottom = this.isBottomEdge(event.pageX, event.pageY, this.selected_) ;
            let left = this.isLeftEdge(event.pageX, event.pageY, this.selected_) ;
            let right = this.isRightEdge(event.pageX, event.pageY, this.selected_) ;

            if (top && left) {
                this.dragging_ = 'ulcorner' ;
            }
            else if (top && right) {
                this.dragging_ = 'urcorner' ;
            }
            else if (bottom && left) {
                this.dragging_ = 'llcorner' ;
            }
            else if (bottom && right) {
                this.dragging_ = 'lrcorner' ;
            }                
            else if (right) {
                this.dragging_ = 'right' ;
            }
            else if (left) {
                this.dragging_ = 'left' ;
            }
            else if (top) {
                this.dragging_ = 'top' ;
            }
            else if (bottom) {
                this.dragging_ = 'bottom' ;
            }
            else {
                this.dragging_ = 'all' ;
            }

            this.basex_ = event.pageX ;
            this.basey_ = event.pageY ;
            this.ctrlx_= this.selected_!.offsetLeft ;
            this.ctrly_ = this.selected_!.offsetTop ;
            this.ctrlwidth_ = this.selected_!.offsetWidth ;
            this.ctrlheight_ = this.selected_!.offsetHeight ;
        }
    }    

    private controlRelease(event: MouseEvent) {
        this.dragging_ = 'none' ;
        this.modified() ;
    }   

    private sectionNameDialogDone(changed: boolean) {
        if (changed && this.bardiv_ && this.form_) {
            let barctrl = this.bardiv_.children[this.currentSectionIndex_] as HTMLElement ;
            barctrl.innerText = this.form_.sections[this.currentSectionIndex_].name ;
            this.modified() ;
        }
        this.edit_dialog_ = undefined ;
    }

    private renameSection() {
        if (this.form_) {
            this.unselectCurrent() ;
            this.edit_dialog_ = new EditSectionNameDialog(this.form_.sections[this.currentSectionIndex_]) ;
            this.edit_dialog_.on('closed', this.sectionNameDialogDone.bind(this)) ;
            this.edit_dialog_.showRelative(this.elem.parentElement!) ;
        }
    }

    private importImage() {
        this.request('import-image') ;
    }

    private menuClosed() {
        this.popup_menu_ = undefined ;
    }

    private contextMenu(event: MouseEvent) {
        event.preventDefault() ;

        if (this.popup_menu_) {
            this.popup_menu_.closeMenu() ;
            this.popup_menu_ = undefined ;
        }

        if (event.target && event.target instanceof HTMLElement) {
            let sectionItems = [
                new PopupMenuItem('Add Section', this.addSection.bind(this)),
                new PopupMenuItem('Delete Section', this.deleteSection.bind(this)),
                new PopupMenuItem('Rename Section', this.renameSection.bind(this))
            ]
            this.section_menu_ = new XeroPopupMenu('section', sectionItems) ;

            let items = [
                new PopupMenuItem('Import Image', this.importImage.bind(this)),
                new PopupMenuItem('Sections', undefined, this.section_menu_),
                new PopupMenuItem('Add Control', undefined, this.ctrl_menu_),
                new PopupMenuItem('Select Background Image', undefined, this.image_menu_),
            ]

            this.unselectCurrent() ;
            this.popup_menu_ = new XeroPopupMenu('main', items) ;
            this.popup_menu_.on('menu-closed', this.menuClosed.bind(this)) ;
            this.popup_menu_.showRelative(event.target.parentElement!, new XeroPoint(event.clientX, event.clientY)) ;
        }
    }    
}