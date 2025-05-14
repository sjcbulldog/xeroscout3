import * as fs from 'fs' ;
import { OneScoutResult, ScoutingData } from '../comms/resultsifc';
import { DataValue } from '../model/datavalue';

export class DataGenerator
{
    public formtype: string | undefined ;
    private formpath_ : string ;
    private items_ : any[] = [] ;

    private static randomStrings = [
        'error code xero',
        'grond',
        'data',
        'robot',
        'swimmy',
        'allegro',
        'wilsonville',
        'hotwire',
        'tbd',
        'jesuit',
        'flaming chickens',
        'team 1540',
        'cheesy poofs',
        'orbit',
        'team 254',
        'team 1114',
        'team 1678',
        'team 2056',
        'team 3309',
        'team 118',
        'team 987',
        'team 111',
        'team 148'
    ] ;

    constructor(formpath: string) {
        this.formpath_ = formpath;
    }

    public generateData(ids: string[]) : ScoutingData | null {
        let results = [] ;
        if (!this.parseForm()) {
            return null ;
        }

        let resarr = [] ;
        for(let id of ids) {
            let obj = this.generateDataForForm() ;
            resarr.push({
                item: id,
                data: obj
            }) ;
        }
        return {
            tablet: "",
            purpose: "",
            results: resarr
        } ;
    }

    protected generateDataForForm() : any {
        let result = [] ;
        for(let item of this.items_) {
            let value = this.generateItemValue(item) ;
            if (value !== undefined) {
                let obj = {
                    tag: item.tag,
                    value: value
                }
                result.push(obj) ;
            }
        }
        return result ;
    }

    private getRandomInt(max: number) : number {
        return Math.floor(Math.random() * max);
    }

    private generateItemValue(item: any) : DataValue | undefined {
        let value = undefined ;

        if (item.type === 'text') {
            if (item.datatype === 'integer') {
                value  = DataValue.fromInteger(this.getRandomInt(1000)) ;
            }
            else if (item.datatype === 'real') {
                value = DataValue.fromReal(Math.random() * 1000.0) ;
            }
            else if (item.datatype === 'string') {
                let index = this.getRandomInt(DataGenerator.randomStrings.length) ;
                value = DataValue.fromString(DataGenerator.randomStrings[index]) ;
            }
        }
        else if (item.type === 'choice' || item.type === 'select') {
            let i = this.getRandomInt(item.choices.length) ;
            let v = item.choices[i].value ;

            if (item.datatype === 'integer') {
                value = DataValue.fromInteger(v) ;
            }
            else if (item.datatype === 'real') {
                value = DataValue.fromReal(v) ;
            }
            else if (item.datatype === 'string') {
                value = DataValue.fromString(v) ;
            }
            else {
                value = DataValue.fromError(new Error('invalid datatype for a choice or select')) ;
            }
        }
        else if (item.type === 'boolean') {
            value = DataValue.fromBoolean(this.getRandomInt(100) < 50) ;
        }
        else if (item.type === 'updown') {
            value = DataValue.fromInteger(this.getRandomInt(item.maxvalue  - item.minvalue) + item.minvalue) ;
        }

        return value ;
    }

    protected parseForm() : boolean {
        let ret = true ;
        let text = fs.readFileSync(this.formpath_).toString() ;
        try {
            let obj = JSON.parse(text) ;
            this.formtype = obj.form ;
            for(let sect of obj.sections) {
                for(let item of sect.items) {
                    this.items_.push(item) ;
                }
            }
        }
        catch(err) {
            ret = false ;
        }

        return ret ;
    }

}