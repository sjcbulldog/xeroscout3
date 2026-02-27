import winston from "winston";
import { Manager } from "./manager";
import { TeamManager } from "./teammgr";
import { MatchManager } from "./matchmgr";
import { SCBase } from "../apps/scbase";
import { BATeam } from "../extnet/badata";

export class Tablet {
    public name: string;
    public purpose?: string;
    public assigned?: boolean;

    constructor(name: string) {
        this.name = name;
    }
}

export class TeamTablet {
    public team: number;
    public tablet: string;
    public name: string;

    constructor(team: number, tablet: string, name: string) {
        this.team = team;
        this.tablet = tablet;
        this.name = name;
    }
}

export class MatchTablet {
    public comp_level: string;
    public match_number: number;
    public set_number: number;
    public teamnumber: number;
    public teamname: string;
    public tablet: string;
    public alliance: string;

    constructor(type: string, number: number, set: number, alliance: string, teamnum: number, name: string, tablet: string) {
        this.comp_level = type;
        this.match_number = number;
        this.set_number = set;
        this.alliance = alliance;
        this.teamnumber = teamnum;
        this.teamname = name;
        this.tablet = tablet;
    }
}

export interface TabletData {
    name: string,
    purpose: string
}

export type Alliance = 'red' | 'blue' ;

export interface PlayoffAssignment {
    match : number ;                    // sf: 1-13, f: 14-16
    tablet: string ;                    // The tablet name
    alliance: Alliance ;                // red/blue
    which: number ;                     // 0 = captian, 1 = first pick, 2 = second pick
}

export class TabletInfo {
    public tablets_: Tablet[] = [];                       // The set of tablets to be used for scouting
    public teamassignments_: TeamTablet[] = [];            // The tablets assignments to teams for team scouting
    public matchassignements_: MatchTablet[] = [];         // The tablets assignments to matches for match scouting
    public playoffassignments_ : PlayoffAssignment[] = [] ;
}

export class TabletManager extends Manager {
    private static readonly tabletTeam: string = "team";
    private static readonly tabletMatch: string = "match";

    private info_: TabletInfo;
    private team_mgr_: TeamManager;
    private match_mgr_: MatchManager;

    constructor(logger: winston.Logger, writer: () => void, info: TabletInfo, team_mgr: TeamManager, match_mgr: MatchManager) {
        super(logger, writer);
        this.info_ = info;
        this.team_mgr_ = team_mgr;
        this.match_mgr_ = match_mgr;
    }

    public getTablets(): Tablet[] {
        return this.info_.tablets_;
    }

    public isTabletTeam(tablet: string) {
        for (let assign of this.info_.teamassignments_!) {
            if (assign.tablet === tablet) {
                return true;
            }
        }

        return false;
    }

    public areTabletsValid(): boolean {
        let matchcnt = 0;
        let teamcnt = 0;

        if (this.info_.tablets_) {
            for (let tablet of this.info_.tablets_) {
                if (tablet && tablet.purpose && tablet.purpose === TabletManager.tabletTeam) {
                    teamcnt++;
                }

                if (tablet && tablet.purpose && tablet.purpose === TabletManager.tabletMatch) {
                    matchcnt++;
                }
            }

        }

        return teamcnt >= 1 && matchcnt >= 6;
    }

    public hasPlayoffAssignments() : boolean {
        return this.info_.playoffassignments_ && this.info_.playoffassignments_.length > 0 ;
    }

    public hasTeamAssignments(): boolean {
        return this.info_.teamassignments_ && this.info_.teamassignments_.length > 0;
    }

    public hasMatchAssignments(): boolean {
        return this.info_.matchassignements_ && this.info_.matchassignements_.length > 0;
    }

    public getPlayoffAssignments() : PlayoffAssignment[] {
        return this.info_.playoffassignments_ ;
    }

    public getTeamAssignments(): TeamTablet[] {
        return this.info_.teamassignments_;
    }

    public getMatchAssignments(): MatchTablet[] {
        return this.info_.matchassignements_;
    }

    public generateTabletSchedule(): boolean {
        if (!this.generateTeamTabletSchedule()) {
            return false;
        }

        if (this.match_mgr_.hasMatches()) {
            if (!this.generateMatchTabletSchedule()) {
                return false;
            }

            if (!this.generatePlayoffSchedule()) {
                return false ;
            }
        }

        return true;
    }

    public clearScoutingSchedules() {
        this.info_.teamassignments_ = [];
        this.info_.matchassignements_ = [];
    }

    public setTabletData(data: TabletData[]) {
        this.info_.tablets_ = [];
        for (let tab of data) {
            let t = new Tablet(tab.name);
            if (tab.purpose) {
                t.purpose = tab.purpose;
            }

            this.info_.tablets_.push(t);
        }

        this.write();
    }

    private getTabletsForPurpose(purpose: string): Tablet[] {
        let ret: Tablet[] = [];

        if (this.info_.tablets_) {
            for (let t of this.info_.tablets_) {
                if (t.purpose && t.purpose === purpose) {
                    ret.push(t);
                }
            }
        }
        return ret;
    }

