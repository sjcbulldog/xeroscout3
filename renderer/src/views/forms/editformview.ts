import { XeroApp  } from "../../apps/xeroapp.js";
import { XeroPoint, XeroRect, XeroSize  } from "../../widgets/xerogeom.js";
import { XeroPopupMenu, XeroPopupMenuItem as PopupMenuItem  } from "../../widgets/xeropopupmenu.js";
import { XeroView  } from "../xeroview.js";
import { LabelControl  } from "./controls/labelctrl.js";
import { TextControl  } from "./controls/textctrl.js";
import { XeroDialog  } from "../../widgets/xerodialog.js";
import { EditSectionNameDialog  } from "./dialogs/editsectionnamedialog.js";
import { FormObject  } from "./formobj.js";
import { UpDownControl  } from "./controls/updownctrl.js";
import { BooleanControl  } from "./controls/booleanctrl.js";
import { MultipleChoiceControl  } from "./controls/choicectrl.js";
import { SelectControl  } from "./controls/selectctrl.js";
import { TimerControl  } from "./controls/timerctrl.js";
import { XeroLogger  } from "../../utils/xerologger.js";
import { IPCForm, IPCFormItem, IPCSection  } from "../../ipc.js";
import { XeroTabbedWidget } from "../../widgets/xerotabbedwidget.js";
import { XeroFormEditSectionPage } from "./editpage.js";
import { BoxControl } from "./controls/boxctrl.js";
import { FormControl } from "./controls/formctrl.js";
import { XeroWidget } from "../../widgets/xerowidget.js";
import { KeybindingManager } from "./keybindings.js";
import { KeybindingDialog } from "./dialogs/keybindingdialog.js";
import { TextAreaControl } from "./controls/textareactrl.js";
import { ImageControl } from "./controls/imagectrl.js";
import { ImageDataSource } from "../../apps/imagesrc.js";

type DragState = 'none' | 'ulcorner' | 'lrcorner' | 'urcorner' | 'llcorner' | 'right' | 'left' | 'top' | 'bottom' | 'move' | 'all' | 'area-select';

type UndoRenameSectionArgs = {
    page: number,
    oldname: string ;
}

type UndoMoveSectionArgs = {
    page: number ;
    direction : 'left' | 'right' ;
}

type UndoEditArgs = {
    formctrl: FormControl ;
    olditem: IPCFormItem ;
}

type UndoMoveResizeArgs = {
    formctrl: FormControl ;
    oldbounds: XeroRect ;
}

type UndoDeleteControlArgs = {
    page: number,
    items: IPCFormItem[]
}

type UndoDeleteSectionArgs = {
    section: IPCSection ;
    index: number ;
}

type UndoOperType = 'add' | 'delete' | 'edit' | 'rename' | 'move' ;
type UndoObjType = 'section' | 'control' | 'image' ;
type UndoObjDataType = 
        FormControl[] |                     // Add control
        UndoDeleteSectionArgs |             // Delete section
        UndoDeleteControlArgs |             // Delete control
        UndoRenameSectionArgs |             // Rename section
        UndoMoveSectionArgs |               // Move section
        UndoEditArgs[] |                    // Edit control
        UndoMoveResizeArgs[] |              // Move control
        string ;                            // Add section, 

class UndoStackEntry {
    public readonly oper: UndoOperType ;
    public readonly obj: UndoObjType ;
    public readonly item: UndoObjDataType ;

    constructor(oper: UndoOperType, obj: UndoObjType, item: UndoObjDataType) {
        this.oper = oper ;
        this.obj = obj ;
        this.item = item ;
    }
}

class FormControlImageRequest {
    public readonly ctrl: FormControl ;
    public readonly name: string ;

    constructor(ctrl: FormControl, name: string) {
        this.ctrl = ctrl ;
        this.name = name ;
    }
}

export class XeroEditFormView extends XeroView {
    private static instance_counter_ = 0 ;
    private static kSelectSameSpot = 5 ;

    private static kDefaultMiddleText = 'Right Click For Menu, F1 for keybindings' ;

    private instance_id_ : number = -1 ; 


    private static moveControlAmount = 1 ;
    private static shiftMoveControlAmount = 10 ;
    private static ctrlMoveControlAmount = 50 ;

    private keybindings_ : KeybindingManager = new KeybindingManager() ;

    private tabbed_ctrl_? : XeroTabbedWidget ;
    private section_pages_ : XeroFormEditSectionPage[] = [] ;
    private titlediv_? : HTMLElement ;
    private tabdiv_? : HTMLElement ;
    private area_select_div? : HTMLElement ;
    private area_select_start_? : XeroPoint ;

    private dragging_ : DragState = 'none' ;    
    private edit_dialog_? : XeroDialog ;

    private last_select_index_ = -1 ;
    private last_select_point_ = new XeroPoint(-100, -100) ;
    private select_group_ : FormControl[] = [] ;

    private undo_stack_ : UndoStackEntry[] = [] ;

    private type_: string ;
    private ctrl_menu_ : XeroPopupMenu ;
    private form_? : FormObject ;
    private selected_ctrls_ : FormControl[] = [] ;
    private highlighted_ctrl_? : FormControl ;

    private middle_text_ : string = '' ;

    private section_menu_? : XeroPopupMenu ;
    private popup_menu_? : XeroPopupMenu ;
    private align_menu_? : XeroPopupMenu ;  
    private size_menu_? : XeroPopupMenu ;  
    private image_menu_? : XeroPopupMenu ;
 
    private dirty_ : boolean = false ;
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
    private imagesupdatedbind_? : (images: string[]) => void ;

    private image_data_requestor_ : FormControlImageRequest[] = [] ;

    constructor(app: XeroApp, type: any) {
        super(app, 'xero-form-view') ;

        this.instance_id_ = XeroEditFormView.instance_counter_++ ;

        this.initKeybindings() ;

        this.type_ = type ;
        this.registerCallback('send-form', this.receivedForm.bind(this));
        this.registerCallback('send-form-image', this.receivedNewFormImageName.bind(this)) ;

        this.request('get-images') ;
        this.request('get-form', this.type_);

        let ctrlitems = [
            new PopupMenuItem('Label', this.addNewLabelCtrl.bind(this)),
            new PopupMenuItem('Box', this.addNewBoxCtrl.bind(this)),
            new PopupMenuItem('Image', this.addNewImageCtrl.bind(this)),
            new PopupMenuItem('Text Field', this.addNewTextCtrl.bind(this)),
            new PopupMenuItem('Text Area', this.addNewTextAreaCtrl.bind(this)),
            new PopupMenuItem('Up/Down Field', this.addNewUpDownCtrl.bind(this)),
            new PopupMenuItem('Boolean Field', this.addNewBooleanCtrl.bind(this)),
            new PopupMenuItem('Multiple Choice', this.addNewMultipleChoiceCtrl.bind(this)),
            new PopupMenuItem('Select', this.addNewSelectCtrl.bind(this)),
            new PopupMenuItem('Timer', this.addNewTimerCtrl.bind(this)),
        ]

        this.ctrl_menu_ = new XeroPopupMenu('controls', ctrlitems) ;

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

        this.imagesupdatedbind_ = this.imageNamesUpdated.bind(this) ;
        this.app.imageSource.addListener('image-names-updated', this.imagesupdatedbind_) ;
    }

