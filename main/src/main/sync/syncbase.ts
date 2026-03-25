import { EventEmitter } from 'events';
import { PacketObj } from './packetobj';
import { PacketCompressionNone } from './packettypes';
import { SyncServer } from './syncserver';
import winston from 'winston';
import { packetSummary, SyncTraceContext, traceFields } from './syncdiag';

export class SyncBase extends EventEmitter {
    protected static readonly minPacketSize = 12;

    private buffer_? : Uint8Array ;
    protected logger_ : winston.Logger ;
    protected traceContext_? : SyncTraceContext ;

    constructor(logger: winston.Logger) {
        super() ;

        this.logger_ = logger ;
    }

    public setTraceContext(context?: SyncTraceContext) {
        this.traceContext_ = context ;
    }

    protected resetBuffers() {
        this.buffer_ = undefined ;
    }

    //
    // Convert a byte array to a packet and fire a packet event.  Return the
    // bytes remaining in the buffer.
    //
    protected extractPacket(data: Uint8Array) {
        this.logger_.debug('SyncTransportBufferReceived', traceFields(this.traceContext_, {
            incomingBytes: data.length,
            bufferedBytesBefore: this.buffer_?.length ?? 0,
        })) ;

        if (!this.buffer_) {
            this.buffer_ = data ;
        }
        else {
            if (data.length) {
                let buf: Uint8Array = new Uint8Array(this.buffer_.length + data.length) ;
                buf.set(this.buffer_) ;
                buf.set(data, this.buffer_.length) ;
                this.buffer_ = buf ;
            }
        }

        while (this.buffer_ && this.buffer_.length >= SyncBase.minPacketSize) {
            let ptype = (this.buffer_[0] << 0) | (this.buffer_[1] << 8) | (this.buffer_[2] << 16) | (this.buffer_[3] << 24) ;
            let len = (this.buffer_[4] << 0) | (this.buffer_[5] << 8) | (this.buffer_[6] << 16) | (this.buffer_[7] << 24) ;
            let comptype = (this.buffer_[8] << 0) | (this.buffer_[9] << 8) ;

            if (comptype !== PacketCompressionNone) {
                let err: Error = new Error('invalid compression type') ;
                this.logger_.error('SyncPacketParseError', traceFields(this.traceContext_, {
                    reason: err.message,
                    compressionType: comptype,
                    bufferedBytes: this.buffer_.length,
                    packetLength: len,
                    packetType: ptype,
                })) ;
                this.emit('error', err) ;
                return ;
            }

            if (this.buffer_.length < len + 10 + 2) {
                this.logger_.debug('SyncPacketPartialBuffer', traceFields(this.traceContext_, {
                    bufferedBytes: this.buffer_.length,
                    expectedBytes: len + 12,
                    packetLength: len,
                    packetType: ptype,
                })) ;
                return ;
            }

            let csum = (this.buffer_[len + 10] << 0) + (this.buffer_[len + 11] << 8) ;
            if (this.computeSum16(this.buffer_, 10, len) != csum) {
                let err: Error = new Error('invalid packet checksum') ;
                this.logger_.error('SyncPacketParseError', traceFields(this.traceContext_, {
                    reason: err.message,
                    packetType: ptype,
                    packetLength: len,
                    expectedChecksum: csum,
                    computedChecksum: this.computeSum16(this.buffer_, 10, len),
                })) ;
                this.emit('error', err) ;
                return ;
            }

            let p = new PacketObj(ptype, this.buffer_.slice(10, 10 + len)) ;
            this.logPacket('received', p) ;
            this.emit('packet', p) ;

            if (!this.buffer_) {
                return ;
            }

            if (len + 12 === this.buffer_.length) {
                this.buffer_ = undefined ;
            }
            else {
                this.buffer_ = this.buffer_.slice(12 + len) ;
            }
        }
    }

    //
    // Convert a packet to a byte array
    //
    protected convertToBytes(p: PacketObj) : Uint8Array {
        this.logPacket('sending', p) ;

        let buffer: Uint8Array = new Uint8Array(12 + p.data_.length) ;
        buffer[0] = (p.type_ >> 0) & 0xff ;
        buffer[1] = (p.type_ >> 8) & 0xff ;
        buffer[2] = (p.type_ >> 16) & 0xff ;
        buffer[3] = (p.type_ >> 24) & 0xff ;
        buffer[4] = (p.data_.length >> 0) & 0xff ;
        buffer[5] = (p.data_.length >> 8) & 0xff ;
        buffer[6] = (p.data_.length >> 16) & 0xff ;
        buffer[7] = (p.data_.length >> 24) & 0xff ;

        let comp = PacketCompressionNone ;
        buffer[8] = (comp >> 0) & 0xff ;
        buffer[9] = (comp >> 8) & 0xff ;

        buffer.set(p.data_, 10) ;

        let csum = this.computeSum16(p.data_, 0, p.data_.length) ;
        buffer[p.data_.length + 10] = (csum >> 0) & 0xff;
        buffer[p.data_.length + 11] = (csum >> 8) & 0xff ;

        return buffer ;
    }

    private logPacket(text: string, p: PacketObj) {
        const summary = packetSummary(p) ;
        this.logger_.info('SyncPacket', traceFields(this.traceContext_, {
            direction: text,
            ...summary,
        })) ;

        let msg: string = text + ':' + p.type_.toString() + ':' + p.data_.length + ':' ;
        let index = 0 ; 
        while (index < p.data_.length) {
            msg += ' ' ;
            msg += p.data_[index].toString(16) ;
            index++ ;
        }

        this.logger_.silly('SyncPacketHex', traceFields(this.traceContext_, {
            direction: text,
            packetType: p.type_,
            raw: msg,
        })) ;
    }

    private computeSum16(data: Uint8Array, start: number, length: number) : number {
        let sum: number = 0 ;
        let lencopy: number = length ;
    
        while (length-- > 0) {
            sum = (sum + data[start++]) & 0xffff ;
        }
        return sum ;
    }
}
