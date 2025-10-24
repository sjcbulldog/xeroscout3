import { IPCGraphConfig, IPCGraphData, IPCDataItemData } from "../../shared/ipc";
import { DataManager } from "./datamgr";
import { DataSetManager } from "./datasetmgr";
import { Manager } from "./manager";
import winston from "winston";

export class GraphInfo {
    public single_team_configs_ : IPCGraphConfig[] = [] ;   
    public coach_configs_ : IPCGraphConfig[] = [] ;
}

export class GraphManager extends Manager {
    private info_: GraphInfo ;
    private data_mgr_ : DataManager ;
    private dataset_mgr_ : DataSetManager ;

    constructor(logger: winston.Logger, writer: () => void, info: GraphInfo, data_mgr: DataManager, dataset_mgr: DataSetManager) {
        super(logger, writer) ;
        this.info_ = info ;
        this.data_mgr_ = data_mgr ;
        this.dataset_mgr_ = dataset_mgr ;

        if (this.info_.single_team_configs_ === undefined) {
            this.info_.single_team_configs_ = [] ;
        }

        if (this.info_.coach_configs_ === undefined) {
            this.info_.coach_configs_ = [] ;
        }
    }

    public get singleTeamConfigs() : IPCGraphConfig[] {
        return this.info_.single_team_configs_ ;
    }

    public set singleTeamConfigs(configs: IPCGraphConfig[]) {
        this.info_.single_team_configs_ = configs ;
        this.write() ;
    }

    public get allConfigs() : IPCGraphConfig[] {
        return [...this.info_.single_team_configs_, ...this.info_.coach_configs_] ;
    }

    public get coachConfigs() : IPCGraphConfig[] {
        return this.info_.coach_configs_ ;
    }

    public set coachConfigs(configs: IPCGraphConfig[]) {
        this.info_.coach_configs_ = configs ;
        this.write() ;
    }

    public generateGraphData(config: IPCGraphConfig) : Promise<IPCGraphData> {
        let ret = new Promise<IPCGraphData>(async (resolve, reject) => {
            let data : IPCGraphData = {
                config: config.name,
                teams: [],
                items: []
            } ;

            for(let team of config.teams) {
                data.teams.push(team) ;
            }

            for(let item of [...config.leftitems, ...config.rightitems]) {
                let one : IPCDataItemData = {
                    name: item.name,
                    values: []
                };
                data.items.push(one) ;
                for(let team of config.teams) {
                    let ds = this.dataset_mgr_.findDataSet(item.dataset) ;
                    let idata = await this.data_mgr_.getData(ds, item.name, team) ;
                    one.values.push(idata) ;
                }   
            }
            resolve(data) ;
        }) ;
        return ret;
    }
}