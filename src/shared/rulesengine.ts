import EventEmitter from "events";
import { IPCChoice, IPCChoicesItem, IPCForm, IPCFormItem, IPCImageItem, IPCSelectItem } from "./ipc.js";
import { XeroRect } from "./xerogeom.js";

export class RulesEngine extends EventEmitter {
    private form_ : IPCForm ;
    private pageno_ : number ;
    private rule_: number ;
    private dirty_ : boolean ;
    private first_ : boolean ;
    private interval_time_? : number ;
    private interval_ : NodeJS.Timeout | null = null ;

    private errors_ : Map<string, string[]> = new Map() ;
    private previousErrors_ : Map<string, string[]> = new Map() ;

    private perPageRules: (() => void)[] = [
        this.ruleOne.bind(this),
        this.ruleTwo.bind(this)
    ] ;

    private perFormRules: (() => void)[] = [
        this.ruleThree.bind(this),
        this.ruleFour.bind(this),
        this.ruleFive.bind(this)
    ];

    public constructor(form: IPCForm) {
        super() ;

        this.form_ = form ;
        this.rule_ = 0 ;
        this.pageno_ = 0 ;
        this.dirty_ = true ;
        this.first_ = true ;
    }

    public get errors() : string[] {
        let errors: string[] = [] ;
        for(let [tag, errs] of this.errors_) {
            if (errs.length > 0) {
                errors.push(`${tag}: ${errs.join(', ')}`) ;
            }
        }
        return errors ;
    }

    public start(t: number) {
        if (this.interval_) {
            clearInterval(this.interval_!) ;    // stop the interval
            this.interval_ = null ;             // reset the interval
        }

        this.interval_time_ = t ;
        this.interval_ = setInterval(this.doRulesWork.bind(this, 1), this.interval_time_) ;        
    }

    //
    // One rule and one page is a step
    //
    public doRulesWork(cnt: number) : void {
        for(let i = 0 ; i < cnt && this.dirty_ == true; i++) {
            this.runOne() ;

            if (this.pageno_ ===  this.form_.sections.length && this.rule_ == this.perFormRules.length - 1) {
                if (this.interval_) {
                    clearInterval(this.interval_!) ;    // stop the interval
                    this.interval_ = null ;             // reset the interval
                }
                this.dirty = false ; // all rules are done, mark for as clean
                if (this.first_) {
                    this.emitErrorsFirst() ;
                    this.previousErrors_ = this.errors_ ;
                    this.errors_ = new Map() ;                      // reset errors  
                    this.first_ = false ;
                }
                else {
                    this.emitErrorsNext() ;
                    this.previousErrors_ = this.errors_ ; // save previous errors
                    this.errors_ = new Map() ;              // reset errors
                }
            }
            else if (this.pageno_ === this.form_.sections.length) {
                this.rule_++ ;      // Move to the next form rule
            }
            else {
                this.rule_++ ;    // Move to the next page rule
                if (this.rule_ === this.perPageRules.length) {
                    this.rule_ = 0 ; // reset to the first page rule
                    this.pageno_++ ; // move to the next page
                }
            }
        }
    }

    public get dirty() : boolean {
        return this.dirty_ ;
    }

    public reset() : void {
        this.first_ = true ;
        this.pageno_ = 0 ;
        this.rule_ = 0 ;
        this.dirty = true ;
    }

    public set dirty(value: boolean) {
        this.dirty_ = value ;
        if (value) {
            if (this.interval_time_ && !this.interval_) {
                this.interval_ = setInterval(this.doRulesWork.bind(this, 1), this.interval_time_) ;
            }
            this.rule_ = 0 ;
            this.pageno_ = 0 ;
        }
    }

    private runOne() : void {
        if (this.pageno_ == this.form_.sections.length) {
            this.perFormRules[this.rule_]();
        }
        else { 
            this.perPageRules[this.rule_]();
        }
    }
 
    private ruleOne() : void {
        let page = this.form_.sections[this.pageno_] ;
        if (!page) {
            return ; // no more pages
        }

        for(let ctrl of page.items) {
            if (ctrl.type === 'select') {
                let item = ctrl as IPCSelectItem ;
                this.checkChoices(item.tag, item.choices) ;                
            }
            else if (ctrl.type === 'choice') {
                let item = ctrl as IPCChoicesItem ;
                this.checkChoices(item.tag, item.choices) ;
            }
        }        
    }

    private checkChoices(tag: string, choices: IPCChoice[]) {
        if (choices.length === 0) {
            this.addError(tag, `${tag} - the list of choices cannot be empty`) ;
            return ;
        }

        let value: any[] = [] ;
        for(let choice of choices) {
            if (value.indexOf(choice.value) !== -1) {
                this.addError(tag, `${tag} more the one choice has the value value '${choice.value}'.  Duplicate values are not allowed.`) ;
            }
            else {
                value.push(choice.value) ;
            }
        }
    }    

