import { AdsDataType, AdsDeviceInfo, AdsRawInfo, AdsResponse, AdsState, AdsSymbolInfo, AmsAddress, AmsTcpPacket } from "./ads-protocol-types"

interface ConnectionSettings {
  /** **REQUIRED**: Default target TwinCAT system AmsNetId address. For local (same machine), use `localhost` or `127.0.0.1.1` */
  targetAmsNetId: string,
  /** **REQUIRED**: Default target ADS port. E.g. `851` for TwinCAT 3 PLC runtime 1 */
  targetAdsPort: number,
  /** Optional: Target ADS router TCP port (default: 48898) */
  routerTcpPort?: number,
  /** Optional: Target ADS router IP address/hostname (default: '127.0.0.1') */
  routerAddress?: string,
  /** Optional: Local IP address to use, use this to change used network interface if required (default: '' = automatic) */
  localAddress?: string,
  /** Optional: Local TCP port to use for outgoing connections (default: 0 = automatic) */
  localTcpPort?: number,
  /** Optional: Local AmsNetId to use (default: automatic) */
  localAmsNetId?: string,
  /** Optional: Local ADS port to use (default: automatic/router provides) */
  localAdsPort?: number,
  /** Optional: Time (milliseconds) after connecting to the router or waiting for command response is canceled to timeout (default: 2000) */
  timeoutDelay?: number,
  /** Optional: If true and connection to the router is lost, the server tries to reconnect automatically (default: true) */
  autoReconnect?: boolean,
  /** Optional: Time (milliseconds) how often the lost connection is tried to re-establish (default: 2000) */
  reconnectInterval?: number,
}

export interface AdsClientSettings extends ConnectionSettings {
  /** Optional: If true, enumeration (ENUM) data types are converted to objects ({name: 'enumValue', value: 5} instead of 5) (default: true) */
  objectifyEnumerations?: boolean,
  /** Optional: If true, PLC date types are converted to Javascript Date objects instead of plain number value (default: true)*/
  convertDatesToJavascript?: boolean,
  /** Optional: If true, all symbols from PLC runtime are read and cached when connected. This is quite an intensive operation but useful in some cases. Otherwise symbols are read and cached only when used. (default: false).*/
  readAndCacheSymbols?: boolean,
  /** Optional: If true, all data types from PLC runtime are read and cached when connected. This is quite an intensive operation but useful in some cases. Otherwise types are read and cached only when used. (default: false).*/
  readAndCacheDataTypes?: boolean,
  /** Optional: If true, PLC symbol version changes (PLC sofware updates etc.) are not detected and symbols are not updated automatically. Can be set to true in non-TwinCAT systems that do not support this feature. (default: false) */
  disableSymbolVersionMonitoring?: boolean,
  /** Optional: If true, no warnings are written to console using console.log() (default: false)*/
  hideConsoleWarnings?: boolean,
  /** Optional: Time (milliseconds) how often connection is checked by reading target TwinCAT system state - only when `bareClient` is false (default: 1000ms)*/
  connectionCheckInterval?: number,
  /** Optional: Time (milliseconds) how long after the target TwinCAT system is not available the connection is determined to be lost (default: 5000ms) */
  connectionDownDelay?: number,
  /** Optional: If true, the connect() will success even when target PLC runtime is not available or TwinCAT system is not in run mode. For example if PLC software is not yet downloaded but we want to connect in advance.(default: false) */
  allowHalfOpen?: boolean,
  /** Optional: If true, only direct raw ADS connection is established to target. Can be used to connect to system without TwinCAT system / PLC etc. (non-TwinCAT or direct I/O) (default: false) */
  bareClient?: boolean,
  /** Optional: If true, symbols and data types are not cached. Descriptions are read every time from target and built (slows communication but data is guaranteed to be up-to-date) (default: false) */
  disableCaching?: boolean
}

export interface TimerObject {
  /** Timer ID */
  id: number,
  /** Timer handle */
  timer?: NodeJS.Timeout
}

export interface AdsClientConnection {
  /** Connection status of the client, true if connected */
  connected: boolean,
  /** True if connected to local TwinCAT system (loopback)*/
  isLocal?: boolean,
  /** Local AmsNetId of the client */
  localAmsNetId?: string,
  /** Local ADS port of the client */
  localAdsPort?: number,
  /** Target AmsNetId */
  targetAmsNetId?: string,
  /** Target ADS port */
  targetAdsPort?: number,
}

/** Object containing all active subscriptions (notification handle as key) */
export interface ActiveSubscriptionContainer {
  [K: string]: TargetActiveSubscriptionContainer
}

export interface TargetActiveSubscriptionContainer {
  [K: number]: ActiveSubscription
}

/** Object containing information for an active subscription */
export interface ActiveSubscription<T = any> {
  /** Settings for this subscription */
  settings: SubscriptionSettings<T>,
  /** True = This subscription is ads-client internal, not created by user */
  internal: boolean,
  /** Remote AMS address and port */
  remoteAddress: AmsAddress,
  /** Notification handle (number) of this subscription's ADS device notification */
  notificationHandle: number,
  /** Symbol info of the target variable (if any) */
  symbolInfo?: AdsSymbolInfo,
  /** Function that can be called to unsubscribe (same as `client.unsubscribe(...)`) */
  unsubscribe: () => Promise<void>,
  /** Function that parses received raw data to a variable */
  parseNotification: (data: Buffer, timestamp: Date) => Promise<SubscriptionData<T>>,
  /** Latest data that has been received (if any) */
  latestData?: SubscriptionData<T>,
  /** Optional target settings that override values in `settings` (NOTE: If used, no caching is available -> worse performance) */
  targetOpts?: Partial<AmsAddress>
}

