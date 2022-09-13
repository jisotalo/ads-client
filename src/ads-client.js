/*
ads-client.js

Copyright (c) 2020 Jussi Isotalo <j.isotalo91@gmail.com>

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
const PACKAGE_NAME = 'ads-client'

//-------------- Imports --------------
const ADS = require('./ads-client-ads.js')
const net = require('net')
const long = require('long')
const iconv = require('iconv-lite')
const EventEmitter = require('events')

//-------------- Debugs --------------
const debug = require('debug')(PACKAGE_NAME)
const debugD = require('debug')(`${PACKAGE_NAME}:details`)
const debugIO = require('debug')(`${PACKAGE_NAME}:raw-data`)






/**
 * Unofficial Node.js library for connecting to Beckhoff TwinCAT automation systems using ADS protocol
 * 
 * This library is not related to Beckhoff in any way.
 */
class Client extends EventEmitter {

  /**
   * @typedef Settings
   * 
   * NOTE: When adding/removing, update method defaultSettings()
   * 
   * @property {string} targetAmsNetId - Target system AmsNetId, use '127.0.0.1.1.1' if connecting to a local system
   * @property {number} targetAdsPort - Target system ADS port, TwinCAT 3: 851 (1st runtime), 852 (2nd runtime) and so on
   * 
   * @property {boolean} [objectifyEnumerations=true] - If true, read ENUM data types are converted to objects instead of numbers, e.g. {name: 'enumValue', value: 5} instead of 5 - (**default**: true)
   * @property {boolean} [convertDatesToJavascript=true] - If true, PLC DT (DATE_AND_TIME) and DATE types are converted to Javascript dates - Optional (**default**: true)
   * @property {boolean} [readAndCacheSymbols=false] - If true, all PLC symbols are cached during connecting. Otherwise they are read and cached only when needed - Optional (**default**: false)
   * @property {boolean} [readAndCacheDataTypes=false] - If true, all PLC data types are cached during connecting. Otherwise they are read and cached only when needed - Optional (**default**: false)
   * @property {boolean} [disableSymbolVersionMonitoring=false] - If true, PLC symbol version changes aren't monitored and cached symbols and datatypes won't be updated after PLC program download - Optional - Optional (**default**: false)
   * @property {number} [routerTcpPort=48898] - Target ADS router TCP port - Optional (**default**: 48898)
   * @property {string} [routerAddress=127.0.0.1] - Target ADS router IP address/hostname - Optional (**default**: 127.0.0.1)
   * @property {string} [localAddress='(system default)'] - Local IP address to use, use this to change used network interface if required - Optional (**default**: System default)
   * @property {number} [localTcpPort='(system default)'] - Local TCP port to use for outgoing connections - Optional (**default**: System default)
   * @property {string} [localAmsNetId='(from AMS router)'] - Local AmsNetId to use - Optional (**default**: From AMS router)
   * @property {number} [localAdsPort='(from AMS router)'] - Local ADS port to use - Optional (**default**: From AMS router)
   * @property {number} [timeoutDelay=2000] - Time (milliseconds) after connecting to the router or waiting for command response is canceled to timeout - Optional (**default**: 2000 ms)
   * @property {boolean} [hideConsoleWarnings=false] - If true, no warnings are written to console (=nothing is ever written to console) - Optional (**default**: false)
   * @property {boolean} [autoReconnect=true] - If true and connection is lost, the client tries to reconnect automatically - Optional (**default**: true)
   * @property {number} [reconnectInterval=2000] - Time (milliseconds) how often the lost connection is tried to re-establish - Optional (**default**: 2000 ms)
   * @property {number} [checkStateInterval=1000] - Time (milliseconds) how often the system manager state is read to see if connection is OK - Optional (**default**: 1000 ms)
   * @property {number} [connectionDownDelay=5000] - Time (milliseconds) after no successful reading of the system manager state the connection is determined to be lost - Optional (**default**: 5000 ms)
   * @property {boolean} [allowHalfOpen=false] - If true, connect() is successful even if no PLC runtime is found (but target and system manager are available) - Can be useful if it's ok that after connect() the PLC runtime is not immediately available (example: connecting before uploading PLC code and reading data later) - WARNING: If true, reinitializing subscriptions might fail after connection loss.
   * @property {boolean} [disableBigInt=false] - If true, 64 bit integer PLC variables are kept as Buffer objects instead of converting to Javascript BigInt variables (JSON.strigify and libraries that use it have no BigInt support)
   * @property {boolean} [bareClient=false] - If true, only direct ads connection is established (no system manager etc) - Can be used to connect to systems without PLC runtimes etc.
   */


  /**
   * Default settings
   * 
   * @returns {Settings} Default settings
   */
  static defaultSettings() {
    return {
      objectifyEnumerations: true,
      convertDatesToJavascript: true,
      readAndCacheSymbols: false,
      readAndCacheDataTypes: false,
      disableSymbolVersionMonitoring: false,
      routerTcpPort: 48898,
      routerAddress: '127.0.0.1',
      localAddress: null,
      localTcpPort: null,
      localAmsNetId: null,
      localAdsPort: null,
      timeoutDelay: 2000,
      hideConsoleWarnings: false,
      autoReconnect: true,
      reconnectInterval: 2000,
      checkStateInterval: 1000,
      connectionDownDelay: 5000,
      allowHalfOpen: false,
      disableBigInt: false,
      bareClient: false
    }
  }






  /**
   * Constructor for Client
   * 
   * @param {Settings} settings - ADS Client settings as an object, see datatype **Settings** for setting descriptions
   * 
   * @throws {ClientException} If required settings are missing, an error is thrown
   */
  constructor(settings) {
    //Call EventEmitter constructor
    super()

    //Check the required settings
    if (settings.targetAmsNetId == null) {
      throw new ClientException(this, 'Client()', 'Required setting "targetAmsNetId" is missing.')
    }
    if (settings.targetAdsPort == null) {
      throw new ClientException(this, 'Client()', 'Required setting "targetAdsPort" is missing.')
    }

    //Taking the default settings and then adding the user-defined ones
    this.settings = {
      ...Client.defaultSettings(),
      ...settings
    }

    this.settings.targetAmsNetId = this.settings.targetAmsNetId.trim()

    //Loopback address
    if (this.settings.targetAmsNetId.toLowerCase() === 'localhost') {
      this.settings.targetAmsNetId = '127.0.0.1.1.1'
    }

    //Checking that router address is 127.0.0.1 instead of localhost
    //to prevent problem like https://github.com/nodejs/node/issues/40702
    if (this.settings.routerAddress.toLowerCase() === 'localhost') {
      this.settings.routerAddress = '127.0.0.1'
    }

    /**
     * Internal variables - Not intended for external use
     * 
     * @readonly
     */
    this._internals = {
      debugLevel: 0,

      //Socket connection and data receiving
      receiveDataBuffer: Buffer.alloc(0),
      socket: null,

      //Ads communication
      nextInvokeId: 0, //Next invoke ID used for ads request
      amsTcpCallback: null, //Callback used for ams/tcp commands (like port register)
      activeAdsRequests: {}, //Active ADS requests that wait for answer from router
      activeSubscriptions: {}, //Active device notifications
      symbolVersionNotification: null, //Notification handle of the symbol version changed subscription (used to unsubscribe)
      systemManagerStatePoller: { id: 0, timer: null }, //Timer that reads the system manager state (run/config) - This is not available through ADS notifications
      firstStateReadFaultTime: null, //Date when system manager state read failed for the first time
      socketConnectionLostHandler: null, //Handler for socket connection lost event
      socketErrorHandler: null, //Handler for socket error event
      oldSubscriptions: null, //Old subscriptions that were active before connection was lost
      reconnectionTimer: { id: 0, timer: null }, //Timer that tries to reconnect intervally
      portRegisterTimeoutTimer: null, //Timeout timer of registerAdsPort()
    }



    /**
     * 
     * @typedef Metadata
     * @property {object} deviceInfo - Target device info (read after connecting)
     * @property {object} systemManagerState - Target device system manager state (run, config, etc.)
     * @property {object} plcRuntimeState - Target PLC runtime state (run, stop, etc.) (the runtime state of settings.targetAdsPort PLC runtime)
     * @property {object} uploadInfo - Contains information of target data types, symbols and so on
     * @property {number} symbolVersion - Active symbol version at target system. Changes when PLC software is updated
     * @property {boolean} allSymbolsCached - True if all symbols are cached (so we know to re-cache all during symbol version change)
     * @property {object} symbols - Object containing all so far cached symbols
     * @property {boolean} allDataTypesCached - True if all data types are cached (so we know to re-cache all during symbol version change)
     * @property {object} dataTypes - Object containing all so far cached data types
     * @property {object} routerState - Local AMS router state (RUN, STOP etc) - Updated only if router sends notification (debug/run change etc)
     */

    /**
     * Metadata related to the target system that is used during connection
     * @readonly
     * @type {Metadata}
     */
    this.metaData = {
      deviceInfo: null,
      systemManagerState: null,
      plcRuntimeState: null,
      uploadInfo: null,
      symbolVersion: null,
      allSymbolsCached: false,
      symbols: {},
      allDataTypesCached: false,
      dataTypes: {},
      routerState: {}
    }


    /**
     * 
     * @typedef Connection
     * @property {boolean} connected - True if target is connected 
     * @property {boolean} isLocal - True if target is local runtime / loopback connection
     * @property {string} localAmsNetId - Local system AmsNetId
     * @property {number} localAdsPort - Local system ADS port
     * @property {string} targetAmsNetId - Target system AmsNetId
     * @property {number} targetAdsPort - Target system ADS port
     * 
     */

    /**
     * Connection info
     * @readonly
     * @type {Connection}
     */
    this.connection = {
      connected: false,
      isLocal: false,
      localAmsNetId: null,
      localAdsPort: null,
      targetAmsNetId: this.settings.targetAmsNetId,
      targetAdsPort: this.settings.targetAdsPort
    }
  }








  /**
   * Sets debugging using debug package on/off. 
   * Another way for environment variable DEBUG:
   *  - 0 = no debugging
   *  - 1 = Extended exception stack trace
   *  - 2 = basic debugging (same as $env:DEBUG='ads-client')
   *  - 3 = detailed debugging (same as $env:DEBUG='ads-client,ads-client:details')
   *  - 4 = full debugging (same as $env:DEBUG='ads-client,ads-client:details,ads-client:raw-data')
   * 
   * @param {number} level 0 = none, 1 = extended stack traces, 2 = basic, 3 = detailed, 4 = detailed + raw data
   */
  setDebugging(level) {
    debug(`setDebugging(): Debug level set to ${level}`)

    debug.enabled = false
    debugD.enabled = false
    debugIO.enabled = false
    this._internals.debugLevel = level

    if (level === 0) {
      //See ClientException
    }
    else if (level === 2) {
      debug.enabled = true

    } else if (level === 3) {
      debug.enabled = true
      debugD.enabled = true

    } else if (level === 4) {
      debug.enabled = true
      debugD.enabled = true
      debugIO.enabled = true
    }
  }







  /**
   * Connects to the target system using pre-defined Client::settings (at constructor or manually given)
   * 
   * @returns {Promise} Returns a promise (async function)
   * - If resolved, client is connected successfully and connection info is returned (object)
   * - If rejected, something went wrong and error info is returned (object)
   */
  connect() {
    return _connect.call(this)
  }










  /**
   * Unsubscribes all notifications, unregisters ADS port from router (if it was registered) 
   * and disconnects target system and ADS router 
   * 
   * @param {boolean} [forceDisconnect] - If true, the connection is dropped immediately (default = false)  
   * 
   * @returns {Promise} Returns a promise (async function)
   * - If resolved, disconnect was successful 
   * - If rejected, connection is still closed but something went wrong during disconnecting and error info is returned
   */
  disconnect(forceDisconnect = false) {
    return _disconnect.call(this, forceDisconnect)
  }








  /**
   * Disconnects and reconnects again. Subscribes again to all active subscriptions.
   * To prevent subscribing, call unsubscribeAll() before reconnecting.
   * 
   * @param {boolean} [forceDisconnect] - If true, the connection is dropped immediately (default = false)  
   * 
   * @returns {Promise} Returns a promise (async function)
   * - If resolved, reconnecting was successful
   * - If rejected, reconnecting failed and error info is returned
   */
  reconnect(forceDisconnect = false) {
    debug(`reconnect(): Reconnecting...`)
    return _reconnect.call(this, forceDisconnect)
  }










