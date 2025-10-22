import winston from "winston" ;
import { Manager } from "./manager";
import { DataManager } from "./datamgr";
import { IPCDataSet, IPCMatchSet, IPCTypedDataValue } from "../../shared/ipc";
import { TeamManager } from "./teammgr";

//
// DataSetData -
//   This interface describes the data set data that is used to store the data sets that can be used for analysis views.
//   It is used to store the data sets that are defined by the user.  The data sets are stored in the project file.
//
export class DataSetInfo {
    public datasets_ : IPCDataSet[] = [] ;                 // The list of data sets that can be used for the multi-team summary
}

//
// DataSetManager -
//   This class is used to manage the data sets that are used for analysis views.  It is used to add, remove, and rename data sets.
//
export class DataSetManager extends Manager {
    private info_ : DataSetInfo ;
    private team_mgr_ : TeamManager ;

    constructor(logger: winston.Logger,  writer: () => void, info: DataSetInfo, teammgr: TeamManager ) {
        super(logger, writer) ;
        this.info_ = info ;
        this.team_mgr_ = teammgr ;

        if (this.info_.datasets_.findIndex(ds => ds.name === 'All') === -1) {
            this.info_.datasets_.unshift( 
                { 
                    name: 'All', 
                    matches: { kind: 'all', first: -1, last: -1 },
                    formula: ''
                }) ;
        }
    }

    public getDataSets() : IPCDataSet[] {
        return this.info_.datasets_ ;
    }

    public getDataSetByName(name: string) : IPCDataSet | undefined {
        let ret: IPCDataSet | undefined = undefined ;
        for(let ds of this.info_.datasets_) {
            if (ds.name === name) {
                ret = ds ;
                break ;
            }
        }
        return ret ;
    }

    public async getDataSetData(dsname: string) : Promise <any> {
        interface OneTeam {
            [key: string]: any; // Allows any property with a string key
        }

        let ret = new Promise<any>(async (resolve, reject) => {
            let ds = this.findDataSet(dsname) ;
            if (!ds) {
                reject(new Error("data set '" + dsname + "' not found")) ;
            }
            else {
                let allteams = [] ;
                for(let t of this.team_mgr_.getSortedTeamNumbers(false)) {
                    let teamData: OneTeam = {} ;
                    teamData['team_number'] = t ;
                    allteams.push(teamData) ;
                }
                resolve(allteams) ;
            }
        }) ;
        return ret ;
    }

    public renameDataSet(oldName: string, newName: string) : void {
        if (this.findDataSetIndex(newName) === -1) {
            let index = this.findDataSetIndex(oldName) ;
            if (index !== -1) {
                this.info_.datasets_[index].name = newName ;
                this.write() ;
            }
        }
    }

    public updateDataSet(ds: IPCDataSet[]) : void {
        this.info_.datasets_ = ds ;
        this.write() ;
    }

    public findDataSet(name: string) : IPCDataSet | undefined {
        let ret: IPCDataSet | undefined = undefined ;

        for(let ds of this.info_.datasets_) {
            if (ds.name === name) {
                ret = ds ;
                break ;
            }
        }

        return ret ;
    }

    private findDataSetIndex(name: string) : number {
        let ret = -1 ;
        for(let index = 0 ; index < this.info_.datasets_.length ; index++) {
            if (this.info_.datasets_[index].name === name) {
                ret = index ;
                break ;
            }
        }

        return ret;
    }
}
