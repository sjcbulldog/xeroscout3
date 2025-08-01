import { contextBridge, ipcRenderer,  } from 'electron';

// Create a type that should contain all the data we need to expose in the
// renderer process using `contextBridge`.

// export type scoutingAPI = {
// }

//
// Expose our functions in the `api` namespace of the renderer `Window`.
//
contextBridge.exposeInMainWorld( 'scoutingAPI', {
  //
  // These go from the render process to the main process
  //
  send: (channel: string, data: any) => {
      let validChannels = [
        'splitter-changed',
        'get-nav-data', 
        'sync-ipaddr',

        'get-info-data',

        'get-formulas',
        'delete-formula',
        'add-formula',
        'rename-formula',
        'update-formula',

        'get-datasets',
        'rename-dataset',
        'update-dataset',
        'delete-dataset',

        'generate-random-data',

        'set-event-name',
        'get-event-data',

        'get-tablet-data',
        'set-tablet-data',

        'get-team-data',
        'set-team-data',

        'get-match-data',
        'set-match-data',
        
        'load-ba-event-data',
        'execute-command',
        'get-form',
        'get-image-data',
        'import-image',
        'get-images',
        'save-form',

        'get-match-db',
        'update-match-db',
        'send-match-col-config',

        'get-team-db',
        'update-team-db',
        'send-team-col-config',

        'get-team-status',
        'get-match-status',

        'set-tablet-name-purpose',
        'provide-result',

        'get-team-graph-data',
        'get-team-list',
        'get-multi-selected-teams',
        'get-multi-team-data',
        'set-multi-selected-teams',
        'get-team-field-list',
        'get-match-field-list',
        'save-team-graph-setup',
        'get-match-list',
        'get-stored-graph-list',
        'delete-stored-graph',

        'get-picklist-data',
        'get-picklist-list',
        'get-picklist-col-data',
        'get-picklist-columns',
        'create-new-picklist',
        'delete-picklist',
        'get-picklist-columns',
        'get-picklist-col-data',
        'update-picklist-columns',
        'update-picklist-notes',
        'update-picklist-data',
        'get-picklist-notes',

        'client-log',

        'get-single-team-configs',
        'get-single-team-data',
        'update-single-team-config',
        'update-single-team-current',
        'delete-single-team-config',

        'get-hint-db',
        'set-hint-hidden',

        'get-playoff-status',
        'set-alliance-teams',
        'set-playoff-match-outcome',
        'get-match-format-formulas',
        'get-team-format-formulas',
        'set-match-format-formulas',
        'set-team-format-formulas',        
      ];
      if (validChannels.includes(channel)) {
        if (data) {
          ipcRenderer.send(channel, data);
        }
        else {
          ipcRenderer.send(channel) ;
        }
      }
  },

  //
  // These go from the main process to the renderer process
  //
  receiveOff: (channel: string, func:any) => {
    ipcRenderer.off(channel, func) ;
  },

  receive: (channel: string, func:any) => {
      let validChannels = [
        'update-main-window-view',
        'send-app-status',
        'event-name',
        'send-nav-data', 
        'send-nav-highlight',
        'send-info-data',
        'send-formulas',
        'send-datasets',
        'send-event-data',
        'send-tablet-data',
        'send-team-data',
        'send-match-data',
        'send-form',
        'send-images',
        'send-image-data',
        'send-form-image',
        'send-initial-values',
        'send-team-status',
        'send-match-status',
        'send-match-db',
        'send-team-db',
        'send-team-col-config',
        'send-match-col-config',
        'xero-app-init',
        'set-status-text',
        'set-status-html',
        'set-status-title',
        'set-status-visible',
        'set-status-close-button-visible',
        'set-status-bar-message',
        'request-results',
        'send-team-graph-data',
        'send-team-list',
        'send-multi-team-data',
        'send-multi-selected-teams',
        'send-team-field-list',
        'send-match-field-list',
        'send-match-list',
        'send-stored-graph-list',
        'tablet-title',
        'resize-window',
        'send-picklist-data',
        'send-picklist-list',
        'send-picklist-columns',
        'send-picklist-col-data',
        'send-picklist-notes',
        'send-single-team-data',
        'send-single-team-configs',
        'send-hint-db',
        'send-playoff-status',
        'send-match-format-formulas',
        'send-team-format-formulas'
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => func(args[0][0]));
      }
  }
}) ;
