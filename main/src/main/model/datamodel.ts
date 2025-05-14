import * as sqlite3 from 'sqlite3' ;
import * as fs from 'fs' ;
import winston from 'winston';
import { format } from '@fast-csv/format';
import { EventEmitter } from 'events';
import { DataRecord } from './datarecord';
import { IPCDataValue, IPCDataValueType } from '../../shared/ipc';
import { DataValue } from './datavalue';

export interface ColumnDesc
{
    name: string ;
    type: IPCDataValueType ;
} ;

export abstract class DataModel extends EventEmitter {
    private static readonly ColummTableName: string = 'cols' ;
    private static queryno_ : number = 0 ;

    private dbname_ : string ;
    private db_? : sqlite3.Database ;
    private logger_ : winston.Logger ;
    private col_descs_ : ColumnDesc[] = [] ;

    constructor(dbname: string, coldescs: ColumnDesc[], logger: winston.Logger) {
        super() ;
        this.col_descs_ = coldescs ;
        this.dbname_ = dbname ;
        this.logger_ = logger ;
    }

    public remove() : void {
        if (fs.existsSync(this.dbname_)) {
            fs.unlinkSync(this.dbname_) ;
        }
    }

    public getData(table: string, field: string, fvalues: any[], data: string[]) : Promise<DataRecord[]> {
        let ret = new Promise<any[]>(async (resolve, reject) => {
            let query = 'SELECT ' ;
            query += this.createCommaList(data) ;
            query += ' FROM ' + table + ' ' ;
            query += ' WHERE ' ;
            let first = true ;

            for(let v of fvalues) {
                if (!first) {
                    query += ' OR ' ;
                }

                let val ;
                if (typeof v === 'string') {
                    val = '"' + v.toString() + '"' ; 
                }
                else {
                    val = v.toString() ;
                }
                query += field + '=' + val ;
                first = false ;
            }
            query += ';' ;

            try {
                let result = await this.all(query) ;
                resolve(this.convertToDataRecords(result)) ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;

        return ret ;
    }

    private getColumnDesc(field: string) : ColumnDesc | undefined {
        for(let col of this.col_descs_) {
            if (col.name === field) {
                return col ;
            }
        }

        return undefined ;
    }

    private convertToDataRecords(rows: any[]) : DataRecord[] {
        let ret: DataRecord[] = [] ;

        for(let row of rows) {
            let dr = new DataRecord() ;
            for(let key of Object.keys(row)) {
                let col = this.getColumnDesc(key) ;
                let v : IPCDataValue | undefined = undefined ;

                if (col) {
                    try {
                        if (row[key] === null) {
                            v = { type: 'null', value: null } ;
                        }
                        else {
                            switch(col.type) {
                                case 'integer':
                                    v = { type: 'integer', value: row[key] } ;
                                    break ;
                                case 'real':
                                    v = { type: 'real', value: row[key] } ;
                                    break ;
                                case 'string':
                                    v = { type: 'string', value: row[key] } ;
                                    break ;
                                case 'boolean':
                                    v = { type: 'boolean', value: row[key] } ;
                                    break ;
                                default:
                                    v = { type: 'error', value: new Error('Unknown type \'' + col.type + '\' for column \'' + key + '\'') } ;
                                    break ;
                            }
                        }
                    }
                    catch(err) {
                        v = { type: 'error' , value: err } ;
                    }
                }
                else {
                    v = { type: 'error', value: new Error('Column \'' + key + '\' not found in column descriptions')} ;
                }
                dr.addfield(key, v) ;
            }
            ret.push(dr) ;
        }

        return ret ;
    }

    private createCommaList(values: string[]) {
        let ret = '' ;
        let first = true ;
        for(let one of values) {
            if (!first) {
                ret += ', ' ;
            }
            first = false ;
            ret += one ;
        }

        return ret;
    }

    public exportToCSV(filename: string, table: string) : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            try {
                let cols = await this.getColumnNames(table) ;

                const csvStream = format(
                    { 
                        headers: cols,
                    }) ; 

                const outputStream = fs.createWriteStream(filename);
                csvStream.pipe(outputStream).on('end', () => { 
                    csvStream.end() ;
                    resolve()
                }) ;
                let records = await this.getAllData(table) ;
                for(let record of records) {
                    csvStream.write(record) ;
                }
                csvStream.end();
            }
            catch(err) {
                reject(err) ;
            }        
        }) ;
        return ret ;
    }
    
