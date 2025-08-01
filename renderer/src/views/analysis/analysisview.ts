import { XeroApp } from "../../apps/xeroapp.js";
import { IPCColumnDesc, IPCFormula, IPCAnalysisViewConfig, IPCAnalysisConfigData, IPCDataSet, IPCAnalysisData } from "../../shared/ipc.js";
import { XeroPoint } from "../../shared/xerogeom.js";
import { XeroPopupMenu, XeroPopupMenuItem } from "../../widgets/xeropopupmenu.js";
import { XeroYesNo } from "../../widgets/xeroyesnow.js";
import { XeroView } from "../xeroview.js";
import { AnalysisConfigDialog } from "./analysisdialog.js";

export class AnalysisView extends XeroView {
    private configs_ : IPCAnalysisConfigData | undefined = undefined ;
    private currentConfig_ : IPCAnalysisViewConfig | undefined = undefined ;
    private contextMenu_ : XeroPopupMenu | undefined = undefined ;
    private popupMenu_ : XeroPopupMenu | undefined = undefined ;
    private datasets_ : string[] = [] ;
    private formulas_ : string[] = [] ;
    private match_fields_ : string[] = [] ;
    private team_fields_ : string[] = [] ;
    private seen_formulas_ : boolean = false ;
    private seen_match_fields_ : boolean = false ;
    private seen_team_fields_ : boolean = false ;
    private seen_datasets_ : boolean = false ;
    private oldname_ : string | undefined = undefined ;
    private dialog_? : AnalysisConfigDialog = undefined ;
    private show_menu_ : boolean = false ;
    private name_ : string ;
    private title_ : string ;

    constructor(app: XeroApp, classname: string, name: string, title: string) {
        super(app, classname);

        this.name_ = name ;
        this.title_ = title ;

        this.startupMessage(`${this.title_} Loading`) ;

        this.registerCallback(`send-${this.name_}-configs`, this.receivedAnalysisConfigs.bind(this));
        this.registerCallback('send-formulas', this.receivedFormulas.bind(this)) ;
        this.registerCallback('send-match-field-list', this.receivedMatchFields.bind(this)) ;
        this.registerCallback('send-team-field-list', this.receivedTeamFields.bind(this)) ;
        this.registerCallback('send-datasets', this.receivedDatasets.bind(this)) ;
        this.registerCallback(`send-${this.name_}-data`, this.receivedData.bind(this)) ;

        this.request('get-match-field-list') ;
        this.request('get-team-field-list') ;
        this.request('get-formulas') ;        
        this.request('get-datasets') ;
    }

    public get title() : string {
        return this.title_ ;
    }

    public onVisible() {
        this.elem!.parentElement!.addEventListener('contextmenu', this.showContextMenu.bind(this)) ;
    }

    private checkReady() {
        if (this.seen_formulas_ && this.seen_match_fields_ && this.seen_team_fields_ && this.seen_datasets_) {
            if (this.datasets_.length === 0) {
                this.startupMessage(`No datasets are available<br> You must create a dataset before creating a ${this.title_} view`) ;
            }
            else {
                this.request(`get-${this.name_}-configs`) ;
            }
        }
    }

    private receivedFormulas(data: IPCFormula[]) {
        this.formulas_ = data.map(f => f.name) ;
        this.seen_formulas_ = true ;
        this.checkReady() ;
    }

    private receivedMatchFields(data: IPCColumnDesc[]) {
        this.match_fields_ = data.map(f => f.name) ;
        this.seen_match_fields_ = true ;
        this.checkReady() ;
    }

    private receivedTeamFields(data: IPCColumnDesc[]) {
        this.team_fields_ = data.map(f => f.name) ;
        this.seen_team_fields_ = true ;
        this.checkReady() ;
    }    

    private receivedDatasets(data: IPCDataSet[]) {
        this.datasets_ = data.map(d => d.name) ;
        this.seen_datasets_ = true ;
        this.checkReady() ;
    }

    private receivedAnalysisConfigs(data: IPCAnalysisConfigData) {
        this.configs_ = data ;
        this.createMenu() ;

        if (data.current && data.data.find(c => c.name === data.current)) {
            this.displayAnalysisView(data.current) ;
        }
        else {
            this.displayNoSelectedConfig() ;
        }
        
        this.show_menu_ = true ;
    }

    protected display(data: IPCAnalysisData, config: IPCAnalysisViewConfig) : void {
        this.startupMessage('Invalid Code - derived class must implement display method') ;
    }

    protected receivedData(data: IPCAnalysisData) : void {
        if (this.currentConfig_) {
            this.display(data, this.currentConfig_) ;
        }
    }

    private displayAnalysisView(name: string) {
        this.currentConfig_ = this.configs_?.data.find(c => c.name === name) ;
        if (!this.currentConfig_) {
            this.displayNoSelectedConfig() ;
            return ;
        }

        this.configs_!.current = name ;
        this.request(`update-${this.name_}-current`, name) ;
        this.request(`get-${this.name_}-data`, this.currentConfig_) ;
    }

