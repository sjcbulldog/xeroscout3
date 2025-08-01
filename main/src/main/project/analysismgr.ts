import { IPCAnalysisConfigData, IPCAnalysisViewConfig } from "../../shared/ipc";
import { DataManager } from "./datamgr";
import { Manager } from "./manager";
import winston from "winston";

export class AnalysisViewInfo {
    public single_team_data_: IPCAnalysisConfigData ; // Data for the single team view

    public team_graph_data_: IPCAnalysisConfigData ; // List of graphs for the team view

    constructor() {
        this.single_team_data_ = {
            current: undefined,
            data: []
        } ;

        this.team_graph_data_ = {
            current: undefined,
            data: []
        } ;
    }
}

export class AnalysisViewManager extends Manager {
    private info_: AnalysisViewInfo ;
    private data_mgr_ : DataManager ;

    constructor(logger: winston.Logger, writer: () => void, info: AnalysisViewInfo, data_mgr: DataManager) {
        super(logger, writer) ;
        this.info_ = info ;
        this.data_mgr_ = data_mgr ;
    }


    // #region single team display
    public get singleTeamData() : IPCAnalysisConfigData {
        return this.info_.single_team_data_ ;
    }

    public deleteSingleTeam(name: string) {
        this.deleteOne(name, this.info_.single_team_data_.data) ;
    }

    public updateSingleTeamConfig(one: IPCAnalysisViewConfig) {
        this.updateOne(one, this.info_.single_team_data_.data) ;
    }

    public updateSingleTeamCurrent(one: string) {
        this.info_.single_team_data_.current = one ;
        this.write() ;
    }

    public findSingleTeam(name: string) : IPCAnalysisViewConfig | undefined {
        return this.findOne(name, this.info_.single_team_data_.data) ;
    }

    // #endregion

    // #region graphs
    public get graphs() : IPCAnalysisConfigData {
        return this.info_.team_graph_data_
    }    
    
    public deleteGraph(name: string) {
        this.deleteOne(name, this.info_.team_graph_data_.data) ;
    }

    public updateGraph(one: IPCAnalysisViewConfig) {
        this.updateOne(one, this.info_.team_graph_data_.data) ;
    }

    public findGraphByName(name: string) : IPCAnalysisViewConfig | undefined {
        return this.findOne(name, this.info_.team_graph_data_.data) ;
    }
    // #endregion

    // #region general functions

    public deleteOne(name: string, data: IPCAnalysisViewConfig[]) {
        let index = data.findIndex(item => item.name === name);
        if (index !== -1) {
            data.splice(index, 1);
        }
        this.write();
    }

    public updateOne(one: IPCAnalysisViewConfig, data: IPCAnalysisViewConfig[]) {
        let index = data.findIndex(item => item.name === one.name);
        if (index !== -1) {
            data[index] = one;
        } else {
            data.push(one);
        }
        this.write();
    }

    public findOne(name: string, data: IPCAnalysisViewConfig[]) : IPCAnalysisViewConfig | undefined {
        if (name === undefined || name.length === 0) {
            return undefined ;
        }

        return data.find(item => item.name === name);
    }

    // #endregion
}