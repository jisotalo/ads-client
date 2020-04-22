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

//-------------- Debugs --------------
const debug = require('debug')(PACKAGE_NAME)
const debugD = require('debug')(`${PACKAGE_NAME}:details`)
const debugIO = require('debug')(`${PACKAGE_NAME}:raw-data`)






/**
 * Unofficial Node.js library for connecting to Beckhoff TwinCAT automation systems using ADS protocol
 * 
 * This library is not related to Beckhoff in any way.
 */
class Client {

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
   * @property {boolean} [disableStructPackModeWarning=false] - If true, no warnings are shown even if STRUCTs without pack-mode 1 are read/written - Optional (**default**: false)
   * @property {number} [routerTcpPort=48898] - Target ADS router TCP port - Optional (**default**: 48898)
   * @property {string} [routerAddress=localhost] - Target ADS router IP address/hostname - Optional (**default**: localhost)
   * @property {string} [localAddress='(system default)'] - Local IP address to use, use this to change used network interface if required - Optional (**default**: System default)
   * @property {number} [localTcpPort='(system default)'] - Local TCP port to use for outgoing connections - Optional (**default**: System default)
   * @property {string} [localAmsNetId='(from AMS router)'] - Local AmsNetId to use - Optional (**default**: From AMS router)
   * @property {number} [localAdsPort='(from AMS router)'] - Local ADS port to use - Optional (**default**: From AMS router)
   * @property {number} [timeoutDelay=2000] - Time (milliseconds) after connecting to the router or waiting for command response is canceled to timeout - Optional (**default**: 2000 ms)
   * @property {boolean} [hideConsoleWarnings=false] - If true, no warnings are written to console (=nothing is ever written to console) - Optional (**default**: false)
   *
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
      disableStructPackModeWarning: false,
      routerTcpPort: 48898,
      routerAddress: 'localhost',
      localAddress: null,
      localTcpPort: null,
      localAmsNetId: null,
      localAdsPort: null,
      timeoutDelay: 2000,
      hideConsoleWarnings: false
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
    //Check the required settings
    if (settings.targetAmsNetId == null) {
      throw new ClientException('Client()', 'Required setting "targetAmsNetId" is missing.')
    }
    if (settings.targetAdsPort == null) {
      throw new ClientException('Client()', 'Required setting "targetAdsPort" is missing.')
    }
    
    //Taking the default settings and then adding the user-defined ones
    this.settings = {
      ...Client.defaultSettings(),
      ...settings
    }

    //Loopback address
    if (this.settings.localAmsNetId && this.settings.localAmsNetId.trim().toLowerCase() === 'localhost') {
      this.settings.localAmsNetId = '127.0.0.1.1.1'
    }

    /**
     * Internal variables - Not intended for external use
     * 
     * @readonly
     */
    this._internals = {
      //Socket connection and data receiving
      receiveDataBuffer: Buffer.alloc(0),
      socket: null,

      //Ads communication
      nextInvokeId: 0, //Next invoke ID used for ads request
      amsTcpCallback: null, //Callback used for ams/tcp commands (like port register)
      activeAdsRequests: {}, //Active ADS requests that wait for answer from router
      activeSubscriptions: {}, //Active device notifications
      symbolVersionNotification: null, //Notification handle of the symbol version changed subscription (used to unsubscribe)
      systemManagerStatePoller: null //SetTimeout timer that reads the system manager state (run/config) - This is not available through ADS notifications..
    }
    


