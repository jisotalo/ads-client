import EventEmitter from "events";
import type { ActiveAdsRequestContainer, ActiveSubscription, ActiveSubscriptionContainer, AdsClientConnection, AdsClientSettings, AdsCommandToSend, AdsDataTypeContainer, AdsSymbolInfoContainer, AdsUploadInfo, ConnectionMetaData, PlcPrimitiveType, SubscriptionData, SubscriptionSettings, ReadSymbolResult, TimerObject, ObjectToBufferConversionResult, WriteSymbolResult, VariableHandle, RpcMethodCallResult, AdsCreateVariableHandleMultiResult, AdsReadRawMultiResult, AdsReadRawMultiTarget, AdsWriteRawMultiResult, AdsWriteRawMultiTarget, AdsDeleteVariableHandleMultiResult } from "./types/ads-client-types";
import { AdsAddNotificationResponse, AdsAddNotificationResponseData, AdsArrayInfoEntry, AdsAttributeEntry, AdsDataType, AdsDeleteNotificationResponse, AdsDeviceInfo, AdsEnumInfoEntry, AdsNotification, AdsNotificationResponse, AdsNotificationSample, AdsNotificationStamp, AdsRawInfo, AdsReadDeviceInfoResponse, AdsReadResponse, AdsReadStateResponse, AdsReadWriteResponse, AdsRequest, AdsResponse, AdsRpcMethodEntry, AdsRpcMethodParameterEntry, AdsState, AdsSymbolInfo, AdsWriteControlResponse, AdsWriteResponse, AmsAddress, AmsHeader, AmsPortRegisteredData, AmsRouterState, AmsRouterStateData, AmsTcpHeader, AmsTcpPacket, BaseAdsResponse, EmptyAdsResponse, UnknownAdsResponse } from "./types/ads-protocol-types";
import {
  Socket,
  SocketConnectOpts
} from "net";
import Debug from "debug";
import Long from "long";

import * as ADS from './ads-commons';
import ClientError from "./client-error";
export * as ADS from './ads-commons';

export class Client extends EventEmitter {
  private debug = Debug("ads-client");
  private debugD = Debug(`ads-client:details`);
  private debugIO = Debug(`ads-client:raw-data`);

  /**
   * Active debug level
   */
  private debugLevel_ = 0;

  /** Active debug level (read-only)
   * 
   *  - 0 = no debugging (default)
   *  - 1 = basic debugging 
   *    - same as $env:DEBUG='ads-client'
   *  - 2 = detailed debugging
   *    - same as $env:DEBUG='ads-client,ads-client:details'
   *  - 3 = full debugging with raw I/O data
   *    - same as $env:DEBUG='ads-client,ads-client:details,ads-client:raw-data'
  */
  public get debugLevel(): Readonly<number> {
    return this.debugLevel_;
  }

  /**
   * Active settings 
   * Note: Casting default to Required<> even though some settings are missing
   */
  public settings: Required<AdsClientSettings> = {
    routerTcpPort: 48898,
    routerAddress: "127.0.0.1",
    localAddress: "",
    localTcpPort: 0,
    localAmsNetId: "",
    localAdsPort: 0,
    timeoutDelay: 2000,
    autoReconnect: true,
    reconnectInterval: 2000,
    objectifyEnumerations: true,
    convertDatesToJavascript: true,
    readAndCacheSymbols: false,
    readAndCacheDataTypes: false,
    monitorPlcSymbolVersion: true,
    hideConsoleWarnings: false,
    connectionCheckInterval: 1000,
    connectionDownDelay: 5000,
    allowHalfOpen: false,
    bareClient: false,
    disableCaching: false
  } as Required<AdsClientSettings>;

  /**
   * Active connection information
   */
  public connection: AdsClientConnection = {
    connected: false,
    isLocal: false
  };

  /**
   * Local router state (if available and known)
   */
  public routerState?: AmsRouterState = undefined;

  /**
   * Callback used for AMS/TCp commands (like port register)
   */
  private amsTcpCallback?: ((packet: AmsTcpPacket) => void);

  /**
   * Default empty connection metadata
   */
  private defaultMetaData: ConnectionMetaData = {
    deviceInfo: undefined,
    tcSystemState: undefined,
    plcRuntimeState: undefined,
    uploadInfo: undefined,
    plcSymbolVersion: undefined,
    allSymbolsCached: false,
    symbols: {},
    allDataTypesCached: false,
    dataTypes: {},
    routerState: undefined
  };

  /**
   * Connection metadata
   */
  public metaData: ConnectionMetaData = { ...this.defaultMetaData };

  /**
   * Received data buffer
   */
  private receiveBuffer = Buffer.alloc(0);

  /**
   * Socket instance
   */
  private socket?: Socket = undefined;

  /**
   * Handler for socket error event
   */
  private socketErrorHandler?: (err: Error) => void;

  /**
   * Handler for socket close event
   */
  private socketConnectionLostHandler?: (hadError: boolean) => void;

  /**
   * Timer ID and handle of reconnection timer 
   */
  private reconnectionTimer: TimerObject = { id: 0 };

  /**
   * Timer ID and handle of TwinCAT system state poller timer 
   */
  private tcSystemStatePollerTimer: TimerObject = { id: 0 };

  /**
   * Timer handle for port register timeout
   */
  private portRegisterTimeoutTimer?: NodeJS.Timeout = undefined;

  /**
   * Active subscriptions created using subscribe()
   */
  private activeSubscriptions: ActiveSubscriptionContainer = {};

  /**
   * Backed up / previous subscriptions before reconnecting or after symbol version change
   */
  private previousSubscriptions?: ActiveSubscriptionContainer = undefined;

  /**
   * Active ADS requests that are waiting for responses
   */
  private activeAdsRequests: ActiveAdsRequestContainer = {};

  /**
   * Next invoke ID to be used for ADS requests
   */
  private nextInvokeId: number = 0;

  /**
   * If > 0, epoch timestamp when the connection to target failed for the first time (reading TwinCAT system state failed)
   * This is used to detect if connection has been down for long enough.
   */
  private connectionDownSince: number = 0;

  /**
   * Creates a new ADS client instance.
   * 
   * Settings are provided as parameter
   */
  public constructor(settings: AdsClientSettings) {
    super();

    //Taking the default settings and then updating the provided ones
    this.settings = {
      ...this.settings,
      ...settings
    };

    //Loopback address
    if (this.settings.targetAmsNetId.toLowerCase() === 'localhost') {
      this.settings.targetAmsNetId = '127.0.0.1.1.1';
    }

    //Checking that router address is 127.0.0.1 instead of localhost
    //to prevent problem like https://github.com/nodejs/node/issues/40702
    if (this.settings.routerAddress.toLowerCase() === 'localhost') {
      this.settings.routerAddress = '127.0.0.1';
    }
  };

  /**
   * Clears given timer if it's available and increases the id
   * @param timerObject Timer object
   */
  private clearTimer(timerObject: TimerObject) {
    //Clearing timer
    timerObject.timer && clearTimeout(timerObject.timer);
    timerObject.timer = undefined;

    //Increasing timer id
    timerObject.id = timerObject.id < Number.MAX_SAFE_INTEGER ? timerObject.id + 1 : 0;
  }

  /**
   * Returns target AMS address as a string in a format `amsNetId:port`.
   * 
   * Uses values from settings unless targetOpts fields are defined
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   */
  private targetToString(targetOpts: Partial<AmsAddress> = {}): string {
    let target: AmsAddress = {
      amsNetId: targetOpts.amsNetId ?? this.settings.targetAmsNetId,
      adsPort: targetOpts.adsPort ?? this.settings.targetAdsPort
    };

    return ADS.amsAddressToString(target);
  }

  /**
   * Writes given data buffer to the socket
   * @param data Data to write
   */
  private socketWrite(data: Buffer) {
    if (this.debugIO.enabled) {
      this.debugIO(`IO out ------> ${data.byteLength} bytes : ${data.toString('hex')}`);
    } else {
      this.debugD(`IO out ------> ${data.byteLength} bytes`);
    }

    this.socket?.write(data);
  }

  /**
   * Connects to the target.
   * 
   * @param isReconnecting If true, reconnecting in progress
   */
  private connectToTarget(isReconnecting = false) {
    return new Promise<Required<AdsClientConnection>>(async (resolve, reject) => {
      //Check the required settings
      if (this.settings.targetAmsNetId === undefined) {
        return reject(new ClientError(`connectToTarget(): Required setting "targetAmsNetId" is missing`));
      }
      if (this.settings.targetAdsPort === undefined) {
        return reject(new ClientError(`connectToTarget(): Required setting "targetAdsPort" is missing`));
      }

      if (this.socket) {
        this.debug(`connectToTarget(): Socket is already assigned (need to disconnect first)`);
        return reject(new ClientError(`connectToTarget(): Connection is already opened. Close the connection first by calling disconnect()`));
      }

      this.debug(`connectToTarget(): Connecting to target at ${this.settings.routerAddress}:${this.settings.routerTcpPort} (reconnecting: ${isReconnecting})`);

      //Creating a socket and setting it up
      const socket = new Socket();
      socket.setNoDelay(true);

      //Listening error event during connection
      socket.once("error", (err: NodeJS.ErrnoException) => {
        this.debug("connectToTarget(): Socket connect failed: %O", err);

        //Remove all events from socket
        socket.removeAllListeners();
        this.socket = undefined;

        //Reset connection flag
        this.connection.connected = false;

        reject(new ClientError(`connectToTarget(): Connecting to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed (socket error ${err.errno})`, err));
      });

      //Listening close event during connection
      socket.once("close", hadError => {
        this.debug(`connectToTarget(): Socket closed by remote, connection failed`);

        //Remove all events from socket
        socket.removeAllListeners();
        this.socket = undefined;

        //Reset connection flag
        this.connection.connected = false;

        reject(new ClientError(`connectToTarget(): Connecting to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed - socket closed by remote (hadError: ${hadError})`))
      })

      //Listening end event during connection
      socket.once("end", () => {
        this.debug(`connectToTarget(): Socket connection ended by remote, connection failed.`);

        //Remove all events from socket
        socket.removeAllListeners();
        this.socket = undefined;

        //Reset connection flag
        this.connection.connected = false;

        if (this.settings.localAdsPort !== undefined) {
          return reject(new ClientError(`connectToTarget(): Connecting to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed - socket ended by remote (is the ADS port "${this.settings.localAdsPort}" already in use?)`));
        }
        reject(new ClientError(`connectToTarget(): Connecting to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed - socket ended by remote`));
      });

      //Listening timeout event during connection
      socket.once("timeout", () => {
        this.debug(`connectToTarget(): Socket timeout - no response from target in ${this.settings.timeoutDelay} ms`);

        //No more timeout needed
        socket.setTimeout(0);
        socket.destroy();

        //Remove all events from socket
        socket.removeAllListeners();
        this.socket = undefined;

        //Reset connection flag
        this.connection.connected = false;

        reject(new ClientError(`connectToTarget(): Connecting to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed - No response from target in ${this.settings.timeoutDelay} ms (timeout)`));
      });

      //Listening for connect event
      socket.once("connect", async () => {
        this.debug(`connectToTarget(): Socket connection established to ${this.settings.routerAddress}:${this.settings.routerTcpPort}`);

        //No more timeout needed
        socket.setTimeout(0);

        this.socket = socket;

        //Try to register an ADS port
        try {
          const res = await this.registerAdsPort();
          const amsPortData = res.amsTcp.data as AmsPortRegisteredData;

          this.connection = {
            connected: true,
            isLocal: this.settings.targetAmsNetId === ADS.LOOPBACK_AMS_NET_ID || this.settings.targetAmsNetId === amsPortData.amsNetId,
            localAmsNetId: amsPortData.amsNetId,
            localAdsPort: amsPortData.adsPort,
            targetAmsNetId: this.settings.targetAmsNetId,
            targetAdsPort: this.settings.targetAdsPort
          };

          this.debug(`connectToTarget(): ADS port registered. Our AMS address is ${this.connection.localAmsNetId}:${this.connection.localAdsPort}`);
        } catch (err) {
          if (socket) {
            socket.destroy();
            socket.removeAllListeners();
          }

          this.socket = undefined;
          this.connection = {
            connected: false
          };

          return reject(new ClientError(`connectToTarget(): Registering ADS port failed`, err));
        }

        //Remove the socket events that were used only during connectToTarget()
        socket.removeAllListeners("error");
        socket.removeAllListeners("close");
        socket.removeAllListeners("end");

        //When socket errors from now on, we will close the connection
        this.socketErrorHandler = this.onSocketError.bind(this);
        socket.on("error", this.socketErrorHandler);

        //If bareClient setting is true, we are done here (just a connection is enough)
        if (this.settings.bareClient !== true) {
          try {
            //Initialize PLC connection (some subscriptions, pollers etc.)
            await this.setupPlcConnection();
          } catch (err) {
            if (!this.settings.allowHalfOpen) {
              return reject(new ClientError(`connectToTarget(): Connection failed - failed to set PLC connection. If target is not PLC runtime, use setting "bareClient". If system is in config mode or there is no PLC software yet, you might want to use setting "allowHalfOpen". Error: ${(err as ClientError).message}`, err));
            }

            //allowHalfOpen allows this, but show some warnings..
            if (!this.metaData.tcSystemState) {
              !this.settings.hideConsoleWarnings && console.log(`WARNING: "allowHalfOpen" setting is active. Target is connected but no connection to TwinCAT system. If target is not PLC runtime, use setting "bareClient" instead of "allowHalfOpen".`);

            } else if (this.metaData.tcSystemState.adsState !== ADS.ADS_STATE.Run) {
              !this.settings.hideConsoleWarnings && console.log(`WARNING: "allowHalfOpen" setting is active. Target is connected but TwinCAT system is in ${this.metaData.tcSystemState.adsStateStr} instead of run mode. No connection to PLC runtime.`);

            } else {
              !this.settings.hideConsoleWarnings && console.log(`WARNING: "allowHalfOpen" setting is active. No connection to PLC runtime. Check "targetAdsPort" setting and PLC status`);
            }
          }
        }

        //Listening connection lost events
        this.socketConnectionLostHandler = this.onConnectionLost.bind(this, true);
        socket.on("close", this.socketConnectionLostHandler as (hadError: boolean) => void);

        //We are connected to the target
        this.emit("connect", this.connection);
        resolve(this.connection as Required<AdsClientConnection>);
      });

      //Listening data event
      socket.on("data", data => {
        if (this.debugIO.enabled) {
          this.debugIO(`IO in  <------ ${data.byteLength} bytes from ${socket.remoteAddress}: ${data.toString("hex")}`);
        } else if (this.debugD.enabled) {
          this.debugD(`IO in  <------ ${data.byteLength} bytes from ${socket.remoteAddress}`);
        }

        this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
        this.handleReceivedData();
      });

      //Timeout only during connecting, other timeouts are handled elsewhere
      socket.setTimeout(this.settings.timeoutDelay);

      //Finally, connect
      try {
        socket.connect({
          port: this.settings.routerTcpPort,
          host: this.settings.routerAddress,
          localPort: this.settings.localTcpPort,
          localAddress: this.settings.localAddress
        } as SocketConnectOpts);

      } catch (err) {
        this.connection = {
          connected: false
        };
        this.socket = undefined;

        reject(new ClientError(`connectToTarget(): Opening socket connection to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed`, err));
      }
    })
  }

  /**
   * Unregisters ADS port from router (if it was registered) and disconnects
   *
   * @param forceDisconnect If true, the connection is dropped immediately (default: false)
   * @param isReconnecting If true, call is made during reconnecting (default: false)
   */
  private disconnectFromTarget(forceDisconnect = false, isReconnecting = false) {
    return new Promise<void>(async (resolve, reject) => {
      this.debug(`disconnectFromTarget(): Disconnecting (force: ${forceDisconnect})`);

      try {
        if (this.socketConnectionLostHandler) {
          this.socket?.off("close", this.socketConnectionLostHandler);
        }

      } catch (err) {
        //We probably have no socket anymore. Just quit.
        forceDisconnect = true;
      }

      //Clear reconnection timer only when not reconnecting
      if (!isReconnecting) {
        this.clearTimer(this.reconnectionTimer);
      }

      //Clear other timers
      clearTimeout(this.portRegisterTimeoutTimer);
      this.clearTimer(this.tcSystemStatePollerTimer);

      //If forced, then just destroy the socket
      if (forceDisconnect) {
        this.connection = {
          connected: false
        };

        this.metaData = { ...this.defaultMetaData };

        this.socket?.removeAllListeners();
        this.socket?.destroy();
        this.socket = undefined;

        this.emit("disconnect");
        return resolve();
      }

      let disconnectError = null;

      try {
        await this.removeSubscriptions(true)
      } catch (err) {
        disconnectError = err;
      }

      try {
        await this.unregisterAdsPort();

        //Done
        this.connection = {
          connected: false
        };

        this.metaData = { ...this.defaultMetaData };

        this.socket?.removeAllListeners();
        this.socket?.destroy();
        this.socket = undefined;

        this.debug(`disconnectFromTarget(): Connection closed successfully`);
        this.emit("disconnect");
        return resolve();

      } catch (err) {
        disconnectError = err;

        //Force socket close
        this.socket?.removeAllListeners();
        this.socket?.destroy();
        this.socket = undefined;

        this.connection = {
          connected: false
        };

        this.metaData = { ...this.defaultMetaData };

        this.debug(`disconnectFromTarget(): Connection closing failed, connection was forced to close`);
        this.emit("disconnect");
        return reject(new ClientError(`disconnect(): Disconnected with errors: ${(disconnectError as Error).message}`, err));
      }
    })
  }

  /**
   * Disconnects and reconnects again
   *
   * @param forceDisconnect If true, the connection is dropped immediately (default: false)
   * @param isReconnecting If true, call is made during reconnecting (default: false)
   */
  private reconnectToTarget(forceDisconnect = false, isReconnecting = false) {
    return new Promise<AdsClientConnection>(async (resolve, reject) => {

      //Backup subscriptions but do not unsubscribe (disconnect should handle that)
      await this.backupSubscriptions(false);

      if (this.socket) {
        this.debug(`reconnectToTarget(): Trying to disconnect`);
        await this.disconnectFromTarget(forceDisconnect, isReconnecting).catch();
      }
      this.debug(`reconnectToTarget(): Trying to connect...`);
      return this.connectToTarget(true)
        .then(async (res) => {
          this.debug(`reconnectToTarget(): Connected!`);

          //Trying to subscribe to previous subscriptions again
          const failures = await this.restoreSubscriptions();

          if (!failures.length) {
            isReconnecting && !this.settings.hideConsoleWarnings && console.log(`Reconnected and all subscriptions were restored!`);
            this.debug(`reconnectToTarget(): Reconnected and all subscriptions were restored!`);

          } else {
            !this.settings.hideConsoleWarnings && console.log(`WARNING: Reconnected but failed to restore following subscriptions:\n - ${failures.join('\n - ')}`);
            this.debug(`reconnectToTarget(): Reconnected but failed to restore following subscriptions: ${failures.join(', ')}`);
          }

          this.emit('reconnect');
          resolve(res);
        })
        .catch(err => {
          this.debug(`reconnectToTarget(): Reconnecting failed ${err.message}`);
          reject(err);
        });
    });
  }

  /**
   * Registers a new ADS port from AMS router
   */
  private registerAdsPort() {
    return new Promise<AmsTcpPacket>(async (resolve, reject) => {
      //If manually given we can skip this
      if (this.settings.localAmsNetId && this.settings.localAdsPort) {
        this.debug(`registerAdsPort(): Using manually provided local AmsNetId and ADS port (${this.settings.localAmsNetId}:${this.settings.localAdsPort})`);

        const res = {
          amsTcp: {
            data: {
              amsNetId: this.settings.localAmsNetId,
              adsPort: this.settings.localAdsPort
            }
          }
        } as AmsTcpPacket;
        return resolve(res);
      }

      this.debug(`registerAdsPort(): Registering an ADS port from target router (${this.settings.routerAddress}:${this.settings.routerTcpPort})`);

      const packet = Buffer.alloc(8);
      let pos = 0;

      //0..1 Ams command (header flag)
      packet.writeUInt16LE(ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_CONNECT);
      pos += 2;

      //2..5 Data length
      packet.writeUInt32LE(2, pos);
      pos += 4;

      //6..7 Data: Requested ads port (0 = let the server decide)
      packet.writeUInt16LE((this.settings.localAdsPort ? this.settings.localAdsPort : 0), pos);
      pos += 2;

      //Setup callback to call when responded
      this.amsTcpCallback = (res: AmsTcpPacket) => {
        this.amsTcpCallback = undefined;

        this.socket?.off('error', errorHandler);
        this.portRegisterTimeoutTimer && clearTimeout(this.portRegisterTimeoutTimer);

        const data = res.amsTcp.data as AmsPortRegisteredData;

        this.debug(`registerAdsPort(): ADS port registered, assigned AMS address is ${data.amsNetId}:${data.adsPort}`);
        resolve(res);
      }

      //Timeout (if no answer from router)
      this.portRegisterTimeoutTimer = setTimeout(() => {
        //Callback is no longer needed, delete it
        this.amsTcpCallback = undefined;

        //Create a custom "ads error" so that the info is passed onwards
        const adsError = {
          ads: {
            error: true,
            errorCode: -1,
            errorStr: `Timeout - no response in ${this.settings.timeoutDelay} ms`
          }
        };
        this.debug(`registerAdsPort(): Failed to register ADS port: Timeout - no response in ${this.settings.timeoutDelay} ms`);
        return reject(new ClientError(`registerAdsPort(): Timeout - no response in ${this.settings.timeoutDelay} ms`, adsError));

      }, this.settings.timeoutDelay);

      const errorHandler = () => {
        this.portRegisterTimeoutTimer && clearTimeout(this.portRegisterTimeoutTimer);
        this.debugD("registerAdsPort(): Socket connection error during port registeration");
        reject(new ClientError(`registerAdsPort(): Socket connection error during port registeration`));
      };

      this.socket?.once('error', errorHandler);

      try {
        await this.socketWrite(packet);

      } catch (err) {
        this.socket?.off('error', errorHandler);
        this.portRegisterTimeoutTimer && clearTimeout(this.portRegisterTimeoutTimer);
        return reject(new ClientError(`registerAdsPort(): Error - Writing data to the socket failed`, err));
      }
    })
  }

  /**
   * Unregisters previously registered ADS port from AMS router.
   * Connection is usually also closed by remote during unregistering
   */
  private unregisterAdsPort() {
    return new Promise<void>(async (resolve, reject) => {
      if (this.settings.localAmsNetId && this.settings.localAdsPort) {
        this.debug(`unregisterAdsPort(): Local AmsNetId and ADS port manually provided, no need to unregister`);

        this.socket?.end(() => {
          this.debugD(`unregisterAdsPort(): Socket closed`);
          this.socket?.destroy();
          this.debugD(`unregisterAdsPort(): Socket destroyed`);
        })
        return resolve();
      }

      this.debugD(`unregisterAdsPort(): Unregistering ADS port ${this.connection.localAdsPort} from target ${this.settings.routerAddress}:${this.settings.routerTcpPort}`);

      if (!this.socket || !this.connection.localAdsPort) {
        return resolve();
      }

      const buffer = Buffer.alloc(8);
      let pos = 0;

      //0..1 AMS command (header flag)
      buffer.writeUInt16LE(ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_CLOSE);
      pos += 2;

      //2..5 Data length
      buffer.writeUInt32LE(2, pos);
      pos += 4;

      //6..9 Data: port to unregister
      buffer.writeUInt16LE(this.connection.localAdsPort, pos);

      this.socket.once('timeout', () => {
        this.debugD(`unregisterAdsPort(): Timeout during port unregister. Closing connection.`);

        this.socket?.end(() => {
          this.debugD(`unregisterAdsPort(): Socket closed after timeout`);
          this.socket?.destroy();
          this.debugD(`unregisterAdsPort(): Socket destroyed after timeout`);
        });
      })

      //When socket emits close event, the ads port is unregistered and connection closed
      this.socket.once('close', (hadError: boolean) => {
        this.debugD(`unregisterAdsPort(): Ads port unregistered and socket connection closed (hadError: ${hadError}).`)
        resolve()
      })

      //Sometimes close event is not received, so resolve already here
      this.socket.once('end', () => {
        this.debugD(`unregisterAdsPort(): Socket connection ended, connection closed.`);
        this.socket?.destroy();
        resolve();
      });

      try {
        await this.socketWrite(buffer);
      } catch (err) {
        reject(err);
      }
    })
  }

