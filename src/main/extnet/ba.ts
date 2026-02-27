import { ClientRequest, IncomingMessage, net } from 'electron';
import { BAAlliances, BAEvent, BAMatch, BAOprData, BARankings, BATeam } from './badata';
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

    public async getAlliances(evkey: string) : Promise<BAAlliances[]> {
        let str = process.env.XEROSCOUTDEBUG ;
        let query = "/event/" + evkey + "/alliances" ;
        let ret: Promise<BAAlliances[]> = new Promise<BAAlliances[]>((resolve, reject) => {
            if (str && str.indexOf('noplayoffs') !== -1) {
                resolve([]) ;
                return ;
            }
            this.request(query)
                .then((obj) => {
                    resolve(obj) ;
                })
                .catch((err) => {
                    reject(err) ;
                });
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
            let str = process.env.XEROSCOUTDEBUG ;

            //
            // If the string 'nomatches' is in the environment variable, return an empty array.  This is used to simulate
            // the pre-match scenario, where the teams are known but the matches schedule is not available yet.
            //
            if (str && str.indexOf('nomatches') !== -1) {
                resolve([]) ;
                return ;
            }

            let query = "/event/" + evkey + "/matches" ;
            this.request(query)
                .then((obj) => {
                    if (str) {
                        //
                        // If the string 'noplayoffs' is in the environment variable, filter out playoff matches.  To simulate the
                        // pre-playoff scenario, have the XEROSCOUTDEBUG environment variable contain the word noplayoffs.
                        //
                        if (str && str.indexOf('noplayoffs') !== -1) {
                            obj = obj.filter((match: BAMatch) => {
                                return match.comp_level !== 'f' && match.comp_level !== 'sf'  ;
                            });                        
                        }

                        //
                        // If the string 'noscores' is not in the environment variable add in the score breakdowns.  To simulate the
                        // pre-match scenario, have the XEROSCOUTDEBUG environment variable contain the word noscores.  Note if the word
                        // noplayoffs is also in the environment variable, it will filter out the playoff matches and therefore any scores
                        // assocaited with playoff matches.
                        //
                        if (str && str.indexOf('noscores') !== -1) {
                            for(let one of obj) {
                                one.score_breakdown = undefined ;
                            }                            
                        }
                    }
                    if (!obj) {
                        resolve([]) ;
                    }
                    else {
                        resolve(obj) ;
                    }
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

