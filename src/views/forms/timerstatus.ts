export class TimerStatus {
    public readonly name: string ;
    private running_ = false ;
    private callback_?: () => void ;
    private value_: number = 0.0 ;    
    private timer_? : any ;

    constructor(name: string) {
        this.name = name ;
    }

    public setCallback(callback: () => void) {
        if (this.running_) {
            this.callback_ = callback ;
        }
    }

    public get running() : boolean {
        return this.running_ ;
    }

    public get value() : number {
        return this.value_ ;
    }

    public set value(value: number) {
        this.value_ = value ;
        if (this.callback_) {
            this.callback_() ;
        }
    }

    public reset() {
        this.value = 0.0 ;
    }

    public start(callback: () => void) {
        this.running_ = true ;
        this.callback_ = callback ;
        this.timer_ = setInterval(this.tick.bind(this), 100) ;
    }

    public stop() {
        if (this.timer_) {
            clearInterval(this.timer_) ;
            this.timer_ = undefined ;
        }
        this.running_ = false ;
        this.callback_ = undefined ;
    }

    private tick() {
        this.value += 0.1 ;
        if (this.callback_) {
            this.callback_() ;
        }
    }
}
