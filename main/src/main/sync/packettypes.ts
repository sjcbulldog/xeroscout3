export const PacketCompressionNone = 0 ;

export enum PacketType {
    Hello = 0x00,
    RequestTablets = 0x01,
    Error = 0x02,
    ProvideTablets = 0x03,
    RequestMatchList = 0x04,
    RequestTeamList = 0x05,
    RequestTeamForm = 0x06,
    RequestMatchForm = 0x07,
    ProvideTeamForm = 0x08,
    ProvideMatchForm = 0x09,
    ProvideMatchList = 0x0a,
    ProvideTeamList = 0x0b,
    ProvideResults = 0x0c,
    ReceivedResults = 0x0d,
    RequestImages = 0x0e,
    ProvideImages = 0x0f,
    RequestMatchResults = 0x010,
    ProvideMatchResults = 0x011,
    RequestTeamResults = 0x012,
    ProvideTeamResults = 0x013,
    Goodbye = 0x14
} ;