  /**
     * Reads target device information and also saves it to the Client::metaData.deviceInfo object
     * 
     * @returns {Promise<object>} Returns a promise (async function)
     * - If resolved, device information is returned (object)
     * - If rejected, reading failed and error info is returned (object)
     */
  readDeviceInfo() {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'readDeviceInfo()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`readDeviceInfo(): Reading device info`)

      _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadDeviceInfo, Buffer.alloc(0), ADS.ADS_RESERVED_PORTS.SystemService)
        .then((res) => {
          debug(`readDeviceInfo(): Device info read successfully`)
          this.metaData.deviceInfo = res.ads.data
          resolve(this.metaData.deviceInfo)
        })
        .catch((res) => {
          debug(`readDeviceInfo(): Device info read failed`)

          reject(new ClientException(this, 'readDeviceInfo()', 'Reading device info failed', res))
        })
    })
  }



  /**
    * Reads target device system status (run/config/etc)
    * Uses ADS port 10000, which is system manager
    * 
    * @returns {Promise<object>} Returns a promise (async function)
    * - If resolved, system status is returned (object)
    * - If rejected, reading failed and error info is returned (object)
    */
  readSystemManagerState() {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'readSystemManagerState()', `Client is not connected. Use connect() to connect to the target first.`))

      debugD(`readSystemManagerState(): Reading device system manager state`)

      _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadState, Buffer.alloc(0), ADS.ADS_RESERVED_PORTS.SystemService)
        .then((res) => {
          debugD(`readSystemManagerState(): Device system state read successfully`)
          this.metaData.systemManagerState = res.ads.data

          resolve(this.metaData.systemManagerState)
        })
        .catch((res) => {
          debug(`readSystemManagerState(): Device system manager state read failed`)
          reject(new ClientException(this, 'readSystemManagerState()', 'Device system manager state read failed', res))
        })
    })
  }






  /**
    * Reads target device status and also saves it to the metaData.plcRuntimeStatus
    * 
    * @returns {Promise<object>} Returns a promise (async function)
    * - If resolved, device status is returned (object)
    * - If rejected, reading failed and error info is returned (object)
    */
  readPlcRuntimeState(adsPort = this.settings.targetAdsPort) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'readPlcRuntimeState()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`readPlcRuntimeState(): Reading PLC runtime (port ${adsPort}) state`)

      _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadState, Buffer.alloc(0), adsPort)
        .then((res) => {
          debug(`readPlcRuntimeState(): Device state read successfully for port ${adsPort}`)

          //Save to metaData but only if target ADS port
          if (adsPort === this.settings.targetAdsPort) {
            this.metaData.plcRuntimeState = res.ads.data
          }

          resolve(res.ads.data)
        })
        .catch((res) => {
          debug(`readPlcRuntimeState(): Reading PLC runtime (port ${adsPort}) state failed`)
          reject(new ClientException(this, 'readPlcRuntimeState()', `Reading PLC runtime (port ${adsPort}) state failed`, res))
        })
    })
  }





  /**
    * Reads target device PLC software symbol version and also saves it to the Client::metaData.symbolVersion
    * 
    * @returns {Promise<number>} Returns a promise (async function)
    * - If resolved, symbol version number is returned (number)
    * - If rejected, reading failed and error info is returned (object)
    */
  readSymbolVersion() {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'readSymbolVersion()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`readSymbolVersion(): Reading symbol version`)

      this.readRaw(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolVersion, 0, 1)
        .then((res) => {
          debug(`readSymbolVersion(): Symbol version read successfully`)

          this.metaData.symbolVersion = res.readUInt8(0)
          resolve(this.metaData.symbolVersion)
        })
        .catch((res) => {
          debug(`readSymbolVersion(): Symbol version read failed`)
          reject(new ClientException(this, 'readSymbolVersion()', `Reading PLC symbol version failed`, res))
        })
    })
  }








  /**
    * Reads target device PLC upload info and also saves it to the Client::metaData.uploadInfo
    * 
    * @returns {Promise<object>} Returns a promise (async function)
    * - If resolved, upload info is returned (object)
    * - If rejected, reading failed and error info is returned (object)
    */
  readUploadInfo() {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'readUploadInfo()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`readUploadInfo(): Reading upload info`)

      //Allocating bytes for request
      const data = Buffer.alloc(12)
      let pos = 0

      //0..3 IndexGroup
      data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolUploadInfo2, pos)
      pos += 4

      //4..7 IndexOffset
      data.writeUInt32LE(0, pos)
      pos += 4

      //8..11 Write data length
      data.writeUInt32LE(24, pos)
      pos += 4


      _sendAdsCommand.call(this, ADS.ADS_COMMAND.Read, data)
        .then((res) => {
          //Now the result has data parsed
          let result = {}, pos = 0

          let data = res.ads.data

          //0..3 Symbol count
          result.symbolCount = data.readUInt32LE(pos)
          pos += 4

          //4..7 Symbol length
          result.symbolLength = data.readUInt32LE(pos)
          pos += 4

          //8..11 Data type count
          result.dataTypeCount = data.readUInt32LE(pos)
          pos += 4

          //12..15 Data type length
          result.dataTypeLength = data.readUInt32LE(pos)
          pos += 4

          //16..19 Extra count
          result.extraCount = data.readUInt32LE(pos)
          pos += 4

          //20..23 Extra length
          result.extraLength = data.readUInt32LE(pos)
          pos += 4

          this.metaData.uploadInfo = result

          debug(`readUploadInfo(): Upload info read`)

          resolve(result)
        })
        .catch((res) => {
          reject(new ClientException(this, 'readUploadInfo()', `Reading PLC upload info failed`, res))
        })
    })
  }






  /**
    * Reads all symbols from target device and caches them to the metaData.symbols
    * 
    * **WARNING** Returned object is usually very large
    * 
    * @returns {Promise<object>} Returns a promise (async function)
    * - If resolved, symbols are returned (object)
    * - If rejected, reading failed and error info is returned (object)
    */
  readAndCacheSymbols() {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'readAndCacheSymbols()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`readAndCacheSymbols(): Starting to download symbols`)

      //First, download most recent upload info (=symbol count & byte length)
      try {
        debug(`readAndCacheSymbols(): Updating upload info`)

        await this.readUploadInfo()
      } catch (err) {
        if (this.metaData.uploadInfo === null) {
          debug(`readAndCacheSymbols(): Updating upload info failed, no old data available`)
          return reject(new ClientException(this, 'readAndCacheSymbols()', `Downloading symbols to cache failed (updating upload info failed)`, err))
        } else {
          debug(`readAndCacheSymbols(): Updating upload info failed, using old data`)
        }
      }

      //Allocating bytes for request
      const data = Buffer.alloc(12)
      let pos = 0

      //0..3 IndexGroup
      data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolUpload, pos)
      pos += 4

      //4..7 IndexOffset
      data.writeUInt32LE(0, pos)
      pos += 4

      //8..11 Write data length
      data.writeUInt32LE(this.metaData.uploadInfo.symbolLength, pos)
      pos += 4


      _sendAdsCommand.call(this, ADS.ADS_COMMAND.Read, data)
        .then((res) => {
          //Now the result has data parsed
          let data = res.ads.data
          let symbols = {}, symbolCount = 0

          //The data contains all symbol, each has an unknown size
          while (data.byteLength > 0) {
            let pos = 0

            //0..3 Symbol information bytelength
            const len = data.readUInt32LE(pos)
            pos += 4

            //Let the parser method handle the rest
            let symbol = _parseSymbolInfo.call(this, data.slice(pos, pos + len))
            symbols[symbol.name.trim().toLowerCase()] = symbol

            data = data.slice(len)
            symbolCount++
          }

          this.metaData.symbols = symbols
          this.metaData.allSymbolsCached = true

          debug(`readAndCacheSymbols(): All symbols cached (symbol count: ${symbolCount})`)

          resolve(symbols)
        })
        .catch((res) => {
          return reject(new ClientException(this, 'readAndCacheSymbols()', `Downloading symbols to cache failed`, res))
        })
    })
  }











  /**
   * Reads and caches all data types from target PLC runtime
   * 
    * **WARNING** Returned object is usually very large
    * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, data types are cached and returned (object)
   * - If rejected, reading failed and error info is returned (object)
   */
  readAndCacheDataTypes() {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'readAndCacheDataTypes()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`readAndCacheDataTypes(): Reading all data types`)

      //First, download most recent upload info (=symbol count & byte length)
      try {
        debugD(`readAndCacheDataTypes(): Updating upload info`)

        await this.readUploadInfo()
      } catch (err) {
        if (this.metaData.uploadInfo === null) {
          debug(`readAndCacheDataTypes(): Updating upload info failed, no old data available`)
          return reject(new ClientException(this, 'readAndCacheDataTypes()', `Downloading data types to cache failed (updating upload info failed)`, err))
        } else {
          debug(`readAndCacheDataTypes(): Updating upload info failed, using old data`)
        }
      }

      //Allocating bytes for request
      const data = Buffer.alloc(12)
      let pos = 0

      //0..3 IndexGroup
      data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolDataTypeUpload, pos)
      pos += 4

      //4..7 IndexOffset
      data.writeUInt32LE(0, pos)
      pos += 4

      //8..11 Write data length
      data.writeUInt32LE(this.metaData.uploadInfo.dataTypeLength, pos)
      pos += 4

      _sendAdsCommand.call(this, ADS.ADS_COMMAND.Read, data)
        .then(async (res) => {
          //Now the result has data parsed
          let data = res.ads.data
          let dataTypes = {}, dataTypeCount = 0

          //The data contains all datatypes, each has its own unique size
          while (data.byteLength > 0) {
            let pos = 0

            //0..3 Datatype information bytelength
            const len = data.readUInt32LE(pos)
            pos += 4

            //Let the parser method handle the rest
            let dataType = await _parseDataType.call(this, data.slice(pos, pos + len))
            dataTypes[dataType.name.trim().toLowerCase()] = dataType

            data = data.slice(len)
            dataTypeCount++
          }

          debug(`readAndCacheDataTypes(): All data types read, parsed and cached (data type count: ${dataTypeCount})`)

          this.metaData.dataTypes = dataTypes
          this.metaData.allDataTypesCached = true

          resolve(dataTypes)
        })

        .catch((res) => {
          reject(new ClientException(this, 'readAndCacheDataTypes()', `Downloading data types to cache failed`, res))
        })
    })
  }










  /**
   * Returns full datatype as object.
   * 
   * First searchs the local cache. If not found, reads it from PLC and caches it
   * 
   * @param {string} dataTypeName - Data type name in the PLC - Example: 'ST_SomeStruct', 'REAL',.. 
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, full data type info is returned (object)
   * - If rejected, reading or parsing failed and error info is returned (object)
   */
  getDataType(dataTypeName) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'getDataType()', `Client is not connected. Use connect() to connect to the target first.`))

      //Wrapper for _getDataTypeRecursive
      _getDataTypeRecursive.call(this, dataTypeName.trim())
        .then(res => resolve(res))
        .catch(err => reject(new ClientException(this, 'getDataType()', `Finding data type ${dataTypeName} failed`, err)))
    })
  }








  /**
   * Returns symbol information for given symbol.
   * 
   * First searchs the local cache. If not found, reads it from PLC and caches it
   * 
   * @param {string} variableName - Variable name in the PLC (full path) - Example: 'MAIN.SomeStruct.SomeValue' 
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, symbol info is returned (object)
   * - If rejected, reading failed and error info is returned (object)
   */
  getSymbolInfo(variableName) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'getSymbolInfo()', `Client is not connected. Use connect() to connect to the target first.`))

      const varName = variableName.trim().toLowerCase()

      debug(`getSymbolInfo(): Symbol info requested for ${variableName}`)

      //First, check already downloaded symbols
      if (this.metaData.symbols[varName]) {
        debugD(`getSymbolInfo(): Symbol info found from cache for ${variableName}`)

        return resolve(this.metaData.symbols[varName])
      } else {
        //Read from PLC and cache it
        _readSymbolInfo.call(this, variableName.trim())
          .then((symbol) => {
            this.metaData.symbols[varName] = symbol

            debugD(`getSymbolInfo(): Symbol info read and cached from PLC for ${variableName}`)
            return resolve(symbol)
          })
          .catch(err => reject(new ClientException(this, 'getSymbolInfo()', `Reading symbol info for ${variableName} failed`, err)))
      }
    })
  }

















  /**
   * Reads given PLC symbol value and parses it as Javascript object
   * 
   * @param {string} variableName Variable name in the PLC (full path) - Example: 'MAIN.SomeStruct.SomeValue' 
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, symbol value and data type are returned {value, type} (object)
   * - If rejected, reading or parsing failed and error info is returned (object)
   */
  readSymbol(variableName) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'readSymbol()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`readSymbol(): Reading symbol ${variableName}`)

      variableName = variableName.trim()

      //1. Get symbol from cache or from PLC
      let symbol = {}
      try {
        debugD(`readSymbol(): Reading symbol info for ${variableName}`)

        symbol = await this.getSymbolInfo(variableName)
      } catch (err) {
        return reject(new ClientException(this, 'readSymbol()', `Reading symbol ${variableName} failed: Reading symbol info failed`, err))
      }

      //2. Read the value
      let value = null
      try {
        debugD(`readSymbol(): Reading symbol value for ${variableName}`)

        value = await this.readRaw(symbol.indexGroup, symbol.indexOffset, symbol.size)
      } catch (err) {
        return reject(new ClientException(this, 'readSymbol()', `Reading symbol ${variableName} failed: Reading value failed`, err))
      }

      //3. Create the data type
      let dataType = {}
      try {
        debugD(`readSymbol(): Reading symbol data type for ${variableName}`)

        dataType = await _getDataTypeRecursive.call(this, symbol.type, true, symbol.size)
      } catch (err) {
        return reject(new ClientException(this, 'readSymbol()', `Reading symbol ${variableName} failed: Reading data type failed`, err))
      }
      
      //4. Parse the data to javascript object
      let data = {}
      try {
        debugD(`readSymbol(): Parsing symbol data for ${variableName}`)

        data = _parsePlcDataToObject.call(this, value, dataType)
      } catch (err) {
        return reject(new ClientException(this, 'readSymbol()', `Reading symbol ${variableName} failed: Parsing data type to Javascript failed`, err))
      }

      debug(`readSymbol(): Reading symbol for ${variableName} done`)

      resolve({
        value: data,
        type: dataType,
        symbol: symbol
      })
    })
  }











  /**
   * Writes given PLC symbol value
   * 
   * @param {string} variableName Variable name in the PLC - Example: 'MAIN.SomeStruct'
   * @param {object} value - Value to write
   * @param {boolean} autoFill - If true and variable type is STRUCT, given value can be just a part of it and the rest is kept the same. Otherwise they must match 1:1
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, write is successful and value and data type are returned {value, type} (object)
   * - If rejected, writing or parsing given data failed and error info is returned (object)
   */
  writeSymbol(variableName, value, autoFill = false) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'writeSymbol()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`writeSymbol(): Writing symbol ${variableName}`)

      variableName = variableName.trim()

      //1. Get symbol from cache or from PLC
      let symbol = {}
      try {
        debugD(`writeSymbol(): Reading symbol info for ${variableName}`)

        symbol = await this.getSymbolInfo(variableName)
      } catch (err) {
        return reject(new ClientException(this, 'writeSymbol()', `Writing symbol ${variableName} failed: Reading symbol info failed`, err))
      }

      //2. Create full data type recursively
      let dataType = {}
      try {
        debugD(`writeSymbol(): Reading symbol data type for ${variableName}`)

        dataType = await this.getDataType(symbol.type)
      } catch (err) {
        return reject(new ClientException(this, 'writeSymbol()', `Writing symbol ${variableName} failed: Reading data type failed`, err))
      }

      //3. Create data buffer packet (parse the value to a byte Buffer)
      let dataBuffer = null
      try {
        debugD(`writeSymbol(): Parsing data buffer from Javascript object`)

        dataBuffer = _parseJsObjectToBuffer.call(this, value, dataType)

      } catch (err) {
        //Parsing the Javascript object failed. If error is TypeError with specific message, it means that the object is missing a required field (not 1:1 match to PLC data type)
        if (err instanceof TypeError && err.isNotCompleteObject != null) {
          if (!autoFill) {
            debug(`writeSymbol(): Given Javascript object does not match the PLC variable - autoFill not given so quiting`)

            return reject(new ClientException(this, 'writeSymbol()', `Writing symbol ${variableName} failed: ${err.message} - Set writeSymbol() 3rd parameter (autoFill) to true to allow uncomplete objects`))
          }
          debug(`writeSymbol(): Given Javascript object does not match the PLC variable - autoFill given so continuing`)

          try {
            debugD(`writeSymbol(): Reading latest data for symbol (autoFill parameter given)`)
            let activeValue = await this.readSymbol(variableName)

            //Deep merge objects - Object.assign() won't work for objects that contain objects
            value = _deepMergeObjects(false, activeValue.value, value)

            debugD(`writeSymbol(): Parsing data buffer from Javascript object (after autoFill)`)
            dataBuffer = _parseJsObjectToBuffer.call(this, value, dataType)

          } catch (err) {
            //Still failing
            return reject(new ClientException(this, 'writeSymbol()', `Writing symbol ${variableName} failed: Parsing the Javascript object to PLC failed`, err))
          }

        } else {
          //Error is something else than TypeError -> quit
          return reject(err)
        }
      }

      //4. Write the data to the PLC
      try {
        debugD(`writeSymbol(): Witing symbol value for ${variableName}`)
        await this.writeRaw(symbol.indexGroup, symbol.indexOffset, dataBuffer)

      } catch (err) {
        return reject(new ClientException(this, 'writeSymbol()', `Writing symbol ${variableName} failed: Writing the data failed`, err))
      }

      debug(`writeSymbol(): Writing symbol ${variableName} done`)

      resolve({
        value: value,
        type: dataType,
        symbol: symbol
      })
    })
  }










  /**
   * @typedef subscriptionCallbackData
   * @property {object} value - Parsed data (if available) or Buffer
   * @property {Date} timeStamp - Date object that contains the PLC timestamp of the data
   * @property {object} type - Data type object (if available)
   */

  /**
   * @callback subscriptionCallback
   * @param {subscriptionCallbackData} data - Object containing {value, timeStamp, type] where value is the latest data from PLC
   * @param {object} sub - Subscription object - Information about subscription and for example, unsubscribe() method
   */

  /**
   * Subscribes to variable value change notifications
   * 
   * @param {string} variableName Variable name in the PLC (full path) - Example: 'MAIN.SomeStruct.SomeValue' 
   * @param {subscriptionCallback} callback - Callback function that is called when notification is received
   * @param {number} cycleTime - How often the PLC checks for value changes (milliseconds) - Default 10 ms
   * @param {boolean} onChange - If true (default), PLC sends the notification only when value has changed. If false, the value is sent every cycleTime milliseconds
   * @param {number} initialDelay - How long the PLC waits for sending the value - default 0 ms (immediately)
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, subscribing is successful and notification data is returned (object)
   * - If rejected, subscribing failed and error info is returned (object)
   */
  subscribe(variableName, callback, cycleTime = 10, onChange = true, initialDelay = 0) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'subscribe()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`subscribe(): Subscribing to ${variableName}`)

      _subscribe.call(
        this,
        variableName.trim(),
        callback,
        {
          transmissionMode: (onChange === true ? ADS.ADS_TRANS_MODE.OnChange : ADS.ADS_TRANS_MODE.Cyclic),
          cycleTime: cycleTime,
          maximumDelay: initialDelay
        }
      )
        .then(res => resolve(res))
        .catch(err => reject(new ClientException(this, 'subscribe()', `Subscribing to ${variableName} failed`, err)))
    })
  }








  /**
   * Subscribes to variable value change notifications by index group and index offset
   * 
   * @param {number} indexGroup - Variable index group in the PLC
   * @param {number} indexOffset - Variable index offset in the PLC
   * @param {number} size - Variable size in the PLC (enter 0xFFFFFFFF if not known)
   * @param {subscriptionCallback} callback - Callback function that is called when notification is received
   * @param {number} cycleTime - How often the PLC checks for value changes (milliseconds) - Default 10 ms
   * @param {boolean} onChange - If true (default), PLC sends the notification only when value has changed. If false, the value is sent every cycleTime milliseconds
   * @param {number} initialDelay - How long the PLC waits for sending the value - default 0 ms (immediately)
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, subscribing is successful and notification data is returned (object)
   * - If rejected, subscribing failed and error info is returned (object)
   */
  subscribeRaw(indexGroup, indexOffset, size, callback, cycleTime = 10, onChange = true, initialDelay = 0) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'subscribeRaw()', `Client is not connected. Use connect() to connect to the target first.`))

      const target = {
        indexGroup,
        indexOffset,
        size
      }

      debug(`subscribeRaw(): Subscribing to %o`, target)

      _subscribe.call(
        this,
        target,
        callback,
        {
          transmissionMode: (onChange === true ? ADS.ADS_TRANS_MODE.OnChange : ADS.ADS_TRANS_MODE.Cyclic),
          cycleTime: cycleTime,
          maximumDelay: initialDelay
        }
      )
        .then(res => resolve(res))
        .catch(err => reject(new ClientException(this, 'subscribeRaw()', `Subscribing to ${JSON.stringify(target)} failed`, err)))
    })
  }









  /**
   * Unsubscribes from the PLC variable value change notifications
   * 
   * @param {number} notificationHandle - Notification handle for the notification
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, subscribing is successful and notification data is returned (object)
   * - If rejected, subscribing failed and error info is returned (object)
   */
  unsubscribe(notificationHandle) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'unsubscribe()', `Client is not connected. Use connect() to connect to the target first.`))

      const sub = this._internals.activeSubscriptions[notificationHandle]

      if (!sub) {
        debug(`unsubscribe(): Unsubscribing failed - Unknown notification handle ${notificationHandle}`)
        return reject(new ClientException(this, 'unsubscribe()', `Unsubscribing from notification handle "${notificationHandle}" failed: Unknown handle`))
      }

      debug(`unsubscribe(): Unsubscribing from %o (notification handle: ${notificationHandle})`, sub.target)

      //Allocating bytes for request
      const data = Buffer.alloc(4)
      let pos = 0

      //0..3 Notification handle
      data.writeUInt32LE(notificationHandle, pos)

      _sendAdsCommand.call(this, ADS.ADS_COMMAND.DeleteNotification, data)
        .then((res) => {
          //Unsubscribing was successful, remove from active subs
          delete this._internals.activeSubscriptions[notificationHandle]

          debug(`unsubscribe(): Unsubscribed from notification with handle ${notificationHandle}`)
          resolve()
        })
        .catch((res) => {
          debug(`unsubscribe(): Unsubscribing from notification ${notificationHandle} failed`)
          if (this._internals.activeSubscriptions[notificationHandle] && this._internals.activeSubscriptions[notificationHandle].target !== undefined) {
            reject(new ClientException(this, 'unsubscribe()', `Unsubscribing from notification ${JSON.stringify(this._internals.activeSubscriptions[notificationHandle].target)} failed`, res))
          } else {
            reject(new ClientException(this, 'unsubscribe()', `Unsubscribing from notification with handle ${notificationHandle} failed`, res))
          }
        })
    })
  }









  /**
   * Unsubscribes from all active user-added subscriptions
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, subscribing from all was successful and number of unsubscribed notifications is returned (object)
   * - If rejected, subscribing failed for some of the notifications, number of successful, number of failed and error info are returned (object)
   */
  unsubscribeAll() {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'unsubscribeAll()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`unsubscribeAll(): Unsubscribing from all notifications`)

      let firstError = null, unSubCount = 0

      for (let sub in this._internals.activeSubscriptions) {
        try {
          //This method won't unsubscribe internal notification handles
          if (this._internals.activeSubscriptions[sub].internal === true) continue

          await this._internals.activeSubscriptions[sub].unsubscribe()
          unSubCount++

        } catch (err) {
          debug(`unsubscribeAll(): Unsubscribing from notification ${JSON.stringify(this._internals.activeSubscriptions[sub].target)} failed`)

          firstError = new ClientException(this, 'unsubscribeAll()', err)
        }
      }

      if (firstError != null) {
        debug(`unsubscribeAll(): Unsubscribed from ${unSubCount} notifications but unsubscribing from some notifications failed`)

        return reject(firstError)
      }

      //If we are here, everything went fine
      debug(`unsubscribeAll(): Unsubscribed from ${unSubCount} notifications`)
      resolve({
        unSubCount
      })
    })
  }





  /**
   * Reads (raw byte) data from PLC by given previously created variable handle
   * 
   * @param {object|number} handle Variable handle or object including {handle, size} to read from 
   * @param {number} [size] - Variable size in the PLC (bytes). **Keep as default if not known** - Default 0xFFFFFFFF
   * 
   * @returns {Promise<Buffer>} Returns a promise (async function)
   * - If resolved, reading was successful and data is returned (Buffer)
   * - If rejected, reading failed and error info is returned (object)
   */
  readRawByHandle(handle, size = 0xFFFFFFFF) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'readRawByHandle()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`readRawByHandle(): Reading data using handle "${handle}" ${(size !== 0xFFFFFFFF ? `and size of ${size} bytes` : ``)}`)

      if (handle == null) {
        return reject(new ClientException(this, 'readRawByHandle()', `Required parameter handle is not assigned`))
      } else if (typeof handle === 'object' && handle.handle) {
        handle = handle.handle
        if (handle.size) {
          size = handle.size
        }
      }

      this.readRaw(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolValueByHandle, handle, size)
        .then(res => resolve(res))
        .catch(err => reject(new ClientException(this, 'readRawByHandle()', `Reading data using handle "${handle}"`, err)))
    })
  }



  /**
   * Reads (raw byte) data from PLC by given variable name (uses *READ_SYMVAL_BYNAME* ADS command inside)
   * 
   * @param {string} variableName Variable name in the PLC (full path) - Example: 'MAIN.SomeStruct.SomeValue' 
   * 
   * @returns {Promise<Buffer>} Returns a promise (async function)
   * - If resolved, reading was successful and data is returned (Buffer)
   * - If rejected, reading failed and error info is returned (object)
   */
  readRawByName(variableName) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'readRawByName()', `Client is not connected. Use connect() to connect to the target first.`))

      if (variableName == null) {
        return reject(new ClientException(this, 'readRawByName()', `Required parameter variableName is not assigned`))
      }

      variableName = variableName.trim()

      debug(`readRawByName(): Reading data from ${variableName} using ADS command READ_SYMVAL_BYNAME)}`)

      //Allocating bytes for request
      const data = Buffer.alloc(16 + variableName.length + 1) //Note: String end delimeter
      let pos = 0

      //0..3 IndexGroup
      data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolValueByName, pos)
      pos += 4

      //4..7 IndexOffset
      data.writeUInt32LE(0, pos)
      pos += 4

      //8..11 Read data length
      data.writeUInt32LE(0xFFFFFFFF, pos) //0xFFFFFFFF = maximum size as we don't know it, seems to work well
      pos += 4

      //12..15 Write data length
      data.writeUInt32LE(variableName.length + 1, pos) //Note: String end delimeter
      pos += 4

      //16..n Data
      iconv.encode(variableName, 'cp1252').copy(data, pos)
      pos += variableName.length

      //String end mark
      data.writeUInt8(0, pos)
      pos += 1

      _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadWrite, data)
        .then((res) => {
          debug(`readRawByName(): Data read - ${res.ads.data.byteLength} bytes received for ${variableName}`)

          resolve(res.ads.data)
        })
        .catch((res) => {
          debug(`readRawByName(): Reading data from ${variableName} failed %o`, res)
          reject(new ClientException(this, 'readRawByName()', `Reading ${variableName} failed`, res))
        })
    })
  }






  /**
   * Reads (raw byte) data from PLC by given symbol info. Note: Returns Buffer
   * 
   * @param {object} symbol - Object (PLC symbol - read for example with getSymbolInfo() method) that contains at least {indexGroup, indexOffset, size}
   * 
   * @returns {Promise<Buffer>} Returns a promise (async function)
   * - If resolved, reading was successful and data is returned (Buffer)
   * - If rejected, reading failed and error info is returned (object)
   */
  readRawBySymbol(symbol) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'readRawBySymbol()', `Client is not connected. Use connect() to connect to the target first.`))

      if (symbol == null) {
        return reject(new ClientException(this, 'readRawBySymbol()', `Required parameter symbol is not assigned`))
      }

      this.readRaw(symbol.indexGroup, symbol.indexOffset, symbol.size)
        .then(res => resolve(res))
        .catch(err => reject(new ClientException(this, 'readRawBySymbol()', err)))
    })
  }







  /**
   * Reads (raw byte) data from PLC by given index group, index offset and size
   * 
   * All required parameters can be read for example with getSymbolInfo() method, **see also readRawBySymbol()**
   * 
   * @param {number} indexGroup - Variable index group in the PLC
   * @param {number} indexOffset - Variable index offset in the PLC
   * @param {number} size - Variable size in the PLC (bytes)
   * @param {number} [targetAdsPort] - Target ADS port (optional) - default is this.settings.targetAdsPort
   * 
   * @returns {Promise<Buffer>} Returns a promise (async function)
   * - If resolved, reading was successful and data is returned (Buffer)
   * - If rejected, reading failed and error info is returned (object)
   * 
  
   */
  readRaw(indexGroup, indexOffset, size, targetAdsPort = null) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'readRaw()', `Client is not connected. Use connect() to connect to the target first.`))

      if (indexGroup == null || indexOffset == null || size == null) {
        return reject(new ClientException(this, 'readRaw()', `Some of parameters (indexGroup, indexOffset, size) are not assigned`))
      }

      debug(`readRaw(): Reading data from ${JSON.stringify({ indexGroup, indexOffset, size })}`)

      //Allocating bytes for request
      const data = Buffer.alloc(12)
      let pos = 0

      //0..3 IndexGroup
      data.writeUInt32LE(indexGroup, pos)
      pos += 4

      //4..7 IndexOffset
      data.writeUInt32LE(indexOffset, pos)
      pos += 4

      //8..11 Read data length
      data.writeUInt32LE(size, pos)
      pos += 4

      _sendAdsCommand.call(this, ADS.ADS_COMMAND.Read, data, targetAdsPort)
        .then((res) => {
          debug(`readRaw(): Data read - ${res.ads.data.byteLength} bytes from ${JSON.stringify({ indexGroup, indexOffset })}`)

          resolve(res.ads.data)
        })
        .catch((res) => {
          debug(`readRaw(): Reading data from ${JSON.stringify({ indexGroup, indexOffset, size })} failed: %o`, res)
          reject(new ClientException(this, 'readRaw()', `Reading data failed`, res))
        })
    })
  }





  /**
   * @typedef IndexGroupAndOffset
   * 
   * @property {number} indexGroup - Index group in the PLC
   * @property {number} indexOffset - Index offset in the PLC
   * 
   */

  /**
   * @typedef MultiResult
   * 
   * @property {boolean} error - If true, command failed
   * @property {number} errorCode - If error, ADS error code
   * @property {string} errorStr - If error, ADS error as string
   * 
   */


  /**
   * @typedef ReadRawMultiParam
   * 
   * @property {number} indexGroup - Variable index group in the PLC
   * @property {number} indexOffset - Variable index offset in the PLC
   * @property {number} size - Variable size in the PLC (bytes)
   * 
   */

  /**
   * @typedef ReadRawMultiResult
   * 
   * @property {boolean} success - True if read was successful
   * @property {MultiErrorInfo} errorInfo - Error information (if any)
   * @property {IndexGroupAndOffset} target - Original target info
   * @property {Buffer} data - Read data as byte Buffer
   * 
   */



  /**
   * Reads multiple (raw byte) data from PLC by given index group, index offset and size
   * 
   * All required parameters can be read for example with getSymbolInfo() method, **see also readRawBySymbol()**
   * 
   * @param {ReadRawMultiParam[]} targetArray - Targets to read from
   * @param {number} [targetAdsPort] - Target ADS port (optional) - default is this.settings.targetAdsPort
   * 
   * @returns {Promise<Array.<ReadRawMultiResult>>} Returns a promise (async function)
   * - If resolved, reading was successful and data is returned (object)
   * - If rejected, reading failed and error info is returned (object)
   */
  readRawMulti(targetArray, targetAdsPort = null) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'readRawMulti()', `Client is not connected. Use connect() to connect to the target first.`))

      if (Array.isArray(targetArray) !== true) {
        return reject(new ClientException(this, 'readRawMulti()', `Given targetArray parameter is not an array`))
      }

      for (let i = 0; i < targetArray.length; i++) {
        if (targetArray[i].indexGroup == null || targetArray[i].indexOffset == null || targetArray[i].size == null) {
          return reject(new ClientException(this, 'readRawMulti()', `Given targetArray index ${i} is missing some of the required parameters (indexGroup, indexOffset, size)`))
        }
      }

      const totalSize = targetArray.reduce((total, target) => total + target.size, 0)

      debug(`readRawMulti(): Reading ${targetArray.length} values (total length ${totalSize} bytes)`)

      //Allocating bytes for request
      const data = Buffer.alloc(16 + targetArray.length * 12)
      let pos = 0

      //0..3 IndexGroup
      data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SumCommandRead, pos)
      pos += 4

      //4..7 IndexOffset - Number of read requests
      data.writeUInt32LE(targetArray.length, pos)
      pos += 4

      //8..11 Read data length
      data.writeUInt32LE(totalSize + 4 * targetArray.length, pos)
      pos += 4

      //12..15 Write data length
      data.writeUInt32LE(targetArray.length * 12, pos)
      pos += 4

      //16..n All read targets
      targetArray.forEach(target => {
        //0..3 IndexGroup
        data.writeUInt32LE(target.indexGroup, pos)
        pos += 4

        //4..7 IndexOffset
        data.writeUInt32LE(target.indexOffset, pos)
        pos += 4

        //8..11 Data size
        data.writeUInt32LE(target.size, pos)
        pos += 4
      })

      _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadWrite, data, targetAdsPort)
        .then(res => {
          debug(`readRawMulti(): Data read - ${res.ads.data.byteLength} bytes received`)

          let pos = 0, results = []

          //First we have ADS error codes for each target
          targetArray.forEach(target => {

            const errorCode = res.ads.data.readUInt32LE(pos)
            pos += 4

            const result = {
              success: errorCode === 0,
              errorInfo: {
                error: errorCode > 0,
                errorCode: errorCode,
                errorStr: ADS.ADS_ERROR[errorCode]
              },
              target: {
                indexGroup: target.indexGroup,
                indexOffset: target.indexOffset
              },
              data: null
            }

            if (target.name != null)
              result.target.name = target.name

            results.push(result)
          })

          //And now the data for each target
          for (let i = 0; i < targetArray.length; i++) {
            results[i].data = res.ads.data.slice(pos, pos + targetArray[i].size)
            pos += targetArray[i].size
          }

          resolve(results)
        })


        .catch(res => {
          debug(`readRawMulti(): Reading ${targetArray.length} values (total length ${totalSize} bytes) failed: %o`, res)
          reject(new ClientException(this, 'readRawMulti()', `Reading data failed`, res))
        })
    })
  }






  /**
   * Writes given byte Buffer to the target and reads result. Uses ADS command ReadWrite.
   * 
   * @param {number} indexGroup - Index group in the PLC
   * @param {number} indexOffset - Index offset in the PLC
   * @param {number} readLength - Read data length in the PLC (bytes)
   * @param {Buffer} dataBuffer - Data to write
   * @param {number} [targetAdsPort] - Target ADS port (optional) - default is this.settings.targetAdsPort
   *  
   * @returns {Promise<Buffer>} Returns a promise (async function)
   * - If resolved, writing and reading was successful and data is returned (Buffer)
   * - If rejected, command failed and error info is returned (object)
   * 
   */
  readWriteRaw(indexGroup, indexOffset, readLength, dataBuffer, targetAdsPort = null) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'readWriteRaw()', `Client is not connected. Use connect() to connect to the target first.`))

      if (indexGroup == null || indexOffset == null || readLength == null || dataBuffer == null) {
        return reject(new ClientException(this, 'writeRawByHandle()', `Some of parameters (indexGroup, indexOffset, readLength, dataBuffer) are not assigned`))
      }
      else if (!(dataBuffer instanceof Buffer)) {
        return reject(new ClientException(this, 'writeRawByHandle()', `Required parameter dataBuffer is not a Buffer type`))
      }
      debug(`readWriteRaw(): Writing ${dataBuffer.byteLength} bytes and reading ${readLength} bytes data to ${JSON.stringify({ indexGroup, indexOffset })}`)

      //Allocating bytes for request
      const data = Buffer.alloc(16 + dataBuffer.byteLength)
      let pos = 0

      //0..3 IndexGroup
      data.writeUInt32LE(indexGroup, pos)
      pos += 4

      //4..7 IndexOffset
      data.writeUInt32LE(indexOffset, pos)
      pos += 4

      //8..11 Read data length
      data.writeUInt32LE(readLength, pos)
      pos += 4

      //12..15 Write data length
      data.writeUInt32LE(dataBuffer.byteLength, pos)
      pos += 4

      //16..n Write data
      dataBuffer.copy(data, pos)


      _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadWrite, data, targetAdsPort)
        .then(res => {
          debug(`readWriteRaw(): Data written and ${res.ads.data.byteLength} bytes response received`)

          resolve(res.ads.data)
        })
        .catch((res) => {
          debug(`readWriteRaw(): Command failed: %o`, res)

          reject(new ClientException(this, 'readWriteRaw()', `Command failed`, res))
        })
    })
  }




  /**
   * Writes (raw byte) data to PLC by previously created variable handle
   * 
   * @param {number} handle Variable handle to write to (created previously using createVariableHandle())
   * @param {Buffer} dataBuffer - Buffer object that contains the data (and byteLength is acceptable)
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, writing was successful
   * - If rejected, writing failed and error info is returned (object)
   */
  writeRawByHandle(handle, dataBuffer) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'writeRawByHandle()', `Client is not connected. Use connect() to connect to the target first.`))

      if (handle == null || dataBuffer == null) {
        return reject(new ClientException(this, 'writeRawByHandle()', `Some of required parameters (handle, dataBuffer) are not assigned`))

      } else if (!(dataBuffer instanceof Buffer)) {
        return reject(new ClientException(this, 'writeRawByHandle()', `Required parameter dataBuffer is not a Buffer type`))

      } else if (typeof handle === 'object' && handle.handle) {
        handle = handle.handle
      }

      debug(`writeRawByHandle(): Writing ${dataBuffer.byteLength} bytes of data using handle "${handle}"`)

      return this.writeRaw(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolValueByHandle, handle, dataBuffer)
        .then(res => resolve(res))
        .catch(err => reject(new ClientException(this, 'writeRawByHandle()', err)))
    })
  }


  /**
   * Writes (raw byte) data to PLC by given symbol info
   * 
   * @param {object} symbol - Object (PLC symbol - read for example with getSymbolInfo() method) that contains at least {indexGroup, indexOffset}
   * @param {Buffer} dataBuffer - Buffer object that contains the data (and byteLength is acceptable)
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, writing was successful
   * - If rejected, writing failed and error info is returned (object)
   */
  writeRawBySymbol(symbol, dataBuffer) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'writeRawBySymbol()', `Client is not connected. Use connect() to connect to the target first.`))

      if (symbol == null || dataBuffer == null) {
        return reject(new ClientException(this, 'writeRawBySymbol()', `Some of required parameters (symbol, dataBuffer) are not assigned`))

      } else if (!(dataBuffer instanceof Buffer)) {
        return reject(new ClientException(this, 'writeRawBySymbol()', `Required parameter dataBuffer is not a Buffer type`))
      }

      this.writeRaw(symbol.indexGroup, symbol.indexOffset, dataBuffer)
        .then(res => resolve(res))
        .catch(err => reject(new ClientException(this, 'writeRawBySymbol()', err)))
    })
  }







  /**
   * Writes (raw byte) data to PLC with given index group and index offset
   * 
   * @param {number} indexGroup - Variable index group in the PLC
   * @param {number} indexOffset - Variable index offset in the PLC
   * @param {Buffer} dataBuffer - Buffer object that contains the data (and byteLength is acceptable)
   * @param {number} [targetAdsPort] - Target ADS port (optional) - default is this.settings.targetAdsPort
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, writing was successful
   * - If rejected, writing failed and error info is returned (object)
   */
  writeRaw(indexGroup, indexOffset, dataBuffer, targetAdsPort = null) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'writeRaw()', `Client is not connected. Use connect() to connect to the target first.`))

      if (indexGroup == null || indexOffset == null || dataBuffer == null) {
        return reject(new ClientException(this, 'writeRaw()', `Some of parameters (indexGroup, indexOffset, dataBuffer) are not assigned`))

      } else if (!(dataBuffer instanceof Buffer)) {
        return reject(new ClientException(this, 'writeRaw()', `Required parameter dataBuffer is not a Buffer type`))
      }

      debug(`writeRaw(): Writing ${dataBuffer.byteLength} bytes of data to ${JSON.stringify({ indexGroup, indexOffset })}`)

      //Allocating bytes for request
      const data = Buffer.alloc(12 + dataBuffer.byteLength)
      let pos = 0

      //0..3 IndexGroup
      data.writeUInt32LE(indexGroup, pos)
      pos += 4

      //4..7 IndexOffset
      data.writeUInt32LE(indexOffset, pos)
      pos += 4

      //8..11 Write data length
      data.writeUInt32LE(dataBuffer.byteLength, pos)
      pos += 4

      //12..n Data
      dataBuffer.copy(data, pos)


      _sendAdsCommand.call(this, ADS.ADS_COMMAND.Write, data, targetAdsPort)
        .then((res) => {
          debug(`writeRaw(): Data written: ${dataBuffer.byteLength} bytes of data to ${JSON.stringify({ indexGroup, indexOffset })}`)

          resolve()
        })
        .catch((res) => {
          debug(`writeRaw(): Writing ${dataBuffer.byteLength} bytes of data to ${JSON.stringify({ indexGroup, indexOffset })} failed %o`, res)
          reject(new ClientException(this, 'writeRaw()', `Writing data failed`, res))
        })
    })
  }





  /**
   * @typedef WriteRawMultiParam
   * 
   * @property {number} indexGroup - Variable index group in the PLC
   * @property {number} indexOffset - Variable index offset in the PLC
   * @property {Buffer} data - Buffer object that contains the data (and byteLength is acceptable)
   * 
   */
  /**
   * @typedef WriteRawMultiResult
   * 
   * @property {boolean} success - True if write was successful
   * @property {MultiErrorInfo} errorInfo - Error information (if any)
   * @property {IndexGroupAndOffset} target - Original target info
   * 
   */



  /**
   * Writes multiple (raw byte) data to PLC by given index group and index offset
   * 
   * All required parameters can be read for example with getSymbolInfo() method, **see also readRawBySymbol()**
   * 
   * @param {WriteRawMultiParam[]} targetArray - Targets to write to
   * @param {number} [targetAdsPort] - Target ADS port (optional) - default is this.settings.targetAdsPort
   * 
   * @returns {Promise<Array.<WriteRawMultiResult>>} Returns a promise (async function)
   * - If resolved, writing was successful and data is returned (Buffer)
   * - If rejected, reading failed and error info is returned (object)
   */
  writeRawMulti(targetArray, targetAdsPort = null) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'writeRawMulti()', `Client is not connected. Use connect() to connect to the target first.`))

      if (Array.isArray(targetArray) !== true) {
        return reject(new ClientException(this, 'writeRawMulti()', `Given targetArray parameter is not an array`))
      }

      for (let i = 0; i < targetArray.length; i++) {
        if (targetArray[i].indexGroup == null || targetArray[i].indexOffset == null || targetArray[i].data == null) {
          return reject(new ClientException(this, 'writeRawMulti()', `Given targetArray index ${i} is missing some of the required parameters (indexGroup, indexOffset, data)`))
        }
      }

      const totalSize = targetArray.reduce((total, target) => total + target.data.byteLength, 0)

      debug(`writeRawMulti(): Writing ${targetArray.length} values (total length ${totalSize} bytes)`)

      //Allocating bytes for request
      const data = Buffer.alloc(16 + targetArray.length * 12 + totalSize)
      let pos = 0

      //0..3 IndexGroup
      data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SumCommandWrite, pos)
      pos += 4

      //4..7 IndexOffset - Number of write requests
      data.writeUInt32LE(targetArray.length, pos)
      pos += 4

      //8..11 Read data length
      data.writeUInt32LE(4 * targetArray.length, pos)
      pos += 4

      //12..15 Write data length
      data.writeUInt32LE(targetArray.length * 12 + totalSize, pos)
      pos += 4

      //16..n All write targets
      targetArray.forEach(target => {
        //0..3 IndexGroup
        data.writeUInt32LE(target.indexGroup, pos)
        pos += 4

        //4..7 IndexOffset
        data.writeUInt32LE(target.indexOffset, pos)
        pos += 4

        //8..11 Data size
        data.writeUInt32LE(target.data.byteLength, pos)
        pos += 4
      })

      //Then the actual data for each one
      targetArray.forEach(target => {
        target.data.copy(data, pos)
        pos += target.data.byteLength
      })

      _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadWrite, data, targetAdsPort)
        .then(res => {
          debug(`writeRawMulti(): Data written - ${res.ads.data.byteLength} bytes received`)

          let pos = 0, results = []

          //Result has ADS error codes for each target
          targetArray.forEach(target => {

            const errorCode = res.ads.data.readUInt32LE(pos)
            pos += 4

            const result = {
              success: errorCode === 0,
              errorInfo: {
                error: errorCode > 0,
                errorCode: errorCode,
                errorStr: ADS.ADS_ERROR[errorCode]
              },
              target: {
                indexGroup: target.indexGroup,
                indexOffset: target.indexOffset
              }
            }

            results.push(result)
          })

          resolve(results)
        })


        .catch(res => {
          debug(`writeRawMulti(): Writing ${targetArray.length} values (total length ${totalSize} bytes) failed: %o`, res)
          reject(new ClientException(this, 'writeRawMulti()', `Writing data failed`, res))
        })
    })
  }








  /**
   * @typedef CreateVariableHandleResult
   * 
   * @property {number} handle - Received variable handle
   * @property {number} size - Received target variable size
   * @property {string} type - Received target variable type
   * 
   */

  /**
   * Creates an ADS variable handle to given PLC variable. 
   * 
   * Using the handle, read and write operations are possible to that variable with readRawByHandle() and writeRawByHandle()
   * 
   * @param {string} variableName Variable name in the PLC (full path) - Example: 'MAIN.SomeStruct.SomeValue' 
   * 
   * @returns {Promise<CreateVariableHandleResult>} Returns a promise (async function)
   * - If resolved, creating handle was successful and handle, size and data type are returned (object)
   * - If rejected, creating failed and error info is returned (object)
   */
  createVariableHandle(variableName) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'createVariableHandle()', `Client is not connected. Use connect() to connect to the target first.`))

      if (variableName == null) {
        return reject(new ClientException(this, 'createVariableHandle()', `Parameter variableName is not assigned`))
      }

      variableName = variableName.trim()

      debug(`createVariableHandle(): Creating variable handle to ${variableName}`)

      //Allocating bytes for request
      const data = Buffer.alloc(16 + variableName.length + 1) //Note: String end delimeter
      let pos = 0

      //0..3 IndexGroup
      data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolHandleByName, pos)
      pos += 4

      //4..7 IndexOffset
      data.writeUInt32LE(0, pos)
      pos += 4

      //8..11 Read data length
      //data.writeUInt32LE(ADS.ADS_INDEX_OFFSET_LENGTH, pos)
      data.writeUInt32LE(0xFFFFFFFF, pos)
      pos += 4

      //12..15 Write data length
      data.writeUInt32LE(variableName.length + 1, pos) //Note: String end delimeter
      pos += 4

      //16..n Data
      iconv.encode(variableName, 'cp1252').copy(data, pos)
      pos += variableName.length

      //String end mark
      data.writeUInt8(0, pos)
      pos += 1

      _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadWrite, data)
        .then((res) => {
          let result = {}, pos = 0, data = res.ads.data

          //0..3 Variable handle
          result.handle = data.readUInt32LE(pos)
          pos += 4

          //4..7 Size
          result.size = data.readUInt32LE(pos)
          pos += 4

          //8..11 "type decoration"
          //result.decoration = data.readUInt32LE(pos)
          pos += 4

          //8..9 Data type name length
          let dataTypeNameLength = data.readUInt16LE(pos)
          pos += 2

          //10..n Data type name
          result.type = _trimPlcString(iconv.decode(data.slice(pos, pos + dataTypeNameLength + 1), 'cp1252'))

          debug(`createVariableHandle(): Handle created and size+type obtained for ${variableName}: %o`, result)

          resolve(result)
        })
        .catch((res) => {
          debug(`createVariableHandle(): Creating handle to ${variableName} failed: %o`, res)
          reject(new ClientException(this, 'createVariableHandle()', `Creating handle to ${variableName} failed`, res))
        })
    })
  }




  /**
   * @typedef CreateVariableHandleMultiResult
   * 
   * @property {boolean} success - True if creating handle was successful
   * @property {MultiErrorInfo} errorInfo - Error information (if any)
   * @property {string} target - Target variable name
   * @property {number} handle - Returned variable handle (if successful)
   * 
   */


  /**
   * Creates ADS variable handles to given PLC variables. 
   * 
   * Using the handle, read and write operations are possible to that variable with readRawByHandle() and writeRawByHandle()
   * 
   * **NOTE:** Returns only handle, not data type and size like createVariableHandle()
   * 
   * @param {Array<string>} targetArray Variable names as array in the PLC (full path) - Example: ['MAIN.value1', 'MAIN.value2'] 
   * 
   * @returns {Promise<Array.<CreateVariableHandleMultiResult>>} Returns a promise (async function)
   * - If resolved, command was successful and results for each handle request are returned(object)
   * - If rejected, command failed and error info is returned (object)
   */
  createVariableHandleMulti(targetArray) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'createVariableHandleMulti()', `Client is not connected. Use connect() to connect to the target first.`))

      if (Array.isArray(targetArray) !== true) {
        return reject(new ClientException(this, 'createVariableHandleMulti()', `Given targetArray parameter is not an array`))
      }

      const totalVariableNamesLength = targetArray.reduce((total, target) => total + target.length + 1, 0)

      debug(`createVariableHandleMulti(): Creating ${targetArray.length} variable handles`)

      //Allocating bytes for request
      const data = Buffer.alloc(16 + targetArray.length * 16 + totalVariableNamesLength)
      let pos = 0

      //0..3 IndexGroup
      data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SumCommandReadWrite, pos)
      pos += 4

      //4..7 IndexOffset - Number of read requests
      data.writeUInt32LE(targetArray.length, pos)
      pos += 4

      //8..11 Read data length
      data.writeUInt32LE(12 * targetArray.length, pos)
      pos += 4

      //12..15 Write data length
      data.writeUInt32LE(targetArray.length * 16 + totalVariableNamesLength, pos)
      pos += 4

      //16..n All read targets
      targetArray.forEach(target => {
        //0..3 IndexGroup
        data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolHandleByName, pos)
        pos += 4

        //4..7 IndexOffset
        data.writeUInt32LE(0, pos)
        pos += 4

        //8..11 Read data length
        data.writeUInt32LE(ADS.ADS_INDEX_OFFSET_LENGTH, pos)
        pos += 4

        //12..15 Write data length
        data.writeUInt32LE(target.length + 1, pos) //Note: String end delimeter
        pos += 4
      })

      //All write data
      targetArray.forEach(target => {
        //16..n Data
        iconv.encode(target, 'cp1252').copy(data, pos)
        pos += target.length + 1 //Note: string end delimeter
      })

      _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadWrite, data)
        .then(res => {
          debug(`createVariableHandleMulti(): Command done - ${res.ads.data.byteLength} bytes received`)

          let pos = 0, results = []

          //First we have ADS error codes and data length for each target
          targetArray.forEach(target => {

            //Error code
            const errorCode = res.ads.data.readUInt32LE(pos)
            pos += 4

            //Data length
            const size = res.ads.data.readUInt32LE(pos)
            pos += 4

            const result = {
              success: errorCode === 0,
              errorInfo: {
                error: errorCode > 0,
                errorCode: errorCode,
                errorStr: ADS.ADS_ERROR[errorCode]
              },
              target: target,
              handle: null,
              size: size
            }

            results.push(result)
          })

          //And now the handle for each target
          for (let i = 0; i < targetArray.length; i++) {
            if (results[i].size === 4) {
              results[i].handle = res.ads.data.readUInt32LE(pos)
              pos += 4
            } else {
              //It's not a handle, do nothing (error code should be available)
              pos += results[i].size
            }

            //We can delete the return data size, not relevant to the end user
            delete results[i].size
          }

          resolve(results)
        })
        .catch(res => {
          debug(`createVariableHandleMulti(): Creating ${targetArray.length} variable handles failed: %o`, res)
          reject(new ClientException(this, 'createVariableHandleMulti()', `Creating variable handles failed`, res))
        })
    })
  }






  /**
   * Deletes the given previously created ADS variable handle
   * 
   * @param {number} handle Variable handle to delete (created previously using createVariableHandle())
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, deleting handle was successful
   * - If rejected, deleting failed and error info is returned (object)
   */
  deleteVariableHandle(handle) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'deleteVariableHandle()', `Client is not connected. Use connect() to connect to the target first.`))

      if (handle == null) {
        return reject(new ClientException(this, 'deleteVariableHandle()', `Parameter handle is not assigned`))

      } else if (typeof handle === 'object' && handle.handle) {
        handle = handle.handle

      } else if (typeof handle !== 'number') {
        return reject(new ClientException(this, 'deleteVariableHandle()', `Parameter handle is not correct type`))
      }

      debug(`deleteVariableHandle(): Deleting variable handle ${handle}`)

      //Allocating bytes for request
      const data = Buffer.alloc(16)
      let pos = 0

      //0..3 IndexGroup
      data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolReleaseHandle, pos)
      pos += 4

      //4..7 IndexOffset
      data.writeUInt32LE(0, pos)
      pos += 4

      //8..11 Write data length
      data.writeUInt32LE(ADS.ADS_INDEX_OFFSET_LENGTH, pos)
      pos += 4

      //12..15 The handle to delete
      data.writeUInt32LE(handle, pos)
      pos += 4


      _sendAdsCommand.call(this, ADS.ADS_COMMAND.Write, data)
        .then((res) => {
          debug(`deleteVariableHandle(): Variable handle ${handle} deleted`)

          resolve()
        })
        .catch((err) => {
          debug(`deleteVariableHandle(): Deleting handle "${handle}" failed:  %o`, err)
          reject(new ClientException(this, 'createVariableHandle()', `Deleting variable handle failed`, err))
        })
    })
  }







  /**
   * @typedef DeleteVariableHandleMultiResult
   * 
   * @property {boolean} success - True if deleting handle was successful
   * @property {MultiErrorInfo} errorInfo - Error information (if any)
   * @property {number} handle - The variable handle that was tried to be deleted
   * 
   */

  /**
   * Deletes the given previously created ADS variable handles
   * 
   * @param {Array<string>} handleArray Variable handles to be deleted as array (can also be array of objects that contain 'handle' key)
   * 
   * @returns {Promise<Array.<DeleteVariableHandleMultiResult>>} Returns a promise (async function)
   * - If resolved, command was successful and results for each request are returned(object)
   * - If rejected, command failed and error info is returned (object)
   */
  deleteVariableHandleMulti(handleArray) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'deleteVariableHandleMulti()', `Client is not connected. Use connect() to connect to the target first.`))

      if (Array.isArray(handleArray) !== true) {
        return reject(new ClientException(this, 'deleteVariableHandleMulti()', `Given handleArray parameter is not an array`))
      }

      debug(`deleteVariableHandleMulti(): Deleting ${handleArray.length} variable handles`)

      //Allocating bytes for request
      const data = Buffer.alloc(16 + handleArray.length * 16)
      let pos = 0

      //0..3 IndexGroup
      data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SumCommandWrite, pos)
      pos += 4

      //4..7 IndexOffset - Number of requests
      data.writeUInt32LE(handleArray.length, pos)
      pos += 4

      //8..11 Read data length
      data.writeUInt32LE(4 * handleArray.length, pos)
      pos += 4

      //12..15 Write data length
      data.writeUInt32LE(16 * handleArray.length, pos)
      pos += 4

      //16..n Commands for each handle
      handleArray.forEach(handle => {
        //0..3 IndexGroup
        data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolReleaseHandle, pos)
        pos += 4

        //4..7 IndexOffset
        data.writeUInt32LE(0, pos)
        pos += 4

        //8..11 Write data length
        data.writeUInt32LE(ADS.ADS_INDEX_OFFSET_LENGTH, pos)
        pos += 4
      })

      //Each handle
      handleArray.forEach(handle => {
        if (typeof handle === 'object' && handle.handle) {
          data.writeUInt32LE(handle.handle, pos)
        } else {
          data.writeUInt32LE(handle, pos)
        }
        pos += 4
      })

      _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadWrite, data)
        .then(res => {
          debug(`deleteVariableHandleMulti(): Command done - ${res.ads.data.byteLength} bytes received`)

          let pos = 0, results = []

          //Result has ADS error codes for each target
          handleArray.forEach(handle => {

            //Error code
            const errorCode = res.ads.data.readUInt32LE(pos)
            pos += 4

            const result = {
              success: errorCode === 0,
              errorInfo: {
                error: errorCode > 0,
                errorCode: errorCode,
                errorStr: ADS.ADS_ERROR[errorCode]
              },
              handle: ((typeof handle === 'object' && handle.handle) ? handle.handle : handle)
            }

            results.push(result)
          })

          resolve(results)
        })
        .catch(res => {
          debug(`deleteVariableHandleMulti(): Deleting ${handleArray.length} variable handles failed: %o`, res)
          reject(new ClientException(this, 'deleteVariableHandleMulti()', `Deleting variable handles failed`, res))
        })
    })
  }







  /**
   * Converts given raw data (byte Buffer) to Javascript object by given dataTypeName
   * 
   * 
   * @param {Buffer} rawData - A Buffer containing valid data for given data type
   * @param {string} dataTypeName - Data type name in the PLC - Example: 'ST_SomeStruct', 'REAL',.. 
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, Javascript object / variable is returned
   * - If rejected, parsing failed and error info is returned (object)
   */
  convertFromRaw(rawData, dataTypeName) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'convertFromRaw()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`convertFromRaw(): Converting ${rawData.byteLength} bytes of data to ${dataTypeName}`)

      //1. Get data type
      let dataType = {}
      try {
        debugD(`convertFromRaw(): Reading data type info for ${dataTypeName}`)

        dataType = await this.getDataType(dataTypeName)
      } catch (err) {
        return reject(new ClientException(this, 'convertFromRaw()', `Reading data type info for "${dataTypeName} failed" - Is the data type correct?`, err))
      }

      //Make sure lengths are the same
      if (dataType.arrayData.length === 0 && dataType.size != rawData.byteLength) {
        //Not an array (plain data type)
        return reject(new ClientException(this, 'convertFromRaw()', `Given data buffer and data type sizes mismatch: Buffer is ${rawData.byteLength} bytes and data type is ${dataType.size} bytes`))

      } else if (dataType.arrayData.length > 0) {
        //Data type is array, calculate array size and compare to given Buffer
        const totalLength = dataType.arrayData.reduce((total, dimension) => total + dimension.length * dataType.size, 0)

        if (totalLength != rawData.byteLength) {
          return reject(new ClientException(this, 'convertFromRaw()', `Given data buffer and data type sizes mismatch: Buffer is ${rawData.byteLength} bytes and data type is ${totalLength} bytes`))
        }
      }

      //2. Parse the data to javascript object
      let data = {}
      try {
        debugD(`convertFromRaw(): Parsing ${rawData.byteLength} bytes of data`)

        data = _parsePlcDataToObject.call(this, rawData, dataType)

        resolve(data)
      } catch (err) {
        return reject(new ClientException(this, 'convertFromRaw()', `Converting given data to Javascript type failed`, err))
      }
    })
  }


  /**
   * Converts given Javascript object/variable to raw Buffer data by given dataTypeName
   * 
   * 
   * @param {object} value - Javacript object or variable that represents dataTypeName
   * @param {string} dataTypeName - Data type name in the PLC - Example: 'ST_SomeStruct', 'REAL',.. 
   * @param {boolean} autoFill - If true and variable type is STRUCT, given value can be just a part of it and the rest is **SET TO ZEROS**. 
   * Otherwise they must match 1:1. Note: can also be 'internal' in internal use (no additional error message data)
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, Javascript object / variable is returned
   * - If rejected, parsing failed and error info is returned (object)
   */
  convertToRaw(value, dataTypeName, autoFill = false) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'convertToRaw()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`convertToRaw(): Converting given object to ${dataTypeName}`)

      //1. Get data type
      let dataType = {}
      try {
        debugD(`convertToRaw(): Reading data type info for ${dataTypeName}`)

        dataType = await this.getDataType(dataTypeName)
      } catch (err) {
        return reject(new ClientException(this, 'convertToRaw()', `Reading data type info for "${dataTypeName} failed" - Is the data type correct?`, err))
      }

      //2. Create data buffer packet (parse the value to a byte Buffer)
      let dataBuffer = null
      try {
        debugD(`convertToRaw(): Parsing data buffer from Javascript object`)

        dataBuffer = _parseJsObjectToBuffer.call(this, value, dataType)

        resolve(dataBuffer)
      } catch (err) {
        //Parsing the Javascript object failed. If error is TypeError with specific message, it means that the object is missing a required field (not 1:1 match to PLC data type)
        if (err instanceof TypeError && err.isNotCompleteObject != null) {
          if (autoFill !== true) {
            debug(`convertToRaw(): Given Javascript object does not match the PLC variable - autoFill not given so quiting`)

            if (autoFill === 'internal') {
              return reject(new ClientException(this, 'convertToRaw()', err.message))
            } else {
              return reject(new ClientException(this, 'convertToRaw()', `Converting Javascript object to byte Buffer failed: ${err.message} - Set 3rd parameter (autoFill) to true to allow uncomplete objects`))
            }
          }
          debug(`convertToRaw(): Given Javascript object does not match the PLC variable - autoFill given so continuing`)

          try {
            debugD(`convertToRaw(): Creating empty object (autoFill parameter given)`)
            let emptyObject = await this.getEmptyPlcType(dataTypeName)

            //Deep merge objects - Object.assign() won't work for objects that contain objects
            value = _deepMergeObjects(false, emptyObject, value)

            debugD(`convertToRaw(): Parsing data buffer from Javascript object (after autoFill)`)
            dataBuffer = _parseJsObjectToBuffer.call(this, value, dataType)

            resolve(dataBuffer)

          } catch (err) {
            //Still failing
            return reject(new ClientException(this, 'convertToRaw()', `Converting Javascript object to byte Buffer failed: Parsing the Javascript object to PLC failed`, err))
          }

        } else {
          //Error is something else than TypeError -> quit
          return reject(err)
        }
      }
    })
  }


  /**
   * Returns empty Javascript object that represents given dataTypeName
   * 
   * 
   * @param {string} dataTypeName - Data type name in the PLC - Example: 'ST_SomeStruct', 'REAL',.. 
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, Javascript object / variable is returned
   * - If rejected, parsing failed and error info is returned (object)
   */
  getEmptyPlcType(dataTypeName) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'getEmptyPlcType()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`getEmptyPlcType(): Converting given object to ${dataTypeName}`)

      //1. Get data type
      let dataType = {}
      try {
        debugD(`getEmptyPlcType(): Reading data type info for ${dataTypeName}`)

        dataType = await this.getDataType(dataTypeName)
      } catch (err) {
        return reject(new ClientException(this, 'getEmptyPlcType()', `Reading data type info for "${dataTypeName} failed" - Is the data type correct?`, err))
      }

      const rawData = Buffer.alloc(dataType.size)

      //2. Parse the data to javascript object
      let data = {}
      try {
        debugD(`convertFromRaw(): Parsing ${rawData.byteLength} bytes of data`)

        data = _parsePlcDataToObject.call(this, rawData, dataType)

        resolve(data)
      } catch (err) {
        return reject(new ClientException(this, 'convertFromRaw()', `Converting given data to Javascript type failed`, err))
      }

    })
  }





  /**
   * Sends a WriteControl ADS command to the given ADS port. 
   * WriteControl can be used to start/stop PLC, set TwinCAT system to run/config and so on
   * 
   * **NOTE: Commands will fail if already in requested state**
   * 
   * @param {number} adsPort - Target ADS port (TC3 runtime 1: 851, system manager: 10000 and so on)
   * @param {number} adsState - ADS state to be set (see ADS.ADS_STATE for different values)
   * @param {number} [deviceState] - device state to be set (usually 0) - Default: 0
   * @param {Buffer} [data] - Additional data to be send (Buffer object - usually empty) - Default: none
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, command was successful
   * - If rejected, command failed error info is returned (object)
   */
  writeControl(adsPort, adsState, deviceState = 0, data = Buffer.alloc(0)) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'writeControl()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`writeControl(): Sending writeControl command to port ${adsPort} - adsState: ${adsState}, deviceState: ${deviceState} and ${data.byteLength} bytes data`)

      //Allocating bytes for request
      const dataBuffer = Buffer.alloc(8 + data.byteLength)
      let pos = 0

      //0..1 ADS state
      dataBuffer.writeUInt16LE(adsState, pos)
      pos += 2

      //2..3 Device state
      dataBuffer.writeUInt16LE(deviceState, pos)
      pos += 2

      //4..7 Data length
      dataBuffer.writeUInt32LE(data.byteLength, pos)
      pos += 4

      //7..n Data
      data.copy(dataBuffer, pos)

      //Sending the command to given port
      _sendAdsCommand.call(this, ADS.ADS_COMMAND.WriteControl, dataBuffer, adsPort)
        .then(res => {
          debug(`writeControl(): Sending command to port ${adsPort} was successful`)

          resolve()
        })
        .catch(err => {
          debug(`writeControl(): Sending writeControl command failed (port: ${adsPort}, adsState: ${adsState}, deviceState: ${deviceState}, ${data.byteLength} bytes data): %o`, err)
          reject(new ClientException(this, 'writeControl()', `Failed to send command. Is the target system already in given state?`, err))
        })

    })
  }







  /**
   * Starts the PLC runtime from settings.targetAdsPort or given ads port
   * 
   * **WARNING:** Make sure the system is ready to start
   * 
   * @param {number} adsPort - Target ADS port, for example 851 for TwinCAT 3 PLC runtime 1 (default: this.settings.targetAdsPort)
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, command was successful
   * - If rejected, command failed error info is returned (object)
   */
  startPlc(adsPort = this.settings.targetAdsPort) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'startPlc()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`startPlc(): Starting PLC at ADS port ${adsPort}`)

      try {
        //Read deviceState (we don't want to change it, as we have no idea what it does)
        const state = await this.readPlcRuntimeState(adsPort)

        await this.writeControl(adsPort, ADS.ADS_STATE.Run, state.deviceState)

        debugD(`startPlc(): PLC started at ADS port ${adsPort}`)
        resolve()
      } catch (err) {
        debug(`startPlc(): Starting PLC at ADS port ${adsPort} failed: %o`, err)
        reject(err)
      }
    })
  }







  /**
   * Stops the PLC runtime from settings.targetAdsPort or given ads port
   * 
   * **WARNING:** Make sure the system is ready to stop
   * 
   * @param {number} adsPort - Target ADS port, for example 851 for TwinCAT 3 PLC runtime 1 (default: this.settings.targetAdsPort)
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, command was successful
   * - If rejected, command failed error info is returned (object)
   */
  stopPlc(adsPort = this.settings.targetAdsPort) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'stopPlc()', `Client is not connected. Use connect() to connect to the target first.`))

      debug(`stopPlc(): Stopping PLC at ADS port ${adsPort}`)

      try {
        //Read deviceState (we don't want to change it, as we have no idea what it does)
        const state = await this.readPlcRuntimeState(adsPort)

        await this.writeControl(adsPort, ADS.ADS_STATE.Stop, state.deviceState)

        debugD(`stopPlc(): PLC stopped at ADS port ${adsPort}`)
        resolve()
      } catch (err) {
        debug(`stopPlc(): Stopping PLC at ADS port ${adsPort} failed: %o`, err)
        reject(err)
      }
    })
  }








  /**
   * Restarts the PLC runtime from settings.targetAdsPort or given ads port
   * 
   * **WARNING:** Make sure the system is ready to stop and start
   * 
   * @param {number} adsPort - Target ADS port, for example 851 for TwinCAT 3 PLC runtime 1 (default: this.settings.targetAdsPort)
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, command was successful
   * - If rejected, command failed error info is returned (object)
   */
  restartPlc(adsPort = this.settings.targetAdsPort) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'restartPlc()', `Client is not connected. Use connect() to connect to the target first.`))

      try {
        debug(`restartPlc(): Restarting PLC at ADS port ${adsPort}`)

        //Read deviceState (we don't want to change it, as we have no idea what it does)
        const state = await this.readPlcRuntimeState(adsPort)

        await this.writeControl(adsPort, ADS.ADS_STATE.Reset, state.deviceState)

        await this.startPlc(adsPort)

        debugD(`restartPlc(): PLC restarted at ADS port ${adsPort}`)
        resolve()
      } catch (err) {
        debug(`restartPlc(): Restarting PLC at ADS port ${adsPort} failed: %o`, err)
        reject(err)
      }
    })
  }






  /**
   * Sets the TwinCAT system (system manager) to start/run mode (green TwinCAT icon)
   * 
   * **WARNING:** Make sure the system is ready to stop and start
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, command was successful
   * - If rejected, command failed error info is returned (object)
   */
  setSystemManagerToRun() {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'setSystemManagerToRun()', `Client is not connected. Use connect() to connect to the target first.`))

      try {
        debug(`setSystemManagerToRun(): Starting TwinCAT system to run mode`)
        //Read deviceState (we don't want to change it, as we have no idea what it does)
        const state = await this.readSystemManagerState()

        await this.writeControl(ADS.ADS_RESERVED_PORTS.SystemService, ADS.ADS_STATE.Reset, state.deviceState)

        debugD(`setSystemManagerToRun(): TwinCAT system started to run mode`)
        resolve()
      } catch (err) {
        debug(`setSystemManagerToRun(): Starting TwinCAT system to run mode failed: %o`, err)
        reject(err)
      }
    })
  }





  /**
   * Sets the TwinCAT system (system manager) to config mode (blue TwinCAT icon)
   * 
   * **WARNING:** Make sure the system is ready to stop
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, command was successful
   * - If rejected, command failed error info is returned (object)
   */
  setSystemManagerToConfig() {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'setSystemManagerToConfig()', `Client is not connected. Use connect() to connect to the target first.`))

      try {
        debug(`setSystemManagerToConfig(): Setting TwinCAT system to config mode`)

        //Read deviceState (we don't want to change it, as we have no idea what it does)
        const state = await this.readSystemManagerState()

        await this.writeControl(ADS.ADS_RESERVED_PORTS.SystemService, ADS.ADS_STATE.Reconfig, state.deviceState)

        debugD(`setSystemManagerToConfig(): TwinCAT system set to config mode`)
        resolve()
      } catch (err) {
        debug(`setSystemManagerToConfig(): Setting TwinCAT system to config mode failed: %o`, err)
        reject(err)
      }
    })
  }






  /**
   * Restarts TwinCAT system (system manager) for software update etc. 
   * Internally same as setSystemManagerToRun()
   * 
   * **WARNING:** Make sure the system is ready to stop and start
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, command was successful
   * - If rejected, command failed error info is returned (object)
   */
  restartSystemManager() {

    if (!this.connection.connected)
      return reject(new ClientException(this, 'restartSystemManager()', `Client is not connected. Use connect() to connect to the target first.`))

    debug(`restartSystemManager(): Restarting TwinCAT system`)
    return this.setSystemManagerToRun()
  }





  /**
   * @typedef RpcMethodResult
   * 
   * @property {object} returnValue - The return value of the method
   * @property {object} outputs - Object containing all VAR_OUTPUT variables of the method
   * 
   */


  /**
   * Invokes (calls) a function block method from PLC with given parameters. 
   * Returns the function result as Javascript object.
   * **NOTE:** The method must have {attribute 'TcRpcEnable'} above its METHOD definiton
   * 
   * @param {string} variableName Function block path in the PLC (full path) - Example: 'MAIN.FunctionBlock' 
   * @param {string} methodName Method name to invoke
   * @param {object} parameters Method parameters as object - Example: {param1: value, param2: value}
   * 
   * @returns {Promise<RpcMethodResult>} Returns a promise (async function)
   * - If resolved, invoking was successful and method return data (return value and outputs) is returned
   * - If rejected, command failed error info is returned (object)
   */
  invokeRpcMethod(variableName, methodName, parameters = {}) {
    return new Promise(async (resolve, reject) => {

      if (!this.connection.connected)
        return reject(new ClientException(this, 'invokeRpcMethod()', `Client is not connected. Use connect() to connect to the target first.`))

      try {
        debug(`invokeRpcMethod(): Invoking RPC method ${variableName}.${methodName}`)

        //Get symbol from cache or from PLC
        let symbol = {}
        try {
          debugD(`invokeRpcMethod(): Reading symbol info for ${variableName}`)

          symbol = await this.getSymbolInfo(variableName)
        } catch (err) {
          return reject(new ClientException(this, 'invokeRpcMethod()', `Invoking method ${methodName} failed. Reading symbol info for ${variableName} failed`, err))
        }


        //Create the data type
        let dataType = {}
        try {
          debugD(`invokeRpcMethod(): Reading symbol data type for ${variableName}`)

          dataType = await this.getDataType(symbol.type)
        } catch (err) {
          return reject(new ClientException(this, 'invokeRpcMethod()', `Invoking method ${methodName} failed. Reading data type failed`, err))
        }

        //Get the required method if exist
        const method = dataType.rpcMethods.find(m => m.name.toLowerCase() === methodName.toLowerCase().trim())
        if (method == null) {
          return reject(new ClientException(this, 'invokeRpcMethod()', `Given symbol ${variableName} has no RPC method "${methodName}". Make sure you have added pragma {attribute 'TcRpcEnable'} above method definition.`))
        }


        //Gather output parametera (if any), loop input parameters and create data buffer
        //Todo: Use bitmask instead of === as it COULD be possible to have multiple values
        const outputParameters = method.parameters.filter(p => p.flags === ADS.RCP_METHOD_PARAM_FLAGS.Out)
        let inputParamBuffer = Buffer.alloc(0)

        for (let param of method.parameters.filter(p => p.flags === ADS.RCP_METHOD_PARAM_FLAGS.In)) {
          let foundParam = null

          //First, try if we get the parameter easy way
          if (parameters[param.name] !== undefined) {
            foundParam = param.name

          } else {
            //Not found, try case-insensitive way
            try {
              foundParam = Object.keys(parameters).find(objKey => objKey.toLowerCase().trim() === param.name.toLowerCase().trim())

            } catch (err) {
              //value is null or not object or something else
              foundParam = null
            }
          }

          if (foundParam == null) {
            return reject(new ClientException(this, 'invokeRpcMethod()', `Given parameters are missing at least parameter "${param.name}" (${param.type})`))
          }

          //Parse parameter to byte buffer
          try {
            debugD(`invokeRpcMethod(): Parsing parameter ${foundParam} to raw data`)

            //Note 'internal': So we get better error message for this use
            const dataBuffer = await this.convertToRaw(parameters[foundParam], param.type, 'internal')
            inputParamBuffer = Buffer.concat([inputParamBuffer, dataBuffer])

          } catch (err) {
            return reject(new ClientException(this, 'invokeRpcMethod()', `Parsing RPC method parameter "${foundParam}" failed: ${err.message}`, err))
          }
        }


        //Create handle to the method
        let handle = 0
        try {
          debugD(`invokeRpcMethod(): Creating variable handle to RPC method ${variableName}#${methodName}`)

          handle = await this.createVariableHandle(`${variableName}#${methodName}`)

        } catch (err) {
          return reject(new ClientException(this, 'invokeRpcMethod()', `Creating variable handle to RPC method failed`, err))
        }


        //Allocating bytes for request
        const data = Buffer.alloc(16 + inputParamBuffer.byteLength)
        let pos = 0

        //0..3 IndexGroup
        data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolValueByHandle, pos)
        pos += 4

        //4..7 IndexOffset
        data.writeUInt32LE(handle.handle, pos)
        pos += 4

        //8..11 Read data length (return value size + total var_output size)
        data.writeUInt32LE(method.returnSize + outputParameters.reduce((total, param) => total + param.size, 0), pos)
        pos += 4

        //12..15 Write data length
        data.writeUInt32LE(inputParamBuffer.byteLength, pos)
        pos += 4

        //16..n Data
        inputParamBuffer.copy(data, pos)

        _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadWrite, data)
          .then(async res => {
            debugD(`invokeRpcMethod(): Invoking RPC method was successful`)

            //Delete variable handle
            try {
              debugD(`invokeRpcMethod(): Deleting variable handle %o`, handle)
              await this.deleteVariableHandle(handle)

            } catch (err) {
              return reject(new ClientException(this, 'invokeRpcMethod()', `Deleting variable handle failed`, err))
            }

            //Parse return data
            try {
              debugD(`invokeRpcMethod(): Converting return data (${res.ads.data.byteLength} bytes) to Javascript objects`)

              let pos = 0

              const returnData = {
                returnValue: null,
                outputs: {}
              }

              //Method return value
              if (method.returnSize > 0) {
                returnData.returnValue = await this.convertFromRaw(res.ads.data.slice(pos, pos + method.returnSize), method.returnType)
                pos += method.returnSize
              }

              //VAR_OUTPUT parameters
              for (let param of outputParameters) {
                returnData.outputs[param.name] = await this.convertFromRaw(res.ads.data.slice(pos, pos + param.size), param.type)
                pos += param.size
              }

              debug(`invokeRpcMethod(): Invoking RPC method ${variableName}.${methodName} was successful and ${res.ads.data.byteLength} bytes data returned`)

              return resolve(returnData)
            } catch (err) {
              return reject(new ClientException(this, 'invokeRpcMethod()', `Converting method return or output data to Javascript object failed`, err))
            }

          })
          .catch((res) => {
            debug(`invokeRpcMethod(): Invoking RPC method ${variableName}.${methodName} failed: %o`, res)
            return reject(new ClientException(this, 'invokeRpcMethod()', `Invoking RPC method ${variableName}.${methodName} failed`, res))
          })

      } catch (err) {
        debug(`invokeRpcMethod(): Invoking RPC method ${variableName}.${methodName} failed`, err)
        reject(err)
      }
    })
  }







  /**
   * Sends an ADS command including provided data
   * As default the command is sent to target provided in Client settings. 
   * However, the target can also be given
   *
   * @param {number} adsCommand ADS command to send (See ADS.ADS_COMMAND)
   * @param {Buffer} adsData Data to send as byte Buffer
   * @param {number} [targetAdsPort] Target ADS port (default: same as in Client settings, this.settings.targetAdsPort)
   * @param {string} [targetAmsNetId] Target AmsNetID (default: same as in Client settings, this.settings.targetAmsNetId)
   *
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, command was successful and result is returned
   * - If rejected, command failed error info is returned (object)
   */
  sendAdsCommand(adsCommand, adsData, targetAdsPort = null, targetAmsNetId = null) {
    return _sendAdsCommand.call(this, adsCommand, adsData, targetAdsPort, targetAmsNetId)
  }




  /**
   * **Helper:** Converts byte array (Buffer) to AmsNetId string
   * 
   * @param {Buffer|array} byteArray Buffer/array that contains AmsNetId bytes
   * @returns {string} AmsNetId as string
   */
  byteArrayToAmsNetIdStr(byteArray) {
    return _byteArrayToAmsNetIdStr(byteArray)
  }

  /**
   * **Helper:** Converts AmsNetId string to byte array
   * 
   * @param {string} byteArray String that represents an AmsNetId
   * @returns {array} AmsNetId as array
   */
  amsNetIdStrToByteArray(str) {
    return _amsNetIdStrToByteArray(str)
  }

}








