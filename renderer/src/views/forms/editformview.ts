import {  XeroApp  } from "../../apps/xeroapp.js";
import {  XeroPoint, XeroRect, XeroSize  } from "../../widgets/xerogeom.js";
import {  XeroPopupMenu, XeroPopupMenuItem as PopupMenuItem  } from "../../widgets/xeropopupmenu.js";
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
import { BoxControl } from "./controls/boxctrl.js";
import { FormControl } from "./controls/formctrl.js";
import { XeroWidget } from "../../widgets/xerowidget.js";

type DragState = 'none' | 'ulcorner' | 'lrcorner' | 'urcorner' | 'llcorner' | 'right' | 'left' | 'top' | 'bottom' | 'move' | 'all' | 'area-select';

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
    private area_select_div? : HTMLElement ;
    private area_select_start_? : XeroPoint ;

    private dragging_ : DragState = 'none' ;    
    private edit_dialog_? : XeroDialog ;

    private type_: string ;
    private nameToImageMap_: Map<string, string> ;
    private ctrl_menu_ : XeroPopupMenu ;
    private form_? : FormObject ;
    private selected_ctrls_ : HTMLElement[] = [] ;
    private highlighted_ctrl_? : HTMLElement ;
    private image_names_ : string[] = [] ;

    private middle_text_ : string = '' ;

    private section_menu_? : XeroPopupMenu ;
    private sel_image_menu_? : XeroPopupMenu ;
    private popup_menu_? : XeroPopupMenu ;
    private align_menu_? : XeroPopupMenu ;  
    private size_menu_? : XeroPopupMenu ;  
    private image_menu_? : XeroPopupMenu ;
 
    private changing_ : FormControl[] = [] ;
    private base_ : XeroPoint = new XeroPoint(0, 0) ;
    private cursor_ : XeroPoint = new XeroPoint(0, 0) ;
    private context_menu_cursor_: XeroPoint = new XeroPoint(0, 0) ;

    private requested_images_ : string[] = [] ;

    private ctxbind_? : (e: MouseEvent) => void ;
    private dblclkbind_? : (e: MouseEvent) => void ;
    private keydownbind_? : (e: KeyboardEvent) => void ;
    private mouseupbind_? : (e: MouseEvent) => void ;
    private mousemovebind_? : (e: MouseEvent) => void ;
    private mouusedownbind_? : (e: MouseEvent) => void ;
    private cut_bind_? : (e: ClipboardEvent) => void ;
    private copy_bind_? : (e: ClipboardEvent) => void ;
    private paste_bind_? : (e: ClipboardEvent) => void ;
    private focusbind_? : (e: FocusEvent) => void ;
    private blurbind_? : (e: FocusEvent) => void ;

    constructor(app: XeroApp, type: any) {
        super(app, 'xero-form-view') ;

        this.type_ = type ;
        this.registerCallback('send-form', this.receivedForm.bind(this));
        this.registerCallback('send-images', this.receivedImageNames.bind(this)) ;
        this.registerCallback('send-image-data', this.receiveImageData.bind(this)) ;

        this.request('get-images') ;
        this.request('get-form', this.type_);

        this.nameToImageMap_ = new Map() ;

        let ctrlitems = [
            new PopupMenuItem('Label', this.addNewLabelCtrl.bind(this)),
            new PopupMenuItem('Box', this.addNewBoxCtrl.bind(this)),
            new PopupMenuItem('Text Field', this.addNewTextCtrl.bind(this)),
            new PopupMenuItem('Up/Down Field', this.addNewUpDownCtrl.bind(this)),
            new PopupMenuItem('Boolean Field', this.addNewBooleanCtrl.bind(this)),
            new PopupMenuItem('Multiple Choice', this.addNewMultipleChoiceCtrl.bind(this)),
            new PopupMenuItem('Select', this.addNewSelectCtrl.bind(this)),
            new PopupMenuItem('Timer', this.addNewTimerCtrl.bind(this)),
        ]

        this.ctrl_menu_ = new XeroPopupMenu('controls', ctrlitems) ;
    }

    close() {
        document.removeEventListener('contextmenu', this.ctxbind_!) ;
    	document.removeEventListener('dblclick', this.dblclkbind_!);
    	document.removeEventListener('keydown', this.keydownbind_!);
    	document.removeEventListener('mouseup', this.mouseupbind_!);
    	document.removeEventListener('mousemove', this.mousemovebind_!);
    	document.removeEventListener('mousedown', this.mouusedownbind_!);
    	document.removeEventListener('cut', this.cut_bind_!);
    	document.removeEventListener('copy', this.copy_bind_!);
    	document.removeEventListener('paste', this.paste_bind_!);

        window.removeEventListener('focus', this.focusbind_!);
    	window.removeEventListener('blur', this.blurbind_!);
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

    private addNewLabelCtrl() {
        if (this.tabbed_ctrl_?.selectedPage) {

            let formctrl = new LabelControl(this, this.getUniqueTagName(), XeroRect.fromPointSize(this.context_menu_cursor_, new XeroSize(250, 50))) ;
            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified() ;        
        }
        else {
            alert('You cannot create a label control without a section. Use the "Section" menu to add a section first.') ;
        }
    }

    private addNewBoxCtrl() {
        if (this.tabbed_ctrl_?.selectedPage) {
            let formctrl = new BoxControl(this, this.getUniqueTagName(), XeroRect.fromPointSize(this.context_menu_cursor_, new XeroSize(250, 50))) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified() ;  
        }
        else {
            alert('You cannot create a box control without a section. Use the "Section" menu to add a section first.') ;
        }        
    }

    addNewTextCtrl() {
        if (this.tabbed_ctrl_?.selectedPage) {
            let formctrl = new TextControl(this, this.getUniqueTagName(), XeroRect.fromPointSize(this.context_menu_cursor_, new XeroSize(250, 50))) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified() ;  
        }
        else {
            alert('You cannot create a text control without a section. Use the "Section" menu to add a section first.') ;
        }        
    }    

    private addNewUpDownCtrl() {
        if (this.tabbed_ctrl_?.selectedPage) {
            let formctrl = new UpDownControl(this, this.getUniqueTagName(), XeroRect.fromPointSize(this.context_menu_cursor_, new XeroSize(250, 50))) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified() ;  
        }
        else {
            alert('You cannot create a up/down control without a section. Use the "Section" menu to add a section first.') ;
        }        
    }  

    private addNewBooleanCtrl() {
        if (this.tabbed_ctrl_?.selectedPage) {
            let formctrl = new BooleanControl(this, this.getUniqueTagName(), XeroRect.fromPointSize(this.context_menu_cursor_, new XeroSize(250, 50))) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified() ;  
        }
        else {
            alert('You cannot create a boolean control without a section. Use the "Section" menu to add a section first.') ;
        }        
    }  

    private addNewMultipleChoiceCtrl() {
        if (this.tabbed_ctrl_?.selectedPage) {
            let formctrl = new MultipleChoiceControl(this, this.getUniqueTagName(), XeroRect.fromPointSize(this.context_menu_cursor_, new XeroSize(250, 50))) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified() ;  
        }
        else {
            alert('You cannot create a choice control without a section. Use the "Section" menu to add a section first.') ;
        }        
    } 

    private addNewSelectCtrl() {
        if (this.tabbed_ctrl_?.selectedPage) {
            let formctrl = new SelectControl(this, this.getUniqueTagName(), XeroRect.fromPointSize(this.context_menu_cursor_, new XeroSize(250, 50))) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified() ;  
        }
        else {
            alert('You cannot create a select control without a section. Use the "Section" menu to add a section first.') ;
        }        
    } 

    private addNewTimerCtrl() {
        if (this.tabbed_ctrl_?.selectedPage) {
            let formctrl = new TimerControl(this, this.getUniqueTagName(), XeroRect.fromPointSize(this.context_menu_cursor_, new XeroSize(250, 50))) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified() ;  
        }
        else {
            alert('You cannot create a timer control without a section. Use the "Section" menu to add a section first.') ;
        }        
    }     

    private receivedForm(args: any) {
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

    private createControlFromItem(item: IPCFormItem, page: XeroFormEditSectionPage) : FormControl {
        let formctrl : FormControl | undefined ;

        if (item.type === 'label') {
            formctrl = new LabelControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
            formctrl.update(item) ;
        }
        else if (item.type === 'box') {
            formctrl = new BoxControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
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

        return formctrl! ;
    }

    private updateControls(section: IPCSection, page: XeroFormEditSectionPage) {
        page.removeAllControls() ;

        if (section.items) {
            for(let item of section.items) {
                this.createControlFromItem(item, page) ;
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

    private requestImage(imgname: string) {
        if (!this.requested_images_.includes(imgname)) {
            this.request('get-image-data', imgname) ;
            this.requested_images_.push(imgname) ;
        }   
    }

    private updateImages() {
        if (this.form_) {
            this.form_.resetImages() ;
            for(let image of this.form_.images) {
                this.requestImage(image) ;
            }
        }  
    }

    private createSectionPage(section: IPCSection) : void { 
        if (!this.nameToImageMap_.has(section.image)) {
                this.requestImage(section.image) ;
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

    private setBackgroundImage(image: string) {
        if (this.tabbed_ctrl_!.selectedPageNumber === -1) {
            alert('You cannot set the background image without a section. Use the "Section" menu to add a section first.') ;
            return ;
        }

        if (this.form_) {
            this.form_.sections[this.tabbed_ctrl_!.selectedPageNumber].image = image ;
            if (this.nameToImageMap_.has(image)) {
                let data = `${this.nameToImageMap_.get(image)}` ;
                this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].setImage(data) ;
            }
            else {
                this.requestImage(image) ;
            }
            this.modified() ;            
        }
    }    

    private receivedImageNames(args: any) {
        this.image_names_ = args ;

        let items = [] ;
        for(let im of this.image_names_) {
            let item = new PopupMenuItem(im, this.setBackgroundImage.bind(this, im)) ;
            items.push(item) ;
        }
        this.sel_image_menu_ = new XeroPopupMenu('images', items) ;    
        items = [
            new PopupMenuItem('Import Image', this.importImage.bind(this)),
            new PopupMenuItem('Select Background Image', undefined, this.sel_image_menu_),
        ]
        this.image_menu_ = new XeroPopupMenu('image', items) ;    
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

        this.tabbed_ctrl_ = new XeroTabbedWidget({
            fontFamily: 'Arial',
            fontSize: 28,
            fontWeight: 'bold',
            fontColor: 'black'
        }) ;
        this.tabbed_ctrl_.on('tabButtonDoubleClicked', this.renameSection.bind(this)) ;
        this.tabbed_ctrl_.on('afterSelectPage', this.sectionChanged.bind(this)) ;
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

        this.cut_bind_ = this.cutSelectedItems.bind(this) ;
        document.addEventListener('cut', this.cut_bind_) ;

        this.copy_bind_ = this.copySelectedItems.bind(this) ;
        document.addEventListener('copy', this.copy_bind_) ;

        this.paste_bind_ = this.pasteSelectedItem.bind(this) ;
        document.addEventListener('paste', this.paste_bind_) ;

        this.focusbind_ = this.focus.bind(this) ;
        window.addEventListener('focus', this.focusbind_) ;

        this.blurbind_ = this.blur.bind(this) ;
        window.addEventListener('blur', this.blurbind_) ;
    }

    private focus(ev: FocusEvent) : void {
        this.area_select_start_ = undefined ;
        this.dragging_ = 'none' ;
    }

    private blur(ev: FocusEvent) : void {
        if (this.dragging_ === 'area-select') {
            this.stopAreaSelect() ;
        }
        this.dragging_ = 'none' ;
    }

    private sectionChanged() {
        if (this.tabbed_ctrl_!.selectedPageNumber !== -1) {
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].doLayout() ;
        }
    }

    private cutSelectedItems(ev: ClipboardEvent) {
        ev.preventDefault() ;
        this.copySelectedItems(ev) ;
        this.deleteSelectedItems() ;
    }

    private copySelectedItems(ev: ClipboardEvent) {
        ev.preventDefault() ;
        let json : any[] = [] ;

        for(let ctrl of this.selected_ctrls_) {
            let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
            if (frmctrl) {
                json.push(frmctrl.item) ;
            }
        }

        let str = JSON.stringify(json) ;
        navigator.clipboard.writeText(str) ;
    }

    private async pasteSelectedItem(ev: ClipboardEvent) {
        ev.preventDefault() ;

        if (!this.tabbed_ctrl_ || this.tabbed_ctrl_!.selectedPageNumber === -1) {
            return ;
        }

        let data = await navigator.clipboard.readText() ;
        if (data) {
            let json = JSON.parse(data) ;
            let page = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber] ;
            for(let item of json) {
                item.x += 20 ;
                item.y += 20 ;
                let frmctrl = this.createControlFromItem(item, page) ;
                if (frmctrl) {
                    this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(frmctrl) ;
                    this.addItemToCurrentSection(frmctrl.item) ;
                    this.modified() ;
                }
            }
        }
    }    

    private mouseUp(event: MouseEvent) {
        if (this.dragging_ === 'area-select' && this.area_select_start_) {
            this.selectInBox(this.area_select_start_, this.cursor_, event.shiftKey) ;
            this.stopAreaSelect() ;
            this.dragging_ = 'none' ;
        }
        else {
            this.controlRelease(event) ;
        }
    }    

    private dialogClosed() {
        this.edit_dialog_ = undefined ;
    }

    private doubleClick(event: MouseEvent) {
        if (!this.edit_dialog_) {
            let ctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findControlByPosition(this.cursor_) ;;
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
            if (event.key === 'Delete') {
                this.deleteSelectedItems() ;
            }
            else if (event.key === 'Escape') {
                this.unselectAll() ;
                if (this.dragging_ === 'area-select') {
                    this.stopAreaSelect() ;
                }
                this.dragging_ = 'none' ;
            }
            else if (event.key === 'a' && event.ctrlKey) {
                this.selectAll() ;
                event.preventDefault() ;
                event.stopPropagation() ;
            }
            else if (event.key === 'ArrowRight') {
                if (event.ctrlKey) {
                    this.moveSelectedItems(XeroEditFormView.ctrlMoveControlAmount, 0) ;
                }
                else if (event.shiftKey) {
                    this.moveSelectedItems(XeroEditFormView.shiftMoveControlAmount, 0) ;                    
                }
                else {
                    this.moveSelectedItems(XeroEditFormView.moveControlAmount, 0) ;
                }
            }
            else if (event.key === 'ArrowLeft') {
                if (event.ctrlKey) {
                    this.moveSelectedItems(-XeroEditFormView.ctrlMoveControlAmount, 0) ;
                }
                else if (event.shiftKey) {
                    this.moveSelectedItems(-XeroEditFormView.shiftMoveControlAmount, 0) ;
                }
                else {
                    this.moveSelectedItems(-XeroEditFormView.moveControlAmount, 0) ;
                }
            }
            else if (event.key === 'ArrowUp') {
                if (event.ctrlKey) {
                    this.moveSelectedItems(0, -XeroEditFormView.ctrlMoveControlAmount) ;
                }
                else if (event.shiftKey) {
                    this.moveSelectedItems(0, -XeroEditFormView.shiftMoveControlAmount) ;
                }
                else {
                    this.moveSelectedItems(0, -XeroEditFormView.moveControlAmount) ;
                }
            }
            else if (event.key === 'ArrowDown') {
                if (event.ctrlKey) {
                    this.moveSelectedItems(0, XeroEditFormView.ctrlMoveControlAmount) ;
                }
                else if (event.shiftKey) {
                    this.moveSelectedItems(0, XeroEditFormView.shiftMoveControlAmount) ;
                }
                else {
                    this.moveSelectedItems(0, XeroEditFormView.moveControlAmount) ;
                }
            }
        }
    }

    private testMoveItem(frmctrl: FormControl, dx: number, dy: number, dw: number, dh: number) : boolean {
        if (frmctrl) {

            console.log(`testMoveItem: ${frmctrl.item.tag} bounds ${frmctrl.origionalBounds} dx: ${dx} dy: ${dy} dw: ${dw} dh: ${dh}`) ;
            
            // Make sure we don't move off the screen
            if (frmctrl.origionalBounds.x + dx  < 0 || frmctrl.origionalBounds.y + dy < 0) {
                return false ;
            }

            if (frmctrl.origionalBounds.x + dx + frmctrl.origionalBounds.width + dw > this.tabbed_ctrl_!.selectedPage!.clientWidth || 
                        frmctrl.origionalBounds.y + dy + frmctrl.origionalBounds.height + dh > this.tabbed_ctrl_!.selectedPage!.clientHeight) {
                return false; 
            }
        }

        return true ;
    }

    private testMoveSelectedItems(dx: number, dy: number, dw: number, dh: number) : boolean {
        for(let ctrl of this.selected_ctrls_) {
            let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
            if (frmctrl && !this.testMoveItem(frmctrl, dx, dy, dw, dh)) {
                return false ;
            }
        }
        return true ;
    }

    private moveSelectedItems(dx: number, dy: number) {
        if (this.selected_ctrls_.length > 0) {
            if (!this.testMoveSelectedItems(dx, dy, 0, 0)) {
                return ;
            }

            for(let ctrl of this.selected_ctrls_) {
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
                if (frmctrl) {
                    let x = parseInt(ctrl.style.left) ;
                    let y = parseInt(ctrl.style.top) ;

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

    private deleteSelectedItems() {
        if (this.selected_ctrls_.length > 0 && this.form_) {
            for(let ctrl of this.selected_ctrls_) {
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
                if (frmctrl) {
                    let section = this.form_.sections[this.tabbed_ctrl_!.selectedPageNumber] ;
                    let index = section.items.indexOf(frmctrl.item) ;
                    if (index !== -1) {
                        section.items.splice(index, 1) ;
                        this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].removeControl(frmctrl) ;
                        this.dragging_ = 'none' ;
                        this.modified() ;
                    }
                }
            }

            this.selected_ctrls_ = [] ;
        }
    }
    
    private selectAll() {
        if (this.tabbed_ctrl_!.selectedPageNumber !== -1) {
            let ctrls = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].controls
            for(let ctrl of ctrls) {
                this.select(ctrl.ctrl!) ;
            }
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
    
    private mouseMoveControlsSelected() {
        let ctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findControlByPosition(this.cursor_) ;
        if (ctrl === undefined) {
            this.elem.style.cursor = 'default' ;
            return ;
        }

        let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
        if (frmctrl === undefined) {
            this.elem.style.cursor = 'default' ;
            return ;
        }

        let top = frmctrl.isTopEdge(this.cursor_) ;;
        let bottom = frmctrl.isBottomEdge(this.cursor_) ;
        let left = frmctrl.isLeftEdge(this.cursor_) ;
        let right = frmctrl.isRightEdge(this.cursor_) ;

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

    private setMiddleStatusBarText(text: string) {
        if (this.middle_text_ !== text) {
            this.middle_text_ = text ;
            if (this.app.statusBar) {
                this.app.statusBar.setMiddleStatus(text) ;
            }
        }
    }

    private displayMiddleBar() {
        if (this.cursor_.x >= 0 && this.cursor_.y >= 0) {
            let str = `Location: ${this.cursor_.x.toFixed(1)}, ${this.cursor_.y.toFixed(1)}` ;
            
            if (this.selected_ctrls_.length === 1) {
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(this.selected_ctrls_[0]) ;
                if (frmctrl) {
                    str += `, Control: ${frmctrl!.item.x.toFixed(1)},${frmctrl!.item.y.toFixed(1)} ${frmctrl!.item.width.toFixed(1)}x${frmctrl!.item.height.toFixed(1)}` ;
                }
            }
            this.setMiddleStatusBarText(str) ;
        }
        else {
            this.setMiddleStatusBarText('Right Click For Menu') ;
        }
    }

    private dragTypeToDeltas(dxy: XeroPoint) : [number, number, number, number] {
        let dx = 0, dy = 0, dw = 0, dh = 0 ;

        if (this.dragging_ === 'all') {
            dx = dxy.x ;
            dy = dxy.y ;
        }
        else if (this.dragging_ === 'ulcorner') {
            dx = dxy.x ;
            dy = dxy.y ;
            dw = -dxy.x ;
            dh = -dxy.y ;
        }
        else if (this.dragging_ === 'urcorner') {
            dx = dxy.x ;
            dy = dxy.y ;
            dw = dxy.x ;
            dh = -dxy.y ;
        }
        else if (this.dragging_ === 'llcorner') {
            dx = dxy.x ;
            dy = dxy.y ;
            dw = -dxy.x ;
            dh = dxy.y ;
        }
        else if (this.dragging_ === 'lrcorner') {
            dx = dxy.x ;
            dy = dxy.y ;
            dw = dxy.x ;
            dh = dxy.y ;
        }
        else if (this.dragging_ === 'right') {
            dx = 0;
            dy = 0 ;
            dw = dxy.x ;
            dh = 0 ;
        }
        else if (this.dragging_ === 'left') {
            dx = dxy.x ;
            dy = 0 ;
            dw = -dxy.x ;
            dh = 0 ;
        }
        else if (this.dragging_ === 'top') {
            dx = 0 ;
            dy = dxy.y ;
            dw = 0 ;
            dh = -dxy.y ;
        }
        else if (this.dragging_ === 'bottom') {
            dx = 0 ;
            dy = 0 ;
            dw = 0 ;
            dh = dxy.y ;
        }

        return [dx, dy, dw, dh] ;
    }

    private testMoveResize(deltas: [number, number, number, number]) : boolean {
        let [dx, dy, dw, dh] = deltas ;
        for(let ctrl of this.selected_ctrls_) {
            let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
            if (!frmctrl || !frmctrl.item) {
                return false ;
            }

            if (!this.testMoveItem(frmctrl, dx, dy, dw, dh)) {
                return false ;
            }
        }

        return true ;
    }

    private dragToCursorStyle() {
        if (this.dragging_ === 'all') {
            this.elem.style.cursor = 'move' ;
        }
        else if (this.dragging_ === 'ulcorner') {
            this.elem.style.cursor = 'nwse-resize' ;
        }
        else if (this.dragging_ === 'urcorner') {
            this.elem.style.cursor = 'nesw-resize' ;
        }
        else if (this.dragging_ === 'llcorner') {
            this.elem.style.cursor = 'nesw-resize' ;
        }
        else if (this.dragging_ === 'lrcorner') {
            this.elem.style.cursor = 'nwse-resize' ;
        }
        else if (this.dragging_ === 'right') {
            this.elem.style.cursor = 'ew-resize' ;
        }
        else if (this.dragging_ === 'left') {
            this.elem.style.cursor = 'ew-resize' ;
        }
        else if (this.dragging_ === 'top') {
            this.elem.style.cursor = 'ns-resize' ;
        }
        else if (this.dragging_ === 'bottom') {
            this.elem.style.cursor = 'ns-resize' ;
        }
    }

    private draggingResizingControls(event: MouseEvent) {
        let dxy = this.cursor_.subtract(this.base_) ;
        let ret = this.dragTypeToDeltas(dxy) ;
        if (!ret) {
            return ;
        }

        if (!this.testMoveResize(ret)) {
            // We are trying to resize/move the control off the screen
            console.log('Cannot move/resize off screen') ;
            return ;
        }

        let [dx, dy, dw, dh] = ret ;
        for(let frmctrl of this.changing_) {
            frmctrl.item.x = frmctrl.origionalBounds.x + dx ;
            frmctrl.item.y = frmctrl.origionalBounds.y + dy ;
            frmctrl.item.width = frmctrl.origionalBounds.width + dw ;
            frmctrl.item.height = frmctrl.origionalBounds.height + dh ;
            frmctrl.positionUpdated() 
            
            this.dragToCursorStyle() ;
            this.modified() ;            
        }
    }

    private pageToForm(x: number, y: number) : XeroPoint {
        let bounds = this.tabbed_ctrl_!.selectedPage!.getBoundingClientRect() ;
        let pt = new XeroPoint(x - bounds.left, y - bounds.top) ;
        return pt ;
    }   

    private mouseMove(event: MouseEvent) {

        if (this.tabbed_ctrl_?.selectedPageNumber === -1) {
            //
            // There are no sections, so we cannot do anything
            // Tell the user to right click for a menu and return
            //
            this.setMiddleStatusBarText('Right Click For Menu') ;            
            return ;
        }

        if (!document.hasFocus() || this.edit_dialog_ !== undefined || this.popup_menu_ !== undefined) {
            return ;
        }        

        //
        // Set the cursor position to form coordinates (0, 0) is the top left
        // of the form.
        //
        this.cursor_ = this.pageToForm(event.pageX, event.pageY) ;

        //
        // Find any control under the cursor 
        //
        let ctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findControlByPosition(this.cursor_) ;
        this.displayMiddleBar() ;

        if (this.dragging_ === 'area-select') {
            //
            // We are dragging the area select box, so update the size of the
            // box
            //
            this.placeAreaSelectDiv(this.cursor_) ;
        }
        else if (this.selected_ctrls_.length === 0) {
            //
            // No, selected controls and not doing an area drag, so just set the default 
            // cursor.
            //
            // Its ok if ctrl is undefined, highlight() handles this correctly
            //
            this.highlight(ctrl) ;
            this.elem.style.cursor = 'default' ;
        }
        else if (this.dragging_ === 'none') {
            //
            // We have selected controls, but we are not dragging them
            //
            this.highlight(ctrl) ;            
            this.mouseMoveControlsSelected() ;
        }
        else {
            //
            // We are moving or resizing the selected controls
            //
            this.draggingResizingControls(event) ;
        }
    }

    private select(ctrl: HTMLElement) {
        if (ctrl === this.highlighted_ctrl_) {
            this.unhighlight() ;
        }

        if (this.selected_ctrls_.indexOf(ctrl) !== -1) {
            return ;
        }

        let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
        if (!frmctrl) {
            return ;
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

    private highlight(ctrl: HTMLElement | undefined) {
        if (this.highlighted_ctrl_ !== ctrl) {
            this.unhighlight() ;
        }

        if(ctrl && this.selected_ctrls_.indexOf(ctrl) === -1) {
            ctrl.style.borderStyle = 'dashed' ;
            ctrl.style.borderWidth = '4px' ;
            ctrl.style.borderColor = 'red' ;
            ctrl.style.margin = '0px' ;
            this.highlighted_ctrl_ = ctrl ;
        }
    }

    private placeAreaSelectDiv(pt: XeroPoint) {
        if (this.area_select_div && this.area_select_start_) {
            let bounds = this.tabbed_ctrl_!.selectedPage!.getBoundingClientRect() ;

            let x = Math.min(this.area_select_start_.x, pt.x) ;
            let y = Math.min(this.area_select_start_.y, pt.y) + bounds.top ;
            let w = Math.abs(pt.x - this.area_select_start_.x) ;
            let h = Math.abs(pt.y - this.area_select_start_.y) ;

            this.area_select_div.style.position = 'absolute' ;            
            this.area_select_div.style.left = x + 'px' ;
            this.area_select_div.style.top = y + 'px' ;
            this.area_select_div.style.width = w + 'px' ;
            this.area_select_div.style.height = h + 'px' ;
        }
    }

    private selectInBox(start: XeroPoint, end: XeroPoint, add: boolean = false) {
        if (this.tabbed_ctrl_!.selectedPageNumber !== -1) {
            let selectArea = XeroRect.fromPoints([start, end]) ;

            for(let ctrl of this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].controls) {
                if (ctrl.ctrl) {
                    if (selectArea.intersects(ctrl.bounds)) {
                        this.select(ctrl.ctrl) ;
                    }
                }
            }
        }
    }


    private stopAreaSelect() {
        if (this.area_select_div) {
            let page = this.tabbed_ctrl_!.selectedPage! ;
            if (page.contains(this.area_select_div)) {
                page.removeChild(this.area_select_div) ;
            }
            else {
                console.log('stopAreaSelect: area_select_div not in page') ;
            }
            this.area_select_div = undefined ;
        }
        this.area_select_start_ = undefined ;
        this.dragging_ = 'none' ;
    }

    private startAreaSelect(st: XeroPoint) {
        if (this.area_select_div) {
            throw new Error('Area select already started') ;
        }

        let page = this.tabbed_ctrl_!.selectedPage! ;
        this.area_select_div = document.createElement('div') ;
        this.area_select_div.className = 'xero-form-area-select' ;
        page.appendChild(this.area_select_div) ;        

        this.area_select_start_ = st.clone() ;
        this.placeAreaSelectDiv(this.area_select_start_) ;

        this.area_select_div.style.border = '2px dashed blue' ;
        this.dragging_ = 'area-select' ;
    }

    private mouseDown(event: MouseEvent) {
        if (this.edit_dialog_ || this.popup_menu_ || event.button !== 0 || this.tabbed_ctrl_!.selectedPageNumber === -1) {
            return ;
        }

        let page = this.tabbed_ctrl_!.selectedPage! ;
        if (!XeroWidget.isChildOf(page, event.target as HTMLElement)) {
            return ;
        }

        let ctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findControlByPosition(this.cursor_) ;
        if (ctrl === undefined) {
            //
            // We are clicking in empty space, so unselect any selected controls
            //
            this.unselectAll() ;
            this.elem.style.cursor = 'default' ;

            if (XeroWidget.isChildOf(this.elem, event.target as HTMLElement)) {
                this.startAreaSelect(this.pageToForm(event.pageX, event.pageY)) ;
            }
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
            this.changing_ = [] ;
            
            for(let ctrl of this.selected_ctrls_) {
                let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findFormControlFromHTMLElement(ctrl) ;
                if (!frmctrl) {
                    continue ;
                }

                let [top, left, bottom, right] = frmctrl.getEdgeFlags(this.cursor_) ;

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

                // Coordinates of the mouse event relative to the form
                this.base_ = new XeroPoint(event.pageX - bounds.left, event.pageY - bounds.top) ;

                // These are the form controls that are being moved or resized
                frmctrl.setOriginalBounds() ;
                this.changing_.push(frmctrl) ;
            }
        }
    }    

    private controlRelease(event: MouseEvent) {
        this.dragging_ = 'none' ;
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
        this.context_menu_cursor_ = this.cursor_.clone() ;

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

            if (!this.image_menu_) {
                let items = [
                    new PopupMenuItem('Import Image', this.importImage.bind(this)),
                    new PopupMenuItem('Select Background Image', undefined, this.sel_image_menu_),
                ]
                this.image_menu_ = new XeroPopupMenu('image', items) ;
            }

            let items = [
                new PopupMenuItem('Sections', undefined, this.section_menu_),
                new PopupMenuItem('Controls', undefined, this.ctrl_menu_),
                new PopupMenuItem('Align', undefined, this.align_menu_),
                new PopupMenuItem('Size', undefined, this.size_menu_),
                new PopupMenuItem('Images', undefined, this.image_menu_),
            ]

            this.popup_menu_ = new XeroPopupMenu('main', items) ;
            this.popup_menu_.on('menu-closed', this.menuClosed.bind(this)) ;
            this.popup_menu_.showRelative(this.elem, new XeroPoint(event.clientX, event.clientY)) ;
        }
    }
    
    private alignTop() {
        if (this.tabbed_ctrl_?.selectedPageNumber === -1) { 
            alert('You cannot align controls when no section is selected.  Please create a section first using the Section menu') ;
            return ;
        }        

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
        else {
            alert('You must select at least 2 controls to align them') ;
        }
    }

    private alignLeft() {
        if (this.tabbed_ctrl_?.selectedPageNumber === -1) { 
            alert('You cannot align controls when no section is selected.  Please create a section first using the Section menu') ;
            return ;
        }  

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
        else {
            alert('You must select at least 2 controls to align them') ;
        }        
    }

    private alignRight() {
        if (this.tabbed_ctrl_?.selectedPageNumber === -1) { 
            alert('You cannot align controls when no section is selected.  Please create a section first using the Section menu') ;
            return ;
        }  

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
        else {
            alert('You must select at least 2 controls to align them') ;
        }        
    }

    private alignBottom() {
        if (this.tabbed_ctrl_?.selectedPageNumber === -1) { 
            alert('You cannot align controls when no section is selected.  Please create a section first using the Section menu') ;
            return ;
        }  

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
        else {
            alert('You must select at least 2 controls to align them') ;
        }        
    }

    private alignCenter() {
        if (this.tabbed_ctrl_?.selectedPageNumber === -1) { 
            alert('You cannot align controls when no section is selected.  Please create a section first using the Section menu') ;
            return ;
        }

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
        else {
            alert('You must select at least 2 controls to align them') ;
        }        
    }

    private alignMiddle() {
        if (this.tabbed_ctrl_?.selectedPageNumber === -1) { 
            alert('You cannot align controls when no section is selected.  Please create a section first using the Section menu') ;
            return ;
        }  

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
        else {
            alert('You must select at least 2 controls to align them') ;
        }        
    }

    private sameWidth() {
        if (this.tabbed_ctrl_?.selectedPageNumber === -1) { 
            alert('You cannot resize controls when no section is selected.  Please create a section first using the Section menu') ;
            return ;
        }  

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
        else {
            alert('You must select at least 2 controls to reisze controls') ;
        }        
    }

    private sameHeight() : boolean {
        if (this.tabbed_ctrl_?.selectedPageNumber === -1) { 
            alert('You cannot resize controls when no section is selected.  Please create a section first using the Section menu') ;
            return false ;
        }  

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
        else {
            alert('You must select at least 2 controls to reisze controls') ;
            return false ;
        }              
        return true ;
    }

    private sameSize() {
        if (!this.sameHeight()) {
            return ;
        }
        this.sameWidth() ;
    }
}