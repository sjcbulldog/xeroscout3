import { XeroApp } from "../../apps/xeroapp.js";
import { IPCPlayoffStatus } from "../../shared/ipc.js";
import { XeroPoint } from "../../shared/xerogeom.js";
import { XeroView } from "../xeroview.js";

export class XeroPlayoffsView extends XeroView {

    private static readonly kLongMarketWidth = 240 ;
    private static readonly kShortMarketWidth = 50 ;
    private static readonly kMarkerHeight = 40 ;
    private static readonly kSlantWidth = 10 ;
    private static readonly kTextPadding = 40 ;
    private static readonly kMatchTextPadding = 5 ;
    private static readonly kHorizOffset = 260 ;

    private static readonly kMatchPositions : XeroPoint[] = [
        new XeroPoint(100, 100), // Position for match 1
        new XeroPoint(100, 200), // Position for match 2
        new XeroPoint(100, 300), // Position for match 3
        new XeroPoint(100, 400), // Position for match 4

        new XeroPoint(100 + XeroPlayoffsView.kHorizOffset, 100), // Position for match 5
        new XeroPoint(100 + XeroPlayoffsView.kHorizOffset , 200), // Position for match 6
        new XeroPoint(100 + XeroPlayoffsView.kHorizOffset, 300), // Position for match 7
        new XeroPoint(100 + XeroPlayoffsView.kHorizOffset, 400), // Position for match 8
        new XeroPoint(100 + 2 * XeroPlayoffsView.kHorizOffset, 300), // Position for match 9
        new XeroPoint(100 + 2 * XeroPlayoffsView.kHorizOffset, 400), // Position for match 10
        new XeroPoint(100 + 3 * XeroPlayoffsView.kHorizOffset, 100), // Position for match 11
        new XeroPoint(100 + 3 * XeroPlayoffsView.kHorizOffset, 200), // Position for match 12
        new XeroPoint(100 + 4 * XeroPlayoffsView.kHorizOffset, 100), // Position for match 13
        new XeroPoint(100 + 5 * XeroPlayoffsView.kHorizOffset, 100), // Position for match 14
        new XeroPoint(100 + 6 * XeroPlayoffsView.kHorizOffset, 100), // Position for match 15
        new XeroPoint(100 + 7 * XeroPlayoffsView.kHorizOffset, 100), // Position for match 16
    ];

    private static readonly kMatchAlliances : [string, string][] = [
        ["a1", "a8"],           // 1
        ["a4", "a5"],           // 2
        ["a2", "a7"],           // 3
        ["a3", "a6"],           // 4
        ["l1", "l2"],           // 5
        ["l3", "l4"],           // 6
        ["w1", "w2"],           // 7
        ["w3", "w4"],           // 8
        ["l7", "w6"],           // 9
        ["l8", "w5"],           // 10
        ["w7", "w8"],           // 11
        ["w9", "w10"],          // 12
        ["l11", "w12"],         // 13
        ["w11", "w13"],         // 14
        ["w11", "w13"],         // 15
        ["w11", "w13"],         // 16
    ];

    private canvas_ : HTMLCanvasElement ;
    private context_ : CanvasRenderingContext2D | null = null;
    private playoffStatus_ : IPCPlayoffStatus | null = null;
    private observer_ : ResizeObserver ;

    constructor(app: XeroApp) {
        super(app, 'xero-playoffs-view') ;

        this.canvas_ = document.createElement('canvas');
        this.canvas_.id = 'playoff-canvas';
        this.canvas_.className = 'xero-playoffs-canvas';
        this.canvas_.width = this.elem.clientWidth
        this.canvas_.height = this.elem.clientHeight;
        
        this.elem.appendChild(this.canvas_);

        this.context_ = this.canvas_.getContext('2d');

        this.registerCallback('send-playoff-status', this.receivePlayoffStatus.bind(this));
        this.request('get-playoff-status') ;

        this.observer_ = new ResizeObserver(this.resized.bind(this)) ;
        this.observer_.observe(this.elem) ;        
    }

    private receivePlayoffStatus(data: IPCPlayoffStatus) {
        this.playoffStatus_ = data;
        this.renderPlayoffStatus();
    }

