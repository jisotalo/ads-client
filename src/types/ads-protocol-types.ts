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
*/;
import { ADS } from "../ads-client";
import { PlcPrimitiveType } from "./ads-client-types";

/** 
 * AMS address
 * 
 * Combination of AmsNetId and ADS port
 * 
 * @category Types
 */
export interface AmsAddress {
  /** AmsNetId, such as `192.168.1.2.1.1`*/
  amsNetId: string,
  /** ADS port, such as `851` */
  adsPort: number
}

/** 
 * AMS packet for communication
 * 
 * @category Types
 */
export interface AmsTcpPacket<T = AdsData> {
  /** AMS TCP header */
  amsTcp: AmsTcpHeader,
  /** AMS header */
  ams: AmsHeader,
  /** ADS data */
  ads: T
}

/** 
 * AMS TCP header 
 * 
 * @category Types
 */
export interface AmsTcpHeader {
  /** AMS command as number */
  command: number
  /** AMS command as string */
  commandStr: keyof typeof ADS.AMS_HEADER_FLAG | string,
  /** AMS data length (bytes) */
  length?: number,
  /** AMS data (if any)) */
  data?: Buffer | AmsRouterStateData | AmsPortRegisteredData
}

/** 
 * AMS header
 * 
 * @category Types
 */
export interface AmsHeader {
  /** Target AmsNetId and port (receiver) */
  targetAmsAddress: AmsAddress,
  /** Source AmsNetId and port (sender) */
  sourceAmsAddress: AmsAddress,
  /** ADS command as number */
  adsCommand: number,
  /** ADS command as enumerated string */
  adsCommandStr: keyof typeof ADS.ADS_COMMAND | string,
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

/** 
 * ADS data 
 * 
 * @category Types
 */
export type AdsData = AdsResponse | AdsRequest;

/** 
 * AmsTcpHeader data that is received when AMS router state changes 
 * 
 * @category Types
 */
export interface AmsRouterStateData {
  /** New router state as number */
  routerState: number
}

/** 
 * AmsTcpHeader data that is received when AMS port is registered from the router 
 * 
 * @category Types
 */
export type AmsPortRegisteredData = AmsAddress;

/** 
 * AMS router state 
 * 
 * @category Types
 */
export interface AmsRouterState {
  /** Router state */
  state: number,
  /** Router state as string */
  stateStr: string
}

/** 
 * ADS response
 * 
 * @category Types
 */
export type AdsResponse =
  EmptyAdsResponse
  | UnknownAdsResponse
  | AdsReadResponse
  | AdsReadWriteResponse
  | AdsWriteResponse
  | AdsReadDeviceInfoResponse
  | AdsNotificationResponse
  | AdsAddNotificationResponse
  | AdsDeleteNotificationResponse
  | AdsWriteControlResponse;

/**
 * ADS request
 * 
 * @category Types
 */
export interface AdsRequest {
  /** Payload of the ADS request (if any) */
  payload?: Buffer
};

/**
 * ADS error
 * 
 * @category Types
 */
export interface AdsError {
  /** ADS error code (0 = no error, -1 = other than ADS error) */
  errorCode: number,
  /** ADS error string */
  errorStr?: string
}

/**
 * Base ADS reponse (that is received in all responses)
 * 
 * @category Types
 */
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
 * 
 * @category Types
 */
export type EmptyAdsResponse = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in any]: never //allow only empty object
};

/**
 * ADS response for `Read` command
 * 
 * @category Types
 */
export interface AdsReadResponse extends BaseAdsResponse {
  /** Data length */
  length: number,
  /** Response data */
  payload: Buffer
};

/**
 * ADS response for `ReadWrite` command
 * 
 * @category Types
 */
export interface AdsReadWriteResponse extends BaseAdsResponse {
  /** Data length */
  length: number,
  /** Response data */
  payload: Buffer
};

/**
 * ADS response for `Write` command
 * 
 * @category Types
 */
export interface AdsWriteResponse extends BaseAdsResponse {
};

/**
 * ADS response for `ReadDeviceInfo` command
 * 
 * @category Types
 */
export interface AdsReadDeviceInfoResponse extends BaseAdsResponse {
  /** Device info */
  payload: AdsDeviceInfo
};

/**
 * ADS response for `ReadState` command
 * 
 * @category Types
 */
export interface AdsReadStateResponse extends BaseAdsResponse {
  /** ADS state */
  payload: AdsState
};

/**
 * ADS response for `AddNotification` command
 * 
 * @category Types
 */
export interface AdsAddNotificationResponse extends BaseAdsResponse {
  /** Device notification handle */
  payload: AdsAddNotificationResponseData
};

/**
 * ADS response for `DeleteNotification` command
 * 
 * @category Types
 */
export interface AdsDeleteNotificationResponse extends BaseAdsResponse { };

/**
 * ADS response for `WriteControl` command
 * 
 * @category Types
 */
export interface AdsWriteControlResponse extends BaseAdsResponse { };

