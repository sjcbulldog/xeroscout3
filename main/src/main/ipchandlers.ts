import { scappbase } from "../main";
import { SCCentral } from "./apps/sccentral";
import { SCScout } from "./apps/scscout";
import { XeroAppType } from "./apps/scbase";
import { GraphDataRequest } from "./apps/sccentral";
import { DataSet } from "./project/datasetmgr";
import { TeamNickNameNumber } from "./project/teammgr";
import { TabletData } from "./project/tabletmgr";
import { GraphConfig } from "./project/graphmgr";
import { ProjPickListColConfig, ProjPicklistNotes} from "./project/picklistmgr";
import { IPCNamedDataValue, IPCProjColumnsConfig } from "../shared/ipc";

// get-info-data
export async function getInfoData(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.sendInfoData() ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    }
}

// get-nav-data
export async function getNavData(cmd: string, ...args: any[]) {
    if (scappbase) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        if (args.length === 0) {
            scappbase.sendNavData() ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    }
}

// get-team-field-list
export async function getTeamFieldList(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.sendTeamFieldList() ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }        
    }
}

// get-match-field-list
export async function getMatchFieldList(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.sendMatchFieldList() ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }        
    }
}

// get-formulas
export async function getFormulas(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.sendFormulas() ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }        
    }
}

// get-datasets
export async function getDataSets(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.sendDataSets() ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }        
    }
}

// rename-dataset
export async function renameDataSet(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && Array.isArray(args[0])) {
            let dargs = args[0] as any[] ;
            if (typeof dargs[0] === 'string' && typeof dargs[1] === 'string') {
                central.renameDataSet(dargs[0] as string, dargs[1] as string) ;
            }
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }        
    }
}

// update-dataset
export async function updateDataSet(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1) {
            central.updateDataSet(args[0] as DataSet) ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }        
    }
}

// delete-dataset
export async function deleteDataSet(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'string') {
            central.deleteDataSet(args[0] as string) ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }        
    }
}

// get-event-data
export async function getSelectEventData(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.sendEventData() ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }             
    } 
}

// get-tablet-data
export async function getTabletData(cmd: string, ...args: any[]) {
    if (scappbase) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});

        if (args.length === 0) {
            if (scappbase.applicationType === XeroAppType.Central) {
                let central : SCCentral = scappbase as SCCentral ;
                central.sendTabletData() ;
            }
            else {
                let scout: SCScout = scappbase as SCScout ;
                scout.sendTabletData() ;
            }
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});            
        }
    } 
}

// generate-random-data
export async function generateRandomData(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.generateRandomData() ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }          
    }
}

// get-team-data
export async function getTeamData(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.sendTeamData() ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }              
    } 
}

// get-match-data
export async function getMatchData(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.sendMatchData() ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }            
    } 
}

// set-team-data
export async function setTeamData(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && Array.isArray(args[0])) {
            central.setTeamData(args[0] as TeamNickNameNumber[]) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});            
        }
    } 
}

// get-match-db
export async function getMatchDB(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.sendMatchDB() ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }           
    } 
}

// update-match-db
export async function updateMatchDB(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && Array.isArray(args[0])) {
            central.updateMatchDB(args[0]) ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }           
    } 
}

// get-team-db
export async function getTeamDB(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.sendTeamDB() ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }           
    } 
}

// update-team-db
export async function updateTeamDB(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && Array.isArray(args[0])) {
            central.updateTeamDB(args[0]) ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }           
    } 
}

// get-team-status
export async function getTeamStatus(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.sendTeamStatus() ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }         
    } 
}

// get-match-status
export async function getMatchStatus(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.sendMatchStatus() ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }         
    } 
}   

// get-team-list
export async function getTeamList(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.getTeamList() ;
        } else if (args.length > 0) {
            central.getTeamListAndNames() ;
        }
    } 
}

// get-stored-graph-list
export async function getStoredGraphList(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.getStoredGraphList() ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }            

    }
}

// get-match-list
export async function getMatchList(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 0) {
            central.getMatchList() ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }            
    } 
}

// load-ba-event-data evkey:string
export async function loadBaEventData(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'string') {
            central.loadBaEventData(args[0] as string) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
            central.loadBaEventDataError() ;
        }
    }
}

// execute-command cmd:string
export async function executeCommand(cmd: string, ...args: any[]) {
    if (scappbase) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        if (args.length === 1 && typeof args[0] === 'string') {
            scappbase.executeCommand(args[0] as unknown as string) ;
        } else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }           
    }
}

// set-tablet-data data:TabletData[]
export async function setTabletData(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1) {
            central.setTabletData(args[0] as TabletData[]) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});            
        }
    } 
}

