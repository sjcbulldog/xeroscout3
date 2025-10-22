import winston from "winston" ;
import { BATeam } from "../extnet/badata";
import { Manager } from "./manager";
import { IPCTeamInfo } from "../../shared/ipc";

export class TeamData {
    public teams_ : BATeam[] = [] ;                         // The set of teams at the event
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

    public getTeamsNickNameAndNumber(rank: boolean) : IPCTeamInfo[] {
        let ret: IPCTeamInfo[] = [] ;

        if (rank) {
            // TODO: If BA Rank is present, sort by that
            if (this.info_.teams_) {
                this.info_.teams_.map((t) => { ret.push({number: t.team_number, nickname: t.nickname}) ; }) ;
            }
        }
        else {
            if (this.info_.teams_) {
                this.info_.teams_.map((t) => { ret.push({number: t.team_number, nickname: t.nickname}) ; }) ;
            }
        }
        ret.sort((a, b) => (a.number - b.number)) ;
        return ret ;
    }

    public getSortedTeamNumbers(rank: boolean) : number[] {
        let ret: number[] = [] ;

        if (rank) {
            // TODO: if BA Rank is present, sort by that
            if (this.info_.teams_) {
                for(let t of this.info_.teams_) {
                    ret.push(t.team_number) ;
                }
            }
        }
        else {
            if (this.info_.teams_) {
                for(let t of this.info_.teams_) {
                    ret.push(t.team_number) ;
                }
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

    public setTeamData(data: IPCTeamInfo[]) {
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