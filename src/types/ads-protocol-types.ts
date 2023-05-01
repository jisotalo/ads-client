/*
Copyright (c) Jussi Isotalo <j.isotalo91@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/** AMS packet */
export interface AmsTcpPacket {
  /** AMS TCP header */
  amsTcp: AmsTcpHeader,
  /** AMS header */
  ams: AmsHeader,
  /** ADS data */
  ads: AdsData
}

/** AMS TCP header */
export interface AmsTcpHeader {
  /** AMS command as number */
  command: number
  /** AMS command as enumerated string */
  commandStr: string,
  /** AMS data length (bytes) */
  dataLength: number,
  /** AMS data (if available - only in certain commands) */
  data: null | Buffer | AmsRouterStateData | AmsPortRegisteredData
}

/** AMS header */
export interface AmsHeader {
  /** Target AmsNetId (receiver) */
  targetAmsNetId: string,
  /** Target ADS port (receiver) */
  targetAdsPort: number,
  /** Source AmsNetId (sender) */
  sourceAmsNetId: string,
  /** Source ADS port (sender) */
  sourceAdsPort: number,
  /** ADS command as number */
  adsCommand: number,
  /** ADS command as enumerated string */
  adsCommandStr: string,
  /** ADS state flags as number (bits) */
  stateFlags: number,
  /** ADS state flags as comma separated string */
  stateFlagsStr: string,
  /** ADS data length */
  dataLength: number,
  /** ADS error code */
  errorCode: number,
  /** Command invoke ID */
  invokeId: number,
  /** True if error */
  error: boolean,
  /** Error message as string */
  errorStr: string
}

/** ADS data */
export interface AdsData {
  /** Raw ADS data as Buffer */
  rawData?: Buffer,
  /** Any other value, custom for each command. TODO: Perhaps custom types? */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

/** ADS command that is sent to the target (whole packet is built from this) */
export interface AdsCommandToSend {
  /** Ads command as number */
  adsCommand: number,
  /** Target AmsNetId (receiver) */
  targetAmsNetId: string,
  /** Target ADS port (receiver) */
  targetAdsPort: number,
  /** Source AmsNetId (sender) */
  sourceAmsNetId: string,
  /** Source ADS port (sender) */
  sourceAdsPort: number,
  /** Invoke ID to use */
  invokeId: number,
  /** Raw data to be sent as Buffer */
  rawData: Buffer
}

/** Data that is received when AMS router state changes */
export interface AmsRouterStateData {
  /** New router state as number */
  routerState: number
}

/** Data that is received when AMS port is registered to router */
export interface AmsPortRegisteredData {
  /** Local registered AmsNetId */
  localAmsNetId: string,
  /** Local registered ADS port */
  localAdsPort: number,
}

/** Local AMS router state (if available) */
export interface AmsRouterState {
  /** Router state */
  state: number,
  /** Router state as string */
  stateStr: string
}

/** ADS response type (any of these) */
export type AdsResponse =
  | EmptyResponse
  | UnknownAdsRequest
  | AdsReadResponse
  | AdsReadWriteResponse
  | AdsWriteResponse
  | AdsReadDeviceInfoResponse
  | AddNotificationReq
  | DeleteNotificationReq
  | WriteControlReq;

/**
 * Empty ADS response (no payload)
 */
export type EmptyResponse = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in any]: never //allow only empty object
};

/**
 * ADS read response
 */
export interface AdsReadResponse {
  /** ADS error code (0 = no error) */
  errorCode: number,
  /** Data length */
  dataLength: number,
  /** Response data */
  data: Buffer
};

/**
 * ADS ReadWrite response
 */
export interface AdsReadWriteResponse {
  /** ADS error code (0 = no error) */
  errorCode: number,
  /** Data length */
  dataLength: number,
  /** Response data */
  data: Buffer
};

/**
 * ADS Write response
 */
export interface AdsWriteResponse {
  /** ADS error code (0 = no error) */
  errorCode: number
};

/**
 * ADS ReadDeviceInfo response
 */
export interface AdsReadDeviceInfoResponse {
  /** ADS error code (0 = no error) */
  errorCode: number,
  /** Device info */
  data: AdsDeviceInfo
};

/**
 * ADS ReadState response
 */
export interface AdsReadStateResponse {
  /** ADS error code (0 = no error) */
  errorCode: number,
  /** ADS state */
  data: AdsState
};

/**
 * ADS AddNotification response
 */
export interface AdsAddNotificationResponse {
  /** ADS error code (0 = no error) */
  errorCode: number,
  /** ADS state */
  data: AdsNotificationHandle
};

/**
 * ADS DeleteNotification response
 */
export interface AdsDeleteNotificationResponse {
  /** ADS error code (0 = no error) */
  errorCode: number
};

/**
 * ADS notification response
 */
export interface AdsNotificationResponse {
  /** ADS error code (0 = no error) */
  errorCode: number,
  /** Notification data */
  data: todo
};

/**
 * ADS device info
 */
export interface AdsDeviceInfo {
  /** Major version number */
  majorVersion: number,
  /** Minor version number */
  minorVersion: number,
  /** Build version */
  versionBuild: number,
  /** Device name */
  deviceName: string
}

/**
 * ADS state
 */
export interface AdsState {
  /** ADS state */
  adsState: number,
  /** ADS state as string (if available) */
  adsStateStr?: string,
  /** Device state */
  deviceState: number
}

/**
 * ADS notification handle
 */
export interface AdsNotificationHandle {
  /** Notification handle */
  notificationHandle: number
}