  /**
   * Configures internals for TwinCAT PLC connection
   * 
   */
  private async setupPlcConnection() {
    //Read system state
    await this.readTcSystemState();

    //Start system state poller
    await this.startTcSystemStatePoller();

    //Subscribe to runtime state changes (detect PLC run/stop etc.)
    await this.addSubscription<Buffer>({
      target: {
        indexGroup: ADS.ADS_RESERVED_INDEX_GROUPS.DeviceData,
        indexOffset: 0,
        size: 4
      },
      callback: this.onPlcRuntimeStateChanged.bind(this),
      cycleTime: 0
    }, true);

    //Reading device info
    await this.readDeviceInfo();

    //Reading target runtime upload info
    await this.readUploadInfo();

    //Subscribe to PLC symbol version changes (detect PLC software updates etc.)
    await this.addSubscription<Buffer>({
      target: {
        indexGroup: ADS.ADS_RESERVED_INDEX_GROUPS.SymbolVersion,
        indexOffset: 0,
        size: 1
      },
      callback: this.onPlcSymbolVersionChanged.bind(this),
      cycleTime: 0
    }, true);

    //Pre-cache symbols
    if (this.settings.readAndCacheSymbols || this.metaData.allSymbolsCached) {
      await this.cacheSymbolInfos();
    }

    //Pre-cache data types
    if (this.settings.readAndCacheDataTypes || this.metaData.allDataTypesCached) {
      await this.cacheDataTypes();
    }
  }

  /**
   * Starts a poller that will check TwinCAT system state every x milliseconds
   * to detect if connection is working or if system state has changed
   */
  private startTcSystemStatePoller() {
    this.clearTimer(this.tcSystemStatePollerTimer);

    this.tcSystemStatePollerTimer.timer = setTimeout(
      () => this.checkTcSystemState(this.tcSystemStatePollerTimer.id),
      this.settings.connectionCheckInterval
    );
  }

  /**
   * Function that is called from TwinCAT system state poller
   * Reads active TwinCAT system state and detects if it has changed (or if connection is down)
   * 
   * Starts the timer again
   */
  private async checkTcSystemState(timerId: number) {
    //If the timer has changed, quit here (to prevent multiple timers)
    if (timerId !== this.tcSystemStatePollerTimer.id) {
      return;
    }

    let startTimer = true;

    try {
      let oldState = this.metaData.tcSystemState !== undefined
        ? { ...this.metaData.tcSystemState }
        : undefined;

      const state = await this.readTcSystemState();

      this.connectionDownSince = 0;

      if (!oldState || state.adsState !== oldState.adsState) {
        this.debug(`checkTcSystemState(): TwinCAT system state has changed from ${oldState?.adsStateStr} to ${state.adsStateStr}`)
        this.emit('tcSystemStateChange', state);

        //If system is not in run mode, we have lost the connection (such as config mode)
        if (state.adsState !== ADS.ADS_STATE.Run) {
          this.debug(`checkTcSystemState(): TwinCAT system state is in ${state.adsStateStr} mode instead of Run -> connection lost`);

          startTimer = false;
          this.onConnectionLost();

        } else if (state.adsState === ADS.ADS_STATE.Run && !this.reconnectionTimer.timer) {
          //If system change from config/stop/etc. to run while we aren't reconnecting, we should reconnect
          //This can only happen when using allowHalfOpen and connecting to a system that's initially in config mode
          this.debug(`checkTcSystemState(): TwinCAT system state is now in ${state.adsStateStr} mode -> reconnecting`);

          startTimer = false;
          this.onConnectionLost();
        }
      }

    } catch (err) {
      //Reading state failed. 
      //If this happens for long enough, connection is determined to be down
      if (!this.connectionDownSince) {
        this.connectionDownSince = Date.now();
      }

      const time = Date.now() - this.connectionDownSince;

      if (time >= this.settings.connectionDownDelay) {
        this.debug(`checkTcSystemState(): No connection for longer than ${this.settings.connectionDownDelay} ms. Connection is lost.`)

        startTimer = false;
        this.onConnectionLost();
      }
    }


    //If this is still a valid timer, start over again
    if (startTimer && this.tcSystemStatePollerTimer.id === timerId) {
      //Creating a new timer with the same id
      this.tcSystemStatePollerTimer.timer = setTimeout(
        () => this.checkTcSystemState(timerId),
        this.settings.connectionCheckInterval
      );
    }


  }

  /**
   * Callback that is called when target PLC runtime state has changed
   * 
   * @param data Data as buffer
   * @param subscription Subscription object
   */
  private onPlcRuntimeStateChanged(data: SubscriptionData<Buffer>, subscription: ActiveSubscription<Buffer>) {
    const res = {} as AdsState;
    let pos = 0;

    //0..1 ADS state
    res.adsState = data.value.readUInt16LE(pos);
    res.adsStateStr = ADS.ADS_STATE.toString(res.adsState);
    pos += 2;

    //2..3 Device state
    res.deviceState = data.value.readUInt16LE(pos);
    pos += 2;

    //Checking if PLC runtime state has changed
    let stateChanged = false;

    if (this.metaData.plcRuntimeState === undefined || this.metaData.plcRuntimeState.adsState !== res.adsState) {
      this.debug(`onPlcRuntimeStateChanged(): PLC runtime state (adsState) changed from ${this.metaData.plcRuntimeState === undefined ? 'UNKNOWN' : this.metaData.plcRuntimeState.adsStateStr} to ${res.adsStateStr}`);
      stateChanged = true;
    }

    if (this.metaData.plcRuntimeState === undefined || this.metaData.plcRuntimeState.deviceState !== res.deviceState) {
      this.debug(`onPlcRuntimeStateChanged(): PLC runtime state (deviceState) changed from ${this.metaData.plcRuntimeState === undefined ? 'UNKNOWN' : this.metaData.plcRuntimeState.deviceState} to ${res.deviceState}`);
      stateChanged = true;
    }

    this.metaData.plcRuntimeState = res;

    if (stateChanged) {
      this.emit('plcRuntimeStateChange', res);
    }
  }

  /**
   * Callback that is called when target PLC runtime symbol version has changed
   * 
   * @param data Data as buffer
   * @param subscription Subscription object
   */
  private async onPlcSymbolVersionChanged(data: SubscriptionData<Buffer> | Buffer, subscription?: ActiveSubscription<Buffer>) {
    let pos = 0;

    const symbolVersion = Buffer.isBuffer(data)
      ? data.readUInt8(pos)
      : data.value.readUInt8(pos);

    //Checking if symbol version has really changed
    if (this.metaData.plcSymbolVersion === undefined) {
      //This happens during connect (do nothing special)
      this.debug(`onPlcSymbolVersionChanged(): PLC runtime symbol version is now ${symbolVersion}`);

    } else if (this.metaData.plcSymbolVersion === symbolVersion) {
      this.debug(`onPlcSymbolVersionChanged(): PLC runtime symbol version received (not changed). Version is now ${symbolVersion}`);

    } else if (this.metaData.plcSymbolVersion !== symbolVersion) {
      this.debug(`onPlcSymbolVersionChanged(): PLC runtime symbol version changed from ${this.metaData.plcSymbolVersion === undefined ? 'UNKNOWN' : this.metaData.plcSymbolVersion} to ${symbolVersion} -> Refreshing all cached data and subscriptions`);

      //Clear all cached symbol infos and data types etc.
      this.metaData.dataTypes = {};
      this.metaData.symbols = {};
      this.metaData.uploadInfo = undefined;

      //Refreshing upload info
      try {
        await this.readUploadInfo();

      } catch (err) {
        this.debug(`onPlcSymbolVersionChanged(): Failed to refresh upload info`);
      }

      //Refreshing symbol cache (if needed)
      if (this.metaData.allSymbolsCached) {
        try {
          await this.cacheSymbolInfos();

        } catch (err) {
          this.debug(`onPlcSymbolVersionChanged(): Failed to refresh symbol cache`);
        }
      }

      //Refreshing data type cache (if needed)
      if (this.metaData.allDataTypesCached) {
        try {
          await this.cacheDataTypes();

        } catch (err) {
          this.debug(`onPlcSymbolVersionChanged(): Failed to refresh data type cache`);
        }
      }

      //Resubscribing all subscriptions as they might be broken now
      try {
        await this.backupSubscriptions(true);
        await this.restoreSubscriptions();

      } catch (err) {
        !this.settings.hideConsoleWarnings && console.log(`WARNING: Target PLC symbol version changed and all subscriptions were not restored (data might be lost from now on). Error info: ${JSON.stringify(err)}`);
        this.debug(`onPlcSymbolVersionChanged(): Failed to restore all subscriptions. Error: %o`, err);
      }
    }

    this.metaData.plcSymbolVersion = symbolVersion;
    this.emit('plcSymbolVersionChange', symbolVersion);
  }

  /**
   * Event listener for socket errors
   */
  private onSocketError(err: Error) {
    !this.settings.hideConsoleWarnings && console.log(`WARNING: Socket connection to target closed to an an error, disconnecting: ${JSON.stringify(err)}`);
    this.onConnectionLost(true);
  }

  /**
   * Called when connection to the remote is lost. Handles automatic reconnecting (if enabled)
   * 
   * @param socketFailure If true, connection was lost due to a socket/tcp problem (default: false)
   */
  private async onConnectionLost(socketFailure = false) {
    this.debug(`onConnectionLost(): Connection was lost. Socket failure: ${socketFailure}`);

    this.connection.connected = false;
    this.emit('connectionLost');

    if (this.settings.autoReconnect !== true) {
      !this.settings.hideConsoleWarnings && console.log("WARNING: Connection to target was lost and setting autoReconnect was false -> disconnecting");
      await this.disconnectFromTarget(true).catch();
      return;
    }

    this.socketConnectionLostHandler && this.socket?.off('close', this.socketConnectionLostHandler);
    !this.settings.hideConsoleWarnings && console.log("WARNING: Connection to target was lost. Trying to reconnect automatically...");

    const tryToReconnect = async (firstRetryAttempt: boolean, timerId: number) => {
      //If the timer has changed, quit here (to prevent multiple timers)
      if (this.reconnectionTimer.id !== timerId) {
        return;
      }

      //Try to reconnect
      this.reconnectToTarget(socketFailure, true)
        .then(res => {
          this.debug(`onConnectionLost()/tryToReconnect(): Reconnected successfully as ${res.localAmsNetId}:${res.localAdsPort}`);

          //Success -> dispose reconnection timer
          this.clearTimer(this.reconnectionTimer);

        })
        .catch(err => {
          //Reconnecting failed
          if (firstRetryAttempt) {
            this.debug(`onConnectionLost()/tryToReconnect(): Reconnecting failed, keeping trying in the background (${(err as Error).message}`);
            !this.settings.hideConsoleWarnings && console.log(`WARNING: Reconnecting failed. Keeping trying in the background every ${this.settings.reconnectInterval} ms...`);
          }

          //If this is still a valid timer, start over again
          if (this.reconnectionTimer.id === timerId) {
            //Creating a new timer with the same id
            this.reconnectionTimer.timer = setTimeout(
              () => tryToReconnect(false, timerId),
              this.settings.reconnectInterval
            );
          } else {
            this.debugD("onConnectionLost()/tryToReconnect(): Timer is no more valid, quiting here");
          }
        });
    }

    //Clearing old timer if there is one + increasing timer id
    this.clearTimer(this.reconnectionTimer);

    this.reconnectionTimer.timer = setTimeout(
      () => tryToReconnect(true, this.reconnectionTimer.id),
      this.settings.reconnectInterval
    );
  }

  /**
   * Sends an ADS command
   * 
   * @template T ADS response type. If omitted, generic AdsResponse is used
   */
  private async sendAdsCommand<T = AdsResponse>(command: AdsCommandToSend) {
    return new Promise<AmsTcpPacket<T>>(async (resolve, reject) => {

      if (this.nextInvokeId >= ADS.ADS_INVOKE_ID_MAX_VALUE) {
        this.nextInvokeId = 0;
      }

      const packet: AmsTcpPacket<AdsRequest> = {
        amsTcp: {
          command: ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_AMS_CMD,
          commandStr: ADS.AMS_HEADER_FLAG.toString(ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_AMS_CMD)
        },
        ams: {
          targetAmsAddress: {
            amsNetId: command.targetAmsNetId ?? this.settings.targetAmsNetId,
            adsPort: command.targetAdsPort ?? this.settings.targetAdsPort
          },
          sourceAmsAddress: {
            amsNetId: this.connection.localAmsNetId!,
            adsPort: this.connection.localAdsPort!
          },
          adsCommand: command.adsCommand,
          adsCommandStr: ADS.ADS_COMMAND.toString(command.adsCommand),
          stateFlags: ADS.ADS_STATE_FLAGS.AdsCommand,
          stateFlagsStr: ADS.ADS_STATE_FLAGS.toString(ADS.ADS_STATE_FLAGS.AdsCommand),
          dataLength: command.payload?.byteLength ?? 0,
          errorCode: 0,
          invokeId: this.nextInvokeId++
        },
        ads: {
          payload: command.payload
        }
      };

      if (packet.ams.targetAmsAddress.amsNetId === 'localhost') {
        packet.ams.targetAmsAddress.amsNetId = '127.0.0.1.1.1';
      }

      this.debugD(`sendAdsCommand(): Sending an ads command ${packet.ams.adsCommandStr} (${packet.ams.dataLength} bytes): %o`, packet);

      //Creating a full AMS/TCP request
      try {
        var request = this.createAmsTcpRequest(packet);
      } catch (err) {
        return reject(new ClientError(`sendAdsCommand(): Creating AmsTcpRequest failed`, err));
      }

      //Registering callback for response handling
      this.activeAdsRequests[packet.ams.invokeId] = {
        responseCallback: (res: AmsTcpPacket<AdsResponse>) => {

          this.debugD(`sendAdsCommand(): Response received for command "${packet.ams.adsCommandStr}" with invokeId ${packet.ams.invokeId}`);

          //Callback is no longer needed, delete it
          delete this.activeAdsRequests[packet.ams.invokeId];

          if (res.ams.error) {
            return reject(new ClientError(`sendAdsCommand(): Response with AMS error received (error ${res.ams.errorCode} - ${res.ams.errorStr})`, res.ams));
          } else if (res.ads.error) {
            return reject(new ClientError(`sendAdsCommand(): Response with ADS error received (error ${res.ads.errorCode} - ${res.ads.errorStr})`, res.ads));
          }

          return resolve(res as AmsTcpPacket<T>);
        },
        timeoutTimerHandle: setTimeout(() => {
          this.debug(`sendAdsCommand(): Timeout for command ${packet.ams.adsCommandStr} with invokeId ${packet.ams.invokeId} - No response in ${this.settings.timeoutDelay} ms`);

          //Callback is no longer needed, delete it
          delete this.activeAdsRequests[packet.ams.invokeId];

          //Creating an error object (that mimics ADS error) so it is passed forward
          const adsError = {
            ads: {
              error: true,
              errorCode: -1,
              errorStr: `Timeout - no response in ${this.settings.timeoutDelay} ms`
            } as BaseAdsResponse
          }
          return reject(new ClientError(`sendAdsCommand(): Timeout for command ${packet.ams.adsCommandStr} with invokeId ${packet.ams.invokeId} - No response in ${this.settings.timeoutDelay} ms`, adsError));

        }, this.settings.timeoutDelay)
      };

      //Write the data 
      try {
        this.socketWrite(request);
      } catch (err) {
        return reject(new ClientError(`sendAdsCommand(): Error - Socket is not available (failed to send data)`, err));
      }
    })
  }

  /**
   * Creates an AMS/TCP request from given packet object
   * 
   * @param packet Object containing the full AMS/TCP packet
   */
  private createAmsTcpRequest(packet: AmsTcpPacket<AdsRequest>): Buffer {
    //1. Create ADS data
    const adsData = packet.ads.payload ?? Buffer.alloc(0);

    //2. Create AMS header
    const amsHeader = this.createAmsHeader(packet);

    //3. Create AMS/TCP header
    const amsTcpHeader = this.createAmsTcpHeader(packet, amsHeader);

    //4. Create full AMS/TCP packet
    const amsTcpRequest = Buffer.concat([amsTcpHeader, amsHeader, adsData]);

    this.debugD(`createAmsTcpRequest(): AMS/TCP request created (${amsTcpRequest.byteLength} bytes)`);

    return amsTcpRequest;
  }

  /**
   * Creates an AMS header from given packet object
   * 
   * @param packet Object containing the full AMS/TCP packet
   */
  private createAmsHeader(packet: AmsTcpPacket): Buffer {
    //Allocating bytes for AMS header
    const header = Buffer.alloc(ADS.AMS_HEADER_LENGTH);
    let pos = 0;

    //0..5 Target AmsNetId
    Buffer.from(ADS.amsNetIdStrToByteArray(packet.ams.targetAmsAddress.amsNetId)).copy(header, 0);
    pos += ADS.AMS_NET_ID_LENGTH;

    //6..8 Target ADS port
    header.writeUInt16LE(packet.ams.targetAmsAddress.adsPort, pos);
    pos += 2;

    //8..13 Source AmsNetId
    Buffer.from(ADS.amsNetIdStrToByteArray(packet.ams.sourceAmsAddress.amsNetId)).copy(header, pos);
    pos += ADS.AMS_NET_ID_LENGTH;

    //14..15 Source ADS port
    header.writeUInt16LE(packet.ams.sourceAmsAddress.adsPort, pos);
    pos += 2;

    //16..17 ADS command
    header.writeUInt16LE(packet.ams.adsCommand, pos);
    pos += 2;

    //18..19 State flags
    header.writeUInt16LE(packet.ams.stateFlags, pos);
    pos += 2;

    //20..23 Data length
    header.writeUInt32LE(packet.ams.dataLength, pos);
    pos += 4;

    //24..27 Error code
    header.writeUInt32LE(packet.ams.errorCode, pos);
    pos += 4;

    //28..31 Invoke ID
    header.writeUInt32LE(packet.ams.invokeId, pos);
    pos += 4;

    this.debugD(`createAmsHeader(): AMS header created (${header.byteLength} bytes)`);

    if (this.debugIO.enabled) {
      this.debugIO(`createAmsHeader(): AMS header created: %o`, header.toString('hex'));
    }

    return header;
  }

  /**
   * Creates an AMS/TCP header from given packet and AMS header
   * 
   * @param packet Object containing the full AMS/TCP packet
   * @param amsHeader Buffer containing the previously created AMS header
   */
  private createAmsTcpHeader(packet: AmsTcpPacket, amsHeader: Buffer): Buffer {
    //Allocating bytes for AMS/TCP header
    const header = Buffer.alloc(ADS.AMS_TCP_HEADER_LENGTH);
    let pos = 0;

    //0..1 AMS command (header flag)
    header.writeUInt16LE(packet.amsTcp.command, pos);
    pos += 2;

    //2..5 Data length
    header.writeUInt32LE(amsHeader.byteLength + packet.ams.dataLength, pos);
    pos += 4;

    this.debugD(`createAmsTcpHeader(): AMS/TCP header created (${header.byteLength} bytes)`);

    if (this.debugIO.enabled) {
      this.debugIO(`createAmsTcpHeader(): AMS/TCP header created: %o`, header.toString('hex'));
    }

    return header;
  }

  /**
   * Checks received data buffer for full AMS packets. If full packet is found, it is parsed and handled.
   * Calls itself recursively if multiple packets available. Added also setImmediate calls to prevent event loop from blocking
   */
  private handleReceivedData() {
    //If we haven't enough data to determine packet size, quit
    if (this.receiveBuffer.byteLength < ADS.AMS_TCP_HEADER_LENGTH) {
      return;
    }
    //There should be an AMS packet, so the packet size is available in the bytes 2..5
    const packetLength = this.receiveBuffer.readUInt32LE(2) + ADS.AMS_TCP_HEADER_LENGTH;

    //Not enough data yet? quit
    if (this.receiveBuffer.byteLength < packetLength) {
      return;
    }

    const data = this.receiveBuffer.subarray(0, packetLength);
    this.receiveBuffer = this.receiveBuffer.subarray(data.byteLength);

    //Parse the packet, but allow time for the event loop
    setImmediate(this.parseAmsTcpPacket.bind(this, data));

    //If there is more, call recursively but allow time for the event loop
    if (this.receiveBuffer.byteLength >= ADS.AMS_TCP_HEADER_LENGTH) {
      setImmediate(this.handleReceivedData.bind(this));
    }
  }

  /**
   * Parses an AMS/TCP packet from given buffer and then handles it
   * 
   * @param data Buffer that contains data for a single full AMS/TCP packet
   */
  private parseAmsTcpPacket(data: Buffer) {
    const packet = {} as AmsTcpPacket<AdsResponse>;

    //1. Parse AMS/TCP header
    const parsedAmsTcpHeader = this.parseAmsTcpHeader(data)
    packet.amsTcp = parsedAmsTcpHeader.amsTcp;
    data = parsedAmsTcpHeader.data;

    //2. Parse AMS header (if exists)
    const parsedAmsHeader = this.parseAmsHeader(data);
    packet.ams = parsedAmsHeader.ams;
    data = parsedAmsHeader.data;

    //3. Parse ADS data (if exists)
    packet.ads = packet.ams.error ? {} as EmptyAdsResponse : this.parseAdsResponse(packet, data);

    //4. Handle the parsed packet
    this.onAmsTcpPacketReceived(packet);
  }

  /**
   * Parses an AMS/TCP header from given buffer
   * 
   * Returns the rest of the payload as data
   * 
   * @param data Buffer that contains data for a single full AMS/TCP packet
   */
  private parseAmsTcpHeader(data: Buffer): { amsTcp: AmsTcpHeader, data: Buffer } {
    this.debugD(`parseAmsTcpHeader(): Starting to parse AMS/TCP header`)

    let pos = 0;
    const amsTcp = {} as AmsTcpHeader;

    //0..1 AMS command (header flag)
    amsTcp.command = data.readUInt16LE(pos);
    amsTcp.commandStr = ADS.AMS_HEADER_FLAG.toString(amsTcp.command);
    pos += 2;

    //2..5 Data length
    amsTcp.length = data.readUInt32LE(pos);
    pos += 4;

    //Remove AMS/TCP header from data  
    data = data.subarray(ADS.AMS_TCP_HEADER_LENGTH);

    //If data length is less than AMS_HEADER_LENGTH,
    //we know that this packet has no AMS headers -> it's only a AMS/TCP command
    if (data.byteLength < ADS.AMS_HEADER_LENGTH) {
      amsTcp.data = data;

      //Remove data (basically creates an empty buffer..)
      data = data.subarray(data.byteLength);
    }
    this.debugD(`parseAmsTcpHeader(): AMS/TCP header parsed: %o`, amsTcp);

    return { amsTcp, data };
  }

