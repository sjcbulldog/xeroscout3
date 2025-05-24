import winston from "winston" ;
import { Manager } from "./manager";
import { DataManager } from "./datamgr";
import { DataValue } from "../model/datavalue";
import { IPCNamedDataValue } from "../../shared/ipc";

//
// MatchSet -
//   This interface describes a set of matches that can be used for a data set.  It can be one of the following:
//   - last: The last N matches (first is not used, last is the number of matches to use)
//   - first: The first N matches (first is the number of matches to use, last is not used)
//   - range: A range of matches (first is the first match to use, last is the last match to use)
//   - all: All matches (first and last are not used)
//
export interface MatchSet {
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
export interface DataSet {
    name: string ;                                  // The name of the data set
    teams: number[] ;                               // The list of teams in the data set
    fields: string[] ;                              // Can be team fields, match fields, or formulas
    matches: MatchSet ;                            // The set of matches to use for the data set
}

//
// DataSetData -
//   This interface describes the data set data that is used to store the data sets that can be used for analysis views.
//   It is used to store the data sets that are defined by the user.  The data sets are stored in the project file.
//
export class DataSetInfo {
    public datasets_ : DataSet[] = [] ;                 // The list of data sets that can be used for the multi-team summary
}

//
// DataSetManager -
//   This class is used to manage the data sets that are used for analysis views.  It is used to add, remove, and rename data sets.
//
export class DataSetManager extends Manager {
    private info_ : DataSetInfo ;
    private datamgr_ : DataManager ;

    constructor(logger: winston.Logger,  writer: () => void, info: DataSetInfo, datamgr: DataManager) {
        super(logger, writer) ;
        this.info_ = info ;
        this.datamgr_ = datamgr ;
    }

    public getDataSets() : DataSet[] {
        return this.info_.datasets_ ;
    }   

    public getDataSetByName(name: string) : DataSet | undefined {
        let ret: DataSet | undefined = undefined ;
        for(let ds of this.info_.datasets_) {
            if (ds.name === name) {
                ret = ds ;
                break ;
            }
        }
        return ret ;
    }

    public async getData(ds: DataSet, field: string, team: number) : Promise <IPCNamedDataValue> {
        let ret = new Promise<IPCNamedDataValue>(async (resolve, reject) => {
            if (this.containsField(ds, field)) {
                try {
                    let data = await this.datamgr_.getData(ds.matches, field, team) ;
                    resolve(data) ;
                }
                catch(err) {
                    reject(err) ;
                }
            }
            else {
                resolve(
                    {
                        type: "error",
                        value: "field '" + field + "' not found in data set '" + ds.name + "'"
                    }) ;
            }
        }) ;

        return ret; 
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
                for(let t of ds.teams) {          
                    let teamData: OneTeam = {} ;
                    teamData['team_number'] = t ;
                    for(let f of ds.fields) {
                        let result = await this.getData(ds, f, t) ;
                        teamData[f] = result ;
                    }
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

    public updateDataSet(ds: DataSet) : void {
        let index = this.findDataSetIndex(ds.name) ;
        if (index === -1) {
            this.info_.datasets_.push(ds) ;
        }
        else {
            this.info_.datasets_[index] = ds ;
        }

        this.write() ;
    }

    public deleteDataSet (name: string) : void {
        let index = this.findDataSetIndex(name) ;
        if (index !== -1) {
            this.info_.datasets_.splice(index, 1) ;
            this.write() ;
        }
    }
    
    public findDataSet(name: string) : DataSet | undefined {
        let ret: DataSet | undefined = undefined ;

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

    private containsField(ds: DataSet, field: string) : boolean {
        let ret = false ;
        for(let f of ds.fields) {
            if (f === field) {
                ret = true ;
                break ;
            }
        }

        return ret ;
    }

}