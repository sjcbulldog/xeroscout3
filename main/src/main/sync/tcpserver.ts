import * as net from 'net' ;
import { SyncServer } from './syncserver';
import winston from 'winston';
import { PacketObj } from './packetobj';

export class TCPSyncServer extends SyncServer {
    private static readonly portNumber: number = 45455 ;

    private server_? : net.Server ;
    private socket_? : net.Socket ;
    private port_: number = -1 ;

    public constructor(logger: winston.Logger, port: number = TCPSyncServer.portNumber) {
        super(logger) ;
        this.port_ = port ;
    }

    public get port() : number {
        return this.port_ ;
    }

    public shutdownClient() : void {
        this.socket_?.destroy() ;
        this.socket_ = undefined ;
        this.resetBuffers() ;
    }

    public async send(p: PacketObj) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let buffer = this.convertToBytes(p) ;
            this.logger_.debug('TCPServer sending ' + buffer.length + ' bytes of data');
            this.socket_!.write(buffer, (err) => {
                if (err) {
                    reject(err) ;
                }
                else {
                    resolve() ;
                }
            }) ;
        });
    }

    public async init() : Promise<void> {
        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
            this.server_ = new net.Server((socket) => { this.connected(socket) ; }) ;
            this.server_.listen(this.port_, '0.0.0.0', 2, () => {
                this.logger_.info('TCPSyncServer: listening for connections on port ' + this.port_) ;
                resolve() ;
            }) ;
        }) ;
        return ret ;
    }

    public name() : string {
        return "TCPSyncServer" ;
    }

    private connected(socket: net.Socket) {
        if (this.socket_) {
            this.logger_.info('TCPSyncServer: client connected, but already have a client connected - disallowing new connection') ;
            socket.destroy() ;
        }
        this.socket_ = socket ;
        this.logger_.info('TCPSyncServer: client connected', { 
            address: socket.address,
            family: socket.remoteFamily
        }) ;

        socket.on('close', () => { 
            this.socket_ = undefined ;
            this.logger_.info('remote connect closed') ;
        }) ;

        socket.on('error', (err: Error) => {
            this.socket_ = undefined ;
            this.logger_.info('error in socket communications', err) ;
        }) ;

        socket.on('data', (data) => {
            this.extractPacket(data) ;
        }) ;
    }
}

