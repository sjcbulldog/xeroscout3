import { expect, test } from "vitest" ;

import { isTestMode, resolveLegacyAppHome, resolveSyncCableHost, resolveUserDataPath } from "../main/runtimeenv" ;

test('isTestMode recognizes CLI flag', () => {
    expect(isTestMode(['node', 'main.js', '--test-mode'], {})).toBe(true) ;
}) ;

test('isTestMode recognizes environment variable', () => {
    expect(isTestMode(['node', 'main.js'], { XEROSCOUT_TEST_MODE: 'true' })).toBe(true) ;
    expect(isTestMode(['node', 'main.js'], { XEROSCOUT_TEST_MODE: '1' })).toBe(true) ;
    expect(isTestMode(['node', 'main.js'], { XEROSCOUT_TEST_MODE: 'no' })).toBe(false) ;
}) ;

test('resolveUserDataPath prefers explicit user-data directory', () => {
    expect(resolveUserDataPath({
        XEROSCOUT_USER_DATA_DIR: '/tmp/xeroscout-user-data',
        XEROSCOUT_HOME: '/tmp/xeroscout-home',
    })).toBe('/tmp/xeroscout-user-data') ;
}) ;

test('resolveUserDataPath derives a per-run user-data directory from XEROSCOUT_HOME', () => {
    expect(resolveUserDataPath({
        XEROSCOUT_HOME: '/tmp/xeroscout-home',
    })).toBe('/tmp/xeroscout-home/user-data') ;
}) ;

test('resolveLegacyAppHome derives an isolated legacy-home directory from XEROSCOUT_HOME', () => {
    expect(resolveLegacyAppHome({
        XEROSCOUT_HOME: '/tmp/xeroscout-home',
    })).toBe('/tmp/xeroscout-home/legacy-home') ;
}) ;

test('resolveSyncCableHost returns the configured cable host override', () => {
    expect(resolveSyncCableHost({
        XEROSCOUT_SYNC_CABLE_HOST: '127.0.0.1',
    })).toBe('127.0.0.1') ;
}) ;
