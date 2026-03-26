import fs from "fs" ;
import os from "os" ;
import path from "path" ;
import { afterEach, expect, test } from "vitest" ;

import { FormManager } from "../main/project/formmgr" ;
import { IPCForm, IPCFormControlType, IPCFormItem } from "../shared/ipc" ;

const tempDirs: string[] = [] ;

function makeFormItem(type: IPCFormControlType, tag: string) : IPCFormItem {
    return {
        type: type,
        tag: tag,
        x: 0,
        y: 0,
        width: 100,
        height: 40,
        fontFamily: "Arial",
        fontSize: 14,
        fontStyle: "normal",
        fontWeight: "normal",
        color: "#000000",
        background: "#ffffff",
        transparent: false,
        datatype: "string",
        placeholder: "",
    } as IPCFormItem ;
}

function writeForm(form: IPCForm) : string {
    let dir = fs.mkdtempSync(path.join(os.tmpdir(), "xeroscout-formmgr-")) ;
    tempDirs.push(dir) ;

    let filename = path.join(dir, `${form.purpose}.json`) ;
    fs.writeFileSync(filename, JSON.stringify(form, null, 4)) ;
    return filename ;
}

afterEach(() => {
    while (tempDirs.length > 0) {
        let dir = tempDirs.pop()! ;
        fs.rmSync(dir, { recursive: true, force: true }) ;
    }
}) ;

test("validateForm rejects blank data tags", () => {
    let filename = writeForm({
        purpose: "team",
        tablet: { name: "Tablet 1", size: { width: 1024, height: 768 } },
        sections: [
            {
                name: "Start",
                items: [makeFormItem("text", "   ")],
            },
        ],
    }) ;

    let errors = FormManager.validateForm(filename, "team") ;

    expect(errors.some((err) => err.includes("blank data tag"))).toBe(true) ;
}) ;

test("validateForm rejects duplicate data tags across sections", () => {
    let filename = writeForm({
        purpose: "team",
        tablet: { name: "Tablet 1", size: { width: 1024, height: 768 } },
        sections: [
            {
                name: "Photo",
                items: [makeFormItem("text", "robot_photo")],
            },
            {
                name: "Auto",
                items: [makeFormItem("autoplan", " robot_photo ")],
            },
        ],
    }) ;

    let errors = FormManager.validateForm(filename, "team") ;

    expect(errors.some((err) => err.includes("duplicate data tag 'robot_photo'"))).toBe(true) ;
}) ;

test("validateForm allows duplicate tags on non-data controls", () => {
    let filename = writeForm({
        purpose: "team",
        tablet: { name: "Tablet 1", size: { width: 1024, height: 768 } },
        sections: [
            {
                name: "Display",
                items: [
                    makeFormItem("label", "shared-tag"),
                    makeFormItem("image", "shared-tag"),
                    makeFormItem("text", "notes"),
                ],
            },
        ],
    }) ;

    let errors = FormManager.validateForm(filename, "team") ;

    expect(errors).toEqual([]) ;
}) ;