    private ruleTwo() : void {
        let page = this.form_.sections[this.pageno_] ;
        if (!page) {
            return ; // no more pages
        }

        for(let ctrl of page.items) {
            if (ctrl.type === 'image') {
                let item = ctrl as IPCImageItem ;
                if (item.field) {
                    continue ;
                }
            }

            let overlap = this.findInterectingControls(ctrl, (c) => { 
                if (c.type === 'image') {
                    let item = c as IPCImageItem ;
                    if (item.field) {
                        return true ; // ignore fields
                    }
                }
                return false ; // all other controls
            }) ;

            if (overlap.length > 1) {
                this.addError(ctrl.tag, `${ctrl.tag} - control overlaps with multiple field controls ${overlap.map(c => c.tag).join(', ')}`) ;
            }
        }   
    }

    private ruleThree() : void {
        let tags: string[] = [] ;
        let dups: string[] = [] ;
        for(let page of this.form_.sections) {
            for(let ctrl of page.items) {
                if (ctrl.type === 'image' || ctrl.type === 'label' || ctrl.type === 'box') {
                    continue ;
                }

                if (tags.indexOf(ctrl.tag) !== -1) {
                    dups.push(ctrl.tag) ;
                }
                else {
                    tags.push(ctrl.tag) ;
                }
            }
        }
        for(let page of this.form_.sections) {
            for(let ctrl of page.items) {
                if (ctrl.type === 'image' || ctrl.type === 'label' || ctrl.type === 'box') {
                    continue ;
                }

                if (dups.indexOf(ctrl.tag) !== -1) {
                    this.addError(ctrl.tag, `${ctrl.tag} - tag must be unique.  Controls with duplicate tags are invalid.`) ;
                }
            }
        }
    }    

    private ruleFour() : void {
        for(let page of this.form_.sections) {
            for(let ctrl of page.items) {
                if (ctrl.type === 'image' || ctrl.type === 'label' || ctrl.type === 'box') {
                    continue ;
                }
                if (!/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(ctrl.tag)) {
                    this.addError(ctrl.tag, `${ctrl.tag} - tag must start with an underscore or letter and contain only alphanumeric characters and underscores`) ;
                }
            }
        }
    }

    private ruleFive() : void {
        for(let page of this.form_.sections) {
            for(let ctrl of page.items) {
                if (ctrl.type === 'image' || ctrl.type === 'label' || ctrl.type === 'box') {
                    continue ;
                }

                if (/^tag_[0-9]+$/.test(ctrl.tag)) {
                    this.addError(ctrl.tag, `${ctrl.tag} - tag cannot start with 'tag_' followed by a number.  While this is the initial value, it must be changed to something meaningful.`) ;
                }
            }
        }
    }

    private addError(tag: string, error: string) : void {
        if (!this.errors_.has(tag)) {
            this.errors_.set(tag, []) ;
        }
        this.errors_.get(tag)?.push(error) ;
    }

    private emitErrorsFirst() : void {
        this.emit('reset') ;
        for(let [tag, errors] of this.errors_) {
            if (errors.length > 0) {
                this.emit('errors', tag, errors) ;
            }
        }
    }

    private emitErrorsNext() : void {
        // Emit errors that are different from the previous errors
        for(let [tag, errors] of this.errors_) {
            if (errors.length > 0 && (!this.previousErrors_.has(tag) || this.previousErrors_.get(tag)?.join(',') !== errors.join(','))) {
                this.emit('errors', tag, errors) ;
            }
        }

        // Emit errors that are no longer present
        for(let [tag, errors] of this.previousErrors_) {
            if (!this.errors_.has(tag) || this.errors_.get(tag)?.length === 0) {
                this.emit('errors', tag, []) ;
            }
        }
    }

    private findInterectingControls(ctrl: IPCFormItem, filter: (c: IPCFormItem) => boolean) : IPCFormItem[] {
        let overlap: IPCFormItem[] = [] ;
        let page = this.form_.sections[this.pageno_] ;
        if (!page) {
            return overlap ; // no more pages
        }

        let bounds = new XeroRect(ctrl.x, ctrl.y, ctrl.width, ctrl.height) ;
        for(let c of page.items) {
            if (c === ctrl) {
                continue ; // skip self
            }

            let cBounds = new XeroRect(c.x, c.y, c.width, c.height) ;
            if (bounds.intersects(cBounds) && filter(c)) {
                overlap.push(c) ;
            }
        }

        return overlap ;
    }
}