  /**
   * Parses an AMS header from given buffer
   * 
   * Returns the rest of the payload as data
   * 
   * @param data Buffer that contains data for a single AMS packet (without AMS/TCP header)
   */
  private parseAmsHeader(data: Buffer): { ams: AmsHeader, data: Buffer } {
    this.debugD("parseAmsHeader(): Starting to parse AMS header");

    let pos = 0;
    const ams = {} as AmsHeader;

    if (data.byteLength < ADS.AMS_HEADER_LENGTH) {
      this.debugD("parseAmsHeader(): No AMS header found");
      return { ams, data };
    }

    //0..5 Target AMSNetId
    ams.targetAmsAddress = {} as AmsAddress;
    ams.targetAmsAddress.amsNetId = ADS.byteArrayToAmsNetIdStr(data.subarray(pos, pos + ADS.AMS_NET_ID_LENGTH));
    pos += ADS.AMS_NET_ID_LENGTH;

    //6..8 Target ads port
    ams.targetAmsAddress.adsPort = data.readUInt16LE(pos);
    pos += 2;

    //8..13 Source AMSNetId
    ams.sourceAmsAddress = {} as AmsAddress;
    ams.sourceAmsAddress.amsNetId = ADS.byteArrayToAmsNetIdStr(data.subarray(pos, pos + ADS.AMS_NET_ID_LENGTH));
    pos += ADS.AMS_NET_ID_LENGTH;

    //14..15 Source ads port
    ams.sourceAmsAddress.adsPort = data.readUInt16LE(pos);
    pos += 2;

    //16..17 ADS command
    ams.adsCommand = data.readUInt16LE(pos);
    ams.adsCommandStr = ADS.ADS_COMMAND.toString(ams.adsCommand);
    pos += 2;

    //18..19 State flags
    ams.stateFlags = data.readUInt16LE(pos);
    ams.stateFlagsStr = ADS.ADS_STATE_FLAGS.toString(ams.stateFlags);
    pos += 2;

    //20..23 Data length
    ams.dataLength = data.readUInt32LE(pos);
    pos += 4;

    //24..27 Error code
    ams.errorCode = data.readUInt32LE(pos);
    pos += 4;

    //28..31 Invoke ID
    ams.invokeId = data.readUInt32LE(pos);
    pos += 4;

    //Remove AMS header from data  
    data = data.subarray(ADS.AMS_HEADER_LENGTH);

    //ADS error
    ams.error = (ams.errorCode !== null ? ams.errorCode > 0 : false);
    ams.errorStr = "";

    if (ams.error) {
      ams.errorStr = ADS.ADS_ERROR[ams.errorCode as keyof typeof ADS.ADS_ERROR];
    }
    this.debugD("parseAmsHeader(): AMS header parsed: %o", ams);

    return { ams, data };
  }

  /**
   * Parses ADS data from given buffer. Uses `packet.ams` to determine the ADS command.
  * 
  * @param data Buffer that contains data for a single ADS packet (without AMS/TCP header and AMS header)
  */
  private parseAdsResponse(packet: AmsTcpPacket, data: Buffer): AdsResponse {
    this.debugD("parseAdsResponse(): Starting to parse ADS data");

    if (data.byteLength === 0) {
      this.debugD("parseAdsData(): Packet has no ADS data");
      return {} as AdsResponse;
    }

    let ads = undefined;
    let pos = 0;

    switch (packet.ams.adsCommand) {
      case ADS.ADS_COMMAND.ReadWrite:
        ads = {} as AdsReadWriteResponse;

        //0..3 Ads error number
        ads.errorCode = data.readUInt32LE(pos);
        pos += 4;

        //4..7 Data length (bytes)
        ads.length = data.readUInt32LE(pos);
        pos += 4;

        //8..n Data
        ads.payload = Buffer.alloc(ads.length);
        data.copy(ads.payload, 0, pos);
        break;

      case ADS.ADS_COMMAND.Read:
        ads = {} as AdsReadResponse;

        //0..3 Ads error number
        ads.errorCode = data.readUInt32LE(pos);
        pos += 4;

        //4..7 Data length (bytes)
        ads.length = data.readUInt32LE(pos);
        pos += 4;

        //8..n Data
        ads.payload = Buffer.alloc(ads.length);
        data.copy(ads.payload, 0, pos);
        break;

      case ADS.ADS_COMMAND.Write:
        ads = {} as AdsWriteResponse;

        //0..3 Ads error number
        ads.errorCode = data.readUInt32LE(pos);
        pos += 4;
        break;

      case ADS.ADS_COMMAND.ReadDeviceInfo:
        ads = {} as AdsReadDeviceInfoResponse;

        //0..3 Ads error number
        ads.errorCode = data.readUInt32LE(pos);
        pos += 4;

        ads.payload = {} as AdsDeviceInfo;

        //4 Major version
        ads.payload.majorVersion = data.readUInt8(pos);
        pos += 1;

        //5 Minor version
        ads.payload.minorVersion = data.readUInt8(pos);
        pos += 1;

        //6..7 Version build
        ads.payload.versionBuild = data.readUInt16LE(pos);
        pos += 2;

        //8..24 Device name
        ads.payload.deviceName = ADS.decodePlcStringBuffer(data.subarray(pos, pos + 16));;
        break;

      case ADS.ADS_COMMAND.ReadState:
        ads = {} as AdsReadStateResponse;

        //0..3 Ads error number
        ads.errorCode = data.readUInt32LE(pos);
        pos += 4;

        ads.payload = {} as AdsState;

        //4..5 ADS state
        ads.payload.adsState = data.readUInt16LE(pos);
        ads.payload.adsStateStr = ADS.ADS_STATE.toString(ads.payload.adsState);
        pos += 2;

        //6..7 Device state
        ads.payload.deviceState = data.readUInt16LE(pos);
        pos += 2;
        break;

      case ADS.ADS_COMMAND.AddNotification:
        ads = {} as AdsAddNotificationResponse;

        //0..3 Ads error number
        ads.errorCode = data.readUInt32LE(pos);
        pos += 4;

        ads.payload = {} as AdsAddNotificationResponseData;

        //4..7 Notification handle
        ads.payload.notificationHandle = data.readUInt32LE(pos);
        pos += 4;
        break;

      case ADS.ADS_COMMAND.DeleteNotification:
        ads = {} as AdsDeleteNotificationResponse;

        //0..3 Ads error number
        ads.errorCode = data.readUInt32LE(pos);
        pos += 4;
        break;

      case ADS.ADS_COMMAND.Notification:
        ads = {} as AdsNotificationResponse;

        ads.payload = this.parseAdsNotification(data);
        break;

      case ADS.ADS_COMMAND.WriteControl:
        ads = {} as AdsWriteControlResponse;

        //0..3 Ads error number
        ads.errorCode = data.readUInt32LE(pos);
        pos += 4;
        break;
    }

    this.debugD(`parseAdsResponse(): ADS data parsed: %o`, ads);

    if (ads === undefined) {
      this.debug(`parseAdsData(): Unknown ads response received: ${packet.ams.adsCommand}`);

      ads = {
        error: true,
        errorStr: `Unknown ADS command for parser: ${packet.ams.adsCommand} (${packet.ams.adsCommandStr})`,
        errorCode: -1
      } as UnknownAdsResponse;
    }

    ads.error = ads.errorCode !== 0;
    if (ads.error && !ads.errorStr) {
      ads.errorStr = ADS.ADS_ERROR[ads.errorCode];
    }

    return ads;
  }

  /**
   * Handles the parsed AMS/TCP packet and actions/callbacks etc. related to it.
   * 
   * @param packet Fully parsed AMS/TCP packet, includes AMS/TCP header and if available, also AMS header and ADS data
   */
  private onAmsTcpPacketReceived(packet: AmsTcpPacket<AdsResponse>) {
    this.debugD(`onAmsTcpPacketReceived(): AMS packet received with command ${packet.amsTcp.command}`);

    switch (packet.amsTcp.command) {
      //ADS command
      case ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_AMS_CMD: ;
        packet.amsTcp.commandStr = 'ADS command';

        if (packet.ams.targetAmsAddress.amsNetId === this.connection.localAmsNetId
          || packet.ams.targetAmsAddress.amsNetId === ADS.LOOPBACK_AMS_NET_ID) {

          this.onAdsCommandReceived(packet);
        } else {
          this.debug(`Received ADS command but it's not for us (target: ${ADS.amsAddressToString(packet.ams.targetAmsAddress)})`);
        }
        break;

      //AMS port unregister
      case ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_CLOSE:
        packet.amsTcp.commandStr = 'Port unregister';
        //No action at the moment
        break;

      //AMS port register
      case ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_CONNECT:
        packet.amsTcp.commandStr = 'Port register';

        if (packet.amsTcp.data instanceof Buffer) {
          const data = packet.amsTcp.data as Buffer;

          packet.amsTcp.data = {
            //0..5 Client AmsNetId
            amsNetId: ADS.byteArrayToAmsNetIdStr(data.subarray(0, ADS.AMS_NET_ID_LENGTH)),
            //5..6 Client ADS port
            adsPort: data.readUInt16LE(ADS.AMS_NET_ID_LENGTH)
          };

          if (this.amsTcpCallback) {
            this.amsTcpCallback(packet);
          } else {
            this.debug(`onAmsTcpPacketReceived(): Port register response received but no callback was assigned (${packet.amsTcp.commandStr})`);
          }
        } else {
          this.debugD("onAmsTcpPacketReceived(): Received amsTcp data of unknown type");
        }
        break;

      // AMS router note (router state change)
      case ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_ROUTER_NOTE:
        packet.amsTcp.commandStr = 'Router note';

        //Parse data
        if (packet.amsTcp.data instanceof Buffer) {
          const data = {} as AmsRouterStateData;

          //0..3 Router state
          data.routerState = packet.amsTcp.data.readUInt32LE(0);

          this.onRouterStateChanged(data);

        } else {
          this.debugD("onAmsTcpPacketReceived(): Received amsTcp data of unknown type");
        }
        break;

      //Get local AmsNetId response
      case ADS.AMS_HEADER_FLAG.GET_LOCAL_NETID:
        packet.amsTcp.commandStr = 'Get local AmsNetId';
        //No action at the moment
        break;

      default:
        packet.amsTcp.commandStr = `Unknown command ${packet.amsTcp.command}`;
        this.debug(`onAmsTcpPacketReceived(): Unknown AMS/TCP command received: "${packet.amsTcp.command}"`);
        break;
    }
  }

  /**
   * Handles received ADS command
   * 
   * @param packet Fully parsed AMS/TCP packet, includes AMS/TCP header, AMS header and ADS data
   */
  private onAdsCommandReceived(packet: AmsTcpPacket<AdsResponse>) {
    this.debugD(`onAdsCommandReceived(): ADS command received (command: ${packet.ams.adsCommand})`);

    switch (packet.ams.adsCommand) {
      //ADS notification
      case ADS.ADS_COMMAND.Notification:
        //Try to find the callback with received notification handles
        for (let stamp of (packet.ads as AdsNotificationResponse).payload.stamps) {
          //Stamp has n samples inside
          for (let sample of stamp.samples) {
            //Try to find the subscription
            const key = ADS.amsAddressToString(packet.ams.sourceAmsAddress);
            const subscription = this.activeSubscriptions[key][sample.notificationHandle];

            if (subscription) {
              this.debug(`onAdsCommandReceived(): Notification received from ${key} for handle ${sample.notificationHandle} (%o)`, subscription.settings.target)

              subscription.parseNotification(sample.payload, stamp.timestamp)
                .then(data => {
                  subscription.latestData = data;

                  try {
                    subscription.settings.callback && subscription.settings.callback(subscription.latestData, subscription);
                  } catch (err) {
                    this.debug(`onAdsCommandReceived(): Calling user callback for notification failed: %o`, err);
                  }
                })
                .catch(err => {
                  this.debug(`onAdsCommandReceived(): Ads notification received but parsing Javascript object failed: %o`, err);
                  this.emit('ads-client-error', new ClientError(`onAdsCommandReceived(): Ads notification received but parsing data to Javascript object failed. Subscription: ${JSON.stringify(subscription)}`, err));
                });
            } else {
              this.debugD(`onAdsCommandReceived(): Ads notification received with unknown notificationHandle "${sample.notificationHandle}". Use unsubscribe() to save resources`);
              this.emit('ads-client-error', new ClientError(`onAdsCommandReceived(): Ads notification received with unknown notificationHandle (${sample.notificationHandle}). Use unsubscribe() to save resources.`));
            }
          }
        }
        break;

      //All other ADS commands
      default:
        //Try to find the callback with received invoke id and call it
        const request = this.activeAdsRequests[packet.ams.invokeId];

        if (request) {
          clearTimeout(request.timeoutTimerHandle);
          request.responseCallback(packet);

        } else {
          this.debugD(`onAdsCommandReceived(): Ads command received with unknown invokeId "${packet.ams.invokeId}"`);
          this.emit('ads-client-error', new ClientError(`onAdsCommandReceived(): Ads command received with unknown invokeId "${packet.ams.invokeId}"`));
        }
        break;
    }
  }

  /**
   * Called when local AMS router status has changed (Router notification received)
   * For example router state changes when local TwinCAT system switches from Config to Run state and vice-versa
   * 
   * @param state New router state
   */
  private onRouterStateChanged(state: AmsRouterStateData) {
    this.metaData.routerState = {
      state: state.routerState,
      stateStr: ADS.AMS_ROUTER_STATE.toString(state.routerState)
    };

    this.debug(`onRouterStateChanged(): Local AMS router state has changed to ${this.metaData.routerState.stateStr}`);
    this.emit('routerStateChange', this.metaData.routerState);

    //If we have a local connection, connection needs to be reinitialized
    if (this.connection.isLocal) {
      //We should stop polling TwinCAT system state, the poller will be reinitialized later
      this.clearTimer(this.tcSystemStatePollerTimer);

      this.debug("onRouterStateChanged(): Local loopback connection active, monitoring router state. Reconnecting when router is back running.");

      if (this.metaData.routerState.state === ADS.AMS_ROUTER_STATE.START) {
        !this.settings.hideConsoleWarnings && console.log(`WARNING: Local AMS router state has changed to ${this.metaData.routerState.stateStr}. Reconnecting...`);
        this.onConnectionLost();

      } else {
        //Nothing to do, just wait until router has started again..
        !this.settings.hideConsoleWarnings && console.log(`WARNING: Local AMS router state has changed to ${this.metaData.routerState.stateStr}. Connection and active subscriptions might have been lost. Waiting router to start again.`);
      }
    }
  }

  /**
   * Parses received ADS notification data (stamps) from given (byte) Buffer
   * 
   * @param data Raw data to convert
   */
  private parseAdsNotification(data: Buffer) {
    let pos = 0;
    const packet = {} as AdsNotification;

    //0..3 Data length
    packet.length = data.readUInt32LE(pos);
    pos += 4;

    //4..7 Stamp count
    packet.stampCount = data.readUInt32LE(pos);
    pos += 4;

    packet.stamps = [];
    //Parse all stamps
    for (let stamp = 0; stamp < packet.stampCount; stamp++) {
      const newStamp = {} as AdsNotificationStamp;

      //0..7 Timestamp (Converting Windows FILETIME to Date)
      newStamp.timestamp = new Date(new Long(data.readUInt32LE(pos), data.readUInt32LE(pos + 4)).div(10000).sub(11644473600000).toNumber());
      pos += 8;

      //8..11 Number of samples
      newStamp.count = data.readUInt32LE(pos);
      pos += 4;

      newStamp.samples = [];
      //Parse all samples for this stamp
      for (let sample = 0; sample < newStamp.count; sample++) {
        const newSample = {} as AdsNotificationSample;

        //0..3 Notification handle
        newSample.notificationHandle = data.readUInt32LE(pos);
        pos += 4;

        //4..7 Data length
        newSample.length = data.readUInt32LE(pos);
        pos += 4;

        //8..n Data
        newSample.payload = data.subarray(pos, pos + newSample.length);
        pos += newSample.length;

        newStamp.samples.push(newSample);
      }
      packet.stamps.push(newStamp);
    }

    return packet;
  }


  /**
   * Adds a new subscription (ADS device notification)
   * 
   * @param target 
   * @param callback 
   * @param settings 
   * @param targetOpts Optional target settings that override values in `settings` (NOTE: If used, no caching is available -> worse performance)
   */
  private async addSubscription<T = any>(settings: SubscriptionSettings<T>, internal: boolean, targetOpts: Partial<AmsAddress> = {}): Promise<ActiveSubscription<T>> {
    this.debugD(`addSubscription(): Subscribing %o (internal: ${internal})`, settings);

    let targetAddress = {} as AdsRawInfo;
    let symbolInfo: AdsSymbolInfo | undefined = undefined;

    if (typeof settings.target === "string") {
      try {
        symbolInfo = await this.getSymbolInfo(settings.target, targetOpts);

        //Read symbol datatype to cache -> It's cached when we start getting notifications
        //Otherwise with large structs and fast cycle times there might be some issues
        //NOTE: Only when we are targetted to original target system, otherwise we don't have caching so no need to
        if (!this.settings.disableCaching && !targetOpts.adsPort && !targetOpts.amsNetId) {
          await this.getDataType(symbolInfo.type, targetOpts);
        }

        targetAddress = {
          indexGroup: symbolInfo.indexGroup,
          indexOffset: symbolInfo.indexOffset,
          size: symbolInfo.size
        };

      } catch (err) {
        throw new ClientError(`addSubscription(): Getting symbol and data type info for ${settings.target} failed`, err);
      }
    } else {
      if (settings.target.indexGroup === undefined || settings.target.indexOffset === undefined) {
        throw new ClientError(`addSubscription(): Target is missing indexGroup or indexOffset`);

      } else if (settings.target.size === undefined) {
        settings.target.size = 0xFFFFFFFF;
      }
      targetAddress = settings.target;
    }

    //Allocating bytes for request
    const data = Buffer.alloc(40);
    let pos = 0;

    //0..3 IndexGroup
    data.writeUInt32LE(targetAddress.indexGroup, pos);
    pos += 4;

    //4..7 IndexOffset
    data.writeUInt32LE(targetAddress.indexOffset, pos);
    pos += 4;

    //8..11 Data length
    data.writeUInt32LE(targetAddress.size!, pos);
    pos += 4;

    //12..15 Transmission mode
    data.writeUInt32LE(settings.sendOnChange === undefined || settings.sendOnChange ? ADS.ADS_TRANS_MODE.OnChange : ADS.ADS_TRANS_MODE.Cyclic, pos);
    pos += 4

    //16..19 Maximum delay (ms) - PLC will wait `maximuMDelay` before sending a notification
    data.writeUInt32LE(settings.maxDelay === undefined ? 0 : settings.maxDelay * 10000, pos);
    pos += 4;

    //20..23 Cycle time (ms) - How often the PLC checks for value changes (minimum value: Task 0 cycle time)
    data.writeUInt32LE(settings.cycleTime === undefined ? 200 * 10000 : settings.cycleTime * 10000, pos);
    pos += 4;

    //24..40 reserved

    try {
      const res = await this.sendAdsCommand<AdsAddNotificationResponse>({
        adsCommand: ADS.ADS_COMMAND.AddNotification,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      this.debugD(`addSubscription(): Subscribed to %o`, settings.target);

      const clientRef = this;

      const subscription: ActiveSubscription<T> = {
        settings,
        internal,
        remoteAddress: res.ams.sourceAmsAddress,
        notificationHandle: res.ads.payload.notificationHandle,
        symbolInfo,
        unsubscribe: async function () {
          await clientRef.unsubscribe(this);
        },
        parseNotification: async function (data: Buffer, timestamp: Date): Promise<SubscriptionData<T>> {
          const result: SubscriptionData<T> = {
            timestamp,
            value: data as T
          };

          if (this.symbolInfo) {
            const dataType = await clientRef.getDataType(this.symbolInfo.type, this.targetOpts);
            result.value = clientRef.convertBufferToObject<T>(data, dataType);
          }

          this.latestData = result;
          return result;
        },
        latestData: undefined,
        targetOpts: targetOpts
      };

      //As we might have different subscriptions for different targets, we need to use the address as key
      const key = ADS.amsAddressToString(subscription.remoteAddress);

      if (!this.activeSubscriptions[key]) {
        this.activeSubscriptions[key] = {};
      }

      this.activeSubscriptions[key][subscription.notificationHandle] = subscription;

      return subscription;

    } catch (err) {
      this.debug(`addSubscription(): Subscribing to %o failed: %o`, settings.target, err);
      throw new ClientError(`addSubscription(): Subscribing to ${JSON.stringify(settings.target)} failed`, err);
    }
  }

  /**
   * Unsubscribes from all active subscriptions
   * 
   * @param internals If true, also internal subscriptions are unsubscribed
   */
  private async removeSubscriptions(internals: boolean): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`removeSubscriptions(): Client is not connected. Use connect() to connect to the target first.`);
    }

