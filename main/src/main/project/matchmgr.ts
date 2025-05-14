import { SCBase } from "../apps/scbase";
import { BAMatch } from "../extnet/badata";
import { Manager } from "./manager";
import winston from "winston";

export class MatchInfo {
    public matches_ : BAMatch[] = [] ;                                    // The set of matches for the event
}

export interface ManualMatchData {
    comp_level: string,
    set_number: number,
    match_number: number,
    red: [number, number, number],
    blue: [number, number, number]
}

export class MatchManager extends Manager {
    private info_: MatchInfo ;

    constructor(logger: winston.Logger, writer: () => void, info: MatchInfo) {
        super(logger, writer) ;
        this.info_ = info ;
    }

    public hasMatches() : boolean {
        return this.info_.matches_ && this.info_.matches_.length > 0 ;
    }

    public getMatches() : BAMatch[] {
        return this.info_.matches_ ;
    }

    public clearMatches() : void {
        this.info_.matches_ = [] ;
    }

    public findMatchByKey(key: string) : BAMatch | undefined {
        let ret: BAMatch | undefined ;

        if (this.info_.matches_) {
            for(let one of this.info_.matches_) {
                if (one.key === key) {
                    ret = one ;
                    break ;
                }
            }
        }

        return ret;
    }

    public setBAMatchData(data: BAMatch[]) {
        this.info_.matches_ = data ;
        this.write() ;
    }

    public async setMatchData(data: ManualMatchData[]) {
        let bamatches: BAMatch[] = [] ;
        for(let d of data) {
            let match: BAMatch = {
                key: d.comp_level + '-' + d.set_number + '-' + d.match_number,
                comp_level: d.comp_level,
                set_number: d.set_number,
                match_number: d.match_number,
                alliances: {
                  red: {
                    score: 0,
                    team_keys: ['frc-' + d.red[0], 'frc-' + d.red[1], 'frc-' + d.red[2]],
                    surrogate_team_keys: [],
                    dq_team_keys: []
                  },
                  blue: {
                    score: 0,
                    team_keys: ['frc-' + d.blue[0], 'frc-' + d.blue[1], 'frc-' + d.blue[2]],
                    surrogate_team_keys: [],
                    dq_team_keys: []
                  }
                },
                winning_alliance: '',
                event_key: '',
                time: 0,
                actual_time: 0,
                predicted_time: 0,
                post_result_time: 0,
                score_breakdown: {
                  blue: undefined,
                  red: undefined,
                },
                videos: []
            } ;
            bamatches.push(match) ;
        }
        this.setBAMatchData(bamatches) ;
    }

    public getMatchResults(teamnumber: number) {
        let ret: BAMatch[] = [] ;

        if (this.info_.matches_) {
            for(let m of this.info_.matches_) {
                if (this.doesMatchContainTeam(m, teamnumber)) {
                    ret.push(m) ;
                }
            }
        }

        return ret ;
    }    

    private doesMatchContainTeam(match: BAMatch, team: number) {
        for(let i = 0 ; i < 3 ; i++) {
            let num: number ;

            num = SCBase.keyToTeamNumber(match.alliances.red.team_keys[i]) ;
            if (num === team) {
                return true ;
            }

            num = SCBase.keyToTeamNumber(match.alliances.blue.team_keys[i]) ;
            if (num === team) {
                return true ;
            }
        }

        return false;
    }    
}
