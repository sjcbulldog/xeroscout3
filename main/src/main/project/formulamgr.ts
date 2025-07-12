import winston from "winston";
import { Manager } from "./manager" ;
import { Expr } from "../../shared/expr";
import { IPCFormula } from "../../shared/ipc" ;

export class FormulaInfo {
    public formulas_ : IPCFormula[] = [] ;                 
}

export class FormulaManager extends Manager {
    private info_ : FormulaInfo ;
    private expr_map_ : Map<string, Expr> = new Map() ;                                 // Map of formula name to expression

    constructor(logger: winston.Logger, writer: () => void, info: FormulaInfo) {
        super(winston.createLogger(), writer) ;
        this.info_ = info ;
    }

    public getFormulas() : IPCFormula[] {
        return this.info_.formulas_ ;
    }

    public get formulaNames() : string[] {
        return this.info_.formulas_.map(f => f.name) ;
    }

    public hasFormula(name: string) : boolean {
        let ret = false ;

        for(let f of this.info_.formulas_) {
            if (f.name === name) {
                ret = true ;
                break ;
            }
        }

        return ret ;
    }

    public findFormula(name: string) : Expr | undefined {
        let ret: Expr | undefined = undefined ;

        if (this.expr_map_.has(name)) {
            ret = this.expr_map_.get(name) ;
        }
        else {
            for(let f of this.info_.formulas_) {
                if (f.name === name) {
                    ret = Expr.parse(f.formula) ;
                    this.expr_map_.set(name, ret) ;
                    break ;
                }
            }
        }

        return ret ;
    }

    private findFormulaIndex(name: string) : number {
        let ret: number = -1 ;

        for(let i = 0 ; i < this.info_.formulas_.length; i++) {
            if (this.info_.formulas_[i].name === name) {
                ret = i ;
                break ;
            }
        }

        return ret ;
    }

    public deleteFormula(name: string) {
        let index = this.findFormulaIndex(name) ;
        if (index != undefined) {
            this.info_.formulas_.splice(index, 1) ;
            this.write() ;
        }
    }

    public renameFormula(oldName: string, newName: string) {
        let index = this.findFormulaIndex(oldName) ;
        if (index != undefined) {
            this.info_.formulas_[index].name = newName ;
        }
    }

    public addFormula(name: string, desc: string, formula: string) : void {
        let index = this.findFormulaIndex(name) ;
        if (index != -1) {
            this.info_.formulas_[index].formula = formula ;
        }
        else {      
            let f : IPCFormula = {
                name: name,
                desc: desc,
                formula: formula
            } ;

            this.info_.formulas_.push(f) ;
        }
        this.write() ;
    }

    public importFormulas(obj: any) {
        // TODO: implement this function
    }    
}