/**
 * ADS response for `Notification` command
 * 
 * @category Types
 */
export interface AdsNotificationResponse extends BaseAdsResponse {
  /** Notification data */
  payload: AdsNotification
};

/**
 * ADS response for unknown command
 * 
 * @category Types
 */
export interface UnknownAdsResponse extends BaseAdsResponse { };

/**
 * ADS device info
 * 
 * @category Types
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
 * 
 * @category Types
 */
export interface AdsState {
  /** ADS state */
  adsState: number,
  /** ADS state as string (if any) */
  adsStateStr?: string,
  /** Device state */
  deviceState: number
}

/**
 * ADS `AddNotification` response payload
 * 
 * @category Types
 */
export interface AdsAddNotificationResponseData {
  /** Notification handle */
  notificationHandle: number
}

/**
 * ADS notification with number of stamps
 * 
 * @category Types
 */
export interface AdsNotification {
  /** Total data length (bytes) */
  length: number,
  /** How many stamps does this packet have */
  stampCount: number,
  /** Stamps */
  stamps: AdsNotificationStamp[]
}

/**
 * Single ADS notification stamp with multiple samples
 * 
 * @category Types
 */
export interface AdsNotificationStamp {
  /** Timestamp of the included data*/
  timestamp: Date,
  /** How many samples */
  count: number,
  /** Samples (payload) */
  samples: AdsNotificationSample[]
}

/**
 * Single ADS notification sample
 * 
 * @category Types
 */
export interface AdsNotificationSample {
  /** Notification handle this data belongs to */
  notificationHandle: number,
  /** Data (payload) length */
  length: number,
  /** Data (raw) */
  payload: Buffer
}

/**
 * ADS raw address
 * 
 * @category Types
 */
export interface AdsRawAddress{
  /** Address indexGroup */
  indexGroup: number,
  /** Address indexOffset */
  indexOffset: number,
  /** Size as bytes (if any) */
  size?: number
}

/**
 * ADS symbol object
 * 
 * @category Types
 */
export interface AdsSymbol {
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
  arrayInfo: Array<AdsArrayInfoEntry>,
  /** GUID of the symbol */
  typeGuid: string,
  /** Symbol attributes, such as pragmas */
  attributes: Array<AdsAttributeEntry>
  /* Extended flags */
  extendedFlags: number,
  /** Rest bytes in the end of data that have no meaning yet */
  reserved: Buffer
}

/**
 * Array information entry for symbol or data type
 * 
 * @category Types
 */
export interface AdsArrayInfoEntry {
  /** Array start/first index */
  startIndex: number,
  /** Array length */
  length: number,
}

/**
 * Attribute entry for symbol, data type, RPC method etc.
 * 
 * @category Types
 */
export interface AdsAttributeEntry {
  /** Attribute name */
  name: string,
  /** Attribute value */
  value: string
}

/**
 * ADS data type object
 * 
 * @category Types
 */
export interface AdsDataType {
  /** Structure version */
  version: number,
  /** Hash value of data type (for comparison) */
  hashValue: number,
  /** Type hash value */
  typeHashValue: number,
  /** Data type size (bytes or bits if `BitValues` flag) */
  size: number,
  /** Offset of the entry in parent data type (bytes or bits if `BitValues` flag) */
  offset: number
  /** ADS data type as number (see `ADS.ADS_DATA_TYPES`) */
  adsDataType: number,
  /** ADS data type as string (see `ADS.ADS_DATA_TYPES`) */
  adsDataTypeStr: keyof typeof ADS.ADS_DATA_TYPES | string,
  /** Data type flags as bit-notation (see `ADS.ADS_DATA_TYPE_FLAGS`) */
  flags: number,
  /** Data type flags as string array (see `ADS.ADS_DATA_TYPE_FLAGS`) */
  flagsStr: (keyof typeof ADS.ADS_DATA_TYPE_FLAGS | string)[],
  /** Array dimension (if array) */
  arrayDimension: number,
  /** 
   * Name of this entry
   * 
   * **IMPORTANT NOTE**:
   *  - If entry is a subitem (e.g. struct member, `item: WORD`), this is the variable name (`item`)
   *  - If entry is not a subitem / it's the topmost type, this is the data type name (`WORD`)
   * 
   * See also `type`
   */
  name: string,
  /** 
   * Type of this entry
   * 
   * **IMPORTANT NOTE**:
   *  - If entry is a subitem (e.g. struct member, `item: WORD`), this is the variable type (`WORD`)
   *  - If entry is not a subitem / it's the topmost type, this is empty string (``)
   * 
   * See also `name`
   */
  type: string,
  /** Data type comment (comment in the PLC code) */
  comment: string,
  /** If data type is an array, information of each array dimension */
  arrayInfos: AdsArrayInfoEntry[],
  /** Subitems (children data types) of this data type (e.g. struct members)*/
  subItems: AdsDataType[],
  /** Data type unique identifier (GUID) */
  typeGuid: string,
  /** RPC methods */
  rpcMethods: AdsRpcMethodEntry[],
  /** Attributes */
  attributes: AdsAttributeEntry[],
  /** Enumeration info */
  enumInfos: AdsEnumInfoEntry[],
  /** Data type extended flags */
  extendedFlags: number,
  /** Reserved data */
  reserved: Buffer
}

