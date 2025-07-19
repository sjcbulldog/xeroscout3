import { XeroApp } from "../../apps/xeroapp.js";
import { IPCPlayoffStatus } from "../../shared/ipc.js";
import { kMatchAlliances } from "../../shared/playoffs.js";
import { XeroPoint, XeroRect } from "../../shared/xerogeom.js";
import { XeroPopupMenu, XeroPopupMenuItem } from "../../widgets/xeropopupmenu.js";
import { XeroView } from "../xeroview.js";
import { AllianceDialog } from "./alliancedialog.js";

export class XeroPlayoffsView extends XeroView {

    // Alliance constants
    private static readonly kTopMargin = 10 ;
    private static readonly kLeftMargin = 400 ;
    private static readonly kColumnWidth = 140 ;
    private static readonly kRowHeight = 25 ;

    // Playoff bracket constants
    private static readonly kResultsLeftMargin = 10 ;
    private static readonly kLongMarkerWidth = 270 ;
    private static readonly kShortMarkerWidth = 120 ;
    private static readonly kMarkerHeight = 40 ;
    private static readonly kMarkerSlantWidth = 10 ;
    private static readonly kMarkerTextPadding = 40 ;
    private static readonly kMarkerMatchTextPadding = 5 ;
    private static readonly kInterMarkerSpacing = 50 ;
    private static readonly kResultsTopMargin = 300 ;

    private static readonly kMatchPositions : XeroPoint[] = [
        new XeroPoint(XeroPlayoffsView.calcXSpacing(1), XeroPlayoffsView.kResultsTopMargin), // Position for match 1
        new XeroPoint(XeroPlayoffsView.calcXSpacing(1), XeroPlayoffsView.kResultsTopMargin + 42), // Position for match 2
        new XeroPoint(XeroPlayoffsView.calcXSpacing(1), XeroPlayoffsView.kResultsTopMargin + 84), // Position for match 3
        new XeroPoint(XeroPlayoffsView.calcXSpacing(1), XeroPlayoffsView.kResultsTopMargin + 126), // Position for match 4

        new XeroPoint(XeroPlayoffsView.calcXSpacing(2), XeroPlayoffsView.kResultsTopMargin + 200), // Position for match 5
        new XeroPoint(XeroPlayoffsView.calcXSpacing(2), XeroPlayoffsView.kResultsTopMargin + 242), // Position for match 6
        new XeroPoint(XeroPlayoffsView.calcXSpacing(2), XeroPlayoffsView.kResultsTopMargin + 21), // Position for match 7
        new XeroPoint(XeroPlayoffsView.calcXSpacing(2), XeroPlayoffsView.kResultsTopMargin + 105), // Position for match 8

        new XeroPoint(XeroPlayoffsView.calcXSpacing(3), XeroPlayoffsView.kResultsTopMargin + 200), // Position for match 9
        new XeroPoint(XeroPlayoffsView.calcXSpacing(3), XeroPlayoffsView.kResultsTopMargin + 242), // Position for match 10

        new XeroPoint(XeroPlayoffsView.calcXSpacing(4), XeroPlayoffsView.kResultsTopMargin + 75), // Position for match 11
        new XeroPoint(XeroPlayoffsView.calcXSpacing(4), XeroPlayoffsView.kResultsTopMargin + 221), // Position for match 12

        new XeroPoint(XeroPlayoffsView.calcXSpacing(5), XeroPlayoffsView.kResultsTopMargin + 221), // Position for match 13

        new XeroPoint(XeroPlayoffsView.calcXSpacing(6), XeroPlayoffsView.kResultsTopMargin + 25), // Position for match 14

        new XeroPoint(XeroPlayoffsView.calcXSpacing(6), XeroPlayoffsView.kResultsTopMargin + 75), // Position for match 15

        new XeroPoint(XeroPlayoffsView.calcXSpacing(6), XeroPlayoffsView.kResultsTopMargin + 125), // Position for match 16
    ];