/**
 * Own exception class used for Client errors
 * 
 * Derived from Error but added innerException and ADS error information
 * 
 * @class
 */
class ClientException extends Error {


  /**
   * @typedef AdsErrorInfo
   * @property {string} adsErrorType Type of the error (AMS error, ADS error)
   * 
   * - AMS error: Something went wrong with the routing, the command was unknown etc.
   * - ADS error: The command failed
   * @property {number} adsErrorCode ADS error code
   * @property {string} adsErrorStr The description/message of ADS error code [https://infosys.beckhoff.com/english.php?content=../content/1033/tf6610_tc3_s5s7communication/36028797393240971.html&id=](https://infosys.beckhoff.com/english.php?content=../content/1033/tf6610_tc3_s5s7communication/36028797393240971.html&id=)
   * 
   */

  /**
   * @constructor
   * @param {Client} client AdsClient instance
   * @param {string} sender The method name that threw the error
   * @param {string|Error|ClientException} messageOrError Error message or another Error/ClientException instance
   * @param {...*} errData Inner exceptions, AMS/ADS responses or any other metadata
   */
  constructor(client, sender, messageOrError, ...errData) {

    //The 2nd parameter can be either message or another Error or ClientException
    if (messageOrError instanceof ClientException) {
      super(messageOrError.message)
      //Add to errData, so will be handled later
      errData.push(messageOrError)

    } else if (messageOrError instanceof Error) {
      super(messageOrError.message)
      //Add to errData, so will be handled later
      errData.push(messageOrError)

    } else {
      super(messageOrError)
    }

    //Stack trace
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    } else {
      this.stack = (new Error(messageOrError)).stack
    }

