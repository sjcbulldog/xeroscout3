import { XeroDialog } from "../../widgets/xerodialog.js";

export class AllianceDialog extends XeroDialog {
    private captian_?: HTMLSelectElement ;
    private first_pick_ ?: HTMLSelectElement ;
    private second_pick_ ?: HTMLSelectElement ;
    private teams_ : [number, number, number] = [0, 0, 0] ;
    private available_teams_ : number[] ;
    private readonly which_: number ;

    public constructor(teams: number[], which: number) {
        super('Alliance # ' + which) ;
        this.teams_ = [0, 0, 0] ;
        this.which_ = which ;
        this.available_teams_ = teams ;
    }

    public get teams() : [number, number, number] {
        return this.teams_ ;
    }

    public get which() : number {
        return this.which_ ;
    }

    private createOptions(select: HTMLSelectElement) {
        for (let i = 0; i < this.available_teams_.length; i++) {
            const option = document.createElement('option') ;
            option.value = this.available_teams_[i].toString() ;
            option.innerText = this.available_teams_[i].toString() ;
            select.appendChild(option) ;
        }
    }

    async populateDialog(pdiv: HTMLDivElement) {
        let label : HTMLLabelElement ;

        let div = document.createElement('div') ;
        div.className = 'xero-popup-form-edit-dialog-rowdiv' ;

        this.captian_ = document.createElement('select') ;
        this.captian_.className = 'xero-popup-form-edit-dialog-input' ;
        this.createOptions(this.captian_) ;
        this.captian_.value = this.teams_[0].toString() ;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Captian' ;
        label.appendChild(this.captian_) ;
        div.appendChild(label) ;

        this.first_pick_ = document.createElement('select') ;
        this.first_pick_.className = 'xero-popup-form-edit-dialog-input' ;
        this.createOptions(this.first_pick_) ;
        this.first_pick_.value = this.teams_[1].toString() ;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'First Pick' ;
        label.appendChild(this.first_pick_) ;

        div.appendChild(label) ;

        this.second_pick_ = document.createElement('select') ;
        this.second_pick_.className = 'xero-popup-form-edit-dialog-input' ;
        this.createOptions(this.second_pick_) ;
        this.second_pick_.value = this.teams_[2].toString() ;

        label = document.createElement('label') ;
        label.className = 'xero-popup-form-edit-dialog-label' ;
        label.innerText = 'Second Pick' ;
        label.appendChild(this.second_pick_) ;

        div.appendChild(label) ;

        pdiv.appendChild(div) ;
    }

    onInit() {
        if (this.captian_) {
            this.captian_.focus() ;
        }
    }

    public isOKToClose(ok: boolean): boolean {
        if (!ok) {
            return true ;
        }

        if (this.captian_?.value.length === 0 || this.first_pick_?.value.length === 0 || this.second_pick_?.value.length === 0) {
            alert('You must enter a value for all three team numbers') ;
            return false ;
        }

        return true ;
    }

    okButton(event: Event) {
        if (this.captian_ && this.first_pick_ && this.second_pick_) {
            this.teams_[0] = parseInt(this.captian_.value, 10) ;
            this.teams_[1] = parseInt(this.first_pick_.value, 10) ;
            this.teams_[2] = parseInt(this.second_pick_.value, 10) ;
        }

        super.okButton(event) ;
    }
}
