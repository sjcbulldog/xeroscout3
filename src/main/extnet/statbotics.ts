import { NetBase } from "./netbase";

export class StatBotics extends NetBase {
    private static readonly statboticsURL: string = "api.statbotics.io" ;
    private static readonly statboticsPrefix: string = "/v3" ;

    private year_: number ;

    public constructor(year: number) {
        super(StatBotics.statboticsURL, StatBotics.statboticsPrefix) ;

        this.year_ = year ;
    }

    public getStatsEvent(key: string, teams: number[]) : Promise<any> {
        let ret = new Promise<any[]>((resolve, reject) => {
            let promises: Promise<any>[] = [] ;

            for(let team of teams) {
                let req = this.request('/team_event/' + team + '/' + key) ;
                promises.push(req) ;
            }

            Promise.all(promises)
                .then((results) => {
                    resolve(results) ;
                })
                .catch((err) => {
                    reject(err);
                })
        }) ;
        return ret;
    }

    public getStatsYear(teams: number[]) : Promise<any[]> {
        let ret = new Promise<any[]>((resolve, reject) => {
            let promises: Promise<any>[] = [] ;

            for(let team of teams) {
                let req = this.request('/team_year/' + team + '/' + this.year_) ;
                promises.push(req) ;
            }

            Promise.all(promises)
                .then((results) => {
                    resolve(results) ;
                })
                .catch((err) => {
                    reject(err);
                })
        }) ;
        return ret;
    }
}