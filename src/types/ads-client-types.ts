interface ConnectionSettings {
  /** Required: Target system AmsNetId address, use localhost or 127.0.0.1.1 for local system */
  targetAmsNetId: string,
  /** Required: Target runtime ADS port, for example 851 for TwinCAT 3 runtime 1 */
  targetAdsPort: number,
  /** Optional: Target ADS router TCP port (default: 48898) */
  routerTcpPort: number,
  /** Optional: Target ADS router IP address/hostname (default: '127.0.0.1') */
  routerAddress: string,
  /** Optional: Local IP address to use, use this to change used network interface if required (default: '' = automatic) */
  localAddress: string,
  /** Optional: Local TCP port to use for outgoing connections (default: 0 = automatic) */
  localTcpPort: number,
  /** Optional: Local AmsNetId to use (default: automatic) */
  localAmsNetId: string,
  /** Optional: Local ADS port to use (default: automatic/router provides) */
  localAdsPort: number,
  /** Optional: Time (milliseconds) after connecting to the router or waiting for command response is canceled to timeout (default: 2000) */
  timeoutDelay: number,
  /** Optional: If true and connection to the router is lost, the server tries to reconnect automatically (default: true) */
  autoReconnect: boolean,
  /** Optional: Time (milliseconds) how often the lost connection is tried to re-establish (default: 2000) */
  reconnectInterval: number,
}

export interface AdsClientSettings extends ConnectionSettings {
  /** Optional: If true, enumeration (ENUM) data types are converted to objects ({name: 'enumValue', value: 5} instead of 5) (default: true) */
  objectifyEnumerations: boolean,
  /** Optional: If true, PLC date types are converted to Javascript Date objects instead of plain number value (default: true)*/
  convertDatesToJavascript: boolean,
  /** Optional: If true, all symbols from PLC runtime are read and cached when connected. This is quite an intensive operation but useful in some cases. Otherwise symbols are read and cached only when used. (default: false).*/
  readAndCacheSymbols: boolean,
  /** Optional: If true, all data types from PLC runtime are read and cached when connected. This is quite an intensive operation but useful in some cases. Otherwise types are read and cached only when used. (default: false).*/
  readAndCacheDataTypes: boolean,
  /** Optional: If true, PLC symbol version changes (PLC sofware updates etc.) are not detected and symbols are not updated automatically. Can be set to true in non-TwinCAT systems that do not support this feature. (default: false) */
  disableSymbolVersionMonitoring: boolean,
  /** Optional: If true, no warnings are written to console using console.log() (default: false)*/
  hideConsoleWarnings: boolean,
  /** Optional: Time (milliseconds) how often target PLC system manager status is read to detect connection state (default: 1000ms)*/
  checkStateInterval: number,
  /** Optional: Time (milliseconds) how long after the target PLC system manager is not available the connection is determined to be lost (default: 5000ms) */
  connectionDownDelay: number,
  /** Optional: If true, the connect() will success even no targer runtime is found (but system manager is available) - For example if PLC software is not yet downloaded but we want to connect in advance. (default: false) */
  allowHalfOpen: boolean,
  /** Optional: If true, only direct ADS connection is established to target. Can be used to connect to system without system manager etc. (non-TwinCAT or direct I/O) (default: false) */
  bareClient: boolean
}

export interface TimerObject {
  /** Timer ID */
  id: number,
  /** Timer handle */
  timer?: NodeJS.Timeout
}

export interface AdsClientConnection {
  /** Connection status of the client */
  connected: boolean,
  /** Local AmsNetId of the client */
  localAmsNetId?: string,
  /** Local ADS port of the client */
  localAdsPort?: number
}

export interface ActiveSubscriptionContainer {
  [K: number]: ActiveSubscription
}

export interface ActiveSubscription {
  
}

export interface ActiveAdsRequestContainer {
  [K: number]: ActiveAdsRequest
}

export interface ActiveAdsRequest {
  
}