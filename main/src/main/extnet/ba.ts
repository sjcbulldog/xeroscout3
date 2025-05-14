import { ClientRequest, IncomingMessage, net } from 'electron';
import { BAEvent, BAMatch, BAOprData, BARankings, BATeam } from './badata';
import { NetBase } from './netbase';

export class BlueAlliance extends NetBase {
    private static BlueAllianceHost: string = "www.thebluealliance.com" ;
    private static BlueAlliancePrefix: string = "/api/v3" ;
    private static BlueAllianceAPIKey: string = "cgbzLmpXlA5GhIew3E4xswwLqHOm4j0hQ1Mizvg71zkuQZIazcXgf3dd8fguhpxC";

    private year_ : number ;
    private max_season_ : number ;
    private req_? : ClientRequest ;

    constructor(year?: number) {
        super(BlueAlliance.BlueAllianceHost, BlueAlliance.BlueAlliancePrefix, BlueAlliance.BlueAllianceAPIKey) ;

        if (year) {
            this.year_ = year ;
        }
        else {
            this.year_ = -1 ;
        }
        this.max_season_ = -1 ;
    }

    public async init() : Promise<boolean> {
        let ret: Promise<boolean> = new Promise<boolean>((resolve, reject) => {
            this.request('/status')
                .then((obj) => {
                    if (obj.current_season && this.year_ == -1) {
                        this.year_ = obj.current_season ;
                    }

                    if (obj.max_season) {
                        this.max_season_ = obj.max_season ;
                    }

                    resolve(!obj.is_datafeed_down) ;
                })
                .catch((err) => {
                    reject(err) ;                    
                })
        }) ;

        return ret;
    }

    public async getEvents(year ?:number) : Promise<BAEvent[]> {
        if (!year) {
            year = this.year_ ;
        }
        
        let ret: Promise<BAEvent[]> = new Promise<BAEvent[]>((resolve, reject) => {
            let query = "/events/" + year + "/simple" ;
            this.request(query)
                .then((obj) => {
                    resolve(obj) ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
        }) ;

        return ret;
    }

    public async getRankings(evkey: string) : Promise<BARankings> {
        let ret: Promise<BARankings> = new Promise<BARankings>((resolve, reject) => {
            let query = "/event/" + evkey + "/rankings" ;
            this.request(query)
                .then((rankings) => {
                    resolve(rankings) ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
            }) ;
        return ret ;
    }

    public async getOPR(evkey: string) : Promise<BAOprData> {
        let ret: Promise<BAOprData> = new Promise<BAOprData>((resolve, reject) => {
            let query = "/event/" + evkey + "/oprs" ;
            this.request(query)
                .then((rankings) => {
                    resolve(rankings) ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
            }) ;
        return ret ;
    }

    public async getMatches(evkey: string) : Promise<BAMatch[]> {
        let ret: Promise<BAMatch[]> = new Promise<BAMatch[]>((resolve, reject) => {
            let query = "/event/" + evkey + "/matches" ;
            this.request(query)
                .then((obj) => {
                    let str = process.env.XEROSCOUTDEBUG ;
                    if (str && str?.indexOf('noresults') != -1) {
                        for(let one of obj) {
                            one.score_breakdown = undefined ;
                        }
                    }
                    resolve(obj) ;
                })
                .catch((err) => {
                    reject(err) ;
                });
            });

        return ret ;
    }

    public async getTeams(evkey:string) : Promise<BATeam[]> {
        let ret: Promise<BATeam[]> = new Promise<BATeam[]>((resolve, reject) => {
            let query = "/event/" + evkey + "/teams" ;
            this.request(query)
                .then((obj) => {
                    resolve(obj) ;             
                })
                .catch((err) => {
                    reject(err) ;
                })
        }) ;

        return ret ;        
    }


}