    /** 
     * Error class name
     * @type {string} 
     */
    this.name = this.constructor.name
    /** 
     * The method that threw the error 
     * @type {string}
     */
    this.sender = sender
    /** 
     * If true, this error is an AMS/ADS error 
     * @type {boolean} 
     */
    this.adsError = false
    /** 
     * If adsError = true, this contains error information
     * @type {AdsErrorInfo} 
     */
    this.adsErrorInfo = null
    /** 
     * All other metadata that is passed to the error class 
     * @type {any} 
     */
    this.metaData = null
    /** 
     * Senders and error messages of inner exceptions 
     * @type {string[]} 
     */
    this.errorTrace = []
    /** 
     * Function to retrieve the inner exception of this error 
     * @type {function} 
     */
    this.getInnerException = null


    //Loop through given additional data
    errData.forEach(data => {

      if (data instanceof ClientException && this.getInnerException == null) {
        //Another ClientException error
        this.getInnerException = () => data

        //Add it to our own tracing array
        this.errorTrace.push(`${this.getInnerException().sender}: ${this.getInnerException().message}`)

        //Add also all traces from the inner exception
        this.getInnerException().errorTrace.forEach(s => this.errorTrace.push(s))

        //Modifying the stack trace so it contains all previous ones too
        //Source: Matt @ https://stackoverflow.com/a/42755876/8140625

        if (client._internals && client._internals.debugLevel > 0) {
          let message_lines = (this.message.match(/\n/g) || []).length + 1
          this.stack = this.stack.split('\n').slice(0, message_lines + 1).join('\n') + '\n' +
            this.getInnerException().stack
        }

      } else if (data instanceof Error && this.getInnerException == null) {

        //Error -> Add it's message to our message
        this.message += ` (${data.message})`
        this.getInnerException = () => data

        //Modifying the stack trace so it contains all previous ones too
        //Source: Matt @ https://stackoverflow.com/a/42755876/8140625
        if (client._internals && client._internals.debugLevel > 0) {
          let message_lines = (this.message.match(/\n/g) || []).length + 1
          this.stack = this.stack.split('\n').slice(0, message_lines + 1).join('\n') + '\n' +
            this.getInnerException().stack
        }

      } else if (data.ams && data.ams.error) {
        //AMS reponse with error code
        this.adsError = true
        this.adsErrorInfo = {
          adsErrorType: 'AMS error',
          adsErrorCode: data.ams.errorCode,
          adsErrorStr: data.ams.errorStr
        }

      } else if (data.ads && data.ads.error) {
        //ADS response with error code
        this.adsError = true
        this.adsErrorInfo = {
          adsErrorType: 'ADS error',
          adsErrorCode: data.ads.errorCode,
          adsErrorStr: data.ads.errorStr
        }

      } else if (this.metaData == null) {
        //If something else is provided, save it
        this.metaData = data
      }
    })

    //If this particular exception has no ADS error, check if the inner exception has
    //It should always be passed upwards to the end-user
    if (!this.adsError && this.getInnerException != null && this.getInnerException().adsError && this.getInnerException().adsError === true) {
      this.adsError = true
      this.adsErrorInfo = this.getInnerException().adsErrorInfo
    }
  }
}











/**
 * Libray internal methods are documented inside a virtual namespace *_LibraryInternals*.
 * 
 * These methods **are not meant for end-user** and they are not available through module exports.
 * 
 * @namespace _LibraryInternals
 */






/**
 * Connects to the target system using pre-defined Client::settings (at constructor or manually given)
 *
   * @param {boolean} [isReconnecting] - If true, the _connect() call is made during reconnection (-> affects disconnect() calls if connecting fails)
 * 
 * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, client is connected successfully and connection info is returned (object)
   * - If rejected, something went wrong and error info is returned (object)
 * 
 * @memberof _LibraryInternals
 */
function _connect(isReconnecting = false) {
  return new Promise(async (resolve, reject) => {

    if (this._internals.socket !== null) {
      debug(`_connect(): Socket already assigned`)
      return reject(new ClientException(this, '_connect()', 'Connection is already opened. Close the connection first using disconnect()'))
    }

    debug(`_connect(): Starting to connect ${this.settings.routerAddress}:${this.settings.routerTcpPort}`)

    //Creating a socket and setting it up
    let socket = new net.Socket()
    socket.setNoDelay(true) //Sends data without delay



    //----- Connecting error events -----

    //Listening error event during connection
    socket.once('error', err => {
      debug('_connect(): Socket connect failed: %O', err)

      //Remove all events from socket
      socket.removeAllListeners()
      socket = null

      //Reset connection flag
      this.connection.connected = false

      reject(new ClientException(this, '_connect()', `Connection to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed (socket error ${err.errno})`, err))
    })



    //Listening close event during connection
    socket.once('close', hadError => {
      debug(`_connect(): Socket closed by remote, connection failed`)

      //Remove all events from socket
      socket.removeAllListeners()
      socket = null

      //Reset connection flag
      this.connection.connected = false

      reject(new ClientException(this, '_connect()', `Connection to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed - socket closed by remote (hadError = ${hadError})`))
    })


    //Listening end event during connection
    socket.once('end', () => {
      debug(`_connect(): Socket connection ended by remote, connection failed.`)

      //Remove all events from socket
      socket.removeAllListeners()
      socket = null

      //Reset connection flag
      this.connection.connected = false

      if (this.settings.localAdsPort != null)
        reject(new ClientException(this, '_connect()', `Connection to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed - socket ended by remote (is the given local ADS port ${this.settings.localAdsPort} already in use?)`))
      else
        reject(new ClientException(this, '_connect()', `Connection to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed - socket ended by remote`))
    })

    //Listening timeout event during connection
    socket.once('timeout', () => {
      debug(`_connect(): Socket timeout`)

      //No more timeout needed
      socket.setTimeout(0);
      socket.destroy()

      //Remove all events from socket
      socket.removeAllListeners()
      socket = null

      //Reset connection flag
      this.connection.connected = false

      reject(new ClientException(this, '_connect()', `Connection to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed (timeout) - No response from router in ${this.settings.timeoutDelay} ms`))
    })

    //----- Connecting error events end -----


    //Listening for connect event
    socket.once('connect', async () => {
      debug(`_connect(): Socket connection established to ${this.settings.routerAddress}:${this.settings.routerTcpPort}`)

      //No more timeout needed
      socket.setTimeout(0);

      this._internals.socket = socket

      //Try to register an ADS port
      try {
        let res = await _registerAdsPort.call(this)

        this.connection.connected = true
        this.connection.localAmsNetId = res.amsTcp.data.localAmsNetId
        this.connection.localAdsPort = res.amsTcp.data.localAdsPort
        this.connection.isLocal = this.settings.targetAmsNetId === '127.0.0.1.1.1' || this.settings.targetAmsNetId === this.connection.localAmsNetId

        debug(`_connect(): ADS port registered from router. We are ${this.connection.localAmsNetId}:${this.connection.localAdsPort}`)
      } catch (err) {

        if (socket) {
          socket.destroy()
          //Remove all events from socket
          socket.removeAllListeners()
        }
        this.connection.connected = false

        return reject(new ClientException(this, '_connect()', `Registering ADS port from router failed`, err))
      }

      //Remove the socket events that were used only during _connect()
      socket.removeAllListeners('error')
      socket.removeAllListeners('close')
      socket.removeAllListeners('end')

      //When socket errors from now on, we will close the connection
      this._internals.socketErrorHandler = _onSocketError.bind(this)
      socket.on('error', this._internals.socketErrorHandler)

      if (this.settings.bareClient !== true) {
        try {
          //Try to read system manager state - If it's OK, connection is successful to the target
          await this.readSystemManagerState()
          _systemManagerStatePoller.call(this)

        } catch (err) {
          try {
            await _disconnect.call(this, false, isReconnecting)
          } catch (err) {
            debug(`_connect(): Reading target system manager failed -> Connection closed`)
          }
          this.connection.connected = false

          return reject(new ClientException(this, '_connect()', `Connection failed: ${err.message}`, err))
        }


        try {
          await _reInitializeInternals.call(this)

        } catch (err) {
          if (this.settings.allowHalfOpen !== true) {
            try {
              await _disconnect.call(this, false, true)
            } catch (err) {
              debug(`_connect(): Connecting to target PLC runtime failed -> Connection closed`)
            }
            this.connection.connected = false

            return reject(new ClientException(this, '_connect()', `Target and system manager found but couldn't connect to the PLC runtime (see settings allowHalfOpen and bareClient): ${err.message}`, err))
          }

          //Todo: Redesign this
          if (this.metaData.systemManagerState.adsState !== ADS.ADS_STATE.Run)
            _console.call(this, `WARNING: Target is connected but not in RUN mode (mode: ${this.metaData.systemManagerState.adsStateStr}) - connecting to runtime (ADS port ${this.settings.targetAdsPort}) failed`)
          else
            _console.call(this, `WARNING: Target is connected but connecting to runtime (ADS port ${this.settings.targetAdsPort}) failed - Check the port number and that the target system state (${this.metaData.systemManagerState.adsStateStr}) is valid.`)
        }
      }

      //Listening connection lost events
      this._internals.socketConnectionLostHandler = _onConnectionLost.bind(this, true)
      socket.on('close', this._internals.socketConnectionLostHandler)

      //We are connected to the target
      this.emit('connect', this.connection)

      resolve(this.connection)
    })

    //Listening data event
    socket.on('data', data => {
      _socketReceive.call(this, data)
    })

    //Timeout only during connecting, other timeouts are handled elsewhere
    socket.setTimeout(this.settings.timeoutDelay);

    //Finally, connect
    try {
      socket.connect({
        port: this.settings.routerTcpPort,
        host: this.settings.routerAddress,
        localPort: (this.settings.localTcpPort ? this.settings.localTcpPort : null),
        localAddress: (this.settings.localAddress ? this.settings.localAddress : null),
      })

    } catch (err) {
      this.connection.connected = false

      reject(new ClientException(this, '_connect()', `Opening socket connection to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed`, err))
    }
  })
}


