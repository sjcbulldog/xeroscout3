import { IPCPlayoffStatus } from "../../shared/ipc";
import { SCBase } from "../apps/scbase";
import { BAAlliances, BAMatch } from "../extnet/badata";
import { Manager } from "./manager";
import winston from "winston";
import { MatchManager } from "./matchmgr";

export class PlayoffManager extends Manager {
    private playoffData_: IPCPlayoffStatus ;
    private matchManager_: MatchManager ;

    public constructor(logger: winston.Logger, writer: () => void, playoffData: IPCPlayoffStatus, matchmgr: MatchManager) {
        super(logger, writer) ;
        this.playoffData_ = playoffData ;
        this.matchManager_ = matchmgr ;
    }
    
    public get info() : IPCPlayoffStatus {
        return this.playoffData_ ;
    }

    public hasPlayoffStatus() : boolean {
        return this.areAlliancesSet() ;
    }

    public processAllianceData(alliances: BAAlliances[]) : void {
        if (!alliances || !Array.isArray(alliances) || alliances.length !== 8) {
            return ;
        }

        let index = 0 ;
        for(let alliance of alliances) {
            let t1 = SCBase.keyToTeamNumber(alliance.picks[0]) ;
            let t2 = SCBase.keyToTeamNumber(alliance.picks[1]) ;
            let t3 = SCBase.keyToTeamNumber(alliance.picks[2]) ;
            this.playoffData_.alliances[index] = { teams: [t1, t2, t3] } ;
            index++ ;
        }

        this.extractMatchResults() ;
        this.write() ;
    }

    public setAllianceTeams(alliance: number, teams: number[]) : void {
        if (alliance < 1 || alliance > 8 || !Array.isArray(teams) || teams.length !== 3) {
            return ;
        }

        let t : [number, number, number] = [teams[0], teams[1], teams[2]] ;
        this.playoffData_.alliances[alliance - 1] = { teams: t } ;
        this.write() ;
    }

    public setPlayoffMatchOutcome(match: number, winner: number, loser: number) : void {
        this.playoffData_.outcomes[`m${match}` as keyof typeof this.playoffData_.outcomes] = {
            winner: winner,
            loser: loser,
        } ;
        this.write() ;
    }

    private areAlliancesSet() : boolean {
        if (!this.info.alliances.length) {
            return false ;
        }

        if (!this.info.alliances) {
            return false ;
        }

        if (!Array.isArray(this.info.alliances) || this.info.alliances.length !== 8) {
            return false ;
        }

        for(let a of this.info.alliances) {
            if (!a || !Array.isArray(a.teams) || a.teams.length !== 3) {
                return false ;
            }

            if (!a.teams[0] || !a.teams[1] || !a.teams[2]) {
                return false ;
            }
        }

        return true ;
    }

    private findAllianceByTeam(team: number) : number {
        for(let i = 0 ; i < this.playoffData_.alliances.length ; i++) {
            let alliance = this.playoffData_.alliances[i] ;
            if (alliance!.teams.includes(team)) {
                return i + 1 ;
            }
        }

        return -1 ;
    }

    private extractMatchResults() : void {
        // sf, set_number #, match_number 1
        // f, set_number 1, match_number #

        for(let sf = 1 ; sf <= 13 ; sf++) {
            let m: BAMatch | undefined = this.matchManager_.findMatchByInfo("sf", sf, 1) ;
            if (m) {
                let wteam = SCBase.keyToTeamNumber(m.alliances.red.team_keys[0]) ;
                let lteam = SCBase.keyToTeamNumber(m.alliances.blue.team_keys[0]) ;

                if (m.winning_alliance === 'blue') {
                    wteam = SCBase.keyToTeamNumber(m.alliances.blue.team_keys[0]) ;
                    lteam = SCBase.keyToTeamNumber(m.alliances.red.team_keys[0]) ;
                }
                let wa = this.findAllianceByTeam(wteam) ;
                let la = this.findAllianceByTeam(lteam) ;

                if (wa !== -1 && la !== -1) {
                    this.playoffData_.outcomes[`m${sf}` as keyof typeof this.playoffData_.outcomes] = {
                        winner: wa,
                        loser: la,
                    }
                }
            }
        }

        for(let f = 1 ; f <= 3 ; f++) {
            let m: BAMatch | undefined = this.matchManager_.findMatchByInfo("f", 1, f) ;
            if (m) {
                let wteam = SCBase.keyToTeamNumber(m.alliances.red.team_keys[0]) ;
                let lteam = SCBase.keyToTeamNumber(m.alliances.blue.team_keys[0]) ;

                if (m.winning_alliance === 'blue') {
                    wteam = SCBase.keyToTeamNumber(m.alliances.blue.team_keys[0]) ;
                    lteam = SCBase.keyToTeamNumber(m.alliances.red.team_keys[0]) ;
                }
                let wa = this.findAllianceByTeam(wteam) ;
                let la = this.findAllianceByTeam(lteam) ;

                if (wa !== -1 && la !== -1) {
                    this.playoffData_.outcomes[`m${f + 13}` as keyof typeof this.playoffData_.outcomes] = {
                        winner: wa,
                        loser: la,
                    }
                    this.playoffData_.outcomes[`m${f + 13}` as keyof typeof this.playoffData_.outcomes] = undefined ;                    
                }
            }
            else {
                this.playoffData_.outcomes[`m${f + 13}` as keyof typeof this.playoffData_.outcomes] = undefined ;
            }
        }
    }

}