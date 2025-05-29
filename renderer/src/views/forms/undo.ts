import { IPCFormItem, IPCSection } from "../../ipc.js";
import { XeroRect } from "../../widgets/xerogeom.js";
import { FormControl } from "./controls/formctrl.js";

export type UndoRenameSectionArgs = {
    page: number,
    oldname: string ;
}

export type UndoMoveSectionArgs = {
    page: number ;
    direction : 'left' | 'right' ;
}

export type UndoEditArgs = {
    formctrl: FormControl ;
    olditem: IPCFormItem ;
}

export type UndoMoveResizeArgs = {
    formctrl: FormControl ;
    oldbounds: XeroRect ;
}

export type UndoDeleteControlArgs = {
    page: number,
    items: IPCFormItem[]
}

export type UndoDeleteSectionArgs = {
    section: IPCSection ;
    index: number ;
}

export type UndoOperType = 'add' | 'delete' | 'edit' | 'rename' | 'move' ;
export type UndoObjType = 'section' | 'control' | 'image' ;
export type UndoObjDataType = 
        FormControl[] |                     // Add control
        UndoDeleteSectionArgs |             // Delete section
        UndoDeleteControlArgs |             // Delete control
        UndoRenameSectionArgs |             // Rename section
        UndoMoveSectionArgs |               // Move section
        UndoEditArgs[] |                    // Edit control
        UndoMoveResizeArgs[] |              // Move control
        string ;                            // Add section, 

export class UndoStackEntry {
    public readonly oper: UndoOperType ;
    public readonly obj: UndoObjType ;
    public readonly item: UndoObjDataType ;

    constructor(oper: UndoOperType, obj: UndoObjType, item: UndoObjDataType) {
        this.oper = oper ;
        this.obj = obj ;
        this.item = item ;
    }
}
