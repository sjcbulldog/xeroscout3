import { app, BrowserWindow, BrowserWindowConstructorOptions, crashReporter, dialog, ipcMain, Menu } from "electron";
import * as path from "path";
import { SCBase } from "./main/apps/scbase";
import { SCScout } from "./main/apps/scscout";
import { SCCentral } from "./main/apps/sccentral";
import { SCCoach } from "./main/apps/sccoach";
import { getNavData as getNavData, executeCommand, getInfoData, getSelectEventData, loadBaEventData, getTabletData, 
         setTabletData, getTeamData, setTeamData, getMatchData, setMatchData, getTeamStatus, getMatchStatus, setTabletNamePurpose, 
         provideResult, setEventName, getMatchDB, getTeamDB, sendMatchColConfig, sendTeamColConfig, generateRandomData,
         getTeamList, getForm, getFormulas, deleteFormula,
         renameFormula, updateFormula, getDataSets, updateDataSet, getTeamFieldList, getMatchFieldList,
         saveForm, getImageData, 
         getHintDB,
         setHintHidden,
         updateMatchDB,
         updateTeamDB,
         splitterChanged,
         syncIPAddr,
         getPlayoffStatus,
         setAllianceTeams,
         setPlayoffMatchOutcome,
         getMatchFormatFormulas,
         getTeamFormatFormulas,
         setMatchFormatFormulas,
         setTeamFormatFormulas,
         getImageNames,
         getSingleTeamConfigs,
         updateSingleTeamConfigs,
         getGraphData
} from "./main/ipchandlers" ;
import { runUnitTests } from "./main/units/unittest";

export let scappbase : SCBase | undefined = undefined ;

const Config = require('electron-config') ;
let config = new Config() ;

function createWindow() : void {
    const args = process.argv;

    let content = path.join(process.cwd(), 'content') ;
    let icon = path.join(content, 'images', 'tardis.ico') ;

    let bounds = config.get('windowBounds') ;
    let opts : BrowserWindowConstructorOptions = {
        icon: icon,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'main', 'preload.js'),
        },
        title: "XeroScout"
    };

    if (bounds) {
        opts.width = bounds.width ;
        opts.height = bounds.height ;
        opts.x = bounds.x ;
        opts.y = bounds.y ;
    }
  
    const win = new BrowserWindow(opts);

    bounds = undefined ;
    if (!bounds) {
        win.maximize() ;
    }

    if (process.argv.length > 2) {
        let index = 2 ;
        while (index < process.argv.length && process.argv[index].startsWith('-')) {
            index++ ;
        }

        if (index === process.argv.length) {
            scappbase = new SCCentral(win, args) ;            
        }       
        else if (process.argv[index] === "scout") {
            scappbase = new SCScout(win, args) ;
        }
        else if (process.argv[index] === "coach") {
            scappbase = new SCCoach(win, args) ;
        }
        else if (process.argv[index] === 'central') {
            scappbase = new SCCentral(win, args) ;
        }
        else if (process.argv[index] === 'unittests') {
            runUnitTests() ;
            app.exit(0) ;
        }
        else {
            dialog.showMessageBoxSync(win, {
                type: 'error',
                title: 'Error',
                message: 'Invalid application specified - the first argument that is not a flag must be the application name (e.g. scout, coach, central)',
                buttons: ['OK']
            });
            app.exit(1) ;
        }
    }

    if (!scappbase) {
        console.log("No App Created, args: " + process.argv) ;
        app.exit(1) ;
    }
  
    win
      .loadFile(scappbase!.basePage())
      .then(() => {
        scappbase?.mainWindowLoaded() ;
      })
      .catch((e) => {
        scappbase?.logger_.error("Error loading page: " + e) ;
      }) ;

    Menu.setApplicationMenu(scappbase!.createMenu()) ;

    win.on('ready-to-show', () => {
        // win.webContents.openDevTools() ;
    }) ;
    
    win.on("close", (event) => {
        if (scappbase) {
            if (!scappbase.canQuit()) {
                event.preventDefault() ;
            }
            else {
                config.set('windowBounds', win.getBounds()) ;
            }
        }
    });

    scappbase!.windowCreated() ;
}

