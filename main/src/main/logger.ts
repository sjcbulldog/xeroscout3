export class LoggerMessage {

}

export abstract class LoggerSink {
    public abstract sendMessage(msg: LoggerMessage) : void ;
}

export class Logger {
    private sinks_ : LoggerSink[] ;

    constructor() {
        this.sinks_ = [] ;
    }

    public addSink(sink: LoggerSink) {
        this.sinks_.push(sink) ;
    }
}