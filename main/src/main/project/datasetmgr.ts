import winston from "winston" ;
import { Manager } from "./manager";
import { DataManager } from "./datamgr";
import { IPCDataSet, IPCMatches, IPCMatchSet, IPCTypedDataValue } from "../../shared/ipc";
import { MatchManager } from "./matchmgr";
import { BAMatch } from "../extnet/badata";

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
    private datamgr_ : DataManager ;
    private matchmgr_ : MatchManager ;

    constructor(logger: winston.Logger,  writer: () => void, info: DataSetInfo, datamgr: DataManager, matchmgr: MatchManager) {
        super(logger, writer) ;
        this.info_ = info ;
        this.datamgr_ = datamgr ;
        this.matchmgr_ = matchmgr ;
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

    public async getData(ds: IPCDataSet, field: string, team: number) : Promise <IPCTypedDataValue> {
        let ret = new Promise<IPCTypedDataValue>(async (resolve, reject) => {
            try {
                let data = await this.datamgr_.getData(ds.matches, field, team) ;
                resolve(data) ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;
        return ret; 
    }

    public async getDataSetData(dsname: string, fields: string[]) : Promise <object[]> {
        interface OneTeam {
            [key: string]: any; // Allows any property with a string key
        }

        let ret = new Promise<object[]>(async (resolve, reject) => {
            let ds = this.findDataSet(dsname) ;
            if (!ds) {
                reject(new Error("data set '" + dsname + "' not found")) ;
            }
            else {
                let allteams = [] ;
                for(let t of ds.teams) {  
                    let teamData: OneTeam = {} ;
                    teamData['team_number'] = t ;
                    allteams.push(teamData) ;

                    for(let field of fields) {
                        try {
                            let data = await this.getData(ds, field, t) ;
                            teamData[field] = data.value ;
                        }
                        catch(err) {
                            this.logger_.error({ message: 'getDataSetData error', error: err, dsname: dsname, field: field, team: t }) ;
                            teamData[field] = null ; // Set to null if there is an error
                        }
                    }
                }
                resolve(allteams) ;
            }
        }) ;
        return ret ;
    }

    public async getDataSetMatches(dsname: string) : Promise<IPCMatches[]> {
        let ret = new Promise<IPCMatches[]>(async (resolve, reject) => {
            let data: IPCMatches[] = [] ;

            let ds = this.findDataSet(dsname) ;
            if (!ds) {
                return undefined ;
            }

            for(let team of ds.teams) {
                let matches = await this.datamgr_.getTeamMatches(ds.matches, team) ;
                data.push(matches) ;
            }

            resolve(data) ;
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

    public updateDataSet(ds: IPCDataSet) : void {
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