/**
 * RPC method entry for a data type
 * 
 * @category Types
 */
export interface AdsRpcMethodEntry {
  /** Structure version */
  version: number,
  /** vTable index for this method */
  vTableIndex: number,
  /** Size of the return type (bytes) */
  returnTypeSize: number,
  /** Size of the biggest element for alignment (bytes) */
  returnAlignSize: number,
  /** Reserved */
  reserved: number,
  /** Unique identifier (GUID) of the return type */
  returnTypeGuid: string,
  /** Return value ADS data type as number (see `ADS.ADS_DATA_TYPES`) */
  returnAdsDataType: number,
  /** Return value ADS data type as string (see `ADS.ADS_DATA_TYPES`) */
  returnAdsDataTypeStr: keyof typeof ADS.ADS_DATA_TYPES | string,
  /** PRC method flags as bit-notation (see `ADS.ADS_RCP_METHOD_FLAGS`) */
  flags: number,
  /** RPC method flags as string array (see `ADS.ADS_RCP_METHOD_FLAGS`) */
  flagsStr: (keyof typeof ADS.ADS_RCP_METHOD_FLAGS | string)[],
  /** RPC method name*/
  name: string,
  /** RPC method return data type */
  retunDataType: string,
  /** RPC method comment (comment in the PLC code) */
  comment: string,
  /** Parameters (inputs and outputs) */
  parameters: AdsRpcMethodParameterEntry[]
  /** Method attributes */
  attributes: AdsAttributeEntry[]
}

/**
 * RPC method parameter entry for a RPC method
 * 
 * @category Types
 */
export interface AdsRpcMethodParameterEntry {
  /** Size (bytes) */
  size: number,
  /** Size for alignment (bytes) */
  alignSize: number,
  /** ADS data type as number (see `ADS.ADS_DATA_TYPES`) */
  adsDataType: number,
  /** ADS data type as string (see `ADS.ADS_DATA_TYPES`) */
  adsDataTypeStr: string,
  /** RPC method parameter flags as bit-notation (see `ADS.RCP_METHOD_PARAM_FLAGS`) */
  flags: number,
  /** RPC method parameter flags as string array (see `ADS.RCP_METHOD_PARAM_FLAGS`) */
  flagsStr: (keyof typeof ADS.ADS_RCP_METHOD_PARAM_FLAGS | string)[],
  /** Reserved */
  reserved: number,
  /** GUID of data type */
  typeGuid: string,
  /** Index-1 of corresponding parameter with length info (not relevant) */
  lengthIsParameterIndex: number,
  /** Parameter name*/
  name: string,
  /** Parameter data type */
  type: string,
  /** Parameter comment (comment in the PLC code) */
  comment: string,
  /** Attributes */
  attributes: AdsAttributeEntry[],
  /** Reserved data in the end of entry (if any) */
  reserved2: Buffer
}

/**
 * ADS enumeration entry
 * 
 * @category Types
 */
export interface AdsEnumInfoEntry {
  /** Enumeration name*/
  name: string,
  /** Enumeration value */
  value: PlcPrimitiveType
}

/**
 * PLC runtime upload info
 * 
 * Contains information about symbols, data types and target system.
 * 
 * @category Types
 */
export interface AdsUploadInfo {
  /** Upload info version - depends on target TwinCAT version (1 = 8 bytes, 2 = 24 bytes, 3 = 64 bytes of data) */
  version: 1 | 2 | 3,
  /** Number of symbols in the target runtime (version >= 1) */
  symbolCount: number,
  /** Length of downloadable symbol description data (bytes) (version >= 1) */
  symbolLength: number,
  /** Number of datatypes in the target runtime (version >= 2) */
  dataTypeCount?: number,
  /** Length of downloadable data type description data (bytes) (version >= 2) */
  dataTypeLength?: number,
  /** Max. allowed dynamic symbol count (version >= 2) */
  maxDynamicSymbolCount?: number,
  /** Number of dynamic symbols used (version >= 2) */
  dynamicSymbolCount?: number
  /** Invalid dynamic symbol count (version >= 3) */
  invalidDynamicSymbolCount?: number,
  /** Encoding code page used for STRING encoding (version >= 3) */
  encodingCodePage?: number,  
  /** Upload info flags as bit-notation (see ADS.ADS_SYMBOL_FLAGS) (version >= 3) */
  flags?: number,
  /** Upload info flags as string array (see ADS.ADS_SYMBOL_FLAGS) (version >= 3) */
  flagsStr?: (keyof typeof ADS.ADS_UPLOAD_INFO_FLAGS | string)[], 
  /** Reserved bytes (version >= 3) */
  reserved?: Buffer
}