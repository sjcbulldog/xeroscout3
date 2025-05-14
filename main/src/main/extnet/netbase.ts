import { ClientRequest, IncomingMessage, net } from 'electron';

export class NetBase {
    private host_ : string;
    private apikey_? : string ;
    private prefix_ : string ;

    constructor(host: string, prefix: string, apikey?: string) {
        this.host_ = host ;
        this.prefix_ = prefix ;
        this.apikey_ = apikey ;
    }
    
    private appendToUint8Array(original: Uint8Array, dataToAdd: Uint8Array) {
        const result = new Uint8Array(original.length + dataToAdd.length);
        result.set(original);
        result.set(dataToAdd, original.length);
        return result;
    }

    protected async request(res: string, apikey?: string) : Promise<any> {
        let ret: Promise<any> = new Promise<any>((resolve, reject) => {
            let hdrs : any = {} ;
            
            if (this.apikey_) {
                hdrs = { "X-TBA-Auth-Key" : this.apikey_ } ;
            }

            let req: ClientRequest = net.request(
                {
                    method: 'GET',
                    protocol: 'https:',
                    hostname: this.host_,
                    port: 443,
                    path: this.prefix_ + res,
                    redirect: 'follow',
                    headers: hdrs
                }) ;

            req.on('response', (response) => {
                let buffer: Uint8Array = new Uint8Array(0) ;
                response.on('data', (data) => {
                    buffer = this.appendToUint8Array(buffer, data) ;
                }) ;

                response.on('end', () => {
                    const decoder = new TextDecoder();
                    const string = decoder.decode(buffer) ;
                    const obj = JSON.parse(string) ;
                    resolve(obj) ; 
                }) ;
            }) ;

            req.on('abort', () => {
                reject(new Error("request aborted")) ;
            }) ;

            req.on('close', () => {
            })

            req.on('error', (err) => { 
                reject(err) ;
            }) ;

            req.on('finish', () => {
            })       
            
            req.on('login', (ai, cb) => {
                reject(new Error("login required")) ;
            })  

            req.end() ;
        }) ;

        return ret ;
    }
}