    private displayNoSelectedConfig() {
        this.startupMessage(`${this.title_} View<br>Right click to configure`) ;
    }

    private dialogClosed(changed: boolean) {
        if (changed) {
            let config = this.dialog_!.config ;

            if (this.oldname_ && this.oldname_ !== config.name) {
                // The config name has changed, so we need to remove the old one
                // and add the new one.
                this.configs_!.data = this.configs_!.data.filter(c => c.name !== this.oldname_) ;
                this.request(`delete-${this.name_}-config`, this.oldname_) ;
                this.oldname_ = undefined ;
            }

            let index = this.configs_!.data.findIndex(c => c.name == this.oldname_) ;
            if (index === -1) {
                this.configs_!.data.push(config) ;
            }
            else {
                this.configs_!.data[index] = config ;
            }
            this.request(`update-${this.name_}-config`, config) ;
            this.contextMenu_ = undefined ;
            this.displayAnalysisView(config.name) ;
        }

        this.dialog_ = undefined ;
    }

    private createNewConfig() {
        if (this.dialog_) {
            return ;
        }

        if (this.popupMenu_) {
            this.popupMenu_.closeMenu() ;
            this.popupMenu_ = undefined ;
        }

        this.oldname_ = undefined ;
        let config : IPCAnalysisViewConfig = {
            name: '',
            description: '',
            dataset: '',
            fields: [],
        } ;

        let title = `Create ${this.title_} View` ;
        let names = this.configs_ ? this.configs_.data.map(c => c.name) : [] ;
        this.dialog_ = new AnalysisConfigDialog(config, title, names, this.datasets_, this.match_fields_, this.team_fields_, this.formulas_) ;

        this.dialog_.on('closed', this.dialogClosed.bind(this)) ;
        this.dialog_.showCentered(this.elem.parentElement!) ;
    }

    private showContextMenu(ev: MouseEvent) {
        ev.preventDefault() ;

        if (!this.contextMenu_) {
            this.createMenu() ;
        }

        if (this.popupMenu_ || this.dialog_ || !this.show_menu_) {
            return ;
        }

        this.popupMenu_ = this.contextMenu_ ;
        this.popupMenu_!.showRelative(this.elem!, new XeroPoint(ev.clientX, ev.clientY)) ;
    }   

    private deleteView(name: string) {
        let dialog = new XeroYesNo(`Delete ${this.title_} View`, `Are you sure you want to delete the ${name} ${this.title_} view?`) ;
        dialog.on('closed', (changed: boolean) => {
            if (changed) {
                this.configs_!.data = this.configs_!.data.filter(c => c.name !== name) ;
                this.request(`delete-${this.name_}-config`, name) ;
                this.createMenu() ;
                if (name === this.currentConfig_?.name) {
                    this.currentConfig_ = undefined ;
                    this.displayNoSelectedConfig() ;
                }
            }
        }) ;    

        dialog.showCentered(this.elem.parentElement!) ;
    }

    private editView(name: string) {
        if (this.dialog_) {
            return ;
        }

        if (this.popupMenu_) {
            this.popupMenu_.closeMenu() ;
            this.popupMenu_ = undefined ;
        }

        this.oldname_ = name ;
        let config = this.configs_?.data.find(c => c.name === name) ;
        if (config === undefined) {
            return ;
        }

        let title = `Edit ${this.title_} View` ;
        let names = this.configs_ ? this.configs_.data.map(c => c.name) : [] ;
        names = names.filter(c => c !== name) ;
        this.dialog_ = new AnalysisConfigDialog(config, title, names, this.datasets_, this.match_fields_, this.team_fields_, this.formulas_) ;

        this.dialog_.on('closed', this.dialogClosed.bind(this)) ;
        this.dialog_.showCentered(this.elem.parentElement!) ;        
    }

    private contextMenuClosed() {
        this.popupMenu_ = undefined ;
    }

    private createSubMenu(cb: (name: string) => void) : XeroPopupMenu {
        let items : XeroPopupMenuItem[] = [] ;
        for(let config of this.configs_!.data) {
            items.push(new XeroPopupMenuItem(config.name, () => { cb(config.name) ; })) ;
        }

        return new XeroPopupMenu('Select', items) ;
    }

    private createMenu() {
        let items : XeroPopupMenuItem[] = [
            new XeroPopupMenuItem('Create Configuration', this.createNewConfig.bind(this)),
            new XeroPopupMenuItem('Select', undefined, this.createSubMenu((name)=> this.displayAnalysisView(name))),
            new XeroPopupMenuItem('Delete', undefined, this.createSubMenu((name)=> this.deleteView(name))),
            new XeroPopupMenuItem('Edit', undefined, this.createSubMenu((name)=> this.editView(name))),
        ] ;

        this.contextMenu_ = new XeroPopupMenu(`${this.title_} Configurations`, items) ;
        this.contextMenu_.on('menu-closed', this.contextMenuClosed.bind(this)) ;
    }
}