    /**
     * 
     * @typedef Metadata
     * @property {object} deviceInfo - Target device info (read after connecting)
     * @property {object} systemManagerState - Target device system manager state (run, config, etc.)
     * @property {object} plcRuntimeState - Target PLC runtime state (run, stop, etc.) (if target port is 851 -> this is TwinCAT 3 runtime 1 status and so on)
     * @property {object} uploadInfo - Contains information of target data types, symbols and so on
     * @property {number} symbolVersion - Active symbol version at target system. Changes when PLC software is updated
     * @property {boolean} allSymbolsCached - True if all symbols are cached (so we know to re-cache all during symbol version change)
     * @property {object} symbols - Object containing all so far cached symbols
     * @property {boolean} allDataTypesCached - True if all data types are cached (so we know to re-cache all during symbol version change)
     * @property {object} dataTypes - Object containing all so far cached data types
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
      localAmsNetId: null,
      localAdsPort: null,
      targetAmsNetId: this.settings.targetAmsNetId,
      targetAdsPort: this.settings.targetAdsPort
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
    return new Promise(async (resolve, reject) => {

      if (this._internals.socket !== null) {
        debug(`connect(): Socket already assigned`)
        return reject(new ClientException('connect()', 'Connection is already opened. Close the connection first using disconnect()'))
      }

      debug(`connect(): Starting to connect ${this.settings.routerAddress}:${this.settings.routerTcpPort}`)

      //Creating a socket and setting it up
      const socket = new net.Socket()
      socket.setNoDelay(true) //Sends data without delay


      //Listening error event during connection
      socket.once('error', err => {
        debug('connect(): Socket connect failed: %O', err)

        //Remove all events from socket
        socket.removeAllListeners()

        reject(new ClientException('connect()', `Connection to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed (socket error ${err.errno})`, err))
      })



      //Listening close event during connection
      socket.once('close', hadError => {
        debug(`connect(): Socket closed by remote, connection failed`)

        //Remove all events from socket
        socket.removeAllListeners()

        reject(new ClientException('connect()', `Connection to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed - socket closed by remote (hadError = ${hadError})`))
      })


      //Listening timeout event during connection
      socket.once('timeout', hadError => {
        debug(`connect(): Socket timeout`)

        //No more timeout needed
        socket.setTimeout(0);

        socket.destroy()
        
        //Remove all events from socket
        socket.removeAllListeners()

        reject(new ClientException('connect()', `Connection to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed (timeout) - No response from router in ${this.settings.timeoutDelay} ms`))
      })


      //Listening end event during connection
      socket.once('end', () => {
        debug(`connect(): Socket connection ended by remote, connection failed.`)

        //Remove all events from socket
        socket.removeAllListeners()


        if (this.settings.localAdsPort != null)
          reject(new ClientException('connect()', `Connection to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed - socket ended by remote (is the given local ADS port ${this.settings.localAdsPort} already in use?)`))
        else
          reject(new ClientException('connect()', `Connection to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed - socket ended by remote`))
      })

      //Listening data event
      socket.on('data', data => {
        _socketReceive.call(this, data)
      })

      //Listening for connect event
      socket.once('connect', async () => {
        debug(`connect(): Socket connection established to ${this.settings.routerAddress}:${this.settings.routerTcpPort}`)

        //No more timeout needed
        socket.setTimeout(0);

        this._internals.socket = socket
        this.connection.connected = true

        //Try to register an ADS port
        try {
          let res = await _registerAdsPort.call(this)

          this.connection.connected = true
          this.connection.localAmsNetId = res.amsTcp.data.localAmsNetId
          this.connection.localAdsPort = res.amsTcp.data.localAdsPort

          debug(`connect(): ADS port registered from router. We are ${this.connection.localAmsNetId}:${this.connection.localAdsPort}`)
        } catch (err) {

          socket.destroy()
          //Remove all events from socket
          socket.removeAllListeners()
          reject(new ClientException('connect()', `Registering ADS port from router failed`, err))
        }

        //Remove the socket events that were used only during connect()
        socket.removeAllListeners('error')
        socket.removeAllListeners('close')
        socket.removeAllListeners('end')

        try {
          //Try to read system manager state - If it's OK, connection is successful to the target
          await this.readSystemManagerState()

        } catch (err) {
          this.connection.connected = false
          this.connection.localAmsNetId = null
          this.connection.localAdsPort = null
          
          //Remove all events from socket
          socket.removeAllListeners()

          reject(new ClientException('connect()', `Connection failed: ${err.message}`, err))
        }

        try {
          //Try to initialize internal system to the target PLC runtime
          //If it fails, we are still connected
          await _reInitializeInternals.call(this)

        } catch (err) {
          if(this.metaData.systemManagerState.adsState !== ADS.ADS_STATE.Run)
            _console.call(this, `WARNING: Target is connected but not in RUN mode (mode: ${this.metaData.systemManagerState.adsStateStr}) - connecting to runtime (ADS port ${this.settings.targetAdsPort}) failed`)
          else
            _console.call(this, `WARNING: Target is connected but connecting to runtime (ADS port ${this.settings.targetAdsPort}) failed - Check the port number and that the target system is state (${this.metaData.systemManagerState.adsStateStr}) is valid.`)
        }

        //Anyways, we are connected to the server
        resolve(this.connection)
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
        reject(new ClientException('connect()', `Opening socket connection to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed`, err))
      }
    })
  }










  /**
   * Unsubscribes all notifications, unregisters ADS port from router (if it was registered) 
   * and disconnects target system and ADS router 
   * 
   * @returns {Promise} Returns a promise (async function)
   * - If resolved, disconnect was successful 
   * - If rejected, connection is still closed but something went wrong during disconnecting and error info is returned
   */
  disconnect() {
    return new Promise(async (resolve, reject) => {
      debug(`disconnect(): Starting to close connection`)

      let error = null

      try {
        await this.unsubscribeAll()
      } catch (err) {
        error = new ClientException('disconnect()', err)
      }

      //Clear system manager state poller
      clearTimeout(this._internals.systemManagerStatePoller)

      try {
        await _unsubscribeAllInternals.call(this)
      } catch (err) {
        error = new ClientException('disconnect()', err)
      }

      try {
        await _unregisterAdsPort.call(this)

        //Done
        this.connection.connected = false
        this.connection.localAdsPort = null
        this._internals.socket.removeAllListeners()
        this._internals.socket = null

        debug(`disconnect(): Connection closed successfully`)

      } catch (err) {
        //Force socket close
        this._internals.socket.destroy()

        this.connection.connected = false
        this.connection.localAdsPort = null
        this._internals.socket = null

        error = new ClientException('disconnect()', err)
        
        debug(`disconnect(): Connection closing failed, connection forced to close`)
      }

      if (error !== null) {
        error.message = `Disconnected but something failed: ${error.message}`
        return reject(error)
      }
      resolve()
    })
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
      debug(`readDeviceInfo(): Reading device info`)
    
      _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadDeviceInfo, Buffer.alloc(0), ADS.ADS_RESERVED_PORTS.SystemService)
        .then((res) => {
          debug(`readDeviceInfo(): Device info read successfully`)
          this.metaData.deviceInfo = res.ads.data
          resolve(this.metaData.deviceInfo)
        })
        .catch((res) => {
          debug(`readDeviceInfo(): Device info read failed`)
          
          reject(new ClientException('readDeviceInfo()', 'Reading device info failed', res))
        })
    })
  }



  /**
    * Reads target device system status (run/config/etc)
    * Uses ADS port 10000, which is system manager
    * TODO: Somehow we would like to subscribe system status changes, but notifications won't work -> polling?
    * 
    * @returns {Promise<object>} Returns a promise (async function)
    * - If resolved, system status is returned (object)
    * - If rejected, reading failed and error info is returned (object)
    */
  readSystemManagerState() {
    return new Promise(async (resolve, reject) => {
      debug(`readSystemManagerState(): Reading device system manager state`)

      _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadState, Buffer.alloc(0), ADS.ADS_RESERVED_PORTS.SystemService)
        .then((res) => {
          debug(`readSystemManagerState(): Device system state read successfully`)
          this.metaData.systemManagerState = res.ads.data

          resolve(this.metaData.systemManagerState)
        })
        .catch((res) => {
          debug(`readSystemManagerState(): Device system manager state read failed`)
          reject(new ClientException('readSystemManagerState()', 'Device system manager state read failed', res))
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
  readPlcRuntimeState() {
    return new Promise(async (resolve, reject) => {
      debug(`readPlcRuntimeState(): Reading PLC runtime (${this.connection.targetAdsPort}) state`)

      _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadState, Buffer.alloc(0))
        .then((res) => {
          debug(`readPlcRuntimeState(): Device state read successfully`)
          this.metaData.plcRuntimeState = res.ads.data
          
          resolve(this.metaData.plcRuntimeState)
        })
        .catch((res) => {
          debug(`readPlcRuntimeState(): Reading PLC runtime (${this.connection.targetAdsPort}) state failed`)
          reject(new ClientException('readPlcRuntimeState()', `Reading PLC runtime (${this.connection.targetAdsPort}) state failed`, res))
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
      debug(`readSymbolVersion(): Reading symbol version`)

      this.readRaw(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolVersion, 0, 1)
        .then((res) => {
          debug(`readSymbolVersion(): Symbol version read successfully`)

          this.metaData.symbolVersion = res.readUInt8(0)
          resolve(this.metaData.symbolVersion)
        })
        .catch((res) => {
          debug(`readSymbolVersion(): Symbol version read failed`)
          reject(new ClientException('readSymbolVersion()', `Reading PLC symbol version failed`, res))
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
      data.writeUInt32LE(24, pos) //todo add constant
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
          reject(new ClientException('readUploadInfo()', `Reading PLC upload info failed`, res))
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

      debug(`readAndCacheSymbols(): Starting to download symbols`)

      //First, download most recent upload info (=symbol count & byte length)
      try {
        debug(`readAndCacheSymbols(): Updating upload info`)

        await this.readUploadInfo()
      } catch (err) {
        if (this.metaData.uploadInfo === null) {
          debug(`readAndCacheSymbols(): Updating upload info failed, no old data available`)
          return reject(new ClientException('readAndCacheSymbols()', `Downloading symbols to cache failed (updating upload info failed)`, err))
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
          return reject(new ClientException('readAndCacheSymbols()', `Downloading symbols to cache failed`, res))
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
      debug(`readAndCacheDataTypes(): Reading all data types`)

      //First, download most recent upload info (=symbol count & byte length)
      try {
        debugD(`readAndCacheDataTypes(): Updating upload info`)

        await this.readUploadInfo()
      } catch (err) {
        if (this.metaData.uploadInfo === null) {
          debug(`readAndCacheDataTypes(): Updating upload info failed, no old data available`)
          return reject(new ClientException('readAndCacheDataTypes()', `Downloading data types to cache failed (updating upload info failed)`, err))
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
          reject(new ClientException('readAndCacheDataTypes()', `Downloading data types to cache failed`, res))
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
      //Wrapper for _getDataTypeRecursive
      _getDataTypeRecursive.call(this, dataTypeName)
        .then(res => resolve(res))
        .catch(err => reject(new ClientException('getDataType()', `Finding data type ${dataTypeName} failed`, err)))
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
      const varName = variableName.trim().toLowerCase()

      debug(`getSymbolInfo(): Symbol info requested for ${variableName}`)
    
      //First, check already downloaded symbols
      if (this.metaData.symbols[varName]) {
        debugD(`getSymbolInfo(): Symbol info found from cache for ${variableName}`)

        return resolve(this.metaData.symbols[varName])
      } else {
        //Read from PLC and cache it
        _readSymbolInfo.call(this, variableName)
          .then((symbol) => {
            this.metaData.symbols[varName] = symbol

            debugD(`getSymbolInfo(): Symbol info read and cached from PLC for ${variableName}`)
            return resolve(symbol)
          })
          .catch(err => reject(new ClientException('getSymbolInfo()', `Reading symbol info for ${variableName} failed`, err))) 
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
      debug(`readSymbol(): Reading symbol ${variableName}`)


      //1. Get symbol from cache or from PLC
      let symbol = {}
      try {
        debugD(`readSymbol(): Reading symbol info for ${variableName}`)

        symbol = await this.getSymbolInfo(variableName)
      } catch (err) {
        return reject(new ClientException('readSymbol()', `Reading symbol ${variableName} failed: Reading symbol info failed`, err))
      }

      //2. Read the value
      let value = null
      try {
        debugD(`readSymbol(): Reading symbol value for ${variableName}`)

        value = await this.readRaw(symbol.indexGroup, symbol.indexOffset, symbol.size)
      } catch (err) {
        return reject(new ClientException('readSymbol()', `Reading symbol ${variableName} failed: Reading value failed`, err))
      }
    
      //3. Create the data type
      let dataType = {}
      try {
        debugD(`readSymbol(): Reading symbol data type for ${variableName}`)

        dataType = await this.getDataType(symbol.type)
      } catch (err) {
        return reject(new ClientException('readSymbol()', `Reading symbol ${variableName} failed: Reading data type failed`, err))
      }
          
      //4. Parse the data to javascript object
      let data = {}
      try {
        debugD(`readSymbol(): Parsing symbol data for ${variableName}`)

        data = _parsePlcDataToObject.call(this, value, dataType)
      } catch (err) {
        return reject(new ClientException('readSymbol()', `Reading symbol ${variableName} failed: Parsing data type to Javascript failed`, err))
      }

      debug(`readSymbol(): Reading symbol for ${variableName} done`)

      resolve({
        value: data,
        type: dataType
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
      debug(`writeSymbol(): Writing symbol ${variableName}`)


      //1. Get symbol from cache or from PLC
      let symbol = {}
      try {
        debugD(`writeSymbol(): Reading symbol info for ${variableName}`)

        symbol = await this.getSymbolInfo(variableName)
      } catch (err) {
        return reject(new ClientException('writeSymbol()', `Writing symbol ${variableName} failed: Reading symbol info failed`, err))
      }

      //2. Create full data type recursively
      let dataType = {}
      try {
        debugD(`writeSymbol(): Reading symbol data type for ${variableName}`)

        dataType = await this.getDataType(symbol.type)
      } catch (err) {
        return reject(new ClientException('writeSymbol()', `Writing symbol ${variableName} failed: Reading data type failed`, err))
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

            return reject(new ClientException('writeSymbol()',`Writing symbol ${variableName} failed: ${err.message} - Set writeSymbol() 3rd parameter (autoFill) to true to allow uncomplete objects`))
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
            return reject(new ClientException('writeSymbol()', `Writing symbol ${variableName} failed: Parsing the Javascript object to PLC failed`, err))
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
        return reject(new ClientException('writeSymbol()', `Writing symbol ${variableName} failed: Writing the data failed`, err))
      }

      debug(`writeSymbol(): Writing symbol ${variableName} done`)

      resolve({
        value: value,
        type: dataType
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
   * @param {number} cycleTime - How often the PLC checks for value changes (milliseconds) - Default 250 ms
   * @param {boolean} onChange - If true (default), PLC sends the notification only when value has changed. If false, the value is sent every cycleTime milliseconds
   * @param {number} initialDelay - How long the PLC waits for sending the value - default 0 ms (immediately)
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, subscribing is successful and notification data is returned (object)
   * - If rejected, subscribing failed and error info is returned (object)
   */
  subscribe(variableName, callback, cycleTime = 250, onChange = true, initialDelay = 0) {
    return new Promise(async (resolve, reject) => {
      debug(`subscribe(): Subscribing to ${variableName}`)

      _subscribe.call(
        this,
        variableName,
        callback,
        {
          transmissionMode: (onChange === true ? ADS.ADS_TRANS_MODE.OnChange : ADS.ADS_TRANS_MODE.Cyclic),
          cycleTime: cycleTime,
          maximumDelay: initialDelay
        }
      )
      .then(res => resolve(res))
      .catch(err => reject(new ClientException('subscribe()', `Subscribing to ${variableName} failed`, err)))
    })
  }




  /**
   * Subscribes to variable value change notifications by index group and index offset
   * 
   * @param {number} indexGroup - Variable index group in the PLC
   * @param {number} indexOffset - Variable index offset in the PLC
   * @param {number} size - Variable size in the PLC (enter 0xFFFFFFFF if not known)
   * @param {subscriptionCallback} callback - Callback function that is called when notification is received
   * @param {number} cycleTime - How often the PLC checks for value changes (milliseconds) - Default 250 ms
   * @param {boolean} onChange - If true (default), PLC sends the notification only when value has changed. If false, the value is sent every cycleTime milliseconds
   * @param {number} initialDelay - How long the PLC waits for sending the value - default 0 ms (immediately)
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, subscribing is successful and notification data is returned (object)
   * - If rejected, subscribing failed and error info is returned (object)
   */
  subscribeRaw(indexGroup, indexOffset, size, callback, cycleTime = 250, onChange = true, initialDelay = 0) {
    return new Promise(async (resolve, reject) => {
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
      .catch(err => reject(new ClientException('subscribeRaw()', `Subscribing to ${JSON.stringify(target)} failed`, err)))
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

      const sub = this._internals.activeSubscriptions[notificationHandle]

      if (!sub) {
        debug(`unsubscribe(): Unsubscribing failed - Unknown notification handle ${notificationHandle}`)
        return reject(new ClientException('unsubscribe()', `Unsubscribing from notification handle "${notificationHandle}" failed: Unknown handle`))
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
          reject(new ClientException('unsubscribe()', `Unsubscribing from notification ${JSON.stringify(this._internals.activeSubscriptions[notificationHandle].target)} failed`, res))
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
      debug(`unsubscribeAll(): Unsubscribing from all notifications`)

      let firstError = null, unSubCount = 0

      for (let sub in this._internals.activeSubscriptions) {
        try {
          //This method won't unsubscribe internal notification handles
          if (this._internals.activeSubscriptions[sub].internal === true) continue
          
          await this._internals.activeSubscriptions[sub].unsubscribe()
          unSubCount++

        } catch (err) {
          debug(`unsubscribeAll(): Unsubscribing from notification ${JSON.stringify(this._internals.activeSubscriptions[sub])} failed`)
          
          firstError = new ClientException('unsubscribeAll()', err)
        }
      }
      
      if (firstError != null) {
        debug(`unsubscribeAll(): Unsubscribed from ${unSubCount} notifications but unsubscribing from some notifications failed failed`)

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
      debug(`readRawByHandle(): Reading data using handle "${handle}" ${(size !== 0xFFFFFFFF ? `and size of ${size} bytes` : ``)}`)

      if (handle == null) {
        return reject(new ClientException('readRawByHandle()', `Required parameter handle is not assigned`))
      } else if (typeof handle === 'object' && handle.handle && handle.size) {
        size = handle.size
        handle = handle.handle
      }

      this.readRaw(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolValueByHandle, handle, size)
        .then(res => resolve(res))
        .catch(err => reject(new ClientException('readRawByHandle()', `Reading data using handle "${handle}"`, err)))
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
      if (variableName == null) {
        return reject(new ClientException('readRawByName()', `Required parameter variableName is not assigned`))
      }
    
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
          reject(new ClientException('readRawByName()', `Reading ${variableName} failed`, res))
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
      if (symbol == null) {
        return reject(new ClientException('readRawBySymbol()', `Required parameter symbol is not assigned`))
      }

      this.readRaw(symbol.indexGroup, symbol.indexOffset, symbol.size)
        .then(res => resolve(res))
        .catch(err => reject(new ClientException('readRawBySymbol()', err)))
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
   * 
   * @returns {Promise<Buffer>} Returns a promise (async function)
   * - If resolved, reading was successful and data is returned (Buffer)
   * - If rejected, reading failed and error info is returned (object)
   */
  readRaw(indexGroup, indexOffset, size) {
    return new Promise(async (resolve, reject) => {

      if (indexGroup == null || indexOffset == null || size == null) {
        return reject(new ClientException('readRaw()', `Some of parameters (indexGroup, indexOffset, size) are not assigned`))
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
      
      _sendAdsCommand.call(this, ADS.ADS_COMMAND.Read, data)
        .then((res) => {
          debug(`readRaw(): Data read - ${res.ads.data.byteLength} bytes from ${JSON.stringify({ indexGroup, indexOffset })}`)
          
          resolve(res.ads.data)
        })
        .catch((res) => {
          debug(`readRaw(): Reading data from ${JSON.stringify({ indexGroup, indexOffset, size })} failed: %o`, res)
          reject(new ClientException('readRaw()', `Reading data failed`, res))
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
      if (handle == null || dataBuffer == null) {
        return reject(new ClientException('writeRawByHandle()', `Some of required parameters (handle, dataBuffer) are not assigned`))

      } else if (!(dataBuffer instanceof Buffer)) {
        return reject(new ClientException('writeRawByHandle()', `Required parameter dataBuffer is not a Buffer type`))

      } else if (typeof handle === 'object' && handle.handle) {
        handle = handle.handle
      } 

      debug(`writeRawByHandle(): Writing ${dataBuffer.byteLength} bytes of data using handle "${handle}"`)

      return this.writeRaw(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolValueByHandle, handle, dataBuffer)
        .then(res => resolve(res))
        .catch(err => reject(new ClientException('writeRawByHandle()', err)))
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
      if (symbol == null || dataBuffer == null) {
        return reject(new ClientException('writeRawBySymbol()', `Some of required parameters (symbol, dataBuffer) are not assigned`))

      } else if (!(dataBuffer instanceof Buffer)) {
        return reject(new ClientException('writeRawBySymbol()', `Required parameter dataBuffer is not a Buffer type`))
      }

      this.writeRaw(symbol.indexGroup, symbol.indexOffset, dataBuffer)
        .then(res => resolve(res))
        .catch(err => reject(new ClientException('writeRawBySymbol()', err)))
    })
  }







  /**
   * Writes (raw byte) data to PLC with given index group and index offset
   * 
   * @param {number} indexGroup - Variable index group in the PLC
   * @param {number} indexOffset - Variable index offset in the PLC
   * @param {Buffer} dataBuffer - Buffer object that contains the data (and byteLength is acceptable)
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, writing was successful
   * - If rejected, writing failed and error info is returned (object)
   */
  writeRaw(indexGroup, indexOffset, dataBuffer) {
    return new Promise(async (resolve, reject) => {

      if (indexGroup == null || indexOffset == null || dataBuffer == null) {
        return reject(new ClientException('writeRaw()', `Some of parameters (indexGroup, indexOffset, dataBuffer) are not assigned`))

      } else if (!(dataBuffer instanceof Buffer)) {
        return reject(new ClientException('writeRaw()', `Required parameter dataBuffer is not a Buffer type`))
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

      
      _sendAdsCommand.call(this, ADS.ADS_COMMAND.Write, data)
        .then((res) => {
          debug(`writeRaw(): Data written: ${dataBuffer.byteLength} bytes of data to ${JSON.stringify({ indexGroup, indexOffset })}`)
          
          resolve()
        })
        .catch((res) => {
          debug(`writeRaw(): Writing ${dataBuffer.byteLength} bytes of data to ${JSON.stringify({ indexGroup, indexOffset })} failed %o`, res)
          reject(new ClientException('writeRaw()', `Writing data failed`, res))
        })
    })
  }
  



  




  /**
   * Creates an ADS variable handle to given PLC variable. 
   * 
   * Using the handle, read and write operations are possible to that variable with readRawByHandle() and writeRawByHandle()
   * 
   * @param {string} variableName Variable name in the PLC (full path) - Example: 'MAIN.SomeStruct.SomeValue' 
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, creating handle was successful and handle, size and data type are returned (object)
   * - If rejected, creating failed and error info is returned (object)
   */
  createVariableHandle(variableName) {
    return new Promise(async (resolve, reject) => {
      if (variableName == null) {
        return reject(new ClientException('createVariableHandle()', `Parameter variableName is not assigned`))
      }

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
          result.type =  _trimPlcString(iconv.decode(data.slice(pos, pos + dataTypeNameLength + 1), 'cp1252'))

          debug(`createVariableHandle(): Handle created and size+type obtained for ${variableName}: %o`, result)

          resolve(result)
        })
        .catch((res) => {
          debug(`createVariableHandle(): Creating handle to ${variableName} failed: %o`, res)
          reject(new ClientException('createVariableHandle()', `Creating handle to ${variableName} failed`, res))
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
      if (handle == null) {
        return reject(new ClientException('deleteVariableHandle()', `Parameter handle is not assigned`))
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
          reject(new ClientException('createVariableHandle()', `Deleting vaiable handle failed`, err))
        })
    })
  }
}



/**
 * Own exception class used for Client errors
 * 
 * Derived from Error but added innerException and ADS error information
 * 
 * @class
 */
class ClientException extends Error{


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
   * @param {string} sender The method name that threw the error
   * @param {string|Error|ClientException} messageOrError Error message or another Error/ClientException instance
   * @param {...*} errData Inner exceptions, AMS/ADS responses or any other metadata
   */
  constructor(sender, messageOrError, ...errData) {

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
      this.stack = (new Error(message)).stack
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
        let message_lines =  (this.message.match(/\n/g)||[]).length + 1
        this.stack = this.stack.split('\n').slice(0, message_lines+1).join('\n') + '\n' +
                 this.getInnerException().stack

      } else if (data instanceof Error && this.getInnerException == null) {
        
        //Error -> Add it's message to our message
        this.message += ` (${data.message})`
        this.getInnerException = () => data
        
        //Modifying the stack trace so it contains all previous ones too
        //Source: Matt @ https://stackoverflow.com/a/42755876/8140625
        let message_lines =  (this.message.match(/\n/g)||[]).length + 1
        this.stack = this.stack.split('\n').slice(0, message_lines+1).join('\n') + '\n' +
                 this.getInnerException().stack

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
    
    this._internals.amsTcpCallback = (res) => {
      this._internals.amsTcpCallback = null
      
      debugD(`_registerAdsPort(): ADS port registered, assigned AMS address is ${res.amsTcp.data.localAmsNetId}:${res.amsTcp.data.localAdsPort}`)
    
      return resolve(res)
    }

    _socketWrite.call(this, packet)
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

    if (this.settings.localAdsPort) {
      debug(`_unregisterAdsPort(): Local AmsNetId and ADS port manually given so no need to unregister`)
    
      this._internals.socket.end(() => {
        debugD(`_unregisterAdsPort(): Socket closed`)
        this._internals.socket.destroy()
        debugD(`_unregisterAdsPort(): Socket destroyed`)
      })
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
    
    this._internals.socket.once('timeout', (error) => {
      debugD(`_unregisterAdsPort(): Timeout happened during port unregister. Closing connection anyways.`)
      this._internals.socket.end(() => {
        debugD(`_unregisterAdsPort(): Socket closed after timeout`)
        this._internals.socket.destroy()
        debugD(`_unregisterAdsPort(): Socket destroyed after timeout`)
      })
    })

    //When socket emits close event, the ads port is unregistered and connection closed
    this._internals.socket.once('close', function (hadError) {
      debugD(`_unregisterAdsPort(): Ads port unregistered and socket connection closed.`)
      resolve()
    })

    //Sometimes close event is not received, so resolve already here
    this._internals.socket.once('end', function () {
      debugD(`_unregisterAdsPort(): Socket connection ended. Connection closed.`)
      resolve()
    })

    _socketWrite.call(this, buffer)
  })
}











/**
 * Initializes internal subscriptions and caches symbols/datatypes if required
 *  
 * @throws {Error} If failed, error is thrown
 * 
 * @memberof _LibraryInternals
 */
async function _reInitializeInternals() {
  try {
    await _unsubscribeAllInternals.call(this)

    //Read device status and subscribe to its changes
    await this.readPlcRuntimeState()
    await _subcribeToPlcRuntimeStateChanges.call(this)

    //Read symbol version and subscribe to its changes
    if (!this.settings.disableSymbolVersionMonitoring) await this.readSymbolVersion()
    if (!this.settings.disableSymbolVersionMonitoring) await _subscribeToSymbolVersionChanges.call(this)

    //Cache data 
    if (this.settings.readAndCacheSymbols) await this.readAndCacheSymbols()
    if (this.settings.readAndCacheDataTypes) await this.readAndCacheDataTypes()
    
  } catch (err) {/*
    //If we get ADS error and target port not found
    if (err.errorType === 'ADS error' && err.errorCode === 6) {
      if (this.metaData.systemManagerState.adsStateStr === 'Run') {
        //PLC system is running
        err.message = `System was connected but target port ${this.connection.targetAdsPort} is not found - Is the PLC software downloaded? - ADS error 6 (Target port not found)`
      } else {
        //PLS system is not in RUN mode
        err.message = `System was connected but system is not in RUN mode (mode: ${this.metaData.systemManagerState.adsStateStr}) and target port ${this.connection.targetAdsPort} not found - ADS error 6 (Target port not found)`
      }
    }*/
    throw err
  }
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

    debug(`_onSymbolVersionChanged(): Finished`)
  }
  else {
    debug(`_onSymbolVersionChanged(): Symbol version received (not changed). Version is ${version}`)
  }
}






/**
 * Starts a poller that reads system manager state 
 * 
 * @memberof _LibraryInternals
 */
function _startSystemManagerStatePoller() {  
  if(this._internals.systemManagerStatePoller != null)
    clearTimeout(this._internals.systemManagerStatePoller)

  this._internals.systemManagerStatePoller = setTimeout(async () => {
    const oldState = this.metaData.systemManagerState

    try {
      await this.readSystemManagerState()

      console.log(this.metaData.systemManagerState)
    } catch (err) {
      console.log('_startSystemManagerStatePoller failed')
    }

    //Start again
    _startSystemManagerStatePoller.call(this)

  }, 5000)
}












/**
 * Subscribes to PLC runtime state changes
 * 
 * @memberof _LibraryInternals
 */
function _subcribeToPlcRuntimeStateChanges() {
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
 * Called when AMS router status has changed (example: TwinCAT changes from Config to Run etc)
 * 
 * @param data Buffer that contains the new router state
 * 
 * @memberof _LibraryInternals
 */
async function _onRouterStateChanged(data) {
  const state = data.amsTcp.data.routerState
  debug(`_onRouterStateChanged(): AMS router state has changed from ${this.metaData.routerState.stateStr} to ${ADS.AMS_ROUTER_STATE.toString(state)} (${state})`)
  
  this.metaData.routerState = {
    state: state,
    stateStr: ADS.AMS_ROUTER_STATE.toString(state)
  }

  //If state has changed to start then re-initialize everything
  if (this.metaData.routerState === ADS.AMS_ROUTER_STATE.START) {
    try {
      await _reInitializeInternals.call(this)
    } catch {

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
  
  if (this.metaData.plcRuntimeState.adsState !== state.adsState) {
    debug(`_onPlcRuntimeStateChanged(): PLC runtime state changed from ${this.metaData.plcRuntimeState.adsStateStr} to ${state.adsStateStr}`)
  }
  if (this.metaData.plcRuntimeState.deviceState !== state.deviceState) {
    debug(`_onPlcRuntimeStateChanged(): PLC runtime state (deviceState) changed from ${this.metaData.plcRuntimeState.deviceState} to ${state.deviceState}`)
  } 

  this.metaData.plcRuntimeState = state
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
          return reject(new ClientException('_subscribe()', `Target is an object but some of the required values (indexGroup, indexOffset) are not assigned`))

        } else if (target.size == null) {
          target.size = 0xFFFFFFFF
        }
        symbolInfo = target

      //Otherwise we should download symbol info by target, which should be variable name
      } else if(typeof target === 'string') {
        try {
          symbolInfo = await this.getSymbolInfo(target)
        } catch (err) {
          return reject(new ClientException('_subscribe()', err))
        }
      } else {
        return reject(new ClientException('_subscribe()', `Given target parameter is unknown type`))
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
              if (this.symbolInfo.type) {
                const dataType = await client.getDataType(this.symbolInfo.type)
                const data = _parsePlcDataToObject.call(client, value, dataType)
                
                this.lastValue = data

                return {
                  value: data,
                  timeStamp: null, //Added later
                  type: dataType
                }
              }

              //If we don't know the data type
              this.lastValue = value
                
              return {
                value: value,
                timeStamp: null, //Added later
                type: null
              }
            }
          }

          this._internals.activeSubscriptions[newSub.notificationHandle] = newSub
          
          resolve(newSub)
        })
        .catch((res) => {
          debug(`_subscribe(): Subscribing to %o failed: %o`, target, res)
          reject(new ClientException('_subscribe()', `Subscribing to ${JSON.stringify(target)} failed`, res))
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
        debug(`_unsubscribeAllInternals(): Unsubscribing from notification ${JSON.stringify(this._internals.activeSubscriptions[sub])} failed`)
        firstError = new ClientException('_unsubscribeAllInternals()', err)
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

  //24..27 Data type (AdsDataType)
  dataType.dataType = data.readUInt32LE(pos)
  dataType.dataTypeStr = ADS.ADS_DATA_TYPES.toString(dataType.dataType)
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

    array.startIndex = data.readUInt32LE(pos)
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

  //If flags contain MethodInfos (TwinCAT.Ads.dll: AdsMethodEntry)
  if (dataType.flagsStr.includes('MethodInfos')) {
    dataType.methodCount = data.readUInt16LE(pos)
    pos += 2

    //Methods
    dataType.methods = []
    for (let i = 0; i < dataType.methodCount; i++) {
      //Get method length
      let len = data.readUInt32LE(pos)
      pos += 4

      //Lets skip the method parsing for now
      pos += (len - 4)
    }
  }

  //If flags contain Attributes (TwinCAT.Ads.dll: AdsAttributeEntry)
  //Attribute is for example, a pack-mode attribute above struct
  if (dataType.flagsStr.includes('Attributes')) {
    dataType.attributeCount = data.readUInt16LE(pos)
    pos += 2

    //Attributes
    dataType.attributes = []
    for (let i = 0; i < dataType.attributeCount; i++) {
      let attr = {}

      //Name length
      let nameLen = data.readUInt8(pos)
      pos += 1

      //Value length
      let valueLen = data.readUInt8(pos)
      pos += 1

      //Name
      attr.name = _trimPlcString(data.slice(pos, pos + nameLen + 1).toString('ascii'))
      pos += (nameLen + 1)

      //Value
      attr.value = _trimPlcString(data.slice(pos, pos + valueLen + 1).toString('ascii'))
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
      let enumInfo = { }
      

      //Name length
      let nameLen = data.readUInt8(pos)
      pos += 1

      //Name
      enumInfo.name = _trimPlcString(data.slice(pos, pos + nameLen + 1).toString('ascii'))
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
  symbol.dataType = data.readUInt32LE(pos)
  symbol.dataTypeStr = ADS.ADS_DATA_TYPES.toString(symbol.dataType)
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
  symbol.name = _trimPlcString(data.toString('ascii', pos, pos + symbol.nameLength + 1))
  pos += symbol.nameLength + 1

  //...... Symbol type
  symbol.type = _trimPlcString(data.toString('ascii', pos, pos + symbol.typeLength + 1))
  pos += symbol.typeLength + 1
  
  //...... Symbol comment
  symbol.comment = _trimPlcString(data.toString('ascii', pos, pos + symbol.commentLength + 1))
  pos += symbol.commentLength + 1

  //The rest of the data would contain ArrayInfo, TypeGuid, Attributes and reserved bytes
  //Skipping for now
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
    data.write(variableName, pos, variableName.length, 'ascii')
    pos += variableName.length

    _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadWrite, data)
      .then((res) => {
        //Success - NOTE: We need to skip the data length (4 bytes) as the _parseSymbolInfo requires so
        debugD(`_readSymbolInfo(): Reading symbol info for ${variableName} successful`)
      
        resolve(_parseSymbolInfo.call(this, res.ads.data.slice(4)))
      })
      .catch((res) => {
        debug(`_readSymbolInfo(): Reading symbol info for ${variableName} failed: %o`, res)
        return reject(new ClientException('_readSymbolInfo()', `Reading symbol information for ${variableName} failed`, res))
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

    if (dataType.isStructWithoutPackMode1 && !this.settings.disableStructPackModeWarning && !isArraySubItem) {
      _console.call(this, `WARNING: PLC data type ${dataType.type} is a STRUCT and has no attribute {attribute 'pack_mode' := '1'} above it's definition -> Written data may be corrupted depending on the struct layout. Disable this warning with setting 'disableStructPackModeWarning: true'`)
    }
      
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
      buffer = Buffer.concat([buffer, bufferedData]) //TODO: optimize, concat is not a good way
    }

  //Array - Go through each array subitem
  } else if (dataType.arrayData.length > 0 && !isArraySubItem) {
    for (let i = 0; i < dataType.arrayData[0].length; i++) {      
      //Recursively parse array subitems
      const bufferedData = _parseJsObjectToBuffer.call(this, value[i], dataType, `${objectPathStr}.${dataType.name}[${dataType.arrayData[0].startIndex + i}]`, true)

      buffer = Buffer.concat([buffer, bufferedData]) //TODO: optimize, concat is not a good way
      }

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

    if (dataType.isStructWithoutPackMode1 && !this.settings.disableStructPackModeWarning) {
      _console.call(this, `WARNING: PLC data type ${dataType.type} is a STRUCT and has no attribute {attribute 'pack_mode' := '1'} above it's definition -> Read data may be corrupted depending on the struct layout. Disable this warning with setting 'disableStructPackModeWarning: true'`)
    }

    for (const subItem of dataType.subItems) {
      output[subItem.name] = _parsePlcDataToObject.call(this, dataBuffer, subItem)

      if (subItem.arrayData.length > 0) {
        dataBuffer = dataBuffer.slice(subItem.size * subItem.arrayData[0].length)
      } else {
        dataBuffer = dataBuffer.slice(subItem.size)
      }
    }

  //Array - Go through each array subitem
  } else if (dataType.arrayData.length > 0 && !isArraySubItem) {
    output = []
    for (let i = 0; i < dataType.arrayData[0].length; i++) {
      output.push(_parsePlcDataToObject.call(this, dataBuffer, dataType, true))
      dataBuffer = dataBuffer.slice(dataType.size)
    }

  //Enumeration (only if we want to convert enumerations to object)
  } else if (dataType.enumInfo && this.settings.objectifyEnumerations && this.settings.objectifyEnumerations === true) {
    output = _parsePlcVariableToJs.call(this, dataBuffer.slice(0, dataType.size), dataType)

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
    dataBuffer = dataBuffer.slice(dataType.size)

    //Basic datatype
  } else {
    output = _parsePlcVariableToJs.call(this, dataBuffer.slice(0, dataType.size), dataType)
    dataBuffer = dataBuffer.slice(dataType.size)
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
    data.write(dataTypeName, pos, dataTypeName.length, 'ascii')
    pos += dataTypeName.length

    _sendAdsCommand.call(this, ADS.ADS_COMMAND.ReadWrite, data)
      .then(async (res) => {
        //Success - NOTE: We need to skip the data length (4 bytes) as the _parseDataType requires so
        debugD(`_readDataTypeInfo(): Reading data type info info for ${dataTypeName} successful`)
        resolve(await _parseDataType.call(this, res.ads.data.slice(4)))

      })
      .catch((res) => {
        debug(`_readDataTypeInfo(): Reading data type info for ${dataTypeName} failed: %o`, res)
        reject(new ClientException('_readDataTypeInfo()', `Reading data type info for ${dataTypeName} failed`, res))
      })
  })
}







 /**
   * Parses full data type information recursively and returns it as object
   * 
   * @param {string} dataTypeName - Data type name in the PLC - Example: 'INT', 'E_SomeEnum', 'ST_SomeStruct' etc. 
   * @param {boolean} [firstLevel] **DO NOT ASSIGN MANUALLY** True if this is the first recursion / top level of the data type
   * 
   * @returns {Promise<object>} Returns a promise (async function)
   * - If resolved, data type is returned (object)
   * - If rejected, reading failed and error info is returned (object)
 * 
 * @memberof _LibraryInternals
   */
  function _getDataTypeRecursive(dataTypeName, firstLevel = true) {
    return new Promise(async (resolve, reject) => {
      let dataType = {}

      try {
        dataType = await _getDataTypeInfo.call(this, dataTypeName)
      } catch (err) {
        return reject(new ClientException('_getDataTypeRecursive()', err))
      }

      //Select default values. Edit this to add more to the end-user data type object
      let parsedDataType = {
        name: dataType.name,
        type: dataType.type,
        size: dataType.size,
        offset: dataType.offset,
        adsDataType: dataType.dataType,
        adsDataTypeStr: dataType.dataTypeStr,
        comment: dataType.comment,
        attributes: (dataType.attributes ? dataType.attributes : []),
        arrayData: [],
        subItems: []
      }

      //If data type has subItems, loop them through
      if (dataType.subItemCount > 0) {
        //If struct and no pack mode 1, set a flag
        if (!dataType.attributeCount || dataType.attributeCount === 0 || (dataType.attributes.length > 0 && dataType.attributes.some(attr => attr.name === 'pack_mode' && attr.value === '1') === false)) {
          parsedDataType.isStructWithoutPackMode1 = true
        }
      
        for (let i = 0; i < dataType.subItemCount; i++) {
          //Get the actual data type for subItem
          const subItemType = await _getDataTypeRecursive.call(this, dataType.subItems[i].type, false)

          //Take subItems type from it's name (as the name is data type in this case)
          subItemType.type = subItemType.name
          subItemType.name = dataType.subItems[i].name

          parsedDataType.subItems.push(subItemType)
        }

      
      //If the data type has flag "DataType", it's not enum and it's not array
      } else if ((dataType.type === '' || ADS.BASE_DATA_TYPES.isKnownType(dataType.name)) && dataType.flagsStr.includes('DataType') && !dataType.flagsStr.includes('EnumInfos') && dataType.arrayDimension === 0) {
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
        parsedDataType.arrayData = dataType.arrayData


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
        .catch(err => reject(new ClientException('_getDataTypeInfo()', err)))
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
    return {ams, data}
  }
  
  //0..5 Target AMSNetId
  ams.targetAmsNetId = _byteArrayToAmsNedIdStr(data.slice(pos, pos + ADS.AMS_NET_ID_LENGTH))
  pos += ADS.AMS_NET_ID_LENGTH

  //6..8 Target ads port
  ams.targetAdsPort = data.readUInt16LE(pos)
  pos += 2

  //8..13 Source AMSNetId
  ams.sourceAmsNetId = _byteArrayToAmsNedIdStr(data.slice(pos, pos + ADS.AMS_NET_ID_LENGTH))
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

  return {ams, data}
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
      ads.data.deviceName = _trimPlcString(data.toString('ascii', pos))

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
        localAmsNetId: _byteArrayToAmsNedIdStr(packet.amsTcp.data.slice(0, ADS.AMS_NET_ID_LENGTH)),
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
            const parsedValue = await sub.dataParser(sample.data)
            parsedValue.timeStamp = stamp.timeStamp

            //Then lets call the users callback
            sub.callback(
              parsedValue,
              sub
            )

          } else {
            debugD(`_onAdsCommandReceived(): Ads notification received with unknown notificationHandle "${sample.notificationHandle}" - Doing nothing`)
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
    newStamp.timeStamp = new Date(new long(data.readUInt32LE(pos), data.readUInt32LE(pos+4)).div(10000).sub(11644473600000).toNumber())
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
 * @param {number} [targetAdsPort] - Target ADS port - default is this.settings.targetAdsPort
 * 
 * @returns {Promise<object>} Returns a promise (async function)
 * - If resolved, command was sent successfully and response was received. The received reponse is parsed and returned (object)
 * - If rejected, sending, receiving or parsing failed and error info is returned (object)
 * 
 * @memberof _LibraryInternals
 */
function _sendAdsCommand(adsCommand, adsData, targetAdsPort = null) {
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
        targetAmsNetId: this.connection.targetAmsNetId,
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
      return reject(new ClientException('_sendAdsCommand()', err))
    }

    //Registering callback for response handling
    this._internals.activeAdsRequests[packet.ams.invokeId] = {
      callback: function (response) {
        debugD(`_sendAdsCommand(): Response received for command ${packet.ams.adsCommandStr} with invokeId ${packet.ams.invokeId}`)
    
        //Callback is no longer needed, delete it
        delete this._internals.activeAdsRequests[packet.ams.invokeId]

        if (response.ams.error) {
          return reject(new ClientException('_sendAdsCommand()', 'Response with AMS error received', response))
        } else if (response.ads.error) {
          return reject(new ClientException('_sendAdsCommand()', 'Response with ADS error received', response))
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
        return reject(new ClientException('_sendAdsCommand()', `Timeout - no response in ${client.settings.timeoutDelay} ms`, adsError))

      }, this.settings.timeoutDelay, this)
    }

    //Write the data
    _socketWrite.call(this, request)
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
  Buffer.from(_amsNedIdStrToByteArray(packet.ams.targetAmsNetId)).copy(header, 0)
  pos += ADS.AMS_NET_ID_LENGTH
  
  //6..8 Target ads port
  header.writeUInt16LE(packet.ams.targetAdsPort, pos)
  pos += 2
  
  //8..13 Source ads port
  Buffer.from(_amsNedIdStrToByteArray(packet.ams.sourceAmsNetId)).copy(header, pos)
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
function _byteArrayToAmsNedIdStr(byteArray) {
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
function _amsNedIdStrToByteArray(str) {
  return str.split('.').map(x => parseInt(x))
}





exports.ADS = ADS
exports.Client = Client
exports._getDataTypeInfo = _getDataTypeInfo