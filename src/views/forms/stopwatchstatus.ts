export type StopwatchSegment = {
    start: number ;
    stop: number | null ;
} ;

export type StopwatchDataV1 = {
    version: 1 ;
    segments: StopwatchSegment[] ;
} ;

export class StopwatchStatus {
    public readonly name: string ;
    private callback_?: () => void ;
    private timer_? : any ;
    private segments_: StopwatchSegment[] = [] ;

    constructor(name: string) {
        this.name = name ;
    }

    public get running() : boolean {
        let last = this.segments_.length > 0 ? this.segments_[this.segments_.length - 1] : undefined ;
        return last !== undefined && last.stop === null ;
    }

    public get value() : number {
        let now = Date.now() ;
        let elapsedms = 0 ;
        for (let seg of this.segments_) {
            let stop = seg.stop ?? now ;
            elapsedms += Math.max(0, stop - seg.start) ;
        }
        return elapsedms / 1000.0 ;
    }

    public setCallback(callback: () => void) {
        this.callback_ = callback ;
        this.ensureTicking() ;
    }

    public start(callback: () => void) {
        if (this.running) {
            this.setCallback(callback) ;
            return ;
        }

        this.callback_ = callback ;
        this.segments_.push({ start: Date.now(), stop: null }) ;
        this.ensureTicking() ;
        this.callback_?.() ;
    }

    public stop() {
        if (!this.running) {
            return ;
        }

        let last = this.segments_[this.segments_.length - 1] ;
        last.stop = Date.now() ;

        if (this.timer_) {
            clearInterval(this.timer_) ;
            this.timer_ = undefined ;
        }

        this.callback_ = undefined ;
    }

    public clear() {
        if (this.timer_) {
            clearInterval(this.timer_) ;
            this.timer_ = undefined ;
        }
        this.callback_ = undefined ;
        this.segments_ = [] ;
    }

    public load(data: any) : void {
        if (data && typeof data === 'object' && data.version === 1 && Array.isArray(data.segments)) {
            this.segments_ = [] ;
            for (let one of data.segments as any[]) {
                if (!one || typeof one !== 'object') {
                    continue ;
                }
                if (typeof one.start !== 'number') {
                    continue ;
                }
                let stop: number | null = null ;
                if (one.stop === null) {
                    stop = null ;
                }
                else if (typeof one.stop === 'number') {
                    stop = one.stop ;
                }
                else {
                    continue ;
                }
                this.segments_.push({ start: one.start, stop: stop }) ;
            }
        }

        this.ensureTicking() ;
    }

    public toJSON() : StopwatchDataV1 {
        return {
            version: 1,
            segments: this.segments_.map((s) => ({ start: s.start, stop: s.stop })),
        } ;
    }

    private ensureTicking() : void {
        if (!this.running) {
            if (this.timer_) {
                clearInterval(this.timer_) ;
                this.timer_ = undefined ;
            }
            return ;
        }

        if (this.timer_ === undefined) {
            this.timer_ = setInterval(this.tick.bind(this), 100) ;
        }
    }

    private tick() {
        this.callback_?.() ;
    }
}

