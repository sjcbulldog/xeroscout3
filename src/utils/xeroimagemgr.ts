
//
// This file is the image manager.  It is a singleton class that manages images for the Xero application.
// It is used to load, store, and retrieve images for the application.  It is also used to clear images from 
// memory when they are no longer needed.
//
export class XeroImageMgr {
    private static instance: XeroImageMgr | null = null;
    private imageMap: Map<string, string>;

    private constructor() {
        this.imageMap = new Map<string, string>();
    }

    public static getInstance(): XeroImageMgr {
        if (XeroImageMgr.instance === null) {
            XeroImageMgr.instance = new XeroImageMgr();
        }
        return XeroImageMgr.instance;
    }

    public addImage(name: string, path: string): void {
        this.imageMap.set(name, path);
    }

    public getImage(name: string): string | undefined {
        return this.imageMap.get(name);
    }

    public removeImage(name: string): void {
        this.imageMap.delete(name);
    }

    public clearImages(): void {
        this.imageMap.clear();
    }

    public hasImage(name: string): boolean {
        return this.imageMap.has(name);
    }
}
