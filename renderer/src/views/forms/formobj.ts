import {  IPCForm, IPCSection  } from "../../ipc.js";

export class FormObject {
    private form_ : IPCForm ;

    constructor(form: IPCForm) {
        this.form_ = form ;
    }

    public get json() : IPCForm {
        return this.form_ ;
    }

    public get sectionCount() : number {
        return this.form_.sections.length ;
    }

    public get sections() : IPCSection[] {
        return this.form_.sections ;
    }

    public get images() : string[] {
        return this.form_.images ;  
    }

    public containsSection(name: string) : boolean {
        for(let section of this.form_.sections) {
            if(section.name === name) {
                return true ;
            }
        }
        return false ;
    }

    public findSectionByName(name: string) {
        for(let sect of this.form_.sections) {
            if (sect.name === name) {
                return sect ;
            }
        }

        return undefined ;
    }

    public findNewSectionName() : string {
        let name = 'New Section' ;
        if (this.findSectionByName(name) === undefined) {
            return name ;
        }

        let i = 1 ;
        while(true) {
            let newname = name + ' ' + i ;
            if (this.findSectionByName(newname) === undefined) {
                return newname ;
            }
            i++ ;
        }
    }     

    public createNewSection() : IPCSection {
        let section : IPCSection = {
            name: this.findNewSectionName(),
            image: 'blank',
            items: []
        }
        this.form_.sections.push(section) ;
        return section ;
    }

    public removeSection(section: IPCSection) : void {
        let index = this.form_.sections.indexOf(section) ;
        if (index !== -1) {
            this.form_.sections.splice(index, 1) ;
        }
    }

    public removeSectionByIndex(index: number) : void {
        if (index >= 0 && index < this.form_.sections.length) {
            this.form_.sections.splice(index, 1) ;
        }   
    }

    public resetImages() : void {
        this.form_.images = [] ;

        for(let section of this.form_.sections) {
            if(section.image) {
                this.addImage(section.image) ;
            }
        }
    }

    public addImage(image: string) : void {
        if (!this.form_.images.includes(image)) {
            this.form_.images.push(image) ;
        }
    }
}