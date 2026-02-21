import winston from "winston";
import { Manager } from "./manager" ;
import { Expr } from "../../shared/expr";
import { IPCAppType, IPCFormula } from "../../shared/ipc" ;

export type FormulaDuplicatePolicy = "keep" | "overwrite" ;

export interface FormulaImportOptions {
    duplicatePolicy: FormulaDuplicatePolicy ;
}

export interface FormulaFileEntry {
    name: string ;
    desc: string ;
    formula: string ;
}

export interface FormulaFileV1 {
    version: 1 ;
    formulas: FormulaFileEntry[] ;
}

export interface FormulaImportResult {
    read: number ;
    added: number ;
    updated: number ;
    skipped: number ;
    invalid: number ;
    warnings: string[] ;
}

export class FormulaInfo {
    public formulas_ : IPCFormula[] = [] ;       
    public coach_formulas_ : IPCFormula[] = [] ;          
}

export class FormulaManager extends Manager {
    private appType_ : IPCAppType ;
    private info_ : FormulaInfo ;
    private expr_map_ : Map<string, Expr> = new Map() ;                                 // Map of formula name to expression

    constructor(logger: winston.Logger, writer: () => void, info: FormulaInfo, appType: IPCAppType) {
        super(logger, writer) ;
        this.info_ = info ;
        this.appType_ = appType ;
    }

    private ensureArrays(): void {
        if (!this.info_.formulas_) {
            this.info_.formulas_ = [] ;
        }
        if (!this.info_.coach_formulas_) {
            this.info_.coach_formulas_ = [] ;
        }
    }

    public get formulas() : IPCFormula[] {
        // Older project files may not contain coach formulas; ensure arrays exist
        this.ensureArrays() ;
        return [...this.info_.formulas_, ...this.info_.coach_formulas_] ;
    }

    public get formulaNames() : string[] {
        return this.formulas.map(f => f.name) ;
    }

    public hasFormula(name: string) : boolean {
        let ret = false ;

        for(let f of this.formulas) {
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
            for(let f of this.formulas) {
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

    private findFormulaInList(list: IPCFormula[], name: string) : number {
        for(let i = 0 ; i < list.length ; i++) {
            if (list[i].name === name) {
                return i ;
            }
        }
        return -1 ;
    }

    private findFormulaLocation(name: string) : { list: IPCFormula[], index: number } | undefined {
        this.ensureArrays() ;

        let index = this.findFormulaInList(this.info_.formulas_, name) ;
        if (index !== -1) {
            return { list: this.info_.formulas_, index: index } ;
        }

        index = this.findFormulaInList(this.info_.coach_formulas_, name) ;
        if (index !== -1) {
            return { list: this.info_.coach_formulas_, index: index } ;
        }

        return undefined ;
    }

    private parseFormulaObject(obj: unknown) : FormulaFileEntry[] {
        if (Array.isArray(obj)) {
            return obj as FormulaFileEntry[] ;
        }

        if (!obj || typeof obj !== "object") {
            throw new Error("Invalid formula file: expected an object with 'version' and 'formulas'.") ;
        }

        const payload = obj as Partial<FormulaFileV1> ;
        if (payload.version !== 1) {
            throw new Error("Invalid formula file: missing or unsupported 'version' (expected 1).") ;
        }

        if (!Array.isArray(payload.formulas)) {
            throw new Error("Invalid formula file: 'formulas' must be an array.") ;
        }

        return payload.formulas ;
    }

    private parseEntry(entry: unknown, index: number) : FormulaFileEntry {
        if (!entry || typeof entry !== "object") {
            throw new Error(`Invalid formula entry at index ${index}: expected an object.`) ;
        }

        const maybe = entry as Partial<FormulaFileEntry> ;
        if (typeof maybe.name !== "string" || maybe.name.trim().length === 0) {
            throw new Error(`Invalid formula entry at index ${index}: 'name' must be a non-empty string.`) ;
        }
        if (typeof maybe.desc !== "string") {
            throw new Error(`Invalid formula entry at index ${index}: 'desc' must be a string.`) ;
        }
        if (typeof maybe.formula !== "string") {
            throw new Error(`Invalid formula entry at index ${index}: 'formula' must be a string.`) ;
        }

        return {
            name: maybe.name.trim(),
            desc: maybe.desc,
            formula: maybe.formula,
        } ;
    }

    private parseAndNormalize(obj: unknown) : { entries: FormulaFileEntry[], readCount: number, invalidCount: number, warnings: string[] } {
        const warnings: string[] = [] ;
        const read = this.parseFormulaObject(obj) ;
        const deduped = new Map<string, FormulaFileEntry>() ;
        let invalid = 0 ;

        for(let i = 0 ; i < read.length ; i++) {
            const parsed = this.parseEntry(read[i], i) ;
            if (deduped.has(parsed.name)) {
                warnings.push(`Duplicate formula '${parsed.name}' in import file; using the last entry.`) ;
            }
            deduped.set(parsed.name, parsed) ;
        }

        return {
            entries: [...deduped.values()],
            readCount: read.length,
            invalidCount: invalid,
            warnings: warnings,
        } ;
    }

    public getImportFormulaNames(obj: unknown) : string[] {
        return this.parseAndNormalize(obj).entries.map((f) => f.name) ;
    }

    public exportFormulas() : FormulaFileV1 {
        return {
            version: 1,
            formulas: this.formulas.map((f) => ({
                name: f.name,
                desc: f.desc,
                formula: f.formula
            }))
        } ;
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
                formula: formula,
                owner: this.appType_
            } ;

            this.info_.formulas_.push(f) ;
        }
        this.write() ;
    }

    public importFormulas(obj: unknown, options: FormulaImportOptions) : FormulaImportResult {
        const parsed = this.parseAndNormalize(obj) ;
        const result: FormulaImportResult = {
            read: parsed.readCount,
            added: 0,
            updated: 0,
            skipped: 0,
            invalid: parsed.invalidCount,
            warnings: parsed.warnings,
        } ;

        this.ensureArrays() ;
        const policy = options.duplicatePolicy ;

        for(let entry of parsed.entries) {
            const normalized: IPCFormula = {
                name: entry.name,
                desc: entry.desc,
                formula: entry.formula,
                owner: this.appType_
            } ;

            const existing = this.findFormulaLocation(entry.name) ;
            if (!existing) {
                this.info_.formulas_.push(normalized) ;
                this.expr_map_.delete(entry.name) ;
                result.added++ ;
            }
            else if (policy === "overwrite") {
                existing.list[existing.index] = normalized ;
                this.expr_map_.delete(entry.name) ;
                result.updated++ ;
            }
            else {
                result.skipped++ ;
            }
        }

        this.write() ;
        return result ;
    }    
}
