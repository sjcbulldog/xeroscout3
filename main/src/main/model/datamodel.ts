import * as sqlite3 from 'sqlite3' ;
import * as fs from 'fs' ;
import winston from 'winston';
import { format } from '@fast-csv/format';
import { EventEmitter } from 'events';
import { DataRecord } from './datarecord';
import { IPCTypedDataValue, IPCDataValueType, IPCColumnDesc, IPCColumnDefnSource, IPCChange } from '../../shared/ipc';
import { DataValue } from '../../shared/datavalue' ;

export class DataModelInfo {
    public col_descs_ : IPCColumnDesc[] = [] ;
}

export abstract class DataModel extends EventEmitter {
    private static readonly ColummTableName: string = 'cols' ;
    private static queryno_ : number = 0 ;

    private table_name_ : string ;
    private dbname_ : string ;
    private db_? : sqlite3.Database ;
    private logger_ : winston.Logger ;
    private info_ : DataModelInfo ;

    constructor(dbname: string, tname: string, info: DataModelInfo, logger: winston.Logger) {
        super() ;
        this.dbname_ = dbname ;
        this.table_name_ = tname ;
        this.info_ = info ;
        this.logger_ = logger ;
    }

    public get colummnDescriptors() : IPCColumnDesc[] {
        return this.info_.col_descs_ ;
    }

    public get columnNames() : string[] {
        return this.info_.col_descs_.map((col) => col.name) ;
    }

    public get tableName() : string {
        return this.table_name_ ;
    }

    public getEncoded() : Uint8Array {
        let d = fs.readFileSync(this.dbname_) ;
        return d ;
    }

