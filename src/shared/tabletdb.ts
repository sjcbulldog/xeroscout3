import { IPCTablet } from "./ipc.js";

export class TabletDB {
    private static tablets_ : IPCTablet[] = [
        {
            name: 'surface',
            size: { width: 1089, height: 727 },
        },
        {
            name: 'dell',
            size: { width: 1292, height:777 },
        }
    ] ;

    public static getTablet(name: string) : IPCTablet | undefined {
        return this.tablets_.find(tablet => tablet.name === name) ;
    }

    public static getTabletNames() : string[] {
        return this.tablets_.map(tablet => tablet.name) ;
    }

    public static getDefaultTablet() : IPCTablet {
        return this.tablets_[0] ;
    }
}
