import { app }  from  'electron' ;
import * as path from 'path' ;
import * as fs from 'fs' ;

export class ImageManager {
    private imagedir_? : string ;
    private appimagedir_? : string ;
    private imagemap_ : Map<string, string> = new Map() ;

    constructor(appname: string, appimagedir?: string) {
        //
        // This is for the central (server).  The application comes installed with the blank image
        // and a set of field images.
        //
        this.appimagedir_ = appimagedir ;

        //
        // This is for any user imported images.  This is also used on the scouter side to store all
        // images received during the sync from the central server.
        //
        this.imagedir_ = this.findUserImageDir(appname) ;
        if (this.imagedir_) {
            this.createImageDir() ;
        }

        this.rescanImageDirs() ;
    }

    public rescanImageDirs() {
        this.imagemap_.clear() ;

        if (this.imagedir_) {
            this.scanImageDir(this.imagedir_) ;
        }

        if (this.appimagedir_) {
            this.scanImageDir(this.appimagedir_) ;
        }
    }

    public getImageNames() : string[] {
        return Array.from(this.imagemap_.keys()) ;
    }

    public getImage(name : string) : string | undefined {
        // Get the image path for the given name
        if (this.imagemap_.has(name)) {
            return this.imagemap_.get(name) ;
        }
        return undefined ;
    }

    public addImage(imagePath : string) : boolean {
        // Add an image to the image directory
        if (this.imagedir_) {
            let name = path.basename(imagePath) ;
            let mname = path.parse(name).name ;
            const destPath = path.join(this.imagedir_, name) ;
            fs.copyFileSync(imagePath, destPath) ;
            this.imagemap_.set(mname, destPath) ;
            return true ;
        }
        return false ;
    }

    public addImageWithData(name : string, data : string) {
        if (this.imagedir_) {
            const destPath = path.join(this.imagedir_, name) + '.png' ;
            let buf = Buffer.from(data, 'base64') ;
            fs.writeFileSync(destPath, buf) ;
            this.imagemap_.set(name, destPath) ;
        }
    }

    private findUserImageDir(appname: string) : string | undefined{
        // Find the user data directory for the application
        let appDataDir : string | undefined ;
        if (process.platform === 'win32') {
            if (process.env.APPDATA) {
                appDataDir = path.join(process.env.APPDATA, app.getName(), 'images') ;
            }
            else if (process.env.HOMEDIR) {
                appDataDir = path.join(process.env.HOMEDIR, app.getName(), 'images') ;
            }
            else if (process.env.USERNAME) {
                appDataDir = path.join(process.env.USERNAME, app.getName(), 'images') ;
            }
        }
        else {
            if (process.env.HOMEDIR) {
                appDataDir = path.join(process.env.HOMEDIR, app.getName(), "images") ;
            }
        }

        if (appDataDir) {
            appDataDir = path.join(appDataDir, appname) ;
        }
        return appDataDir ;
    }

    private createImageDir() {
        // Create the image directory if it doesn't exist
        if (this.imagedir_ && !fs.existsSync(this.imagedir_)) {
            fs.mkdirSync(this.imagedir_, { recursive : true}) ;
            if (!fs.existsSync(this.imagedir_)) {
                this.imagedir_ = undefined ;
            }
        }
    }

    private scanImageDir(dir: string) {
        // Scan the image directory for images
        if (dir && fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
            const files = fs.readdirSync(dir) ;
            for (const file of files) {
                const filePath = path.join(dir!, file) ;
                if (fs.statSync(filePath).isFile() && file.endsWith('.png')) {
                    this.imagemap_.set(path.parse(file).name, filePath) ;
                }
            }
        }
    }

    public removeAllImages() {
        if (this.imagedir_ && fs.existsSync(this.imagedir_) && fs.statSync(this.imagedir_).isDirectory()) {
            for(let file of fs.readdirSync(this.imagedir_!)) {
                const filePath = path.join(this.imagedir_!, file) ;
                fs.unlinkSync(filePath) ;
            }
        }
    }
}
