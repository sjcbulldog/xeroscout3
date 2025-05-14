import {  XeroApp  } from "../apps/xeroapp.js";
import {  DatabaseView  } from "./dbview.js";

export class XeroTeamDatabaseView extends DatabaseView {
    public constructor(app: XeroApp, clname: string) {
        super(app, 'xero-team-db-view', 'team') ;
    }
}