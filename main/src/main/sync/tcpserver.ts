import * as net from 'net' ;
import { SyncServer } from './syncserver';
import winston from 'winston';
import { PacketObj } from './packetobj';
import { traceFields } from './syncdiag';

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
        this.logger_.info('SyncServerShutdownClient', traceFields(this.traceContext_, {
            remoteAddress: this.socket_?.remoteAddress,
            remotePort: this.socket_?.remotePort,
        })) ;
        this.socket_?.destroy() ;
        this.socket_ = undefined ;
        this.resetBuffers() ;
    }

    public async send(p: PacketObj) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let buffer = this.convertToBytes(p) ;
            this.logger_.debug('SyncServerWrite', traceFields(this.traceContext_, {
                bytes: buffer.length,
                packetType: p.type_,
                remoteAddress: this.socket_?.remoteAddress,
                remotePort: this.socket_?.remotePort,
            }));
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
            this.server_.on('error', (err) => {
                this.logger_.error('SyncServerListenError', traceFields(this.traceContext_, {
                    port: this.port_,
                    message: err.message,
                })) ;
                reject(err) ;
            }) ;
            this.server_.listen(this.port_, '0.0.0.0', 2, () => {
                this.logger_.info('SyncServerListening', traceFields(this.traceContext_, {
                    port: this.port_,
                    host: '0.0.0.0',
                    backlog: 2,
                })) ;
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
            this.logger_.warn('SyncServerRejectedConnection', traceFields(this.traceContext_, {
                remoteAddress: socket.remoteAddress,
                remotePort: socket.remotePort,
                reason: 'client-already-connected',
            })) ;
            socket.destroy() ;
        }
        this.socket_ = socket ;
        this.logger_.info('SyncServerAcceptedConnection', traceFields(this.traceContext_, { 
            localAddress: socket.localAddress,
            localPort: socket.localPort,
            remoteAddress: socket.remoteAddress,
            remotePort: socket.remotePort,
            family: socket.remoteFamily,
        })) ;

        socket.on('close', () => { 
            this.socket_ = undefined ;
            this.logger_.info('SyncServerClientClosed', traceFields(this.traceContext_, {
                remoteAddress: socket.remoteAddress,
                remotePort: socket.remotePort,
            })) ;
        }) ;

        socket.on('error', (err: Error) => {
            this.socket_ = undefined ;
            this.logger_.error('SyncServerClientError', traceFields(this.traceContext_, {
                remoteAddress: socket.remoteAddress,
                remotePort: socket.remotePort,
                message: err.message,
            })) ;
        }) ;

        socket.on('end', () => {
            this.logger_.info('SyncServerClientEnded', traceFields(this.traceContext_, {
                remoteAddress: socket.remoteAddress,
                remotePort: socket.remotePort,
            })) ;
        }) ;

        socket.on('data', (data) => {
            this.logger_.debug('SyncServerData', traceFields(this.traceContext_, {
                bytes: data.length,
                remoteAddress: socket.remoteAddress,
                remotePort: socket.remotePort,
            })) ;
            this.extractPacket(data) ;
        }) ;
    }
}

