import * as dgram from "node:dgram" ;
import * as winston from "winston";
import { traceFields } from "./syncdiag";

export class UDPBroadcast {
    private static readonly portNumber: number = 45456 ;

    private ipaddr_ : string ;
    private socket_?: dgram.Socket;
    private team_number_ : number;
    private interval_: number;
    private message_ = Buffer.from("XeroScout3 UDP Broadcast") ;
    private logger_: winston.Logger;

    public constructor(logger: winston.Logger, ipaddr: string, teamNumber: number, interval: number = 5000) {
        this.logger_ = logger;
        this.ipaddr_ = ipaddr;

        this.logger_.info("SyncBroadcastCreated", traceFields(undefined, {
            transport: 'udp-broadcast',
            teamNumber: teamNumber,
            host: ipaddr,
            port: UDPBroadcast.portNumber,
            intervalMs: interval,
        }));
        this.team_number_ = teamNumber;
        this.interval_ = interval;

        this.message_ = Buffer.from(`xeroscout3:${this.team_number_},${this.ipaddr_}`) ;
    }

    public start() {
        this.socket_ = dgram.createSocket("udp4");
        this.logger_.info("SyncBroadcastStart", traceFields(undefined, {
            transport: 'udp-broadcast',
            host: this.ipaddr_,
            port: UDPBroadcast.portNumber,
            intervalMs: this.interval_,
            message: this.message_.toString('utf-8'),
        })) ;
        this.socket_.bind(UDPBroadcast.portNumber) ;

        this.socket_.on("error", (err) => {
            this.logger_.error("SyncBroadcastError", traceFields(undefined, {
                transport: 'udp-broadcast',
                host: this.ipaddr_,
                port: UDPBroadcast.portNumber,
                message: err.message,
            }));
        });
        this.socket_.on("listening", this.listening.bind(this));
    }

    private listening() {
        this.socket_?.setBroadcast(true) ;
        this.logger_.info("SyncBroadcastListening", traceFields(undefined, {
            transport: 'udp-broadcast',
            host: this.ipaddr_,
            port: UDPBroadcast.portNumber,
            intervalMs: this.interval_,
        })) ;
        // Broadcast every 5 seconds
        setInterval(() => {
            this.logger_.debug("SyncBroadcastSend", traceFields(undefined, {
                transport: 'udp-broadcast',
                host: this.ipaddr_,
                port: UDPBroadcast.portNumber,
                bytes: this.message_.length,
                destination: '255.255.255.255',
            })) ;
            this.socket_?.send(this.message_, 0, this.message_.length, UDPBroadcast.portNumber, '255.255.255.255')
        }, this.interval_   );
    }
}
