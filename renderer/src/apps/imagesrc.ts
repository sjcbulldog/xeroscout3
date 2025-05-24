import { XeroMainProcessInterface } from "../widgets/xerocbtarget.js";

interface ImageWaiters {
    resolve: (data: string | null) => void;
    reject: (error: any) => void;
    name: string ;
}

export class ImageDataSource extends XeroMainProcessInterface {
    private static kBlankImageName = 'blank' ;
    private static kMissingImageName = 'missing' ;    

    private image_names: string[] = [] ;                            // List of image names
    private nameToImageMap_: Map<string, string> = new Map() ;      // Map of image name to base64 data
    private waiters: ImageWaiters[] = [] ;                          // List of promises waiting on images data

    constructor() {
        super() ;

        this.registerCallback('send-images', this.receivedImageNames.bind(this)) ;
        this.registerCallback('send-image-data', this.receivedImageData.bind(this)) ;

        this.request('get-image-names') ;                                   // Request the list of image names
        this.request('get-image-data', ImageDataSource.kBlankImageName) ;   // Request the blank image data
        this.request('get-image-data', ImageDataSource.kMissingImageName) ; // Request the missing image data
    }

    public getImageNames() : string[] {
        return this.image_names ;
    }

    public getImageData(name: string) : Promise<string | null> {
        let ret = new Promise<string | null>((resolve, reject) => {
            if (this.nameToImageMap_.has(name)) {
                resolve(this.nameToImageMap_.get(name)!) ;
            }
            else {
                this.request('get-image-data', name) ;
                let waiter = {
                    resolve: resolve,
                    reject: reject,
                    name: name
                };
                this.waiters.push(waiter) ;
            }
        }) ;
        return ret;
    }

    public get blank() : Promise<string | null> {
        return this.getImageData(ImageDataSource.kBlankImageName) ;
    }

    public get missing() : Promise<string | null> {
        return this.getImageData(ImageDataSource.kMissingImageName) ;
    }

    private receivedImageNames(args: string[]) : void {
        this.image_names = args ;
        this.emit('image-names-updated', this.image_names) ;
    }

    private receivedImageData(args:any) : void {
        let name = args.name ;
        let data = args.data ;

        this.nameToImageMap_.set(name, data) ;
        
        let processed = true ;
        while (processed) {
            processed = false ;
            let index = this.waiters.findIndex(waiter => waiter.name === name) ;
            if (index >= 0) {
                let waiter = this.waiters[index] ;
                this.waiters.splice(index, 1) ;
                waiter.resolve(data) ;
                processed = true ;
            }
        }
    }
}