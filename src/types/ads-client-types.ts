import { AdsDataType, AdsDeviceInfo, AdsRawInfo, AdsResponse, AdsState, AdsSymbolInfo, AmsAddress, AmsTcpPacket } from "./ads-protocol-types"

interface ConnectionSettings {
  /** **REQUIRED**: Target system AmsNetId address. For local (same machine), use `localhost` or `127.0.0.1.1` */
  targetAmsNetId: string,
  /** **REQUIRED**: Target runtime ADS port. E.g. `851` for TwinCAT 3 PLC runtime 1 */
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
  /** Optional: Time (milliseconds) how often target PLC system manager status is read to detect connection state (default: 1000ms)*/
  checkStateInterval?: number,
  /** Optional: Time (milliseconds) how long after the target PLC system manager is not available the connection is determined to be lost (default: 5000ms) */
  connectionDownDelay?: number,
  /** Optional: If true, the connect() will success even no targer runtime is found (but system manager is available) - For example if PLC software is not yet downloaded but we want to connect in advance. (default: false) */
  allowHalfOpen?: boolean,
  /** Optional: If true, only direct ADS connection is established to target. Can be used to connect to system without system manager etc. (non-TwinCAT or direct I/O) (default: false) */
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
  /** Options for this subscription */
  options: SubscriptionOptions<T>,
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
  targetOpts?: TargetOptions
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
  /** Target device system manager state (if available) */
  systemManagerState?: AdsState,
  /** Target PLC runtime state (from target ADS port - if available) */
  plcRuntimeState?: AdsState,
  /** Target runtime symbol and datatype count/size information */
  uploadInfo?: AdsUploadInfo,
  /** Actice symbol version in the target runtime - changes when PLC software is updated (symbols change) */
  symbolVersion?: number,
  /** True if client has cached all symbols previously - we know to cache all again after a symbol version change */
  allSymbolsCached: boolean,
  /** All cached target runtime symbols */
  symbols: AdsSymbolsContainer,
  /** True if client has cached all data types previously - we know to cache all again after a symbol version change */
  allDataTypesCached: boolean,
  /** All target runtime cached data types (without subitems, see builtDataTypes for full data types)*/
  dataTypes: AdsDataTypesContainer,
  /** All target runtime cached built data types (with subitems / full data type tree) */
  builtDataTypes: AdsDataTypesContainer,
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

export interface AdsSymbolsContainer {
  [K: string]: AdsSymbolInfo
}

export interface AdsDataTypesContainer {
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

export interface TargetOptions{
  /** Override target AmsNetId (if different than client `settings.targetAmsNetId` */
  targetAmsNetId?: string,
  /** Override target ADS port (if different than client `settings.targetAdsPort` */
  targetAdsPort?: number,
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

export interface SubscriptionOptions<T = any> {
  /** Target of the subscription (variable name or raw address) */
  target: AdsRawInfo | string,
  /** Callback that is called when new data has arrived */
  callback: SubscriptionCallback<T>,
  /** How often the notification is sent at max (milliseconds) */
  cycleTime?: number,
  /** If true, PLC sends the notification only when value has changed. Otherwise sent intervally */
  sendOnChange?: boolean,
  /** How long the PLC waits before sending the value */
  initialDelay?: number,
}

 
export type PlcPrimitiveType = string | boolean | number | Buffer | Date | {};