    private allianceDialog_ : AllianceDialog | null = null ;
    private winner_menu_ : XeroPopupMenu | null = null ;
    private canvas_ : HTMLCanvasElement ;
    private context_ : CanvasRenderingContext2D | null = null;
    private playoffStatus_ : IPCPlayoffStatus | null = null;
    private teams_ : any[] = [] ;
    private observer_ : ResizeObserver ;
    private marker_bounds_ : (XeroRect | undefined)[] = [] ;
    private scouting_ : boolean = false ;

    constructor(app: XeroApp, status: IPCPlayoffStatus | null = null) {
        super(app, 'xero-playoffs-view') ;

        this.marker_bounds_.fill(undefined, 0, 15) ;

        this.canvas_ = document.createElement('canvas');
        this.canvas_.id = 'playoff-canvas';
        this.canvas_.className = 'xero-playoffs-canvas';
        this.canvas_.width = this.elem.clientWidth
        this.canvas_.height = this.elem.clientHeight;

        this.elem.appendChild(this.canvas_);
        this.context_ = this.canvas_.getContext('2d');
        this.observer_ = new ResizeObserver(this.resized.bind(this)) ;
        this.observer_.observe(this.elem) ;

        if (status) {
            // This is a scouting tablet
            this.playoffStatus_ = status ;
            this.renderPlayoffStatus() ;            
            this.scouting_ = true ;
        }
        else {
            this.canvas_.addEventListener('dblclick', this.dblClick.bind(this)) ;   
            this.registerCallback('send-playoff-status', this.receivePlayoffStatus.bind(this));
            this.registerCallback('send-team-list', this.receiveTeamList.bind(this)) ;
            this.request('get-team-list') ;
            this.request('get-playoff-status') ;                    
        }

        this.canvas_.addEventListener('contextmenu', this.selectWinner.bind(this))         
    }

    private static calcXSpacing(round: number) : number {
        let ret = XeroPlayoffsView.kResultsLeftMargin ;
        if (round > 1) {
            ret += XeroPlayoffsView.kLongMarkerWidth ;
        }

        if (round > 2) {
            ret += (round - 2) * XeroPlayoffsView.kShortMarkerWidth ;
        }

        ret += (round - 1) * XeroPlayoffsView.kInterMarkerSpacing ;

        return ret;
    }    

    private areAlliancesValid() {
        if (!this.playoffStatus_) {
            return false;
        }

        for(let i = 0 ; i < 8 ; i++) {
            let a = this.playoffStatus_.alliances[i] ;
            if (!a || !a.teams) {
                return false ;
            }

            if (!a.teams[0] || !a.teams[1] || !a.teams[2]) {
                return false ;
            }
        }

        return true ;
    }

    private closeAllianceDialog(changed: boolean) {
        if (!changed) {
            this.allianceDialog_ = null ;
            return ;
        }

        if (this.allianceDialog_) {
            let teams = this.allianceDialog_.teams ;
            this.request('set-alliance-teams', {
                alliance: this.allianceDialog_.which,
                teams: this.allianceDialog_.teams
            });
            this.allianceDialog_ = null ;
        }
    }

    private getMatchFromPosition(x: number, y: number) : number {
        let pt = new XeroPoint(x, y) ;
        for(let i = 0 ; i < XeroPlayoffsView.kMatchPositions.length ; i++) {
            if (this.marker_bounds_[i]?.contains(pt)) {
                return i + 1 ;
            }
        }
        return -1 ;
    }

    private setWinner(match: number, winner: number, loser: number) {
            this.request('set-playoff-match-outcome', {
                match: match,
                winner: winner,
                loser: loser
            });        
    }

    private menuClosed() {
        if (this.winner_menu_) {
            this.winner_menu_ = null ;
        }
    }

