export class XeroLogger {
    private static instance: XeroLogger | null = null;

    private debug_out_ : boolean = true;
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

    debug(message: string, args?: unknown) {
        if (!this.debug_out_) {
            return;
        }
        this.write('debug', message, args);
    }

    error(message: string, args?: unknown) {
        if (!this.error_out_) {
            return;
        }
        this.write('error', message, args);
    }

    warn(message: string, args?: unknown) {
        if (!this.warn_out_) {
            return;
        }
        this.write('warn', message, args);
    }

    info(message: string, args?: unknown) {
        if (!this.info_out_) {
            return;
        }
        this.write('info', message, args);
    }

    private write(type: 'debug' | 'error' | 'warn' | 'info', message: string, args?: unknown) {
        const payload = {
            type: type,
            message: message,
            args: this.serialize(args),
        } ;

        if (type === 'error') {
            console.error(message, args);
        }
        else if (type === 'warn') {
            console.warn(message, args);
        }
        else {
            console.log(message, args);
        }

        if (typeof window !== 'undefined' && window.scoutingAPI) {
            window.scoutingAPI.send('client-log', payload) ;
        }
    }

    private serialize(value: unknown) : unknown {
        if (value instanceof Error) {
            return {
                name: value.name,
                message: value.message,
                stack: value.stack,
            } ;
        }

        if (value === undefined || value === null) {
            return value ;
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value ;
        }

        try {
            return JSON.parse(JSON.stringify(value)) ;
        }
        catch {
            return String(value) ;
        }
    }
}
