import {  XeroApp  } from "../../apps/xeroapp.js";
import {  XeroPoint, XeroRect, XeroSize  } from "../../widgets/xerogeom.js";
import {  XeroPopupMenu, XeroPopMenuItem as PopupMenuItem  } from "../../widgets/xeropopupmenu.js";
import {  XeroView  } from "../xeroview.js";
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
import {  IPCFormItem, IPCSection  } from "../../ipc.js";
import {  XeroTabbedWidget } from "../../widgets/xerotabbedwidget.js";
import {  XeroFormEditSectionPage } from "./editpage.js";

type DragState = 'none' | 'ulcorner' | 'lrcorner' | 'urcorner' | 'llcorner' | 'right' | 'left' | 'top' | 'bottom' | 'move' | 'all' ;

declare global {
    interface HTMLElement {
        section_index: number ;
        xerosectname: string ;
    }
}

export class XeroEditFormView extends XeroView {    
    private static blankImageName = 'blank' ;

    private static moveControlAmount = 1 ;
    private static shiftMoveControlAmount = 10 ;
    private static ctrlMoveControlAmount = 50 ;

    private tabbed_ctrl_? : XeroTabbedWidget ;
    private section_pages_ : XeroFormEditSectionPage[] = [] ;
    private titlediv_? : HTMLElement ;
    private tabdiv_? : HTMLElement ;

    private dragging_ : DragState = 'none' ;    
    private edit_dialog_? : XeroDialog ;

    private type_: string ;
    private nameToImageMap_: Map<string, string> ;
    private ctrl_menu_ : XeroPopupMenu ;
    private form_? : FormObject ;
    private selected_ctrls_ : HTMLElement[] = [] ;
    private highlighted_ctrl_? : HTMLElement ;
    private image_names_ : string[] = [] ;

    private section_menu_? : XeroPopupMenu ;
    private image_menu_? : XeroPopupMenu ;
    private popup_menu_? : XeroPopupMenu ;
    private align_menu_? : XeroPopupMenu ;  
    private size_menu_? : XeroPopupMenu ;  

