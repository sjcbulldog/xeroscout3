import winston from "winston";
import { PacketObj } from "./packetobj";
import { PacketType } from "./packettypes";

export interface SyncTraceContext {
    sessionId: string;
    role: 'central' | 'scout' | 'coach';
    transport: string;
    path: string;
    host?: string;
    port?: number;
    tablet?: string;
    purpose?: string;
    eventUuid?: string;
}

export function createSyncSessionId() : string {
    return `sync-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}` ;
}

export function packetTypeName(type: PacketType | number) : string {
    return PacketType[type as PacketType] ?? `UnknownPacket(${type})` ;
}

export function packetSummary(packet: PacketObj) {
    return {
        packetType: packet.type_,
        packetName: packetTypeName(packet.type_),
        payloadBytes: packet.data_.length,
        payloadPreview: payloadPreview(packet.data_),
    } ;
}

export function payloadPreview(data: Uint8Array, maxLen: number = 96) : string {
    if (!data || data.length === 0) {
        return '' ;
    }

    try {
        const text = new TextDecoder().decode(data).replace(/\s+/g, ' ').trim() ;
        if (text.length <= maxLen) {
            return text ;
        }

        return text.substring(0, maxLen) + '...' ;
    }
    catch {
        let hex = '' ;
        for (let i = 0 ; i < data.length && i < Math.floor(maxLen / 2) ; i++) {
            hex += data[i].toString(16).padStart(2, '0') ;
        }
        return hex + (data.length > Math.floor(maxLen / 2) ? '...' : '') ;
    }
}

export function traceFields(context?: SyncTraceContext, extra?: Record<string, unknown>) {
    return {
        sessionId: context?.sessionId,
        role: context?.role,
        transport: context?.transport,
        path: context?.path,
        host: context?.host,
        port: context?.port,
        tablet: context?.tablet,
        purpose: context?.purpose,
        eventUuid: context?.eventUuid,
        ...extra,
    } ;
}

export function logSync(
    logger: winston.Logger,
    level: 'error' | 'warn' | 'info' | 'debug' | 'silly',
    event: string,
    context?: SyncTraceContext,
    extra?: Record<string, unknown>
) {
    logger.log(level, event, traceFields(context, extra)) ;
}
