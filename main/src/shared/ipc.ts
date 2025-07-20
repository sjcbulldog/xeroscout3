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
    locked?: boolean ;
}

export interface IPCLabelItem extends IPCFormItem {
    text: string ;
}

export interface IPCImageItem extends IPCFormItem {
    image: string ;
    field: boolean ;
    mirrorx: boolean ;
    mirrory: boolean ;
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

export interface IPCSize {
    width: number ;
    height: number ;
}

export interface IPCSection {
    name: string ;
    items: IPCFormItem[] ;
}

export interface IPCTablet {
    name: string ;
    size: IPCSize ;
}

export interface IPCForm {
    purpose: IPCFormPurpose ;
    tablet: IPCTablet ;
    sections: IPCSection[] ;
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
    questionable?: boolean ;
    data: IPCNamedDataValue[] ;
    edited?: boolean ; // Indicates if the result has been edited
}

export interface IPCScoutResults {
    tablet: string ;
    purpose: string ;
    results: IPCScoutResult[] ;
}

export type IPCAppType = 'central' | 'scout' | 'coach' ;

export interface IPCAppInit {
    type: IPCAppType ;
    splitter: number ;
}

export interface IPCImageResponse {
    name: string ;
    newname: string | undefined ;
    data: string ;
}

export interface IPCCheckDBViewFormula {
    columns: string[] ;                        // The column that displays the formatting if the formula is true
    formula: string ;                         // The formula to evaluate        
    type: string ;
    message: string ;                         // The message to display in the window if the formula is true
    background: string ;                      // The background color to use if the formula is true
    color: string ;                           // The text color to use if the formula is true
    fontFamily: string ;                      // The font family to use if the formula is true
    fontSize: number ;                        // The font size to use if the formula is true
    fontStyle: string ;                       // The font style to use if the formula is true
    fontWeight: string ;                      // The font weight to use if the formula is true
}

export interface IPCFormula {
    name: string,                             // The name of the formula
    desc: string,                             // A description of the formula
    formula: string                           // The expressions to evaluate
}

export interface IPCAlliance {
    teams: [number, number, number] ;
}

export interface IPCMatchOutcome {
    winner: number ;
    loser: number ;
}

export interface IPCPlayoffStatus {
    alliances: [
        IPCAlliance | undefined,        // 1
        IPCAlliance | undefined,        // 2
        IPCAlliance | undefined,        // 3
        IPCAlliance | undefined,        // 4
        IPCAlliance | undefined,        // 5
        IPCAlliance | undefined,        // 6
        IPCAlliance | undefined,        // 7
        IPCAlliance | undefined,        // 8
    ] ;

    outcomes: {
        m1: IPCMatchOutcome | undefined ;
        m2: IPCMatchOutcome | undefined ;
        m3: IPCMatchOutcome | undefined ;
        m4: IPCMatchOutcome | undefined ;
        m5: IPCMatchOutcome | undefined ;
        m6: IPCMatchOutcome | undefined ;
        m7: IPCMatchOutcome | undefined ;
        m8: IPCMatchOutcome | undefined ;
        m9: IPCMatchOutcome | undefined ;   
        m10: IPCMatchOutcome | undefined ;
        m11: IPCMatchOutcome | undefined ;
        m12: IPCMatchOutcome | undefined ;
        m13: IPCMatchOutcome | undefined ;
        m14: IPCMatchOutcome | undefined ;
        m15: IPCMatchOutcome | undefined ;
        m16: IPCMatchOutcome | undefined ;
    }
}

//
// MatchSet -
//   This interface describes a set of matches that can be used for a data set.  It can be one of the following:
//   - last: The last N matches (first is not used, last is the number of matches to use)
//   - first: The first N matches (first is the number of matches to use, last is not used)
//   - range: A range of matches (first is the first match to use, last is the last match to use)
//   - all: All matches (first and last are not used)
//
export interface IPCMatchSet {
    kind: "last" | "first" | "range" | "all" ;
    first: number ;                                 // If kind is first, this is the number of matches to use (use the first N matches)
                                                    // If kind is last, this is not used
                                                    // If kind is range, this is the first match to use (use between first and last matches)

    last: number ;                                  // If kind is first, this is not used
                                                    // If kind is last, this is the number of matches to use (use the last N matches)
                                                    // If kind is range, this is the last match to use  (use between first and last matches)
}

//
// DataSet -
//   This interface describes a data set that can be used for any number of analysis views within the scouting program.
//
export interface IPCDataSet {
    name: string ;                                  // The name of the data set
    teams: number[] ;                               // The list of teams in the data set
    matches: IPCMatchSet ;                            // The set of matches to use for the data set
}

export interface IPCTeamStatus {
    number: number;
    status: string;
    tablet: string;
    teamname: string;
}

export interface IPCMatchStatus {
    comp_level: string;
    set_number: number;
    match_number: number;
    played: boolean;
    red1: number;
    redtab1: string;
    redst1: string;
    red1questionable: boolean;
    red2: number;
    redtab2: string;
    redst2: string;
    red2questionable: boolean;
    red3: number;
    redtab3: string;
    redst3: string;
    red3questionable: boolean;
    blue1: number;
    bluetab1: string;
    bluest1: string;
    blue1questionable: boolean;
    blue2: number;
    bluetab2: string;
    bluest2: string;
    blue2questionable: boolean;
    blue3: number;
    bluetab3: string;
    bluest3: string;
    blue3questionable: boolean;
}

export interface IPCTeamNickNameNumber {
    number : number,
    nickname: string
}