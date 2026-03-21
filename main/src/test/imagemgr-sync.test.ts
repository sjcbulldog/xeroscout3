import { afterEach, beforeEach, expect, test, vi } from "vitest" ;
import * as fs from "fs" ;
import * as os from "os" ;
import * as path from "path" ;

let user_data_root = '' ;

vi.mock("electron", () => {
    return {
        app: {
            getPath: (name: string) => {
                if (name !== 'userData') {
                    throw new Error(`unexpected app path request '${name}'`) ;
                }
                return user_data_root ;
            },
        },
    } ;
}) ;

import { ImageManager } from "../main/imagemgr" ;

const sample_base64 = Buffer.from('fake-image-data').toString('base64') ;

beforeEach(() => {
    user_data_root = fs.mkdtempSync(path.join(os.tmpdir(), 'xeroscout-imagemgr-')) ;
}) ;

afterEach(() => {
    if (user_data_root.length > 0) {
        fs.rmSync(user_data_root, { recursive: true, force: true }) ;
        user_data_root = '' ;
    }
}) ;

test('addSyncedImage accepts legacy string payloads as png', () => {
    let mgr = new ImageManager('scout') ;

    let result = mgr.addSyncedImage('legacy-field', sample_base64) ;

    expect(result).toEqual({ ok: true }) ;
    expect(mgr.getImageInfo('legacy-field')?.extension).toBe('png') ;
}) ;

test('addSyncedImage accepts structured payloads with supported extensions', () => {
    let mgr = new ImageManager('scout') ;

    let result = mgr.addSyncedImage('structured-field', {
        data: sample_base64,
        mimeType: 'image/webp',
        extension: 'webp',
    }) ;

    expect(result).toEqual({ ok: true }) ;
    expect(mgr.getImageInfo('structured-field')?.extension).toBe('webp') ;
}) ;

test('addSyncedImage rejects objects missing string data', () => {
    let mgr = new ImageManager('scout') ;

    let result = mgr.addSyncedImage('bad-field', {
        mimeType: 'image/png',
        extension: 'png',
    }) ;

    expect(result.ok).toBe(false) ;
    if (!result.ok) {
        expect(result.reason).toContain('missing string data') ;
    }
    expect(mgr.getImageInfo('bad-field')).toBeUndefined() ;
}) ;

test('addSyncedImage rejects objects with unsupported extensions', () => {
    let mgr = new ImageManager('scout') ;

    let result = mgr.addSyncedImage('bad-ext', {
        data: sample_base64,
        mimeType: 'image/jpeg',
        extension: 'jpeg',
    }) ;

    expect(result.ok).toBe(false) ;
    if (!result.ok) {
        expect(result.reason).toContain('unsupported extension') ;
    }
    expect(mgr.getImageInfo('bad-ext')).toBeUndefined() ;
}) ;

test('addSyncedImage rejects unexpected payload shapes without throwing', () => {
    let mgr = new ImageManager('scout') ;

    let primitive = mgr.addSyncedImage('primitive', 42) ;
    let array = mgr.addSyncedImage('array', [sample_base64]) ;
    let object = mgr.addSyncedImage('nonstr', {
        data: { nested: true },
        mimeType: 'image/png',
        extension: 'png',
    }) ;

    expect(primitive.ok).toBe(false) ;
    if (!primitive.ok) {
        expect(primitive.reason).toContain('received number') ;
    }
    expect(array.ok).toBe(false) ;
    if (!array.ok) {
        expect(array.reason).toContain('received array') ;
    }
    expect(object.ok).toBe(false) ;
    if (!object.ok) {
        expect(object.reason).toContain('missing string data') ;
    }
    expect(mgr.getImageNames()).toEqual([]) ;
}) ;
