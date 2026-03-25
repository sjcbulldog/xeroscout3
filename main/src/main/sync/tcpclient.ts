import winston from "winston";
import { PacketObj } from "./packetobj";
import { SyncClient } from "./syncclient";
import * as net from 'net' ;
import { dialog } from "electron";
import { traceFields } from "./syncdiag";

export class TCPClient extends SyncClient {
    private static readonly portNumberA: number = 45455 ;

    private host_ : string ;
    private port_ : number = -1 ;
    private socket_ : net.Socket ;

    public constructor(logger:winston.Logger, host: string, port: number = TCPClient.portNumberA) {
        super(logger) ;

        this.host_ = host ;
        this.socket_ = new net.Socket() ;
        this.port_ = port ;
    }

    public name() : string {
        return "TCPConnector" ;
    }

    public connect() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.logger_.info('SyncSocketConnectStart', traceFields(this.traceContext_, {
                host: this.host_,
                port: this.port_,
                connector: this.name(),
            })) ;

            this.socket_.removeAllListeners('connect') ;
            this.socket_.removeAllListeners('data') ;
            this.socket_.removeAllListeners('error') ;
            this.socket_.removeAllListeners('close') ;
            this.socket_.removeAllListeners('end') ;
            this.socket_.removeAllListeners('timeout') ;

            this.socket_.once('connect', () => {
                this.logger_.info('SyncSocketConnected', traceFields(this.traceContext_, {
                    host: this.host_,
                    port: this.port_,
                    localAddress: this.socket_.localAddress,
                    localPort: this.socket_.localPort,
                    remoteAddress: this.socket_.remoteAddress,
                    remotePort: this.socket_.remotePort,
                })) ;
                this.emit('connected') ;
                resolve() ;
            }) ;

            this.socket_.on('data', (data) => {
                this.logger_.debug('SyncSocketData', traceFields(this.traceContext_, {
                    bytes: data.length,
                    remoteAddress: this.socket_.remoteAddress,
                    remotePort: this.socket_.remotePort,
                })) ;
                this.extractPacket(data) ;
            }) ;

            this.socket_.on('error', (err) => {
                this.logger_.error('SyncSocketError', traceFields(this.traceContext_, {
                    host: this.host_,
                    port: this.port_,
                    message: err.message,
                    code: (err as NodeJS.ErrnoException).code,
                })) ;
                this.emit('error', err) ;
                if (!this.socket_.connecting) {
                    return ;
                }
                reject(err) ;
            }) ;

            this.socket_.on('close', () => {
                this.logger_.info('SyncSocketClosed', traceFields(this.traceContext_, {
                    host: this.host_,
                    port: this.port_,
                    localAddress: this.socket_.localAddress,
                    localPort: this.socket_.localPort,
                })) ;
                this.emit('close') ;
            }) ;

            this.socket_.on('end', () => {
                this.logger_.info('SyncSocketEnded', traceFields(this.traceContext_, {
                    host: this.host_,
                    port: this.port_,
                })) ;
            }) ;

            this.socket_.on('timeout', () => {
                this.logger_.warn('SyncSocketTimeout', traceFields(this.traceContext_, {
                    host: this.host_,
                    port: this.port_,
                })) ;
            }) ;

            this.socket_.connect(this.port_, this.host_) ;
        }) ;

        return ret ;
    }

    public close() : void {
        this.logger_.info('SyncSocketDestroy', traceFields(this.traceContext_, {
            host: this.host_,
            port: this.port_,
        })) ;
        this.socket_.destroy() ;
    }

    public send(p: PacketObj) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.logger_.debug('SyncSocketWrite', traceFields(this.traceContext_, {
                host: this.host_,
                port: this.port_,
                packetType: p.type_,
                payloadBytes: p.data_.length,
            })) ;
            let buffer = this.convertToBytes(p) ;
            this.socket_.write(buffer, (err) => {
                if (err) {
                    reject(err) ;
                }
                else {
                    resolve() ;
                }
            }) ;
        }) ;

        return ret ;
    }
}