    private drawLongMarker(pt: XeroPoint, match: number, ralliance: number | undefined, rteams: [number, number, number], balliance: number | undefined, bteams: [number, number, number]) {
        this.context_!.beginPath() ;
        this.context_!.moveTo(pt.x, pt.y) ;
        this.context_!.lineTo(pt.x + XeroPlayoffsView.kLongMarketWidth, pt.y) ;
        this.context_!.lineTo(pt.x + XeroPlayoffsView.kLongMarketWidth + XeroPlayoffsView.kSlantWidth, pt.y + XeroPlayoffsView.kMarkerHeight / 2.0) ;
        this.context_!.lineTo(pt.x + XeroPlayoffsView.kLongMarketWidth, pt.y + XeroPlayoffsView.kMarkerHeight) ;
        this.context_!.lineTo(pt.x,pt.y + XeroPlayoffsView.kMarkerHeight) ;
        this.context_!.lineTo(pt.x, pt.y) ;
        this.context_!.closePath() ;

        this.context_!.fillStyle = 'white' ;
        this.context_!.fill() ;

        this.context_!.strokeStyle = 'black' ;
        this.context_!.stroke() ;

        this.context_!.font = '16px Arial' ;
        this.context_!.textAlign = 'left' ;
        this.context_!.textBaseline = 'bottom' ;
        this.context_!.fillStyle = 'red' ;
        this.context_!.fillText(`Alliance ${ralliance}`, pt.x + XeroPlayoffsView.kTextPadding, pt.y + XeroPlayoffsView.kMarkerHeight / 2.0) ;
        this.context_!.textAlign = 'right' ;
        this.context_!.fillText(`${rteams[0]}, ${rteams[1]}, ${rteams[2]}`, pt.x + XeroPlayoffsView.kLongMarketWidth - 5, pt.y + XeroPlayoffsView.kMarkerHeight / 2.0) ;

        this.context_!.textAlign = 'left' ;
        this.context_!.fillStyle = 'blue' ;
        this.context_!.fillText(`Alliance ${balliance}`, pt.x + XeroPlayoffsView.kTextPadding, pt.y + XeroPlayoffsView.kMarkerHeight) ;
        this.context_!.textAlign = 'right' ;
        this.context_!.fillText(`${bteams[0]}, ${bteams[1]}, ${bteams[2]}`, pt.x + XeroPlayoffsView.kLongMarketWidth - 5, pt.y + XeroPlayoffsView.kMarkerHeight) ;

        this.context_!.textAlign = 'left' ;
        this.context_!.fillStyle = 'black' ;
        this.context_!.textBaseline = 'middle' ;
        this.context_!.fillText(`M${match}`, pt.x + XeroPlayoffsView.kMatchTextPadding, pt.y + XeroPlayoffsView.kMarkerHeight / 2.0) ;
    }

    private target2Alliance(target: string) : number | undefined {
        let ret: number | undefined = undefined ;
        if (target.startsWith('a')) {
            ret = +target.substring(1) ;
        } else if (target.startsWith('l') || target.startsWith('w')) {
            let match = +target.substring(1) ;
            if (this.playoffStatus_ && this.playoffStatus_.outcomes) {
                let outcome = this.playoffStatus_.outcomes["m" + match.toString() as keyof IPCPlayoffStatus['outcomes']] ;
                if (outcome) {
                    if (target.startsWith('l')) {
                        ret = outcome.loser ;
                    } else if (target.startsWith('w')) {
                        ret = outcome.winner ;
                    }
                }
            }
        }

        return ret ;
    }

    private getRedAlliance(match: number) : number | undefined {
        let target = XeroPlayoffsView.kMatchAlliances[match - 1][0] ;
        return this.target2Alliance(target) ;
    }

    private getBlueAlliance(match: number) : number | undefined {
        let target = XeroPlayoffsView.kMatchAlliances[match - 1][1] ;
        return this.target2Alliance(target) ;
    }

    private getTeams(alliance: number) : [number, number, number] {
        return [0, 0, 0] ;
    }

    private renderPlayoffStatus() {
        if (!this.playoffStatus_) {
            return ;
        }

        this.context_!.fillStyle = 'lightgray' ;
        this.context_!.fillRect(0, 0, this.canvas_.width, this.canvas_.height);

        this.context_!.strokeStyle = 'black' ;
        this.context_!.strokeRect(0, 0, this.canvas_.width, this.canvas_.height);

        for(let match = 1 ; match <= 16 ; match++) {
            let rteams : [number, number, number] = [0, 0, 0] ;
            let bteams : [number, number, number] = [0, 0, 0] ;

            let ralliance = this.getRedAlliance(match) ;
            if (ralliance) {
                rteams = this.getTeams(ralliance) ;
            }

            let balliance = this.getBlueAlliance(match) ;
            if (balliance) {
                bteams = this.getTeams(balliance) ;
            }

            this.drawLongMarker(XeroPlayoffsView.kMatchPositions[match - 1], match, ralliance, rteams, balliance, bteams) ;
        }
    }

    private resized(entries: ResizeObserverEntry[]) : void {
        this.canvas_.width = this.elem.clientWidth  ;
        this.canvas_.height = this.elem.clientHeight ;
        this.renderPlayoffStatus();
    }    
}