/**
 * Unsubscribes all notifications, unregisters ADS port from router (if it was registered)
 * and disconnects target system and ADS router
 *
 * @param {boolean} [forceDisconnect] - If true, the connection is dropped immediately (default = false)
 * @param {boolean} [isReconnecting] - If true, _disconnect() call is made during reconnecting
 *
 * @returns {Promise<object>} Returns a promise (async function)
 * - If resolved, disconnect was successful 
 * - If rejected, connection is still closed but something went wrong during disconnecting and error info is returned
 *
 * @memberof _LibraryInternals
 */
function _disconnect(forceDisconnect = false, isReconnecting = false) {
  return new Promise(async (resolve, reject) => {

    debug(`_disconnect(): Starting to close connection (force: ${forceDisconnect})`)

    try {
      if (this._internals.socketConnectionLostHandler) {
        this._internals.socket.off('close', this._internals.socketConnectionLostHandler)
      }

    } catch (err) {
      //We probably have no socket anymore. Just quit.
      forceDisconnect = true
    }

    //Clear reconnection timer only when not reconnecting
    if (!isReconnecting) {
      _clearTimer(this._internals.reconnectionTimer)
    }

    //Clear other timers
    _clearTimer(this._internals.systemManagerStatePoller)
    clearTimeout(this._internals.portRegisterTimeoutTimer)

    //If forced, then just destroy the socket
    if (forceDisconnect) {

      if (this._internals.socket) {
        this._internals.socket.removeAllListeners()
        this._internals.socket.destroy()
      }
      this.connection.connected = false
      this.connection.localAdsPort = null
      this._internals.socket = null

      this.emit('disconnect')

      return resolve()
    }


    let error = null

    try {
      await this.unsubscribeAll()
    } catch (err) {
      error = new ClientException(this, 'disconnect()', err)
    }

    try {
      await _unsubscribeAllInternals.call(this)
    } catch (err) {
      error = new ClientException(this, 'disconnect()', err)
    }

    try {
      await _unregisterAdsPort.call(this)

      //Done
      this.connection.connected = false
      this.connection.localAdsPort = null

      //Socket should be null but check it anyways
      if (this._internals.socket != null) {
        this._internals.socket.removeAllListeners()
        this._internals.socket.destroy() //Just incase
        this._internals.socket = null
      }

      debug(`_disconnect(): Connection closed successfully`)

    } catch (err) {
      //Force socket close
      if (this._internals.socket) {
        this._internals.socket.removeAllListeners()
        this._internals.socket.destroy()
      }

      this.connection.connected = false
      this.connection.localAdsPort = null
      this._internals.socket = null

      error = new ClientException(this, 'disconnect()', err)

      debug(`_disconnect(): Connection closing failed, connection forced to close`)
    }

    if (error !== null) {
      error.message = `Disconnected but something failed: ${error.message}`
      this.emit('disconnect')

      return reject(error)
    }

    this.emit('disconnect')
    resolve()
  })
}



/**
 * Disconnects and reconnects again. Subscribes again to all active subscriptions.
 * To prevent subscribing, call unsubscribeAll() before reconnecting.
 *
 * @param {boolean} [forceDisconnect] - If true, the connection is dropped immediately (default = false)
 * @param {boolean} [isReconnecting] - If true, _reconnect() call is made during reconnecting
 *
 * @returns {Promise<object>} Returns a promise (async function)
 * - If resolved, reconnecting was successful
 * - If rejected, reconnecting failed and error info is returned
 *
 * @memberof _LibraryInternals
 */
function _reconnect(forceDisconnect = false, isReconnecting = false) {
  return new Promise(async (resolve, reject) => {

    //Clear all cached symbols and data types (might be incorrect)
    this.metaData.symbols = {}
    this.metaData.dataTypes = {}

    //Save active subscriptions to memory and delete olds
    if (this._internals.oldSubscriptions == null) {
      this._internals.oldSubscriptions = {}
      Object.assign(this._internals.oldSubscriptions, this._internals.activeSubscriptions)

      debug(`_reconnect(): Total of ${Object.keys(this._internals.activeSubscriptions).length} subcriptions saved for reinitializing`)
    }

    this._internals.activeSubscriptions = {}

    if (this._internals.socket != null) {
      try {
        debug(`_reconnect(): Trying to disconnect`)

        await _disconnect.call(this, forceDisconnect, isReconnecting)

      } catch (err) {
        //debug(`_reconnect(): Disconnecting failed: %o`, err)
      }
    }

    debug(`_reconnect(): Trying to connect`)

    return _connect.call(this, true)
      .then(res => {
        debug(`_reconnect(): Connected!`)

        //Reconnected, try to subscribe again 
        _reInitializeSubscriptions.call(this, this._internals.oldSubscriptions)
          .then(() => {
            _console.call(this, `PLC runtime reconnected successfully and all subscriptions were restored!`)

            debug(`_reconnect(): Connection and subscriptions reinitialized. Connection is back.`)
          })
          .catch(err => {
            _console.call(this, `PLC runtime reconnected successfully but not all subscriptions were restored. Error info: ${err}`)

            debug(`_reconnect(): Connection and some subscriptions reinitialized. Connection is back.`)
          })
        
        this.emit('reconnect')

        resolve(res)
      })
      .catch(err => {
        debug(`_reconnect(): Connecting failed`)
        reject(err)
      })
  })
}


/**
 * Registers a new ADS port from used AMS router
 * 
 * Principe is from .NET library TwinCAT.Ads.dll 
 * 
 * @returns {Promise<object>} Returns a promise (async function)
 * - If resolved, registering a port was successful and local AmsNetId and ADS port are returned (object)
 * - If rejected, registering failed and error info is returned (object)
 * 
 * @memberof _LibraryInternals
 */
function _registerAdsPort() {
  return new Promise((resolve, reject) => {
    debugD(`_registerAdsPort(): Registering an ADS port from ADS router ${this.settings.routerAddress}:${this.settings.routerTcpPort}`)

    //If a manual AmsNetId and ADS port values are used, we should resolve immediately
    //This is used for example if connecting to a remote PLC from non-ads device
    if (this.settings.localAmsNetId && this.settings.localAdsPort) {
      debug(`_registerAdsPort(): Local AmsNetId and ADS port manually given so using ${this.settings.localAmsNetId}:${this.settings.localAdsPort}`)

      return resolve({
        amsTcp: {
          data: {
            localAmsNetId: this.settings.localAmsNetId,
            localAdsPort: this.settings.localAdsPort
          }
        }
      })
    }

    const packet = Buffer.alloc(8)
    let pos = 0

    //0..1 Ams command (header flag)
    packet.writeUInt16LE(ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_CONNECT)
    pos += 2

    //2..5 Data length
    packet.writeUInt32LE(2, pos)
    pos += 4

    //6..7 Data: Requested ads port (0 = let the server decide)
    packet.writeUInt16LE((this.settings.localAdsPort ? this.settings.localAdsPort : 0), pos)

    //Timeout (if no answer from router)
    this._internals.portRegisterTimeoutTimer = setTimeout(() => {
      //Callback is no longer needed, delete it
      this._internals.amsTcpCallback = null

      //Create a custom "ads error" so that the info is passed onwards
      const adsError = {
        ads: {
          error: true,
          errorCode: -1,
          errorStr: `Timeout - no response in ${this.settings.timeoutDelay} ms`
        }
      }
      debug(`_registerAdsPort(): Failed to register ADS port - Timeout - no response in ${this.settings.timeoutDelay} ms`)

      return reject(new ClientException(this, '_registerAdsPort()', `Timeout - no response in ${this.settings.timeoutDelay} ms`, adsError))
    }, this.settings.timeoutDelay)


    const errorHandler = () => {
      clearTimeout(this._internals.portRegisterTimeoutTimer)
      debugD(`_registerAdsPort(): Socket connection errored.`)
      reject(new ClientException(this, '_registerAdsPort()', `Socket connection error`))
    }

    this._internals.socket.once('error', errorHandler)

    this._internals.amsTcpCallback = (res) => {
      clearTimeout(this._internals.portRegisterTimeoutTimer)
      this._internals.socket.off('error', errorHandler)
      this._internals.amsTcpCallback = null

      debugD(`_registerAdsPort(): ADS port registered, assigned AMS address is ${res.amsTcp.data.localAmsNetId}:${res.amsTcp.data.localAdsPort}`)

      return resolve(res)
    }

    try {
      _socketWrite.call(this, packet)

    } catch (err) {
      clearTimeout(this._internals.portRegisterTimeoutTimer)
      this._internals.socket.off('error', errorHandler)
      return reject(new ClientException(this, '_registerAdsPort()', `Error - Writing to socket failed`, err))
    }
  })
}






/**
 * Unregisters previously registered ADS port from AMS router
 * 
 * Principe is from .NET library TwinCAT.Ads.dll 
 * 
 * @returns {Promise<object>} Returns a promise (async function)
 * - In all cases this is resolved, ADS port is unregistered
 * 
 * @memberof _LibraryInternals
 */
function _unregisterAdsPort() {
  return new Promise(async (resolve, reject) => {
    debugD(`_unregisterAdsPort(): Unregister ads port ${this.connection.localAdsPort} from ${this.settings.routerAddress}:${this.settings.routerTcpPort}`)

    //If we have manually given AmsNetId and ADS port, we only need to close the connection manually
    if (this.settings.localAmsNetId && this.settings.localAdsPort) {
      debug(`_unregisterAdsPort(): Local AmsNetId and ADS port manually given so no need to unregister`)


      if (this._internals.socket) {

        this._internals.socket.once('error', () => {
          debugD(`_unregisterAdsPort(): Socket connection errored. Connection closed.`)
          this._internals.socket.destroy()
          resolve()
        })

        //Timeout if socket.end fails
        let timeoutTimer = setTimeout(() => {
          if (this._internals.socket) {
            this._internals.socket.destroy()
          }
          resolve()
        }, this.settings.timeoutDelay)

        //First ending socket nicely, after that destroy it
        this._internals.socket.end(() => {
          clearTimeout(timeoutTimer)
          debugD(`_unregisterAdsPort(): Socket closed`)

          if (this._internals.socket) {
            this._internals.socket.destroy()
            debugD(`_unregisterAdsPort(): Socket destroyed`)
          }

          resolve()
        })
      } else {
        resolve()
      }


    } else {
      //Unregister ADS port from router

      if (this._internals.socket == null) {
        return resolve()
      }

      const buffer = Buffer.alloc(8)
      let pos = 0

      //0..1 AMS command (header flag)
      buffer.writeUInt16LE(ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_CLOSE)
      pos += 2

      //2..5 Data length
      buffer.writeUInt32LE(2, pos)
      pos += 4

      //6..9 Data: port to unregister
      buffer.writeUInt16LE(this.connection.localAdsPort, pos)


      this._internals.portRegisterTimeoutTimer = setTimeout(() => {
        debug(`_registerAdsPort(): Failed to unregister ADS port - Timeout - no response in ${this.settings.timeoutDelay} ms`)

        if (this._internals.socket)
          this._internals.socket.destroy()

        resolve()
      }, this.settings.timeoutDelay)



      this._internals.socket.once('error', () => {
        clearTimeout(this._internals.portRegisterTimeoutTimer)
        debugD(`_unregisterAdsPort(): Socket connection errored. Connection closed.`)
        this._internals.socket.destroy()
        resolve()
      })

      this._internals.socket.once('timeout', (error) => {
        clearTimeout(this._internals.portRegisterTimeoutTimer)
        debugD(`_unregisterAdsPort(): Timeout happened during port unregister. Closing connection anyways.`)
        this._internals.socket.end(() => {
          debugD(`_unregisterAdsPort(): Socket closed after timeout`)
          this._internals.socket.destroy()
          debugD(`_unregisterAdsPort(): Socket destroyed after timeout`)
        })
      })

      //When socket emits close event, the ads port is unregistered and connection closed
      this._internals.socket.once('close', hadError => {
        clearTimeout(this._internals.portRegisterTimeoutTimer)
        debugD(`_unregisterAdsPort(): Ads port unregistered and socket connection closed.`)
        resolve()
      })

      //Sometimes close event is not received, so resolve already here
      this._internals.socket.once('end', () => {
        clearTimeout(this._internals.portRegisterTimeoutTimer)
        debugD(`_unregisterAdsPort(): Socket connection ended. Connection closed.`)
        this._internals.socket.destroy()
        resolve()
      })


      try {
        _socketWrite.call(this, buffer)

      } catch (err) {

        try {
          debugD(`_unregisterAdsPort(): Failed to send unregister command. Closing connection anyways.`)

          this._internals.socket.destroy()
        } catch (err) {
          debugD(`_unregisterAdsPort(): Failed to destroy socket.`)

        } finally {
          clearTimeout(this._internals.portRegisterTimeoutTimer)
          resolve()
        }
      }
    }
  })
}




/**
 * Event listener for socket errors. Just calling the _onConnectionLost handler.
 * 
 * @memberof _LibraryInternals
 */
async function _onSocketError(err) {
  _console.call(this, `WARNING: Socket connection had an error, closing connection: ${JSON.stringify(err)}`)

  _onConnectionLost.call(this, true)
}





/**
 * Called when connection to the remote is lost
 * 
 * @param {boolean} socketFailure - If true, connection was lost due socket/tcp problem -> Just destroy the socket
 * 
 * @memberof _LibraryInternals
 */
async function _onConnectionLost(socketFailure = false) {
  //Clear timers
  _clearTimer(this._internals.systemManagerStatePoller)

  debug(`_onConnectionLost(): Connection was lost. Socket failure: ${socketFailure}`)

  this.connection.connected = false
  this.emit('connectionLost')

  if (this.settings.autoReconnect !== true) {
    _console.call(this, 'WARNING: Connection was lost and setting autoReconnect=false. Quiting.')
    try {
      await this.disconnect(true)
    } catch { }

    return
  }

  if (this._internals.socket && this._internals.socketConnectionLostHandler)
    this._internals.socket.off('close', this._internals.socketConnectionLostHandler)

  _console.call(this, 'WARNING: Connection was lost. Trying to reconnect...')

  const tryToReconnect = async (firstTime, timerId) => {

    //If the timer has changed, quit here
    if (this._internals.reconnectionTimer.id !== timerId) {
      return
    }

    //Try to reconnect
    _reconnect.call(this, socketFailure, true)
      .then(res => {
        
        //Success -> remove timer
        _clearTimer(this._internals.reconnectionTimer)

      })
      .catch(err => {
        //Reconnecting failed
        if (firstTime)
          _console.call(this, `WARNING: Reconnecting failed. Keeping trying in the background every ${this.settings.reconnectInterval} ms...`)
        
        //If this is still a valid timer, start over again
        if (this._internals.reconnectionTimer.id === timerId) {
          //Creating a new timer with the same id
          this._internals.reconnectionTimer.timer = setTimeout(
            () => tryToReconnect(false, timerId),
            this.settings.reconnectInterval
          )
        } else {
          debugD(`_onConnectionLost(): Timer is no more valid, quiting here`)
        }
      })
  }

  //Clearing old timer if there is one + increasing timer id
  _clearTimer(this._internals.reconnectionTimer)

  //Starting poller timer
  this._internals.reconnectionTimer.timer = setTimeout(
    () => tryToReconnect(true, this._internals.reconnectionTimer.id),
    this.settings.reconnectInterval
  )
}





/**
 * Clears given object timer if it's available
 * and increases the id
 * 
 * @param {object} timerObject Timer object {id, timer}
 * 
 * @memberof _LibraryInternals
 */
function _clearTimer(timerObject) {
  //Clearing timer
  clearTimeout(timerObject.timer)
  timerObject.timer = null

  //Increasing timer id
  timerObject.id = timerObject.id < Number.MAX_SAFE_INTEGER ? timerObject.id + 1 : 0;
}
  








/**
 * Initializes internal subscriptions and caches symbols/datatypes if required
 *  
 * @throws {Error} If failed, error is thrown
 * 
 * @memberof _LibraryInternals
 */
async function _reInitializeInternals() {

  //Read device status and subscribe to its changes
  await this.readPlcRuntimeState()
  await _subcribeToPlcRuntimeStateChanges.call(this)

  //Read device info
  await this.readDeviceInfo()
  await this.readUploadInfo()

  //Read symbol version and subscribe to its changes
  if (!this.settings.disableSymbolVersionMonitoring) await this.readSymbolVersion()
  if (!this.settings.disableSymbolVersionMonitoring) await _subscribeToSymbolVersionChanges.call(this)

  //Cache data 
  if (this.settings.readAndCacheSymbols || this.metaData.allSymbolsCached) await this.readAndCacheSymbols()
  if (this.settings.readAndCacheDataTypes || this.metaData.allDataTypesCached) await this.readAndCacheDataTypes()

}









/**
 * Reinitializes user-made subscriptions (not internal ones)
 *  
 * @throws {Error} If failed, array of errors is thrown
 * 
 * @memberof _LibraryInternals
 */
async function _reInitializeSubscriptions(previousSubscriptions) {
  debug(`_reInitializeSubscriptions(): Reinitializing subscriptions`)

  const errors = []

  for (let sub in previousSubscriptions) {
    if (previousSubscriptions[sub].internal === true) continue

    const oldSub = previousSubscriptions[sub]
    debugD(`_reInitializeSubscriptions(): Reinitializing subscription: ${oldSub.target}`)

    //Subscribe again
    try {
      const newSub = await _subscribe.call(this, oldSub.target, oldSub.callback, oldSub.settings)

      debugD(`_reInitializeSubscriptions(): Reinitializing successful: ${oldSub.target} - Old handle was ${oldSub.notificationHandle} - Handle is now ${newSub.notificationHandle}`)
      //Success. Change old object values before deleting as there might still be some references
      //NOTE: Sometimes the handle will be the same, so do not delete the new one
      if (oldSub.notificationHandle !== newSub.notificationHandle) {
        Object.assign(previousSubscriptions[sub], newSub)
      }

    } catch (err) {
      debug(`_reInitializeSubscriptions(): Reinitializing subscription failed: ${oldSub.target}`)
      errors.push(err)
    }
  }

  //We should clear the temporary data now
  this._internals.oldSubscriptions = null

  if (errors.length > 0) {
    debug(`_reInitializeSubscriptions(): Some subscriptions were not reinitialized`)
    throw errors
  }

  debug(`_reInitializeSubscriptions(): All subscriptions successfully reinitialized`)
}





/**
 * Writes given data buffer to the socket
 * 
 * Just a simple wrapper for socket.write()
 * 
 * @param data Buffer to write
 * 
 * @memberof _LibraryInternals
 */
function _socketWrite(data) {
  if (debugIO.enabled) {
    debugIO(`IO out ------> ${data.byteLength} bytes : ${data.toString('hex')}`)
  } else {
    debugD(`IO out ------> ${data.byteLength} bytes`)
  }

  this._internals.socket.write(data)
}









/**
 * Event listener for socket.on('data')
 * 
 * Adds received data to the receive buffer
 * 
 * @memberof _LibraryInternals
 */
function _socketReceive(data) {
  if (debugIO.enabled) {
    debugIO(`IO in  <------ ${data.byteLength} bytes: ${data.toString('hex')}`)
  } else {
    debugD(`IO in  <------ ${data.byteLength} bytes`)
  }

  //Add received data to buffer
  this._internals.receiveDataBuffer = Buffer.concat([this._internals.receiveDataBuffer, data])

  //Check data for valid messages
  _checkReceivedData.call(this)
}











/**
 * Subscribes to symbol version changes
 * 
 * Symbol version is changed for example during PLC program update
 * 
 * @memberof _LibraryInternals
 */
function _subscribeToSymbolVersionChanges() {
  debugD(`_subscribeToSymbolVersionChanges(): Subscribing to PLC symbol version changes`)

  return _subscribe.call(
    this,
    {
      indexGroup: ADS.ADS_RESERVED_INDEX_GROUPS.SymbolVersion,
      indexOffset: 0,
      size: 1
    },
    _onSymbolVersionChanged.bind(this), //Note: binding this
    {
      transmissionMode: ADS.ADS_TRANS_MODE.OnChange,
      maximumDelay: 0, //immediately
      cycleTime: 0, //immediately
      internal: true //Library internal
    }
  )
}










/**
 * Called when PLC symbol version is changed (_subscribeToSymbolVersionChanges())
 * 
 * @param data Buffer that contains the new symbol version
 * 
 * @memberof _LibraryInternals
 */
async function _onSymbolVersionChanged(data) {
  const version = data.value.readUInt8(0)

  if (version !== this.metaData.symbolVersion) {
    debug(`_onSymbolVersionChanged(): Symbol version changed from ${this.metaData.symbolVersion} to ${version}`)
    this.metaData.symbolVersion = version
    this.emit('symbolVersionChange', version)

    //Clear all cached symbols and data types (might be incorrect)
    this.metaData.symbols = {}
    this.metaData.dataTypes = {}

    try {
      await this.readUploadInfo()
    } catch (err) {
      debug(`_onSymbolVersionChanged(): readUploadInfo failed: %O`, err)
      this.metaData.uploadInfo = null //So we will try again later (we know that it's not up to date)
    }

    //If all symbols are cached, try to re-download all, if it fails then it just fails
    if (this.metaData.allSymbolsCached) {
      try {
        await this.readAndCacheSymbols()
      } catch (err) {
        debug(`_onSymbolVersionChanged(): readAndCacheSymbols failed: %O`, err)
      }
    }

    if (this.metaData.allDataTypesCached) {
      try {
        await this.readAndCacheDataTypes()
      } catch (err) {
        debug(`_onSymbolVersionChanged(): readAndCacheDataTypes failed: %O`, err)
      }
    }

    //Reinitialize all subscriptions
    this._internals.oldSubscriptions = {}
    Object.assign(this._internals.oldSubscriptions, this._internals.activeSubscriptions)
    this._internals.activeSubscriptions = {}

    try {
      await _reInitializeSubscriptions.call(this, this._internals.oldSubscriptions)

      debug(`_onSymbolVersionChanged(): All subscriptions reinitialized successfully`)
    } catch (err) {
      _console.call(this, `WARNING: PLC symbol version changed and not all subscriptions were reinitialized. Error info: ${JSON.stringify(err)}`)
      debug(`_onSymbolVersionChanged(): Some subscriptions weren't reinitialized`)
    }

    try {
      if (!this.settings.disableSymbolVersionMonitoring) await _subscribeToSymbolVersionChanges.call(this)
    } catch (err) {
      debug(`_onSymbolVersionChanged(): _subscribeToSymbolVersionChanges failed: %O`, err)
    }

    debug(`_onSymbolVersionChanged(): Finished`)
  }
  else {
    debug(`_onSymbolVersionChanged(): Symbol version received (not changed). Version is ${version}`)
  }
}