    private selectWinner(e: MouseEvent) {
        if (this.allianceDialog_ || this.winner_menu_) {
            return ;
        }

        if (!this.areAlliancesValid()) {
            alert('The alliances are not all valid, cannot set match winners') ;
            return ;
        }

        let bounds = this.canvas_.getBoundingClientRect() ;
        let x = e.clientX - bounds.left ;
        let y = e.clientY - bounds.top ;

        let match = this.getMatchFromPosition(x, y) ;
        let ralliance = this.getAlliance(match, 0) ;
        let balliance = this.getAlliance(match, 1) ;

        if (!/^[0-9]+$/.test(ralliance) || !/^[0-9]+$/.test(balliance)) {
            //
            // Cannot set a winner for a match that does not have an alliance set to play yet
            //
            alert('Cannot set a winner for a match that does not have an alliance set to play yet') ;
            return ;
        }

        if (match > 0) {
            let bounds = this.canvas_.getBoundingClientRect() ;
            let items: XeroPopupMenuItem[] = [] ;
            items.push(new XeroPopupMenuItem('Red', this.setWinner.bind(this, match, +ralliance, +balliance))) ;
            items.push(new XeroPopupMenuItem('Blue', this.setWinner.bind(this, match, +balliance, +ralliance))) ;
            this.winner_menu_ = new XeroPopupMenu('Winner', items) ;

            this.winner_menu_.on('menu-closed', this.menuClosed.bind(this)) ;
            this.winner_menu_.showRelative(this.elem, new XeroPoint(e.clientX + bounds.left, e.clientY)) ;            
        }
    }

    private teamsRemaining() : number[] {
        let ret: number[] = [...this.teams_] ;
        if (!this.playoffStatus_ || !this.playoffStatus_.alliances) {
            return ret ;
        }
        for(let a of this.playoffStatus_!.alliances) {
            if (a && a.teams && Array.isArray(a.teams)) {
                for(let t of a.teams) {
                    let index = ret.indexOf(t) ;
                    if (index >= 0) {
                        ret.splice(index, 1) ;
                    }
                }
            }
        }
        return ret;
    }
    
    private dblClick(e: MouseEvent) {
        if (this.allianceDialog_ || this.winner_menu_ || !this.playoffStatus_) {
            return ;
        }

        let bounds = this.canvas_.getBoundingClientRect() ;
        let x = e.clientX - bounds.left ;
        let y = e.clientY - bounds.top ;

        if (x >= XeroPlayoffsView.kLeftMargin && x <= (XeroPlayoffsView.kLeftMargin + XeroPlayoffsView.kColumnWidth * 4) && 
            y >= XeroPlayoffsView.kTopMargin && y <= (XeroPlayoffsView.kTopMargin + XeroPlayoffsView.kRowHeight * 9)) {
            let row = Math.floor((y - XeroPlayoffsView.kTopMargin) / XeroPlayoffsView.kRowHeight);
            
            let a = this.playoffStatus_.alliances[row - 1] ;
            if (a && a.teams && Array.isArray(a.teams) && a.teams.length === 3) {
                this.allianceDialog_ = new AllianceDialog(this.teamsRemaining(), row, a.teams) ;
            }
            else {
                this.allianceDialog_ = new AllianceDialog(this.teamsRemaining(), row, undefined) ;
            }
            this.allianceDialog_.on('closed', this.closeAllianceDialog.bind(this)) ;
            this.allianceDialog_.showCentered(this.elem) ;
        }
    }

    private receiveTeamList(data: number[]) {
        this.teams_ = data ;
        if (this.playoffStatus_ && this.teams_ && this.teams_.length > 0) {
            this.renderPlayoffStatus();
        }
    }

    private receivePlayoffStatus(data: IPCPlayoffStatus) {
        this.playoffStatus_ = data;
        if (this.teams_ && this.teams_.length > 0 && this.playoffStatus_) {
            this.renderPlayoffStatus();
        }
    }

    private registerMarkerBounds(match: number, rect: XeroRect) {
        this.marker_bounds_[match - 1] = rect ;
    }

