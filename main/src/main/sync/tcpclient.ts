import winston from "winston";
import { PacketObj } from "./packetobj";
import { SyncClient } from "./syncclient";
import * as net from 'net' ;
import { dialog } from "electron";

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
            this.socket_.removeAllListeners('connect') ;
            this.socket_.removeAllListeners('data') ;
            this.socket_.removeAllListeners('error') ;
            this.socket_.removeAllListeners('close') ;

            this.socket_.once('connect', () => {
                this.emit('connected') ;
                resolve() ;
            }) ;

            this.socket_.on('data', (data) => {
                this.logger_.debug('TCPClient received ' + data.length + ' bytes of data') ;
                this.extractPacket(data) ;
            }) ;

            this.socket_.on('error', (err) => {
                this.emit('error', err) ;
                if (!this.socket_.connecting) {
                    return ;
                }
                reject(err) ;
            }) ;

            this.socket_.on('close', () => {
                this.emit('close') ;
            }) ;

            this.socket_.connect(this.port_, this.host_) ;
        }) ;

        return ret ;
    }

    public close() : void {
        this.socket_.destroy() ;
    }

    public send(p: PacketObj) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.logger_.debug(`TCPClient sending packet ${p.type_} to ${this.host_}`) ;
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
