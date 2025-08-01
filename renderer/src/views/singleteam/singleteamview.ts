import { ColumnDefinition, TabulatorFull } from "tabulator-tables";
import { XeroApp } from "../../apps/xeroapp.js";
import { IPCAnalysisData, IPCAnalysisViewConfig } from "../../shared/ipc.js";
import { AnalysisView } from "../analysis/analysisview.js";
import { DataValue } from "../../shared/datavalue.js";

export class SingleTeamView extends AnalysisView {
    private data_? : TabulatorFull ;
    private matches_? : TabulatorFull ;
    private datadiv_? : HTMLDivElement ;
    private matchesdiv_? : HTMLDivElement ;

    constructor(app: XeroApp) {
        super(app, 'xero-singleteam-view', 'single-team', 'Single Team');
    }

    protected display(analysis: IPCAnalysisData, config: IPCAnalysisViewConfig) : void {
        this.reset() ;

        if (analysis.message) {
            this.startupMessage(analysis.message);
            return ;
        }

        this.datadiv_ = document.createElement('div');
        this.elem.appendChild(this.datadiv_);
        this.data_ = new TabulatorFull(this.datadiv_, {
            data: this.createData(analysis.data!),
            columns: this.createColumnDesc(analysis.data![0])
        });

        this.matchesdiv_ = document.createElement('div');        
        this.elem.appendChild(this.matchesdiv_);        
    }

    private createData(data: any[]) : any[] {
        let result: any[] = [] ;
        for(let one of data) {
            let row: any = { team_number: one.team_number } ;
            for(let key of Object.keys(one)) {
                if (key === 'team_number') {
                    continue ;
                }
                if (Array.isArray(one[key])) {
                    let str = '' ;
                    for(let item of one[key]) {
                        if (str.length > 0) {
                            str += ', ' ;
                        }
                        str += DataValue.toDisplayString(item) ;
                    }
                    row[key] = str ;
                } else {
                    row[key] = one[key] ;
                }
            }
            result.push(row) ;
        }
        return result ;
    }

    private createColumnDesc(one: any) : ColumnDefinition[] {
        let defs: ColumnDefinition[] = [] ;
        defs.push(            {
                title: 'Team',
                field: 'team_number'
            });

        for(let key of Object.keys(one)) {
            if (key === 'team_number') {
                continue ;
            }

            let desc : ColumnDefinition = {
                title: key,
                field: key
            };
            defs.push(desc);
        }

        return defs ;
    }
}