    public remove() : void {
        if (fs.existsSync(this.dbname_)) {
            this.db_!.close((err) => {
                if (err) {
                    this.logger_.error('Error closing database \'' + this.dbname_ + '\'', err) ;
                }
                else {
                    try {
                        fs.unlinkSync(this.dbname_) ;
                    }
                    catch(err) {
                        this.logger_.error('Error removing database file \'' + this.dbname_ + '\'', err) ;
                    }                    
                }
            }) ;
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
                let result = await this.all(query, undefined) ;
                resolve(this.convertToDataRecords(result)) ;
            }
            catch(err) {
                reject(err) ;
            }
        }) ;

        return ret ;
    }

    private getColumnDesc(field: string) : IPCColumnDesc | undefined {
        return this.info_.col_descs_.find((col) => col.name === field) ;
    }

    private convertToDataRecords(rows: any[]) : DataRecord[] {
        let ret: DataRecord[] = [] ;

        for(let row of rows) {
            let dr = new DataRecord() ;
            for(let key of Object.keys(row)) {
                let col = this.getColumnDesc(key) ;
                let v : IPCTypedDataValue | undefined = undefined ;

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
                        v = { type: 'error' , value: err as Error } ;
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
        if (values.length === 0) {
            return '' ;
        }
        return values.join(', ') ;
    }

    private syncColumnNames() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.getColumnNamesFromDB()
            .then((dbcols) => {
                let i = 0 ;
                while (i < this.info_.col_descs_.length) {
                    let col = this.info_.col_descs_[i] ;
                    if (!dbcols.includes(col.name)) {
                        this.info_.col_descs_.splice(i, 1) ;
                    }
                    else {
                        i++ ;
                    }
                }
                resolve() ;
            })
            .catch((err) => {
                this.logger_.error('Error getting column names from database', err) ;
                reject(err) ;
            });
        }) ;

        return ret ;
    }
        

    private getColumnNamesFromDB() : Promise<string[]> {
        let ret = new Promise<string[]>((resolve, reject) => {
            let ret: string[] = [] ;

            let query = 'PRAGMA table_info(' + this.table_name_ + ');' ;
            this.db_?.all(query, (err, rows) => {
                if (err) {
                    this.logger_.error('Error running query \'' + query + '\'', err) ;
                    reject(err) ;
                }
                else {
                    if (rows) {
                        for(let row of rows) {
                            ret.push((row as any).name) ;
                        }
                    }

                    resolve(ret) ;
                }
            }) ;
        }) ;
        return ret ;
    }

    public exportToCSV(filename: string, table: string) : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            try {
                let cols = await this.getColumnNames() ;

                const csvStream = format(
                    { 
                        headers: cols,
                    }) ; 

                const outputStream = fs.createWriteStream(filename);
                csvStream.pipe(outputStream).on('end', () => { 
                    csvStream.end() ;
                    resolve()
                }) ;
                let records = await this.getAllData() ;
                for(let record of records) {
                    let obj = record.jsonObj ;
                    if (obj) {
                        csvStream.write(obj) ;
                    }
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

    public runQuery(query: string, params: any[] | undefined) : Promise<sqlite3.RunResult> {
        let ret = new Promise<sqlite3.RunResult>((resolve, reject) => {
            let qno = DataModel.queryno_++ ;
            this.logger_.debug('DATABASE: ' + qno + ': runQuery \'' + query + '\'') ;
            if (params) {
                this.db_?.run(query, params, (res: sqlite3.RunResult, err: Error) => {
                    if (err) {
                        this.logger_.error('Error running query \'' + query + '\'', err) ;
                        reject(err) ;
                    }
                    else {
                        if (res) {
                            let obj = res as any ;
                            if (obj.code === 'SQLITE_ERROR') {
                                this.logger_.error('Error running query \'' + query + '\'', obj.message) ;
                                reject(new Error(obj.message)) ;
                                return ;
                            }
                        }
                        resolve(res) ;
                    }
                }) ;
            } else {
                this.db_?.run(query, (res: sqlite3.RunResult, err: Error) => {
                    if (err) {
                        this.logger_.error('Error running query \'' + query + '\'', err) ;
                        reject(err) ;
                    }
                    else {
                        if (res) {
                            let obj = res as any ;
                            if (obj.code === 'SQLITE_ERROR') {
                                this.logger_.error('Error running query \'' + query + '\'', obj.message) ;
                                reject(new Error(obj.message)) ;
                                return ;
                            }
                        }
                        resolve(res) ;
                    }
                }) ;
            }
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

    public all(query: string, params: any[] | undefined) : Promise<DataRecord[]> {
        let ret = new Promise<DataRecord[]>((resolve, reject) => {
            let qno = DataModel.queryno_++ ;
            this.logger_.debug('DATABASE: ' + qno + ': all \'' + query + '\'') ;
            if (params) {
                this.db_?.all(query, ...params!, (err: Error | null, rows: any[]) => {
                    if (err) {
                        this.logger_.error('Error running query \'' + query + '\'', err) ;
                        reject(err) ;
                    }
                    else {
                        resolve(this.convertToDataRecords(rows)) ;
                    }
                }) ;
            }
            else {
                this.db_?.all(query, (err: Error | null, rows: any[]) => {
                    if (err) {
                        this.logger_.error('Error running query \'' + query + '\'', err) ;
                        reject(err) ;
                    }
                    else {
                        resolve(this.convertToDataRecords(rows)) ;
                    }
                }) ;                
            }
        }) ;
        return ret ;
    }

    public getAllData() : Promise<DataRecord[]> {
        let ret = new Promise<DataRecord[]>((resolve, reject) => {
            let query = 'select * from ' + this.table_name_ + ';' ;
            this.all(query, undefined)
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
            this.all(query, undefined)
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

    public getColumnNames(comparefn? : ((a: string, b: string) => number)) : string[] {
        return this.info_.col_descs_.map((col) => col.name) ;
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

    public containsColumn(name: string) {
        return this.info_.col_descs_.findIndex((col) => col.name === name) !== -1 ;
    }
    
    public listContainsColumn(list: IPCColumnDesc[], name: string) : boolean {
        return list.findIndex((col) => col.name === name) !== -1 ;
    }

    protected addColsAndData(keys: string[], records: DataRecord[], editable: boolean, source: IPCColumnDefnSource) : Promise<void> {
        let fields: IPCColumnDesc[] = [] ;

        let ret = new Promise<void>(async (resolve, reject) => {
            this.syncColumnNames()
            .then(() => {
                //
                // Find the unique set of fields across all records and associated type
                //
                for(let r of records) {
                    for (let f of r.keys()) {
                        if (!this.containsColumn(f) && !this.listContainsColumn(fields, f)) {
                            let type = this.extractType(f, records) ;
                            fields.push(
                                {
                                    name: f, 
                                    type: type,
                                    choices: undefined,
                                    source: source,
                                    editable: editable,
                                }
                            ) ;
                        }
                    }
                }

                this.addNecessaryCols(fields)
                .then(async () => {
                    for(let record of records) {
                        try {
                            await this.insertOrUpdate(this.table_name_, keys, record) ;
                        }
                        catch(err) {
                            reject(err) ;
                        }
                    }
                    resolve() ;
                })
                .catch((err) => {   
                    reject(err) ;
                }) ;
            })
            .catch((err) => {
                reject(err) ;
            }) ;
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

    public addNecessaryCols(fields: IPCColumnDesc[]) : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            let toadd: IPCColumnDesc[] = [] ;
 
            for(let key of fields) {
                let index = this.info_.col_descs_.findIndex((one) => { return one.name === key.name})
                if (index === -1) {
                    toadd.push(key) ;
                }
                else if (this.info_.col_descs_[index].editable != key.editable) {
                    reject(new Error(`column ${key.name} is being added, but already exists with a different 'editable' value`)) ;
                }
                else if (this.info_.col_descs_[index].source != key.source) {
                    reject(new Error(`column ${key.name} is being added, but already exists with a different 'source' value`)) ;                    
                }
                else if (this.info_.col_descs_[index].type != key.type) {
                    reject(new Error(`column ${key.name} is being added, but already exists with a different 'type' value`)) ;                       
                }
            }

            if (toadd.length > 0) {
                try {
                    await this.createColumns(this.table_name_, toadd) ;
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

    private generateWhereClause(keys: string[], dr: DataRecord) : [string, any[]] {
        let query = ' WHERE ' ;
        let params: any[] = [] ;
        let first = true ;

        for(let i = 0 ; i < keys.length ; i++) {
            if (!dr.has(keys[i])) {    
                continue ;
            }

            if (!first) {
                query += ' AND ' ;
            }
            query += keys[i] + ' = ?' ;
            params.push(DataValue.toSQLite3Value(dr.value(keys[i])!)) ;
            first = false ;
        }

        return [query, params] ;
    }

    public updateRecord(table: string, keys: string[], dr: DataRecord) : Promise<void> {
        let ret = new Promise<void>((resolve,reject) => {
            let query = 'update ' + table + ' SET ' ;
            let first = true ;
            let params: any[] = [] ;
            for(let key of dr.keys()) {
                if (!keys.includes(key)) {
                    let v = dr.value(key) ;

                    if (!first) {
                        query += ', ' ;
                    }

                    query += key + '= ?' ;
                    params.push(DataValue.toSQLite3Value(v!)) ;
                    first = false ;
                }
            }

            let ret = this.generateWhereClause(keys, dr) ;
            query += ' ' + ret[0] + ';' ;
            this.runQuery(query, [...params, ...ret[1]])
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
            let first = true ;
            let params: any[] = [] ;
            let values = '' ;
            for(let key of dr.keys()) {
                let v = dr.value(key) ;

                if (!first) {
                    query += ',';
                    values += ',' ;
                }

                query += key ;
                values += '?' ;

                first = false ;
                params.push(DataValue.toSQLite3Value(v!)) ;
            }

            query += `) VALUES (${values});` ;
            this.runQuery(query, params)
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
                let results = this.generateWhereClause(keys, dr) ;
                let query: string = 'select * from ' + table + results[0] + ';' ;
                let rows = await this.all(query, results[1]) ;
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

    public removeColumns(pred: (one: IPCColumnDesc) => boolean): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let all : Promise<sqlite3.RunResult>[] = [] ;

            let cols: IPCColumnDesc[] = [] ;
            for(let one of this.info_.col_descs_) {
                if(pred(one)) {
                    cols.push(one) ;
                    let query: string = 'alter table ' + this.table_name_ + ' drop column ' + one.name + ';' ;
                    let pr = this.runQuery(query, undefined) ;
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
                            let index = this.info_.col_descs_.indexOf(col) ;
                            this.info_.col_descs_.splice(index, 1) ;
                        }

                        for(let col of cols) {
                            this.emit('column-removed', col) ;
                        }
                        resolve();
                    })
                    .catch((err) => {
                        this.logger_.error('error removing columns in table \'' + this.table_name_ + '\'', err) ;
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

    public async createColumns(table: string, toadd:IPCColumnDesc[]) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let allpromises = [] ;

            for(let one of toadd) {
                let query: string = 'alter table ' + table + ' add column ' + one.name + ' ' + this.translateColumnType(one.type) + ';' ;
                let pr = this.runQuery(query, undefined) ;
                allpromises.push(pr) ;
            }

            Promise.all(allpromises)
                .then(() => {
                    for(let col of toadd) {
                        this.info_.col_descs_.push(col) ;
                        this.emit('column-added', col) ;
                    }
                    resolve();
                })
                .catch(async (err) => {
                    let dbcols = await this.getColumnNamesFromDB() ;
                    for(let col of toadd) {
                        if (dbcols.includes(col.name)) {
                            this.info_.col_descs_.push(col) ;                            
                            this.emit('column-added', col) ;
                        }
                    }
                    this.logger_.error('error creating columns in table \'' + table + '\'', err) ;
                    reject(err)
                }) ;
        }) ;

        return ret ;
    }

    protected abstract createTableQuery() : string ;
    protected abstract initialTableColumns() : IPCColumnDesc[] ;

    private processInitialColumns(cols: IPCColumnDesc[]) : void {
        this.info_.col_descs_ = [] ;
        for(let col of cols) {
            this.info_.col_descs_.push(col) ;
            this.emit('column-added', col) ;
        }
    }

    protected createTableIfNecessary(table: string) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.getTableNames()
                .then((tables : string[]) => {
                    if (!tables.includes(table)) {
                        //
                        // create the table
                        //
                        this.runQuery(this.createTableQuery(), undefined)
                            .then((result: sqlite3.RunResult) => {
                                this.processInitialColumns(this.initialTableColumns()) ;
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

    public update(changes:IPCChange[]) {
        for(let change of changes) {
            let dr = new DataRecord() ;
            let fields: string[] = [] ;
            for(let key of Object.keys(change.search)) {
                dr.addfield(key, change.search[key]) ;
                fields.push(key) ;
            }
            dr.addfield(change.column, change.newvalue) ;
            this.insertOrUpdate(this.table_name_, fields, dr)
        }
    }
}
