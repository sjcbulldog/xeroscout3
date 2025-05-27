export type IPCDataValueType = "integer" | "real" | "string" | "boolean" | "array" | "null" | "error"  ;
export type IPCDataValue = number | string | boolean | null | any[] | Error ;
export type IPCFormPurpose = "match" | "team" ;

export interface IPCTypedDataValue {
    type: IPCDataValueType ;
    value: IPCDataValue ;
}

export interface IPCNamedDataValue {
    tag: string ;
    value: IPCTypedDataValue ;
} ;

export interface IPCSetView {
    view: string;
    args: any[];
}

export interface IPCSetStatus {
    left: string;
    middle: string;
    right: string;
}

export interface IPCTabletDefn {
    name: string ;
    purpose: IPCFormPurpose | undefined;
}

export type IPCFormControlType = 'label' | 'text' | 'textarea' | 'boolean' | 'updown' | 'choice' | 'select' | 'timer' | 'box' | 'image' ;

export interface IPCFormItem {
    type: IPCFormControlType ;
    tag: string ;
    x: number ;
    y: number ;
    width: number ;
    height: number ;
    fontFamily: string ;
    fontSize: number ;
    fontStyle: string ;
    fontWeight: string ;
    color: string ;
    background: string ;
    transparent: boolean ;
    datatype: IPCDataValueType ;
}

export interface IPCLabelItem extends IPCFormItem {
    text: string ;
}

export interface IPCImageItem extends IPCFormItem {
    image: string ;
}

export interface IPCBoxItem extends IPCFormItem {
    borderStyle: string ;
    borderWidth: number ;
    borderRadius: number ;
    borderShadow: boolean ;
}

export interface IPCTextItem extends IPCFormItem {
    placeholder: string ;
}

export interface IPCTextAreaItem extends IPCFormItem {
    rows: number ;
    cols: number ;
}

export interface IPCBooleanItem extends IPCFormItem {
    accent: string ;
}

export interface IPCUpDownItem extends IPCFormItem {
    orientation: 'horizontal' | 'vertical' ;
    minvalue: number ;
    maxvalue: number ;
}

export type IPCChoiceValue = number | string ;

export interface IPCChoice {
    text: string ;
    value: IPCChoiceValue ;
}

export interface IPCChoicesItem extends IPCFormItem {
    choices: IPCChoice[] ;
}

export type IPCMultipleChoiceOrientation = 'horizontal' | 'vertical' ;

export interface IPCMultipleChoiceItem extends IPCChoicesItem {
    radiosize: number ;
    orientation: IPCMultipleChoiceOrientation
}

export interface IPCSelectItem extends IPCChoicesItem {
}

export interface IPCTimerItem extends IPCFormItem {
}

export interface IPCSection {
    name: string ;
    image: string ;
    items: IPCFormItem[] ;
}

export interface IPCForm {
    purpose: string | undefined ;
    sections: IPCSection[] ;
    images: string[] ;
}


export interface IPCProjectColumnCfg {
    name: string,
    width: number,
    hidden: boolean,
}

export interface IPCProjColumnsConfig
{
    columns: IPCProjectColumnCfg[],
    frozenColumnCount: number,
} ;

export interface IPCHint {
    id: string,
    text: string,
    hidden: boolean
}

export type IPCColumnDefnSource = 'form' | 'bluealliance' | 'base' | 'statbotics' ;

export interface IPCColumnDesc
{
    name: string ;                  // The name of the column, as it appears in the database
    type: IPCDataValueType ;        // The type of data in the column
    source: IPCColumnDefnSource ;   // Where the column definition comes from2
    editable: boolean ;             // If true, the column can be edited in the database view
    choices?: IPCChoice[] ;         // For some string columns, the set of choices that are allowed
} ;

export interface IPCDatabaseData {
    column_configurations: IPCProjColumnsConfig ;       // The configuration for the columns in the database view
    column_definitions: IPCColumnDesc[] ;               // The data definitions for each column in the database
    keycols: string[] ;                                 // The columns that are used as keys in the database
    data: any[] ;                                       // The actual data in the database, as an array of objects
}

export interface IPCChange {
    column: string ;                    // The column that was changed
    oldvalue: IPCTypedDataValue ;       // The old value of the column
    newvalue: IPCTypedDataValue ;       // The new value of the column
    search : any ;                      // The search object that is used to find the row that was changed
}

export interface IPCFormScoutData {
    message?: string ;
    form?: IPCForm ;
    reversed? : boolean ;
    color? : string ;
    title? : string ;
}

export interface IPCScoutResult {
    item?: string ;
    data: IPCNamedDataValue[] ;
}

export interface IPCScoutResults {
    tablet: string ;
    purpose: string ;
    results: IPCScoutResult[] ;
}