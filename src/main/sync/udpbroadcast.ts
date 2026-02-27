import * as dgram from "node:dgram" ;
import * as winston from "winston";

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

        this.logger_.info("UDPBroadcast created for team", teamNumber);
        this.team_number_ = teamNumber;
        this.interval_ = interval;

        this.message_ = Buffer.from(`xeroscout3:${this.team_number_},${this.ipaddr_}`) ;
    }

    public start() {
        this.socket_ = dgram.createSocket("udp4");
        this.socket_.bind(UDPBroadcast.portNumber) ;

        this.socket_.on("error", (err) => {
            this.logger_.error("UDP socket error:", err);
        });
        this.socket_.on("listening", this.listening.bind(this));
    }

    private listening() {
        this.socket_?.setBroadcast(true) ;
        // Broadcast every 5 seconds
        setInterval(() => {
            this.socket_?.send(this.message_, 0, this.message_.length, UDPBroadcast.portNumber, '255.255.255.255')
        }, this.interval_   );
    }
}