export interface SubscriptionData<T = any> {
  timestamp: Date,
  value: T
}


/** Object containing all active ADS requests that are waiting for responses (invoke ID as key) */
export interface ActiveAdsRequestContainer {
  [K: number]: ActiveAdsRequest
}

export interface ActiveAdsRequest {
  timeoutTimerHandle?: NodeJS.Timeout,
  responseCallback: (packet: AmsTcpPacket<AdsResponse>) => void
};

export interface ConnectionMetaData {
  /** Target device information (if available) */
  deviceInfo?: AdsDeviceInfo,
  /** Target device TwinCAT system state (if available) */
  tcSystemState?: AdsState,
  /** Target PLC runtime state (from target ADS port - if available) */
  plcRuntimeState?: AdsState,
  /** Target runtime symbol and datatype count/size information */
  uploadInfo?: AdsUploadInfo,
  /** Actice symbol version in the target runtime - changes when PLC software is updated (symbols change) */
  symbolVersion?: number,
  /** True if client has cached all symbols previously - we know to cache all again after a symbol version change */
  allSymbolsCached: boolean,
  /** All cached target runtime symbols */
  symbols: AdsSymbolInfoContainer,
  /** True if client has cached all data types previously - we know to cache all again after a symbol version change */
  allDataTypesCached: boolean,
  /** All target runtime cached data types (without subitems, full types are built ont request)*/
  dataTypes: AdsDataTypeContainer,
  /** Local AMS router state (if available) */
  routerState?: AmsRouterState
};

export interface AmsRouterState {
  state: number,
  stateStr: string
};

export interface AdsUploadInfo {
  /** Number of symbols in the target runtime */
  symbolCount: number,
  /** Length of downloadable symbol description data (bytes) */
  symbolLength: number,
  /** Number of datatypes in the target runtime */
  dataTypeCount: number,
  /** Length of downloadable data type description data (bytes) */
  dataTypeLength: number,
  /** Unknown */
  extraCount: number,
  /** Unknown */
  extraLength: number
}

export interface AdsSymbolInfoContainer {
  [K: string]: AdsSymbolInfo
}

export interface AdsDataTypeContainer {
  [K: string]: AdsDataType
}

export interface AdsCommandToSend {
  /** Ads command */
  adsCommand: number,
  /** Target AmsNetId (receiver) */
  targetAmsNetId?: string,
  /** Target ADS port (receiver) */
  targetAdsPort?: number
  /** Payload data */
  payload?: Buffer
}

/**
 * Represents a callback function used in a subscription.
 * 
 * @template T - The type of data being passed to the callback
 * 
 * @param data - The data received
 * @param subscription - The active subscription object
 */
export type SubscriptionCallback<T = any> = (data: SubscriptionData<T>, subscription: ActiveSubscription<T>) => void;

export interface SubscriptionSettings<T = any> {
  /** 
   * Subscription target (variable name as string or raw ADS address). 
   * 
   * Such as such as `GVL_Test.ExampleStruct` or `{indexGroup, indexOffset, size}` object 
   */
  target: AdsRawInfo | string,
  /** Callback function that is called when new value is received */
  callback: SubscriptionCallback<T>,
  /** 
   * Cycle time for subscription (default: `200 ms`)
   * 
   * If `sendOnChange` is `true` (default), PLC checks if value has changed with `cycleTime` interval. 
   * If the value has changed, a new value is sent.
   * 
   * If `sendOnChange` is `false`, PLC constantly sends the value with `cycleTime` interval. 
   */
  cycleTime?: number,
  /** Should the notification be sent only when the value changes? (default: `true`)
   * 
   * If `false`, the value is sent with `cycleTime` interval (even if it doesn't change).
   * 
   * If `true` (default), the value is checked every `cycleTime` and sent only if it has changed.
   * 
   * NOTE: When subscribing, the value is always sent once.
   */
  sendOnChange?: boolean,
  /** 
   * How long the PLC waits before sending the values at maximum? (default: 0 ms --> maximum delay is off)
   * 
   * If value is not changing, the first notification with active value after subscribing is sent after `maxDelay`.
   * 
   * If the value is changing, the PLC sends one or more notifications every `maxDelay`. 
   * So if `cycleTime` is 100 ms, `maxDelay` is 1000 ms and value changes every 100 ms, the PLC sends 10 notifications every 1000 ms.
   * This can be useful for throttling.
   */
  maxDelay?: number,
}

export type PlcPrimitiveType = string | boolean | number | Buffer | Date | BigInt;

export interface ReadSymbolResult<T = any> {
  value: T,
  rawValue: Buffer,
  dataType: AdsDataType,
  symbolInfo: AdsSymbolInfo
}

export interface WriteSymbolResult<T = any> {
  value: T,
  rawValue: Buffer,
  dataType: AdsDataType,
  symbolInfo: AdsSymbolInfo
}

export interface ObjectToBufferConversionResult {
  rawValue: Buffer,
  missingProperty?: string
}

export interface VariableHandle {
  handle: number,
  size: number,
  typeDecoration: number,
  dataType: string
}