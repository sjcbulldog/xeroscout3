import { BAEvent, BAMatch, BATeam } from "../extnet/badata";
import { DataInfo } from "./datamgr";
import { DataSetInfo } from "./datasetmgr";
import { FormInfo } from "./formmgr";
import { FormulaInfo } from "./formulamgr";
import { GraphInfo } from "./graphmgr";
import { MatchInfo } from "./matchmgr";
import { PickListData } from "./picklistmgr";
import { TabletInfo } from "./tabletmgr";
import { TeamData } from "./teammgr";

export class ProjectInfo {
    public frcev_? : BAEvent ;                                          // Information defining the blue alliance event, null for non-BA events
    public uuid_? : string ;                                            // The UUID for this event, will be sent to tablets via sync
    public name_? : string ;                                            // The name of this event if a non-BA event (i.e. frcev_ === null)
    public locked_ : boolean ;                                          // If true, the event is locked and ready for scouting


    public data_info_ : DataInfo = new DataInfo() ;                     // The data information for the project
    public dataset_info_ : DataSetInfo = new DataSetInfo() ;            // The data set information for the project
    public picklist_info_ : PickListData = new PickListData() ;         // The picklist information for the project
    public team_info_ : TeamData = new TeamData() ;                     // The team information for the project
    public formula_info_ : FormulaInfo = new FormulaInfo() ;            // The formula information for the project
    public tablet_info_ : TabletInfo = new TabletInfo() ;               // The tablet information for the project
    public match_info_ : MatchInfo = new MatchInfo() ;                  // The match information for the project
    public graph_info_ : GraphInfo = new GraphInfo() ;                  // The graph information for the project
    public form_info_ : FormInfo = new FormInfo() ;                    // The form information for the project

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