    public close() {
        super.close() ;

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

        this.app.imageSource.removeListener('image-names-updated', this.imagesupdatedbind_!) ;
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

    private shiftSectionLeft(ev: KeyboardEvent) {
        this.moveSection(true) ;
    }

    private shiftSectionRight(ev: KeyboardEvent) {
        this.moveSection(false) ;
    }

    private selectFurtherNext(ev: KeyboardEvent) {
        this.selectFurther(false) ;
    }

    private selectFurtherAdd(ev: KeyboardEvent) {
        this.selectFurther(true) ;
    }

    private escape(ev: KeyboardEvent) {
        this.unselectAll() ;
        if (this.dragging_ === 'area-select') {
            this.stopAreaSelect() ;
        }
    }

    private editProperties(ev: KeyboardEvent) {
        let top = this.tabbed_ctrl_?.selectedPage!.getBoundingClientRect().top ;
        this.editControlProperties(this.selected_ctrls_[0], this.cursor_.x, this.cursor_.y + top!) ;
    }

    private imageNamesUpdated(images: string[]) {
        images = images.sort(
            (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })
        )

        let items : PopupMenuItem[] = [] ;
        for(let name of images) {
            let mitem = new PopupMenuItem(name, this.setBackgroundImage.bind(this, name)) ;
            items.push(mitem) ;
        }

        this.image_menu_ = new XeroPopupMenu('images', items) ;
    }

    private keybindingDialogClosed() {
        this.edit_dialog_ = undefined ;
    }

    private showKeyBindings(ev: KeyboardEvent) {
        let bounds = this.elem.getBoundingClientRect() ;

        this.edit_dialog_ = new KeybindingDialog(this.keybindings_.getAllKeybindings()) ;
        this.edit_dialog_.on('closed', this.keybindingDialogClosed.bind(this)) ;
        this.edit_dialog_.showRelative(this.elem.parentElement!, bounds.width / 5, 100) ;
    }

