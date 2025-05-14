import winston from "winston" ;
import { BATeam } from "../extnet/badata";
import { Manager } from "./manager";

export class TeamData {
    public teams_ : BATeam[] = [] ;                         // The set of teams at the event
}

export interface TeamNickNameNumber {
    number : number,
    nickname: string
}

export class TeamManager extends Manager {
    private info_ : TeamData ;

    constructor(logger: winston.Logger, writer: () => void, info: TeamData) {
        super(logger, writer) ;
        this.info_ = info ;
    }

    public getTeams() : BATeam[] {
        return this.info_.teams_ ;
    }

    public getTeamsNickNameAndNumber() : TeamNickNameNumber[] {
        let ret: TeamNickNameNumber[] = [] ;

        if (this.info_.teams_) {
            for(let t of this.info_.teams_) {
                let team : TeamNickNameNumber = {
                    number: t.team_number,
                    nickname: t.nickname
                }
                ret.push(team) ;
            }
        }
        ret.sort((a, b) => (a.number - b.number)) ;
        return ret ;
    }

    public getSortedTeamNumbers() : number[] {
        let ret: number[] = [] ;

        if (this.info_.teams_) {
            for(let t of this.info_.teams_) {
                ret.push(t.team_number) ;
            }
        }
        ret.sort((a, b) => (a - b)) ;
        return ret ;
    }

    public hasTeams() : boolean {
        return this.info_.teams_ && this.info_.teams_.length > 0 ;
    }

    public findTeamByNumber(number: number) : BATeam | undefined {
        let ret: BATeam | undefined ;

        if (this.info_.teams_) {
            for(let t of this.info_.teams_) {
                if (t.team_number === number) {
                    ret = t ;
                    break ;
                }
            }   
        }

        return ret ;
    }    

    public setBATeamData(data: BATeam[]) {
        this.info_.teams_ = data ;
        this.write() ;
    }

    public setTeamData(data: TeamNickNameNumber[]) {
        let teams: BATeam[] = [] ;
        for(let d of data) {
            let team : BATeam = {
                key: 'frc' + d.number,
                team_number: d.number,
                nickname: d.nickname,
                name: d.nickname,
                school_name: '',
                city: '',
                state_prov: '',
                country: '',
                address: '',
                postal_code: '',
                gmaps_place_id: '',
                gmaps_url: '',
                lat: 0,
                lng: 0,
                location_name: '',
                website: '',
                rookie_year: 0
            }
            teams.push(team) ;
        }
        this.setBATeamData(teams) ;
    }    
}