/**
 * Starts a poller that reads system manager state to see 
 * if connection is ok and if the manager state has changed
 * 
 * @memberof _LibraryInternals
 */
function _systemManagerStatePoller() {

  const poller = async (timerId) => {
    let startAgain = true
    let oldState = this.metaData.systemManagerState

    //If the timer has changed, quit here
    if (this._internals.systemManagerStatePoller.id !== timerId){
      return
    }

    try {
      await this.readSystemManagerState()

      //Read success
      this._internals.firstStateReadFaultTime = null

      if (oldState.adsState !== this.metaData.systemManagerState.adsState) {
        debug(`_systemManagerStatePoller(): System manager state has changed to ${this.metaData.systemManagerState.adsStateStr}`)

        this.emit('systemManagerStateChange', this.metaData.systemManagerState.adsState)

        if (this.metaData.systemManagerState.adsState !== ADS.ADS_STATE.Run) {
          //Now state is config/something else -> connection is lost
          debug(`_systemManagerStatePoller(): System manager state is not run -> connection lost`)

          startAgain = false
          _onConnectionLost.call(this)
        }
      }

    } catch (err) {
      debug(`_systemManagerStatePoller(): Reading system manager state failed: %o`, err)

      if (this._internals.firstStateReadFaultTime == null)
        this._internals.firstStateReadFaultTime = new Date()

      let failedFor = (new Date()).getTime() - this._internals.firstStateReadFaultTime.getTime()

      if (failedFor > this.settings.connectionDownDelay) {
        debug(`_systemManagerStatePoller(): No system manager state read for longer than ${this.settings.connectionDownDelay} ms. Connection lost.`)

        startAgain = false
        _onConnectionLost.call(this)
      }
    }

    //Try again if required AND this is still the valid timer
    if (startAgain && this._internals.systemManagerStatePoller.id === timerId) {
      //Creating a new timer with the same id
      this._internals.systemManagerStatePoller.timer = setTimeout(
        () => poller(timerId),
        this.settings.checkStateInterval
      )
    }
  }


  //Clearing old timer if there is one + increasing timer id
  _clearTimer(this._internals.systemManagerStatePoller)

  //Starting poller timer
  this._internals.systemManagerStatePoller.timer = setTimeout(
    () => poller(this._internals.systemManagerStatePoller.id),
    this.settings.checkStateInterval
  )
    
}












/**
 * Subscribes to PLC runtime state changes
 * 
 * @memberof _LibraryInternals
 */
function _subcribeToPlcRuntimeStateChanges() {
  debugD(`_subcribeToPlcRuntimeStateChanges(): Subscribing to PLC runtime state changes`)

  return _subscribe.call(
    this,
    {
      indexGroup: ADS.ADS_RESERVED_INDEX_GROUPS.DeviceData,
      indexOffset: 0,
      size: 4
    },
    _onPlcRuntimeStateChanged.bind(this), //Note: bind()
    {
      transmissionMode: ADS.ADS_TRANS_MODE.OnChange,
      maximumDelay: 0, //immediately
      cycleTime: 0, //immediately
      internal: true, //Library internal
    }
  )
}














/**
 * Called when local AMS router status has changed (Router notification received)
 * For example router state changes when local TwinCAT changes from Config to Run state and vice-versa
 * 
 * @param data Buffer that contains the new router state
 * 
 * @memberof _LibraryInternals
 */
async function _onRouterStateChanged(data) {
  const state = data.amsTcp.data.routerState

  debug(`_onRouterStateChanged(): Local AMS router state has changed${(this.metaData.routerState.stateStr ? ` from ${this.metaData.routerState.stateStr}` : '')} to ${ADS.AMS_ROUTER_STATE.toString(state)} (${state})`)

  this.metaData.routerState = {
    state: state,
    stateStr: ADS.AMS_ROUTER_STATE.toString(state)
  }

  this.emit('routerStateChange', this.metaData.routerState)

  //If we have a local connection, connection needs to be reinitialized
  if (this.connection.isLocal === true) {
    //We should stop polling system manager, it will be reinitialized later
    _clearTimer(this._internals.systemManagerStatePoller)

    debug(`_onRouterStateChanged(): Local loopback connection active, monitoring router state`)

    if (this.metaData.routerState.state === ADS.AMS_ROUTER_STATE.START) {
      _console.call(this, `WARNING: Local AMS router state has changed to ${ADS.AMS_ROUTER_STATE.toString(state)}. Reconnecting...`)
      _onConnectionLost.call(this)

    } else {
      //Nothing to do, just wait until router has started again..
      _console.call(this, `WARNING: Local AMS router state has changed to ${ADS.AMS_ROUTER_STATE.toString(state)}. Connection and active subscriptions might have been lost.`)
    }
  }
}




/**
 * Called when device status has changed (_subcribeToPlcRuntimeStateChanges)
 * 
 * @memberof _LibraryInternals
 */
async function _onPlcRuntimeStateChanged(data, sub) {

  const state = {}
  let pos = 0

  //0..1 ADS state
  state.adsState = data.value.readUInt16LE(pos)
  state.adsStateStr = ADS.ADS_STATE.toString(state.adsState)
  pos += 2

  //2..3 Device state
  state.deviceState = data.value.readUInt16LE(pos)

  let changed = false

  if (this.metaData.plcRuntimeState.adsState !== state.adsState) {
    debug(`_onPlcRuntimeStateChanged(): PLC runtime state changed from ${this.metaData.plcRuntimeState.adsStateStr} to ${state.adsStateStr}`)
    changed = true
  }
  if (this.metaData.plcRuntimeState.deviceState !== state.deviceState) {
    debug(`_onPlcRuntimeStateChanged(): PLC runtime state (deviceState) changed from ${this.metaData.plcRuntimeState.deviceState} to ${state.deviceState}`)
    changed = true
  }

  this.metaData.plcRuntimeState = state

  if (changed)
    this.emit('plcRuntimeStateChange', state)

}




/**
 * @typedef subscriptionSettings
 * @memberof _LibraryInternals
 * @property {number} transmissionMode - How the PLC checks for value changes (Cyclic or on-change - ADS.ADS_TRANS_MODE)
 * @property {number} maximumDelay - When subscribing, a notification is sent after this time even if no changes (milliseconds)
 * @property {number} cycleTime - How often the PLC checks for value changes (milliseconds)
 * @property {number} [targetAdsPort] - Target ADS port, optional. 
 * @property {boolean} [internal] - If true, the subscription is library internal (e.g. symbol version change notification)
 */
/**
 * Subscribes to variable value change notifications
 * 
 * @param {(string|object)} target Variable name in the PLC (full path, example: 'MAIN.SomeStruct.SomeValue') OR symbol object containing {indexGroup, indexOffset, size}
 * @param {subscriptionCallback} callback - Callback function that is called when notification is received
 * @param {subscriptionSettings} settings - Settings object for subscription
 * 
 * @returns {Promise<object>} Returns a promise (async function)
 * - If resolved, subscribing is successful and notification data is returned (object)
 * - If rejected, subscribing failed and error info is returned (object)
 * 
 * @memberof _LibraryInternals
 */
function _subscribe(target, callback, settings) {
  return new Promise(async (resolve, reject) => {
    debugD(`_subscribe(): Subscribing to %o with settings %o`, target, settings)

    let symbolInfo = {}

    //If target is object, it should contain indexGroup, indexOffset and size
    if (typeof target === 'object') {
      if (target.indexGroup == null || target.indexOffset == null) {
        return reject(new ClientException(this, '_subscribe()', `Target is an object but some of the required values (indexGroup, indexOffset) are not assigned`))

      } else if (target.size == null) {
        target.size = 0xFFFFFFFF
      }
      symbolInfo = target

      //Otherwise we should download symbol info by target, which should be variable name
    } else if (typeof target === 'string') {
      try {
        symbolInfo = await this.getSymbolInfo(target)

        //Read symbol datatype to cache -> It's cached when we start getting notifications
        //Otherwise with large structs and fast cycle times there might be some problems
        await this.getDataType(symbolInfo.type)

      } catch (err) {
        return reject(new ClientException(this, '_subscribe()', err))
      }
    } else {
      return reject(new ClientException(this, '_subscribe()', `Given target parameter is unknown type`))
    }


    //Allocating bytes for request
    const data = Buffer.alloc(40)
    let pos = 0

    //0..3 IndexGroup
    data.writeUInt32LE(symbolInfo.indexGroup, pos)
    pos += 4

    //4..7 IndexOffset
    data.writeUInt32LE(symbolInfo.indexOffset, pos)
    pos += 4

    //8..11 Data length
    data.writeUInt32LE(symbolInfo.size, pos)
    pos += 4

    //12..15 Transmission mode
    data.writeUInt32LE(settings.transmissionMode, pos)
    pos += 4

    //16..19 Maximum delay (ms) - When subscribing, a notification is sent after this time even if no changes 
    data.writeUInt32LE(settings.maximumDelay * 10000, pos)
    pos += 4

    //20..23 Cycle time (ms) - How often the PLC checks for value changes (minimum value: Task 0 cycle time)
    data.writeUInt32LE(settings.cycleTime * 10000, pos)
    pos += 4

    //24..40 reserved

    _sendAdsCommand.call(this, ADS.ADS_COMMAND.AddNotification, data, (settings.targetAdsPort ? settings.targetAdsPort : null))
      .then(async (res) => {

        debugD(`_subscribe(): Subscribed to %o`, target)

        //Passing the client to the newSub object so it can access itself by "this"
        let client = this

        //Creating new subscription object
        let newSub = {
          target: target,
          settings: settings,
          callback: callback,
          symbolInfo: symbolInfo,
          notificationHandle: res.ads.data.notificationHandle,
          lastValue: null,
          internal: (settings.internal && settings.internal === true ? true : false),
          unsubscribe: async function () {
            await client.unsubscribe(this.notificationHandle)
          },
          dataParser: async function (value) {
            try {
              if (this.symbolInfo.type) {
                const dataType = await client.getDataType(this.symbolInfo.type)
                const data = _parsePlcDataToObject.call(client, value, dataType)

                this.lastValue = data

                return {
                  value: data,
                  timeStamp: null, //Added later
                  type: dataType,
                  symbol: this.symbolInfo
                }
              }

              //If we don't know the data type
              this.lastValue = value

              return {
                value: value,
                timeStamp: null, //Added later
                type: null,
                symbol: null
              }
            } catch (err) {
              throw err
            }
          }
        }

        this._internals.activeSubscriptions[newSub.notificationHandle] = newSub

        resolve(newSub)
      })
      .catch((res) => {
        debug(`_subscribe(): Subscribing to %o failed: %o`, target, res)
        reject(new ClientException(this, '_subscribe()', `Subscribing to ${JSON.stringify(target)} failed`, res))
      })
  })
}









/**
 * Unsubscribes all internal (library) subscriptions
 * 
 * @returns {Promise<object>} Returns a promise (async function)
 * - If resolved, subscribing from all was successful and number of unsubscribed notifications is returned (object)
 * - If rejected, subscribing failed for some of the notifications, number of successful, number of failed and error info are returned (object)
 * 
 * @memberof _LibraryInternals
 */
function _unsubscribeAllInternals() {
  return new Promise(async (resolve, reject) => {
    debug(`_unsubscribeAllInternals(): Unsubscribing from all notifications`)

    let firstError = null, unSubCount = 0

    for (let sub in this._internals.activeSubscriptions) {
      try {
        //This method will only unsubscribe from internal notification handles
        if (this._internals.activeSubscriptions[sub].internal !== true) continue

        await this._internals.activeSubscriptions[sub].unsubscribe()
        unSubCount++

      } catch (err) {
        debug(`_unsubscribeAllInternals(): Unsubscribing from notification ${JSON.stringify(this._internals.activeSubscriptions[sub].target)} failed`)
        firstError = new ClientException(this, '_unsubscribeAllInternals()', err)
      }
    }

    if (firstError != null) {
      debug(`_unsubscribeAllInternals(): Unsubscribed from ${unSubCount} notifications but unsubscribing from some notifications failed failed`)
      return reject(firstError)
    }

    //If we are here, everything went fine
    debug(`_unsubscribeAllInternals(): Unsubscribed from ${unSubCount} notifications`)
    resolve({
      unSubCount
    })
  })
}








/**
 * Parses data type information from given (byte) Buffer. Recursively parses all sub types also
 * 
 * @param {Buffer} data - Buffer object that contains the data
 * 
 * @returns {object} Returns the data type information as object
 * 
 * @memberof _LibraryInternals
 */
async function _parseDataType(data) {
  let pos = 0, dataType = {}

  //4..7 Version
  dataType.version = data.readUInt32LE(pos)
  pos += 4

  //8..11 Hash value of datatype to compare datatypes
  dataType.hashValue = data.readUInt32LE(pos)
  pos += 4

  //12..15 hashValue of base type / Code Offset to setter Method (typeHashValue or offsSetCode)
  dataType.typeHashValue = data.readUInt32LE(pos)
  pos += 4

  //16..19 Size
  dataType.size = data.readUInt32LE(pos)
  pos += 4

  //20..23 Offset
  dataType.offset = data.readUInt32LE(pos)
  pos += 4

  //24..27 ADS data type (AdsDataType)
  dataType.adsDataType = data.readUInt32LE(pos)
  dataType.adsDataTypeStr = ADS.ADS_DATA_TYPES.toString(dataType.adsDataType)
  pos += 4

  //27..30 Flags (AdsDataTypeFlags)
  dataType.flags = data.readUInt16LE(pos)
  dataType.flagsStr = ADS.ADS_DATA_TYPE_FLAGS.toStringArray(dataType.flags)
  pos += 4

  //31..32 Name length
  dataType.nameLength = data.readUInt16LE(pos)
  pos += 2

  //33..34 Type length
  dataType.typeLength = data.readUInt16LE(pos)
  pos += 2

  //35..36 Comment length
  dataType.commentLength = data.readUInt16LE(pos)
  pos += 2

  //37..40 Array dimension
  dataType.arrayDimension = data.readUInt16LE(pos)
  pos += 2

  //41..42 Subitem count
  dataType.subItemCount = data.readUInt16LE(pos)
  pos += 2

  //43.... Name
  dataType.name = _trimPlcString(iconv.decode(data.slice(pos, pos + dataType.nameLength + 1), 'cp1252'))
  pos += dataType.nameLength + 1

  //...... Type
  dataType.type = _trimPlcString(iconv.decode(data.slice(pos, pos + dataType.typeLength + 1), 'cp1252'))
  pos += dataType.typeLength + 1

  //...... Comment
  dataType.comment = _trimPlcString(iconv.decode(data.slice(pos, pos + dataType.commentLength + 1), 'cp1252'))
  pos += dataType.commentLength + 1


  //Array data
  dataType.arrayData = []
  for (let i = 0; i < dataType.arrayDimension; i++) {
    const array = {}

    array.startIndex = data.readInt32LE(pos)
    pos += 4

    array.length = data.readUInt32LE(pos)
    pos += 4

    dataType.arrayData.push(array)
  }


  //Subitems data
  dataType.subItems = []
  for (let i = 0; i < dataType.subItemCount; i++) {
    //Get subitem length
    let len = data.readUInt32LE(pos)
    pos += 4

    //Parse the subitem recursively
    dataType.subItems.push(await _parseDataType.call(this, data.slice(pos, pos + len)))

    pos += (len - 4)
  }

  //If flags contain TypeGuid
  if (dataType.flagsStr.includes('TypeGuid')) {
    dataType.typeGuid = data.slice(pos, pos + 16).toString('hex')
    pos += 16
  }

  //If flags contain CopyMask
  if (dataType.flagsStr.includes('CopyMask')) {
    //Let's skip this for now
    pos += dataType.size
  }

  dataType.rpcMethods = []

  //If flags contain MethodInfos (TwinCAT.Ads.dll: AdsMethodEntry)
  if (dataType.flagsStr.includes('MethodInfos')) {
    dataType.methodCount = data.readUInt16LE(pos)
    pos += 2

    //RPC methods
    for (let i = 0; i < dataType.methodCount; i++) {
      const method = {}

      //Get method length
      let len = data.readUInt32LE(pos)
      pos += 4

      //4..7 Version
      method.version = data.readUInt32LE(pos)
      pos += 4

      //8..11 Virtual table index
      method.vTableIndex = data.readUInt32LE(pos)
      pos += 4

      //12..15 Return size
      method.returnSize = data.readUInt32LE(pos)
      pos += 4

      //16..19 Return align size
      method.returnAlignSize = data.readUInt32LE(pos)
      pos += 4

      //20..23 Reserved
      method.reserved = data.readUInt32LE(pos)
      pos += 4

      //24..27 Return type GUID
      method.returnTypeGuid = data.slice(pos, pos + 16).toString('hex')
      pos += 16

      //28..31 Return data type
      method.retunAdsDataType = data.readUInt32LE(pos)
      method.retunAdsDataTypeStr = ADS.ADS_DATA_TYPES.toString(method.retunAdsDataType)
      pos += 4

      //27..30 Flags (AdsDataTypeFlags)
      method.flags = data.readUInt16LE(pos)
      method.flagsStr = ADS.ADS_DATA_TYPE_FLAGS.toStringArray(method.flags)
      pos += 4

      //31..32 Name length
      method.nameLength = data.readUInt16LE(pos)
      pos += 2

      //33..34 Return type length
      method.returnTypeLength = data.readUInt16LE(pos)
      pos += 2

      //35..36 Comment length
      method.commentLength = data.readUInt16LE(pos)
      pos += 2

      //37..38 Parameter count
      method.parameterCount = data.readUInt16LE(pos)
      pos += 2

      //39.... Name
      method.name = _trimPlcString(iconv.decode(data.slice(pos, pos + method.nameLength + 1), 'cp1252'))
      pos += method.nameLength + 1

      //...... Return type
      method.returnType = _trimPlcString(iconv.decode(data.slice(pos, pos + method.returnTypeLength + 1), 'cp1252'))
      pos += method.returnTypeLength + 1

      //...... Comment
      method.comment = _trimPlcString(iconv.decode(data.slice(pos, pos + method.commentLength + 1), 'cp1252'))
      pos += method.commentLength + 1

      method.parameters = []

      for (let p = 0; p < method.parameterCount; p++) {
        const param = {}

        let paramStartPos = pos

        //Get parameter length
        let paramLen = data.readUInt32LE(pos)
        pos += 4

        //4..7 Size
        param.size = data.readUInt32LE(pos)
        pos += 4

        //8..11 Align size
        param.alignSize = data.readUInt32LE(pos)
        pos += 4

        //12..15 Data type
        param.adsDataType = data.readUInt32LE(pos)
        param.adsDataTypeStr = ADS.ADS_DATA_TYPES.toString(param.adsDataType)
        pos += 4

        //16..19 Flags (RCP_METHOD_PARAM_FLAGS)
        param.flags = data.readUInt16LE(pos)
        param.flagsStr = ADS.RCP_METHOD_PARAM_FLAGS.toStringArray(param.flags)
        pos += 4

        //20..23 Reserved
        param.reserved = data.readUInt32LE(pos)
        pos += 4

        //24..27 Type GUID
        param.typeGuid = data.slice(pos, pos + 16).toString('hex')
        pos += 16

        //28..31 LengthIsPara
        param.lengthIsPara = data.readUInt16LE(pos)
        pos += 2

        //32..33 Name length
        param.nameLength = data.readUInt16LE(pos)
        pos += 2

        //34..35 Type length
        param.typeLength = data.readUInt16LE(pos)
        pos += 2

        //36..37 Comment length
        param.commentLength = data.readUInt16LE(pos)
        pos += 2

        //38.... Name
        param.name = _trimPlcString(iconv.decode(data.slice(pos, pos + param.nameLength + 1), 'cp1252'))
        pos += param.nameLength + 1

        //...... Type
        param.type = _trimPlcString(iconv.decode(data.slice(pos, pos + param.typeLength + 1), 'cp1252'))
        pos += param.typeLength + 1

        //...... Comment
        param.comment = _trimPlcString(iconv.decode(data.slice(pos, pos + param.commentLength + 1), 'cp1252'))
        pos += param.commentLength + 1

        if (pos - paramStartPos > paramLen) {
          //There is some additional data
          param.reserved2 = data.slice(pos)
        }
        method.parameters.push(param)
      }

      dataType.rpcMethods.push(method)
    }
  }

  //If flags contain Attributes (TwinCAT.Ads.dll: AdsAttributeEntry)
  //Attribute is for example, a pack-mode attribute above struct
  dataType.attributes = []
  if (dataType.flagsStr.includes('Attributes')) {
    dataType.attributeCount = data.readUInt16LE(pos)
    pos += 2

    //Attributes
    for (let i = 0; i < dataType.attributeCount; i++) {
      let attr = {}

      //Name length
      let nameLen = data.readUInt8(pos)
      pos += 1

      //Value length
      let valueLen = data.readUInt8(pos)
      pos += 1

      //Name
      attr.name = _trimPlcString(iconv.decode(data.slice(pos, pos + nameLen + 1), 'cp1252'))
      pos += (nameLen + 1)

      //Value
      attr.value = _trimPlcString(iconv.decode(data.slice(pos, pos + valueLen + 1), 'cp1252'))
      pos += (valueLen + 1)

      dataType.attributes.push(attr)
    }
  }


  //If flags contain EnumInfos (TwinCAT.Ads.dll: AdsEnumInfoEntry)
  //EnumInfo contains the enumeration values as string
  if (dataType.flagsStr.includes('EnumInfos')) {
    dataType.enumInfoCount = data.readUInt16LE(pos)
    pos += 2
    //EnumInfos
    dataType.enumInfo = []
    for (let i = 0; i < dataType.enumInfoCount; i++) {
      let enumInfo = {}

      //Name length
      let nameLen = data.readUInt8(pos)
      pos += 1

      //Name
      enumInfo.name = _trimPlcString(iconv.decode(data.slice(pos, pos + nameLen + 1), 'cp1252'))
      pos += (nameLen + 1)

      //Value
      enumInfo.value = data.slice(pos, pos + dataType.size)
      pos += dataType.size

      dataType.enumInfo.push(enumInfo)
    }
  }

  //Reserved, if any
  dataType.reserved = data.slice(pos)

  return dataType
}










/**
 * Parses symbol information from given (byte) Buffer
 * 
 * @param {Buffer} data - Buffer object that contains the data **Note:** The data should not contain the first 4 bytes of symbol entry data length, it should be already parsed
 * 
 * @returns {object} Returns the symbol information as object
 * 
 * @memberof _LibraryInternals
 */
function _parseSymbolInfo(data) {
  let pos = 0, symbol = {}

  //0..3 Index group
  symbol.indexGroup = data.readUInt32LE(pos)
  pos += 4

  //4..7 Index offset
  symbol.indexOffset = data.readUInt32LE(pos)
  pos += 4

  //12..15 Symbol size
  symbol.size = data.readUInt32LE(pos)
  pos += 4

  //16..19 Symbol datatype
  symbol.adsDataType = data.readUInt32LE(pos)
  symbol.adsDataTypeStr = ADS.ADS_DATA_TYPES.toString(symbol.adsDataType)
  pos += 4

  //20..21 Flags
  symbol.flags = data.readUInt16LE(pos)
  symbol.flagsStr = ADS.ADS_SYMBOL_FLAGS.toStringArray(symbol.flags)
  pos += 2

  //22..23 Array dimension
  symbol.arrayDimension = data.readUInt16LE(pos)
  pos += 2

  //24..25 Symbol name length
  symbol.nameLength = data.readUInt16LE(pos)
  pos += 2

  //26..27 Symbol type length
  symbol.typeLength = data.readUInt16LE(pos)
  pos += 2

  //28..29 Symbol comment length
  symbol.commentLength = data.readUInt16LE(pos)
  pos += 2

  //30.... Symbol name & system name
  symbol.name = _trimPlcString(iconv.decode(data.slice(pos, pos + symbol.nameLength + 1), 'cp1252'))
  pos += symbol.nameLength + 1

  //...... Symbol type
  symbol.type = _trimPlcString(iconv.decode(data.slice(pos, pos + symbol.typeLength + 1), 'cp1252'))
  pos += symbol.typeLength + 1

  //...... Symbol comment
  symbol.comment = _trimPlcString(iconv.decode(data.slice(pos, pos + symbol.commentLength + 1), 'cp1252'))
  pos += symbol.commentLength + 1

  //Array data
  symbol.arrayData = []
  for (let i = 0; i < symbol.arrayDimension; i++) {
    const array = {}

    array.startIndex = data.readInt32LE(pos)
    pos += 4

    array.length = data.readUInt32LE(pos)
    pos += 4

    symbol.arrayData.push(array)
  }

  //If flags contain TypeGuid
  if (symbol.flagsStr.includes('TypeGuid')) {
    symbol.typeGuid = data.slice(pos, pos + 16).toString('hex')
    pos += 16
  }

  //If flags contain Attributes (TwinCAT.Ads.dll: AdsAttributeEntry)
  //Attribute is for example, a pack-mode attribute above struct
  symbol.attributes = []
  if (symbol.flagsStr.includes('Attributes')) {
    symbol.attributeCount = data.readUInt16LE(pos)
    pos += 2

    //Attributes
    for (let i = 0; i < symbol.attributeCount; i++) {
      let attr = {}

      //Name length
      let nameLen = data.readUInt8(pos)
      pos += 1

      //Value length
      let valueLen = data.readUInt8(pos)
      pos += 1

      //Name
      attr.name = _trimPlcString(iconv.decode(data.slice(pos, pos + nameLen + 1), 'cp1252'))
      pos += (nameLen + 1)

      //Value
      attr.value = _trimPlcString(iconv.decode(data.slice(pos, pos + valueLen + 1), 'cp1252'))
      pos += (valueLen + 1)

      symbol.attributes.push(attr)
    }
  }

  //If flags contain ExtendedFlags
  if (symbol.flagsStr.includes('ExtendedFlags')) {
    //Add later if required (32 bit integer)
    symbol.ExtendedFlags = data.readUInt32LE(pos)
    pos += 4
  }

  //Reserved, if any
  symbol.reserved = data.slice(pos)

  return symbol
}