    public incrementallyGenerateMatchSchedule(): boolean {
        // TODO: write this when incrementally new matches are provided (e.g. elims)
        return false;
    }

    public findTabletForMatch(complevel: string, setno: number, matchno: number, teamnum: number): string {
        let ret = '';
        for (let ma of this.info_.matchassignements_) {
            if (ma.comp_level === complevel && ma.set_number === setno && ma.match_number === matchno && ma.teamnumber === teamnum) {
                ret = ma.tablet;
                break;
            }
        }

        return ret;
    }

    private generateTeamTabletSchedule(): boolean {
        let teamtab: Tablet[] = this.getTabletsForPurpose(TabletManager.tabletTeam);
        if (teamtab.length < 1 || !this.team_mgr_.hasTeams()) {
            return false;
        }

        let index = 0;
        this.info_.teamassignments_ = [];
        for (let t of this.team_mgr_.getTeams()) {
            let assignment = new TeamTablet(t.team_number, teamtab[index].name, t.nickname);
            this.info_.teamassignments_.push(assignment);
            index++;
            if (index >= teamtab.length) {
                index = 0;
            }
        }

        return true;
    }

    public generateMatchTabletSchedule(): boolean {
        let matchtab: Tablet[] = this.getTabletsForPurpose(TabletManager.tabletMatch);
        if (!this.match_mgr_.hasMatches() || matchtab.length < 6) {
            return false;
        }

        let team: BATeam | undefined;
        let tnumber;
        let ma: MatchTablet;
        let index = 0;
        this.info_.matchassignements_ = [];

        for (let m of this.match_mgr_.getMatches()) {
            tnumber = SCBase.keyToTeamNumber(m.alliances.red.team_keys[0]);
            team = this.team_mgr_.findTeamByNumber(tnumber);
            ma = new MatchTablet(m.comp_level, m.match_number, m.set_number, 'red', tnumber, team ? team.nickname : '', matchtab[index].name);
            index++;
            if (index >= matchtab.length) {
                index = 0;
            }
            this.info_.matchassignements_.push(ma);

            tnumber = SCBase.keyToTeamNumber(m.alliances.red.team_keys[1]);
            team = this.team_mgr_.findTeamByNumber(tnumber);
            ma = new MatchTablet(m.comp_level, m.match_number, m.set_number, 'red', tnumber, team ? team.nickname : '', matchtab[index].name);
            index++;
            if (index >= matchtab.length) {
                index = 0;
            }
            this.info_.matchassignements_.push(ma);

            tnumber = SCBase.keyToTeamNumber(m.alliances.red.team_keys[2]);
            team = this.team_mgr_.findTeamByNumber(tnumber);
            ma = new MatchTablet(m.comp_level, m.match_number, m.set_number, 'red', tnumber, team ? team.nickname : '', matchtab[index].name);
            index++;
            if (index >= matchtab.length) {
                index = 0;
            }
            this.info_.matchassignements_.push(ma);

            tnumber = SCBase.keyToTeamNumber(m.alliances.blue.team_keys[0]);
            team = this.team_mgr_.findTeamByNumber(tnumber);
            ma = new MatchTablet(m.comp_level, m.match_number, m.set_number, 'blue', tnumber, team ? team.nickname : '', matchtab[index].name);
            index++;
            if (index >= matchtab.length) {
                index = 0;
            }
            this.info_.matchassignements_.push(ma);

            tnumber = SCBase.keyToTeamNumber(m.alliances.blue.team_keys[1]);
            team = this.team_mgr_.findTeamByNumber(tnumber);
            ma = new MatchTablet(m.comp_level, m.match_number, m.set_number, 'blue', tnumber, team ? team.nickname : '', matchtab[index].name);
            index++;
            if (index >= matchtab.length) {
                index = 0;
            }
            this.info_.matchassignements_.push(ma);

            tnumber = SCBase.keyToTeamNumber(m.alliances.blue.team_keys[2]);
            team = this.team_mgr_.findTeamByNumber(tnumber);
            ma = new MatchTablet(m.comp_level, m.match_number, m.set_number, 'blue', tnumber, team ? team.nickname : '', matchtab[index].name);
            index++;
            if (index >= matchtab.length) {
                index = 0;
            }
            this.info_.matchassignements_.push(ma);
        }
        return true;
    }

    public generatePlayoffSchedule() {
        let matchtab: Tablet[] = this.getTabletsForPurpose(TabletManager.tabletMatch);
        if (!this.match_mgr_.hasMatches() || matchtab.length < 6) {
            return false;
        }
        
        let index = 0 ;
        this.info_.playoffassignments_ = [] ;
        for(let match = 1 ; match <= 16 ; match++) {
            for(let slot = 0 ; slot < 6 ; slot++) {
                let ma : PlayoffAssignment = {
                    match: match,
                    alliance: (slot < 3) ? 'red' : 'blue',
                    tablet: matchtab[index].name,
                    which: (slot % 3),
                }
                this.info_.playoffassignments_.push(ma) ;
                index++ ;
                if (index >= matchtab.length) {
                    index = 0;
                }
            }
        }

        return true ;
    }
}
