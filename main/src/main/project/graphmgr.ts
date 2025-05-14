import { DataManager } from "./datamgr";
import { Manager } from "./manager";
import winston from "winston";

export interface GraphConfig {
    name: string;
    teams: number[];
    data: {
      leftteam: string[];
      leftmatch: string[];
      rightteam: string[];
      rightmatch: string[];
    };
}

export class GraphInfo {
    public team_graph_data_: GraphConfig[] = [] ;                // Stored graphs defined by the user
}

export class GraphManager extends Manager {
    private info_: GraphInfo ;
    private data_mgr_ : DataManager ;

    constructor(logger: winston.Logger, writer: () => void, info: GraphInfo, data_mgr: DataManager) {
        super(logger, writer) ;
        this.info_ = info ;
        this.data_mgr_ = data_mgr ;
    }

    public getGraphs() : GraphConfig[] {
        return this.info_.team_graph_data_
    }
    
    public deleteGraph(name: string) {
        let index = -1 ;

        let i = 0 ;
        for(let gr of this.info_.team_graph_data_) {
            if (gr.name === name) {
                index = i ;
                break ;
            }

            i++ ;
        }

        if (index !== -1) {
            this.info_.team_graph_data_.splice(index, 1) ;
        }

        this.write() ;
    }    

    public findGraphByName(name: string) : GraphConfig | undefined {
        for(let gr of this.info_.team_graph_data_) {
            if (gr.name === name) {
                return gr ;
            }
        }

        return undefined ;
    }

    public storeGraph(desc: GraphConfig) {
        let index = -1 ;

        if (desc.name.length > 0) {
            let i = 0 ;
            for(let gr of this.info_.team_graph_data_) {
                if (gr.name === desc.name) {
                    index = i ;
                    break ;
                }

                i++ ;
            }

            if (index !== -1) {
                this.info_.team_graph_data_[index] = desc ;
            }
            else {
                this.info_.team_graph_data_.push(desc) ;
            }
            this.write() ;
        }
    }

     async createTeamDataset(teams: number[], data: string, yaxis: string): Promise<any> {
    	let ret = new Promise<any>(async (resolve, reject) => {
    		try {
    			let values = await this.data_mgr_!.getAllTeamData()
    			//
    			// Should be one record per team
    			//
    			let dvals = [];
    			for (let record of values) {
    				dvals.push(record[data]);
    			}

    			let dset = {
    				label: data,
    				data: dvals,
    				yAxisID: yaxis,
    			};
    			resolve(dset);
    		} catch (err) {
    			reject(err);
    		}
    	});
    	return ret;
    }

    public createMatchDataset(teams: number[], data: string, yaxis: string): any {
    	let ret = new Promise<any>(async (resolve, reject) => {
    		let tdata = [];
    		for (let team of teams) {
    			let tkey = "frc" + team;
    			let values = await this.data_mgr_!.getAllMatchData() ;
    			let sum = 0.0;
    			for (let dval of values) {
    				sum += dval[data];
    			}
    			tdata.push(sum / values.length);
    		}

    		let dset = {
    			label: data,
    			data: tdata,
    			yAxisID: yaxis,
    		};
    		resolve(dset);
    	});
    	return ret;
    }    
}