app.on("ready", () => {
    ipcMain.on('sync-ipaddr', (event, ...args) => { syncIPAddr('splitter-changed', ...args)}) ;    
    ipcMain.on('splitter-changed', (event, ...args) => { splitterChanged('splitter-changed', ...args)}) ;
    ipcMain.on('get-nav-data', (event, ...args) => { getNavData('get-nav-data', ...args)});
    ipcMain.on('get-info-data', (event, ...args) => { getInfoData('get-info-data', ...args)}) ;
    ipcMain.on('get-formulas', (event, ...args) => { getFormulas('get-formulas', ...args)}) ;
    ipcMain.on('get-datasets', (event, ...args) => { getDataSets('get-datasets', ...args)}) ;
    ipcMain.on('update-datasets', (event, ...args) => { updateDataSet('update-datasets', ...args)}) ;
    ipcMain.on('delete-formula', (event, ...args) => { deleteFormula('delete-formulas', ...args)}) ;
    ipcMain.on('rename-formula', (event, ...args) => { renameFormula('rename-formulas', ...args)}) ;
    ipcMain.on('update-formula', (event, ...args) => { updateFormula('update-formulas', ...args)}) ;
    ipcMain.on('generate-random-data', (event, ...args) => { generateRandomData('generate-random-data', ...args)}) ;
    ipcMain.on('set-event-name', (event, ...args) => { setEventName('set-event-name', ...args)}) ;
    ipcMain.on('get-event-data', (event, ...args) => { getSelectEventData('get-event-data', ...args)}) ;
    ipcMain.on('get-tablet-data', (event, ...args) => { getTabletData('get-tablet-data', ...args)}) ;
    ipcMain.on('set-tablet-data', (event, ...args) => { setTabletData('set-tablet-data', ...args)}) ;
    ipcMain.on('get-team-data', (event, ...args) => { getTeamData('get-team-data', ...args)}) ;
    ipcMain.on('get-team-field-list', (event, ...args) => { getTeamFieldList('get-team-field-list', ...args)}) ;
    ipcMain.on('get-match-field-list', (event, ...args) => { getMatchFieldList('get-match-field-list', ...args)}) ;
    ipcMain.on('get-match-db', (event, ...args) => { getMatchDB('get-match-db', ...args)});
    ipcMain.on('update-match-db', (event, ...args) => { updateMatchDB('update-match-db', ...args)}) ;
    ipcMain.on('get-team-db', (event, ...args) => { getTeamDB('get-team-db', ...args)}) ;
    ipcMain.on('update-team-db', (event, ...args) => { updateTeamDB('update-team-db', ...args)}) ;
    ipcMain.on('get-form', (event, ...args) => { getForm('get-form', ...args)});
    ipcMain.on('get-image-data', (event, ...args) => { getImageData('get-image-data', ...args)});
    ipcMain.on('save-form', (event, ...args) => { saveForm('save-form', ...args)});
    ipcMain.on('get-match-data', (event, ...args) => { getMatchData('get-match-data', ...args)});
    ipcMain.on('get-team-status', (event, ...args) => { getTeamStatus('get-team-status', ...args)}) ;
    ipcMain.on('get-match-status', (event, ...args) => { getMatchStatus('get-match-status', ...args)}) ;
    ipcMain.on('set-team-data', (event, ...args) => { setTeamData('set-team-data', ...args)}) ;
    ipcMain.on('set-match-data', (event, ...args) => { setMatchData('set-match-data', ...args)}) ;
    ipcMain.on('load-ba-event-data', (event, ...args) => { loadBaEventData('load-ba-event-data', ...args)}) ;
    ipcMain.on('execute-command', (event, ...args) => { executeCommand('execute-command', ...args)}) ;
    ipcMain.on('set-tablet-name-purpose', (event, ...args) => { setTabletNamePurpose('set-table-name-purpose', ...args)}) ;
    ipcMain.on('provide-result', (event, ...args) => { provideResult('provide-result', ...args)}) ;
    ipcMain.on('send-match-col-config', (event, ...args) => { sendMatchColConfig('send-match-col-config', ...args)}) ;
    ipcMain.on('send-team-col-config', (event, ...args) => { sendTeamColConfig('send-team-col-config', ...args)}) ;
    ipcMain.on('get-team-list', (event, ...args) => { getTeamList('get-team-list', ...args)}) ;
    ipcMain.on('get-hint-db', (event, ...args) => { getHintDB('get-hint-db', ...args)}) ;
    ipcMain.on('set-hint-hidden', (event, ...args) => { setHintHidden('get-hint-db', ...args)}) ;
    ipcMain.on('get-playoff-status', (event, ...args) => { getPlayoffStatus('get-playoff-status', ...args)}) ;
    ipcMain.on('set-alliance-teams', (event, ...args) => { setAllianceTeams('set-alliance-teams', ...args)}) ;
    ipcMain.on('set-playoff-match-outcome', (event, ...args) => { setPlayoffMatchOutcome('set-playoff-match-outcome', ...args)}) ;
    ipcMain.on('get-match-format-formulas', (event, ...args) => { getMatchFormatFormulas('get-match-format-formulas', ...args)}) ;
    ipcMain.on('get-team-format-formulas', (event, ...args) => { getTeamFormatFormulas('get-team-format-formulas', ...args)}) ;    
    ipcMain.on('set-match-format-formulas', (event, ...args) => { setMatchFormatFormulas('set-match-format-formulas', ...args)}) ;
    ipcMain.on('set-team-format-formulas', (event, ...args) => { setTeamFormatFormulas('set-team-format-formulas', ...args)}) ;       
    ipcMain.on('get-image-names', (event, ...args) => { getImageNames('get-image-names', ...args)}) ;
    ipcMain.on('get-chart-data', (event, ...args) => { getGraphData('get-chart-data', ...args)}) ;

    ipcMain.on('get-single-team-configs', (event, ...args) => { getSingleTeamConfigs('get-single-team-configs', ...args)}) ;
    ipcMain.on('update-single-team-configs', (event, ...args) => { updateSingleTeamConfigs('update-single-team-configs', ...args)}) ;
    ipcMain.on('get-multi-team-configs', (event, ...args) => { getSingleTeamConfigs('get-multi-team-configs', ...args)}) ;
    ipcMain.on('update-multi-team-configs', (event, ...args) => { updateSingleTeamConfigs('update-multi-team-configs', ...args)}) ;
    ipcMain.on('get-match-configs', (event, ...args) => { getSingleTeamConfigs('get-match-configs', ...args)}) ;
    ipcMain.on('update-match-configs', (event, ...args) => { updateSingleTeamConfigs('update-match-configs', ...args)}) ;
    ipcMain.on('get-chart-data', (event, ...args) => { getGraphData('get-graph-data', ...args)}) ;

    createWindow() ;
}) ;

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', (ev) => {
    if (scappbase) {
        if (!scappbase.canQuit()) {
            ev.preventDefault() ;
        }
        else {
            scappbase.close() ;
        }
    }
}) ;
