import winston from "winston" ;
import { format } from '@fast-csv/format';
import fs from 'fs';
import { DataSetManager } from './datasetmgr';
import { TeamManager } from './teammgr';
import { Manager } from './manager';

export interface ProjPicklistNotes
{
    teamnumber: number,
    picknotes: string
}

export interface ProjPicklistData {
    name: string ;
    teams: number[] ;
}

export interface ProjPickListColConfig {
    name: string ;
    width: number ;
}

export interface ProjPickListCols {
    name: string ;
    cols: ProjPickListColConfig[] ;
}

export interface PickList {
    name: string ;
    dataset: string ;
    rank: number[] ;
    notes: ProjPicklistNotes[];
    cols: ProjPickListColConfig[] ;                            // Columns are defined by dataset, this defines the order and width
}

export class PickListData {
    public picklist_ : PickList[] = [] ;                // Pick list, a list of team number
    public last_picklist_? : string ;                   // The last picklist used    
}

export class PicklistMgr extends Manager {
    private info_ : PickListData ;
    private team_mgr_ : TeamManager ;
    private dset_mgr_ : DataSetManager ;

    constructor(logger: winston.Logger, writer : () => void, info: PickListData, teams: TeamManager, dset: DataSetManager) {
        super(logger, writer) ;
        this.dset_mgr_ = dset ;
        this.team_mgr_ = teams ;
        this.info_ = info ;
    }

    public getPicklists() : PickList[] {
        return this.info_.picklist_ ;
    }

    public findPicklistByName(name: string) : PickList | undefined {
        for(let picklist of this.info_.picklist_) {
            if (picklist.name === name)
                return picklist ;
        }

        return undefined ;
    }

    public setPicklistNotes(name: string, notes: ProjPicklistNotes[]) {
        let picklist = this.findPicklistByName(name) ;
        if (picklist) {
            picklist.notes = notes ;
        }
        this.write() ;
    }

    public updatePicklistData(name: string, teams: number[]) {
        let picklist = this.findPicklistByName(name) ;
        if (picklist) {
            picklist.rank = teams ;
            this.write() ;
        }
    }

    public updatePicklistCols(name: string, cols: ProjPickListColConfig[]) {
        let picklist = this.findPicklistByName(name) ;
        if (picklist) {
            picklist.cols = cols ;
            this.write() ;
        }
    }
    
    public deletePicklist(name: string) : boolean {
        let which = -1 ;
        for(let i = 0 ; i < this.info_.picklist_.length; i++) {
            if(this.info_.picklist_[i].name === name) {
                which = i ;
                break ;
            }
        }

        if (which !== -1) {
            if (which === 0 && this.info_.picklist_.length === 1) {
                this.info_.picklist_ = [] ;
            }
            else {
                this.info_.picklist_.splice(which, 1) ;
            }
            this.write() ;
        }

        return which !== -1 ;
    }

    public addPicklist(name: string, dataset: string) {
        let ds = this.dset_mgr_.findDataSet(dataset) ;
        if (ds) {
            let cols: ProjPickListColConfig[] = [] ;
            for(let col of ds.fields) {
                let colcfg: ProjPickListColConfig = {
                    name: col,
                    width: 0
                }
                cols.push(colcfg) ;
            }
            let picklist = {
                name: name,
                dataset: dataset,
                notes: [],
                rank: ds.teams,
                cols: cols
            }
            this.info_.picklist_.push(picklist) ;
            this.info_.last_picklist_ = name ;
            this.write();
        }
    }

    public async exportPicklist(name: string, filename: string) : Promise<void> {
        interface MyObject {
            [key: string]: any; // Allows any property with a string key
        }

        let ret = new Promise<void>(async (resolve, reject) => {
            let picklist = this.findPicklistByName(name) ;
            if (picklist) {
                let ds = this.dset_mgr_.findDataSet(picklist.dataset) ;
                if (ds) {
                    let cols = ['rank', 'teamnumber', 'nickname', 'picknotes'] ;
                    for(let fname of ds.fields) {
                        cols.push(fname) ;
                    }
                    
                    const csvStream = format({ headers: cols, }) ; 
                    const outputStream = fs.createWriteStream(filename);
                    csvStream.pipe(outputStream).on('end', () => { 
                        csvStream.end() ;
                    }) ;

                    let rank = 1 ;
                    for(let team of ds.teams) {
                        let teamobj = this.team_mgr_.findTeamByNumber(team) ;
                        let record : MyObject = {
                            'rank' : rank++,
                            'teamnumber' : team,
                            'nickname' : teamobj?.nickname,
                            'notes' : this.getNotesFromPicklist(picklist, team),
                        };

                        for(let col of cols) {
                            if (col !== 'rank' && col != 'picknotes' && col != 'nickname' && col != 'teamnumber') {
                                try {
                                    let data = await this.dset_mgr_.getData(ds, col, team) ;
                                    record[col] = data ;
                                }
                                catch(err) {
                                    record[col] = 'Error' ;
                                }
                            }
                        }
                        csvStream.write(record) ;
                    }
                    csvStream.end();
                }
                resolve() ;
            }
        }) ;
        return ret;
    }

    public setLastPicklistUsed(name: string) {
        if (!this.info_.last_picklist_ || this.info_.last_picklist_ !== name) {
            this.info_.last_picklist_ = name ;
            this.write() ;
        }
    }

    public getLastPicklistUsed() : string {
        return this.info_.last_picklist_ || '' ;
    }

    private getNotesFromPicklist(picklist: PickList, team: number) : string {
        for(let notes of picklist.notes) {
            if (notes.teamnumber === team) {
                return notes.picknotes ;
            }
        }

        return '' ;
    }        
}