    public close() : boolean {
        let ret: boolean = true ;

        if (this.db_) {
            this.db_.close(function(err: Error | null) {
                if (err) {
                    ret = false ;
                }
            }) ;
        }
        
        return true ;
    }

    public runQuery(query: string) : Promise<sqlite3.RunResult> {
        let ret = new Promise<sqlite3.RunResult>((resolve, reject) => {
            let qno = DataModel.queryno_++ ;
            this.logger_.debug('DATABASE: ' + qno + ': runQuery \'' + query + '\'') ;
            this.db_?.run(query, (res: sqlite3.RunResult, err: Error) => {
                if (err) {
                    reject(err) ;
                }
                else {
                    if (res) {
                        let obj = res as any ;
                        if (obj.code === 'SQLITE_ERROR') {
                            reject(new Error(obj.message)) ;
                        }
                    }
                    resolve(res) ;
                }
            }) ;
        }) ;
        return ret ;
    }

    public allRaw(query: string) : Promise<unknown[]> {
        let ret = new Promise<unknown[]>((resolve, reject) => {
            let qno = DataModel.queryno_++ ;
            this.logger_.debug('DATABASE: ' + qno + ': all \'' + query + '\'') ;
            this.db_?.all(query, (err, rows) => {
                if (err) {
                    reject(err) ;
                }
                else {
                    resolve(rows) ;
                }
            }) ;
        }) ;
        return ret ;
    }

    public all(query: string) : Promise<DataRecord[]> {
        let ret = new Promise<DataRecord[]>((resolve, reject) => {
            let qno = DataModel.queryno_++ ;
            this.logger_.debug('DATABASE: ' + qno + ': all \'' + query + '\'') ;
            this.db_?.all(query, (err, rows) => {
                if (err) {
                    reject(err) ;
                }
                else {
                    resolve(this.convertToDataRecords(rows)) ;
                }
            }) ;
        }) ;
        return ret ;
    }