    private item_ : XeroPoint[] = [] ;
    private ctrl_ : XeroPoint[] = [] ;
    private ctrl_size_ : XeroSize[] = [] ;
    private base_ : XeroPoint = new XeroPoint(0, 0) ;
    private cursor_ : XeroPoint = new XeroPoint(0, 0) ;

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
            let section = this.form_.sections[this.tabbed_ctrl_!.selectedPageNumber] ;
            if (section.items === undefined) {
                section.items = [] ;
            }
            section.items.push(item) ;
        }
    }

    private findCtrlLocation(pt: XeroPoint) : XeroPoint {
        return pt ;
    }

    private addNewLabelCtrl(pt: XeroPoint) {
        if (this.tabbed_ctrl_?.selectedPage) {
            let ctrlpt = this.findCtrlLocation(pt) ;
            let formctrl = new LabelControl(this, this.getUniqueTagName(), new XeroRect(ctrlpt.x, ctrlpt.y, 250, 50)) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified() ;        
        }
    }

    addNewTextCtrl(pt: XeroPoint) {
        if (this.tabbed_ctrl_?.selectedPage) {
            let ctrlpt = this.findCtrlLocation(pt) ;
            let formctrl = new TextControl(this, this.getUniqueTagName(), new XeroRect(ctrlpt.x, ctrlpt.y, 250, 50)) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified() ;  
        }
    }    

    private addNewUpDownCtrl(pt: XeroPoint) {
        if (this.tabbed_ctrl_?.selectedPage) {
            let ctrlpt = this.findCtrlLocation(pt) ;
            let formctrl = new UpDownControl(this, this.getUniqueTagName(), new XeroRect(ctrlpt.x, ctrlpt.y, 250, 50)) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified() ;  
        }
    }  

    private addNewBooleanCtrl(pt: XeroPoint) {
        if (this.tabbed_ctrl_?.selectedPage) {
            let ctrlpt = this.findCtrlLocation(pt) ;
            let formctrl = new BooleanControl(this, this.getUniqueTagName(), new XeroRect(ctrlpt.x, ctrlpt.y, 250, 50)) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified() ;  
        }
    }  

    private addNewMultipleChoiceCtrl(pt: XeroPoint) {
        if (this.tabbed_ctrl_?.selectedPage) {
            let ctrlpt = this.findCtrlLocation(pt) ;
            let formctrl = new MultipleChoiceControl(this, this.getUniqueTagName(), new XeroRect(ctrlpt.x, ctrlpt.y, 180, 180)) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified() ;  
        }
    } 

    private addNewSelectCtrl(pt: XeroPoint) {
        if (this.tabbed_ctrl_?.selectedPage) {
            let ctrlpt = this.findCtrlLocation(pt) ;
            let formctrl = new SelectControl(this, this.getUniqueTagName(), new XeroRect(ctrlpt.x, ctrlpt.y, 250, 50)) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified() ;  
        }
    } 

    private addNewTimerCtrl(pt: XeroPoint) {
        if (this.tabbed_ctrl_?.selectedPage) {
            let ctrlpt = this.findCtrlLocation(pt) ;
            let formctrl = new TimerControl(this, this.getUniqueTagName(), new XeroRect(ctrlpt.x, ctrlpt.y, 250, 50)) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified() ;  
        }
    }     

    private formCallback(args: any) {
        this.initDisplay() ;

        this.form_ = new FormObject(args.form.json) ;
        if (this.form_) {
            if (this.form_.sections.length) {
                this.updateImages() ;
                this.createSectionPages() ;
                this.setCurrentSectionByIndex(0) ;
            }
        }
    }

    private createSectionPages() {
        for(let section of this.form_!.sections) {
            this.createSectionPage(section) ;
        }
    }

    private updateControls(section: IPCSection, page: XeroFormEditSectionPage) {
        page.removeAllControls() ;

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
                    page.addControl(formctrl) ;
                }
            }
        }
    }

    private setCurrentSectionByIndex(sectionIndex: number) : boolean {
        if (!this.form_ || sectionIndex < 0 || sectionIndex >= this.form_.sections.length) {
            return false ;
        }

        this.tabbed_ctrl_!.selectPage(sectionIndex) ;
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

    private createSectionPage(section: IPCSection) : void { 
        if (!this.nameToImageMap_.has(section.image)) {
            this.request('get-image-data', section.image) ; 
        }
        let image = this.nameToImageMap_.get(section.image) ;
        let page = new XeroFormEditSectionPage(image!) ;        // May be undefined
        this.tabbed_ctrl_!.addPage(section.name, page.elem) ;
        this.section_pages_.push(page) ;

        this.updateControls(section, page) ;
    }
   
    private addSection() {
        if (this.form_) {
            let section : IPCSection = this.form_.createNewSection() ;
            this.createSectionPage(section) ;
            if (this.tabbed_ctrl_!.selectedPageNumber === -1) {
                this.tabbed_ctrl_!.selectPage(0) ;
            }
            this.modified() ;
        }
    }

    deleteSection() {
        if (this.tabbed_ctrl_!.selectedPageNumber === -1) {
            return ;
        }

        this.tabbed_ctrl_!.removePage(this.tabbed_ctrl_!.selectedPageNumber) ;

        if (this.form_) {
            this.form_.removeSectionByIndex(this.tabbed_ctrl_!.selectedPageNumber) ;
            this.modified() ;
        }
    }

    private selectBackgroundImage(image: string) {
        if (this.form_) {
            if (this.nameToImageMap_.has(image)) {
                let data = `${this.nameToImageMap_.get(image)}` ;
                this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].setImage(data) ;
                this.modified() ;
            }
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
            let section = this.form_.sections[this.tabbed_ctrl_!.selectedPageNumber] ;
            if (section.image === name) {
                this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].setImage(data) ;
            }
        }        
    }

    private modified() : void {
        if (this.form_) {
            this.request('save-form', { type: this.type_, contents: this.form_.json}) ;
        }
    }

    private initDisplay() {
        this.reset() ;

        this.titlediv_ = document.createElement('div') ;
        this.titlediv_.className = 'xero-form-title' ;
        let tname = this.type_.charAt(0).toUpperCase() + this.type_.slice(1) ;
        this.titlediv_.innerText = tname + ' Form' ;
        this.elem.append(this.titlediv_) ;

        this.tabdiv_ = document.createElement('div') ;
        this.tabdiv_.className = 'xero-form-tab-div' ;
        this.elem.append(this.tabdiv_) ;

        this.tabbed_ctrl_ = new XeroTabbedWidget() ;
        this.tabbed_ctrl_.setParent(this.tabdiv_) ;

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

    private mouseUp(event: MouseEvent) {
        this.controlRelease(event) ;
    }    

    private dialogClosed() {
        this.edit_dialog_ = undefined ;
    }

    private doubleClick(event: MouseEvent) {
        if (!this.edit_dialog_) {
            let ctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findControlByPosition(event.clientX, event.clientY) ;
            if (ctrl) {
                let formctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
                this.dragging_ = 'none' ;
                if (formctrl) {
                    let bounds = this.tabbed_ctrl_?.selectedPage!.getBoundingClientRect() ;
                    let x = event.clientX ;
                    let y = event.clientY ;

                    if (x > bounds!.left + bounds!.width - 600) {
                        x = bounds!.left  + bounds!.width - 600 ;
                    }

                    if (y > bounds!.top + bounds!.height - 400) {
                        y = bounds!.top + bounds!.height - 400 ;
                    }

                    this.unselectCurrent(ctrl) ;
                    this.edit_dialog_ = formctrl.createEditDialog() ;
                    this.edit_dialog_.showRelative(this.elem, x, y) ;
                    this.edit_dialog_.on('closed', this.dialogClosed.bind(this)) ;
                }
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
        if (this.selected_ctrls_.length > 0) {
            for(let ctrl of this.selected_ctrls_) {
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
                if (frmctrl) {
                    let x = parseInt(ctrl.style.left) ;
                    let y = parseInt(ctrl.style.top) ;

                    // Make sure we don't move off the screen
                    if (frmctrl.item.x + dx < 0 || frmctrl.item.y + dy < 0) {
                        return ;
                    }

                    if (frmctrl.item.x + dx + frmctrl.item.width > this.tabbed_ctrl_!.selectedPage!.clientWidth || 
                                frmctrl.item.y + dy + frmctrl.item.height > this.tabbed_ctrl_!.selectedPage!.clientHeight) {
                        return ;
                    }

                    // Offset the control on the screen
                    ctrl.style.left = (x + dx) + 'px' ;
                    ctrl.style.top = (y + dy) + 'px' ;

                    // Offset the control in the form object
                    frmctrl.item.x += dx ;
                    frmctrl.item.y += dy ;
                    this.modified() ;

                    this.displayMiddleBar() ;
                }
            }
        }
    }    

    private pasteSelectedItem() {
        for(let ctrl of this.selected_ctrls_) {
            let top = this.tabbed_ctrl_!.selectedPage!.getBoundingClientRect().top ;
            let curfrmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
            if (curfrmctrl) {
                let tag = this.getUniqueTagName() ;
                let frmctrl = curfrmctrl.clone(tag) ;
                frmctrl.item.x += 80 ;
                frmctrl.item.y += 80 ;
                this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(frmctrl) ;
                this.addItemToCurrentSection(frmctrl.item) ;
                this.unselectCurrent(ctrl) ;
                this.select(frmctrl.ctrl!) ;
                this.modified() ;
            }
        }
    }

    private deleteSelectedItem() {
        if (this.selected_ctrls_.length > 0 && this.form_) {
            for(let ctrl of this.selected_ctrls_) {
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
                if (frmctrl) {
                    let section = this.form_.sections[this.tabbed_ctrl_!.selectedPageNumber] ;
                    let index = section.items.indexOf(frmctrl.item) ;
                    if (index !== -1) {
                        section.items.splice(index, 1) ;
                        this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].removeControl(frmctrl) ;
                        this.elem.removeChild(ctrl) ;
                        this.dragging_ = 'none' ;
                        this.modified() ;
                    }
                }
            }

            this.selected_ctrls_ = [] ;
        }
    }

    private unselectAll() {
        let ctrls = [...this.selected_ctrls_] ;
        for(let ctrl of ctrls) {
            this.unselectCurrent(ctrl) ;
        }
        this.selected_ctrls_ = [] ;
    }

    private unselectCurrent(ctrl: HTMLElement) {
        if (ctrl) {
            ctrl.style.border = 'none' ;
            ctrl.style.margin = '4px' ;
            this.dragging_ = 'none' ;
            let index = this.selected_ctrls_.indexOf(ctrl) ;
            this.selected_ctrls_.splice(index, 1) ;
        }
    }
    
    private updateMouseCursor(x:number, y: number) {
        if (this.section_pages_.length === 0) { 
            return ;
        }

        let ctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findControlByPosition(x, y) ;
        if (ctrl === undefined) {
            this.elem.style.cursor = 'default' ;
            return ;
        }

        if (this.selected_ctrls_.indexOf(ctrl) === -1) {
            this.elem.style.cursor = 'default' ;
            return ;
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

    private displayMiddleBar() {
        if (this.cursor_.x >= 0 && this.cursor_.y >= 0) {
            let str = `Location: ${this.cursor_.x.toFixed(1)}, ${this.cursor_.y.toFixed(1)}` ;
            
            if (this.selected_ctrls_.length === 1) {
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(this.selected_ctrls_[0]) ;
                if (frmctrl) {
                    str += `, Control: ${frmctrl!.item.x},${frmctrl!.item.y} ${frmctrl!.item.width}x${frmctrl!.item.height}` ;
                }
            }
            this.app.statusBar.setMiddleStatus(str) ;
        }
        else {
            this.app.statusBar.setMiddleStatus('') ;
        }
    }

    private selectedItemMouseMove(event: MouseEvent) {
        let dxy = this.cursor_.subtract(this.base_) ;

        for(let index = 0 ; index < this.selected_ctrls_.length ; index++) {
            let ctrl = this.selected_ctrls_[index] ;

            let x = parseInt(ctrl.style.left) ;
            let y = parseInt(ctrl.style.top) ;

            let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
            if (!frmctrl || !frmctrl.item) {
                return ;
            }

            if (this.dragging_ === 'all') {
                // Make sure we don't move off the screen
                if (this.item_[index].x + dxy.x < 0 || this.item_[index].y + dxy.y < 0) {
                    return ;
                }

                if (this.item_[index].x + dxy.x + frmctrl.item.width > this.tabbed_ctrl_!.selectedPage!.clientWidth || this.item_[index].y + dxy.y + frmctrl.item.height > this.tabbed_ctrl_!.selectedPage!.clientHeight) {
                    return ;
                }

                // Update the screen position of the control
                ctrl.style.left = (this.ctrl_[index].x + dxy.x) + 'px' ;
                ctrl.style.top = (this.ctrl_[index].y + dxy.y) + 'px' ;                

                // Update the form object position of the control
                frmctrl.item.x = this.item_[index].x + dxy.x ;
                frmctrl.item.y = this.item_[index].y + dxy.y ;

                // Set the cursor
                this.elem.style.cursor = 'move' ;
                this.modified() ;
            }
            else if (this.dragging_ === 'ulcorner') {
                // Make sure we don't move off the screen
                if (this.item_[index].x + dxy.x < 0 || this.item_[index].y + dxy.y < 0) {
                    return ;
                }

                // Update the screen position of the control
                ctrl.style.left = (this.ctrl_[index].x+ dxy.x) + 'px' ;
                ctrl.style.top = (this.ctrl_[index].y + dxy.y) + 'px' ;
                ctrl.style.width = (this.ctrl_size_[index].width - dxy.x) + 'px' ;
                ctrl.style.height = (this.ctrl_size_[index].height - dxy.y) + 'px' ;

                // Update the form object position of the control
                frmctrl.item.x = this.item_[index].x + dxy.x ;
                frmctrl.item.y = this.item_[index].y + dxy.y ;
                frmctrl.item.width -= dxy.x ;
                frmctrl.item.height -= dxy.y ;

                // Set the cursor
                this.elem.style.cursor = 'nwse-resize' ;
                this.modified() ;            
            }
            else if (this.dragging_ === 'urcorner') {
                // Make sure we don't move off the screen
                if (this.item_[index].y + dxy.y < 0) {
                    return ;
                }

                if (this.item_[index].x + dxy.x + frmctrl.item.width > this.tabbed_ctrl_!.selectedPage!.clientWidth) {
                    return ;
                }

                // Update the screen position of the control
                ctrl.style.top = (this.ctrl_[index].y + dxy.y) + 'px' ;
                ctrl.style.width = (this.ctrl_size_[index].width + dxy.x) + 'px' ;
                ctrl.style.height = (this.ctrl_size_[index].height - dxy.y) + 'px' ;

                // Update the form object position of the control
                frmctrl.item.y = this.item_[index].y + dxy.y ;
                frmctrl.item.width = this.ctrl_size_[index].width + dxy.x ;
                frmctrl.item.height = this.ctrl_size_[index].height - dxy.y ;

                this.elem.style.cursor = 'nesw-resize' ;
                this.modified() ;
            }
            else if (this.dragging_ === 'llcorner') {
                // Make sure we don't move off the screen
                if (this.item_[index].x + dxy.x < 0) {
                    return ;
                }

                if (this.item_[index].y + dxy.y + frmctrl.item.height > this.tabbed_ctrl_!.selectedPage!.clientHeight) {
                    return ;
                }            

                // Update the screen position of the control
                ctrl.style.left = (this.ctrl_[index].x+ dxy.x) + 'px' ;
                ctrl.style.width = (this.ctrl_size_[index].width - dxy.x) + 'px' ;
                ctrl.style.height = (this.ctrl_size_[index].height + dxy.y) + 'px' ;

                // Update the form object position of the control
                frmctrl.item.x = this.item_[index].x + dxy.x ;
                frmctrl.item.width = this.ctrl_size_[index].width - dxy.x ;
                frmctrl.item.height = this.ctrl_size_[index].height + dxy.y ;

                this.elem.style.cursor = 'nesw-resize' ;
                this.modified() ;
            }
            else if (this.dragging_ === 'lrcorner') {
                // Make sure we don't move off the screen
                if (this.item_[index].x + dxy.x + frmctrl.item.width > this.tabbed_ctrl_!.selectedPage!.clientWidth || this.item_[index].y + dxy.y + frmctrl.item.height > this.tabbed_ctrl_!.selectedPage!.clientHeight) {
                    return ;
                }            
                // Update the screen position of the control
                ctrl.style.width = (this.ctrl_size_[index].width + dxy.x) + 'px' ;
                ctrl.style.height = (this.ctrl_size_[index].height + dxy.y) + 'px' ;

                // Update the form object position of the control
                frmctrl.item.width = this.ctrl_size_[index].width + dxy.x ;
                frmctrl.item.height = this.ctrl_size_[index].height + dxy.y ;

                this.elem.style.cursor = 'nwse-resize' ;
                this.modified() ;
            }
            else if (this.dragging_ === 'right') {
                if (this.item_[index].x + dxy.x + frmctrl.item.width > this.tabbed_ctrl_!.selectedPage!.clientWidth) {
                    return ;
                }            
                // Update the screen position of the control
                ctrl.style.width = (this.ctrl_size_[index].width + dxy.x) + 'px' ;

                // Update the form object position of the control
                frmctrl.item.width = this.ctrl_size_[index].width + dxy.x ;

                this.elem.style.cursor = 'ew-resize' ;
                this.modified() ;
            }
            else if (this.dragging_ === 'left') {
                // Make sure we don't move off the screen
                if (this.item_[index].x + dxy.x < 0) {
                    return ;
                }

                // Update the screen position of the control
                ctrl.style.left = (this.ctrl_[index].x+ dxy.x) + 'px' ;
                ctrl.style.width = (this.ctrl_size_[index].width - dxy.x) + 'px' ;

                // Update the form object position of the control
                frmctrl.item.x = this.item_[index].x + dxy.x ;
                frmctrl.item.width = this.ctrl_size_[index].width - dxy.x ;

                this.elem.style.cursor = 'ew-resize' ;
                this.modified() ;
            }
            else if (this.dragging_ === 'top') {
                // Make sure we don't move off the screen
                if (this.item_[index].y + dxy.y < 0) {
                    return ;
                }

                // Update the screen position of the control
                ctrl.style.top = (this.ctrl_[index].y + dxy.y) + 'px' ;
                ctrl.style.height = (this.ctrl_size_[index].height - dxy.y) + 'px' ;
                
                // Update the form object position of the control
                frmctrl.item.y = this.item_[index].y + dxy.y ;
                frmctrl.item.height = this.ctrl_size_[index].height - dxy.y ;
                
                this.elem.style.cursor = 'ns-resize' ;
                this.modified() ;
            }
            else if (this.dragging_ === 'bottom') {
                // Make sure we don't move off the screen
                if (this.item_[index].y + dxy.y + frmctrl.item.height > this.tabbed_ctrl_!.selectedPage!.clientHeight) {
                    return ;
                }

                // Update the screen position of the control
                ctrl.style.height = (this.ctrl_size_[index].height + dxy.y) + 'px' ;

                // Update the form object position of the control
                frmctrl.item.height = this.ctrl_size_[index].height + dxy.y ;

                this.elem.style.cursor = 'ns-resize' ;
                this.modified() ;
            }
            else {
                if (!this.edit_dialog_ && !this.popup_menu_) {
                    this.updateMouseCursor(event.pageX, event.pageY) ;
                }
            }
        }
    }

    private pageToForm(x: number, y: number) : XeroPoint {
        let bounds = this.tabbed_ctrl_!.selectedPage!.getBoundingClientRect() ;
        let pt = new XeroPoint(x - bounds.left, y - bounds.top) ;
        return pt ;
    }   

    private mouseMove(event: MouseEvent) {
        let bounds = this.tabbed_ctrl_!.elem.getBoundingClientRect() ;
        this.cursor_ = this.pageToForm(event.pageX, event.pageY) ;

        let ctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findControlByPosition(event.clientX, event.clientY) ;
        if (ctrl && this.selected_ctrls_.indexOf(ctrl) === -1) {
            //
            // We are moving over a control, but it is not selected, so highlight it
            //
            this.highlight(ctrl) ;
        }
        else {
            this.unhighlight() ;
        }

        this.displayMiddleBar() ;

        if (!document.hasFocus() || this.edit_dialog_ !== undefined || this.popup_menu_ !== undefined) {
            return ;
        }

        if (this.selected_ctrls_.length === 0) {
            this.updateMouseCursor(event.pageX, event.pageY) ;
        }
        else {
            this.selectedItemMouseMove(event) ;
        }
    }

    private isRightEdge(x: number, y: number, ctrl: HTMLElement) {
        let rect = ctrl.getBoundingClientRect() ;
        if (x >= rect.right - XeroFormEditSectionPage.fuzzyEdgeSpacing && x <= rect.right + XeroFormEditSectionPage.fuzzyEdgeSpacing && y >= rect.top && y <= rect.bottom) {
            return true ;
        }
        return false ;
    }

    private isLeftEdge(x: number, y: number, ctrl: HTMLElement) {
        let rect = ctrl.getBoundingClientRect() ;
        if (x >= rect.left - XeroFormEditSectionPage.fuzzyEdgeSpacing && x <= rect.left + XeroFormEditSectionPage.fuzzyEdgeSpacing && y >= rect.top && y <= rect.bottom) {
            return true ;
        }
        return false ;
    }

    private isTopEdge(x: number, y: number, ctrl: HTMLElement) {
        let rect = ctrl.getBoundingClientRect() ;
        if (x >= rect.left && x <= rect.right && y >= rect.top - XeroFormEditSectionPage.fuzzyEdgeSpacing && y <= rect.top + XeroFormEditSectionPage.fuzzyEdgeSpacing) {
            return true ;
        }
        return false ;
    }

    private isBottomEdge(x: number, y: number, ctrl: HTMLElement) {
        let rect = ctrl.getBoundingClientRect() ;
        if (x >= rect.left && x <= rect.right && y >= rect.bottom - XeroFormEditSectionPage.fuzzyEdgeSpacing && y <= rect.bottom + XeroFormEditSectionPage.fuzzyEdgeSpacing) {
            return true ;
        }
        return false ;
    }

    private select(ctrl: HTMLElement) {
        if (ctrl === this.highlighted_ctrl_) {
            this.unhighlight() ;
        }
        
        ctrl.style.borderStyle = 'solid' ;
        ctrl.style.borderWidth = '4px' ;
        ctrl.style.borderColor = 'red' ;
        ctrl.style.margin = '0px' ;
        this.selected_ctrls_.push(ctrl) ;
    }

    private unhighlight() {
        if (this.highlighted_ctrl_) {
            this.highlighted_ctrl_.style.border = 'none' ;
            this.highlighted_ctrl_.style.margin = '4px' ;
            this.highlighted_ctrl_ = undefined ;
        }
    }

    private highlight(ctrl: HTMLElement) {
        if (this.highlighted_ctrl_ !== ctrl) {
            this.unhighlight() ;
        }

        ctrl.style.borderStyle = 'dashed' ;
        ctrl.style.borderWidth = '4px' ;
        ctrl.style.borderColor = 'red' ;
        ctrl.style.margin = '0px' ;
        this.highlighted_ctrl_ = ctrl ;
    }

    private mouseDown(event: MouseEvent) {
        if (this.edit_dialog_ || this.popup_menu_ || event.button !== 0) {
            return ;
        }

        let ctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findControlByPosition(event.clientX, event.clientY) ;
        if (ctrl === undefined) {
            //
            // We are clicking in empty space, so unselect any selected controls
            //
            this.unselectAll() ;
            this.elem.style.cursor = 'default' ;
        }
        else if (this.selected_ctrls_.indexOf(ctrl) === -1) {
            //
            // We are clicking on a control, and it is not selected, so select it
            //
            if (!event.shiftKey) {
                this.unselectAll() ;
            }

            this.select(ctrl) ;
        }
        else {
            this.ctrl_ = [] ;
            for(let ctrl of this.selected_ctrls_) {
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
                if (!frmctrl) {
                    continue ;
                }

                let top = this.isTopEdge(event.pageX, event.pageY, ctrl) ;
                let bottom = this.isBottomEdge(event.pageX, event.pageY, ctrl) ;
                let left = this.isLeftEdge(event.pageX, event.pageY, ctrl) ;
                let right = this.isRightEdge(event.pageX, event.pageY, ctrl) ;

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

                let bounds = this.tabbed_ctrl_!.selectedPage!.getBoundingClientRect() ;
                this.base_ = new XeroPoint(event.pageX - bounds.left, event.pageY - bounds.top) ;
                this.ctrl_.push(new XeroPoint(ctrl.offsetLeft, ctrl.offsetTop)) ;
                this.ctrl_size_.push(new XeroSize(ctrl.offsetWidth, ctrl.offsetHeight)) ;
                this.item_.push(new XeroPoint(frmctrl.item.x, frmctrl.item.y)) ;
            }
        }
    }    

    private controlRelease(event: MouseEvent) {
        this.dragging_ = 'none' ;
        this.ctrl_ = [] ;
        this.ctrl_size_ = [] ;
        this.item_ = [] ;
        this.modified() ;
    }   

    private sectionNameDialogDone(changed: boolean) {
        if (changed && this.form_) {
            this.tabbed_ctrl_!.renamePage(this.tabbed_ctrl_!.selectedPageNumber, this.form_.sections[this.tabbed_ctrl_!.selectedPageNumber].name) ;
            this.modified() ;
        }
        this.edit_dialog_ = undefined ;
    }

    private renameSection() {
        if (this.form_) {
            let bounds = this.tabbed_ctrl_!.selectedPage!.getBoundingClientRect() ;
            this.edit_dialog_ = new EditSectionNameDialog(this.form_.sections[this.tabbed_ctrl_!.selectedPageNumber]) ;
            this.edit_dialog_.on('closed', this.sectionNameDialogDone.bind(this)) ;
            this.edit_dialog_.showRelative(this.elem.parentElement!, bounds.left + bounds.width / 4, bounds.top + bounds.height / 4) ;
        }
    }

    private importImage() {
        this.request('import-image') ;
    }

    private menuClosed() {
        this.popup_menu_ = undefined ;
    }

    private moveSection(left: boolean) {
        if (this.form_ && this.tabbed_ctrl_!.selectedPageNumber !== -1) {
            if (left && this.tabbed_ctrl_!.selectedPageNumber === 0) {
                alert('You cannot move the first section left') ;
                return ;
            }
            else if (!left && this.tabbed_ctrl_!.selectedPageNumber === this.form_.sections.length - 1) {
                alert('You cannot move the last section right') ;
                return ;
            }

            if (left) {
                this.tabbed_ctrl_!.movePageLeft(this.tabbed_ctrl_!.selectedPageNumber) ;
                let section = this.form_.sections[this.tabbed_ctrl_!.selectedPageNumber] ;
                this.form_.sections.splice(this.tabbed_ctrl_!.selectedPageNumber, 1) ;
                this.form_.sections.splice(this.tabbed_ctrl_!.selectedPageNumber - 1, 0, section) ;
                this.setCurrentSectionByIndex(this.tabbed_ctrl_!.selectedPageNumber - 1) ;
            }
            else {
                this.tabbed_ctrl_!.movePageRight(this.tabbed_ctrl_!.selectedPageNumber) ;
                let section = this.form_.sections[this.tabbed_ctrl_!.selectedPageNumber] ;
                this.form_.sections.splice(this.tabbed_ctrl_!.selectedPageNumber, 1) ;
                this.form_.sections.splice(this.tabbed_ctrl_!.selectedPageNumber + 1, 0, section) ;
                this.setCurrentSectionByIndex(this.tabbed_ctrl_!.selectedPageNumber + 1) ;
            }
            this.modified() ;
        }
    }

    private contextMenu(event: MouseEvent) {
        event.preventDefault() ;

        if (this.popup_menu_) {
            this.popup_menu_.closeMenu() ;
            this.popup_menu_ = undefined ;
        }

        if (event.target && event.target instanceof HTMLElement) {
            if (!this.section_menu_) {
                let sectionItems = [
                    new PopupMenuItem('Add', this.addSection.bind(this)),
                    new PopupMenuItem('Delete', this.deleteSection.bind(this)),
                    new PopupMenuItem('Rename', this.renameSection.bind(this)),
                    new PopupMenuItem('Move Left', this.moveSection.bind(this, true)),
                    new PopupMenuItem('Move Right', this.moveSection.bind(this, false)),                
                ]
                this.section_menu_ = new XeroPopupMenu('section', sectionItems) ;
            }

            if (!this.align_menu_) {
                let items = [
                    new PopupMenuItem('Align Top', this.alignTop.bind(this)),
                    new PopupMenuItem('Align Left', this.alignLeft.bind(this)),
                    new PopupMenuItem('Align Right', this.alignRight.bind(this)),
                    new PopupMenuItem('Align Bottom', this.alignBottom.bind(this)),
                    new PopupMenuItem('Align Vertical Center', this.alignCenter.bind(this)),
                    new PopupMenuItem('Align Horizontal Center', this.alignMiddle.bind(this)),
                ]
                this.align_menu_ = new XeroPopupMenu('controls', items) ;
            }

            if (!this.size_menu_) {
                let items = [
                    new PopupMenuItem('Same Width', this.sameWidth.bind(this)),
                    new PopupMenuItem('Same Height', this.sameHeight.bind(this)),
                    new PopupMenuItem('Same Size', this.sameSize.bind(this)),
                ]
                this.size_menu_ = new XeroPopupMenu('controls', items) ;
            }            

            let items = [
                new PopupMenuItem('Sections', undefined, this.section_menu_),
                new PopupMenuItem('Controls', undefined, this.ctrl_menu_),
                new PopupMenuItem('Align', undefined, this.align_menu_),
                new PopupMenuItem('Size', undefined, this.size_menu_),
                new PopupMenuItem('Import Image', this.importImage.bind(this)),
                new PopupMenuItem('Background Image', undefined, this.image_menu_),
            ]

            this.popup_menu_ = new XeroPopupMenu('main', items) ;
            this.popup_menu_.on('menu-closed', this.menuClosed.bind(this)) ;
            this.popup_menu_.showRelative(this.elem, new XeroPoint(event.clientX, event.clientY)) ;
        }
    }
    
    private alignTop() {
        if (this.selected_ctrls_.length > 1) {
            let top = this.selected_ctrls_[0].offsetTop ;
            for(let ctrl of this.selected_ctrls_) {
                ctrl.style.top = top + 'px' ;
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
                if (frmctrl) {
                    frmctrl.item.y = top ;
                }
            }
            this.modified() ;
        }
    }

    private alignLeft() {
        if (this.selected_ctrls_.length > 1) {
            let left = this.selected_ctrls_[0].offsetLeft ;
            for(let ctrl of this.selected_ctrls_) {
                ctrl.style.left = left + 'px' ;
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
                if (frmctrl) {
                    frmctrl.item.x = left ;
                }
            }
            this.modified() ;
        }
    }

    private alignRight() {
        if (this.selected_ctrls_.length > 1) {
            let right = this.selected_ctrls_[0].offsetLeft + this.selected_ctrls_[0].offsetWidth ;
            for(let ctrl of this.selected_ctrls_) {
                ctrl.style.left = (right - ctrl.offsetWidth) + 'px' ;
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
                if (frmctrl) {
                    frmctrl.item.x = right - frmctrl.item.width ;
                }
            }
            this.modified() ;
        }
    }

    private alignBottom() {
        if (this.selected_ctrls_.length > 1) {
            let bottom = this.selected_ctrls_[0].offsetTop + this.selected_ctrls_[0].offsetHeight ;
            for(let ctrl of this.selected_ctrls_) {
                ctrl.style.top = (bottom - ctrl.offsetHeight) + 'px' ;
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
                if (frmctrl) {
                    frmctrl.item.y = bottom - frmctrl.item.height ;
                }
            }
            this.modified() ;
        }
    }

    private alignCenter() {
        if (this.selected_ctrls_.length > 1) {
            let center = this.selected_ctrls_[0].offsetTop + this.selected_ctrls_[0].offsetHeight / 2 ;
            for(let ctrl of this.selected_ctrls_) {
                ctrl.style.top = (center - ctrl.offsetHeight / 2) + 'px' ;
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
                if (frmctrl) {
                    frmctrl.item.y = center - frmctrl.item.height / 2 ;
                }
            }
            this.modified() ;
        }
    }

    private alignMiddle() {
        if (this.selected_ctrls_.length > 1) {
            let middle = this.selected_ctrls_[0].offsetLeft + this.selected_ctrls_[0].offsetWidth / 2 ;
            for(let ctrl of this.selected_ctrls_) {
                ctrl.style.left = (middle - ctrl.offsetWidth / 2) + 'px' ;
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
                if (frmctrl) {
                    frmctrl.item.x = middle - frmctrl.item.width / 2 ;
                }
            }
            this.modified() ;
        }
    }

    private sameWidth() {
        if (this.selected_ctrls_.length > 1) {
            let width = this.selected_ctrls_[0].offsetWidth ;
            for(let ctrl of this.selected_ctrls_) {
                ctrl.style.width = width + 'px' ;
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
                if (frmctrl) {
                    frmctrl.item.width = width ;
                }
            }
            this.modified() ;
        }
    }

    private sameHeight() {
        if (this.selected_ctrls_.length > 1) {
            let height = this.selected_ctrls_[0].offsetHeight ;
            for(let ctrl of this.selected_ctrls_) {
                ctrl.style.height = height + 'px' ;
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
                if (frmctrl) {
                    frmctrl.item.height = height ;
                }
            }
            this.modified() ;
        }
    }

    private sameSize() {
        this.sameHeight() ;
        this.sameWidth() ;
    }
}