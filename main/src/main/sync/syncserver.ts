import winston from "winston";
import { PacketObj } from "./packetobj";
import { PacketCompressionNone } from "./packettypes";
import { EventEmitter } from 'events';
import { SyncBase } from "./syncbase";

export abstract class SyncServer extends SyncBase
{
    constructor(logger: winston.Logger) {
        super(logger) ;
    }

    public abstract init(arg: any) : Promise<void> ;
    public abstract name() : string ;
    public abstract send(p: PacketObj) : void ;
    public abstract shutdownClient() : void ;
}