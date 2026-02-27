import {  XeroLogger  } from "../utils/xerologger.js";
import { EventEmitter } from 'events';
import { XeroCBManager } from "./cbmanager.js";

type XeroCBCallback = (arg: any) => void ;

declare global {
    interface Window {
      scoutingAPI: {
        send(name: string, arg?: any): void;
        receive(name: string, callback: (arg: any) => void): void;
        receiveOff(name: string, callback: (arg: any) => void): void;
      };
    }
}

export class XeroMainProcessInterface extends EventEmitter {
    private static cbmgr_? : XeroCBManager = new XeroCBManager() ;
    private cbs_registered_ : [name: string , callback: XeroCBCallback][] = [] ;

    constructor() {
        super() ;
        this.cbs_registered_ = [] ;
    }

    public close() {
        this.unregisterAllCallbacks() ;
    }

    public registerCallback(name: string, callback: XeroCBCallback) {
        if (XeroMainProcessInterface.cbmgr_) {
            XeroMainProcessInterface.cbmgr_.registerCallback(name, callback) ;
            this.cbs_registered_.push([name, callback]) ;
        }
    }

    public unregisterAllCallbacks() {
        for(let cb of this.cbs_registered_) {
            let name = cb[0] ;
            let callback = cb[1] ;
            if (XeroMainProcessInterface.cbmgr_) {
                XeroMainProcessInterface.cbmgr_.unregisterCallback(name, callback) ;
            }
        }
    }

    public request(name: string, arg?: any) {
        window.scoutingAPI.send(name, arg);
    }

}
