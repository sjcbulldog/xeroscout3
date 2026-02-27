import * as winston from "winston";

export class Manager {
    protected logger_: winston.Logger ;
    private writer_ : () => void ;

    constructor(logger: winston.Logger, writer: () => void) {
        this.logger_ = logger ;
        this.writer_ = writer ;
    }

    write() {
        this.writer_() ;
    }
}