    private drawShortMarker(pt: XeroPoint, match: number, ralliance: string, balliance: string, winner: number = -1) {

        let rect: XeroRect = new XeroRect(pt.x, pt.y, XeroPlayoffsView.kShortMarkerWidth, XeroPlayoffsView.kMarkerHeight) ;
        this.registerMarkerBounds(match, rect) ;

        this.context_!.font = '16px Arial' ;
        this.context_!.beginPath() ;
        this.context_!.moveTo(pt.x, pt.y) ;
        this.context_!.lineTo(pt.x + XeroPlayoffsView.kShortMarkerWidth, pt.y) ;
        this.context_!.lineTo(pt.x + XeroPlayoffsView.kShortMarkerWidth + XeroPlayoffsView.kMarkerSlantWidth, pt.y + XeroPlayoffsView.kMarkerHeight / 2.0) ;
        this.context_!.lineTo(pt.x + XeroPlayoffsView.kShortMarkerWidth, pt.y + XeroPlayoffsView.kMarkerHeight) ;
        this.context_!.lineTo(pt.x,pt.y + XeroPlayoffsView.kMarkerHeight) ;
        this.context_!.lineTo(pt.x, pt.y) ;
        this.context_!.closePath() ;

        this.context_!.fillStyle = 'white' ;
        this.context_!.fill() ;

        this.context_!.strokeStyle = 'black' ;
        this.context_!.stroke() ;

        this.context_!.textAlign = 'left' ;
        this.context_!.textBaseline = 'bottom' ;
        this.context_!.fillStyle = 'red' ;
        let tag = 'Alliance' ;
        if (ralliance.startsWith('W') || ralliance.startsWith('L')) {
            tag = '' ;
        }

        let post = '' ;
        if (winner === 0) {
            post = ' (W)' ;
        }
        this.context_!.fillText(`${tag} ${ralliance}${post}`, pt.x + XeroPlayoffsView.kMarkerTextPadding, pt.y + XeroPlayoffsView.kMarkerHeight / 2.0) ;
        this.context_!.textAlign = 'right' ;

        tag = 'Alliance' ;
        if (balliance.startsWith('W') || balliance.startsWith('L')) {
            tag = '' ;
        }
        this.context_!.textAlign = 'left' ;
        this.context_!.fillStyle = 'blue' ;
        post = '' ;
        if (winner === 1) {
            post = ' (W)' ;
        }       
        this.context_!.fillText(`${tag} ${balliance}${post}`, pt.x + XeroPlayoffsView.kMarkerTextPadding, pt.y + XeroPlayoffsView.kMarkerHeight) ;

        this.context_!.textAlign = 'left' ;
        this.context_!.fillStyle = 'black' ;
        this.context_!.textBaseline = 'middle' ;
        this.context_!.fillText(`M${match}`, pt.x + XeroPlayoffsView.kMarkerMatchTextPadding, pt.y + XeroPlayoffsView.kMarkerHeight / 2.0) ;        
    }

    private teamToString(team: string | undefined| number) : string {
        if (team) {
            if (typeof team === 'number') {
                return team.toString() ;
            }
            return team ;
        }

        return 'TBD' ;
    }

