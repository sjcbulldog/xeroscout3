import { IPCPlayoffStatus } from "../../shared/ipc";
import { Manager } from "./manager";
import winston from "winston";

export class PlayoffManager extends Manager {
    private playoffData_: IPCPlayoffStatus ;

    public constructor(logger: winston.Logger, writer: () => void, playoffData: IPCPlayoffStatus) {
        super(logger, writer) ;
        this.playoffData_ = playoffData ;
    }
    
    public get info() : IPCPlayoffStatus {
        return this.playoffData_ ;
    }

    public processAllianceData(alliances: any) : void {
        console.log(alliances) ;
    }
}