// delete-formula formula_name:string
export async function deleteFormula(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'string') {
            central.deleteFormula(args[0] as string) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});            
        }
    }
}

// update-formula [formula_name:string, formula:string]
export async function updateFormula(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && Array.isArray(args[0])) {
            let data = args[0] as any[] ;
            if (data.length === 3 && typeof data[0] === 'string' && typeof data[1] === 'string' && typeof data[2] === 'string') {
                central.updateFormula(data[0] as string, data[1] as string, data[2] as string) ;
            }
            else {
                scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});                 
            }
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});             
        }
    }
}

// rename-formula [old_name:string, new_name:string]
export async function renameFormula(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && Array.isArray(args[0])) {
            let data = args[0] as any[] ;
            if (data.length === 2 && typeof data[0] === 'string' && typeof data[1] === 'string') {
                central.renameFormula(data[0] as string, data[1] as string) ;
            }
            else {
                scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});                 
            }
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});             
        }
    }
}

// set-event-name event_name:string
export async function setEventName(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'string') {
            central.setEventName(args[0]) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});             
        }
    }
}

// get-form form_name:string
export async function getForm(cmd: string, ...args: any[]) {
    if (scappbase) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        if (args.length === 1 && typeof args[0] === 'string') {
            if (scappbase.applicationType === XeroAppType.Central) {
                let central : SCCentral = scappbase as SCCentral ;
                central.sendForm(args[0]) ;
            } 
            else if (scappbase.applicationType === XeroAppType.Scouter) {
                let scout: SCScout = scappbase as SCScout ;
                scout.sendForm(args[0]) ;
            }
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});             
        }
    }
}

// get-image-data image:string
export async function getImageData(cmd: string, ...args: any[]) {
    if (scappbase) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        if (args.length === 1 && typeof args[0] === 'string') {
            scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
            scappbase.sendImageData(args[0]) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});             
        }
    }
}

export async function getImages(cmd: string, ...args: any[]) {
    if (scappbase) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        if (args.length === 0) {
            if (scappbase.applicationType === XeroAppType.Central) {
                scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
                let central : SCCentral = scappbase as SCCentral ;
                central.sendImages() ;
            } 
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});             
        }
    }
}

export async function importImage(cmd: string, ...args: any[]) {
    if (scappbase) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        if (args.length === 0) {
            if (scappbase.applicationType === XeroAppType.Central) {
                scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
                let central : SCCentral = scappbase as SCCentral ;
                central.importImage() ;
            } 
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});             
        }
    }
}

// save-form form_name:string contents:object
export async function saveForm(cmd: string, ...args: any[]) {
    if (scappbase) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        if (args.length === 1 && typeof args[0] === 'object') {
            if (scappbase.applicationType === XeroAppType.Central) {
                scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
                let central : SCCentral = scappbase as SCCentral ;
                let obj = args[0] as any ;
                central.saveForm(obj.type, obj.contents) ;
            } 
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});             
        }
    }
}

// set-match-data data:object[]
export async function setMatchData(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && Array.isArray(args[0])) {
            central.setMatchData(args[0]) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});             
        }        
    } 
}

// set-tablet-name-purpose { name: string, purpose: string }
export async function setTabletNamePurpose(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Scouter) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let scout : SCScout = scappbase as SCScout ;       
        if (args.length === 1 && typeof args[0] === 'object') {
            let obj = args[0] ;
            if (obj.hasOwnProperty('name') && obj.hasOwnProperty('purpose')) {
                scout.setTabletNamePurpose(obj.name, obj.purpose) ;
            }
            else {
                scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});                     
            }
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});             
        }        
    } 
}

// provide-result data:object[]
export async function provideResult(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Scouter) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let scout : SCScout = scappbase as SCScout ;
        if (args.length === 1 && typeof args[0] === 'object') {
            scout.provideResults(args[0] as IPCNamedDataValue[]) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});             
        }
    } 
}

// set-team-data data:ProjColConfig
export async function sendMatchColConfig(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'object') {
            central.setMatchColConfig(args[0] as IPCProjColumnsConfig) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});     
        }
    } 
}

// set-team-col-config data:ProjColConfig
export async function sendTeamColConfig(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'object') {
            central.setTeamColConfig(args[0] as IPCProjColumnsConfig) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});     
        }
    } 
}

// get-team-graph-data
export async function getTeamGraphData(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'object') {
            central.sendTeamGraphData(args[0] as GraphDataRequest) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    } 
}

// save-team-graph-setup data:object
export async function saveTeamGraphSetup(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'object') {
            central.saveTeamGraphSetup(args[0] as GraphConfig) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});            
        }
    } 
}

