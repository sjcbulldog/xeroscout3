import { app } from 'electron' ;
import * as path from 'path' ;
import * as fs from 'fs' ;
import { IPCImageExtension, IPCSyncedImageData } from '../shared/ipc' ;

export interface ImageInfo {
    path: string ;
    extension: IPCImageExtension ;
    mimeType: string ;
}

export type SyncedImageIngestResult =
    { ok: true } |
    { ok: false, reason: string } ;

export class ImageManager {
    private imagedir_? : string ;
    private appimagedir_? : string ;
    private extraimagedirs_ : string[] = [] ;
    private imagemap_ : Map<string, ImageInfo> = new Map() ;

    constructor(appname: string, appimagedir?: string) {
        this.appimagedir_ = appimagedir ;
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

        for (const dir of this.extraimagedirs_) {
            this.scanImageDir(dir) ;
        }
    }

    public setExtraImageDirs(dirs: string[]) {
        this.extraimagedirs_ = dirs.filter((dir) => typeof dir === 'string' && dir.length > 0) ;
        this.rescanImageDirs() ;
    }

    public getImageNames() : string[] {
        return Array.from(this.imagemap_.keys()) ;
    }

    public hasImage(name: string) : boolean {
        return this.imagemap_.has(name) ;
    }

    public getImage(name : string) : string | undefined {
        return this.imagemap_.get(name)?.path ;
    }

    public getImageInfo(name : string) : ImageInfo | undefined {
        return this.imagemap_.get(name) ;
    }

    public addImage(imagePath : string) : boolean | string {
        if (this.imagedir_) {
            let name = path.basename(imagePath) ;
            let mname = path.parse(name).name ;
            const destPath = path.join(this.imagedir_, name) ;
            fs.copyFileSync(imagePath, destPath) ;
            const info = this.createImageInfo(destPath) ;
            if (!info) {
                return false ;
            }
            this.imagemap_.set(mname, info) ;
            return mname ;
        }
        return false ;
    }

    public addImageWithData(name : string, data : string, extension : IPCImageExtension = 'png') {
        if (this.imagedir_) {
            const destPath = path.join(this.imagedir_, name) + '.' + extension ;
            let buf = Buffer.from(data, 'base64') ;
            fs.writeFileSync(destPath, buf) ;
            const info = this.createImageInfo(destPath) ;
            if (info) {
                this.imagemap_.set(name, info) ;
            }
        }
    }

    public addSyncedImage(name: string, payload: unknown) : SyncedImageIngestResult {
        if (!this.imagedir_) {
            return {
                ok: false,
                reason: 'image cache is unavailable',
            } ;
        }

        const resolved = this.resolveSyncedPayload(payload) ;
        if (!resolved.ok) {
            return resolved ;
        }

        this.addImageWithData(name, resolved.data, resolved.extension) ;
        return { ok: true } ;
    }

    private findUserImageDir(appname: string) : string | undefined {
        try {
            return path.join(app.getPath('userData'), 'images', appname) ;
        }
        catch {
            return undefined ;
        }
    }

    private createImageDir() {
        if (this.imagedir_ && !fs.existsSync(this.imagedir_)) {
            fs.mkdirSync(this.imagedir_, { recursive : true }) ;
            if (!fs.existsSync(this.imagedir_)) {
                this.imagedir_ = undefined ;
            }
        }
    }

    private scanImageDir(dir: string) {
        if (dir && fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
            const files = fs.readdirSync(dir) ;
            for (const file of files) {
                const filePath = path.join(dir, file) ;
                if (!fs.statSync(filePath).isFile()) {
                    continue ;
                }

                const info = this.createImageInfo(filePath) ;
                if (info) {
                    this.imagemap_.set(path.parse(file).name, info) ;
                }
            }
        }
    }

    public removeAllImages() {
        if (this.imagedir_ && fs.existsSync(this.imagedir_) && fs.statSync(this.imagedir_).isDirectory()) {
            for (let file of fs.readdirSync(this.imagedir_)) {
                const filePath = path.join(this.imagedir_, file) ;
                fs.unlinkSync(filePath) ;
            }
        }

        this.rescanImageDirs() ;
    }

    private createImageInfo(filePath: string) : ImageInfo | undefined {
        const extension = this.extensionFromPath(filePath) ;
        if (!extension) {
            return undefined ;
        }

        return {
            path: filePath,
            extension: extension,
            mimeType: this.mimeTypeFromExtension(extension),
        } ;
    }

    private extensionFromPath(filePath: string) : IPCImageExtension | undefined {
        const ext = path.extname(filePath).toLowerCase() ;
        if (ext === '.png') {
            return 'png' ;
        }
        if (ext === '.webp') {
            return 'webp' ;
        }
        return undefined ;
    }

    private mimeTypeFromExtension(extension: IPCImageExtension) : string {
        if (extension === 'webp') {
            return 'image/webp' ;
        }
        return 'image/png' ;
    }

    private resolveSyncedPayload(payload: unknown) : ({ ok: true, data: string, extension: IPCImageExtension } | { ok: false, reason: string }) {
        if (typeof payload === 'string') {
            return {
                ok: true,
                data: payload,
                extension: 'png',
            } ;
        }

        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            return {
                ok: false,
                reason: `expected string or synced image object, received ${this.describePayload(payload)}`,
            } ;
        }

        const data = (payload as Partial<IPCSyncedImageData>).data ;
        if (typeof data !== 'string') {
            return {
                ok: false,
                reason: 'synced image object is missing string data',
            } ;
        }

        const extension = (payload as Partial<IPCSyncedImageData>).extension ;
        if (!this.isSupportedExtension(extension)) {
            return {
                ok: false,
                reason: `synced image object has unsupported extension '${String(extension)}'`,
            } ;
        }

        return {
            ok: true,
            data: data,
            extension: extension,
        } ;
    }

    private isSupportedExtension(extension: unknown) : extension is IPCImageExtension {
        return extension === 'png' || extension === 'webp' ;
    }

    private describePayload(payload: unknown) : string {
        if (payload === null) {
            return 'null' ;
        }
        if (Array.isArray(payload)) {
            return 'array' ;
        }
        return typeof payload ;
    }
}
