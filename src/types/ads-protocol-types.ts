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
import * as ADS from '../ads-commons';

/** AMS packet */
export interface AmsTcpPacket<T = AdsData> {
  /** AMS TCP header */
  amsTcp: AmsTcpHeader,
  /** AMS header */
  ams: AmsHeader,
  /** ADS data */
  ads: T
}

/** AMS TCP header */
export interface AmsTcpHeader {
  /** AMS command as number */
  command: number
  /** AMS command as enumerated string */
  commandStr: string,
  /** AMS data length (bytes) */
  length?: number,
  /** AMS data (if available - only in certain commands) */
  data?: Buffer | AmsRouterStateData | AmsPortRegisteredData
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
  error?: boolean,
  /** Error message as string */
  errorStr?: string
}

/** ADS data */
export type AdsData = AdsResponse | AdsRequest;

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
  | EmptyAdsResponse
  | UnknownAdsResponse
  | AdsReadResponse
  | AdsReadWriteResponse
  | AdsWriteResponse
  | AdsReadDeviceInfoResponse
  | AdsNotificationResponse
  | AdsAddNotificationResponse
  | AdsDeleteNotificationResponse
  | AdsWriteControlResponse;

export interface AdsRequest {
  payload?: Buffer
};

export interface BaseAdsResponse {
  /** True if response has error (ADS or our own customer error) */
  error: boolean,
  /** ADS error code (0 = no error, -1 = other than ADS error) */
  errorCode: number,
  /** ADS error string */
  errorStr?: string
}

/**
 * Empty ADS response (no payload)
 */
export type EmptyAdsResponse = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in any]: never //allow only empty object
};

/**
 * ADS read response
 */
export interface AdsReadResponse extends BaseAdsResponse {
  /** Data length */
  length: number,
  /** Response data */
  payload: Buffer
};

/**
 * ADS ReadWrite response
 */
export interface AdsReadWriteResponse extends BaseAdsResponse {
  /** Data length */
  length: number,
  /** Response data */
  payload: Buffer
};

/**
 * ADS Write response
 */
export interface AdsWriteResponse extends BaseAdsResponse {
};

/**
 * ADS ReadDeviceInfo response
 */
export interface AdsReadDeviceInfoResponse extends BaseAdsResponse {
  /** Device info */
  payload: AdsDeviceInfo
};

/**
 * ADS ReadState response
 */
export interface AdsReadStateResponse extends BaseAdsResponse {
  /** ADS state */
  payload: AdsState
};

/**
 * ADS AddNotification response
 */
export interface AdsAddNotificationResponse extends BaseAdsResponse {
  /** Device notification handle */
  payload: AddNotificationResponseData
};

/**
 * ADS DeleteNotification response
 */
export interface AdsDeleteNotificationResponse extends BaseAdsResponse {
};

/**
 * ADS WriteControl response
 */
export interface AdsWriteControlResponse extends BaseAdsResponse {
};

/**
 * ADS notification response
 */
export interface AdsNotificationResponse extends BaseAdsResponse {
  /** Notification data */
  payload: AdsNotification
};

/**
 * ADS response that is unknown
 */
export interface UnknownAdsResponse extends BaseAdsResponse {
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
 * ADS add notification response data
 */
export interface AddNotificationResponseData {
  /** Notification handle */
  notificationHandle: number
}

export interface AdsNotification {
  /** Total data length (bytes) */
  length: number,
  /** How many stamps does this packet have */
  stampCount: number,
  /** Stamps */
  stamps: Array<AdsNotificationStamp>
}

export interface AdsNotificationStamp {
  /** Timestamp of the included data*/
  timestamp: Date,
  /** How many samples */
  count: number,
  /** Samples (payload) */
  samples: Array<AdsNotificationSample>
}

export interface AdsNotificationSample {
  /** Notification handle this data belongs to */
  notificationHandle: number,
  /** Data (payload) length */
  length: number,
  /** Data (raw) */
  payload: Buffer
}

export interface AdsRawInfo {
  /** Address indexGroup */
  indexGroup: number,
  /** Address indexOffset */
  indexOffset: number,
  /** Size (bytes) */
  size: number
}

export interface AdsSymbolInfo {
  /** Symbol address indexGroup */
  indexGroup: number,
  /** Symbol address indexOffset */
  indexOffset: number,
  /** Symbol size (bytes) */
  size: number,
  /** ADS data type as number (see ADS.ADS_DATA_TYPES) */
  adsDataType: number,
  /** ADS data type as string (see ADS.ADS_DATA_TYPES) */
  adsDataTypeStr: string,
  /** Symbol flags as bit-notation (see ADS.ADS_SYMBOL_FLAGS) */
  flags: number,
  /** Symbol flags as string array (see ADS.ADS_SYMBOL_FLAGS) */
  flagsStr: string[],
  /** If symbol is an array, its array dimension */
  arrayDimension: number,
  /** Symbol name (variable path) */
  name: string,
  /** Symbol data type */
  type: string,
  /** Symbol comment (variable comment in the PLC code) */
  comment: string,
  /** If symbol is an array, information of each array dimension */
  arrayData: Array<AdsArrayDataEntry>,
  /** GUID of the symbol */
  typeGuid: string,
  /** Symbol attributes, such as pragmas */
  attributes: Array<AdsSymbolInfoAttributeEntry>
  /* Extended flags (meaning unknown at this point) */
  extendedFlags: number,
  /** Rest bytes in the end of data that have no meaning yet */
  reserved: Buffer
}

export interface AdsArrayDataEntry {
  /** Array start/first index */
  startIndex: number,
  /** Array length */
  length: number,
}

export interface AdsSymbolInfoAttributeEntry {
  /** Attribute name */
  name: string,
  /** Attribute value */
  value: string
}

export interface AdsDataType {
  version: number,
  hashValue: number,
  typeHashValue: number,
  /** Data type size (bytes) */
  size: number,
  offset: number
  /** ADS data type as number (see ADS.ADS_DATA_TYPES) */
  adsDataType: number,
  /** ADS data type as string (see ADS.ADS_DATA_TYPES) */
  adsDataTypeStr: string,
  /** Data type flags as bit-notation (see ADS.ADS_DATA_TYPE_FLAGS) */
  flags: number,
  /** Data type flags as string array (see ADS.ADS_DATA_TYPE_FLAGS) */
  flagsStr: string[],
  /** If data type is an array, its array dimension */
  arrayDimension: number,
  /** TODO name */
  name: string,
  /** TODO type */
  type: string,
  /** Data type comment (comment in the PLC code) */
  comment: string,
  /** If data type is an array, information of each array dimension */
  arrayData: Array<AdsArrayDataEntry>,
}