
export class XeroLogger {
    private static instance: XeroLogger | null = null;

    private debug_out_ : boolean = false;
    private error_out_ : boolean = true;
    private warn_out_ : boolean = true;
    private info_out_ : boolean = true;

    private constructor() {
    }

    static getInstance(): XeroLogger {
        if (this.instance === null) {
            this.instance = new XeroLogger();
        }
        return this.instance;
    }

    debug(message: string) {
        if (!this.debug_out_) {
            return;
        }
        console.log(message);
    }

    error(message: string) {
        if (!this.error_out_) {
            return;
        }
        console.log(message);
    }

    warn(message: string) {
        if (!this.warn_out_) {
            return;
        }
        console.log(message);
    }

    info(message: string) {
        if (!this.info_out_) {
            return;
        }
        console.log(message);
    }
}