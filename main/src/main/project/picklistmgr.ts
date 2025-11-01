import winston from "winston" ;
import { format } from '@fast-csv/format';
import fs from 'fs';
import { DataSetManager } from './datasetmgr';
import { TeamManager } from './teammgr';
import { Manager } from './manager';
import { DataManager } from "./datamgr";
import { FormulaManager } from "./formulamgr";
import { IPCPickListConfig, IPCPickListData, IPCPickListNotes, IPCPickListTeamData } from "../../shared/ipc";

export class PickListData {
    public picklist_ : IPCPickListConfig[] = [] ;           // Pick list, a list of team number
    public coaches_picklist_ : IPCPickListConfig[] = [] ;   // Coach pick list
}

export class PicklistMgr extends Manager {
    private info_ : PickListData ;
    private team_mgr_ : TeamManager ;
    private dset_mgr_ : DataSetManager ;
    private data_mgr_ : DataManager ;
    private formula_mgr_ : FormulaManager ; 

    constructor(logger: winston.Logger, writer : () => void, info: PickListData, teams: TeamManager, dset: DataSetManager, data: DataManager, formula: FormulaManager) {
        super(logger, writer) ;
        this.dset_mgr_ = dset ;
        this.team_mgr_ = teams ;
        this.info_ = info ;
        this.data_mgr_ = data ;
        this.formula_mgr_ = formula ;

        if (this.info_.picklist_ === undefined) {
            this.info_.picklist_ = [] ;
        }

        if (this.info_.coaches_picklist_ === undefined) {
            this.info_.coaches_picklist_ = [] ;
        }
    }

    public get centralPicklists() : IPCPickListConfig[] {
        return this.info_.picklist_ ;
    }

    public set centralPicklists(config: IPCPickListConfig[]) {
        this.info_.picklist_ = config ;
        this.write() ;
    }

    public get coachesPicklists() : IPCPickListConfig[] {
        return this.info_.coaches_picklist_ ;
    }

    public set coachesPicklists(config: IPCPickListConfig[]) {
        this.info_.coaches_picklist_ = config ;
        this.write() ;
    }

    public get allPicklists() : IPCPickListConfig[] {
        return [...this.info_.picklist_, ...this.info_.coaches_picklist_] ;
    }

    public getPicklistData(name: string) : Promise<IPCPickListData> {
        let ret = new Promise<IPCPickListData>(async (resolve, reject) => {
            this.logger_.debug(`[PicklistMgr] Starting load for picklist '${name}'`) ;
            try {
                const picklist = this.findPicklistByName(name) ;
                if (!picklist) {
                    const err = new Error(`Picklist '${name}' not found`) ;
                    this.logger_.error(`[PicklistMgr] ${err.message}`) ;
                    return reject(err) ;
                }

                this.logger_.debug(`[PicklistMgr] Picklist found: ${picklist.teams.length} teams, ${picklist.columns.length} columns`) ;

                const result : IPCPickListData = {
                    config: picklist,
                    data: []
                } ;

                for (const team of picklist.teams) {
                    this.logger_.debug(`[PicklistMgr] Loading data for team ${team}`) ;
                    const tdata : IPCPickListTeamData = {
                        team: team,
                        values: []
                    } ;
                    result.data.push(tdata) ;

                    for (const item of picklist.columns) {
                        this.logger_.debug(`[PicklistMgr]   Column '${item.label}' (dataset='${item.dataset}', field='${item.name}')`) ;

                        let ds = undefined ;
                        if (item.dataset && item.dataset.length > 0) {
                            ds = this.dset_mgr_.getDataSetByName(item.dataset) ;
                            if (!ds) {
                                const err = new Error(`Dataset '${item.dataset}' not found while loading picklist '${name}'`) ;
                                this.logger_.error(`[PicklistMgr] ${err.message}`) ;
                                throw err ;
                            }
                        } else {
                            this.logger_.debug(`[PicklistMgr]   No dataset specified, using default data scope`) ;
                        }

                        const d = await this.data_mgr_.getData(ds, item.name, team) ;
                        tdata.values.push(d) ;
                        this.logger_.debug(`[PicklistMgr]   Retrieved data for team ${team}, column '${item.label}'`) ;
                    }
                }

                this.logger_.debug(`[PicklistMgr] Completed load for picklist '${name}'`) ;
                resolve(result) ;
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error)) ;
                this.logger_.error(`[PicklistMgr] Failed loading picklist '${name}': ${err.message}`) ;
                reject(err) ;
            }
        });
        return ret;
    }

    public findPicklistByName(name: string) : IPCPickListConfig | undefined {
        for(let picklist of this.info_.picklist_) {
            if (picklist.name === name)
                return picklist ;
        }

        return undefined ;
    }

    public setPicklistNotes(data: IPCPickListNotes) {
        let picklist = this.findPicklistByName(data.name) ;
        if (picklist) {
            for(let i = 0 ; i < data.teams.length; i++) {
                let teamnumber = data.teams[i] ;
                let picknotes = data.notes[i] ;
                for(let j = 0 ; j < picklist.teams.length; j++) {
                    if (picklist.teams[j] === teamnumber) {
                        picklist.notes[j] = picknotes ;
                        break ;
                    }
                }
            }
        }
        this.write() ;
    }

    public updatePicklistConfig(config: IPCPickListConfig) {
        let index = this.info_.picklist_.findIndex((pl) => pl.name === config.name) ;
        if (index === -1) {
            this.info_.picklist_.push(config) ;
        }
        else {
            this.info_.picklist_[index] = config ;
        }
        this.write() ;
    }
}