// delete-stored-graph graph_name:string
export async function deleteStoredGraph(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'string') {
            central.deleteStoredGraph(args[0]) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});            
        }
    } 
}

// get-picklist-data picklist_name:string
export async function getPicklistData(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'string') {
            central.sendPicklistData(args[0]) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    } 
}

// get-picklist-notes picklist_name:string
export async function getPicklistNotes(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'string') {
            central.sendPicklistNotes(args[0]) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    } 
}

// get-picklist-list picklist_name:string
export async function getPicklistList(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'boolean') {
            central.sendPicklistList(args[0] as boolean) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    } 
}

// create-new-picklist picklist_name:string
export async function createNewPicklist(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && Array.isArray(args)) {
            let data = args[0] ;
            if (Array.isArray(data) && data.length === 2 && typeof data[0] === 'string' && typeof data[1] === 'string') {
                central.createNewPicklist(data[0] as string, data[1] as string) ;
            }
            else {
                scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
            }
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    } 
}

// delete-picklist picklist_name:string
export async function deletePicklist(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'string') {
            central.deletePicklist(args[0] as string) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    } 
}

// update-picklist-notes { picklist_name:string, notes:ProjPicklistNotes[] }
export async function updatePicklistNotes(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'object') {
            let obj = args[0] ;
            if (obj.hasOwnProperty('name') && obj.hasOwnProperty('notes')) {
                central.updatePicklistNotes(obj.name as string, obj.notes as ProjPicklistNotes[]) ;
            }
            else {
                scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
            }
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    } 
}

// update-picklist-columns { picklist_name:string, columns:ProjPicklistColumns[] }
export async function updatePicklistColumns(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'object') {
            let obj = args[0] ;
            if (obj.hasOwnProperty('name') && obj.hasOwnProperty('cols')) {
                central.updatePicklistCols(obj.name as string, obj.cols as ProjPickListColConfig[]) ;
            }
            else {
                scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
            }
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    } 
}

// update-picklist-data { picklist_name:string, teams: teams in rank order }
export async function updatePicklistData(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'object') {
            let obj = args[0] ;
            if (obj.hasOwnProperty('name') && obj.hasOwnProperty('teams')) {
                central.updatePicklistData(obj.name as string, obj.teams as number[]) ;
            }
            else {
                scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
            }
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    } 
}

// update-picklist-data { picklist_name:string, teams: teams in rank order }
export async function getPicklistColumns(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'string') {
            central.sendPicklistColumns(args[0] as string) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    } 
}

// update-picklist-data { picklist_name:string, teams: teams in rank order }
export async function getPicklistColData(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'object') {
            let obj = args[0] ;
            if (obj.hasOwnProperty('name') && obj.hasOwnProperty('field')) {
                central.sendPicklistColData(obj.name as string, obj.field as string) ;
            }
            else {
                scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
            }
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    } 
}

export async function getSingleTeamData(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'object') {       
            let obj = args[0] ;
            if (obj.hasOwnProperty('team') && obj.hasOwnProperty('dataset')) {   
                central.getSingleTeamData(obj.dataset, obj.team) ;
            }
            else {
                scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
            }
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    } 
}

export async function getHintDB(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        if (args.length === 0) {
            let central : SCCentral = scappbase as SCCentral ;
            central.sendHintDB() ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    }
}

export async function setHintHidden(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Central) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let central : SCCentral = scappbase as SCCentral ;
        if (args.length === 1 && typeof args[0] === 'string') {       
            central.setHintHidden(args[0] as string) ;
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    } 
}

export async function syncIPAddr(cmd: string, ...args: any[]) {
    if (scappbase && scappbase.applicationType === XeroAppType.Scouter) {
        scappbase.logger_.silly({ message: 'renderer -> main', args: {cmd: cmd, cmdargs: args}});
        let scouter : SCScout = scappbase as SCScout ;
        if (args.length === 1 && typeof args[0] === 'object') {
            let obj = args[0] ;
            if (obj.hasOwnProperty('ipaddr') && obj.hasOwnProperty('port')) {
                scouter.syncIPAddrWithAddr(obj.ipaddr as string, obj.port as number) ;
            }
        }
        else {
            scappbase.logger_.error({ message: 'renderer -> main invalid args', args: {cmd: cmd, cmdargs: args}});
        }
    } 
}

/////////////////////////////////////////////////////////////////////////////////////////
export async function clientLog(cmd: string, ...args: any[]) {
    if (scappbase) {
        scappbase.logClientMessage(args[0]) ;
    }
}

export async function splitterChanged(cmd: string, ...args: any[]) {
    if (scappbase && args.length === 1 && typeof args[0] === 'number') {
        scappbase.splitterChanged(args[0] as number) ;
    }
}