    private initKeybindings() {
        this.keybindings_.addKeybinding('F1', false, false, false, 'Show key bindings', this.showKeyBindings.bind(this));
      
        this.keybindings_.addKeybinding('L', true, false, true, 'Shift the current section left', this.shiftSectionLeft.bind(this));
        this.keybindings_.addKeybinding('R', true, false, true, 'Shift the current section right', this.shiftSectionRight.bind(this));
        this.keybindings_.addKeybinding('Tab', false, false, false, 'Select the next control in a vertical stack', this.selectFurtherNext.bind(this));
        this.keybindings_.addKeybinding('Tab', false, true, false, 'Add the next control in a vertical stack to the selection', this.selectFurtherAdd.bind(this));
        this.keybindings_.addKeybinding('a', true, false, false, 'Select all controls on the current form', this.selectAll.bind(this));
        this.keybindings_.addKeybinding('Delete', false, false, false, 'Delete the selected control(s)', this.deleteSelectedItems.bind(this));        
        this.keybindings_.addKeybinding('Escape', false, false, false, 'Deselect all controls', this.escape.bind(this));
        this.keybindings_.addKeybinding('z', true, false, false, 'Undo the last action', this.undo.bind(this));
        this.keybindings_.addKeybinding('p', true, false, false, 'Edit the properties on the currently select control', this.editProperties.bind(this));

        this.keybindings_.addKeybinding('ArrowLeft', false, false, false, 'Move the current control left', this.moveSelectedItems.bind(this, -XeroEditFormView.moveControlAmount, 0));
        this.keybindings_.addKeybinding('ArrowRight', false, false, false, 'Move the current control right', this.moveSelectedItems.bind(this, XeroEditFormView.moveControlAmount, 0));
        this.keybindings_.addKeybinding('ArrowUp', false, false, false, 'Move the current control up', this.moveSelectedItems.bind(this, 0, -XeroEditFormView.moveControlAmount));
        this.keybindings_.addKeybinding('ArrowDown', false, false, false, 'Move the current control down', this.moveSelectedItems.bind(this, 0, XeroEditFormView.moveControlAmount));

        this.keybindings_.addKeybinding('ArrowLeft', false, false, true, 'Move the current control left by 10', this.moveSelectedItems.bind(this, -XeroEditFormView.shiftMoveControlAmount, 0));
        this.keybindings_.addKeybinding('ArrowRight', false, false, true, 'Move the current control right by 10', this.moveSelectedItems.bind(this, XeroEditFormView.shiftMoveControlAmount, 0));
        this.keybindings_.addKeybinding('ArrowUp', false, false, true, 'Move the current control up by 10', this.moveSelectedItems.bind(this, 0, -XeroEditFormView.shiftMoveControlAmount));
        this.keybindings_.addKeybinding('ArrowDown', false, false, true, 'Move the current control down by 10', this.moveSelectedItems.bind(this, 0, XeroEditFormView.shiftMoveControlAmount));

        this.keybindings_.addKeybinding('ArrowLeft', true, false, false, 'Move the current control left by 50', this.moveSelectedItems.bind(this, -XeroEditFormView.ctrlMoveControlAmount, 0));
        this.keybindings_.addKeybinding('ArrowRight', true, false, false, 'Move the current control right by 50', this.moveSelectedItems.bind(this, XeroEditFormView.ctrlMoveControlAmount, 0));
        this.keybindings_.addKeybinding('ArrowUp', true, false, false, 'Move the current control up by 50', this.moveSelectedItems.bind(this, 0, -XeroEditFormView.ctrlMoveControlAmount));
        this.keybindings_.addKeybinding('ArrowDown', true, false, false, 'Move the current control down by 50', this.moveSelectedItems.bind(this, 0, XeroEditFormView.ctrlMoveControlAmount));

        this.keybindings_.addKeybinding('F2', false, false, false, 'Insert a new label control', this.addNewLabelCtrl.bind(this));
        this.keybindings_.addKeybinding('F3', false, false, false, 'Insert a new box control', this.addNewBoxCtrl.bind(this));
        this.keybindings_.addKeybinding('F4', false, false, false, 'Insert a new text control', this.addNewTextCtrl.bind(this));
        this.keybindings_.addKeybinding('F5', false, false, false, 'Insert a new text area control', this.addNewTextAreaCtrl.bind(this));
        this.keybindings_.addKeybinding('F6', false, false, false, 'Insert a new up/down control', this.addNewUpDownCtrl.bind(this));
        this.keybindings_.addKeybinding('F7', false, false, false, 'Insert a new boolean control', this.addNewBooleanCtrl.bind(this));
        this.keybindings_.addKeybinding('F8', false, false, false, 'Insert a new multiple choice control', this.addNewMultipleChoiceCtrl.bind(this));
        this.keybindings_.addKeybinding('F9', false, false, false, 'Insert a new select control', this.addNewSelectCtrl.bind(this));
        this.keybindings_.addKeybinding('F10', false, false, false, 'Insert a new timer control', this.addNewTimerCtrl.bind(this));
        this.keybindings_.addKeybinding('F11', false, false, false, 'Insert a new image control', this.addNewImageCtrl.bind(this));
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
            this.modified(new UndoStackEntry('add', 'control', [formctrl])) ;
        }
        else {
            alert('You cannot create a label control without a section. Use the "Section" menu to add a section first.') ;
        }
    }

    private addNewImageCtrl() {
        if (this.tabbed_ctrl_?.selectedPage) {
            let formctrl = new ImageControl(this.app.imageSource, this, this.getUniqueTagName(), XeroRect.fromPointSize(this.context_menu_cursor_, new XeroSize(250, 50))) ;
            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified(new UndoStackEntry('add', 'control', [formctrl])) ;
        }
        else {
            alert('You cannot create a image control without a section. Use the "Section" menu to add a section first.') ;
        }
    }    

    private addNewBoxCtrl() {
        if (this.tabbed_ctrl_?.selectedPage) {
            let formctrl = new BoxControl(this, this.getUniqueTagName(), XeroRect.fromPointSize(this.context_menu_cursor_, new XeroSize(250, 50))) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified(new UndoStackEntry('add', 'control', [formctrl])) ;            
        }
        else {
            alert('You cannot create a box control without a section. Use the "Section" menu to add a section first.') ;
        }        
    }

    private addNewTextCtrl() {
        if (this.tabbed_ctrl_?.selectedPage) {
            let formctrl = new TextControl(this, this.getUniqueTagName(), XeroRect.fromPointSize(this.context_menu_cursor_, new XeroSize(250, 50))) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified(new UndoStackEntry('add', 'control', [formctrl])) ;            
        }
        else {
            alert('You cannot create a text control without a section. Use the "Section" menu to add a section first.') ;
        }        
    }    

    private addNewTextAreaCtrl() {
        if (this.tabbed_ctrl_?.selectedPage) {
            let formctrl = new TextAreaControl(this, this.getUniqueTagName(), XeroRect.fromPointSize(this.context_menu_cursor_, new XeroSize(250, 50))) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified(new UndoStackEntry('add', 'control', [formctrl])) ;            
        }
        else {
            alert('You cannot create a text area control without a section. Use the "Section" menu to add a section first.') ;
        }        
    }

    private addNewUpDownCtrl() {
        if (this.tabbed_ctrl_?.selectedPage) {
            let formctrl = new UpDownControl(this, this.getUniqueTagName(), XeroRect.fromPointSize(this.context_menu_cursor_, new XeroSize(250, 50))) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified(new UndoStackEntry('add', 'control', [formctrl])) ;            
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
            this.modified(new UndoStackEntry('add', 'control', [formctrl])) ;            
        }
        else {
            alert('You cannot create a boolean control without a section. Use the "Section" menu to add a section first.') ;
        }        
    }  

    private addNewMultipleChoiceCtrl() {
        if (this.tabbed_ctrl_?.selectedPage) {
            let formctrl = new MultipleChoiceControl(this, this.getUniqueTagName(), XeroRect.fromPointSize(this.context_menu_cursor_, new XeroSize(250, 150))) ;

            this.addItemToCurrentSection(formctrl.item) ;
            this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].addControl(formctrl) ;
            this.modified(new UndoStackEntry('add', 'control', [formctrl])) ;            
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
            this.modified(new UndoStackEntry('add', 'control', [formctrl])) ;            
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
            this.modified(new UndoStackEntry('add', 'control', [formctrl])) ;            
        }
        else {
            alert('You cannot create a timer control without a section. Use the "Section" menu to add a section first.') ;
        }        
    }     

    private receivedForm(args: any) {
        console.log(`XeroEditFormView: received form data for ${this.type_}`) ; 

        this.initDisplay() ;

        this.form_ = new FormObject(args.form.json) ;
        if (this.form_) {
            if (this.form_.sections.length) {
                this.createSectionPages() ;
                this.setCurrentSectionByIndex(0) ;
            }
        }
    }

    private createSectionPages() {
        for(let section of this.form_!.sections) {
            this.appendSectionPage(section) ;
        }
    }

    private createControlsFromItems(items: IPCFormItem[], pagenum: number) {
        let page = this.section_pages_[pagenum] ;        
        for(let item of items) {
            this.createControlFromItem(item, page) ;
        }   
    }

    private createControlFromItem(item: IPCFormItem, page: XeroFormEditSectionPage) : FormControl {
        let formctrl : FormControl | undefined ;

        if (item.type === 'label') {
            formctrl = new LabelControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
            formctrl.update(item) ;
        }
        else if (item.type === 'image') {
            let imagectrl = new ImageControl(this.app.imageSource, this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
            formctrl = imagectrl ;
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
        else if (item.type === 'textarea') {
            formctrl = new TextAreaControl(this, item.tag, new XeroRect(item.x, item.y, item.width, item.height)) ;
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

    private createSectionPageObject(section: IPCSection) : XeroFormEditSectionPage { 
        let image: string ;

        let page = new XeroFormEditSectionPage(image!) ;
        this.updateControls(section, page) ;

        this.app.imageSource.getImageData(section.image)
            .then((data) => {
                if (data) {
                    page.setImage(data) ;
                }
            }) ;        

        return page ;
    }

    private appendSectionPage(section: IPCSection) : void { 
        let page = this.createSectionPageObject(section) ;
        this.tabbed_ctrl_!.addPage(section.name, page.elem) ;
        this.section_pages_.push(page) ;
    }

    private insertSectionPage(section: IPCSection, index: number) : void {
        let page = this.createSectionPageObject(section) ;
        this.tabbed_ctrl_!.insertPage(index, section.name, page.elem) ;
        this.section_pages_.splice(index, 0, page) ;
    }
   
    private addSection() {
        if (this.form_) {
            let section : IPCSection = this.form_.createNewSection() ;
            this.appendSectionPage(section) ;
            if (this.tabbed_ctrl_!.selectedPageNumber === -1) {
                this.tabbed_ctrl_!.selectPage(0) ;
            }
            this.modified(new UndoStackEntry('add', 'section', section.name)) ;       
        }
    }

    private deleteSectionByName(name: string, save : boolean = true) {
        if (this.form_) {
            let pageno = this.form_.findSectionIndexByName(name) ;
            if (pageno !== -1) {
                this.deleteSectionByPage(pageno, save) ;
            }
        }
    }

    private deleteSectionByPage(pageno: number, save: boolean = true) {
        this.tabbed_ctrl_!.removePage(pageno) ;
        if (this.form_) {
            //
            // Remoive the page from the form
            //
            let section = this.form_.sections[pageno] ;
            this.form_.removeSectionByIndex(pageno) ;

            //
            // Remove the section page from the array
            //
            if (this.section_pages_.length > pageno) {
                this.section_pages_[pageno].close() ;
                this.section_pages_.splice(pageno, 1) ;
            }

            //
            // Save the document and the undo information if asked to
            //
            if (save) {
                let sect : UndoDeleteSectionArgs = {
                    section: section,
                    index: pageno
                }
                this.modified(new UndoStackEntry('delete', 'section', sect)) ;
            }

            //
            // Find a new page to view since we may have deleted the one we were on
            //
            if (this.tabbed_ctrl_!.selectedPageNumber === -1 && this.form_.sections.length > 0) {
                this.tabbed_ctrl_!.selectPage(0) ;
            }
        }        
    }

    private deleteCurrentSection() {
        if (this.tabbed_ctrl_!.selectedPageNumber === -1) {
            return ;
        }

        this.deleteSectionByPage(this.tabbed_ctrl_!.selectedPageNumber) ;
    }

    private setBackgroundImage(image: string, save: boolean = true) {
        if (this.tabbed_ctrl_!.selectedPageNumber === -1) {
            alert('You cannot set the background image without a section. Use the "Section" menu to add a section first.') ;
            return ;
        }

        if (this.form_) {
            let pageno = this.tabbed_ctrl_!.selectedPageNumber ;
            let old_image = this.form_.sections[pageno].image ;
            this.form_.sections[pageno].image = image ;
            if (save) {
                this.modified(new UndoStackEntry('edit', 'image', old_image)) ;
            }

            this.app.imageSource.getImageData(image)
                .then((data) => {
                    if (data) {
                        this.section_pages_[pageno].setImage(data) ;
                    }
                }) ;
        }
    }

    private receivedNewFormImageName(args: any) {
        this.setBackgroundImage(args as string) ;
    }

    private modified(undo: UndoStackEntry) : void {
        if (this.form_) {
            this.undo_stack_.push(undo) ;
            this.form_.resetImages() ;
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
        this.tabbed_ctrl_.on('beforeSelectPage', this.beforeSectionChanged.bind(this)) ;
        this.tabbed_ctrl_.on('afterSelectPage', this.afterSectionChanged.bind(this)) ;
        this.tabbed_ctrl_.setParent(this.tabdiv_) ;

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

    private doLayout(index: number) {
        this.section_pages_[index].doLayout() ;
    }

    private beforeSectionChanged(index: number) {
        this.section_pages_[index].resetHTML() ;
    }

    private afterSectionChanged(index: number) {
        if (this.tabbed_ctrl_!.selectedPageNumber !== -1) {
            setTimeout(this.doLayout.bind(this, index), 10) ;
        }
    }

    private cutSelectedItems(ev: ClipboardEvent) {
        ev.preventDefault() ;
        this.copySelectedItems(ev) ;
        this.deleteSelectedItems() ;
    }

    private copySelectedItems(ev: ClipboardEvent) {
        if (ev.clipboardData) {
            let json : any[] = [] ;

            for(let frmctrl of this.selected_ctrls_) {
                if (frmctrl) {
                    json.push(frmctrl.item) ;
                }
            }

            let str = JSON.stringify(json) ;            
            ev.clipboardData.clearData() ;
            ev.clipboardData.setData('text/xerocentral', str) ;
            ev.preventDefault() ;
        }
    }

    private findItemBounds(items: IPCFormItem[]) : XeroRect {
        let left = Number.MAX_VALUE ;
        let top = Number.MAX_VALUE ;
        let right = 0 ;
        let bottom = 0 ;

        for(let item of items) {
            if (item.x < left) {
                left = item.x ;
            }
            if (item.y < top) {
                top = item.y ;
            }
            if (item.x + item.width > right) {
                right = item.x + item.width ;
            }
            if (item.y + item.height > bottom) {
                bottom = item.y + item.height ;
            }
        }

        return new XeroRect(left, top, right - left, bottom - top) ;
    }

    private async pasteSelectedItem(ev: ClipboardEvent) {
        if (!this.tabbed_ctrl_ || this.tabbed_ctrl_!.selectedPageNumber === -1) {
            // We don't have a section, so we can't paste
            return ;
        }

        if (ev.clipboardData) {
            let data = ev.clipboardData.getData('text/xerocentral') ;
            if (data) {
                this.unselectAll() ;
                let json : any[] = [] ;
                try {
                    json = JSON.parse(data) as IPCFormItem[] ;
                }
                catch(err) {
                    alert('Invalid clipboard data') ;    
                    return ;               
                }

                let bounds = this.findItemBounds(json) ;
                let dx = this.cursor_.x - bounds.x ;
                let dy = this.cursor_.y - bounds.y ;
                let page = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber] ;
                let added: FormControl[] = [] ;
                for(let item of json) {
                    item.x += dx ;
                    item.y += dy ;
                    item.tag = this.getUniqueTagName() ;
                    let frmctrl = this.createControlFromItem(item, page) ;
                    if (frmctrl) {
                        added.push(frmctrl) ;
                        this.addItemToCurrentSection(frmctrl.item) ;
                        this.select(frmctrl) ;
                    }
                }

                this.modified(new UndoStackEntry('add', 'control', added)) ;
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
            this.finishDragOrMove(event) ;
        }
    }    

    private dialogClosed(ctrl: FormControl, olditem: IPCFormItem, changed: boolean) {
        if (changed) {
            let arg : UndoEditArgs = { 
                formctrl: ctrl, 
                olditem: olditem,
            } ;
            this.modified(new UndoStackEntry('edit', 'control', [arg])) ;
        }

        this.edit_dialog_ = undefined ;
    }

    private doubleClick(event: MouseEvent) {
        if (!this.edit_dialog_ && !this.popup_menu_) {        
            let x = event.clientX ;
            let y = event.clientY ;        
            let frmctrl = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findControlsByPosition(this.cursor_) ;            
            this.editControlProperties(frmctrl[0], x, y) ;
        }
    }

    private editControlProperties(frmctrl: FormControl, x: number, y: number) {
        this.dragging_ = 'none' ;
        let bounds = this.tabbed_ctrl_?.selectedPage!.getBoundingClientRect() ;

        if (x > bounds!.left + bounds!.width - 600) {
            x = bounds!.left  + bounds!.width - 600 ;
        }

        if (y > bounds!.top + bounds!.height - 400) {
            y = bounds!.top + bounds!.height - 400 ;
        }

        let olditem = JSON.parse(JSON.stringify(frmctrl.item)) ;

        this.unselectCurrent(frmctrl) ;
        this.edit_dialog_ = frmctrl.createEditDialog() ;
        this.edit_dialog_.showRelative(this.elem, x, y) ;
        this.edit_dialog_.on('closed', this.dialogClosed.bind(this, frmctrl, olditem)) ;
    }

    private onGlobalKey(event: KeyboardEvent) {
        if (!this.edit_dialog_ && !this.popup_menu_) {
            let binding = this.keybindings_.getKeybindings(event.key, event.ctrlKey, event.altKey, event.shiftKey) ;

            if (binding) {
                binding.action(event) ;
                event.preventDefault() ;
                event.stopPropagation() ;
            }
        }
    }

    private testMoveItem(frmctrl: FormControl, dx: number, dy: number, dw: number, dh: number, original: boolean) : boolean {
        if (frmctrl) {
            let bounds: XeroRect ;

            if (original) {
                bounds = frmctrl.originalBounds ;
            }
            else {
                bounds = frmctrl.bounds ;
            }

            // Make sure we don't move off the screen
            if (bounds.x + dx  < 0 || bounds.y + dy < 0) {
                return false ;
            }

            if (bounds.x + dx + bounds.width + dw > this.tabbed_ctrl_!.selectedPage!.clientWidth - 10 || 
                        bounds.y + dy + bounds.height + dh > this.tabbed_ctrl_!.selectedPage!.clientHeight -10) {
                return false; 
            }
        }

        return true ;
    }

    private testMoveSelectedItems(dx: number, dy: number, dw: number, dh: number, original: boolean) : boolean {
        for(let frmctrl of this.selected_ctrls_) {
            if (!this.testMoveItem(frmctrl, dx, dy, dw, dh, original)) {
                return false ;
            }
        }
        return true ;
    }

    private moveSelectedItems(dx: number, dy: number, ev: KeyboardEvent) {
        if (this.selected_ctrls_.length > 0) {
            if (!this.testMoveSelectedItems(dx, dy, 0, 0, false)) {
                return ;
            }

            for(let frmctrl of this.selected_ctrls_) {
                frmctrl.item.x += dx ;
                frmctrl.item.y += dy ;
                frmctrl.positionUpdated() ;
                this.displayMiddleBar() ;
            }
        }
    }

    private deleteControls(ctrls: FormControl[], save: boolean = true) {
        let deled : IPCFormItem[] = [] ;
        for(let frmctrl of ctrls) {
            deled.push(frmctrl.item) ;
            let section = this.form_!.sections[this.tabbed_ctrl_!.selectedPageNumber] ;
            let index = section.items.indexOf(frmctrl.item) ;
            if (index !== -1) {
                section.items.splice(index, 1) ;
                this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].removeControl(frmctrl) ;
                this.dragging_ = 'none' ;
            }
        }

        if (save) {
            let undoitem : UndoDeleteControlArgs = {
                page: this.tabbed_ctrl_!.selectedPageNumber,
                items: deled
            } ;
            this.modified(new UndoStackEntry('delete', 'control', undoitem)) ;
        }
    }

    private deleteSelectedItems() {
        if (this.selected_ctrls_.length > 0 && this.form_) {
            this.deleteControls(this.selected_ctrls_) ;
            this.selected_ctrls_ = [] ;
        }
    }
    
    private selectAll() {
        if (this.tabbed_ctrl_!.selectedPageNumber !== -1) {
            let ctrls = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].controls
            for(let ctrl of ctrls) {
                this.select(ctrl) ;
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

    private unselectCurrent(frmctrl: FormControl) {
        if (frmctrl) {
            if (frmctrl.ctrl) {
                let ctrl = frmctrl.ctrl ;
                ctrl.style.border = 'none' ;
                ctrl.style.margin = '4px' ;
                this.dragging_ = 'none' ;
            }
            let index = this.selected_ctrls_.indexOf(frmctrl) ;
            this.selected_ctrls_.splice(index, 1) ;
        }
    }

    private findTheOne(frmctrls: FormControl[]) : FormControl {
        if (frmctrls.length === 0) {
            throw new Error('XeroEditFormView: findTheOne called with empty control list') ;
        }

        if (frmctrls.length === 1) {
            // There is only one control under the cursor, so we return it
            return frmctrls[0] ;
        }

        //
        // There are multiple controls under the cursor, so we need to find the one that is selected
        // or the first one in the list
        //
        for(let ctrl of this.selected_ctrls_) {
            if (frmctrls.includes(ctrl)) {
                return ctrl ;
            }
        }

        return frmctrls[0] ;
    }
    
    private mouseMoveControlsSelected() {
        let frmctrls = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findControlsByPosition(this.cursor_) ;
        if (frmctrls.length === 0) {
            this.elem.style.cursor = 'default' ;
            return ;
        }

        let one = this.findTheOne(frmctrls) ;
        let top = one.isTopEdge(this.cursor_) ;;
        let bottom = one.isBottomEdge(this.cursor_) ;
        let left = one.isLeftEdge(this.cursor_) ;
        let right = one.isRightEdge(this.cursor_) ;

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
                let frmctrl = this.selected_ctrls_[0] ;
                if (frmctrl) {
                    str += `, Control: ${frmctrl!.item.x.toFixed(1)},${frmctrl!.item.y.toFixed(1)} ${frmctrl!.item.width.toFixed(1)}x${frmctrl!.item.height.toFixed(1)}` ;
                }
            }
            else {
                str += `, Selected: ${this.selected_ctrls_.length}` ;
            }

            this.setMiddleStatusBarText(str) ;
        }
        else {
            this.setMiddleStatusBarText(XeroEditFormView.kDefaultMiddleText) ;
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
            dx = 0 ;
            dy = dxy.y ;
            dw = dxy.x ;
            dh = -dxy.y ;
        }
        else if (this.dragging_ === 'llcorner') {
            dx = dxy.x ;
            dy = 0 ;
            dw = -dxy.x ;
            dh = dxy.y ;
        }
        else if (this.dragging_ === 'lrcorner') {
            dx = 0 ;
            dy = 0 ;
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

        let [dx, dy, dw, dh] = ret ;        
        if (!this.testMoveSelectedItems(dx, dy, dw, dh, true)) {
            // We are trying to resize/move the control off the screen
            return ;
        }

        this.dirty_ = true ;
        for(let frmctrl of this.changing_) {
            frmctrl.item.x = frmctrl.originalBounds.x + dx ;
            frmctrl.item.y = frmctrl.originalBounds.y + dy ;

            if (frmctrl.originalBounds.width + dw > FormControl.kMinimumWidth) {
                frmctrl.item.width = frmctrl.originalBounds.width + dw ;
            }
            else {
                frmctrl.item.width = FormControl.kMinimumWidth ;
            }

            if (frmctrl.originalBounds.height + dh > FormControl.kMinimumHeight) {
                frmctrl.item.height = frmctrl.originalBounds.height + dh ;
            }
            else {
                frmctrl.item.height = FormControl.kMinimumHeight ;
            }

            frmctrl.item.height = frmctrl.originalBounds.height + dh ;
            frmctrl.positionUpdated() 
            
            this.dragToCursorStyle() ;
        }
    }

    private pageToForm(x: number, y: number) : XeroPoint {
        if (this.tabbed_ctrl_!.selectedPage === undefined) {
            console.log('XeroEditFormView: pageToForm: no selected page') ;
        }
        let bounds = this.tabbed_ctrl_!.selectedPage!.getBoundingClientRect() ;
        let pt = new XeroPoint(x - bounds.left, y - bounds.top) ;
        return pt ;
    }   

    private mouseMove(event: MouseEvent) {
        if (this.tabbed_ctrl_ === undefined || this.tabbed_ctrl_!.selectedPage === undefined) {
            //
            // We are not setup yet, so we cannot do anything
            return ;
        }

        //
        // Set the cursor position to form coordinates (0, 0) is the top left
        // of the form.
        //        
        this.cursor_ = this.pageToForm(event.pageX, event.pageY) ;   

        if (this.edit_dialog_ || this.popup_menu_) {
            //
            // We are in a dialog or popup menu, so ignore the mouse move
            //
            console.log('XeroEditFormView: mouseMove: in dialog or popup menu') ;
            return ;

        }

        if (this.tabbed_ctrl_?.selectedPageNumber === -1) {
            //
            // There are no sections, so we cannot do anything
            // Tell the user to right click for a menu and return
            //
            this.setMiddleStatusBarText(XeroEditFormView.kDefaultMiddleText) ;   
            console.log('XeroEditFormView: mouseMove: no selected page') ;
            return ;
        }    
        
        if (!document.hasFocus()) {
            //
            // The document does not have focus, so ignore the mouse move
            //
            console.log('XeroEditFormView: mouseMove: document does not have focus') ;
            return ;
        }

        //
        // Find any control under the cursor 
        //
        let ctrls = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findControlsByPosition(this.cursor_) ;
        this.displayMiddleBar() ;

        if (this.dragging_ === 'area-select') {
            //
            // We are dragging the area select box, so update the size of the
            // box
            //
            console.log('XeroEditFormView: mouseMove: area select') ;
            this.placeAreaSelectDiv(this.cursor_) ;
        }
        else if (this.selected_ctrls_.length === 0) {
            //
            // No, selected controls and not doing an area drag, so just set the default 
            // cursor.
            //
            // Its ok if ctrl is undefined, highlight() handles this correctly
            //
            console.log('XeroEditFormView: mouseMove: no selected controls') ;
            this.highlight(ctrls[ctrls.length - 1]) ;
            this.elem.style.cursor = 'default' ;
        }
        else if (this.dragging_ === 'none') {
            //
            // We have selected controls, but we are not dragging them
            //
            console.log('XeroEditFormView: mouseMove: selected controls but not dragging') ;
            this.highlight(ctrls[ctrls.length - 1]) ;
            this.mouseMoveControlsSelected() ;
        }
        else {
            //
            // We are moving or resizing the selected controls
            //
            console.log('XeroEditFormView: mouseMove: selected controls and dragging') ;
            this.draggingResizingControls(event) ;
        }
    }

    private select(frmctrl: FormControl, multiple: boolean = false) {
        if (frmctrl === this.highlighted_ctrl_) {
            this.unhighlight() ;
        }

        if (this.selected_ctrls_.indexOf(frmctrl) !== -1) {
            return ;
        }

        if (multiple) {
            frmctrl.displayStyle = 'multiplesel' ;
        }
        else {
            frmctrl.displayStyle = 'selected' ;
        }
        this.selected_ctrls_.push(frmctrl) ;
    }

    private selectFurther(add: boolean) {
        if (this.select_group_.length > 1) {
            //
            // Cycle through the controls that are under the cursor
            // and select the next one
            //
            if (!add) {
                this.unselectCurrent(this.select_group_[this.last_select_index_]) ;
            }
            this.last_select_index_++ ;
            if (this.last_select_index_ >= this.select_group_.length) {
                this.last_select_index_ = 0 ;
            }
            this.select(this.select_group_[this.last_select_index_], true) ;
        }        
    }

    private selectByPoint() {
        //
        // The mouse has moved, so select previous select groups is no longer valid
        // and we need to create a new select group
        //
        let page = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber] ;
        this.select_group_ = page.findControlsByPosition(this.cursor_) ;
        this.last_select_index_ = 0 ;
        if (this.select_group_.length > 0) {
            if (this.highlighted_ctrl_ && this.select_group_.includes(this.highlighted_ctrl_)) {
                this.last_select_index_ = this.select_group_.indexOf(this.highlighted_ctrl_) ;
                this.select(this.highlighted_ctrl_, this.select_group_.length > 1) ;
            }
            else {
                this.select(this.select_group_[0], this.select_group_.length > 1) ;
            }
        }

        if (this.select_group_.length > 1) {
            let pt = new XeroPoint(this.cursor_.x, this.cursor_.y) ;
            this.displayHint('edit-form-multi-select', pt) ;
        }
    }

    private unhighlight() {
        if (this.highlighted_ctrl_) {
            this.highlighted_ctrl_.displayStyle = 'none' ;
            this.highlighted_ctrl_ = undefined ;
        }
    }

    private highlight(ctrl: FormControl | undefined) {
        if (this.highlighted_ctrl_ !== ctrl) {
            this.unhighlight() ;
        }

        if(ctrl && this.selected_ctrls_.indexOf(ctrl) === -1) {
            ctrl.displayStyle = 'highlighted' ;
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
                        this.select(ctrl) ;
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

        this.elem.style.cursor = 'crosshair' ;
        this.area_select_div.style.border = '2px dashed blue' ;
        this.dragging_ = 'area-select' ;
    }

    private isSelected(ctrls: FormControl[]) : boolean {
        for(let ctrl of ctrls) {
            if (this.selected_ctrls_.indexOf(ctrl) !== -1) {
                return true ;
            }
        }
        return false ;
    }

    private mouseDown(event: MouseEvent) {
        if (this.edit_dialog_ || this.popup_menu_ || event.button !== 0 || !this.tabbed_ctrl_ || this.tabbed_ctrl_!.selectedPageNumber === -1) {
            return ;
        }

        let page = this.tabbed_ctrl_!.selectedPage! ;
        if (!XeroWidget.isChildOf(page, event.target as HTMLElement)) {
            return ;
        }

        event.preventDefault() ;
        event.stopPropagation() ;

        let ctrls = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].findControlsByPosition(this.cursor_) ;
        console.log(`XeroEditFormView: mouseDown: ${ctrls.length} controls found`) ;
        if (ctrls.length === 0) {
            if (this.selected_ctrls_.length > 0) {
                //
                // We are clicking on the form, but not on a control and there are selected controls, 
                // so unselect them
                //
                this.unselectAll() ;
                this.elem.style.cursor = 'default' ;
            }
            else { 
                //
                // There are no selected controls, so start an area select
                //
                if (XeroWidget.isChildOf(this.elem, event.target as HTMLElement)) {
                    this.startAreaSelect(this.pageToForm(event.pageX, event.pageY)) ;
                }
            }
        }
        else if (!this.isSelected(ctrls) || this.cursor_.distance(this.last_select_point_) < XeroEditFormView.kSelectSameSpot) {
            //
            // We are clicking on a control, and it is not selected, so select it
            //
            if (!event.shiftKey) {
                this.unselectAll() ;
            }

            this.selectByPoint() ;
        }
        else {
            this.changing_ = [] ;

            // Coordinates of the mouse event relative to the form
            this.base_ = this.pageToForm(event.pageX, event.pageY) ;            
            
            for(let frmctrl of this.selected_ctrls_) {
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

                // These are the form controls that are being moved or resized
                frmctrl.setOriginalBounds() ;
                this.changing_.push(frmctrl) ;
            }
        }

        this.last_select_point_ = this.cursor_.clone() ;
    }    

    private finishDragOrMove(event: MouseEvent) {
        if (this.dirty_) {
            this.dirty_ = false ;
            let changes : UndoMoveResizeArgs[] = [] ;

            for(let frmctrl of this.changing_) {
                let change : UndoMoveResizeArgs = {
                    formctrl: frmctrl,
                    oldbounds: frmctrl.originalBounds,
                } ;
                changes.push(change) ;
            }
            this.modified(new UndoStackEntry('move', 'control', changes)) ;
        }
        this.dragging_ = 'none' ;
    }   

    private renameSectionInternal(name: string, page: number, save: boolean = true) {
        if (this.form_) {
            let oldname = this.form_.sections[this.tabbed_ctrl_!.selectedPageNumber].name ;
            this.form_.sections[this.tabbed_ctrl_!.selectedPageNumber].name = name ;      
            this.tabbed_ctrl_!.renamePage(page, name) ;   
            if (save) {
                this.modified(new UndoStackEntry('rename', 'section', { oldname: oldname, page: this.tabbed_ctrl_!.selectedPageNumber})) ;  
            }               
        }
    }

    private sectionNameDialogDone(changed: boolean) {
        if (changed && this.form_) {
            let newname = (this.edit_dialog_ as EditSectionNameDialog).enteredName ;
            this.renameSectionInternal(newname, this.tabbed_ctrl_!.selectedPageNumber) ;
  
        }
        this.edit_dialog_ = undefined ;
    }

    private renameSection() {
        if (this.form_) {
            let bounds = this.tabbed_ctrl_!.selectedPage!.getBoundingClientRect() ;
            this.edit_dialog_ = new EditSectionNameDialog(this.form_.sections[this.tabbed_ctrl_!.selectedPageNumber].name) ;
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
            this.moveSectionInternal(this.tabbed_ctrl_!.selectedPageNumber, left) ;
        }
    }

    private moveSectionInternal(pageno: number, left: boolean, save: boolean = true) {
        if (this.form_ && pageno !== -1) {
            if (left && pageno === 0) {
                alert('You cannot move the first section left') ;
                return ;
            }
            else if (!left && pageno === this.form_.sections.length - 1) {
                alert('You cannot move the last section right') ;
                return ;
            }

            if (left) {
                this.tabbed_ctrl_!.movePageLeft(pageno) ;
                let section = this.form_.sections[pageno] ;
                this.form_.sections.splice(pageno, 1) ;
                this.form_.sections.splice(pageno - 1, 0, section) ;

                let page = this.section_pages_[pageno] ;
                this.section_pages_.splice(pageno, 1) ;
                this.section_pages_.splice(pageno - 1, 0, page) ;

                this.setCurrentSectionByIndex(pageno - 1) ;
            }
            else {
                this.tabbed_ctrl_!.movePageRight(pageno) ;
                let section = this.form_.sections[pageno] ;
                this.form_.sections.splice(pageno, 1) ;
                this.form_.sections.splice(pageno + 1, 0, section) ;

                let page = this.section_pages_[pageno] ;
                this.section_pages_.splice(pageno, 1) ;
                this.section_pages_.splice(pageno + 1, 0, page) ;

                this.setCurrentSectionByIndex(pageno + 1) ;
            }
            if (save) {
                this.modified(new UndoStackEntry('move', 'section', { direction: left ? 'left' : 'right', page: pageno })) ;
            }
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
                    new PopupMenuItem('Delete', this.deleteCurrentSection.bind(this)),
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
                new PopupMenuItem('Images', undefined, this.image_menu_),
            ] ;

            if (this.selected_ctrls_.length > 0) {                
                items.push(new PopupMenuItem('Properties', this.editControlProperties.bind(this, this.selected_ctrls_[0], event.clientX, event.clientY))) ;
            }

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
            let undoitems : UndoEditArgs[] = [] ;
            let first = this.selected_ctrls_[0] ;
            let top = first.bounds.y ;
            for(let frmctrl of this.selected_ctrls_) {
                undoitems.push({
                    formctrl: frmctrl,
                    olditem : JSON.parse(JSON.stringify(frmctrl.item)),
                })
                frmctrl.item.y = top ;
                frmctrl.positionUpdated() ;
            }
            this.modified(new UndoStackEntry('edit', 'control', undoitems)) ;
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
            let undoitems : UndoEditArgs[] = [] ;            
            let first = this.selected_ctrls_[0] ;
            for(let frmctrl of this.selected_ctrls_) {
                undoitems.push({
                    formctrl: frmctrl,
                    olditem : JSON.parse(JSON.stringify(frmctrl.item)),
                })                
                frmctrl.item.x = first!.bounds.left ;
                frmctrl.positionUpdated() ;
            }
            this.modified(new UndoStackEntry('edit', 'control', undoitems)) ;
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
            let undoitems : UndoEditArgs[] = [] ;            
            let first = this.selected_ctrls_[0] ;
            let right = first!.bounds.right ;
            for(let frmctrl of this.selected_ctrls_) {
                undoitems.push({
                    formctrl: frmctrl,
                    olditem : JSON.parse(JSON.stringify(frmctrl.item)),
                })                  
                frmctrl.item.x = right - frmctrl.item.width ;
                frmctrl.positionUpdated() ;
            }
            this.modified(new UndoStackEntry('edit', 'control', undoitems)) ;
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
            let undoitems : UndoEditArgs[] = [] ;            
            let first = this.selected_ctrls_[0] ;
            let bottom = first!.bounds.bottom ;
            for(let frmctrl of this.selected_ctrls_) {
                undoitems.push({
                    formctrl: frmctrl,
                    olditem : JSON.parse(JSON.stringify(frmctrl.item)),
                })  
                frmctrl.item.y = bottom - frmctrl.item.height ;
                frmctrl.positionUpdated() ;
            }
            this.modified(new UndoStackEntry('edit', 'control', undoitems)) ;
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
            let undoitems : UndoEditArgs[] = [] ;            
            let first = this.selected_ctrls_[0] ;
            let center = first!.bounds.top + first!.bounds.height / 2 ;
            for(let frmctrl of this.selected_ctrls_) {
                undoitems.push({
                    formctrl: frmctrl,
                    olditem : JSON.parse(JSON.stringify(frmctrl.item)),
                })                  
                frmctrl.item.y = center - frmctrl.item.height / 2 ;
                frmctrl.positionUpdated() ;
            }
            this.modified(new UndoStackEntry('edit', 'control', undoitems)) ;
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
            let undoitems : UndoEditArgs[] = [] ;            
            let first = this.selected_ctrls_[0] ;            
            let middle = first!.bounds.left + first!.bounds.width / 2 ;
            for(let frmctrl of this.selected_ctrls_) {
                undoitems.push({
                    formctrl: frmctrl,
                    olditem : JSON.parse(JSON.stringify(frmctrl.item)),
                })                  
                frmctrl.item.x = middle - frmctrl.item.width / 2 ;
                frmctrl.positionUpdated() ;
            }
            this.modified(new UndoStackEntry('edit', 'control', undoitems)) ;
        }
        else {
            alert('You must select at least 2 controls to align them') ;
        }        
    }

    private sameWidth(save : boolean = true) {
        if (this.tabbed_ctrl_?.selectedPageNumber === -1) { 
            alert('You cannot resize controls when no section is selected.  Please create a section first using the Section menu') ;
            return ;
        }  

        if (this.selected_ctrls_.length > 1) {
            let undoitems : UndoEditArgs[] = [] ;            
            let width = this.selected_ctrls_[0].bounds.width ;
            for(let frmctrl of this.selected_ctrls_) {
                undoitems.push({
                    formctrl: frmctrl,
                    olditem : JSON.parse(JSON.stringify(frmctrl.item)),
                })                  
                frmctrl.item.width = width ;
                frmctrl.positionUpdated() ;
            }
            if (save) {
                this.modified(new UndoStackEntry('edit', 'control', undoitems)) ;
            }
        }
        else {
            alert('You must select at least 2 controls to reisze controls') ;
        }        
    }

    private sameHeight(save : boolean = true) : boolean {
        if (this.tabbed_ctrl_?.selectedPageNumber === -1) { 
            alert('You cannot resize controls when no section is selected.  Please create a section first using the Section menu') ;
            return false ;
        }  

        if (this.selected_ctrls_.length > 1) {
            let undoitems : UndoEditArgs[] = [] ;            
            let height = this.selected_ctrls_[0].bounds.height ;
            for(let frmctrl of this.selected_ctrls_) {
                undoitems.push({
                    formctrl: frmctrl,
                    olditem : JSON.parse(JSON.stringify(frmctrl.item)),
                })                  
                frmctrl.item.height = height ;
                frmctrl.positionUpdated() ;
            }
            if (save) {
                this.modified(new UndoStackEntry('edit', 'control', undoitems)) ;
            }
        }
        else {
            alert('You must select at least 2 controls to reisze controls') ;
            return false ;
        }              
        return true ;
    }

    private sameSize() {
        if (!this.sameHeight(false)) {
            return ;
        }
        this.sameWidth(true) ;
    }

    private undo(ev: KeyboardEvent) : void {
        if (this.form_ === undefined) {
            return ;
        }

        if (this.tabbed_ctrl_?.selectedPageNumber === -1) { 
            alert('You cannot undo when no section is selected.  Please create a section first using the Section menu') ;
            return ;
        }

        if (this.undo_stack_.length === 0) {
            alert('There is nothing to undo') ;
            return ;
        }

        let undo = this.undo_stack_.pop() ;
        if (undo === undefined) {
            return ;
        }

        if (undo.oper === 'add' && undo.obj === 'control') {
            this.deleteControls(undo.item as unknown as FormControl[], false) ;
        }
        else if (undo.oper === 'delete' && undo.obj === 'control') {
            let items = undo.item as unknown as UndoDeleteControlArgs ;
            this.createControlsFromItems(items.items, items.page) ;
        }
        else if (undo.oper === 'move' && undo.obj === 'control') {
            let items = undo.item as unknown as UndoMoveResizeArgs[] ;
            for(let item of items) {
                item.formctrl.item.x = item.oldbounds.x ;
                item.formctrl.item.y = item.oldbounds.y ;
                item.formctrl.item.width = item.oldbounds.width ;
                item.formctrl.item.height = item.oldbounds.height ;
                item.formctrl.positionUpdated() ;
            }
        }
        else if (undo.oper === 'edit' && undo.obj === 'control') {
            let bounds = this.section_pages_[this.tabbed_ctrl_!.selectedPageNumber].elem.getBoundingClientRect() ;
            let items = undo.item as unknown as UndoEditArgs[] ;
            for(let item of items) {
                item.formctrl.update(item.olditem) ;
                item.formctrl.updateFromItem(true, 0, bounds.top) ;
            }
        }
        else if (undo.oper === 'edit' && undo.obj === 'image') {
            let item = undo.item as unknown as string ;
            this.setBackgroundImage(item, false) ;
        }
        else if (undo.oper === 'add' && undo.obj === 'section') {
            let name = undo.item as unknown as string ;
            this.deleteSectionByName(name, false) ;
        }
        else if (undo.oper === 'delete' && undo.obj === 'section') {
            let item = undo.item as unknown as UndoDeleteSectionArgs ;
            this.insertSectionPage(item.section, item.index) ;
        }
        else if (undo.oper === 'rename' && undo.obj === 'section') {
            let item = undo.item as unknown as UndoRenameSectionArgs ;
            this.renameSectionInternal(item.oldname, item.page, false) ;
        }
        else if (undo.oper === 'move' && undo.obj === 'section') {
            let item = undo.item as unknown as UndoMoveSectionArgs ;
            if (item.direction === 'left') {
                this.moveSectionInternal(item.page - 1, false, false) ;
            }
            else {
                this.moveSectionInternal(item.page + 1, true, false) ;
            }
        }

        this.request('save-form', { type: this.type_, contents: this.form_.json}) ;       
    }
}