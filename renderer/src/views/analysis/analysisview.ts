import { XeroApp } from "../../apps/xeroapp.js";
import { IPCColumnDesc, IPCFormula, IPCAnalysisViewConfig, IPCAnalysisConfigData, IPCDataSet, IPCDataSetData } from "../../shared/ipc.js";
import { XeroPoint } from "../../shared/xerogeom.js";
import { XeroPopupMenu, XeroPopupMenuItem } from "../../widgets/xeropopupmenu.js";
import { XeroYesNo } from "../../widgets/xeroyesnow.js";
import { XeroView } from "../xeroview.js";

export class AnalysisView extends XeroView {
    private contextMenu_ : XeroPopupMenu | undefined = undefined ;
    private popupMenu_ : XeroPopupMenu | undefined = undefined ;
    private data_ : IPCDataSetData | undefined = undefined ;
    private dataset_ : IPCDataSet | undefined = undefined ;
    private datasets_ : IPCDataSet[] = [] ;
    private seen_datasets_ : boolean = false ;
    private show_menu_ : boolean = false ;
    private name_ : string ;
    private title_ : string ;

    constructor(app: XeroApp, classname: string, name: string, title: string) {
        super(app, classname);

        this.name_ = name ;
        this.title_ = title ;

        this.startupMessage(`${this.title_} Loading`) ; 
        this.registerCallback('send-datasets', this.receivedDatasets.bind(this)) ;
        this.registerCallback(`send-${this.name_}-data`, this.receivedData.bind(this)) ;

        this.request('get-datasets') ;
    }

    public get title() : string {
        return this.title_ ;
    }

    public onVisible() {
        this.elem!.parentElement!.addEventListener('contextmenu', this.showContextMenu.bind(this)) ;
    }

    private receivedDatasets(data: IPCDataSet[]) {
        this.datasets_ = data ;
        this.request(`get-${this.name_}-configs`) ;
    }

    protected display(data: IPCDataSetData, ds: IPCDataSet) : void {
        this.startupMessage('Invalid Code - derived class must implement display method') ;
    }

    protected receivedData(data: IPCDataSetData) : void {
        this.data_ = data ;
        if (data.message) {
            this.startupMessage(`${this.title_} View<br>${data.message}`) ;
            return ;
        }

        if (!this.data_ || !this.data_.data || this.data_.data.length === 0) {
            this.startupMessage(`${this.title_} View<br>No data available`) ;
            return ;
        }

        this.display(this.data_, this.dataset_!) ;
    }

    private displayAnalysisView(name: string) {
        this.dataset_ = this.datasets_?.find(c => c.name === name) ;
        if (!this.dataset_) {
            this.displayNoSelectedConfig() ;
            return ;
        }

        this.request(`update-${this.name_}-current`, name) ;
        this.request(`get-${this.name_}-data`, this.dataset_) ;
    }

    private displayNoSelectedConfig() {
        this.startupMessage(`${this.title_} View<br>Right click to configure`) ;
    }

    private showContextMenu(ev: MouseEvent) {
        ev.preventDefault() ;

        if (!this.contextMenu_) {
            this.createMenu() ;
        }

        if (this.popupMenu_) {
            return ;
        }

        this.popupMenu_ = this.contextMenu_ ;
        this.popupMenu_!.showRelative(this.elem!, new XeroPoint(ev.clientX, ev.clientY)) ;
    }   

    private contextMenuClosed() {
        this.popupMenu_ = undefined ;
    }

    private createMenu() {
        let items : XeroPopupMenuItem[] = [] ;
        for(let config of this.datasets_!) {
            items.push(new XeroPopupMenuItem(config.name, () => { this.displayAnalysisView(config.name) ; })) ;
        }
        this.contextMenu_ = new XeroPopupMenu(`${this.title_} Configurations`, items) ;
        this.contextMenu_.on('menu-closed', this.contextMenuClosed.bind(this)) ;
    }
}