    private drawLongMarker(pt: XeroPoint, match: number, ralliance: string, rteams: [string, string, string], balliance: string, bteams: [string, string, string], winner: number = -1) {
        let rect: XeroRect = new XeroRect(pt.x, pt.y, XeroPlayoffsView.kLongMarkerWidth, XeroPlayoffsView.kMarkerHeight) ;
        this.registerMarkerBounds(match, rect) ;

        this.context_!.font = '16px Arial' ;        
        this.context_!.beginPath() ;
        this.context_!.moveTo(pt.x, pt.y) ;
        this.context_!.lineTo(pt.x + XeroPlayoffsView.kLongMarkerWidth, pt.y) ;
        this.context_!.lineTo(pt.x + XeroPlayoffsView.kLongMarkerWidth + XeroPlayoffsView.kMarkerSlantWidth, pt.y + XeroPlayoffsView.kMarkerHeight / 2.0) ;
        this.context_!.lineTo(pt.x + XeroPlayoffsView.kLongMarkerWidth, pt.y + XeroPlayoffsView.kMarkerHeight) ;
        this.context_!.lineTo(pt.x,pt.y + XeroPlayoffsView.kMarkerHeight) ;
        this.context_!.lineTo(pt.x, pt.y) ;
        this.context_!.closePath() ;

        this.context_!.fillStyle = 'white' ;
        this.context_!.fill() ;

        this.context_!.strokeStyle = 'black' ;
        this.context_!.stroke() ;

        this.context_!.textAlign = 'left' ;
        this.context_!.textBaseline = 'bottom' ;
        this.context_!.fillStyle = 'red' ;
        let tag = 'Alliance' ;
        if (ralliance.startsWith('W') || ralliance.startsWith('L')) {
            tag = '' ;
        }

        let post = '' ;
        if (winner === 0) {
            post = ' (W)' ;
        }
        this.context_!.fillText(`${tag} ${ralliance}${post}`, pt.x + XeroPlayoffsView.kMarkerTextPadding, pt.y + XeroPlayoffsView.kMarkerHeight / 2.0) ;

        this.context_!.textAlign = 'right' ;
        this.context_!.fillText(`${this.teamToString(rteams[0])}, ${this.teamToString(rteams[1])}, ${this.teamToString(rteams[2])}`, pt.x + XeroPlayoffsView.kLongMarkerWidth - 5, pt.y + XeroPlayoffsView.kMarkerHeight / 2.0) ;

        tag = 'Alliance' ;
        if (balliance.startsWith('W') || balliance.startsWith('L')) {
            tag = '' ;
        }
        this.context_!.textAlign = 'left' ;
        this.context_!.fillStyle = 'blue' ;
        
        post = '' ;
        if (winner === 1) {
            post = ' (W)' ;
        }
        this.context_!.fillText(`${tag} ${balliance}${post}`, pt.x + XeroPlayoffsView.kMarkerTextPadding, pt.y + XeroPlayoffsView.kMarkerHeight) ;
        this.context_!.textAlign = 'right' ;

        this.context_!.fillText(`${this.teamToString(bteams[0])}, ${this.teamToString(bteams[1])}, ${this.teamToString(bteams[2])}`, pt.x + XeroPlayoffsView.kLongMarkerWidth - 5, pt.y + XeroPlayoffsView.kMarkerHeight) ;

        this.context_!.textAlign = 'left' ;
        this.context_!.fillStyle = 'black' ;
        this.context_!.textBaseline = 'middle' ;
        this.context_!.fillText(`M${match}`, pt.x + XeroPlayoffsView.kMarkerMatchTextPadding, pt.y + XeroPlayoffsView.kMarkerHeight / 2.0) ;
    }

    private target2Alliance(target: string) : string {
        let ret: string = target ;

        if (target.startsWith('a')) {
            ret = target.substring(1) ;
        } else if (target.startsWith('l') || target.startsWith('w')) {
            let match = +target.substring(1) ;
            if (this.playoffStatus_ && this.playoffStatus_.outcomes) {
                let outcome = this.playoffStatus_.outcomes["m" + match.toString() as keyof IPCPlayoffStatus['outcomes']] ;
                if (outcome) {
                    if (target.startsWith('l')) {
                        ret = outcome.loser.toString() ;
                    } else if (target.startsWith('w')) {
                        ret = outcome.winner.toString() ;
                    }
                }
            }
        }

        return ret ;
    }

    private getAlliance(match: number, offset: number) : string {
        let target = kMatchAlliances[match - 1][offset] ;
        let ret = this.target2Alliance(target) ;

        if (ret.startsWith('l')) {
            ret = 'Loser-' + ret.substring(1) ;
        }
        else if (ret.startsWith('w')) {
            ret = 'Winner-' + ret.substring(1) ;
        }
        return ret ;
    }

