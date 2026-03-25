import {  XeroApp  } from "../apps/xeroapp.js";
import {  DatabaseView  } from "./dbview/dbview.js";

export class XeroMatchDatabaseView extends DatabaseView {
    public constructor(app: XeroApp) {
        super(app, 'xero-match-db-view', 'match') ;
    }

    protected getInitialSort() {
        return [
            { column: "comp_level", dir: "asc" as const },
        ] ;
    }
}
