/// <reference types="node" />
/** AMS packet */
export interface AmsTcpPacket {
    /** AMS TCP header */
    amsTcp: AmsTcpHeader;
    /** AMS header */
    ams: AmsHeader;
    /** ADS data */
    ads: AdsData;
}
/** AMS TCP header */
export interface AmsTcpHeader {
    /** AMS command as number */
    command: number;
    /** AMS command as enumerated string */
    commandStr: string;
    /** AMS data length (bytes) */
    dataLength: number;
    /** AMS data (if available - only in certain commands) */
    data: null | Buffer | AmsRouterStateData | AmsPortRegisteredData;
}
/** AMS header */
export interface AmsHeader {
    /** Target AmsNetId (receiver) */
    targetAmsNetId: string;
    /** Target ADS port (receiver) */
    targetAdsPort: number;
    /** Source AmsNetId (sender) */
    sourceAmsNetId: string;
    /** Source ADS port (sender) */
    sourceAdsPort: number;
    /** ADS command as number */
    adsCommand: number;
    /** ADS command as enumerated string */
    adsCommandStr: string;
    /** ADS state flags as number (bits) */
    stateFlags: number;
    /** ADS state flags as comma separated string */
    stateFlagsStr: string;
    /** ADS data length */
    dataLength: number;
    /** ADS error code */
    errorCode: number;
    /** Command invoke ID */
    invokeId: number;
    /** True if error */
    error: boolean;
    /** Error message as string */
    errorStr: string;
}
/** ADS data */
export interface AdsData {
    /** Raw ADS data as Buffer */
    rawData?: Buffer;
    /** Any other value, custom for each command. TODO: Perhaps custom types? */
    [key: string]: any;
}
/** ADS command that is sent to the target (whole packet is built from this) */
export interface AdsCommandToSend {
    /** Ads command as number */
    adsCommand: number;
    /** Target AmsNetId (receiver) */
    targetAmsNetId: string;
    /** Target ADS port (receiver) */
    targetAdsPort: number;
    /** Source AmsNetId (sender) */
    sourceAmsNetId: string;
    /** Source ADS port (sender) */
    sourceAdsPort: number;
    /** Invoke ID to use */
    invokeId: number;
    /** Raw data to be sent as Buffer */
    rawData: Buffer;
}
/** Data that is received when AMS router state changes */
export interface AmsRouterStateData {
    /** New router state as number */
    routerState: number;
}
/** Data that is received when AMS port is registered to router */
export interface AmsPortRegisteredData {
    /** Local registered AmsNetId */
    localAmsNetId: string;
    /** Local registered ADS port */
    localAdsPort: number;
}
/** Local AMS router state (if available) */
export interface AmsRouterState {
    /** Router state */
    state: number;
    /** Router state as string */
    stateStr: string;
}