    try {
      this.debug(`removeSubscriptions(): Unsubscribing from all active subscriptions (also internals: ${internals})`);

      let successCount = 0;
      let errorCount = 0;
      let error = null;

      for (const targetName in this.activeSubscriptions) {
        for (const subscriptionHandle in this.activeSubscriptions[targetName]) {
          const subscription = this.activeSubscriptions[targetName][subscriptionHandle];

          if (!subscription.internal || internals) {
            try {
              await subscription.unsubscribe();
              successCount++;

            } catch (err) {
              errorCount++;
              error = err;
            }
          }
        }
      }

      if (errorCount === 0) {
        this.debug(`removeSubscriptions(): Unsubscribed from all ${successCount} subscriptions successfully`);
      } else {
        this.debug(`removeSubscriptions(): Unsubscribed from ${successCount} subscriptions, failed to unsubscribe from ${errorCount} subscriptions`);
        throw error;
      }

    } catch (err) {
      this.debug(`unsubscribeAll(): Unsubscribing all failed - some subscriptions were not unsubscribed: %o`, err);
      throw new ClientError(`unsubscribeAll(): Unsubscribing all failed - some subscriptions were not unsubscribed`, err);
    }
  }

  /**
   * Backups active subscriptions for resubscribing.
   * 
   * Returns number of backed up subscriptions.
   * 
   * @param unsubscribe If true, unsubscribeAll() is also called 
   */
  private async backupSubscriptions(unsubscribe: boolean) {
    let count = 0;

    if (this.previousSubscriptions !== undefined) {
      return;
    }

    this.previousSubscriptions = {};

    for (const targetName in this.activeSubscriptions) {
      for (const subscriptionHandle in this.activeSubscriptions[targetName]) {
        const subscription = this.activeSubscriptions[targetName][subscriptionHandle];

        if (subscription.internal) {
          continue;
        }

        if (!this.previousSubscriptions[targetName]) {
          this.previousSubscriptions[targetName] = {};
        }

        //Copy
        this.previousSubscriptions[targetName][subscription.notificationHandle] = { ...subscription };

        count++;
      }
    }

    if (unsubscribe) {
      try {
        await this.unsubscribeAll();
      } catch (err) {
        this.debug(`backupSubscriptions(): Unsubscribing existing subscriptions failed. Error: %o`, err);
      }
    }

    this.debug(`backupSubscriptions(): Total of ${count} subcriptions backupped for restoring`);

    return count;
  }

  /**
   * Restores all previously backed up subscriptions
   * 
   * Returns array of failed subscriptions, empty array if all were successful
   */
  private async restoreSubscriptions() {
    let failedTargets: string[] = [];
    let totalCount = 0;
    let successCount = 0;

    if (!this.previousSubscriptions) {
      this.debug(`restoreSubscriptions(): No previous subscriptions to restore`);
      return failedTargets;
    }

    this.debug(`restoreSubscriptions(): Starting to restore previously saved subscriptions`);

    for (const targetName in this.previousSubscriptions) {
      for (const subscriptionHandle in this.previousSubscriptions[targetName]) {
        const subscription = this.previousSubscriptions[targetName][subscriptionHandle];

        if (subscription.internal) {
          continue;
        }

        try {
          totalCount++;
          await this.subscribe({ ...subscription.settings }, subscription.targetOpts);
          successCount++;

        } catch (err: any) {
          const target = typeof subscription.settings.target === 'string'
            ? subscription.settings.target
            : JSON.stringify(subscription.settings.target);

          this.debug(`restoreSubscriptions(): Subscribing existing subscription ${target} failed. Error: %o`, err)
          failedTargets.push(target);
        }
      }
    }
    this.previousSubscriptions = undefined;
    this.debug(`restoreSubscriptions(): Restored ${successCount}/${totalCount} subscriptions`);

    return failedTargets;
  }

  /**
   * Parses symbol information from raw ADS response payload
   * 
   * @param data Buffer object containing symbol information (without first 4 bytes of ADS payload containing entry length)
   */
  private parseAdsResponseSymbolInfo(data: Buffer): AdsSymbolInfo {
    this.debugD(`parseAdsResponseSymbolInfo(): Parsing symbol info from data (${data.byteLength} bytes)`);

    const symbol = {} as AdsSymbolInfo;
    let pos = 0;

    //0..3 Index group
    symbol.indexGroup = data.readUInt32LE(pos);
    pos += 4;

    //4..7 Index offset
    symbol.indexOffset = data.readUInt32LE(pos);
    pos += 4;

    //12..15 Symbol size
    symbol.size = data.readUInt32LE(pos);
    pos += 4;

    //16..19 Symbol datatype
    symbol.adsDataType = data.readUInt32LE(pos);
    symbol.adsDataTypeStr = ADS.ADS_DATA_TYPES.toString(symbol.adsDataType);
    pos += 4;

    //20..21 Flags
    symbol.flags = data.readUInt16LE(pos);
    symbol.flagsStr = ADS.ADS_SYMBOL_FLAGS.toStringArray(symbol.flags);
    pos += 2;

    //22..23 Array dimension
    symbol.arrayDimension = data.readUInt16LE(pos);
    pos += 2;

    //24..25 Symbol name length
    const nameLength = data.readUInt16LE(pos);
    pos += 2;

    //26..27 Symbol type length
    const typeLength = data.readUInt16LE(pos);
    pos += 2;

    //28..29 Symbol comment length
    const commentLength = data.readUInt16LE(pos);
    pos += 2;

    //30.... Symbol name
    symbol.name = ADS.decodePlcStringBuffer(data.subarray(pos, pos + nameLength + 1));
    pos += nameLength + 1;

    //.. Symbol type
    symbol.type = ADS.decodePlcStringBuffer(data.subarray(pos, pos + typeLength + 1));
    pos += typeLength + 1;

    //.. Symbol comment
    symbol.comment = ADS.decodePlcStringBuffer(data.subarray(pos, pos + commentLength + 1));
    pos += commentLength + 1;

    //Array information
    symbol.arrayInfo = [];
    for (let i = 0; i < symbol.arrayDimension; i++) {
      const array = {} as AdsArrayInfoEntry;

      array.startIndex = data.readInt32LE(pos);
      pos += 4;

      array.length = data.readUInt32LE(pos);
      pos += 4;

      symbol.arrayInfo.push(array);
    }

    //If flag TypeGuid set
    if ((symbol.flags & ADS.ADS_SYMBOL_FLAGS.TypeGuid) === ADS.ADS_SYMBOL_FLAGS.TypeGuid) {
      symbol.typeGuid = data.subarray(pos, pos + 16).toString('hex');
      pos += 16;
    }

    //If flag Attributes is set
    symbol.attributes = [];

    if ((symbol.flags & ADS.ADS_SYMBOL_FLAGS.Attributes) === ADS.ADS_SYMBOL_FLAGS.Attributes) {
      const attributeCount = data.readUInt16LE(pos);
      pos += 2;

      //Attributes
      for (let i = 0; i < attributeCount; i++) {
        const attr = {} as AdsAttributeEntry;

        //Name length
        const nameLength = data.readUInt8(pos);
        pos += 1;

        //Value length
        const valueLength = data.readUInt8(pos);
        pos += 1;

        //Name
        attr.name = ADS.decodePlcStringBuffer(data.subarray(pos, pos + nameLength + 1));
        pos += nameLength + 1;

        //Value
        attr.value = ADS.decodePlcStringBuffer(data.subarray(pos, pos + valueLength + 1));
        pos += valueLength + 1;

        symbol.attributes.push(attr);
      }
    }

    //If flag ExtendedFlags is set
    symbol.extendedFlags = 0;

    if (symbol.flagsStr.includes('ExtendedFlags')) {
      //Add later if required (32 bit integer)
      symbol.extendedFlags = data.readUInt32LE(pos);
      pos += 4;
    }

    //Reserved, if any
    symbol.reserved = data.subarray(pos);

    this.debugD(`parseAdsResponseSymbolInfo(): Symbol info parsed for ${symbol.name} (${symbol.type})`);
    return symbol;
  }

  /**
   * Parses data type declaration from raw ADS response payload
   * 
   * @param data Buffer object containing data type declaration (without first 4 bytes of ADS payload containing entry length)
   */
  private parseAdsResponseDataType(data: Buffer): AdsDataType {
    this.debugD(`parseAdsResponseDataType(): Parsing data type from ADS response (${data.byteLength} bytes)`);

    let pos = 0;
    const dataType = {} as AdsDataType;

    //0..3 Version
    dataType.version = data.readUInt32LE(pos);
    pos += 4;

    //4..7 Hash value of datatype for comparison
    dataType.hashValue = data.readUInt32LE(pos);
    pos += 4;

    //8..11 hashValue of base type / Code Offset to setter Method (typeHashValue or offsSetCode)
    dataType.typeHashValue = data.readUInt32LE(pos);
    pos += 4;

    //12..15 Size
    dataType.size = data.readUInt32LE(pos);
    pos += 4;

    //16..19 Offset
    dataType.offset = data.readUInt32LE(pos);
    pos += 4;

    //20..23 ADS data type
    dataType.adsDataType = data.readUInt32LE(pos);
    dataType.adsDataTypeStr = ADS.ADS_DATA_TYPES.toString(dataType.adsDataType);
    pos += 4;

    //24..27 Flags
    dataType.flags = data.readUInt32LE(pos);
    dataType.flagsStr = ADS.ADS_DATA_TYPE_FLAGS.toStringArray(dataType.flags);
    pos += 4;

    //28..29 Name length
    const nameLength = data.readUInt16LE(pos);
    pos += 2;

    //30..31 Type length
    const typeLength = data.readUInt16LE(pos);
    pos += 2;

    //32..33 Comment length
    const commentLength = data.readUInt16LE(pos);
    pos += 2;

    //34..35 Array dimension
    dataType.arrayDimension = data.readUInt16LE(pos);
    pos += 2;

    //36..37 Subitem count
    const subItemCount = data.readUInt16LE(pos);
    pos += 2;

    //38.. Data type name
    dataType.name = ADS.decodePlcStringBuffer(data.subarray(pos, pos + nameLength + 1));
    pos += nameLength + 1;

    //.. Data type type
    dataType.type = ADS.decodePlcStringBuffer(data.subarray(pos, pos + typeLength + 1));
    pos += typeLength + 1;

    //.. Data type comment
    dataType.comment = ADS.decodePlcStringBuffer(data.subarray(pos, pos + commentLength + 1));
    pos += commentLength + 1;

    //Array information
    dataType.arrayInfos = [];
    for (let i = 0; i < dataType.arrayDimension; i++) {
      const array = {} as AdsArrayInfoEntry;

      array.startIndex = data.readInt32LE(pos);
      pos += 4;

      array.length = data.readUInt32LE(pos);
      pos += 4;

      dataType.arrayInfos.push(array);
    }

    //Subitems (children data types)
    dataType.subItems = [];
    for (let i = 0; i < subItemCount; i++) {
      //First 4 bytes is subitem entry length (including the 4 bytes)
      const entryLength = data.readUInt32LE(pos);
      pos += 4;

      //Parse the subitem recursively
      const subItem = this.parseAdsResponseDataType(data.subarray(pos, pos + entryLength - 4));
      dataType.subItems.push(subItem);

      pos += entryLength - 4;
    }

    //If flag TypeGuid set
    if ((dataType.flags & ADS.ADS_DATA_TYPE_FLAGS.TypeGuid) === ADS.ADS_DATA_TYPE_FLAGS.TypeGuid) {
      dataType.typeGuid = data.subarray(pos, pos + 16).toString('hex');
      pos += 16;
    }

    //If flag CopyMask set
    if ((dataType.flags & ADS.ADS_DATA_TYPE_FLAGS.CopyMask) === ADS.ADS_DATA_TYPE_FLAGS.CopyMask) {
      //Let's skip this for now
      pos += dataType.size;
    }

    //If flag MethodInfos set
    dataType.rpcMethods = [];

    if ((dataType.flags & ADS.ADS_DATA_TYPE_FLAGS.MethodInfos) === ADS.ADS_DATA_TYPE_FLAGS.MethodInfos) {
      const methodCount = data.readUInt16LE(pos);
      pos += 2;

      //RPC methods
      for (let i = 0; i < methodCount; i++) {
        const method = {} as AdsRpcMethodEntry;

        //0..3 method entry length
        let entryLength = data.readUInt32LE(pos)
        let endPos = pos + entryLength;
        pos += 4;

        //4..7 Version
        method.version = data.readUInt32LE(pos);
        pos += 4;

        //8..11 Virtual table index
        method.vTableIndex = data.readUInt32LE(pos);
        pos += 4;

        //12..15 Return size
        method.returnTypeSize = data.readUInt32LE(pos);
        pos += 4;

        //16..19 Return align size
        method.returnAlignSize = data.readUInt32LE(pos)
        pos += 4

        //20..23 Reserved
        method.reserved = data.readUInt32LE(pos);
        pos += 4;

        //24..39 Return type GUID
        method.returnTypeGuid = data.subarray(pos, pos + 16).toString('hex');
        pos += 16;

        //40..43 Return data type
        method.returnAdsDataType = data.readUInt32LE(pos);
        method.returnAdsDataTypeStr = ADS.ADS_DATA_TYPES.toString(method.returnAdsDataType);
        pos += 4;

        //44..47 Flags
        method.flags = data.readUInt32LE(pos);
        method.flagsStr = ADS.ADS_RCP_METHOD_FLAGS.toStringArray(method.flags);
        pos += 4;

        //48..49 Name length
        const nameLength = data.readUInt16LE(pos);
        pos += 2;

        //50..51 Return type length
        const returnTypeLength = data.readUInt16LE(pos);
        pos += 2;

        //52..53 Comment length
        const commentLength = data.readUInt16LE(pos);
        pos += 2;

        //54..55 Parameter count
        const parameterCount = data.readUInt16LE(pos);
        pos += 2;

        //56.. Name
        method.name = ADS.decodePlcStringBuffer(data.subarray(pos, pos + nameLength + 1));
        pos += nameLength + 1;

        //.. Return data type
        method.retunDataType = ADS.decodePlcStringBuffer(data.subarray(pos, pos + returnTypeLength + 1));
        pos += returnTypeLength + 1;

        //.. Comment
        method.comment = ADS.decodePlcStringBuffer(data.subarray(pos, pos + commentLength + 1));
        pos += commentLength + 1;

        //Parameters
        method.parameters = [];

        for (let p = 0; p < parameterCount; p++) {
          const param = {} as AdsRpcMethodParameterEntry;

          let beginPosition = pos;

          //Get parameter entry length
          let entryLength = data.readUInt32LE(pos);
          pos += 4;

          //4..7 Size
          param.size = data.readUInt32LE(pos);
          pos += 4;

          //8..11 Align size
          param.alignSize = data.readUInt32LE(pos);
          pos += 4;

          //12..15 ADS data type
          param.adsDataType = data.readUInt32LE(pos);
          param.adsDataTypeStr = ADS.ADS_DATA_TYPES.toString(param.adsDataType);
          pos += 4;

          //16..19 Flags
          param.flags = data.readUInt16LE(pos);
          param.flagsStr = ADS.ADS_RCP_METHOD_PARAM_FLAGS.toStringArray(param.flags);
          pos += 4;

          //20..23 Reserved
          param.reserved = data.readUInt32LE(pos);
          pos += 4;

          //24..27 Type GUID
          param.typeGuid = data.subarray(pos, pos + 16).toString('hex');
          pos += 16;

          //28..31 LengthIsPara
          param.lengthIsParameterIndex = data.readUInt16LE(pos);
          pos += 2;

          //32..33 Name length
          const nameLength = data.readUInt16LE(pos);
          pos += 2;

          //34..35 Type length
          const typeLength = data.readUInt16LE(pos);
          pos += 2;

          //36..37 Comment length
          const commentLength = data.readUInt16LE(pos);
          pos += 2;

          //38.. Data type name
          param.name = ADS.decodePlcStringBuffer(data.subarray(pos, pos + nameLength + 1));
          pos += nameLength + 1;

          //.. Data type type
          param.type = ADS.decodePlcStringBuffer(data.subarray(pos, pos + typeLength + 1));
          pos += typeLength + 1;

          //.. Data type comment
          param.comment = ADS.decodePlcStringBuffer(data.subarray(pos, pos + commentLength + 1));
          pos += commentLength + 1;

          //Attributes
          param.attributes = [];

          if ((param.flags & ADS.ADS_RCP_METHOD_PARAM_FLAGS.Attributes) === ADS.ADS_RCP_METHOD_PARAM_FLAGS.Attributes) {
            const attributeCount = data.readUInt16LE(pos);
            pos += 2;

            //Attributes
            for (let i = 0; i < attributeCount; i++) {
              const attr = {} as AdsAttributeEntry;

              //Name length
              const nameLength = data.readUInt8(pos);
              pos += 1;

              //Value length
              const valueLength = data.readUInt8(pos);
              pos += 1;

              //Name
              attr.name = ADS.decodePlcStringBuffer(data.subarray(pos, pos + nameLength + 1));
              pos += nameLength + 1;

              //Value
              attr.value = ADS.decodePlcStringBuffer(data.subarray(pos, pos + valueLength + 1));
              pos += valueLength + 1;

              method.attributes.push(attr);
            }
          }

          if (pos - beginPosition > entryLength) {
            //There is some additional data left
            param.reserved2 = data.subarray(pos);
          }

          method.parameters.push(param);
        }

        //Attributes
        method.attributes = [];

        if ((method.flags & ADS.ADS_RCP_METHOD_FLAGS.Attributes) === ADS.ADS_RCP_METHOD_FLAGS.Attributes) {
          const attributeCount = data.readUInt16LE(pos);
          pos += 2;

          //Attributes
          for (let i = 0; i < attributeCount; i++) {
            const attr = {} as AdsAttributeEntry;

            //Name length
            const nameLength = data.readUInt8(pos);
            pos += 1;

            //Value length
            const valueLength = data.readUInt8(pos);
            pos += 1;

            //Name
            attr.name = ADS.decodePlcStringBuffer(data.subarray(pos, pos + nameLength + 1));
            pos += nameLength + 1;

            //Value
            attr.value = ADS.decodePlcStringBuffer(data.subarray(pos, pos + valueLength + 1));
            pos += valueLength + 1;

            method.attributes.push(attr);
          }
        }

        //Using endPos to fix issues if new data is added by Beckhoff
        pos = endPos;
        dataType.rpcMethods.push(method)
      }
    }

    //If flag Attributes set
    dataType.attributes = [];
    if ((dataType.flags & ADS.ADS_DATA_TYPE_FLAGS.Attributes) === ADS.ADS_DATA_TYPE_FLAGS.Attributes) {
      const attributeCount = data.readUInt16LE(pos);
      pos += 2;

      //Attributes
      for (let i = 0; i < attributeCount; i++) {
        const attr = {} as AdsAttributeEntry;

        //Name length
        const nameLength = data.readUInt8(pos);
        pos += 1;

        //Value length
        const valueLength = data.readUInt8(pos);
        pos += 1;

        //Name
        attr.name = ADS.decodePlcStringBuffer(data.subarray(pos, pos + nameLength + 1));
        pos += nameLength + 1;

        //Value
        attr.value = ADS.decodePlcStringBuffer(data.subarray(pos, pos + valueLength + 1));
        pos += valueLength + 1;

        dataType.attributes.push(attr);
      }
    }

    //If flag EnumInfos set
    dataType.enumInfos = [];
    if ((dataType.flags & ADS.ADS_DATA_TYPE_FLAGS.EnumInfos) === ADS.ADS_DATA_TYPE_FLAGS.EnumInfos) {
      const enumInfoCount = data.readUInt16LE(pos);
      pos += 2;

      for (let i = 0; i < enumInfoCount; i++) {
        let enumInfo = {} as AdsEnumInfoEntry;

        //Name length
        const nameLength = data.readUInt8(pos);
        pos += 1;

        //Enumeration name
        enumInfo.name = ADS.decodePlcStringBuffer(data.subarray(pos, pos + nameLength + 1));
        pos += nameLength + 1;

        //Enumeration value
        enumInfo.value = data.subarray(pos, pos + dataType.size);
        pos += dataType.size;

        dataType.enumInfos.push(enumInfo)
      }
    }

    //Reserved, if any
    dataType.reserved = data.subarray(pos);

    this.debugD(`parseAdsResponseDataType(): Data type parsed (result: ${dataType.name})`);

    return dataType;
  }

  /**
   * Gets data type declaration for requested type
   * NOTE: Only returns the requested data type and its direct children. Not the children of children.
   * The full datatype should be built using buildDataType()
   * 
   * @param name Data type name in the PLC (such as `ST_Struct`)
   * @param targetOpts Optional target settings that override values in `settings` (NOTE: If used, no caching is available -> worse performance)
   */
  private async getDataTypeDeclaration(name: string, targetOpts: Partial<AmsAddress> = {}): Promise<AdsDataType> {
    this.debug(`getDataTypeDeclaration(): Data type declaration requested for "${name}"`);

    //Is this data type already cached? Skip check if we have different target
    if (!this.settings.disableCaching
      && !targetOpts.adsPort
      && !targetOpts.amsNetId
      && this.metaData.dataTypes[name.toLowerCase()]) {

      this.debug(`getDataTypeDeclaration(): Data type declaration found from cache for "${name}"`);
      return this.metaData.dataTypes[name.toLowerCase()];
    }

    //Reading from target
    this.debug(`getDataTypeDeclaration(): Data type declaration for "${name}" not cached, reading from target`);

    //Allocating bytes for request
    const data = Buffer.alloc(16 + name.length + 1);
    let pos = 0;

    //0..3 IndexGroup
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.DataDataTypeInfoByNameEx, pos);
    pos += 4;

    //4..7 IndexOffset
    data.writeUInt32LE(0, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(0xFFFFFFFF, pos); //Seems to work OK (we don't know the size)
    pos += 4;

    //12..15 Write data length
    data.writeUInt32LE(name.length + 1, pos);
    pos += 4;

    //16..n Data
    ADS.encodeStringToPlcStringBuffer(name).copy(data, pos);
    pos += name.length + 1;

    try {
      const res = await this.sendAdsCommand<AdsReadWriteResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadWrite,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      //Parsing the data type, first 4 bytes can be skipped (data length)
      const dataType = this.parseAdsResponseDataType(res.ads.payload.subarray(4));

      //Only cache when original target
      if (!this.settings.disableCaching && !targetOpts.adsPort && !targetOpts.amsNetId) {
        this.metaData.dataTypes[name.toLowerCase()] = dataType;
      }
      this.debug(`getDataTypeDeclaration(): Data type declaration read and parsed for "${name}"`);

      return dataType;

    } catch (err) {
      this.debug(`getDataTypeDeclaration(): Reading data type declaration for "${name} failed: %o`, err);
      throw new ClientError(`getDataTypeDeclaration(): Reading data type declaration for "${name}" failed`, err);
    }
  }

  /**
   * Builds data type declaration for requested type with all children and their children
   * 
   * @param name Data type name in the PLC (such as `ST_Struct`)
   * @param targetOpts Optional target settings that override values in `settings` (NOTE: If used, no caching is available -> worse performance)
   * @param isRootType If true, this is the root type / first call / not recursive call (default: true)
   * @param knownSize Data type size (if known) - used with pseudo data types and TwinCAT 2 primite types
   */
  private async buildDataType(name: string, targetOpts: Partial<AmsAddress> = {}, isRootType = true, knownSize?: number): Promise<AdsDataType> {
    try {
      this.debug(`buildDataType(): Building data type for "${name}"`);

      let dataType: AdsDataType | undefined;

      try {
        dataType = await this.getDataTypeDeclaration(name, targetOpts);

      } catch (err) {
        if ((err as ClientError).adsError && (err as ClientError).adsError?.errorCode === 1808) {
          //Type wasn't found.
          //Might be TwinCAT 2 system that doesn't provide pseudo or base data types by ADS --> check if we know the type ourselves
          if (ADS.BASE_DATA_TYPES.isPseudoType(name)) {
            //This converts e.g. PVOID to a primitive type
            if (knownSize === undefined) {
              throw new ClientError(`Failed to convert pseudo type ${name} to primitive type as size is not known`);
            }
            name = ADS.BASE_DATA_TYPES.getTypeByPseudoType(name, knownSize)!;
          }

          if (ADS.BASE_DATA_TYPES.isKnownType(name)) {
            //This type is known
            const baseType = ADS.BASE_DATA_TYPES.find(name)!;

            dataType = {
              version: 0,
              hashValue: 0,
              typeHashValue: 0,
              size: knownSize ?? baseType.size,
              offset: 0,
              adsDataType: baseType.adsDataType,
              adsDataTypeStr: ADS.ADS_DATA_TYPES.toString(baseType.adsDataType),
              flags: 0,
              flagsStr: [],
              arrayDimension: 0,
              name: name,
              type: "",
              comment: "",
              arrayInfos: [],
              subItems: [],
              typeGuid: "",
              rpcMethods: [],
              attributes: [],
              enumInfos: [],
              reserved: Buffer.alloc(0)
            };
          } else {
            //Type is unknown - we can't do anything
            throw new ClientError(`Data type ${name} is unknown (PLC doesn't provide it and it's not a base type)`);
          }
        } else {
          //Other ADS error
          throw new ClientError(`Failed to get data type for ${name}`, err);
        }
      }

      let builtType: AdsDataType;

      if (dataType.subItems.length > 0) {
        //Data type has subitems -> building recursively
        builtType = {
          ...dataType,
          subItems: []
        };

        for (let i = 0; i < dataType.subItems.length; i++) {
          //Using subItems[i] as default
          let subItemType: AdsDataType;

          //Support for TwinCAT 3 < 4022: If we have empty struct, do nothing. 
          //ADS API will not return data type for empty struct.
          if (dataType.subItems[i].size === 0) {
            subItemType = { ...dataType.subItems[i] };
          } else {
            //Note: creating copy as otherwise we would edit cached datatype as objects are references
            subItemType = {
              ...(await this.buildDataType(dataType.subItems[i].type, targetOpts, false, dataType.subItems[i].size))
            };

            //Changing the type<-> name as it's subitem
            //Also keeping some data from parent datatype, such as offset
            subItemType.type = subItemType.name;
            subItemType.name = dataType.subItems[i].name;
            subItemType.hashValue = dataType.subItems[i].hashValue;
            subItemType.offset = dataType.subItems[i].offset;
            subItemType.comment = dataType.subItems[i].comment;
          }

          builtType.subItems.push(subItemType);
        }

      } else if ((((dataType.type === '' && !ADS.BASE_DATA_TYPES.isPseudoType(dataType.name)) || ADS.BASE_DATA_TYPES.isKnownType(dataType.name))
        && dataType.flagsStr.includes('DataType')
        && !dataType.flagsStr.includes('EnumInfos')
        && dataType.arrayDimension === 0)) {

        //This is final form (no need to go deeper)
        builtType = { ...dataType };

      } else if (dataType.arrayDimension > 0) {
        //Data type is an array - get array subtype
        builtType = {
          ...(await this.buildDataType(dataType.type, targetOpts, false))
        };

        builtType.arrayInfos = [...dataType.arrayInfos, ...builtType.arrayInfos];

      } else if (ADS.BASE_DATA_TYPES.isPseudoType(dataType.name)) {
        //Data type is a pseudo type (POINTER, REFERENCE, PVOID, UXINT)
        builtType = {
          ...dataType,
          name: ADS.BASE_DATA_TYPES.getTypeByPseudoType(dataType.name, dataType.size)!
        };

      } else if (dataType.flagsStr.includes('DataType') && dataType.flagsStr.includes('EnumInfos')) {
        //Enumeration - get original data type
        builtType = {
          ...(await this.buildDataType(dataType.type, targetOpts, false))
        };

        //Converting enumeration info values from buffers to correct ones
        builtType.enumInfos = dataType.enumInfos.map(entry => {
          const temp = {
            ...builtType,
            type: builtType.name
          };

          return {
            ...entry,
            value: this.convertBufferToPrimitiveType(entry.value as Buffer, temp)
          };
        });

      } else if (dataType.type === '' && dataType.subItems.length === 0 && dataType.adsDataType === ADS.ADS_DATA_TYPES.ADST_BIGTYPE) {
        //TwinCAT 2 - If we have empty struct, it's size is not 0 but it has no subitems
        //This is final form (no need to go deeper)
        builtType = { ...dataType };


      } else {
        //This is not the final data type -> continue recursively
        builtType = await this.buildDataType(dataType.type, targetOpts, false);
      }

      if (isRootType) {
        //The root type has actually the data type in "name" property
        builtType.type = builtType.name;
        builtType.name = '';
      }

      return builtType;

    } catch (err) {
      this.debug(`buildDataType(): Building data type for "${name}" failed: %o`, err);
      throw new ClientError(`buildDataType(): Building data type for "${name}" failed`, err);
    }
  }

  /**
   * Converts given Buffer data to primitive PLC type
   * 
   * @param buffer Buffer containing the raw data
   * @param dataType Target data type
   */
  private convertBufferToPrimitiveType(buffer: Buffer, dataType: AdsDataType): PlcPrimitiveType {
    if (dataType.adsDataType === ADS.ADS_DATA_TYPES.ADST_STRING) {
      return ADS.decodePlcStringBuffer(buffer);
    } else if (dataType.adsDataType === ADS.ADS_DATA_TYPES.ADST_WSTRING) {
      return ADS.decodePlcWstringBuffer(buffer);
    } else {
      return ADS.BASE_DATA_TYPES.fromBuffer(dataType.type, buffer, this.settings.convertDatesToJavascript);
    }
  }

  private convertBufferToObject<T = any>(data: Buffer, dataType: AdsDataType, isArrayItem: boolean = false): T {
    let result: any;

    if ((dataType.arrayInfos.length === 0 || isArrayItem) && dataType.subItems.length > 0) {
      //Struct or array item
      result = {};
      data = data.subarray(dataType.offset);

      for (const item of dataType.subItems) {
        result[item.name] = this.convertBufferToObject(data, item);
      }

    } else if (dataType.arrayInfos.length > 0 && !isArrayItem) {
      //Array
      result = [];

      const convertArrayDimension = (dim: number): any[] => {
        const temp = [];

        for (let i = 0; i < dataType.arrayInfos[dim].length; i++) {
          if (dataType.arrayInfos[dim + 1]) {
            //More dimensions available -> go deeper
            temp.push(convertArrayDimension(dim + 1));
          } else {
            //Final dimension
            temp.push(this.convertBufferToObject(data, dataType, true));
            data = data.subarray(dataType.size);
          }
        }

        return temp;
      }

      result = convertArrayDimension(0);

    } else if (dataType.enumInfos.length > 0 && this.settings.objectifyEnumerations) {
      //Enumeration and objectifyEnumerations is enabled
      const enumValue = this.convertBufferToPrimitiveType(data.subarray(dataType.offset, dataType.offset + dataType.size), dataType);
      const enumEntry = dataType.enumInfos.find(entry => entry.value === enumValue);

      if (enumEntry) {
        result = enumEntry;

      } else {
        //Value is not valid enum value
        result = {
          name: '',
          value: enumValue
        } as AdsEnumInfoEntry;
      }

    } else if (dataType.adsDataType === ADS.ADS_DATA_TYPES.ADST_BIGTYPE && dataType.subItems.length === 0) {
      if (dataType.size === 0) {
        //Empty STRUCT
        result = {};

      } else {
        //Empty FUNCTION_BLOCK or INTERFACE
        //They are handled similarly as pointers (as in TwinCAT.Ads.dll) 
        //so empty FB is not { } as we can't detect interface and empty FB from each other
        result = ADS.BASE_DATA_TYPES.fromBuffer(ADS.BASE_DATA_TYPES.getTypeByPseudoType('PVOID', dataType.size)!, data.subarray(dataType.offset, dataType.offset + dataType.size), this.settings.convertDatesToJavascript);
      }

    } else {
      //Primitive type
      result = this.convertBufferToPrimitiveType(data.subarray(dataType.offset, dataType.offset + dataType.size), dataType) as T;
    }

    return result as T;
  }

  private convertObjectToBuffer<T = any>(value: T, dataType: AdsDataType, objectPath: string = '', isArrayItem: boolean = false): ObjectToBufferConversionResult {
    let rawValue = Buffer.alloc(0);

    const pathInfo = objectPath === '' && dataType.name === ''
      ? ''
      : ` for ${objectPath}.${dataType.name}`;

    const allowedEnumValuesStr = dataType.enumInfos.map(entry => entry.name).join(', ');

    if (dataType.subItems.length > 0 && (dataType.arrayInfos.length === 0 || isArrayItem)) {
      //This is a struct or array item
      rawValue = Buffer.alloc(dataType.size);

      for (const subItem of dataType.subItems) {
        //Does value object contain this field/subItem?
        let key: undefined | string = undefined;

        //First, try the easy way (5-20x times faster)
        if ((value as Record<string, any>)[subItem.name] !== undefined) {
          key = subItem.name;

        } else {
          //Not found, try case-insensitive way (this is slower -> only doing if needed)
          try {
            key = Object.keys(value as Record<string, any>).find(objKey => objKey.toLowerCase() === subItem.name.toLowerCase());

          } catch (err) {
            //value is null/ not an object/something else went wrong
            key = undefined;
          }
        }

        //If the field/subItem isn't found from object, this is an error (we need to have all fields)
        if (key === undefined) {
          return {
            rawValue,
            missingProperty: `${pathInfo}.${subItem.name}`
          };
        }

        //Converting subItem
        let res = this.convertObjectToBuffer((value as Record<string, any>)[key], subItem, `${pathInfo}.${subItem.name}`);

        if (res.missingProperty) {
          //We have a missing property somewhere -> quit
          return res;
        }

        //Add the subitem data to the buffer
        res.rawValue.copy(rawValue, subItem.offset);
      }

    } else if (dataType.arrayInfos.length > 0 && !isArrayItem) {
      //This is an array
      rawValue = Buffer.alloc(dataType.arrayInfos.reduce((total, dimension) => total * dimension.length * dataType.size, 1));

      let pos = 0;
      /**
       * Helper function to recursively parse array dimensions.
       * 
       * Returns string if a index is missing from object.
       * Returns undefined if no errors
       * 
       * @param value 
       * @param dimension 
       * @param path 
       */
      const parseArrayDimension = (value: any, dimension: number, path = ''): string | undefined => {
        for (let child = 0; child < dataType.arrayInfos[dimension].length; child++) {
          if (dataType.arrayInfos[dimension + 1]) {
            //More array dimensions are available
            const err = parseArrayDimension(value[child], dimension + 1, `${path}[${child}]`);

            if (err) {
              return err;
            }

          } else {
            //This is the final array dimension
            if (value[child] === undefined) {
              return `${pathInfo}${path}[${child}]`;
            }

            //Converting array item
            let res = this.convertObjectToBuffer((value as any[])[child], dataType, `${pathInfo}.${path}[${child}]`, true);

            if (res.missingProperty) {
              //We have a missing property somewhere -> quit
              return res.missingProperty;
            }

            //Add the array item data to the buffer
            res.rawValue.copy(rawValue, pos);
            pos += dataType.size;
          }
        }
      }

      const err = parseArrayDimension(value, 0);

      if (err) {
        //Array index was missing
        return {
          rawValue,
          missingProperty: err
        };
      }

    } else if (dataType.enumInfos.length > 0) {
      //This is an enumeration value (number, string or object)
      rawValue = Buffer.alloc(dataType.size);
      let enumEntry: AdsEnumInfoEntry | undefined;

      if (typeof value === 'string') {
        //Is this a valid enum value?
        enumEntry = dataType.enumInfos.find(entry => entry.name.trim().toLowerCase() === value.trim().toLowerCase());

        if (!enumEntry) {
          throw new ClientError(`Provided value "${value}"${pathInfo} is not a valid value for this ENUM. Allowed values are a number and any of the following: ${allowedEnumValuesStr}`);
        }

      } else if (typeof value === 'object' && (value as AdsEnumInfoEntry).value !== undefined) {
        enumEntry = value as AdsEnumInfoEntry;

      } else if (typeof value === 'object' && (value as AdsEnumInfoEntry).name !== undefined) {
        //Is this a valid enum value?
        enumEntry = dataType.enumInfos.find(entry => entry.name.trim().toLowerCase() === (value as AdsEnumInfoEntry).name.trim().toLowerCase());

        if (!enumEntry) {
          throw new ClientError(`Provided value "${(value as AdsEnumInfoEntry).name}"${pathInfo} is not a valid value for this ENUM. Allowed values are a number and any of the following: ${allowedEnumValuesStr}`);
        }

      } else if (typeof value === 'number') {
        //Note: We allow any numeric value, just like TwinCAT does
        enumEntry = {
          name: '',
          value: value
        };

      } else {
        throw new ClientError(`Provided value ${JSON.stringify(value)}${pathInfo} is not valid value for this ENUM. Allowed values are a number and any of the following: ${allowedEnumValuesStr}`);
      }

      this.convertPrimitiveTypeToBuffer(enumEntry.value, dataType, rawValue);

    } else if (ADS.BASE_DATA_TYPES.isKnownType(dataType.type)) {
      rawValue = Buffer.alloc(dataType.size);
      this.convertPrimitiveTypeToBuffer(value as PlcPrimitiveType, dataType, rawValue);

    } else if (dataType.adsDataType === ADS.ADS_DATA_TYPES.ADST_BIGTYPE && dataType.subItems.length === 0) {
      //If size is 0, then it's empty struct -> rawValue is already OK
      if (dataType.size > 0) {
        //Empty FUNCTION_BLOCK or INTERFACE
        //They are handled similarly as pointers (as in TwinCAT.Ads.dll) 
        rawValue = Buffer.alloc(dataType.size);

        if (typeof value === 'bigint' || typeof value === 'number') {
          ADS.BASE_DATA_TYPES.toBuffer(ADS.BASE_DATA_TYPES.getTypeByPseudoType('PVOID', dataType.size)!, value as PlcPrimitiveType, rawValue);

        } else if (typeof value === 'object' && Object.keys(value as {}).length === 0) {
          //Value is {} - this is a special case. With FBs, it should work ok to write just zeroes
          //However, with intefaces it causes interface to be 0 --> null pointer possibility
          //Let it be user's problem if they really provide {} - helps writing empty FBs  
          ;
        } else {
          throw new ClientError(`Provided value ${JSON.stringify(value)}${pathInfo} is not valid value for this data type (${dataType.type})`);
        }
      }


    } else {
      throw new ClientError(`Data type is not known: ${dataType.type}`);
    }

    return {
      rawValue
    };
  }

  /**
   * Converts a primitive type value to raw value
   * 
   * @param value Value to convert, such as number, date, string etc.
   * @param dataType Data type of the value
   * @param buffer Buffer where to write that raw value (reference)
   */
  private convertPrimitiveTypeToBuffer(value: PlcPrimitiveType, dataType: AdsDataType, buffer: Buffer) {
    if (dataType.size === 0) {
      return;
    }

    if (dataType.adsDataType === ADS.ADS_DATA_TYPES.ADST_STRING) {
      //If string is too long for target data type, truncate it
      const length = Math.min(dataType.size - 1, (value as string).length);
      ADS.encodeStringToPlcStringBuffer(value as string).copy(buffer, 0, 0, length);

    } else if (dataType.adsDataType === ADS.ADS_DATA_TYPES.ADST_WSTRING) {
      ADS.encodeStringToPlcWstringBuffer(value as string).copy(buffer);

    } else {
      return ADS.BASE_DATA_TYPES.toBuffer(dataType.type, value, buffer);
    }
  }

  /**
   * Merges objects recursively. 
   * 
   * Used for example in `writeSymbol()` when `autoFill` is used 
   * to merge active values (missing properties) and user-defined properties.
   * 
   * This is based on https://stackoverflow.com/a/34749873/8140625 
   * and https://stackoverflow.com/a/49727784/8140625 but with some changes.
   * 
   * @param caseSensitive If true, property keys are handled as case-sensitive (as they normally are). In TwinCAT, they are case-insensitive --> using `false`.
   * @param target Target object where to merge source objects (the value provide by user)
   * @param sources One or more source object, which keys are merged to target if target is missing them
   */
  private deepMergeObjects(caseSensitive: boolean, target: any, ...sources: any[]): any {
    if (!sources.length) {
      return target;
    }

    const isObjectOrArray = (item: any) => {
      return (!!item) && ((item.constructor === Object) || Array.isArray(item));
    }

    const keyExists = (obj: Record<string, any>, key: string, caseSensitive: boolean) => {
      if (caseSensitive) {
        return obj[key] !== undefined;
      } else {
        return !!Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
      }
    }

    const getObjectKeyValue = (obj: Record<string, any>, key: string, caseSensitive: boolean) => {
      if (caseSensitive) {
        return obj[key];
      } else {
        const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
        return found === undefined ? undefined : obj[found];
      }
    }

    //Sets object value (case-sensitive or insensitive key)
    const setObjectKeyValue = (obj: Record<string, any>, key: string, value: any, caseSensitive: boolean) => {
      if (caseSensitive) {
        //Case-sensitive is easy
        obj[key] = value;

      } else {
        const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());

        //Note: It should <be> found always, as it was already checked by keyExists()
        if (found) {
          obj[found] = value;
        }
      }
    }

    const source = sources.shift();

    if (isObjectOrArray(target) && isObjectOrArray(source)) {
      for (const key in source) {
        if (isObjectOrArray(source[key])) {
          //Source is object or array
          if (keyExists(target, key, caseSensitive)) {
            //Target has this key, copy value
            setObjectKeyValue(target, key, Object.assign({}, target[key]), caseSensitive);

          } else {
            //Target doesn't have this key, add it)
            Object.assign(target, { [key]: {} });
          }

          //As this is an object, go through it recursively
          this.deepMergeObjects(caseSensitive, getObjectKeyValue(target, key, false), source[key]);

        } else {
          //Source is primitive type
          if (keyExists(target, key, caseSensitive)) {
            //Target has this key, copy value
            setObjectKeyValue(target, key, source[key], caseSensitive);

          } else {
            //Target doesn't have this key, add it
            Object.assign(target, { [key]: source[key] });
          }
        }
      }
    }

    return this.deepMergeObjects(caseSensitive, target, ...sources);
  }

  /**
   * Connects to the target
   */
  public connect(): Promise<Required<AdsClientConnection>> {
    return this.connectToTarget();
  }

  /**
   * Disconnects from the target
   * 
   * @param force If true, connection is dropped immediately. Should be used only if a very fast exit is needed. (default: false)
   */
  public disconnect(force: boolean = false): Promise<void> {
    return this.disconnectFromTarget(force);
  }

  /**
   * Reconnects to the target
   * 
   * Saves existing subscriptions, disconnects, connects and then subscribes again.
   * 
   * @param forceDisconnect If true, connection is dropped immediately. Should be used only if a very fast exit is needed. (default: false)
   */
  public reconnect(forceDisconnect: boolean = false): Promise<Required<AdsClientConnection>> {
    return this.reconnectToTarget(forceDisconnect) as Promise<Required<AdsClientConnection>>;
  }

  /**
   * Sets client debug level
   * 
   *  - 0 = no debugging (default)
   *  - 1 = basic debugging 
   *    - same as $env:DEBUG='ads-client'
   *  - 2 = detailed debugging
   *    - same as $env:DEBUG='ads-client,ads-client:details'
   *  - 3 = full debugging with raw I/O data
   *    - same as $env:DEBUG='ads-client,ads-client:details,ads-client:raw-data'
   * 
   * @param level 0 = none, 1 = basic, 2 = detailed, 3 = detailed + raw data
   */
  setDebugLevel(level: number): void {
    this.debugLevel_ = level;

    this.debug.enabled = level >= 1;
    this.debugD.enabled = level >= 2;
    this.debugIO.enabled = level >= 3;

    this.debug(`setDebugLevel(): Debug level set to ${level}`);
  }

  /**
   * Sends ADS Write Control command to the target
   * 
   * See Write Control ADS specification: https://infosys.beckhoff.com/content/1033/tc3_ads_intro/115879947.html?id=4720330147059483431
   * 
   * @param adsState Requested ADS state - see `ADS.ADS_STATE` object from `ads-commons.ts`. Can be a number or a valid string, such as `Config`
   * @param deviceState  Requested device state (default: 0)
   * @param data Additional data to send (if any)
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async writeControl(adsState: keyof typeof ADS.ADS_STATE | number, deviceState: number = 0, data: Buffer = Buffer.alloc(0), targetOpts: Partial<AmsAddress> = {}): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`writeControl(): Client is not connected. Use connect() to connect to the target first.`);
    }

    if (typeof adsState === 'string') {
      //This should be a valid string key for ADS.ADS_STATE
      let key = Object.keys(ADS.ADS_STATE).find(k => k.toLowerCase() === (adsState as string).toLowerCase()) as typeof adsState;

      if (!key) {
        throw new ClientError(`writeControl(): Provided string value "${adsState}" is not a valid ADS_STATE. See ADS.ADS_STATE object for valid string values.`);
      }

      adsState = ADS.ADS_STATE[key] as number;
    }

    this.debug(`writeControl(): Sending an ADS Write Control command (adsState: ${adsState}, deviceState: ${deviceState}, data: ${data.byteLength} bytes) to ${this.targetToString(targetOpts)}`);

    //Allocating bytes for request
    const payload = Buffer.alloc(8 + data.byteLength);
    let pos = 0;

    //0..1 ADS state
    payload.writeUInt16LE(adsState, pos);
    pos += 2;

    //2..3 Device state
    payload.writeUInt16LE(deviceState, pos);
    pos += 2;

    //4..7 Data length
    payload.writeUInt32LE(data.byteLength, pos);
    pos += 4;

    //7..n Data
    data.copy(payload, pos);

    try {
      const res = await this.sendAdsCommand<AdsWriteControlResponse>({
        adsCommand: ADS.ADS_COMMAND.WriteControl,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload
      });

      this.debug(`writeControl(): Write control command sent to ${this.targetToString(targetOpts)}`);

    } catch (err) {
      this.debug(`writeControl(): Sending write control command to ${this.targetToString(targetOpts)} failed: %o`, err);
      throw new ClientError(`writeControl(): Sending write control command to ${this.targetToString(targetOpts)} failed`, err);
    }
  }

  /**
   * Starts the PLC runtime (same as green play button in TwinCAT XAE)
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async startPlc(targetOpts: Partial<AmsAddress> = {}): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`startPlc(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`startPlc(): Starting PLC runtime at ${this.targetToString(targetOpts)}`);

    try {
      //Reading device state first as we don't want to change it (even though it's most probably 0)
      const state = await this.readPlcRuntimeState(targetOpts);

      await this.writeControl("Run", state.deviceState, undefined, targetOpts);

      this.debug(`startPlc(): PLC runtime started at ${this.targetToString(targetOpts)}`);
    } catch (err) {
      this.debug(`startPlc(): Starting PLC runtime at ${this.targetToString(targetOpts)} failed: %o`, err);
      throw new ClientError(`startPlc(): Starting PLC runtime at ${this.targetToString(targetOpts)} failed`, err);
    }
  }

  /**
   * Resets the PLC runtime (Same as reset cold in TwinCAT XAE)
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async resetPlc(targetOpts: Partial<AmsAddress> = {}): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`resetPlc(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`resetPlc(): Resetting PLC runtime at ${this.targetToString(targetOpts)}`);

    try {
      //Reading device state first as we don't want to change it (even though it's most probably 0)
      const state = await this.readPlcRuntimeState(targetOpts);

      await this.writeControl("Reset", state.deviceState, undefined, targetOpts);

      this.debug(`resetPlc(): PLC runtime reset at ${this.targetToString(targetOpts)}`);
    } catch (err) {
      this.debug(`resetPlc(): Resetting PLC runtime at ${this.targetToString(targetOpts)} failed: %o`, err);
      throw new ClientError(`resetPlc(): Resetting PLC runtime at ${this.targetToString(targetOpts)} failed`, err);
    }
  }

  /**
   * Stops the PLC runtime. Same as pressing the red stop button in TwinCAT XAE
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async stopPlc(targetOpts: Partial<AmsAddress> = {}): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`stopPlc(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`stopPlc(): Stopping PLC runtime at ${this.targetToString(targetOpts)}`);

    try {
      //Reading device state first as we don't want to change it (even though it's most probably 0)
      const state = await this.readPlcRuntimeState(targetOpts);

      await this.writeControl("Stop", state.deviceState, undefined, targetOpts);

      this.debug(`stopPlc(): PLC runtime stopped at ${this.targetToString(targetOpts)}`);
    } catch (err) {
      this.debug(`stopPlc(): Stopping PLC runtime at ${this.targetToString(targetOpts)} failed: %o`, err);
      throw new ClientError(`stopPlc(): Stopping PLC runtime at ${this.targetToString(targetOpts)} failed`, err);
    }
  }

  /**
   * Restarts the PLC runtime. Same as calling first `resetPlc()` and then `startPlc()`
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async restartPlc(targetOpts: Partial<AmsAddress> = {}): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`restartPlc(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`restartPlc(): Restarting PLC runtime at ${this.targetToString(targetOpts)}`);

    try {
      await this.resetPlc(targetOpts);
      await this.startPlc(targetOpts);

      this.debug(`restartPlc(): PLC runtime restarted at ${this.targetToString(targetOpts)}`);
    } catch (err) {
      this.debug(`restartPlc(): Restarting PLC runtime at ${this.targetToString(targetOpts)} failed: %o`, err);
      throw new ClientError(`restartPlc(): Restarting PLC runtime at ${this.targetToString(targetOpts)} failed`, err);
    }
  }

  /**
   * Sets TwinCAT system to run mode
   * 
   * NOTE: As default, restarts also the ads-client connection
   * 
   * @param reconnect If true (default), ads-client connection is reconnected after restarting (to restore subscriptions etc.)
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async setTcSystemToRun(reconnect: boolean = true, targetOpts: Partial<AmsAddress> = {}): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`setTcSystemToRun(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`setTcSystemToRun(): Setting TwinCAT system to run mode (reconnect: ${reconnect})`);

    try {
      //Reading device state first as we don't want to change it (even though it's most probably 0)
      const state = await this.readPlcRuntimeState(targetOpts);

      await this.writeControl("Reset", state.deviceState, undefined, { adsPort: 10000, ...targetOpts });

      this.debug(`setTcSystemToRun(): TwinCAT system at ${this.targetToString(targetOpts)} set to run mode`);

      if (reconnect) {
        this.debug(`setTcSystemToRun(): Reconnecting after TwinCAT system restart`);
        !this.settings.hideConsoleWarnings && console.log("WARNING: Reconnicting after TwinCAT system restart");
        this.onConnectionLost();
      }

    } catch (err) {
      this.debug(`setTcSystemToRun(): Setting TwinCAT system to run mode at ${this.targetToString(targetOpts)} failed: %o`, err);
      throw new ClientError(`setTcSystemToRun(): Setting TwinCAT system to run mode at ${this.targetToString(targetOpts)} failed`, err);
    }
  }

  /**
   * Sets TwinCAT system to config mode
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async setTcSystemToConfig(targetOpts: Partial<AmsAddress> = {}): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`setTcSystemToConfig(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`setTcSystemToConfig(): Setting TwinCAT system to config mode`);

    try {
      //Reading device state first as we don't want to change it (even though it's most probably 0)
      const state = await this.readPlcRuntimeState(targetOpts);

      await this.writeControl("Reconfig", state.deviceState, undefined, { adsPort: 10000, ...targetOpts });

      this.debug(`setTcSystemToConfig(): TwinCAT system at ${this.targetToString(targetOpts)} set to config mode`);

    } catch (err) {
      this.debug(`setTcSystemToConfig(): Setting TwinCAT system to config mode at ${this.targetToString(targetOpts)} failed: %o`, err);
      throw new ClientError(`setTcSystemToConfig(): Setting TwinCAT system to config mode at ${this.targetToString(targetOpts)} failed`, err);
    }
  }

  /**
   * Restarts TwinCAT system to run mode. Actually just a wrapper for `setTcSystemToRun()`
   * 
   * NOTE: As default, restarts also the ads-client connection
   * 
   * @param reconnect If true (default), ads-client connection is reconnected after restarting (to restore subscriptions etc.)
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async restartTcSystem(reconnect: boolean = true, targetOpts: Partial<AmsAddress> = {}): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`restartTcSystem(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`restartTcSystem(): Restarting TwinCAT system (reconnect: ${reconnect})`);
    await this.setTcSystemToRun(reconnect, targetOpts);
    this.debug(`restartTcSystem(): TwinCAT system was restarted`);
  }

  /**
   * Reads and parses symbol information for given variable path
   * Saved to cache if target is not overridden.
   * 
   * @param path Full variable path in the PLC (such as `GVL_Test.ExampleStruct`)
   * @param targetOpts Optional target settings that override values in `settings` (NOTE: If used, no caching is available -> worse performance)
   */
  public async getSymbolInfo(path: string, targetOpts: Partial<AmsAddress> = {}): Promise<AdsSymbolInfo> {
    if (!this.connection.connected) {
      throw new ClientError(`getSymbolInfo(): Client is not connected. Use connect() to connect to the target first.`);
    }
    path = path.trim();

    this.debug(`getSymbolInfo(): Symbol info requested for "${path}"`);

    //Is this symbol already cached? Skip check if we have different target
    if (!this.settings.disableCaching
      && !targetOpts.adsPort
      && !targetOpts.amsNetId
      && this.metaData.symbols[path.toLowerCase()]) {

      this.debug(`getSymbolInfo(): Symbol info found from cache for "${path}"`);
      return this.metaData.symbols[path.toLowerCase()];
    }

    //Reading from target
    this.debug(`getSymbolInfo(): Symbol info for "${path}" not cached, reading from target`);

    //Allocating bytes for request
    const data = Buffer.alloc(16 + path.length + 1);
    let pos = 0;

    //0..3 IndexGroup
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolInfoByNameEx, pos);
    pos += 4;

    //4..7 IndexOffset
    data.writeUInt32LE(0, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(0xFFFFFFFF, pos); //Seems to work OK (we don't know the size)
    pos += 4;

    //12..15 Write data length
    data.writeUInt32LE(path.length + 1, pos);
    pos += 4;

    //16..n Data
    ADS.encodeStringToPlcStringBuffer(path).copy(data, pos);
    pos += path.length + 1;

    try {
      const res = await this.sendAdsCommand<AdsReadWriteResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadWrite,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      //Parsing the symbol, first 4 bytes can be skipped (data length)
      const symbol = this.parseAdsResponseSymbolInfo(res.ads.payload.subarray(4));

      //Only cache when original target
      if (!this.settings.disableCaching && !targetOpts.adsPort && !targetOpts.amsNetId) {
        this.metaData.symbols[path.toLowerCase()] = symbol;
      }

      this.debug(`getSymbolInfo(): Symbol info read and parsed for "${path}"`);
      return symbol;

    } catch (err) {
      this.debug(`getSymbolInfo(): Reading symbol info for "${path}" failed: %o`, err);
      throw new ClientError(`getSymbolInfo(): Reading symbol info for "${path} failed`, err);
    }
  }

  /**
   * Returns full built data type declaration with subitems for given data type
   * 
   * @param name Data type name in the PLC (such as `ST_Struct`)
   * @param targetOpts Optional target settings that override values in `settings` (NOTE: If used, no caching is available -> worse performance)
   */
  public async getDataType(name: string, targetOpts: Partial<AmsAddress> = {}): Promise<AdsDataType> {
    if (!this.connection.connected) {
      throw new ClientError(`getDataType(): Client is not connected. Use connect() to connect to the target first.`);
    }
    name = name.trim();

    this.debug(`getDataType(): Data type requested for "${name}"`);
    const dataType = await this.buildDataType(name, targetOpts);
    this.debug(`getDataType(): Data type read and built for "${name}"`);

    return dataType;

  }

  /**
    * Reads target PLC runtime state
    * 
    * If original target, the state is also saved to the `metaData.plcRuntimeStatus`
    * 
    * @param targetOpts Optional target settings that override values in `settings`
    */
  public async readPlcRuntimeState(targetOpts: Partial<AmsAddress> = {}): Promise<AdsState> {
    if (!this.connection.connected) {
      throw new ClientError(`readPlcRuntimeState(): Client is not connected. Use connect() to connect to the target first.`);
    }

    try {
      this.debug(`readPlcRuntimeState(): Reading PLC runtime state`);

      const res = await this.sendAdsCommand<AdsReadStateResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadState,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort
      });

      this.debug(`readPlcRuntimeState(): Runtime state read successfully. State is %o`, res.ads.payload);

      if (!targetOpts.adsPort && !targetOpts.amsNetId) {
        //Target is not overridden -> save to metadata
        this.metaData.plcRuntimeState = res.ads.payload;
      }

      return res.ads.payload;

    } catch (err) {
      this.debug(`readPlcRuntimeState(): Reading PLC runtime state failed: %o`, err);
      throw new ClientError(`readPlcRuntimeState(): Reading PLC runtime state failed`, err);
    }
  }

  /**
    * Reads target TwinCAT system state (usually `Run` or `Config`, ADS port 10000)
    * 
    * If original target, the state is also saved to the `metaData.tcSystemState`
    * 
    * @param targetOpts Optional target settings that override values in `settings`
    */
  public async readTcSystemState(targetOpts: Partial<AmsAddress> = {}): Promise<AdsState> {
    if (!this.connection.connected) {
      throw new ClientError(`readTcSystemState(): Client is not connected. Use connect() to connect to the target first.`);
    }

    try {
      this.debug(`readTcSystemState(): Reading TwinCAT system state`);

      const res = await this.sendAdsCommand<AdsReadStateResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadState,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort ?? ADS.ADS_RESERVED_PORTS.SystemService
      });

      this.debug(`readTcSystemState(): TwinCAT system state read successfully. State is %o`, res.ads.payload);

      if (!targetOpts.adsPort && !targetOpts.amsNetId) {
        //Target is not overridden -> save to metadata
        this.metaData.tcSystemState = res.ads.payload;
      }

      return res.ads.payload;

    } catch (err) {
      this.debug(`readTcSystemState(): Reading TwinCAT system state failed: %o`, err);
      throw new ClientError(`readTcSystemState(): Reading TwinCAT system state failed`, err);
    }
  }

  /**
    * Reads PLC runtime symbol version (only works if target is a PLC runtime).
    * 
    * Symbol version usually changes when PLC software is updated
    * 
    * If original target, the symbol version is also updated to the `metaData.plcSymbolVersion`
    * 
    * @param targetOpts Optional target settings that override values in `settings`
    */
  public async readPlcSymbolVersion(targetOpts: Partial<AmsAddress> = {}): Promise<number> {
    if (!this.connection.connected) {
      throw new ClientError(`readPlcSymbolVersion(): Client is not connected. Use connect() to connect to the target first.`);
    }

    try {
      this.debug(`readPlcSymbolVersion(): Reading PLC runtime symbol version`);

      const res = await this.readRaw(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolVersion, 0, 1);
      const symbolVersion = res.readUInt8(0);

      this.debug(`readPlcSymbolVersion(): PLC runtime symbol version is now ${symbolVersion}`);

      if (!targetOpts.adsPort && !targetOpts.amsNetId) {
        //Target is not overridden
        this.onPlcSymbolVersionChanged(res);
      }

      return symbolVersion;

    } catch (err) {
      this.debug(`readPlcSymbolVersion(): Reading PLC runtime symbol failed: %o`, err);
      throw new ClientError(`readPlcSymbolVersion(): Reading PLC runtime symbol failed`, err);
    }
  }

  /**
   * Subscribes to variable or raw ADS address value change notifications (ADS notifications).
   * 
   * Callback is called with latest value when changed or when cycle time has passed, depending on settings.
   * 
   * @param options - Subscription options
   * @param targetOpts Optional target settings that override values in `settings` (NOTE: If used, no caching is available -> worse performance)
   * 
   * @template T Typescript data type of the PLC data, for example `subscribe<number>(...)` or `subscribe<ST_TypedStruct>(...)`. If target is raw address, use `subscribe<Buffer>`
   */
  public subscribe<T = any>(options: SubscriptionSettings<T>, targetOpts: Partial<AmsAddress> = {}): Promise<ActiveSubscription<T>> {
    if (!this.connection.connected) {
      throw new ClientError(`subscribe(): Client is not connected. Use connect() to connect to the target first.`);
    }

    try {
      this.debug(`subscribe(): Subscribing to "%o"`, options.target);

      return this.addSubscription<T>(options, false, targetOpts);

    } catch (err) {
      this.debug(`subscribe(): Subscribing to "${options.target}" failed: %o`, err);
      throw new ClientError(`subscribe(): Subscribing to "${options.target}" failed`, err);
    }
  }

  /**
   * Unsubscribes given subscription by notificationHandle or subscription object
   * 
   * @param target Subscription object to unsubscribe (return value of `subscribe()` call)
   */
  public async unsubscribe(target: ActiveSubscription): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`unsubscribe(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`unsubscribe(): Unsubscribing %o`, target);

    //Allocating bytes for request
    const data = Buffer.alloc(4);
    let pos = 0;

    //0..3 Notification handle
    data.writeUInt32LE(target.notificationHandle, pos);
    pos += 4;

    try {
      const res = await this.sendAdsCommand<AdsDeleteNotificationResponse>({
        adsCommand: ADS.ADS_COMMAND.DeleteNotification,
        targetAmsNetId: target.remoteAddress.amsNetId,
        targetAdsPort: target.remoteAddress.adsPort,
        payload: data
      });

      const address = ADS.amsAddressToString(target.remoteAddress);

      if (this.activeSubscriptions[address]) {
        delete this.activeSubscriptions[address][target.notificationHandle];
      }

      this.debug(`unsubscribe(): Subscription with handle ${target.notificationHandle} unsubscribed from ${address}`);

    } catch (err) {
      this.debug(`unsubscribe(): Unsubscribing failed: %o`, err);
      throw new ClientError(`unsubscribe(): Unsubscribing failed`, err);
    }
  }

  /**
   * Unsubscribes from all active subscriptions
   */
  public async unsubscribeAll(): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`unsubscribeAll(): Client is not connected. Use connect() to connect to the target first.`);
    }

    try {
      this.debug(`unsubscribeAll(): Unsubscribing from all active subscriptions`);

      await this.removeSubscriptions(false);

      this.debug(`unsubscribeAll(): All subscriptions unsubscribed successfully`);

    } catch (err) {
      this.debug(`unsubscribeAll(): Unsubscribing all failed: %o`, err);
      throw new ClientError(`unsubscribeAll(): Unsubscribing all failed`, err);
    }
  }

  /**
    * Reads target device / system manager information
    * If original target, the state is also saved to the `metaData.deviceInfo`
    * 
    * @param targetOpts Optional target settings that override values in `settings`
    */
  public async readDeviceInfo(targetOpts: Partial<AmsAddress> = {}): Promise<AdsDeviceInfo> {
    if (!this.connection.connected) {
      throw new ClientError(`readDeviceInfo(): Client is not connected. Use connect() to connect to the target first.`);
    }

    try {
      this.debug(`readDeviceInfo(): Reading device info`);

      const res = await this.sendAdsCommand<AdsReadDeviceInfoResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadDeviceInfo,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort
      });

      this.debug(`readDeviceInfo(): Device info read successfully. Device is %o`, res.ads.payload);

      if (!targetOpts.adsPort && !targetOpts.amsNetId) {
        //Target is not overridden -> save to metadata
        this.metaData.deviceInfo = res.ads.payload;
      }

      return res.ads.payload;

    } catch (err) {
      this.debug(`readDeviceInfo(): Reading device info failed: %o`, err);
      throw new ClientError(`readDeviceInfo():Reading device info failed`, err);
    }
  }

  /**
   * Reads target PLC runtime upload information 
   * Info about data types and symbols
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async readUploadInfo(targetOpts: Partial<AmsAddress> = {}): Promise<AdsUploadInfo> {
    if (!this.connection.connected) {
      throw new ClientError(`readUploadInfo(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`readUploadInfo(): Reading upload info`);

    //Allocating bytes for request
    const data = Buffer.alloc(12);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolUploadInfo2, pos);
    pos += 4;

    //4..7 IndexOffset
    data.writeUInt32LE(0, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(24, pos);
    pos += 4;

    try {
      const res = await this.sendAdsCommand<AdsReadResponse>({
        adsCommand: ADS.ADS_COMMAND.Read,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      const uploadInfo = {} as AdsUploadInfo;

      let pos = 0;
      const response = res.ads.payload;

      //0..3 Symbol count
      uploadInfo.symbolCount = response.readUInt32LE(pos);
      pos += 4;

      //4..7 Symbol length
      uploadInfo.symbolLength = response.readUInt32LE(pos);
      pos += 4;

      //8..11 Data type count
      uploadInfo.dataTypeCount = response.readUInt32LE(pos);
      pos += 4;

      //12..15 Data type length
      uploadInfo.dataTypeLength = response.readUInt32LE(pos);
      pos += 4;

      //16..19 Extra count
      uploadInfo.extraCount = response.readUInt32LE(pos);
      pos += 4;

      //20..23 Extra length
      uploadInfo.extraLength = response.readUInt32LE(pos);
      pos += 4;

      if (!targetOpts.adsPort && !targetOpts.amsNetId) {
        //Target is not overridden -> save to metadata
        this.metaData.uploadInfo = uploadInfo;
      }

      this.debug(`readUploadInfo(): Upload info read and parsed for ${ADS.amsAddressToString(res.ams.sourceAmsAddress)}`);
      return uploadInfo;

    } catch (err) {
      this.debug(`readUploadInfo(): Reading upload info failed: %o`, err);
      throw new ClientError(`readUploadInfo(): Reading upload info failed`, err);
    }
  }

  /**
   * Reads and parses ALL target PLC symbol information data.
   * 
   * If target is not overridden, also caches the result.
   * 
   * **WARNING: The returned object might be VERY large**
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async getSymbolInfos(targetOpts: Partial<AmsAddress> = {}): Promise<AdsSymbolInfoContainer> {
    if (!this.connection.connected) {
      throw new ClientError(`getSymbolInfos(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`getSymbolInfos(): Reading symbol information`);

    let uploadInfo: AdsUploadInfo;
    try {
      this.debug(`getSymbolInfos(): Updating upload info (needed for symbol reading)`)

      uploadInfo = await this.readUploadInfo(targetOpts);

    } catch (err) {
      this.debug(`getSymbolInfos(): Reading upload info failed`)
      throw new ClientError(`getSymbolInfos(): Reading upload info failed`, err);
    }

    //Allocating bytes for request
    const data = Buffer.alloc(12);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolUpload, pos);
    pos += 4;

    //4..7 IndexOffset
    data.writeUInt32LE(0, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(uploadInfo.symbolLength, pos);
    pos += 4;

    try {
      const res = await this.sendAdsCommand<AdsReadResponse>({
        adsCommand: ADS.ADS_COMMAND.Read,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      const symbols = {} as AdsSymbolInfoContainer;

      let response = res.ads.payload;
      let count = 0;

      while (response.byteLength > 0) {
        let pos = 0;

        //0..3 Symbol information bytelength
        const len = response.readUInt32LE(pos);
        pos += 4;

        const symbol = this.parseAdsResponseSymbolInfo(response.subarray(pos, pos + len));
        symbols[symbol.name.trim().toLowerCase()] = symbol;

        response = response.subarray(len);
        count++;
      }

      if (!targetOpts.adsPort && !targetOpts.amsNetId) {
        //Target is not overridden -> save to metadata
        this.metaData.symbols = symbols;
        this.metaData.allSymbolsCached = true;
        this.debug(`getSymbolInfos(): All symbols read and cached (symbol count ${count})`);

      } else {
        this.debug(`getSymbolInfos(): All symbols read (symbol count ${count})`);
      }

      return symbols;

    } catch (err) {
      this.debug(`getSymbolInfos(): Reading symbol information failed: %o`, err);
      throw new ClientError(`getSymbolInfos(): Reading symbol information failed`, err);
    }
  }

  /**
   * Caches all symbol information data from target PLC runtime
   * 
   * Can be used to pre-cache all symbols to speed up communication. 
   * Caching is only available for the original target configured in settings. 
   * 
   * Wrapper for `getSymbolInfos()` (calling it without overridden target has the same effect)
   */
  public async cacheSymbolInfos() {
    this.debug(`cacheSymbolInfos(): Caching all symbol information`);

    try {
      await this.getSymbolInfos();

      this.debug(`cacheSymbolInfos(): All symbol information is now cached`);

    } catch (err) {
      this.debug(`cacheSymbolInfos(): Caching symbol information failed: %o`, err);
      throw new ClientError(`cacheSymbolInfos(): Caching symbol information failed`, err);
    }
  }

  /**
   * Reads and parses ALL target PLC data type data.
   * 
   * If target is not overridden, also caches the result.
   * 
   * **IMPORTANT:** These data types do not have full construction with deep-level subitems.
   * To get full data type declaration for specific data type, use `getDataType()`.
   * 
   * **WARNING: The returned object might be VERY large**
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async getDataTypes(targetOpts: Partial<AmsAddress> = {}): Promise<AdsDataTypeContainer> {
    if (!this.connection.connected) {
      throw new ClientError(`getDataTypes(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`getDataTypes(): Reading data types`);

    let uploadInfo: AdsUploadInfo;
    try {
      this.debug(`getDataTypes(): Updating upload info (needed for data type reading)`)

      uploadInfo = await this.readUploadInfo(targetOpts);

    } catch (err) {
      this.debug(`getDataTypes(): Reading upload info failed`)
      throw new ClientError(`getDataTypes(): Reading upload info failed`, err);
    }

    //Allocating bytes for request
    const data = Buffer.alloc(12);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolDataTypeUpload, pos);
    pos += 4;

    //4..7 IndexOffset
    data.writeUInt32LE(0, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(uploadInfo.dataTypeLength, pos);
    pos += 4;

    try {
      const res = await this.sendAdsCommand<AdsReadResponse>({
        adsCommand: ADS.ADS_COMMAND.Read,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      const dataTypes = {} as AdsDataTypeContainer;
      let response = res.ads.payload;
      let count = 0;

      while (response.byteLength > 0) {
        let pos = 0;

        //0..3 Data type information bytelength
        const len = response.readUInt32LE(pos);
        pos += 4;

        const dataType = this.parseAdsResponseDataType(response.subarray(pos, pos + len));
        dataTypes[dataType.name.trim().toLowerCase()] = dataType;

        response = response.subarray(len);
        count++;
      }

      if (!targetOpts.adsPort && !targetOpts.amsNetId) {
        //Target is not overridden -> save to metadata
        this.metaData.dataTypes = dataTypes;
        this.metaData.allDataTypesCached = true;
        this.debug(`getDataTypes(): All data types read and cached (data type count ${count})`);

      } else {
        this.debug(`getDataTypes(): All symbols read (data type count ${count})`);
      }

      return dataTypes;

    } catch (err) {
      this.debug(`getDataTypes(): Reading data type information failed: %o`, err);
      throw new ClientError(`getDataTypes(): Reading data type information failed`, err);
    }
  }

  /**
   * Caches all data types from target PLC runtime
   * 
   * Can be used to pre-cache all data types to speed up communication. 
   * Caching is only available for the original target configured in settings. 
   * 
   * Wrapper for `getDataTypes()` (calling it without overridden target has the same effect)
   */
  public async cacheDataTypes() {
    this.debug(`cacheDataTypes(): Caching all data types`);

    try {
      await this.getDataTypes();

      this.debug(`cacheDataTypes(): All data types are now cached`);

    } catch (err) {
      this.debug(`cacheDataTypes(): Caching data types failed: %o`, err);
      throw new ClientError(`cacheDataTypes(): Caching data types failed`, err);
    }
  }

  /**
   * Reads raw byte data from the target system by provided index group, index offset and data length (bytes)
   * 
   * This is the `ADS read` command in ADS protocol.
   *  
   * @param indexGroup Index group (address) of the data to read
   * @param indexOffset Index offset (address) of the data to read
   * @param size Data length to read (bytes)
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async readRaw(indexGroup: number, indexOffset: number, size: number, targetOpts: Partial<AmsAddress> = {}): Promise<Buffer> {
    if (!this.connection.connected) {
      throw new ClientError(`readRaw(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`readRaw(): Reading raw data (${JSON.stringify({ indexGroup, indexOffset, size })})`);

    //Allocating bytes for request
    const data = Buffer.alloc(12);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(indexGroup, pos);
    pos += 4;

    //4..7 IndexOffset
    data.writeUInt32LE(indexOffset, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(size, pos);
    pos += 4;

    try {
      const res = await this.sendAdsCommand<AdsReadResponse>({
        adsCommand: ADS.ADS_COMMAND.Read,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      this.debug(`readRaw(): Reading raw data (${JSON.stringify({ indexGroup, indexOffset, size })}) done (${res.ads.length} bytes)`);
      return res.ads.payload;

    } catch (err) {
      this.debug(`readRaw(): Reading raw data (${JSON.stringify({ indexGroup, indexOffset, size })}) failed: %o`, err);
      throw new ClientError(`readRaw(): Reading raw data (${JSON.stringify({ indexGroup, indexOffset, size })}) failed`, err);
    }
  }

  /**
   * Writes raw byte data to the target system by provided index group and index offset.
   * 
   * This is the `ADS write` command in ADS protocol.
   *  
   * @param indexGroup Index group (address) of the data to write to
   * @param indexOffset Index offset (address) of the data to write to
   * @param value Data to write
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async writeRaw(indexGroup: number, indexOffset: number, value: Buffer, targetOpts: Partial<AmsAddress> = {}): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`writeRaw(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`readRaw(): Writing raw data to ${JSON.stringify({ indexGroup, indexOffset })} (${value.byteLength} bytes)`);

    //Allocating bytes for request
    const data = Buffer.alloc(12 + value.byteLength);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(indexGroup, pos);
    pos += 4;

    //4..7 IndexOffset
    data.writeUInt32LE(indexOffset, pos);
    pos += 4;

    //8..11 Write data length
    data.writeUInt32LE(value.byteLength, pos);
    pos += 4;

    //12..n Data
    value.copy(data, pos);

    try {
      const res = await this.sendAdsCommand<AdsWriteResponse>({
        adsCommand: ADS.ADS_COMMAND.Write,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      this.debug(`writeRaw(): Writing raw data (${JSON.stringify({ indexGroup, indexOffset })}) done (${value.byteLength} bytes)`);

    } catch (err) {
      this.debug(`writeRaw(): Writing raw data (${JSON.stringify({ indexGroup, indexOffset })}) failed: %o`, err);
      throw new ClientError(`writeRaw(): Writing raw data (${JSON.stringify({ indexGroup, indexOffset })}) failed`, err);
    }
  }

  /**
   * Reads multiple raw values from given addresses
   * 
   * Uses ADS sum command under the hood
   * 
   * @param targets Array of targets to read
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async readRawMulti(targets: AdsReadRawMultiTarget[], targetOpts: Partial<AmsAddress> = {}): Promise<AdsReadRawMultiResult[]> {
    if (!this.connection.connected) {
      throw new ClientError(`readRawMulti(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`readRawMulti(): Reading raw data from ${targets.length} targets`);
    const totalSize = targets.reduce((total, target) => total + target.size, 0);

    //Allocating bytes for request
    const data = Buffer.alloc(16 + targets.length * 12);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SumCommandRead, pos);
    pos += 4;

    //4..7 IndexOffset - Number of targets
    data.writeUInt32LE(targets.length, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(targets.length * 4 + totalSize, pos);
    pos += 4;

    //12..15 Write data length
    data.writeUInt32LE(targets.length * 12, pos);
    pos += 4;

    //16..n targets
    targets.forEach(target => {
      //0..3 IndexGroup
      data.writeUInt32LE(target.indexGroup, pos);
      pos += 4;

      //4..7 IndexOffset
      data.writeUInt32LE(target.indexOffset, pos);
      pos += 4;

      //8..11 Data size
      data.writeUInt32LE(target.size, pos);
      pos += 4;
    });

    try {
      const res = await this.sendAdsCommand<AdsReadWriteResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadWrite,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      this.debug(`readRawMulti(): Reading raw data from ${targets.length} targets done (${res.ads.length} bytes)`);

      let pos = 0;
      let results: AdsReadRawMultiResult[] = [];

      //Error codes of each target
      for (let i = 0; i < targets.length; i++) {
        const errorCode = res.ads.payload.readUInt32LE(pos);
        pos += 4;

        const result: AdsReadRawMultiResult = {
          target: targets[i],
          success: errorCode === 0,
          error: errorCode > 0,
          errorCode,
          errorStr: ADS.ADS_ERROR[errorCode],
          value: undefined
        };

        results.push(result);
      };

      //Value for each target
      for (let i = 0; i < targets.length; i++) {
        if (!results[i].error) {
          results[i].value = res.ads.payload.subarray(pos, pos + targets[i].size);
        }

        pos += targets[i].size;
      }

      return results;

    } catch (err) {
      this.debug(`readRawMulti(): Reading raw data from ${targets.length} targets failed: %o`, err);
      throw new ClientError(`readRawMulti(): Reading raw data from ${targets.length} targets failed`, err);
    }
  }

  /**
   * Writes multiple raw values to given addresses
   * 
   * Uses ADS sum command under the hood
   * 
   * @param targets Array of targets to write
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async writeRawMulti(targets: AdsWriteRawMultiTarget[], targetOpts: Partial<AmsAddress> = {}): Promise<AdsWriteRawMultiResult[]> {
    if (!this.connection.connected) {
      throw new ClientError(`writeRawMulti(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`writeRawMulti(): Writing raw data to ${targets.length} targets`);
    const totalSize = targets.reduce((total, target) => total + (target.size ?? target.value.byteLength), 0);

    //Allocating bytes for request
    const data = Buffer.alloc(16 + targets.length * 12 + totalSize);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SumCommandWrite, pos);
    pos += 4;

    //4..7 IndexOffset - Number of targets
    data.writeUInt32LE(targets.length, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(targets.length * 4, pos);
    pos += 4;

    //12..15 Write data length
    data.writeUInt32LE(targets.length * 12 + totalSize, pos);
    pos += 4;

    //16..n targets
    targets.forEach(target => {
      //0..3 IndexGroup
      data.writeUInt32LE(target.indexGroup, pos);
      pos += 4;

      //4..7 IndexOffset
      data.writeUInt32LE(target.indexOffset, pos);
      pos += 4;

      //8..11 Data size
      data.writeUInt32LE(target.size ?? target.value.byteLength, pos);
      pos += 4;
    });

    //values
    targets.forEach(target => {
      target.value.copy(data, pos, 0, target.size ?? target.value.byteLength); //allowing to use size
      pos += target.size ?? target.value.byteLength;
    });

    try {
      const res = await this.sendAdsCommand<AdsReadWriteResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadWrite,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      this.debug(`writeRawMulti(): Writing raw data to ${targets.length} targets done`);

      let pos = 0;
      let results: AdsWriteRawMultiResult[] = [];

      //Error codes of each target
      for (let i = 0; i < targets.length; i++) {
        const errorCode = res.ads.payload.readUInt32LE(pos);
        pos += 4;

        const result: AdsWriteRawMultiResult = {
          target: targets[i],
          success: errorCode === 0,
          error: errorCode > 0,
          errorCode,
          errorStr: ADS.ADS_ERROR[errorCode]
        };

        results.push(result);
      };

      return results;

    } catch (err) {
      this.debug(`writeRawMulti(): Writing raw data to ${targets.length} targets failed: %o`, err);
      throw new ClientError(`writeRawMulti(): Writing raw data to ${targets.length} targets failed`, err);
    }
  }

  /**
   * Reads raw byte data from the target system by symbol path.
   * 
   * Supports also reading POINTER and REFERENCE values by using deference operator in path (`^`)
   * 
   * This uses the ADS command `READ_SYMVAL_BYNAME` under the hood
   *  
   * @param path Variable path in the PLC to read (such as `GVL_Test.ExampleStruct`)
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async readRawByPath(path: string, targetOpts: Partial<AmsAddress> = {}): Promise<Buffer> {
    if (!this.connection.connected) {
      throw new ClientError(`readRawByPath(): Client is not connected. Use connect() to connect to the target first.`);
    }
    path = path.trim();
    this.debug(`readRawByPath(): Reading raw data from ${path}`);

    //Allocating bytes for request
    const data = Buffer.alloc(16 + path.length + 1);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolValueByName, pos);
    pos += 4;

    //4..7 IndexOffset
    data.writeUInt32LE(0, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(0xFFFFFFFF, pos); //Seems to work OK (we don't know the size)
    pos += 4;

    //12..15 Write data length
    data.writeUInt32LE(path.length + 1, pos);
    pos += 4;

    //16..n Data
    ADS.encodeStringToPlcStringBuffer(path).copy(data, pos);
    pos += path.length + 1;

    try {
      const res = await this.sendAdsCommand<AdsReadWriteResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadWrite,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      this.debug(`readRawByPath(): Reading raw data from ${path} done (${res.ads.length} bytes)`);
      return res.ads.payload;

    } catch (err) {
      this.debug(`readRawByPath(): Reading raw data from ${path} failed: %o`, err);
      throw new ClientError(`readRawByPath(): Reading raw data from ${path} failed`, err);
    }
  }

  /**
   * Writes raw byte data to the target system by symbol path.
   * 
   * Supports also reading POINTER and REFERENCE values by using deference operator in path (`^`)
   * 
   * Unlike `readRawByPath()`, this uses variable handles under the hood, the as there is no direct ADS command available for this.
   *  
   * @param path Variable path in the PLC to read (such as `GVL_Test.ExampleStruct`)
   * @param value Data to write
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async writeRawByPath(path: string, value: Buffer, targetOpts: Partial<AmsAddress> = {}): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`writeRawByPath(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`writeRawByPath(): Writing raw data to ${path} (${value.byteLength} bytes)`);

    try {
      let handle = null;

      try {
        handle = await this.createVariableHandle(path);
        await this.writeRawByHandle(handle, value);

      } finally {
        if (handle) {
          await this.deleteVariableHandle(handle);
        }
      }

      this.debug(`writeRawByPath(): Writing raw data to ${path} done (${value.byteLength} bytes)`);

    } catch (err) {
      this.debug(`writeRawByPath(): Writing raw data to ${path} failed: %o`, err);
      throw new ClientError(`writeRawByPath(): Writing raw data to ${path} failed`, err);
    }
  }

  /**
   * Writes raw data to the target and reads the result as raw data
   * 
   * Uses `ADS ReadWrite` command
   * 
   * @param indexGroup Address index group
   * @param indexOffset Address index offset
   * @param readLength How many bytes to read
   * @param writeData Data to write
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async readWriteRaw(indexGroup: number, indexOffset: number, readLength: number, writeData: Buffer, targetOpts: Partial<AmsAddress> = {}): Promise<Buffer> {
    if (!this.connection.connected) {
      throw new ClientError(`readWriteRaw(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`readWriteRaw(): Sending ReadWrite command (${JSON.stringify({ indexGroup, indexOffset, readLength })} with ${writeData.byteLength} bytes of data`);

    //Allocating bytes for request
    const data = Buffer.alloc(16 + writeData.byteLength);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(indexGroup, pos);
    pos += 4;

    //4..7 IndexOffset
    data.writeUInt32LE(indexOffset, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(readLength, pos);
    pos += 4;

    //12..15 Write data length
    data.writeUInt32LE(writeData.byteLength, pos);
    pos += 4;

    //16..n Write data
    writeData.copy(data, pos);
    pos += writeData.byteLength;

    try {
      const res = await this.sendAdsCommand<AdsReadWriteResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadWrite,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      this.debug(`readWriteRaw(): ReadWrite command (${JSON.stringify({ indexGroup, indexOffset, readLength })}) done - returned ${res.ads.payload.byteLength} bytes`);

      return res.ads.payload;

    } catch (err) {
      this.debug(`readWriteRaw(): ReadWrite command (${JSON.stringify({ indexGroup, indexOffset, readLength })}) failed: %o`, err);
      throw new ClientError(`readWriteRaw(): ReadWrite command (${JSON.stringify({ indexGroup, indexOffset, readLength })}) failed`, err);
    }
  }

  /**
   * Reads a PLC symbol value by symbol path and converts the value to a Javascript object.
   * 
   * Returns the converted value, the raw value, the symbol data type and the symbol information object.
   * 
   * @param path Variable path in the PLC to read (such as `GVL_Test.ExampleStruct`)
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @template T Typescript data type of the PLC data, for example `readSymbol<number>(...)` or `readSymbol<ST_TypedStruct>(...)`
   */
  public async readSymbol<T = any>(path: string, targetOpts: Partial<AmsAddress> = {}): Promise<ReadSymbolResult<T>> {
    if (!this.connection.connected) {
      throw new ClientError(`readSymbol(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`readSymbol(): Reading symbol for ${path}`);

    //Getting the symbol information
    let symbolInfo: AdsSymbolInfo;
    try {
      this.debugD(`readSymbol(): Getting symbol information for ${path}`);
      symbolInfo = await this.getSymbolInfo(path, targetOpts);

    } catch (err) {
      this.debug(`readSymbol(): Getting symbol information for ${path} failed: %o`, err);
      throw new ClientError(`readSymbol(): Getting symbol information for ${path} failed`, err);
    }

    //Getting the symbol data type
    let dataType: AdsDataType;
    try {
      this.debugD(`readSymbol(): Getting data type for ${path}`);
      dataType = await this.buildDataType(symbolInfo.type, targetOpts);

    } catch (err) {
      this.debug(`readSymbol(): Getting symbol information for ${path} failed: %o`, err);
      throw new ClientError(`readSymbol(): Getting symbol information for ${path} failed`, err);
    }

    //Reading value by the symbol address
    let rawValue: Buffer;
    try {
      this.debugD(`readSymbol(): Reading raw value for ${path}`);
      rawValue = await this.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size, targetOpts);

    } catch (err) {
      this.debug(`readSymbol(): Reading raw value for ${path} failed: %o`, err);
      throw new ClientError(`readSymbol(): Reading raw value for ${path} failed`, err);
    }

    //Converting byte data to javascript object
    let value: T;
    try {
      this.debugD(`readSymbol(): Converting raw value to object for ${path}`);
      value = await this.convertBufferToObject<T>(rawValue, dataType);

    } catch (err) {
      this.debug(`readSymbol(): Converting raw value to object for ${path} failed: %o`, err);
      throw new ClientError(`readSymbol(): Converting raw value to object for ${path} failed`, err);
    }

    this.debug(`readSymbol(): Reading symbol for ${path} done`);

    return {
      value,
      rawValue,
      dataType,
      symbolInfo
    };
  }

  /**
   * Writes a PLC symbol value by symbol path. Converts the value from a Javascript object to raw value.
   * 
   * Returns the converted value, the raw value, the symbol data type and the symbol information object.
   * 
   * **NOTE:** Do not use `autoFill` for `UNION` types, it works without errors but the result isn't probably the desired one
   * 
   * @param path Variable path in the PLC to read (such as `GVL_Test.ExampleStruct`)
   * @param targetOpts Optional target settings that override values in `settings`
   * @param autoFill If true and data type is a container (`STRUCT`, `FUNCTION_BLOCK` etc.), missing properties are automatically **set to default values** (usually `0` or `''`) 
   * 
   * @template T Typescript data type of the PLC data, for example `writeSymbol<number>(...)` or `writeSymbol<ST_TypedStruct>(...)`
   */
  public async writeSymbol<T = any>(path: string, value: T, autoFill: boolean = false, targetOpts: Partial<AmsAddress> = {}): Promise<WriteSymbolResult<T>> {
    if (!this.connection.connected) {
      throw new ClientError(`writeSymbol(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`writeSymbol(): Writing symbol for ${path}`);

    //Getting the symbol information
    let symbolInfo: AdsSymbolInfo;
    try {
      this.debugD(`writeSymbol(): Getting symbol information for ${path}`);
      symbolInfo = await this.getSymbolInfo(path, targetOpts);

    } catch (err) {
      this.debug(`writeSymbol(): Getting symbol information for ${path} failed: %o`, err);
      throw new ClientError(`writeSymbol(): Getting symbol information for ${path} failed`, err);
    }

    //Getting the symbol data type
    let dataType: AdsDataType;
    try {
      this.debugD(`writeSymbol(): Getting data type for ${path}`);
      dataType = await this.buildDataType(symbolInfo.type, targetOpts);

    } catch (err) {
      this.debug(`writeSymbol(): Getting symbol information for ${path} failed: %o`, err);
      throw new ClientError(`writeSymbol(): Getting symbol information for ${path} failed`, err);
    }

    //Creating raw data from object
    let rawValue: Buffer;
    try {
      let res = this.convertObjectToBuffer(value, dataType);

      if (res.missingProperty && autoFill) {
        //Some fields are missing and autoFill is used -> try to auto fill missing values
        this.debug(`writeSymbol(): Autofilling missing fields with active values`);

        this.debugD(`writeSymbol(): Reading active value`);
        const valueNow = await this.readSymbol(path, targetOpts);

        this.debugD(`writeSymbol(): Merging objects (adding missing fields)`);
        value = this.deepMergeObjects(false, valueNow.value, value);

        //Try conversion again - should work now
        res = this.convertObjectToBuffer(value, dataType);

        if (res.missingProperty) {
          //This shouldn't really happen
          //However, if it happened, the merge isn't working as it should
          throw new ClientError(`writeSymbol(): Converting object to raw value for ${path} failed. The object is missing key/value for "${res.missingProperty}". NOTE: autoFill failed - please report an issue at GitHub`);
        }

      } else if (res.missingProperty) {
        //Some fields are missing and no autoFill -> failed
        throw new ClientError(`writeSymbol(): Converting object to raw value for ${path} failed. The object is missing key/value for "${res.missingProperty}". Hint: Use autoFill parameter to add missing fields automatically`);
      }

      //We are here -> success!
      rawValue = res.rawValue;

    } catch (err) {
      //We can pass our own errors to keep the message on top
      if (err instanceof ClientError) {
        throw err;
      }

      this.debug(`writeSymbol(): Converting object to raw value for ${path} failed: %o`, err);
      throw new ClientError(`writeSymbol(): Converting object to raw value for ${path} failed`, err);
    }

    //Writing value by the symbol address
    try {
      this.debugD(`writeSymbol(): Writing raw value for ${path}`);
      await this.writeRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, rawValue, targetOpts);

    } catch (err) {
      this.debug(`writeSymbol(): Writing raw value for ${path} failed: %o`, err);
      throw new ClientError(`writeSymbol(): Writing raw value for ${path} failed`, err);
    }

    this.debug(`writeSymbol(): Writing symbol for ${path} done`);

    return {
      value,
      rawValue,
      dataType,
      symbolInfo
    };
  }

  /**
   * Returns a default (empty) Javascript object representing provided PLC data type.
   * 
   * @param dataType Data type name in the PLC as string (such as `ST_Struct`) or `AdsDataType` object 
   * @param targetOpts Optional target settings that override values in `settings` 
   * 
   * @template T Typescript data type of the PLC data, for example `readSymbol<number>(...)` or `readSymbol<ST_TypedStruct>(...)`
   */
  public async getDefaultPlcObject<T = any>(dataType: string | AdsDataType, targetOpts: Partial<AmsAddress> = {}): Promise<T> {
    if (!this.connection.connected) {
      throw new ClientError(`getDefaultPlcObject(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`getDefaultPlcObject(): Creating empty default object for ${typeof dataType === 'string' ? dataType : dataType.type}`);

    //Getting data type information, unless given as parameter
    if (typeof dataType === 'string') {
      try {
        this.debugD(`getDefaultPlcObject(): Getting data type for ${dataType}`);
        dataType = await this.buildDataType(dataType, targetOpts);

      } catch (err) {
        this.debug(`getDefaultPlcObject(): Getting data type information for ${dataType} failed: %o`, err);
        throw new ClientError(`getDefaultPlcObject(): Getting data type information for ${dataType} failed`, err);
      }
    }

    //Converting raw byte data to Javascript object
    let value: T = await this.convertFromRaw(Buffer.alloc(dataType.size), dataType, targetOpts);

    this.debug(`getDefaultPlcObject(): Empty default object created for ${dataType.type}`);
    return value;
  }

  /**
   * Converts a raw byte value to a Javascript object.
   * 
   * @param data Raw PLC data as Buffer (read for example with `readRaw()`)
   * @param dataType Data type name in the PLC as string (such as `ST_Struct`) or `AdsDataType` object
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @template T Typescript data type of the PLC data, for example `convertFromRaw<number>(...)` or `convertFromRaw<ST_TypedStruct>(...)`
   */
  public async convertFromRaw<T = any>(data: Buffer, dataType: string | AdsDataType, targetOpts: Partial<AmsAddress> = {}): Promise<T> {
    if (!this.connection.connected) {
      throw new ClientError(`convertFromRaw(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`convertFromRaw(): Converting ${data.byteLength} bytes of data to ${typeof dataType === 'string' ? dataType : dataType.type}`);

    //Getting data type information, unless given as parameter
    if (typeof dataType === 'string') {
      try {
        this.debugD(`convertFromRaw(): Getting data type for ${dataType}`);
        dataType = await this.buildDataType(dataType, targetOpts);

      } catch (err) {
        this.debug(`convertFromRaw(): Getting data type information for ${dataType} failed: %o`, err);
        throw new ClientError(`convertFromRaw(): Getting data type information for ${dataType} failed`, err);
      }
    }

    //Converting raw byte data to Javascript object
    let value: T;
    try {
      this.debugD(`convertFromRaw(): Converting raw value to object for ${dataType.type}`);
      value = await this.convertBufferToObject<T>(data, dataType);

    } catch (err) {
      this.debug(`convertFromRaw(): Converting raw value to object for ${dataType.type} failed: %o`, err);
      throw new ClientError(`convertFromRaw(): Converting raw value to object for ${dataType.type} failed`, err);
    }

    this.debug(`convertFromRaw(): Converted ${data.byteLength} bytes of data to ${dataType.type} successfully`);
    return value;
  }

  /**
   * Converts a Javascript object to raw byte data.
   * 
   * **NOTE:** Do not use `autoFill` for `UNION` types, it works without errors but the result isn't probably the desired one
   * 
   * @param value Javascript object that represents the `dataType´ in target system
   * @param dataType Data type name in the PLC as string (such as `ST_Struct`) or `AdsDataType` object
   * @param autoFill If true and data type is a container (`STRUCT`, `FUNCTION_BLOCK` etc.), missing properties are automatically **set to default values** (usually `0` or `''`) 
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @template T Typescript data type of the PLC data, for example `convertFromRaw<number>(...)` or `convertFromRaw<ST_TypedStruct>(...)`
   */
  public async convertToRaw(value: any, dataType: string | AdsDataType, autoFill: boolean = false, targetOpts: Partial<AmsAddress> = {}): Promise<Buffer> {
    if (!this.connection.connected) {
      throw new ClientError(`convertToRaw(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`convertToRaw(): Converting object to ${typeof dataType === 'string' ? dataType : dataType.type}`);

    //Getting data type information, unless given as parameter
    if (typeof dataType === 'string') {
      try {
        this.debugD(`convertToRaw(): Getting data type for ${dataType}`);
        dataType = await this.buildDataType(dataType, targetOpts);

      } catch (err) {
        this.debug(`convertToRaw(): Getting data type information for ${dataType} failed: %o`, err);
        throw new ClientError(`convertToRaw(): Getting data type information for ${dataType} failed`, err);
      }
    }

    //Converting Javascript object to raw byte data
    let rawValue: Buffer;
    try {
      let res = this.convertObjectToBuffer(value, dataType);

      if (res.missingProperty && autoFill) {
        //Some fields are missing and autoFill is used -> try to auto fill missing values
        this.debug(`convertToRaw(): Autofilling missing fields with default/zero values`);

        this.debugD(`convertToRaw(): Creating default object`);
        const defaultValue = await this.getDefaultPlcObject(dataType, targetOpts);

        this.debugD(`convertToRaw(): Merging objects (adding missing fields)`);
        value = this.deepMergeObjects(false, defaultValue, value);

        //Try conversion again - should work now
        res = this.convertObjectToBuffer(value, dataType);

        if (res.missingProperty) {
          //This shouldn't really happen
          //However, if it happened, the merge isn't working as it should
          throw new ClientError(`convertToRaw(): Converting object to raw value for ${dataType.type} failed. The object is missing key/value for "${res.missingProperty}". NOTE: autoFill failed - please report an issue at GitHub`);
        }

      } else if (res.missingProperty) {
        //Some fields are missing and no autoFill -> failed
        throw new ClientError(`convertToRaw(): Converting object to raw value for ${dataType.type} failed. The object is missing key/value for "${res.missingProperty}". Hint: Use autoFill parameter to add missing fields automatically`);
      }

      //We are here -> success!
      rawValue = res.rawValue;

      this.debug(`convertToRaw(): Converted object to ${dataType.type} successfully`);
      return rawValue;

    } catch (err) {
      //We can pass our own errors to keep the message on top
      if (err instanceof ClientError) {
        throw err;
      }

      this.debug(`convertToRaw(): Converting object to raw value for ${dataType.type} failed: %o`, err);
      throw new ClientError(`convertToRaw(): Converting object to raw value for ${dataType.type} failed`, err);
    }
  }

  /**
   * Creates a variable handle for a PLC symbol by given variable path
   * 
   * Variable value can be accessed by using the handle with `readRawByHandle()` and `writeRawByHandle()`
   * 
   * @param path Full variable path in the PLC (such as `GVL_Test.ExampleStruct`)
   * @param targetOpts Optional target settings that override values in `settings` (NOTE: If used, no caching is available -> worse performance)
   */
  public async createVariableHandle(path: string, targetOpts: Partial<AmsAddress> = {}): Promise<VariableHandle> {
    if (!this.connection.connected) {
      throw new ClientError(`createVariableHandle(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`createVariableHandle(): Creating variable handle to ${path}`);

    //Allocating bytes for request
    const data = Buffer.alloc(16 + path.length + 1);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolHandleByName, pos);
    pos += 4;

    //4..7 IndexOffset
    data.writeUInt32LE(0, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(0xFFFFFFFF, pos); //Seems to work OK (we don't know the size)
    pos += 4;

    //12..15 Write data length
    data.writeUInt32LE(path.length + 1, pos);
    pos += 4;

    //16..n Data
    ADS.encodeStringToPlcStringBuffer(path).copy(data, pos);
    pos += path.length + 1;

    try {
      const res = await this.sendAdsCommand<AdsReadWriteResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadWrite,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      const result = {} as VariableHandle;

      let pos = 0;
      const response = res.ads.payload;

      //0..3 Variable handle
      result.handle = response.readUInt32LE(pos);
      pos += 4;

      //4..7 Size
      result.size = response.readUInt32LE(pos);
      pos += 4;

      //8..11 "type decoration"
      result.typeDecoration = response.readUInt32LE(pos);
      pos += 4;

      //8..9 Data type length
      let dataTypeLength = response.readUInt16LE(pos);
      pos += 2;

      //10..n Data type
      result.dataType = ADS.decodePlcStringBuffer(response.subarray(pos, pos + dataTypeLength + 1));

      this.debug(`createVariableHandle(): Variable handle created to ${path}`);

      return result;

    } catch (err) {
      this.debug(`createVariableHandle(): Creating variable handle to ${path} failed: %o`, err);
      throw new ClientError(`createVariableHandle(): Creating variable handle to ${path} failed`, err);
    }
  }
  
  /**
   * Creates multiple variable handles for PLC symbols by given variable paths
   * 
   * Uses ADS sum command under the hood
   * 
   * Variable value can be accessed by using the handle with `readRawByHandle()` and `writeRawByHandle()`
   * 
   * @param targets Array of full variable paths in the PLC (such as `GVL_Test.ExampleStruct`)
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async createVariableHandleMulti(paths: string[], targetOpts: Partial<AmsAddress> = {}): Promise<AdsCreateVariableHandleMultiResult[]> {
    if (!this.connection.connected) {
      throw new ClientError(`createVariableHandleMulti(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`createVariableHandleMulti(): Creating variable handle to ${paths.length} paths`);
    const totalPathsLength = paths.reduce((total, path) => total + path.length + 1, 0);

    //Allocating bytes for request
    const data = Buffer.alloc(16 + paths.length * 16 + totalPathsLength);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SumCommandReadWrite, pos);
    pos += 4;

    //4..7 IndexOffset - Number of handles to create
    data.writeUInt32LE(paths.length, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(0xFFFFFFFF, pos); //Seems to work OK (we don't know the size)
    pos += 4;

    //12..15 Write data length
    data.writeUInt32LE(paths.length * 16 + totalPathsLength, pos);
    pos += 4;

    //16..n targets
    paths.forEach(path => {
      //0..3 IndexGroup
      data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolHandleByName, pos);
      pos += 4;

      //4..7 IndexOffset
      data.writeUInt32LE(0, pos);
      pos += 4;

      //8..11 Read data length
      data.writeUInt32LE(0xFFFF, pos); //Seems to work OK (we don't know the size)
      pos += 4;

      //12..15 Write data length
      data.writeUInt32LE(path.length + 1, pos) //Note: String end delimeter
      pos += 4
    });

    //paths
    paths.forEach(path => {
      ADS.encodeStringToPlcStringBuffer(path).copy(data, pos);
      pos += path.length + 1; //Note: String end delimeter
    });

    try {
      const res = await this.sendAdsCommand<AdsReadWriteResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadWrite,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      this.debug(`createVariableHandleMulti(): Creating variable handle to ${paths.length} paths done`);

      let pos = 0;
      const response = res.ads.payload;
      let results: AdsCreateVariableHandleMultiResult[] = [];
      let sizes: number[] = [];

      //Error codes of each target
      for (let i = 0; i < paths.length; i++) {
        const errorCode = response.readUInt32LE(pos);
        pos += 4;

        //Data length
        sizes.push(response.readUInt32LE(pos));
        pos += 4;

        const result: AdsCreateVariableHandleMultiResult = {
          path: paths[i],
          success: errorCode === 0,
          error: errorCode > 0,
          errorCode,
          errorStr: ADS.ADS_ERROR[errorCode],
          handle: undefined
        };

        results.push(result);
      };

      //Handle for each target
      for (let i = 0; i < paths.length; i++) {
        let startPos = pos;

        if (results[i].success) {
          const result = {} as VariableHandle;

          //0..3 Variable handle
          result.handle = response.readUInt32LE(pos);
          pos += 4;
    
          //4..7 Size
          result.size = response.readUInt32LE(pos);
          pos += 4;
    
          //8..11 "type decoration"
          result.typeDecoration = response.readUInt32LE(pos);
          pos += 4;
    
          //8..9 Data type length
          let dataTypeLength = response.readUInt16LE(pos);
          pos += 2;
    
          //10..n Data type
          result.dataType = ADS.decodePlcStringBuffer(response.subarray(pos, pos + dataTypeLength + 1));
          pos += dataTypeLength + 1;
    
          results[i].handle = result;

        }
        
        pos = startPos + sizes[i];
      }

      return results;

    } catch (err) {
      this.debug(`createVariableHandleMulti(): Creating variable handle to ${paths.length} paths failed: %o`, err);
      throw new ClientError(`createVariableHandleMulti(): Creating variable handle to ${paths.length} paths failed`, err);
    }
  }

  /**
   * Deletes a variable handle that was previously created using `createVariableHandle()`
   * 
   * @param handle Variable handle to delete
   * @param targetOpts Optional target settings that override values in `settings` (NOTE: If used, no caching is available -> worse performance)
   */
  public async deleteVariableHandle(handle: VariableHandle | number, targetOpts: Partial<AmsAddress> = {}): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`deleteVariableHandle(): Client is not connected. Use connect() to connect to the target first.`);
    }

    const handleNumber = typeof handle === 'number' ? handle : handle.handle;

    this.debug(`deleteVariableHandle(): Deleting a variable handle ${handleNumber}`);

    //Allocating bytes for request
    const data = Buffer.alloc(16);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolReleaseHandle, pos);
    pos += 4;

    //4..7 IndexOffset
    data.writeUInt32LE(0, pos);
    pos += 4;

    //8..11 Write data length
    data.writeUInt32LE(4, pos);
    pos += 4;

    //12..15 Handle
    data.writeUInt32LE(handleNumber, pos);
    pos += 4;

    try {
      const res = await this.sendAdsCommand<AdsWriteResponse>({
        adsCommand: ADS.ADS_COMMAND.Write,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      this.debug(`deleteVariableHandle(): Variable handle ${handleNumber} deleted`);

    } catch (err) {
      this.debug(`deleteVariableHandle(): Deleting variable handle ${handleNumber} failed: %o`, err);
      throw new ClientError(`deleteVariableHandle(): Deleting variable handle ${handleNumber} failed`, err);
    }
  }


  /**
   * Deletes multiple variable handles that were previously created using `createVariableHandle()`
   * 
   * Uses ADS sum command under the hood
   * 
   * @param handles Array of variable handles to delete
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async deleteVariableHandleMulti(handles: (VariableHandle | number)[], targetOpts: Partial<AmsAddress> = {}): Promise<AdsDeleteVariableHandleMultiResult[]> {
    if (!this.connection.connected) {
      throw new ClientError(`deleteVariableHandleMulti(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`deleteVariableHandleMulti(): Deleting ${handles.length} variable handles`);

    //Allocating bytes for request
    const data = Buffer.alloc(16 + handles.length * 16);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SumCommandWrite, pos);
    pos += 4;

    //4..7 IndexOffset - Number of handles to delete
    data.writeUInt32LE(handles.length, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(handles.length * 4, pos);
    pos += 4;

    //12..15 Write data length
    data.writeUInt32LE(handles.length * 16, pos);
    pos += 4;

    //16..n targets
    handles.forEach(handle => {
      //0..3 IndexGroup
      data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolReleaseHandle, pos);
      pos += 4;

      //4..7 IndexOffset
      data.writeUInt32LE(0, pos);
      pos += 4;

      //8..11 Data size
      data.writeUInt32LE(ADS.ADS_INDEX_OFFSET_LENGTH, pos);
      pos += 4;
    });

    //handles
    handles.forEach(handle => {
      const handleNumber = typeof handle === 'number' ? handle : handle.handle;
      
      data.writeUInt32LE(handleNumber, pos);
      pos += 4;
    });

    try {
      const res = await this.sendAdsCommand<AdsReadWriteResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadWrite,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      this.debug(`deleteVariableHandleMulti(): Deleting ${handles.length} variable handles done`);

      let pos = 0;
      let results: AdsDeleteVariableHandleMultiResult[] = [];

      //Error codes of each target
      for (let i = 0; i < handles.length; i++) {
        const errorCode = res.ads.payload.readUInt32LE(pos);
        pos += 4;

        const result: AdsDeleteVariableHandleMultiResult = {
          handle: handles[i],
          success: errorCode === 0,
          error: errorCode > 0,
          errorCode,
          errorStr: ADS.ADS_ERROR[errorCode]
        };

        results.push(result);
      };

      return results;

    } catch (err) {
      this.debug(`deleteVariableHandleMulti(): Deleting ${handles.length} variable handles failed: %o`, err);
      throw new ClientError(`deleteVariableHandleMulti(): Deleting ${handles.length} variable handles failed`, err);
    }
  }

  /**
   * Reads raw byte data from the target system by previously created variable handle
   * 
   * @param handle Variable handle
   * @param size Optional data length to read (bytes) - as default, size in handle is used if available. Uses 0xFFFFFFFF as fallback.
   * @param targetOpts Optional target settings that override values in `settings` (NOTE: If used, no caching is available -> worse performance)
   */
  public async readRawByHandle(handle: VariableHandle | number, size?: number, targetOpts: Partial<AmsAddress> = {}): Promise<Buffer> {
    if (!this.connection.connected) {
      throw new ClientError(`readRawByHandle(): Client is not connected. Use connect() to connect to the target first.`);
    }
    const handleNumber = typeof handle === 'number' ? handle : handle.handle;

    this.debug(`readRawByHandle(): Reading raw data by handle ${handleNumber}`);

    try {
      const dataSize = typeof handle === 'object' && handle.size !== undefined
        ? handle.size
        : size !== undefined
          ? size
          : 0xFFFFFFFF;

      const res = await this.readRaw(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolValueByHandle, handleNumber, dataSize, targetOpts);

      this.debug(`readRawByHandle(): Reading raw data by handle ${handleNumber} done (${res.byteLength} bytes)`);
      return res;

    } catch (err) {
      this.debug(`readRawByHandle(): Reading raw data by handle ${handleNumber} failed: %o`, err);
      throw new ClientError(`readRawByHandle(): Reading raw data by handle ${handleNumber} failed`, err);
    }
  }

  /**
   * Writes raw byte data to the target system by previously created variable handle
   * 
   * @param handle Variable handle
   * @param value Data to write
   * @param targetOpts Optional target settings that override values in `settings` (NOTE: If used, no caching is available -> worse performance)
   */
  public async writeRawByHandle(handle: VariableHandle | number, value: Buffer, targetOpts: Partial<AmsAddress> = {}): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`writeRawByHandle(): Client is not connected. Use connect() to connect to the target first.`);
    }
    const handleNumber = typeof handle === 'number' ? handle : handle.handle;

    this.debug(`writeRawByHandle(): Writing raw data by handle ${handleNumber} (${value.byteLength} bytes)`);

    try {
      const res = await this.writeRaw(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolValueByHandle, handleNumber, value, targetOpts);

      this.debug(`writeRawByHandle(): Writing raw data by handle ${handleNumber} done (${value.byteLength} bytes)`);

    } catch (err) {
      this.debug(`writeRawByHandle(): Writing raw data by handle ${handleNumber} failed: %o`, err);
      throw new ClientError(`writeRawByHandle(): Writing raw data by handle ${handleNumber} failed`, err);
    }
  }

  /**
   * Reads raw data by symbol
   * 
   * @param symbol Symbol information (acquired using `getSymbolInfo()`)
   * @param targetOpts Optional target settings that override values in `settings` (NOTE: If used, no caching is available -> worse performance)
   */
  public async readRawBySymbol(symbol: AdsSymbolInfo, targetOpts: Partial<AmsAddress> = {}): Promise<Buffer> {
    if (!this.connection.connected) {
      throw new ClientError(`readRawBySymbol(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`readRawBySymbol(): Reading raw data by symbol ${symbol.name}`);

    try {
      const res = await this.readRaw(symbol.indexGroup, symbol.indexOffset, symbol.size, targetOpts);

      this.debug(`readRawBySymbol(): Reading raw data read by symbol ${symbol.name} done (${res.byteLength} bytes)`);
      return res;

    } catch (err) {
      this.debug(`readRawBySymbol(): Reading raw data by symbol ${symbol.name} failed: %o`, err);
      throw new ClientError(`readRawBySymbol(): Reading raw data by symbol ${symbol.name} failed`, err);
    }
  }

  /**
   * Writes raw data by symbol
   * 
   * @param symbol Symbol information (acquired using `getSymbolInfo()`)
   * @param value Data to write
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async writeRawBySymbol(symbol: AdsSymbolInfo, value: Buffer, targetOpts: Partial<AmsAddress> = {}): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`writeRawBySymbol(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`writeRawBySymbol(): Writing raw data by symbol ${symbol.name} (${value.byteLength} bytes)`);

    try {
      await this.writeRaw(symbol.indexGroup, symbol.indexOffset, value, targetOpts);

      this.debug(`writeRawBySymbol(): Writing raw data by symbol ${symbol.name} done (${value.byteLength} bytes)`);

    } catch (err) {
      this.debug(`writeRawBySymbol(): Writing raw data by symbol ${symbol.name} failed: %o`, err);
      throw new ClientError(`writeRawBySymbol(): Writing raw data by symbol ${symbol.name} failed`, err);
    }
  }

  /**
   * Invokes/calls a function block RPC method from PLC
   * 
   * Returns method return value and/or outputs (if any)
   * 
   * For RPC support, the method needs to have `{attribute 'TcRpcEnable'}` attribute above the `METHOD` definition
   * 
   * @param path Full function block instance path in the PLC (such as `GVL_Test.ExampleBlock`)
   * @param method Function block method name to call
   * @param parameters Function block method parameters (inputs) (if any)
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @template T Typescript data type of the method return value, for example `invokeRpcMethod<number>(...)` or `invokeRpcMethod<ST_TypedStruct>(...)`
   * @template U Typescript data type of the method outputs object, for example `invokeRpcMethod<number, ST_TypedStruct>(...)`
   */
  public async invokeRpcMethod<T = any, U = Record<string, any>>(path: string, method: string, parameters: Record<string, any> = {}, targetOpts: Partial<AmsAddress> = {}): Promise<RpcMethodCallResult<T, U>> {
    if (!this.connection.connected) {
      throw new ClientError(`invokeRpcMethod(): Client is not connected. Use connect() to connect to the target first.`);
    }

    const debugPath = `${path}.${method}()`;
    this.debug(`invokeRpcMethod(): Calling RPC method ${debugPath}`);

    try {
      //Getting the symbol information
      let symbolInfo: AdsSymbolInfo;
      try {
        this.debugD(`invokeRpcMethod(): Getting symbol information for ${path}`);
        symbolInfo = await this.getSymbolInfo(path, targetOpts);

      } catch (err) {
        this.debug(`invokeRpcMethod(): Getting symbol information for ${path} failed: %o`, err);
        throw new ClientError(`invokeRpcMethod(): Getting symbol information for ${path} failed`, err);
      }

      //Getting the symbol data type
      let dataType: AdsDataType;
      try {
        this.debugD(`invokeRpcMethod(): Getting data type for ${path}`);
        dataType = await this.buildDataType(symbolInfo.type, targetOpts);

      } catch (err) {
        this.debug(`invokeRpcMethod(): Getting symbol information for ${path} failed: %o`, err);
        throw new ClientError(`invokeRpcMethod(): Getting symbol information for ${path} failed`, err);
      }


      //Finding the RPC method
      const rpcMethod = dataType.rpcMethods.find(m => m.name.toLowerCase() === method.toLowerCase());

      if (!rpcMethod) {
        throw new ClientError(`invokeRpcMethod(): Method ${method} was not found from symbol ${path}. Available RPC methods are: ${dataType.rpcMethods.map(m => m.name).join(', ')}`);
      }

      //Method inputs and outputs
      const inputs = rpcMethod.parameters.filter(p => p.flags === ADS.ADS_RCP_METHOD_PARAM_FLAGS.In);
      const outputs = rpcMethod.parameters.filter(p => p.flags === ADS.ADS_RCP_METHOD_PARAM_FLAGS.Out);

      //Creating data buffer for inputs
      let inputsData = Buffer.alloc(0);

      for (const input of inputs) {
        //Does parameter object contain this field/subItem?
        let key: undefined | string = undefined;

        //First, try the easy way (5-20x times faster)
        if (parameters[input.name] !== undefined) {
          key = input.name;

        } else {
          //Not found, try case-insensitive way (this is slower -> only doing if needed)
          try {
            key = Object.keys(parameters).find(objKey => objKey.toLowerCase() === input.name.toLowerCase());

          } catch (err) {
            //value is null/ not an object/something else went wrong
            key = undefined;
          }
        }

        if (key === undefined) {
          throw new ClientError(`invokeRpcMethod(): Missing RPC method input parameter "${input.name}"`);
        }

        //Creating raw data from object
        //NOTE: Using internal convertObjectToBuffer() instead of convertToRaw() to achieve better error message with missing properties
        const type = await this.buildDataType(input.type, targetOpts);
        let res = await this.convertObjectToBuffer(parameters[key], type);

        if (res.missingProperty) {
          throw new ClientError(`invokeRpcMethod(): RPC method parameter "${input.name}" is missing at least key/value "${res.missingProperty}"`);
        }

        inputsData = Buffer.concat([inputsData, res.rawValue]);
      }

      //Creating a handle to the RPC method
      let handle: VariableHandle;
      try {
        this.debugD(`invokeRpcMethod(): Creating a variable handle for ${debugPath}`);
        //NOTE: #
        handle = await this.createVariableHandle(`${path}#${method}`, targetOpts);

      } catch (err) {
        this.debug(`invokeRpcMethod(): Creating a variable handle for ${debugPath} failed: %o`, err);
        throw new ClientError(`invokeRpcMethod(): Creating a variable handle for ${debugPath} failed`, err);
      }

      //Allocating bytes for request
      const data = Buffer.alloc(16 + inputsData.byteLength);
      let pos = 0;

      //0..3 IndexGroup 
      data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SymbolValueByHandle, pos);
      pos += 4;

      //4..7 IndexOffset
      data.writeUInt32LE(handle.handle, pos);
      pos += 4;

      //8..11 Read data length
      data.writeUInt32LE(rpcMethod.returnTypeSize + outputs.reduce((total, output) => total + output.size, 0), pos);
      pos += 4;

      //12..15 Write data length
      data.writeUInt32LE(inputsData.byteLength, pos);
      pos += 4;

      //16..n Data
      inputsData.copy(data, pos);

      try {
        const res = await this.sendAdsCommand<AdsReadWriteResponse>({
          adsCommand: ADS.ADS_COMMAND.ReadWrite,
          targetAmsNetId: targetOpts.amsNetId,
          targetAdsPort: targetOpts.adsPort,
          payload: data
        });

        this.debug(`invokeRpcMethod(): Calling RPC method ${debugPath} done!`);

        let pos = 0;
        const result: RpcMethodCallResult<T, U> = {
          returnValue: undefined as T,
          outputs: {} as U
        };

        //Method return value
        if (rpcMethod.returnTypeSize > 0) {
          result.returnValue = await this.convertFromRaw<T>(res.ads.payload.subarray(pos, pos + rpcMethod.returnTypeSize), rpcMethod.retunDataType);
          pos += rpcMethod.returnTypeSize;
        }

        //Outputs (VAR_OUTPUT)
        for (const output of outputs) {
          (result.outputs as Record<string, any>)[output.name] = await this.convertFromRaw(res.ads.payload.subarray(pos, pos + output.size), output.type);
          pos += output.size;
        }

        return result;

      } catch (err) {
        this.debug(`invokeRpcMethod(): Calling RPC method ${debugPath} failed: %o`, err);
        throw new ClientError(`invokeRpcMethod(): Calling RPC method ${debugPath} failed`, err);

      } finally {
        //Delete handle in all cases
        if (handle) {
          try {
            await this.deleteVariableHandle(handle);
          } catch (err) {
            this.debug(`invokeRpcMethod(): Deleting variable handle to RPC method failed: %o`, err);
          }
        }
      }

    } catch (err) {
      this.debug(`invokeRpcMethod(): Calling RPC method ${debugPath} failed: %o`, err);
      throw new ClientError(`invokeRpcMethod(): Calling RPC method ${debugPath} failed`, err);
    }
  }
}
