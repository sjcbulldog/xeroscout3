import winston from "winston";
import { Manager } from "./manager";
import { TeamManager } from "./teammgr";
import { MatchManager } from "./matchmgr";


export class Tablet {
    public name : string ;
    public purpose?: string ;
    public assigned?: boolean ;

    constructor(name: string) {
        this.name = name ;
    }
}

export class TeamTablet {
    public team: number ;
    public tablet: string ;

    constructor(team: number, tablet: string) {
        this.team = team ;
        this.tablet = tablet ;
    }
}

export class MatchTablet {
    public comp_level: string ;
    public match_number: number ;
    public set_number: number ;
    public teamkey: string ;
    public tablet: string ;
    public alliance: string ;

    constructor(type: string, number: number, set: number, alliance: string, teamkey: string, tablet: string) {
        this.comp_level = type ;
        this.match_number = number ;
        this.set_number = set ;
        this.alliance = alliance ;
        this.teamkey = teamkey ;
        this.tablet = tablet ;
    }
}

export interface TabletData {
    name: string,
    purpose: string
}

export class TabletInfo {
    public tablets_ : Tablet[] = [] ;                       // The set of tablets to be used for scouting
    public teamassignments_: TeamTablet[] = [] ;            // The tablets assignments to teams for team scouting
    public matchassignements_: MatchTablet[] = [] ;         // The tablets assignments to matches for match scouting
}

export class TabletManager extends Manager {
    private static readonly tabletTeam: string = "team" ;
    private static readonly tabletMatch: string = "match" ;

    private info_ : TabletInfo ;
    private team_mgr_ : TeamManager ;
    private match_mgr_ : MatchManager ;

    constructor(logger: winston.Logger, writer: () => void, info: TabletInfo, team_mgr: TeamManager, match_mgr: MatchManager) {
        super(logger, writer) ;
        this.info_ = info ;
        this.team_mgr_ = team_mgr ;
        this.match_mgr_ = match_mgr ;
    }

    public getTablets() : Tablet[] {
        return this.info_.tablets_ ;
    }

    public isTabletTeam(tablet: string) {
        for(let assign of this.info_.teamassignments_!) {
            if (assign.tablet === tablet) {
                return true ;
            }
        }

        return false ;
    }    

    public areTabletsValid() : boolean {
        let matchcnt = 0 ;
        let teamcnt = 0 ;

        if (this.info_.tablets_) {
            for(let tablet of this.info_.tablets_) {
                if (tablet && tablet.purpose && tablet.purpose === TabletManager.tabletTeam) {
                    teamcnt++ ;
                }

                if (tablet && tablet.purpose && tablet.purpose === TabletManager.tabletMatch) {
                    matchcnt++ ;
                }
            }

        }

        return teamcnt >= 1 && matchcnt >= 6 ;
    }

    public hasTeamAssignments() : boolean {
        return this.info_.teamassignments_ && this.info_.teamassignments_.length > 0 ;
    }

    public hasMatchAssignments() : boolean {
        return this.info_.matchassignements_ && this.info_.matchassignements_.length > 0 ;
    }

    public getTeamAssignments() : TeamTablet[] {
        return this.info_.teamassignments_ ;
    }

    public getMatchAssignments() : MatchTablet[] {
        return this.info_.matchassignements_ ;
    }
  
    public generateTabletSchedule() : boolean {
        if (!this.generateTeamTabletSchedule()) {
            return false ;
        }

        if (this.match_mgr_.hasMatches()) {
            if (!this.generateMatchTabletSchedule()) {
                return false ;
            }
        }
        
        return true ;
    }

    public clearScoutingSchedules() {
        this.info_.teamassignments_ = [] ;
        this.info_.matchassignements_ = [] ;
    }

    public setTabletData(data:TabletData[]) {
        this.info_.tablets_ = [] ;
        for(let tab of data) {
            let t = new Tablet(tab.name) ;
            if (tab.purpose) {
                t.purpose = tab.purpose ;
            }

            this.info_.tablets_.push(t) ;
        }

        this.write() ;
    }    
        
    private getTabletsForPurpose(purpose: string) : Tablet[] {
        let ret: Tablet[] = [] ;

        if (this.info_.tablets_) {
            for(let t of this.info_.tablets_) {
                if (t.purpose && t.purpose === purpose) {
                    ret.push(t) ;
                }
            }
        }
        return ret ;
    }

    public incrementallyGenerateMatchSchedule() : boolean {
        // TODO: write this when incrementally new matches are provided (e.g. elims)
        return false ;
    }

    public findTabletForMatch(complevel: string, setno: number, matchno: number, teamkey: string) : string {
        // TODO: write me
        return '' ;
    }
    
    private generateTeamTabletSchedule() : boolean {
        let teamtab: Tablet[] = this.getTabletsForPurpose(TabletManager.tabletTeam) ;
        if (teamtab.length < 1 || !this.team_mgr_.hasTeams()) {
            return false;
        }

        let index = 0 ;
        this.info_.teamassignments_ = [] ;
        for(let t of this.team_mgr_.getTeams()) {
            let assignment = new TeamTablet(t.team_number, teamtab[index].name) ;
            this.info_.teamassignments_.push(assignment);
            index++ ;
            if (index >= teamtab.length) {
                index = 0 ;
            }
        }

        return true ;
    }
    
        public generateMatchTabletSchedule() : boolean {
            let matchtab: Tablet[] = this.getTabletsForPurpose(TabletManager.tabletMatch) ;
            if (!this.match_mgr_.hasMatches() || matchtab.length < 6) {
                return false ;
            }
    
            let ma:MatchTablet ;
            let index = 0 ;
            this.info_.matchassignements_ = [] ;
    
            for(let m of this.match_mgr_.getMatches()) {
                ma = new MatchTablet(m.comp_level, m.match_number, m.set_number, 'red', m.alliances.red.team_keys[0], matchtab[index].name) ;
                index++ ;
                if (index >= matchtab.length) {
                    index = 0 ;
                }
                this.info_.matchassignements_.push(ma) ;
    
                ma = new MatchTablet(m.comp_level, m.match_number, m.set_number, 'red', m.alliances.red.team_keys[1], matchtab[index].name) ;
                index++ ;
                if (index >= matchtab.length) {
                    index = 0 ;
                }       
                this.info_.matchassignements_.push(ma) ;
    
                ma = new MatchTablet(m.comp_level, m.match_number, m.set_number, 'red', m.alliances.red.team_keys[2], matchtab[index].name) ;
                index++ ;
                if (index >= matchtab.length) {
                    index = 0 ;
                }
                this.info_.matchassignements_.push(ma) ;
    
                ma = new MatchTablet(m.comp_level, m.match_number, m.set_number, 'blue', m.alliances.blue.team_keys[0], matchtab[index].name) ;
                index++ ;
                if (index >= matchtab.length) {
                    index = 0 ;
                }
                this.info_.matchassignements_.push(ma) ;
    
                ma = new MatchTablet(m.comp_level, m.match_number, m.set_number, 'blue', m.alliances.blue.team_keys[1], matchtab[index].name) ;
                index++ ;
                if (index >= matchtab.length) {
                    index = 0 ;
                }            
                this.info_.matchassignements_.push(ma) ;
    
                ma = new MatchTablet(m.comp_level, m.match_number, m.set_number, 'blue', m.alliances.blue.team_keys[2], matchtab[index].name) ;
                index++ ;
                if (index >= matchtab.length) {
                    index = 0 ;
                }
                this.info_.matchassignements_.push(ma) ;
            }
    
            return true ;
        }
}
