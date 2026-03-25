import { describe, expect, test } from "vitest";
import { PacketObj } from "../main/sync/packetobj";
import { PacketType, packetTypeToString } from "../main/sync/packettypes";
import { createSyncSessionId, packetSummary } from "../main/sync/syncdiag";

describe('sync diagnostics helpers', () => {
    test('packet type names are stable and readable', () => {
        expect(packetTypeToString(PacketType.HelloFromScouter)).toBe('HelloFromScouter') ;
        expect(packetTypeToString(9999)).toContain('UnknownPacket') ;
    }) ;

    test('packet summary exposes readable payload metadata', () => {
        const packet = new PacketObj(PacketType.RequestTeamForm, Buffer.from('{"hello":"world"}', 'utf-8')) ;
        const summary = packetSummary(packet) ;

        expect(summary.packetName).toBe('RequestTeamForm') ;
        expect(summary.payloadBytes).toBeGreaterThan(0) ;
        expect(summary.payloadPreview).toContain('hello') ;
    }) ;

    test('sync session ids are unique enough for correlation', () => {
        const first = createSyncSessionId() ;
        const second = createSyncSessionId() ;

        expect(first).not.toBe(second) ;
        expect(first.startsWith('sync-')).toBe(true) ;
    }) ;
}) ;
