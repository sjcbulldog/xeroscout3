import * as fs from "fs" ;
import * as os from "os" ;
import * as path from "path" ;

const testModeValues = new Set(["1", "true", "yes", "on"]) ;

export function isTestMode(args: string[] = process.argv, env: NodeJS.ProcessEnv = process.env) : boolean {
    if (args.includes("--test-mode")) {
        return true ;
    }

    const value = env.XEROSCOUT_TEST_MODE?.trim().toLowerCase() ;
    return value !== undefined && testModeValues.has(value) ;
}

export function isTestDriverEnabled(env: NodeJS.ProcessEnv = process.env) : boolean {
    const value = env.APP_TEST_DRIVER?.trim().toLowerCase() ?? env.XEROSCOUT_TEST_DRIVER?.trim().toLowerCase() ;
    return value !== undefined && testModeValues.has(value) ;
}

export function resolveUserDataPath(env: NodeJS.ProcessEnv = process.env) : string | undefined {
    const override = env.XEROSCOUT_USER_DATA_DIR?.trim() ;
    if (override && override.length > 0) {
        return path.resolve(override) ;
    }

    const root = env.XEROSCOUT_HOME?.trim() ;
    if (root && root.length > 0) {
        return path.resolve(root, "user-data") ;
    }

    return undefined ;
}

export function resolveLegacyAppHome(env: NodeJS.ProcessEnv = process.env) : string {
    const root = env.XEROSCOUT_HOME?.trim() ;
    if (root && root.length > 0) {
        return path.resolve(root, "legacy-home") ;
    }

    return path.join(os.homedir(), ".xeroscout") ;
}

export function ensureDirectoryExists(dir: string) : string {
    fs.mkdirSync(dir, { recursive: true }) ;
    return dir ;
}

export function resolveSyncPort(env: NodeJS.ProcessEnv = process.env) : number | undefined {
    const raw = env.XEROSCOUT_SYNC_PORT?.trim() ;
    if (!raw) {
        return undefined ;
    }

    const port = Number(raw) ;
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        return undefined ;
    }

    return port ;
}

export function resolveSyncCableHost(env: NodeJS.ProcessEnv = process.env) : string | undefined {
    const raw = env.XEROSCOUT_SYNC_CABLE_HOST?.trim() ;
    if (!raw) {
        return undefined ;
    }

    return raw ;
}