    private getTeams(alliance: number) : [string, string, string] {
        if (!this.playoffStatus_ || !this.playoffStatus_.alliances) {
            ['', '', ''] ;
        }   

        if (alliance < 1 || alliance > this.playoffStatus_!.alliances.length) {
            return ['', '', ''] ;
        }

        if (this.playoffStatus_!.alliances[alliance - 1] === undefined) {
            return ['', '', ''] ;
        }

        let teams = this.playoffStatus_!.alliances[alliance - 1]!.teams ;
        return [this.teamToString(teams[0]), this.teamToString(teams[1]), this.teamToString(teams[2])] ;
    }

    private drawRounds() {
        this.context_!.font = '24px Arial ' ;
        this.context_!.fillText('Round 1', XeroPlayoffsView.calcXSpacing(1), XeroPlayoffsView.kResultsTopMargin - 20) ;
        this.context_!.fillText('_______', XeroPlayoffsView.calcXSpacing(1), XeroPlayoffsView.kResultsTopMargin - 20) ;

        this.context_!.fillText('Round 2', XeroPlayoffsView.calcXSpacing(2), XeroPlayoffsView.kResultsTopMargin - 20) ;
        this.context_!.fillText('_______', XeroPlayoffsView.calcXSpacing(2), XeroPlayoffsView.kResultsTopMargin - 20) ;

        this.context_!.fillText('Round 3', XeroPlayoffsView.calcXSpacing(3), XeroPlayoffsView.kResultsTopMargin - 20) ;
        this.context_!.fillText('_______', XeroPlayoffsView.calcXSpacing(3), XeroPlayoffsView.kResultsTopMargin - 20) ;

        this.context_!.fillText('Round 4', XeroPlayoffsView.calcXSpacing(4), XeroPlayoffsView.kResultsTopMargin - 20) ;
        this.context_!.fillText('_______', XeroPlayoffsView.calcXSpacing(4), XeroPlayoffsView.kResultsTopMargin - 20) ;

        this.context_!.fillText('Round 5', XeroPlayoffsView.calcXSpacing(5), XeroPlayoffsView.kResultsTopMargin - 20) ;
        this.context_!.fillText('_______', XeroPlayoffsView.calcXSpacing(5), XeroPlayoffsView.kResultsTopMargin - 20) ;

        this.context_!.fillText('Finals', XeroPlayoffsView.calcXSpacing(6), XeroPlayoffsView.kResultsTopMargin - 20) ;
        this.context_!.fillText('_____', XeroPlayoffsView.calcXSpacing(6), XeroPlayoffsView.kResultsTopMargin - 20) ;
    }

    private renderPlayoffStatus() : void {

        this.context_!.fillStyle = 'lightgray' ;
        this.context_!.fillRect(0, 0, this.canvas_.width, this.canvas_.height);

        this.context_!.strokeStyle = 'black' ;
        this.context_!.strokeRect(0, 0, this.canvas_.width, this.canvas_.height);

        this.renderAlliances() ;
        this.renderResults() ;
    }

