import { IPCPlayoffStatus } from "../../shared/ipc";
import { BAEvent, BAMatch, BATeam } from "../extnet/badata";
import { DataModelInfo } from "../model/datamodel";
import { DataInfo } from "./datamgr";
import { DataSetInfo } from "./datasetmgr";
import { FormInfo } from "./formmgr";
import { FormulaInfo } from "./formulamgr";
import { AnalysisViewInfo } from "./analysismgr";
import { MatchInfo } from "./matchmgr";
import { PickListData } from "./picklistmgr";
import { TabletInfo } from "./tabletmgr";
import { TeamData } from "./teammgr";

export class ProjectInfo {
    public frcev_? : BAEvent ;                                          // Information defining the blue alliance event, null for non-BA events
    public uuid_? : string ;                                            // The UUID for this event, will be sent to tablets via sync
    public name_? : string ;                                            // The name of this event if a non-BA event (i.e. frcev_ === null)
    public locked_ : boolean ;                                          // If true, the event is locked and ready for scouting

    public hidden_hints_: string[] = [] ;                               // The list of hints that are hidden
    public data_info_ : DataInfo = new DataInfo() ;                     // The data information for the project
    public dataset_info_ : DataSetInfo = new DataSetInfo() ;            // The data set information for the project
    public picklist_info_ : PickListData = new PickListData() ;         // The picklist information for the project
    public team_info_ : TeamData = new TeamData() ;                     // The team information for the project
    public formula_info_ : FormulaInfo = new FormulaInfo() ;            // The formula information for the project
    public tablet_info_ : TabletInfo = new TabletInfo() ;               // The tablet information for the project
    public match_info_ : MatchInfo = new MatchInfo() ;                  // The match information for the project
    public analysis_view_info_ : AnalysisViewInfo = new AnalysisViewInfo() ;                  // The graph information for the project
    public form_info_ : FormInfo = new FormInfo() ;                     // The form information for the project
    public team_db_info_ : DataModelInfo = new DataModelInfo() ;        // The team database information for the project
    public match_db_info_ : DataModelInfo = new DataModelInfo() ;       // The match database information for the project
    public playoff_info_ : IPCPlayoffStatus = {                         // The playoff information for the project
        alliances: [ undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined ],
        outcomes: { m1: undefined, m2: undefined, m3: undefined, m4: undefined, m5: undefined, m6: undefined, m7: undefined, m8: undefined, m9: undefined, m10: undefined, m11: undefined, m12: undefined, m13: undefined, m14: undefined, m15: undefined, m16: undefined }
    } ;

    constructor() {
        this.locked_ = false ;
    }

    public getName() : string | undefined {
        let ret: string | undefined = undefined ;

        if (this.frcev_ !== undefined) {
            ret = this.frcev_.name ;
        }
        else {
            ret = this.name_ ;
        }

        return ret ;
    }
}
