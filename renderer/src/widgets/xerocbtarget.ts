import {  XeroLogger  } from "../utils/xerologger.js";
import { EventEmitter } from 'events';

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
    private static verbose_ : boolean = true ;
    private cbmap_ : Map<string, XeroCBCallback[]> = new Map() ;

    constructor() {
        super() ;
    }

    unregisterAllCallbacks() {
        for(let name of this.cbmap_.keys()) {
            let callbacks = this.cbmap_.get(name) ;
            for (let i = 0; i < callbacks!.length; i++) {
                this.unregisterCallback(name, callbacks![i]) ;
            }
        }
    }

    request(name: string, arg?: any) {
        if (XeroMainProcessInterface.verbose_) {
            let logger = XeroLogger.getInstance() ;
            logger.debug(`XeroCBTarget.request: name='${name}', arg='${JSON.stringify(arg)}'`) ;
        }

        window.scoutingAPI.send(name, arg);
    }

    registerCallback(name: string, callback: XeroCBCallback) {
        if (XeroMainProcessInterface.verbose_) {
            let logger = XeroLogger.getInstance() ;
            logger.debug(`XeroCBTarget.registerCallback: name=${name}`) ;
        }

        if (!this.cbmap_.has(name)) {
            this.cbmap_.set(name, [callback]) ;
            window.scoutingAPI.receive(name, this.dispatchCallback.bind(this, name)) ;
        }
        else {
            let callbacks = this.cbmap_.get(name) ;
            callbacks!.push(callback) ;
        }

    }

    unregisterCallback(name: string, callback: XeroCBCallback) {
        if (XeroMainProcessInterface.verbose_) {
            let logger = XeroLogger.getInstance() ;
            logger.debug(`XeroCBTarget.unregisterCallback: name=${name}`) ;
        }

        if (!this.cbmap_.has(name)) {
            return ;
        }

        let callbacks = this.cbmap_.get(name) ;
        let index = callbacks!.indexOf(callback) ;
        if (index >= 0) {
            callbacks!.splice(index, 1) ;
        }
        if (callbacks!.length == 0) {
            this.cbmap_.delete(name) ;
            window.scoutingAPI.receiveOff(name, this.dispatchCallback.bind(this, name)) ;
        }
        else {
            this.cbmap_.set(name, callbacks!) ;
        }
    }

    dispatchCallback(name: string, arg: any) {
        if (XeroMainProcessInterface.verbose_) {
            let logger = XeroLogger.getInstance() ;
            let argstr ;
            if (arg === null) {
                argstr = 'null' ;
            }
            else if (arg === undefined) {
                argstr = 'undefined' ;
            }
            else {
                argstr = JSON.stringify(arg) ;
            }   

            if (argstr.length > 80) {
                argstr = argstr.substring(0, 80) + '...' ;
            }
            logger.debug(`XeroCBTarget.dispatchCallback: name='${name}', arg='${argstr}'`) ;
        }
        const callbacks = this.cbmap_.get(name) ;
        if (callbacks) {
            for (const callback of callbacks) {
                callback(arg) ;
            }
        }
    }
}