    public getAllData(table: string) : Promise<DataRecord[]> {
        let ret = new Promise<DataRecord[]>((resolve, reject) => {
            let query = 'select * from ' + table + ';' ;
            this.all(query)
                .then((rows) => {
                    resolve(rows) ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
        }) ;

        return ret ;
    }

    public getAllDataWithFields(table: string, fields: string[]) : Promise<any> {
        let ret = new Promise<any>((resolve, reject) => {
            let query = 'select ' ;

            let first = true ;
            for(let field of fields) {
                if (!first) {
                    query += ", " ;
                }

                query += field ;
                first = false ;
            }
            
            query += ' from ' + table + ';' ;
            this.all(query)
                .then((rows) => {
                    resolve(rows as any) ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
        }) ;

        return ret ;
    }

    public getTableNames() : Promise<string[]> {
        let ret = new Promise<string[]>((resolve, reject) => {
            let query = 'SELECT name FROM sqlite_schema WHERE type =\'table\' AND name NOT LIKE \'sqlite_%\';' ;
            this.allRaw(query)
                .then((rows) => {
                    let tables: string[] = [] ;
                    for(let row of rows) {
                        let rowobj = row as any ;
                        tables.push(rowobj.name) ;
                    }
                    resolve(tables) ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
        }) ;
        return ret ;
    }

    public getColumnNames(table: string, comparefn? : ((a: string, b: string) => number)) : Promise<string[]> {
        let ret = new Promise<string[]>((resolve, reject) => {
            let query = 'SELECT * FROM sqlite_schema where name=\'' + table + '\';' ;
            this.allRaw(query)
                .then((rows) => {
                    let one = rows[0] as any ;
                    let cols = this.parseSql(one.sql) ;
                    if (comparefn) {
                        cols.sort(comparefn) ;
                    }
                    resolve(cols) ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
        }) ;
        return ret ;
    }

    public init() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.db_ = new sqlite3.Database(this.dbname_, (err) => {
                if (err) {
                    reject(err) ;
                }
                else {
                    resolve() ;
                }
            }) ;
        }) ;

        return ret ;
    }

    private containsField(fields: ColumnDesc[], name: string) {
        for(let f of fields) {
            if (f.name === name)
                return true ;
        }

        return false ;
    }

    protected addColsAndData(table: string, keys: string[], records: DataRecord[]) : Promise<void> {
        let fields: ColumnDesc[] = [] ;

        //
        // Find the unique set of fields across all records and associated type
        //
        for(let r of records) {
            for (let f of r.keys()) {
                if (!this.containsField(fields, f)) {
                    let type = this.extractType(f, records) ;
                    fields.push({name: f, type: type}) ;
                }
            }
        }

        let ret = new Promise<void>(async (resolve, reject) => {
            await this.addNecessaryCols(table, fields) ;
            for(let record of records) {
                try {
                    await this.insertOrUpdate(table, keys, record) ;
                }
                catch(err) {
                    reject(err) ;
                }
            }
            resolve() ;
        }) ;

        return ret ;
    }

    protected mapTeamKeyString(field: string, namemap?: Map<string, string>) : string {
        if (namemap && namemap.has(field)) {
            return namemap.get(field)! ;
        }

        if (field.endsWith('_')) {
            field = field.substring(0, field.length - 1) ;
            if (namemap && namemap.has(field)) {
                return namemap.get(field)! ;
            }
        }

        return field ;
    }

    public addNecessaryCols(table: string, fields: ColumnDesc[]) : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            let existing: string[] = [] ;
                
            try {
                existing = await this.getColumnNames(table) ;
            }
            catch(err) {
                reject(err) ;
            }

            let toadd: ColumnDesc[] = [] ;
            for(let key of fields) {
                if (!existing.includes(key.name)) {
                    toadd.push(key) ;
                }
            }

            if (toadd.length > 0) {
                try {
                    await this.createColumns(table, toadd) ;
                }
                catch(err) {
                    reject(err) ;
                }
            }

            resolve() ;
        }) ;

        return ret;
    }

    protected extractType(key: string, records: DataRecord[]) : IPCDataValueType {
        let type: IPCDataValueType = 'error' ;

        for(let record of records) {
            if (record.has(key)) {
                let v = record.value(key)! ;
                type = v.type ;
                break ;
            }
            else {
                type = 'error' ;
            }
        }

        return type ;
    }

    private parseSql(sql: string) : string [] {
        let ret: string[] = [] ;
        let index: number ;

        index = sql.indexOf('(') ;
        if (index !== -1) {
            index++ ;
            while (index < sql.length) {
                let colname = '' ;

                while (index < sql.length) {
                    let ch = sql.charAt(index) ;
                    if (!ch.match(/[a-z_0-9]/i)) {
                        break ;
                    }
                    colname += ch ;
                    index++ ;
                }
                ret.push(colname) ;

                index = sql.indexOf(',', index) ;
                if (index === -1) {
                    break ;
                }
                index++ ;

                while (index < sql.length) {
                    let ch = sql.charAt(index) ;
                    if (ch !== ' ') {
                        break ;
                    }
                    index++ ;
                }
            }
        }

        return ret ;
    }
    
    private generateWhereClause(keys: string[], dr: DataRecord) : string {
        let query = ' WHERE ' ;
        let first = true ;

        for(let i = 0 ; i < keys.length ; i++) {
            if (!dr.has(keys[i])) {    
                continue ;
            }

            if (!first) {
                query += ' AND ' ;
            }
            query += keys[i] ;
            query += ' = ' ;
            query += DataValue.toValueString(dr.value(keys[i])!) ;

            first = false ;
        }

        return query ;
    }

    public updateRecord(table: string, keys: string[], dr: DataRecord) : Promise<void> {
        let ret = new Promise<void>((resolve,reject) => {
            let query = 'update ' + table + ' SET ' ;
            let first = true ;
            for(let key of dr.keys()) {
                if (!keys.includes(key)) {
                    let v = dr.value(key) ;

                    if (!first) {
                        query += ', ' ;
                    }

                    query += key + '=' + DataValue.toValueString(v!) ;
                    first = false ;
                }
            }

            query += ' ' + this.generateWhereClause(keys, dr) ;
            this.runQuery(query)
            .then(()=> {
                resolve()
            })
            .catch((err) => {
                reject(err)
            }) ;
        }) ;
        
        return ret;
    }

    public insertRecord(table: string, dr: DataRecord) : Promise<void> {
        let ret = new Promise<void>((resolve,reject) => {
            let query = 'insert into ' + table + ' (' ;
            let valstr = 'VALUES (' ;
            let first = true ;
            for(let key of dr.keys()) {
                let v = dr.value(key) ;

                if (!first) {
                    query += ',';
                    valstr += ',' ;
                }

                query += key ;
                valstr += DataValue.toValueString(v!) ;
                first = false ;
            }

            query += ') ' + valstr + ');' ;
            this.runQuery(query)
                .then(()=> { 
                    resolve() 
                })
                .catch((err) => {
                    reject(err)
                }) ;
        }) ;
        
        return ret;
    }

    public async insertOrUpdate(table: string, keys: string[], dr: DataRecord) : Promise<void> {
        let ret = new Promise<void>(async (resolve,reject) => {
            for(let key of keys) {
                if (!dr.has(key)) {
                    let err = new Error('The data record is missing a value for the key \'' + key + '\'') ;
                    reject(err) ; 
                }
            }

            try {
                let query: string = 'select * from ' + table + this.generateWhereClause(keys, dr) ;
                let rows = await this.all(query) ;
                if (rows.length > 0) {
                    await this.updateRecord(table, keys, dr)
                }
                else {
                    await this.insertRecord(table, dr) ;
                }
                resolve() ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;
        return ret;
    }

    public removeColumns(table: string, cols: string[], desc: ColumnDesc[]): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let all : Promise<sqlite3.RunResult>[] = [] ;

            for(let one of cols) {
                if (desc.find((col => col.name === one)) !== undefined) {
                    let query: string = 'alter table ' + table + ' drop column ' + one + ';' ;
                    let pr = this.runQuery(query) ;
                    all.push(pr) ;
                }
            }

            if (all.length === 0) {
                resolve() ;
            }
            else {
                Promise.all(all)
                    .then(() => {
                        for(let col of cols) {
                            this.emit('column-removed', col) ;
                        }
                        resolve();
                    })
                    .catch((err) => {
                        this.logger_.error('error removing columns in table \'' + table + '\'', err) ;
                        reject(err)
                    }) ;      
                }      
        }) ;
        return ret ;
    }

    private translateColumnType(type: IPCDataValueType) : string {
        let ret: string = '' ;
            
        switch(type) {
            case 'integer':
                ret = 'integer' ;
                break ;
            case 'real':
                ret = 'real' ;
                break ;
            case 'string':
                ret = 'text' ;
                break ;
            case 'boolean':
                ret = 'integer' ;
                break ;
            default:
                ret = 'error' ;
        }
    
        return ret ;
    }

    public createColumns(table: string, toadd:ColumnDesc[]) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let allpromises = [] ;

            for(let one of toadd) {
                let ctype
                let query: string = 'alter table ' + table + ' add column ' + one.name + ' ' + this.translateColumnType(one.type) + ';' ;
                let pr = this.runQuery(query) ;
                allpromises.push(pr) ;
            }

            Promise.all(allpromises)
                .then(() => {
                    for(let col of toadd) {
                        this.emit('column-added', col) ;
                    }
                    resolve();
                })
                .catch((err) => {
                    this.logger_.error('error creating columns in table \'' + table + '\'', err) ;
                    reject(err)
                }) ;
        }) ;

        return ret ;
    }

    protected abstract createTableQuery() : string ;
    protected abstract initialTableColumns() : ColumnDesc[] ;

    protected createTableIfNecessary(table: string) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.getTableNames()
                .then((tables : string[]) => {
                    if (!tables.includes(table)) {
                        //
                        // create the table
                        //
                        this.runQuery(this.createTableQuery())
                            .then((result: sqlite3.RunResult) => {
                                for(let col of this.initialTableColumns()) {
                                    this.emit('column-added', col) ;
                                }
                                resolve() ;
                            })
                            .catch((err) => {
                                reject(err) ;
                            });
                    }
                    else {
                        resolve() ;
                    }
                })
                .catch((err) => {
                    reject(err) ;
                })
            }) ;
        return ret ;
    }
}