/**
 * Reads symbol information from PLC for given variable
 * 
 * @param {string} variableName Variable name in the PLC (full path) - Example: 'MAIN.SomeStruct.SomeValue' 
 * 
 * @returns {Promise<object>} Returns a promise (async function)
 * - If resolved, reading was successful and parsed symbol information is returned (object)
 * - If rejected, reading failed and error info is returned (object)
 * 
 * @memberof _LibraryInternals
 */
function _readSymbolInfo(variableName) {
  return new Promise(async (resolve, reject) => {
    debugD(`_readSymbolInfo(): Reading symbol info for ${variableName}`)

    //Allocating bytes for request
    const data = Buffer.alloc(16 + variableName.length + 1) //Note: String end delimeter
    let pos = 0

    //0..3 IndexGroup
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolInfoByNameEx, pos)
    pos += 4

    //4..7 IndexOffset
    data.writeUInt32LE(0, pos)
    pos += 4

    //8..11 Read data length
    data.writeUInt32LE(0xFFFFFFFF, pos) //Seems to work OK (we don't know the size)
    pos += 4

    //12..15 Write data length
    data.writeUInt32LE(variableName.length + 1, pos) //Note: String end delimeter
    pos += 4

    //16..n Data
    iconv.encode(variableName, 'cp1252').copy(data, pos)
    pos += variableName.length

    _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadWrite, data)
      .then((res) => {
        //Success - NOTE: We need to skip the data length (4 bytes) as the _parseSymbolInfo requires so
        debugD(`_readSymbolInfo(): Reading symbol info for ${variableName} successful`)

        resolve(_parseSymbolInfo.call(this, res.ads.data.slice(4)))
      })
      .catch((res) => {
        debug(`_readSymbolInfo(): Reading symbol info for ${variableName} failed: %o`, res)
        return reject(new ClientException(this, '_readSymbolInfo()', `Reading symbol information for ${variableName} failed`, res))
      })
  })
}








/**
 * Recursively parses given object to (byte) Buffer for PLC using data type information
 * 
 * @param {object} value Object containing the data
 * @param {object} dataType Data type information object, that corresponds to the given value and the PLC type
 * @param {string} [objectPathStr] **DO NOT ASSIGN MANUALLY** Object path that is being parsed (eg. 'SomeStruct.InnerStruct.SomeValue') for debugging.
 * @param {boolean} [isArraySubItem] **DO NOT ASSIGN MANUALLY** True if the object that is being parsed is an array subitem 
 * 
 * @returns {Buffer} Returns a Buffer that contains the data ready for PLC
 * 
 * @memberof _LibraryInternals
 */
function _parseJsObjectToBuffer(value, dataType, objectPathStr = '', isArraySubItem = false) {
  let buffer = Buffer.alloc(0)

  //Struct or array subitem - Go through each subitem 
  if ((dataType.arrayData.length === 0 || isArraySubItem) && dataType.subItems.length > 0) {
    buffer = Buffer.alloc(dataType.size)
    
    for (const subItem of dataType.subItems) {
      //Try the find the subitem from javascript object
      let key = null

      //First, try the easy way (5-20x times faster)
      if (value[subItem.name] !== undefined) {
        key = subItem.name
      } else {
        //Not found, try case-insensitive way
        try {
          key = Object.keys(value).find(objKey => objKey.toLowerCase() === subItem.name.toLowerCase())
        } catch (err) {
          //value is null or not object or something else
          key = null
        }
      }

      //If the subitem isn't found from given object, throw error
      if (key == null) {
        const err = new TypeError(`Given Javascript object is missing key/value for at least "${objectPathStr}.${subItem.name}" (${subItem.type})`)
        err.isNotCompleteObject = true

        throw err
      }

      //Recursively parse subitem(s)
      const bufferedData = _parseJsObjectToBuffer.call(this, value[key], subItem, `${objectPathStr}.${subItem.name}`)

      //Add the subitem data to the buffer
      bufferedData.copy(buffer, subItem.offset)
    }

    //Array - Go through each array subitem
  } else if (dataType.arrayData.length > 0 && !isArraySubItem) {

    //Recursive parsing of array dimensions
    const parseArray = (value, arrayDimension, arrayPathStr = '') => {

      for (let child = 0; child < dataType.arrayData[arrayDimension].length; child++) {
        if (dataType.arrayData[arrayDimension + 1]) {
          //More dimensions available -> go deeper
          parseArray(value[child], arrayDimension + 1, `${arrayPathStr}[${child}]`)

        } else {
          //This is the final dimension
          if (value[child] === undefined) {
            throw new Error(`Given Javascript object is missing array index for ${objectPathStr}${arrayPathStr}[${child}]`)
          }

          const bufferedData = _parseJsObjectToBuffer.call(this, value[child], dataType, `${objectPathStr}${arrayPathStr}[${child}]`, true)
          buffer = Buffer.concat([buffer, bufferedData]) //TODO: optimize, concat is not a good way
        }
      }
    }
    parseArray(value, 0)



    //Enumeration
  } else if (dataType.enumInfo) {
    buffer = Buffer.alloc(dataType.size)

    let enumValue = null

    if (value.value != undefined) {
      enumValue = value.value

    } else if (value.name !== undefined || typeof value === 'string') {
      enumValue = dataType.enumInfo.find(info => info.name.trim().toLowerCase() === (value.name ? value.name : value).trim().toLowerCase())

      if (enumValue) {
        enumValue = enumValue.value
      } else {
        throw `Given Javascript enumeration value ${objectPathStr}.${dataType.name} = ${(value.name ? value.name : value)} is not allowed`
      }

    } else if (typeof value === 'number') {
      enumValue = value
    }
    else {
      throw `Given Javascript object value ${objectPathStr}.${dataType.name} is not allowed`
    }

    //Parse the base type from javascript variable to buffer
    _parseJsVariableToPlc.call(this, enumValue, dataType, buffer)


    //Base datatype that is not empty
  } else if (dataType.size > 0) {
    buffer = Buffer.alloc(dataType.size)

    //Parse the base type from javascript variable to buffer
    _parseJsVariableToPlc.call(this, value, dataType, buffer)
  }
  return buffer
}









/**
 * Parses given javascript variable to (byte) Buffer for PLC
 * 
 * @param {object} value Variable containing the data
 * @param {object} dataType Data type information object, that corresponds to the given value and the PLC type
 * @param {Buffer} dataBuffer Target Buffer where that data is saved (used as reference so is the output also)
 * 
 * @memberof _LibraryInternals
 */
function _parseJsVariableToPlc(value, dataType, dataBuffer) {
  if (dataType.size === 0) {
    //Do nothing to the buffer (keep empty)
    return
  }

  //Some datatypes are easier to parse using ads data type
  switch (dataType.adsDataType) {
    case ADS.ADS_DATA_TYPES['ADST_STRING']:
      iconv.encode(value, 'cp1252').copy(dataBuffer)
      break

    case ADS.ADS_DATA_TYPES['ADST_WSTRING']:
      iconv.encode(value, 'ucs2').copy(dataBuffer)
      break

    //All others ads data types:
    default:
      ADS.BASE_DATA_TYPES.toBuffer(this.settings, dataType.type, value, dataBuffer)
  }
}













/**
 * Recursively parses given (byte) Buffer to javascript object using data type information
 * 
 * @param {Buffer} dataBuffer Buffer that contains the PLC data
 * @param {object} dataType Data type information object, that corresponds to the given value and the PLC type
 * @param {boolean} [isArraySubItem] **DO NOT ASSIGN MANUALLY** True if the buffer that is being parsed is an array subitem 
 * 
 * @returns {object} Parsed data as Javascript object
 * 
 * @memberof _LibraryInternals
 */
function _parsePlcDataToObject(dataBuffer, dataType, isArraySubItem = false) {
  let output = null

  //Struct or array subitem - Go through each subitem
  if ((dataType.arrayData.length === 0 || isArraySubItem) && dataType.subItems.length > 0) {
    output = {}

    //First skip the offset 
    dataBuffer = dataBuffer.slice(dataType.offset)

    for (const subItem of dataType.subItems) {
      output[subItem.name] = _parsePlcDataToObject.call(this, dataBuffer, subItem)
    }


    //Array - Go through each array subitem
  } else if (dataType.arrayData.length > 0 && !isArraySubItem) {
    output = []

    //Recursive parsing of array dimensions
    const parseArray = (arrayDimension) => {
      let result = []

      for (let child = 0; child < dataType.arrayData[arrayDimension].length; child++) {
        if (dataType.arrayData[arrayDimension + 1]) {
          //More dimensions available -> go deeper
          result.push(parseArray(arrayDimension + 1))

        } else {
          //This is the final dimension -> we have actual data
          result.push(_parsePlcDataToObject.call(this, dataBuffer, dataType, true))
          dataBuffer = dataBuffer.slice(dataType.size)
        }
      }
      return result
    }

    output = parseArray(0)


    //Enumeration (only if we want to convert enumerations to object)
  } else if (dataType.enumInfo && this.settings.objectifyEnumerations && this.settings.objectifyEnumerations === true) {
    output = _parsePlcVariableToJs.call(this, dataBuffer.slice(dataType.offset, dataType.offset + dataType.size), dataType)

    let enumVal = dataType.enumInfo.find(entry => entry.value === output)
    if (enumVal) {
      output = enumVal
    } else {
      //Enumeration value is not valid, so set name to null
      output = {
        name: null,
        value: output
      }
    }


    //Basic datatype
  } else {
    output = _parsePlcVariableToJs.call(this, dataBuffer.slice(dataType.offset, dataType.offset + dataType.size), dataType)
  }

  return output
}










/**
 * Parses javascript variable from given (byte) Buffer using data type information
 * 
 * @param {Buffer} dataBuffer Target Buffer where that data is saved (used as reference so is the output also)
 * @param {object} dataType Data type information object, that corresponds to the given value and the PLC type
 * 
 * @returns {object} Parsed variable
 * 
 * @memberof _LibraryInternals
 */
function _parsePlcVariableToJs(dataBuffer, dataType) {
  if (dataType.size === 0) {
    return {}
  }

  //Some datatypes are easier to parse using ads data type
  switch (dataType.adsDataType) {
    case ADS.ADS_DATA_TYPES['ADST_STRING']:
      return _trimPlcString(iconv.decode(dataBuffer, 'cp1252'))

    case ADS.ADS_DATA_TYPES['ADST_WSTRING']:
      return _trimPlcString(iconv.decode(dataBuffer, 'ucs2'))

    //All others ads data types:
    default:
      return ADS.BASE_DATA_TYPES.fromBuffer(this.settings, dataType.type, dataBuffer)
  }
}









/**
 * Reads data type information from PLC for given data type
 * 
 * @param {string} dataTypeName - Data type name in the PLC - Example: 'INT', 'E_SomeEnum', 'ST_SomeStruct' etc. 
 * 
 * @returns {Promise<object>} Returns a promise (async function)
 * - If resolved, reading was successful and parsed data type information is returned (object)
 * - If rejected, reading failed and error info is returned (object)
 * 
 * @memberof _LibraryInternals
 */
function _readDataTypeInfo(dataTypeName) {
  return new Promise(async (resolve, reject) => {
    debugD(`_readDataTypeInfo(): Reading data type info for ${dataTypeName}`)

    //Allocating bytes for request
    const data = Buffer.alloc(16 + dataTypeName.length + 1)
    let pos = 0

    //0..3 IndexGroup
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.DataDataTypeInfoByNameEx, pos)
    pos += 4

    //4..7 IndexOffset
    data.writeUInt32LE(0, pos)
    pos += 4

    //8..11 Read data length
    data.writeUInt32LE(0xFFFFFFFF, pos) //Seems to work OK (we don't know the size)
    pos += 4

    //12..15 Write data length
    data.writeUInt32LE(dataTypeName.length + 1, pos) //Note: String end delimeter
    pos += 4

    //16..n Data
    iconv.encode(dataTypeName, 'cp1252').copy(data, pos)
    pos += dataTypeName.length

    _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadWrite, data)
      .then(async (res) => {
        //Success - NOTE: We need to skip the data length (4 bytes) as the _parseDataType requires so
        debugD(`_readDataTypeInfo(): Reading data type info info for ${dataTypeName} successful`)
        resolve(await _parseDataType.call(this, res.ads.data.slice(4)))

      })
      .catch((res) => {
        debug(`_readDataTypeInfo(): Reading data type info for ${dataTypeName} failed: %o`, res)
        reject(new ClientException(this, '_readDataTypeInfo()', `Reading data type info for ${dataTypeName} failed`, res))
      })
  })
}







/**
  * Parses full data type information recursively and returns it as object
  * 
  * @param {string} dataTypeName - Data type name in the PLC - Example: 'INT', 'E_SomeEnum', 'ST_SomeStruct' etc. 
  * @param {boolean} [firstLevel] **DO NOT ASSIGN MANUALLY** True if this is the first recursion / top level of the data type
  * @param {number} [size] - The size of the data type. This is used if we are connected to older runtime that doesn't provide base data type info -> we need to know the size at least in some cases
  * 
  * @returns {Promise<object>} Returns a promise (async function)
  * - If resolved, data type is returned (object)
  * - If rejected, reading failed and error info is returned (object)
* 
* @memberof _LibraryInternals
  */
function _getDataTypeRecursive(dataTypeName, firstLevel = true, size = null) {
  return new Promise(async (resolve, reject) => {
    let dataType = {}

    try {
      dataType = await _getDataTypeInfo.call(this, dataTypeName)

    } catch (err) {
      //Empty dummy data type
      dataType = {
        version: 1,
        hashValue: 0,
        typeHashValue: 0,
        size: 0,
        offset: 0,
        adsDataType: 0,
        adsDataTypeStr: '',
        flags: [ADS.ADS_DATA_TYPE_FLAGS.DataType],
        flagsStr: ADS.ADS_DATA_TYPE_FLAGS.toStringArray([ADS.ADS_DATA_TYPE_FLAGS.DataType]),
        nameLength: '',
        typeLength: 0,
        commentLength: 0,
        arrayDimension: 0,
        subItemCount: 0,
        name: '',
        type: '',
        comment: '',
        arrayData: [],
        subItems: [],
        attributes: [],
        rpcMethods: []
      }

      //Not found. Try if it's base type (to support TwinCAT 2 and 3.1.4020 and lower)
      if (ADS.BASE_DATA_TYPES.isPseudoType(dataTypeName)) {
        dataTypeName = ADS.BASE_DATA_TYPES.getTypeByPseudoType(dataTypeName, size)
      }

      if (ADS.BASE_DATA_TYPES.isKnownType(dataTypeName)) {
        const baseDataType = ADS.BASE_DATA_TYPES.find(dataTypeName)

        debugD(`_getDataTypeRecursive(): Data type ${dataTypeName} was not found from PLC - using local pseudo/base data type info`)

        dataType.size = (size == null ? baseDataType.size : size)
        dataType.adsDataType = baseDataType.adsDataType
        dataType.adsDataTypeStr = ADS.ADS_DATA_TYPES.toString(dataType.adsDataType)
        dataType.nameLength = dataTypeName.length
        dataType.name = dataTypeName

      } else {
        //Unknown type
        return reject(new ClientException(this, '_getDataTypeRecursive()', err))
      }
    }

    //Select default values. Edit this to add more to the end-user data type object
    let parsedDataType = {
      name: dataType.name,
      type: dataType.type,
      size: dataType.size,
      offset: dataType.offset,
      adsDataType: dataType.adsDataType,
      adsDataTypeStr: dataType.adsDataTypeStr,
      comment: dataType.comment,
      attributes: (dataType.attributes ? dataType.attributes : []),
      rpcMethods: dataType.rpcMethods,
      arrayData: [],
      subItems: []
    }

    //If data type has subItems, loop them through
    if (dataType.subItemCount > 0) {

      for (let i = 0; i < dataType.subItemCount; i++) {
        //Get the actual data type for subItem
        let subItemType = {}

        //Support for TwinCAT 3 < 4022: If we have empty struct, do nothing. ADS API will not return data type for empty struct.
        if (dataType.subItems[i].size === 0) {
          subItemType = dataType.subItems[i]
        } else {
          subItemType = await _getDataTypeRecursive.call(this, dataType.subItems[i].type, false, dataType.subItems[i].size)

          //Let's keep some data from the parent
          subItemType.type = subItemType.name
          subItemType.name = dataType.subItems[i].name
          subItemType.offset = dataType.subItems[i].offset
          subItemType.comment = dataType.subItems[i].comment
        }

        parsedDataType.subItems.push(subItemType)
      }


      //If the data type has flag "DataType", it's not enum and it's not array
    } else if (((dataType.type === '' && !ADS.BASE_DATA_TYPES.isPseudoType(dataType.name)) || ADS.BASE_DATA_TYPES.isKnownType(dataType.name)) && dataType.flagsStr.includes('DataType') && !dataType.flagsStr.includes('EnumInfos') && dataType.arrayDimension === 0) {
      //Do nothing - this is the final form
      //TODO: Get rid of this

      //Data type is a pseudo data type (pointer, reference, PVOID, UXINT etc..).
    } else if (ADS.BASE_DATA_TYPES.isPseudoType(dataType.name) && dataType.arrayDimension === 0) {

      //TODO: If this somehow fails (dataType.size is unknown) - what to do?
      parsedDataType.name = ADS.BASE_DATA_TYPES.getTypeByPseudoType(dataType.name, dataType.size)

      //If the data type is array
    } else if (dataType.arrayDimension > 0) {
      //Get array subtype
      const arrayType = await _getDataTypeRecursive.call(this, dataType.type, false)

      parsedDataType = arrayType
      //Combining array information (for ARRAY OF ARRAY support)
      parsedDataType.arrayData = dataType.arrayData.concat(parsedDataType.arrayData)

      //If the data type has flag "DataType" and it's enum
    } else if (dataType.flagsStr.includes('DataType') && dataType.flagsStr.includes('EnumInfos')) {

      //Get enum subtype
      const enumType = await _getDataTypeRecursive.call(this, dataType.type, false)

      parsedDataType = enumType
      parsedDataType.enumInfo = dataType.enumInfo

      //Parse enumeration info
      parsedDataType.enumInfo = parsedDataType.enumInfo.map(entry => {
        const temp = {
          ...parsedDataType,
          type: parsedDataType.name
        }

        return {
          ...entry,
          value: _parsePlcVariableToJs.call(this, entry.value, temp)
        }
      })


      //Added because of TwinCAT 2 - If we have empty struct, it's size is not 0 but it has no subitems
    } else if (dataType.subItemCount === 0 && dataType.adsDataType === ADS.ADS_DATA_TYPES.ADST_BIGTYPE) {
      //Do nothing here

      //This is not the final data type, continue parsing
    } else {
      const childType = await _getDataTypeRecursive.call(this, dataType.type, false)

      parsedDataType = childType
    }

    //If this is the first level of data type, the "name" contains actually the type
    if (firstLevel === true) {
      parsedDataType.type = parsedDataType.name
      parsedDataType.name = ''
    }

    resolve(parsedDataType)
  })
}














/**
 * Returns data type information for a data type. 
 * NOTE: Returns only the upmost level info, not subitems of subitems (not recursively for the whole data type). Use _getDataTypeRecursive() to receive the whole type
 * 
 * First looks in the cache, if not found, reads it from the PLC
 * 
 * @param {string} dataTypeName - Data type name in the PLC - Example: 'INT', 'E_SomeEnum', 'ST_SomeStruct' etc. 
 * 
 * @returns {Promise<object>} Returns a promise (async function)
 * - If resolved, data type is returned (object)
 * - If rejected, reading failed and error info is returned (object)
 * 
 * @memberof _LibraryInternals
 */
function _getDataTypeInfo(dataTypeName) {
  return new Promise(async (resolve, reject) => {
    debugD(`_getDataTypeInfo(): Data type requested for ${dataTypeName}`)

    let dataType = null
    dataTypeName = dataTypeName.trim()

    //First, check already downloaded data types
    if (this.metaData.dataTypes[dataTypeName.toLowerCase()]) {
      dataType = this.metaData.dataTypes[dataTypeName.toLowerCase()]
      debugD(`_getDataTypeInfo(): Data type info found from cache for ${dataTypeName}`)

      return resolve(dataType)

    } else {
      //Not found from cache, read from PLC
      _readDataTypeInfo.call(this, dataTypeName)
        .then((res) => {
          dataType = res
          this.metaData.dataTypes[dataTypeName.toLowerCase()] = dataType

          debugD(`_getDataTypeInfo(): Data type info read and cached from PLC for ${dataTypeName}`)

          return resolve(dataType)
        })
        .catch(err => reject(new ClientException(this, '_getDataTypeInfo()', err)))
    }
  })
}










/**
 * Checks received data buffer for full AMS packets. If full packet is found, it is parsed and handled.
 * 
 * Calls itself recursively if multiple packets available. Added also setImmediate calls to prevent event loop from blocking
 * 
 * @memberof _LibraryInternals
 */
function _checkReceivedData() {
  //If we haven't enough data to determine packet size, quit
  if (this._internals.receiveDataBuffer.byteLength < ADS.AMS_TCP_HEADER_LENGTH)
    return

  //There should be an AMS packet, so the packet size is available in the bytes 2..5
  let packetLength = this._internals.receiveDataBuffer.readUInt32LE(2) + ADS.AMS_TCP_HEADER_LENGTH

  //Not enough data yet? quit
  if (this._internals.receiveDataBuffer.byteLength < packetLength)
    return

  //Note: Changed from slice to Buffer.from - Should this be reconsidered?
  //const data = this._internals.receiveDataBuffer.slice(0, packetLength)
  const data = Buffer.from(this._internals.receiveDataBuffer.slice(0, packetLength))
  this._internals.receiveDataBuffer = this._internals.receiveDataBuffer.slice(data.byteLength)

  //Parse the packet, but allow time for the event loop
  setImmediate(_parseAmsTcpPacket.bind(this, data))

  //If there is more, call recursively but allow time for the event loop
  if (this._internals.receiveDataBuffer.byteLength >= ADS.AMS_TCP_HEADER_LENGTH) {
    setImmediate(_checkReceivedData.bind(this))
  }
}











/**
 * Parses an AMS/TCP packet from given (byte) Buffer and then handles it
 * 
 * @param {Buffer} data Buffer that contains data for a single full AMS/TCP packet
 * 
 * @memberof _LibraryInternals
 */
async function _parseAmsTcpPacket(data) {
  const packet = {}
  let parseResult = null

  //1. Parse AMS/TCP header
  parseResult = _parseAmsTcpHeader.call(this, data)
  packet.amsTcp = parseResult.amsTcp
  data = parseResult.data

  //2. Parse AMS header (if exists)
  parseResult = _parseAmsHeader.call(this, data)
  packet.ams = parseResult.ams
  data = parseResult.data

  //3. Parse ADS data (if exists)
  packet.ads = (packet.ams.error ? {} : _parseAdsData.call(this, packet, data))

  //4. Handle the parsed packet
  _onAmsTcpPacketReceived.call(this, packet)
}








/**
 * Parses an AMS/TCP header from given (byte) Buffer
 * 
 * @param {Buffer} data Buffer that contains data for a single full AMS/TCP packet
 * 
 * @returns {object} Object {amsTcp, data}, where amsTcp is the parsed header and data is rest of the data
 * 
 * @memberof _LibraryInternals
 */
function _parseAmsTcpHeader(data) {
  debugD(`_parseAmsTcpHeader(): Starting to parse AMS/TCP header`)

  let pos = 0
  const amsTcp = {}

  //0..1 AMS command (header flag)
  amsTcp.command = data.readUInt16LE(pos)
  amsTcp.commandStr = ADS.AMS_HEADER_FLAG.toString(amsTcp.command)
  pos += 2

  //2..5 Data length
  amsTcp.dataLength = data.readUInt32LE(pos)
  pos += 4

  //Remove AMS/TCP header from data  
  data = data.slice(ADS.AMS_TCP_HEADER_LENGTH)

  //If data length is less than AMS_HEADER_LENGTH,
  //we know that this packet has no AMS headers -> it's only a AMS/TCP command
  if (data.byteLength < ADS.AMS_HEADER_LENGTH) {
    amsTcp.data = data

    //Remove data (basically creates an empty buffer..)
    data = data.slice(data.byteLength)
  }

  debugD(`_parseAmsTcpHeader(): AMS/TCP header parsed: %o`, amsTcp)

  return { amsTcp, data }
}




/**
 * Parses an AMS header from given (byte) Buffer
 * 
 * @param {Buffer} data Buffer that contains data for a single AMS packet (without AMS/TCP header)
 * 
 * @returns {object} Object {ams, data}, where ams is the parsed AMS header and data is rest of the data
 * 
 * @memberof _LibraryInternals
 */
