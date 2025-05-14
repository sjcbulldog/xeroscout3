
export class XeroLogger {
    private static instance: XeroLogger | null = null;

    private constructor() {
    }

    static getInstance(): XeroLogger {
        if (this.instance === null) {
            this.instance = new XeroLogger();
        }
        return this.instance;
    }

    debug(message: string) {
        console.log(message);
    }

    error(message: string) {
        console.log(message);
    }

    warn(message: string) {
        console.log(message);
    }

    info(message: string) {
        console.log(message);
    }
}