    private renderAlliances() : void {
        if (!this.playoffStatus_) {
            return ;
        }

        this.context_!.font = '18px Arial' ;
        this.context_!.textAlign = 'left' ;
        this.context_!.textBaseline = 'top' ;
        this.context_!.fillStyle = 'black' ;

        this.context_!.fillText('Playoff Alliances', (XeroPlayoffsView.kLeftMargin + XeroPlayoffsView.kColumnWidth * 5) / 2, 
                                                    XeroPlayoffsView.kTopMargin + 5) ;
        this.context_!.strokeStyle = 'black' ;
        this.context_!.strokeRect(XeroPlayoffsView.kLeftMargin, XeroPlayoffsView.kTopMargin, XeroPlayoffsView.kColumnWidth * 4, XeroPlayoffsView.kRowHeight * 9) ;

        let tag: string ;
        for(let i = 0 ; i < 8 ; i++) {
            let x = XeroPlayoffsView.kLeftMargin ;
            let y = XeroPlayoffsView.kRowHeight * (i + 1) + XeroPlayoffsView.kTopMargin ;

            let alliance = this.playoffStatus_.alliances[i] ;
            if (!alliance) {
                this.context_!.fillText(`  Alliance ${i + 1}:`, x, y) ;          
                this.context_!.fillText(`TBD`, x + XeroPlayoffsView.kColumnWidth, y) ;
                this.context_!.fillText(`TBD`, x + XeroPlayoffsView.kColumnWidth * 2, y) ;
                this.context_!.fillText(`TBD`, x + XeroPlayoffsView.kColumnWidth * 3, y) ;                      
            }
            else {
                this.context_!.fillText(`  Alliance ${i + 1}:`, x, y) ;
                tag = alliance.teams[0] ? alliance.teams[0].toString() : 'TBD' ;
                this.context_!.fillText(`${tag}`, x + XeroPlayoffsView.kColumnWidth, y) ;

                tag = alliance.teams[1] ? alliance.teams[1].toString() : 'TBD' ;
                this.context_!.fillText(`${tag}`, x + XeroPlayoffsView.kColumnWidth * 2, y) ;

                tag = alliance.teams[2] ? alliance.teams[2].toString() : 'TBD' ;                
                this.context_!.fillText(`${tag}`, x + XeroPlayoffsView.kColumnWidth * 3, y) ;
            }
        }

        if (!this.scouting_) {
            this.context_!.font = '12px Arial' ;
            this.context_!.textAlign = 'center'
            this.context_!.fillText('Double click on an alliance to edit', XeroPlayoffsView.kLeftMargin + XeroPlayoffsView.kColumnWidth * 2, 
                                                                            XeroPlayoffsView.kRowHeight * 9 + XeroPlayoffsView.kTopMargin + 2) ;
        }
    }

    private getMatchWinner(match: number) : number {
        if (!this.playoffStatus_ || !this.playoffStatus_.outcomes) {
            return -1 ;
        }
        let outcome = this.playoffStatus_.outcomes["m" + match.toString() as keyof IPCPlayoffStatus['outcomes']] ;
        if (!outcome) {
            return -1 ;
        }

        return outcome.winner;
    }

    private renderResults() : void {
        if (!this.playoffStatus_) {
            return ;
        }

        for(let match = 1 ; match <= 16 ; match++) {
            let rteams : [string, string, string] = ['', '', ''] ;
            let bteams : [string, string, string] = ['', '', ''] ;

            let walliance = this.getMatchWinner(match) ;

            let ralliance = this.getAlliance(match, 0) ;
            if (!ralliance.startsWith('w') && !ralliance.startsWith('l')) {
                rteams = this.getTeams(+ralliance) ;
            }

            let balliance = this.getAlliance(match, 1) ;
            if (!balliance.startsWith('w') && !balliance.startsWith('l')) {
                bteams = this.getTeams(+balliance) ;
            }

            let winner = -1 ;
            if (walliance == +ralliance) {
                winner = 0 ;
            }
            else if (walliance == +balliance) {
                winner = 1 ;
            }

            if (match <= 4) {
                this.drawLongMarker(XeroPlayoffsView.kMatchPositions[match - 1], match, ralliance, rteams, balliance, bteams, winner) ;
            }
            else {
                this.drawShortMarker(XeroPlayoffsView.kMatchPositions[match - 1], match, ralliance, balliance, winner) ;
            }
        }

        this.drawRounds() ;

        this.context_!.font = '12px Arial' ;
        this.context_!.textAlign = 'center' ;
        this.context_!.fillText('Right click on a match to set the winner', XeroPlayoffsView.calcXSpacing(3), XeroPlayoffsView.kResultsTopMargin + 375) ;
    }

    private resized(entries: ResizeObserverEntry[]) : void {
        this.canvas_.width = this.elem.clientWidth  ;
        this.canvas_.height = this.elem.clientHeight ;
        this.renderPlayoffStatus();
    }    
}