function _parseAmsHeader(data) {
  debugD(`_parseAmsHeader(): Starting to parse AMS header`)

  let pos = 0
  const ams = {}

  if (data.byteLength < ADS.AMS_HEADER_LENGTH) {
    debugD(`_parseAmsHeader(): No AMS header found`)
    return { ams, data }
  }

  //0..5 Target AMSNetId
  ams.targetAmsNetId = _byteArrayToAmsNetIdStr(data.slice(pos, pos + ADS.AMS_NET_ID_LENGTH))
  pos += ADS.AMS_NET_ID_LENGTH

  //6..8 Target ads port
  ams.targetAdsPort = data.readUInt16LE(pos)
  pos += 2

  //8..13 Source AMSNetId
  ams.sourceAmsNetId = _byteArrayToAmsNetIdStr(data.slice(pos, pos + ADS.AMS_NET_ID_LENGTH))
  pos += ADS.AMS_NET_ID_LENGTH

  //14..15 Source ads port
  ams.sourceAdsPort = data.readUInt16LE(pos)
  pos += 2

  //16..17 ADS command
  ams.adsCommand = data.readUInt16LE(pos)
  ams.adsCommandStr = ADS.ADS_COMMAND.toString(ams.adsCommand)
  pos += 2

  //18..19 State flags
  ams.stateFlags = data.readUInt16LE(pos)
  ams.stateFlagsStr = ADS.ADS_STATE_FLAGS.toString(ams.stateFlags)
  pos += 2

  //20..23 Data length
  ams.dataLength = data.readUInt32LE(pos)
  pos += 4

  //24..27 Error code
  ams.errorCode = data.readUInt32LE(pos)
  pos += 4

  //28..31 Invoke ID
  ams.invokeId = data.readUInt32LE(pos)
  pos += 4

  //Remove AMS header from data  
  data = data.slice(ADS.AMS_HEADER_LENGTH)

  //ADS error
  ams.error = (ams.errorCode !== null ? ams.errorCode > 0 : false)
  ams.errorStr = ''
  if (ams.error) {
    ams.errorStr = ADS.ADS_ERROR[ams.errorCode]
  }

  debugD(`_parseAmsHeader(): AMS header parsed: %o`, ams)

  return { ams, data }
}










/**
 * Parses ADS data from given (byte) Buffer. Uses packet.ams to determine the ADS command
 * 
 * @param {Buffer} data Buffer that contains data for a single ADS packet (without AMS/TCP header and AMS header)
 * 
 * @returns {object} Object that contains the parsed ADS data
 * 
 * @memberof _LibraryInternals
 */
function _parseAdsData(packet, data) {
  debugD(`_parseAdsData(): Starting to parse ADS data`)

  let pos = 0
  const ads = {}

  if (data.byteLength === 0) {
    debugD(`_parseAdsData(): No ADS data found`)
    return ads
  }

  //Saving the raw buffer data to object too
  ads.rawData = data


  switch (packet.ams.adsCommand) {
    //-------------- Read Write ---------------
    case ADS.ADS_COMMAND.ReadWrite:
    case ADS.ADS_COMMAND.Read:


      //0..3 Ads error number
      ads.errorCode = data.readUInt32LE(pos)
      pos += 4

      //4..7 Data length (bytes)
      ads.dataLength = data.readUInt32LE(pos)
      pos += 4

      //8..n Data
      ads.data = Buffer.alloc(ads.dataLength)
      data.copy(ads.data, 0, pos)

      break



    //-------------- Write ---------------
    case ADS.ADS_COMMAND.Write:

      //0..3 Ads error number
      ads.errorCode = data.readUInt32LE(pos)
      pos += 4

      break



    //-------------- Device info ---------------
    case ADS.ADS_COMMAND.ReadDeviceInfo:

      //0..3 Ads error number
      ads.errorCode = data.readUInt32LE(pos)
      pos += 4

      ads.data = {}

      //4 Major version
      ads.data.majorVersion = data.readUInt8(pos)
      pos += 1

      //5 Minor version
      ads.data.minorVersion = data.readUInt8(pos)
      pos += 1

      //6..7 Version build
      ads.data.versionBuild = data.readUInt16LE(pos)
      pos += 2

      //8..24 Device name
      ads.data.deviceName = _trimPlcString(iconv.decode(data.slice(pos, pos + 16), 'cp1252'))

      break





    //-------------- Device status ---------------
    case ADS.ADS_COMMAND.ReadState:

      //0..3 Ads error number
      ads.errorCode = data.readUInt32LE(pos)
      pos += 4

      ads.data = {}

      //4..5 ADS state
      ads.data.adsState = data.readUInt16LE(pos)
      ads.data.adsStateStr = ADS.ADS_STATE.toString(ads.data.adsState)
      pos += 2

      //6..7 Device state
      ads.data.deviceState = data.readUInt16LE(pos)
      pos += 2

      break




    //-------------- Add notification ---------------
    case ADS.ADS_COMMAND.AddNotification:

      //0..3 Ads error number
      ads.errorCode = data.readUInt32LE(pos)
      pos += 4

      ads.data = {}

      //4..7 Notification handle
      ads.data.notificationHandle = data.readUInt32LE(pos)
      pos += 4

      break




    //-------------- Delete notification ---------------
    case ADS.ADS_COMMAND.DeleteNotification:

      //0..3 Ads error number
      ads.errorCode = data.readUInt32LE(pos)
      pos += 4

      break



    //-------------- Notification ---------------
    case ADS.ADS_COMMAND.Notification:

      ads.data = _parseAdsNotification.call(this, data)

      break



    //-------------- WriteControl ---------------
    case ADS.ADS_COMMAND.WriteControl:

      //0..3 Ads error number
      ads.errorCode = data.readUInt32LE(pos)
      pos += 4

      break


    default:
      //Unknown command, return a custom error
      debug(`_parseAdsResponse: Unknown ads command in response: ${packet.ams.adsCommand}`)

      ads.error = true
      ads.errorStr = `Unknown ADS command for parser: ${packet.ams.adsCommand} (${packet.ams.adsCommandStr})`
      ads.errorCode = -1

      return ads
      break
  }


  //Ads error code, if exists
  ads.error = (ads.errorCode !== null ? ads.errorCode > 0 : false)

  if (ads.error) {
    ads.errorStr = ADS.ADS_ERROR[ads.errorCode]
  }

  debugD(`_parseAdsData(): ADS data parsed: %o`, ads)

  return ads
}












/**
 * Handles the parsed AMS/TCP packet and actions/callbacks etc. related to it.
 * 
 * @param {object} packet Fully parsed AMS/TCP packet, includes AMS/TCP header and if available, also AMS header and ADS data
 *  * 
 * @memberof _LibraryInternals
 */
async function _onAmsTcpPacketReceived(packet) {
  debugD(`_onAmsTcpPacketReceived(): A parsed AMS packet received with command ${packet.amsTcp.command}`)

  switch (packet.amsTcp.command) {
    //-------------- ADS command ---------------
    case ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_AMS_CMD:
      packet.amsTcp.commandStr = 'Ads command'

      _onAdsCommandReceived.call(this, packet)
      break


    //-------------- AMS/TCP port unregister ---------------
    case ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_CLOSE:
      packet.amsTcp.commandStr = 'Port unregister'
      //TODO: No action at the moment
      break




    //-------------- AMS/TCP port register ---------------
    case ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_CONNECT:
      packet.amsTcp.commandStr = 'Port register'

      //Parse data
      packet.amsTcp.data = {
        //0..5 Own AmsNetId
        localAmsNetId: _byteArrayToAmsNetIdStr(packet.amsTcp.data.slice(0, ADS.AMS_NET_ID_LENGTH)),
        //5..6 Own assigned ADS port
        localAdsPort: packet.amsTcp.data.readUInt16LE(ADS.AMS_NET_ID_LENGTH)
      }

      if (this._internals.amsTcpCallback !== null) {
        this._internals.amsTcpCallback(packet)
      } else {
        debugD(`_onAmsTcpPacketReceived(): Port register response received but no callback was assigned (${packet.amsTcp.commandStr})`)
      }
      break



    //-------------- AMS router note ---------------
    case ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_ROUTER_NOTE:
      packet.amsTcp.commandStr = 'Port router note'

      //Parse data
      packet.amsTcp.data = {
        //0..3 Router state
        routerState: packet.amsTcp.data.readUInt32LE(0)
      }

      _onRouterStateChanged.call(this, packet)

      break






    //-------------- Get local ams net id response ---------------
    case ADS.AMS_HEADER_FLAG.GET_LOCAL_NETID:
      packet.amsTcp.commandStr = 'Get local net id'
      //TODO: No action at the moment
      break





    default:
      packet.amsTcp.commandStr = `Unknown AMS/TCP command ${packet.amsTcp.command}`
      debug(`_onAmsTcpPacketReceived(): Unknown AMS/TCP command received: "${packet.amsTcp.command}" - Doing nothing`)
      //TODO: No action at the moment
      break
  }
}












/**
 * Handles incoming ADS commands
 * 
 * @param {object} packet Fully parsed AMS/TCP packet, includes AMS/TCP header, AMS header and ADS data
 *  * 
 * @memberof _LibraryInternals
 */
async function _onAdsCommandReceived(packet) {
  debugD(`_onAdsCommandReceived(): A parsed ADS command received with command ${packet.ams.adsCommand}`)

  switch (packet.ams.adsCommand) {

    //-------------- ADS notification ---------------
    case ADS.ADS_COMMAND.Notification:
      //Try to find the callback with received notification handles
      packet.ads.data.stamps.forEach(async stamp => {
        stamp.samples.forEach(async sample => {

          if (this._internals.activeSubscriptions[sample.notificationHandle]) {
            const sub = this._internals.activeSubscriptions[sample.notificationHandle]
            debug(`_onAdsCommandReceived(): Notification received for handle "${sample.notificationHandle}" (%o)`, sub.target)

            //First we parse the data from received byte buffer
            try {
              const parsedValue = await sub.dataParser(sample.data)

              parsedValue.timeStamp = stamp.timeStamp

              //Then lets call the users callback
              sub.callback(
                parsedValue,
                sub
              )
            } catch (err) {
              debug(`_onAdsCommandReceived(): Ads notification received but parsing Javascript object failed: %o`, err)
              this.emit('ads-client-error', new ClientException(this, `_onAdsCommandReceived`, `Ads notification received but parsing data to Javascript object failed. Subscription: ${JSON.stringify(sub)}`, err, sub))
            }

          } else {
            debugD(`_onAdsCommandReceived(): Ads notification received with unknown notificationHandle "${sample.notificationHandle}" - Doing nothing`)
            this.emit('ads-client-error', new ClientException(this, `_onAdsCommandReceived`, `Ads notification received but it has unknown notificationHandle (${sample.notificationHandle}). Use unsubscribe() to save resources.`))
          }
        })
      })
      break


    //-------------- All other ADS commands ---------------
    default:
      //Try to find the callback with received invoke id and call it
      if (this._internals.activeAdsRequests[packet.ams.invokeId]) {
        const adsRequest = this._internals.activeAdsRequests[packet.ams.invokeId]

        //Clear timeout
        clearTimeout(adsRequest.timeoutTimer)

        //Call callback
        adsRequest.callback.call(this, packet)
      }
      else {
        debugD(`_onAdsCommandReceived(): Ads command received with unknown invokeId "${packet.ams.invokeId}" - Doing nothing`)
        this.emit('ads-client-error', new ClientException(this, `_onAdsCommandReceived`, `Ads command received with unknown invokeId "${packet.ams.invokeId}".`, packet))
      }

      break
  }
}













/**
 * Parses received ADS notification data (stamps) from given (byte) Buffer
 * 
 * @param {Buffer} data Buffer that contains ADS notification stamp data
 * 
 * @returns {object} Object that contains the parsed ADS notification
 * 
 * @memberof _LibraryInternals
 */
function _parseAdsNotification(data) {
  let pos = 0
  const packet = {}

  //0..3 Data length
  packet.dataLength = data.readUInt32LE(pos)
  pos += 4

  //4..7 Stamp count
  packet.stampCount = data.readUInt32LE(pos)
  pos += 4

  packet.stamps = []

  //Parse all stamps
  for (let stamp = 0; stamp < packet.stampCount; stamp++) {
    const newStamp = {}

    //0..7 Timestamp (Converting Windows FILETIME to Date)
    newStamp.timeStamp = new Date(new long(data.readUInt32LE(pos), data.readUInt32LE(pos + 4)).div(10000).sub(11644473600000).toNumber())
    pos += 8

    //8..11 Number of samples
    newStamp.count = data.readUInt32LE(pos)
    pos += 4

    newStamp.samples = []

    //Parse all samples for this stamp
    for (let sample = 0; sample < newStamp.count; sample++) {
      const newSample = {}

      //0..3 Notification handle
      newSample.notificationHandle = data.readUInt32LE(pos)
      pos += 4

      //4..7 Data length
      newSample.dataLength = data.readUInt32LE(pos)
      pos += 4

      //8..n Data
      newSample.data = data.slice(pos, pos + newSample.dataLength)
      pos += newSample.dataLength

      newStamp.samples.push(newSample)
    }
    packet.stamps.push(newStamp)
  }

  return packet
}










/**
 * Sends an ADS command with given data to the PLC
 * 
 * @param {number} adsCommand - ADS command to send (see ADS.ADS_COMMAND)
 * @param {Buffer} adsData - Buffer object that contains the data to send
 * @param {number} [targetAdsPort] - Target ADS port (optional) - default is this.settings.targetAdsPort
 * @param {string} [targetAmsNetId] - Target AmsNetID (optional) - default is this.settings.targetAmsNetId
 * 
 * @returns {Promise<object>} Returns a promise (async function)
 * - If resolved, command was sent successfully and response was received. The received reponse is parsed and returned (object)
 * - If rejected, sending, receiving or parsing failed and error info is returned (object)
 * 
 * @memberof _LibraryInternals
 */
function _sendAdsCommand(adsCommand, adsData, targetAdsPort = null, targetAmsNetId = null) {
  return new Promise(async (resolve, reject) => {

    //Check that next free invoke ID is below 32 bit integer maximum
    if (this._internals.nextInvokeId >= ADS.ADS_INVOKE_ID_MAX_VALUE)
      this._internals.nextInvokeId = 0

    //Creating the data packet object
    const packet = {
      amsTcp: {
        command: ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_AMS_CMD,
        commandStr: ADS.AMS_HEADER_FLAG.toString(ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_AMS_CMD)
      },
      ams: {
        targetAmsNetId: (targetAmsNetId == null ? this.connection.targetAmsNetId : targetAmsNetId),
        targetAdsPort: (targetAdsPort == null ? this.connection.targetAdsPort : targetAdsPort),
        sourceAmsNetId: this.connection.localAmsNetId,
        sourceAdsPort: this.connection.localAdsPort,
        adsCommand: adsCommand,
        adsCommandStr: ADS.ADS_COMMAND.toString(adsCommand),
        stateFlags: ADS.ADS_STATE_FLAGS.AdsCommand,
        stateFlagsStr: '',
        dataLength: adsData.byteLength,
        errorCode: 0,
        invokeId: this._internals.nextInvokeId++
      },
      ads: {
        rawData: adsData
      }
    }
    packet.ams.stateFlagsStr = ADS.ADS_STATE_FLAGS.toString(packet.ams.stateFlags)


    debugD(`_sendAdsCommand(): Sending an ads command ${packet.ams.adsCommandStr} (${adsData.byteLength} bytes): %o`, packet)

    //Creating a full AMS/TCP request
    try {
      var request = _createAmsTcpRequest.call(this, packet)
    } catch (err) {
      return reject(new ClientException(this, '_sendAdsCommand()', err))
    }

    //Registering callback for response handling
    this._internals.activeAdsRequests[packet.ams.invokeId] = {
      callback: function (response) {
        debugD(`_sendAdsCommand(): Response received for command ${packet.ams.adsCommandStr} with invokeId ${packet.ams.invokeId}`)

        //Callback is no longer needed, delete it
        delete this._internals.activeAdsRequests[packet.ams.invokeId]

        if (response.ams.error) {
          return reject(new ClientException(this, '_sendAdsCommand()', 'Response with AMS error received', response))
        } else if (response.ads.error) {
          return reject(new ClientException(this, '_sendAdsCommand()', 'Response with ADS error received', response))
        }

        return resolve(response)
      },

      timeoutTimer: setTimeout(function (client) {
        debug(`_sendAdsCommand(): Timeout for command ${packet.ams.adsCommandStr} with invokeId ${packet.ams.invokeId} - No response`)

        //Callback is no longer needed, delete it
        delete client._internals.activeAdsRequests[packet.ams.invokeId]

        //Create a custom "ads error" so that the info is passed onwards
        const adsError = {
          ads: {
            error: true,
            errorCode: -1,
            errorStr: `Timeout - no response in ${client.settings.timeoutDelay} ms`
          }
        }
        return reject(new ClientException(this, '_sendAdsCommand()', `Timeout - no response in ${client.settings.timeoutDelay} ms`, adsError))

      }, this.settings.timeoutDelay, this)
    }

    //Write the data 
    try {
      _socketWrite.call(this, request)
    } catch (err) {
      return reject(new ClientException(this, '_sendAdsCommand()', `Error - Socket is not available`, err))
    }
  })
}








/**
 * Creates an AMS/TCP request from given packet
 * 
 * @param {object} packet Object containing the full AMS/TCP packet
 * 
 * @returns {Buffer} Full created AMS/TCP request as a (byte) Buffer
 * 
 * @memberof _LibraryInternals
 */
function _createAmsTcpRequest(packet) {
  //1. Create ADS data
  const adsData = packet.ads.rawData

  //2. Create AMS header
  const amsHeader = _createAmsHeader.call(this, packet)

  //3. Create AMS/TCP header
  const amsTcpHeader = _createAmsTcpHeader.call(this, packet, amsHeader)

  //4. Create full AMS/TCP packet
  const amsTcpRequest = Buffer.concat([amsTcpHeader, amsHeader, adsData])

  debugD(`_createAmsTcpRequest(): AMS/TCP request created (${amsTcpRequest.byteLength} bytes)`)

  return amsTcpRequest
}










/**
 * Creates an AMS header from given packet
 * 
 * @param {object} packet Object containing the full AMS/TCP packet
 * 
 * @returns {Buffer} Created AMS header as a (byte) Buffer
 * 
 * @memberof _LibraryInternals
 */
function _createAmsHeader(packet) {
  //Allocating bytes for AMS header
  const header = Buffer.alloc(ADS.AMS_HEADER_LENGTH)
  let pos = 0

  //0..5 Target AMSNetId
  Buffer.from(_amsNetIdStrToByteArray(packet.ams.targetAmsNetId)).copy(header, 0)
  pos += ADS.AMS_NET_ID_LENGTH

  //6..8 Target ads port
  header.writeUInt16LE(packet.ams.targetAdsPort, pos)
  pos += 2

  //8..13 Source ads port
  Buffer.from(_amsNetIdStrToByteArray(packet.ams.sourceAmsNetId)).copy(header, pos)
  pos += ADS.AMS_NET_ID_LENGTH

  //14..15 Source ads port
  header.writeUInt16LE(packet.ams.sourceAdsPort, pos)
  pos += 2

  //16..17 ADS command
  header.writeUInt16LE(packet.ams.adsCommand, pos)
  pos += 2

  //18..19 State flags
  header.writeUInt16LE(packet.ams.stateFlags, pos)
  pos += 2

  //20..23 Data length
  header.writeUInt32LE(packet.ams.dataLength, pos)
  pos += 4

  //24..27 Error code
  header.writeUInt32LE(packet.ams.errorCode, pos)
  pos += 4

  //28..31 Invoke ID
  header.writeUInt32LE(packet.ams.invokeId, pos)
  pos += 4

  debugD(`_createAmsHeader(): AMS header created (${header.byteLength} bytes)`)

  if (debugIO.enabled) {
    debugIO(`_createAmsHeader(): AMS header created: %o`, header.toString('hex'))
  }

  return header
}









/**
 * Creates an AMS/TCP header from given packet and AMS header
 * 
 * @param {object} packet Object containing the full AMS/TCP packet
 * @param {Buffer} amsHeader Buffer containing the previously created AMS header
 * 
 * @returns {Buffer} Created AMS/TCP header as a (byte) Buffer
 * 
 * @memberof _LibraryInternals
 */
function _createAmsTcpHeader(packet, amsHeader) {
  //Allocating bytes for AMS/TCP header
  const header = Buffer.alloc(ADS.AMS_TCP_HEADER_LENGTH)
  let pos = 0

  //0..1 AMS command (header flag)
  header.writeUInt16LE(packet.amsTcp.command, pos)
  pos += 2

  //2..5 Data length
  header.writeUInt32LE(amsHeader.byteLength + packet.ams.dataLength, pos)
  pos += 4

  debugD(`_createAmsTcpHeader(): AMS/TCP header created (${header.byteLength} bytes)`)

  if (debugIO.enabled) {
    debugIO(`_createAmsTcpHeader(): AMS/TCP header created: %o`, header.toString('hex'))
  }

  return header
}







/**
 * Writes given message to console if settings.hideConsoleWarnings is false
 * 
 * @param {string} str Message to console.log() 
 * 
 * @memberof _LibraryInternals
 */
function _console(str) {
  if (this.settings.hideConsoleWarnings !== true)
    console.log(`${PACKAGE_NAME}: ${str}`)
}













/**
 * **Helper:** Marges objects together recursively. Used for example at writeSymbol() to combine active values and new (uncomplete) object values
 * 
 * Based on https://stackoverflow.com/a/34749873/8140625 by Salakar and https://stackoverflow.com/a/49727784/8140625
 * 
 * Later modified to work with in both case-sensitive and case-insensitive ways (as the PLC is case-insensitive too). 
 * Also fixed isObjectOrArray to return true only when input is object literal {} or array (https://stackoverflow.com/a/16608074/8140625)
 * 
 * @param {boolean} isCaseSensitive True = Object keys are merged case-sensitively --> target['key'] !== target['KEY'], false = case-insensitively
 * @param {object} target Target object to copy data to
 * @param {...object} sources Source objects to copy data from
 * 
 * @returns {object} Merged object
 * 
 * @memberof _LibraryInternals
 */

function _deepMergeObjects(isCaseSensitive, target, ...sources) {
  if (!sources.length) return target

  const isObjectOrArray = (item) => {
    return (!!item) && ((item.constructor === Object) || Array.isArray(item))
  }

  //Checks if object key exists
  const keyExists = (obj, key, isCaseSensitive) => {
    if (isCaseSensitive === false) {
      return !!Object.keys(obj).find(objKey => objKey.toLowerCase() === key.toLowerCase())
    } else {
      return (obj[key] != null)
    }
  }

  //Returns object value by key
  const getValue = (obj, key, isCaseSensitive) => {
    if (isCaseSensitive === false) {
      return obj[Object.keys(obj).find(objKey => objKey.toLowerCase() === key.toLowerCase())]
    } else {
      return obj[key]
    }
  }

  //Sets object value obj[key] to value - If isCaseSensitive == false, obj[KeY] == obj[key]
  const setValue = (obj, key, value, isCaseSensitive) => {
    if (isCaseSensitive === false) {
      Object.keys(obj).forEach(objKey => {
        if (objKey.toLowerCase() === key.toLowerCase()) {
          obj[objKey] = value
        }
      });
    } else {
      //Case-sensitive is easy
      obj[key] = value
    }
  }

  const source = sources.shift()

  if (isObjectOrArray(target) && isObjectOrArray(source)) {
    for (const key in source) {

      if (isObjectOrArray(source[key])) {
        //If source is object
        if (keyExists(target, key, isCaseSensitive)) {
          //Target has this key, copy value
          setValue(target, key, Object.assign({}, target[key]), isCaseSensitive)
        } else {
          //Target doesn't have this key, add it)
          Object.assign(target, { [key]: {} })
        }
        //As this is an object, go through it recursively
        _deepMergeObjects(isCaseSensitive, getValue(target, key, false), source[key])

      } else {
        //Source is not object

        if (keyExists(target, key, isCaseSensitive)) {
          //Target has this key, copy value
          setValue(target, key, source[key], isCaseSensitive)
        } else {
          //Target doesn't have this key, add it
          Object.assign(target, { [key]: source[key] })
        }
      }
    }
  }

  return _deepMergeObjects(isCaseSensitive, target, ...sources)
}







/**
 * **Helper:** Trims the given PLC string until en mark (\0, 0 byte) is found
 * 
 * @param {string} plcString String to trim
 * 
 * @returns {string} Trimmed string
 * 
 * @memberof _LibraryInternals
 */
function _trimPlcString(plcString) {
  let parsedStr = ''

  for (let i = 0; i < plcString.length; i++) {
    if (plcString.charCodeAt(i) === 0) break

    parsedStr += plcString[i]
  }

  return parsedStr
}






/**
 * **Helper:** Converts byte array (Buffer) to AmsNetId string
 * 
 * @param {Buffer|array} byteArray Buffer/array that contains AmsNetId bytes
 * 
 * @returns {string} AmsNetId as string
 * 
 * @memberof _LibraryInternals
 */
function _byteArrayToAmsNetIdStr(byteArray) {
  return byteArray.join('.')
}




/**
 * **Helper:** Converts AmsNetId string to byte array
 * 
 * @param {string} byteArray String that represents an AmsNetId
 * 
 * @returns {array} AmsNetId as array
 * 
 * @memberof _LibraryInternals
 */
function _amsNetIdStrToByteArray(str) {
  return str.split('.').map(x => parseInt(x))
}





exports.ADS = ADS
exports.Client = Client