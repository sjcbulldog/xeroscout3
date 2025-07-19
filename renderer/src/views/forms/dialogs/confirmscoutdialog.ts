import { TabulatorFull } from "tabulator-tables";
import { XeroDialog } from "../../../widgets/xerodialog.js";
import { IPCNamedDataValue, IPCTypedDataValue } from "../../../shared/ipc.js";
import { DataValue } from "../../../shared/datavalue.js";

interface ConfirmData {
    name: string ;
    value: string ;
}

export class ConfirmScoutDialog extends XeroDialog {

    private table_ : TabulatorFull | undefined ;
    private data_ : ConfirmData[] ;

    constructor(ev: string, data: IPCNamedDataValue[]) {
        super('Cofirm Scouting Data - ' + ev, true);
        this.data_ = [] ;

        for(let d of data) {
            let valuestr = DataValue.toDisplayString(d.value) ;
            this.data_.push({ name: d.tag, value: valuestr }) ;
        }
    }

    async populateDialog(pdiv: HTMLDivElement) {
        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.table_ = new TabulatorFull(div, 
            {
                data: this.data_,
                layout: "fitData",
                columns: [
                    { title: "Name", field: "name", width: 200 },
                    { title: "Value", field: "value", width: 300 }
                ]
            });

        pdiv.appendChild(div) ;

        div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;
        div.innerHTML = 'Mark this data as questionable?  This will highlight the data in the scouting system.' ;
        pdiv.appendChild(div) ;
    }
}