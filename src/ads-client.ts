/*
ads-client
https://github.com/jisotalo/ads-client

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

import {
  Socket,
  SocketConnectOpts
} from "net";
import EventEmitter from "events";
import Debug from "debug";
import Long from "long";
import * as ADS from './ads-commons';
import ClientError from "./client-error";

import type {
  ActiveAdsRequestContainer,
  ActiveSubscription,
  ActiveSubscriptionContainer,
  AdsClientConnection,
  AdsClientSettings,
  AdsCommandToSend,
  AdsDataTypeContainer,
  AdsSymbolContainer,
  AdsUploadInfo,
  ConnectionMetaData,
  PlcPrimitiveType,
  SubscriptionData,
  SubscriptionSettings,
  ReadValueResult,
  TimerObject,
  ObjectToBufferConversionResult,
  WriteValueResult,
  VariableHandle,
  RpcMethodCallResult,
  CreateVariableHandleMultiResult,
  ReadRawMultiResult,
  ReadRawMultiCommand,
  WriteRawMultiResult,
  DeleteVariableHandleMultiResult,
  ReadWriteRawMultiResult,
  ReadWriteRawMultiCommand,
  WriteRawMultiCommand,
  ClientEvents,
  SubscriptionCallback,
  DebugLevel
} from "./types/ads-client-types";

import {
  AdsAddNotificationResponse,
  AdsAddNotificationResponseData,
  AdsArrayInfoEntry,
  AdsAttributeEntry,
  AdsDataType,
  AdsDeleteNotificationResponse,
  AdsDeviceInfo,
  AdsEnumInfoEntry,
  AdsNotification,
  AdsNotificationResponse,
  AdsNotificationSample,
  AdsNotificationStamp,
  AdsRawAddress,
  AdsReadDeviceInfoResponse,
  AdsReadResponse,
  AdsReadStateResponse,
  AdsReadWriteResponse,
  AdsRequest,
  AdsResponse,
  AdsRpcMethodEntry,
  AdsRpcMethodParameterEntry,
  AdsState,
  AdsSymbol,
  AdsWriteControlResponse,
  AdsWriteResponse,
  AmsAddress,
  AmsHeader,
  AmsPortRegisteredData,
  AmsRouterStateData,
  AmsTcpHeader,
  AmsTcpPacket,
  BaseAdsResponse,
  EmptyAdsResponse,
  UnknownAdsResponse
} from "./types/ads-protocol-types";

export type * from "./types/ads-client-types";
export type * from './types/ads-protocol-types';
export type * from './client-error';

/**
 * Common ADS constants and helper functions
 * 
 * @category Client
 */
export * as ADS from './ads-commons';

/**
 * A class for handling TwinCAT ADS protocol communication.
 * 
 * Settings are provided in constructor - see {@link Client.constructor} and {@link AdsClientSettings}.
 * 
 * A client instance should be created for each target. 
 * However, a single client instance can also be used to communicate with 
 * multiple endpoints using the `targetOpts` parameter available in all methods.
 * 
 * @example
 * 
 * ```js
 * const client = new Client({
 *  targetAmsNetId: "192.168.4.1.1.1",
 *  targetAdsPort: 851
 * });
 * ```
 * 
 * @category Client
 */
export class Client extends EventEmitter<ClientEvents> {
  /**
   * Debug instance for debug level 1.
   */
  private debug = Debug("ads-client");

  /**
   * Debug instance for debug level 2.
   */
  private debugD = Debug(`ads-client:details`);

  /**
   * Debug instance for debug level 3.
   */
  private debugIO = Debug(`ads-client:raw-data`);

  /**
   * Active debug level.
   */
  private debugLevel_: DebugLevel = 0;

  /**
   * Default metadata (when no active connection).
   */
  private defaultMetaData: ConnectionMetaData = {
    routerState: undefined,
    tcSystemState: undefined,
    plcDeviceInfo: undefined,
    plcRuntimeState: undefined,
    plcUploadInfo: undefined,
    plcSymbolVersion: undefined,
    allPlcSymbolsCached: false,
    plcSymbols: {},
    allPlcDataTypesCached: false,
    plcDataTypes: {},
  };

  /**
   * Callback used for AMS/TCP commands, such as port registering.
   * 
   * When a response is received, `amsTcpCallback` is called with the response packet.
   */
  private amsTcpCallback?: ((packet: AmsTcpPacket) => void);

  /**
   * Buffer for received data.
   * 
   * All received data from TCP socket is copied here for further processing.
   */
  private receiveBuffer = Buffer.alloc(0);

  /**
   * Used TCP socket instance.
   */
  private socket?: Socket = undefined;

  /**
   * Handler for socket error event.
   * 
   * Called when the socket emits error event (`socket.on("error")`).
   */
  private socketErrorHandler?: (err: Error) => void;

  /**
   * Handler for socket close event.
   * 
   * Called when the socket emits error event (`socket.on("close")`).
   */
  private socketConnectionLostHandler?: (hadError: boolean) => void;

  /**
   * Timer handle and ID of the timer used for automatic reconnecting.
   */
  private reconnectionTimer: TimerObject = { id: 0 };

  /**
   * Timer handle and ID of the timer used for reading TwinCAT system state.
   */
  private tcSystemStatePollerTimer: TimerObject = { id: 0 };

  /**
   * Timer handle of the timer used for detecting ADS port registeration timeout.
   */
  private portRegisterTimeoutTimer?: NodeJS.Timeout = undefined;

  /**
   * Container for all active subscriptions.
   */
  private activeSubscriptions: ActiveSubscriptionContainer = {};

  /**
   * Container for previous subscriptions that were active
   * before reconnecting or when PLC runtime symbol version changed.
   */
  private previousSubscriptions?: ActiveSubscriptionContainer = undefined;

  /**
   * Active ADS requests that are waiting for responses.
   */
  private activeAdsRequests: ActiveAdsRequestContainer = {};

  /**
   * Next invoke ID to be used for ADS requests.
   */
  private nextInvokeId: number = 0;

  /**
   * Timestamp (epoch) when the conection to the remote was lost for the first time.
   * 
   * Used for detecting if the connection has been lost for long enough
   * for starting the reconnection.
   */
  private connectionDownSince?: Date = undefined;

  /** 
   * Active debug level (read-only).
   * 
   * Use {@link Client.setDebugLevel} for setting debug level.
   * 
   * Debug levels:
   *  - 0: no debugging (default)
   *  - 1: basic debugging (`$env:DEBUG='ads-client'`)
   *  - 2: detailed debugging (`$env:DEBUG='ads-client,ads-client:details'`)
   *  - 3: detailed debugging with raw I/O data (`$env:DEBUG='ads-client,ads-client:details,ads-client:raw-data'`)
   * 
   * Debug data is available in the console (See [Debug](https://www.npmjs.com/package/debug) library for mode).
  */
  public get debugLevel(): Readonly<DebugLevel> {
    return this.debugLevel_;
  }

  /**
   * Active client settings.
   * 
   * You can change some settings directly from this object on the fly, mainly
   * some non-communication related ones. 
   * 
   * If the client is not yet connected, it's OK to change all settings from here. 
   * 
   * However, the most correct way is to use the {@link Client.constructor}.
   * 
   * @example
   * 
   * ```js
   * client.settings.convertDatesToJavascript = false; //OK
   * client.settings.targetAdsPort = 852; //Not OK if already connected (some things might break)
   * ```
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
    rawClient: false,
    disableCaching: false,
    deleteUnknownSubscriptions: true
  } as Required<AdsClientSettings>;

  /**
   * Active connection information.
   * 
   * See {@link AdsClientConnection}
   */
  public connection: AdsClientConnection = {
    connected: false
  };

  /**
   * Active connection metadata.
   * 
   * Metadata includes target device information, symbols, data types and so on.
   * 
   * Some properties might not be available in all connection setups and setting combinations.
   */
  public metaData: ConnectionMetaData = { ...this.defaultMetaData };

  /**
   * Creates a new ADS client instance.
   * 
   * Settings are provided in `settings` parameter - see {@link AdsClientSettings}.
   * 
   * @example
   * 
   * ```js
   * const client = new Client({
   *  targetAmsNetId: "192.168.4.1.1.1",
   *  targetAdsPort: 851
   * });
   * ```
   */
  public constructor(settings: AdsClientSettings) {
    super();

    //Taking the default settings and then updating the provided ones
    this.settings = {
      ...this.settings,
      ...settings
    };
  };

  /**
   * Emits a warning, which results in a `warning` event, and a console message if `hideConsoleWarnings` is not set.
   *
   * @param message Warning message
   */
  private warn(message: string) {
    if (!this.settings.hideConsoleWarnings) {
      console.log(`WARNING: ${message}`);
    }

    this.emit('warning', message);
  }

  /**
   * Clears given timer if it's available and increases the ID.
   * 
   * @param timerObject Timer object
   */
  private clearTimer(timerObject: TimerObject) {
    timerObject.timer && clearTimeout(timerObject.timer);
    timerObject.timer = undefined;
    timerObject.id = timerObject.id < Number.MAX_SAFE_INTEGER ? timerObject.id + 1 : 0;
  }

  /**
   * Returns target AMS address as a string in a format `amsNetId:port`.
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
   * Writes given data buffer to the socket.
   * 
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
   * @param isReconnecting If `true`, reconnecting is in progress
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

      //Loopback AMS address
      if (this.settings.targetAmsNetId.toLowerCase() === 'localhost') {
        this.settings.targetAmsNetId = '127.0.0.1.1.1';
      }

      //Using 127.0.0.1 instead of localhost (https://github.com/nodejs/node/issues/40702)
      if (this.settings.routerAddress.toLowerCase() === 'localhost') {
        this.settings.routerAddress = '127.0.0.1';
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

        //If rawClient setting is true, we are done here (just a connection is enough)
        if (this.settings.rawClient !== true) {
          try {
            //Initialize PLC connection (some subscriptions, pollers etc.)
            await this.setupPlcConnection();
          } catch (err) {
            if (!this.settings.allowHalfOpen) {
              return reject(new ClientError(`connectToTarget(): Connection failed - failed to set PLC connection. If target is not PLC runtime, use setting "rawClient". If system is in config mode or there is no PLC software yet, you might want to use setting "allowHalfOpen". Error: ${(err as ClientError).message}`, err));
            }

            //allowHalfOpen allows this, but show some warnings..
            if (!this.metaData.tcSystemState) {
              this.warn(`"allowHalfOpen" setting is active. Target is connected but no connection to TwinCAT system. If target is not PLC runtime, use setting "rawClient" instead of "allowHalfOpen".`);

            } else if (this.metaData.tcSystemState.adsState !== ADS.ADS_STATE.Run) {
              this.warn(`"allowHalfOpen" setting is active. Target is connected but TwinCAT system is in ${this.metaData.tcSystemState.adsStateStr} instead of run mode. No connection to PLC runtime.`);

            } else {
              this.warn(`"allowHalfOpen" setting is active. No connection to PLC runtime. Check "targetAdsPort" setting and PLC status`);
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
   * Unregisters ADS port from the router (if required and disconnects from the target.
   *
   * @param forceDisconnect If `true`, the connection is dropped immediately (default: `false`)
   * @param isReconnecting If `true`, reconnecting is in progress (default: `false`)
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

        this.emit("disconnect", isReconnecting);
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
        this.emit("disconnect", isReconnecting);
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
        this.emit("disconnect", isReconnecting);
        return reject(new ClientError(`disconnect(): Disconnected with errors: ${(disconnectError as Error).message}`, err));
      }
    })
  }

  /**
   * Backups subscriptions, disconnects from the target, connects again to the target 
   * and restores the subscriptions.
   *
   * @param forceDisconnect If `true`, the connection is dropped immediately (default: `false`)
   * @param isReconnecting If `true`, reconnecting is in progress (default: `false`)
   * 
   * @throws Throws an error if connecting fails
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
            isReconnecting && this.warn(`Reconnected and all subscriptions were restored!`);
            this.debug(`reconnectToTarget(): Reconnected and all subscriptions were restored!`);

          } else {
            this.warn(`Reconnected but failed to restore following subscriptions:\n - ${failures.join('\n - ')}`);
            this.debug(`reconnectToTarget(): Reconnected but failed to restore following subscriptions: ${failures.join(', ')}`);
          }

          this.emit('reconnect', !failures.length, failures);
          resolve(res);
        })
        .catch(err => {
          this.debug(`reconnectToTarget(): Reconnecting failed ${err.message}`);
          reject(err);
        });
    });
  }

  /**
   * Registers a free ADS port from the AMS router.
   * 
   * If the `settings.localAmsNetId` and `settings.localAdsPort` are set, does nothing.
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
   * Unregisters a previously registered ADS port from the AMS router.
   * 
   * The remote seems to drop TCP connection after unregistering, 
   * so basically calling this always disconnects too.
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
   * Configures the connection to handle a TwinCAT PLC connection, which is the default
   * assumption when using ads-client.
   * 
   * This is not called if the `settings.rawClient` is `true`.
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
    await this.readPlcUploadInfo();

    //Reading initial PLC runtime symbol version
    await this.readPlcSymbolVersion();

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
    if (this.settings.readAndCacheSymbols || this.metaData.allPlcSymbolsCached) {
      await this.cacheSymbols();
    }

    //Pre-cache data types
    if (this.settings.readAndCacheDataTypes || this.metaData.allPlcDataTypesCached) {
      await this.cacheDataTypes();
    }
  }

  /**
   * Starts a poller that will read TwinCAT system state every `settings.connectionCheckInterval` milliseconds.
   *  
   * This is used to detect connection operation and if the target TwinCAT system state has changed.
   *
   * This is not called if the `settings.rawClient` is `true`.
   */
  private startTcSystemStatePoller() {
    this.clearTimer(this.tcSystemStatePollerTimer);

    this.tcSystemStatePollerTimer.timer = setTimeout(
      () => this.checkTcSystemState(this.tcSystemStatePollerTimer.id),
      this.settings.connectionCheckInterval
    );
  }

  /**
   * Reads active TwinCAT system state and detects if it has changed or if the connection is down.
   * 
   * This is called from timer started by `startTcSystemStatePoller()`.
   * 
   * Afterwards starts the poller timer again.
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

      this.connectionDownSince = undefined;

      if (!oldState || state.adsState !== oldState.adsState) {
        this.debug(`checkTcSystemState(): TwinCAT system state has changed from ${oldState?.adsStateStr} to ${state.adsStateStr}`)
        this.emit('tcSystemStateChange', state, oldState);

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
        this.connectionDownSince = new Date();
      }

      const time = Date.now() - this.connectionDownSince.getTime();

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
   * A subscription callback that is called when the target PLC runtime state has changed.
   * 
   * This is not called if the `settings.rawClient` is `true`.
   * 
   * @param data Received data
   * @param subscription The subscription object (unused here)
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

    let oldState = this.metaData.plcRuntimeState !== undefined
      ? { ...this.metaData.plcRuntimeState }
      : undefined;

    this.metaData.plcRuntimeState = res;

    if (stateChanged) {
      this.emit('plcRuntimeStateChange', this.metaData.plcRuntimeState, oldState);
    }
  }

  /**
   * A subscription callback that is called when the target PLC runtime symbol version has changed.
   * 
   * @param data Received data
   * @param subscription The subscription object (unused here)
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

      //Clear all cached symbol and data types etc.
      this.metaData.plcDataTypes = {};
      this.metaData.plcSymbols = {};
      this.metaData.plcUploadInfo = undefined;

      //Refreshing upload info
      try {
        await this.readPlcUploadInfo();

      } catch (err) {
        this.debug(`onPlcSymbolVersionChanged(): Failed to refresh upload info`);
      }

      //Refreshing symbol cache (if needed)
      if (this.metaData.allPlcSymbolsCached) {
        try {
          await this.cacheSymbols();

        } catch (err) {
          this.debug(`onPlcSymbolVersionChanged(): Failed to refresh symbol cache`);
        }
      }

      //Refreshing data type cache (if needed)
      if (this.metaData.allPlcDataTypesCached) {
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
        this.warn(`Target PLC symbol version changed and all subscriptions were not restored (data might be lost from now on). Error info: ${JSON.stringify(err)}`);
        this.debug(`onPlcSymbolVersionChanged(): Failed to restore all subscriptions. Error: %o`, err);
      }
    }

    const oldVersion = this.metaData.plcSymbolVersion;
    this.metaData.plcSymbolVersion = symbolVersion;

    this.emit('plcSymbolVersionChange', symbolVersion, oldVersion);
  }

  /**
   * Event listener callback for TCP socket error event.
   * 
   * See also {@link Client.socketErrorHandler} which is `onSocketError.bind(this)`
   */
  private onSocketError(err: Error) {
    this.warn(`Socket connection to target closed to an an error, disconnecting: ${JSON.stringify(err)}`);
    this.onConnectionLost(true);
  }

  /**
   * Handles a lost connection, called when connection to the remote is lost. 
   * 
   * The connection might be lost for example due to a closed socket, socket error,
   * TwinCAT system state change or local router state change.
   * 
   * @param socketFailure If `true`, the connection was lost due to a TCP socket problem (default: `false`)
   */
  private async onConnectionLost(socketFailure = false) {
    this.debug(`onConnectionLost(): Connection was lost. Socket failure: ${socketFailure}`);

    this.connection.connected = false;
    this.emit('connectionLost', socketFailure);

    if (this.settings.autoReconnect !== true) {
      this.warn("Connection to target was lost and setting autoReconnect was false -> disconnecting");
      await this.disconnectFromTarget(true).catch();
      return;
    }

    this.socketConnectionLostHandler && this.socket?.off('close', this.socketConnectionLostHandler);
    this.warn("Connection to target was lost. Trying to reconnect automatically...");

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
            this.warn(`Reconnecting failed. Keeping trying in the background every ${this.settings.reconnectInterval} ms...`);
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
   * Creates an AMS/TCP request from given packet object.
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
   * Creates an AMS header from given packet object.
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
   * Checks received data buffer for full AMS packets. 
   * 
   * If a full packet is found, it is passed forward.
   * 
   * Calls itself recursively if multiple packets available. 
   * If so, calls also `setImmediate()` to prevent blocking the event loop.
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
   * Parses an AMS/TCP packet from given buffer and then handles it.
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
   * Parses an AMS/TCP header from given buffer.
   * 
   * Returns the rest of the payload as data,
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
   * Parses an AMS header from given buffer.
   * 
   * Returns the rest of the payload as data.
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
   * Parses ADS data from given buffer. 
   * 
   * Uses `packet.ams` to determine the ADS command.
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

        if (data.byteLength > 4) {
          //4..7 Data length (bytes)
          ads.length = data.readUInt32LE(pos);
          pos += 4;

          //8..n Data
          ads.payload = Buffer.alloc(ads.length);
          data.copy(ads.payload, 0, pos);
          break;

        } else {
          //Only error code received (some TwinCAT 2 devices)
          ads.length = 0;
          ads.payload = Buffer.alloc(0);
        }

      case ADS.ADS_COMMAND.Read:
        ads = {} as AdsReadResponse;

        //0..3 Ads error number
        ads.errorCode = data.readUInt32LE(pos);
        pos += 4;

        if (data.byteLength > 4) {
          //4..7 Data length (bytes)
          ads.length = data.readUInt32LE(pos);
          pos += 4;

          //8..n Data
          ads.payload = Buffer.alloc(ads.length);
          data.copy(ads.payload, 0, pos);

        } else {
          //Only error code received (some TwinCAT 2 devices)
          ads.length = 0;
          ads.payload = Buffer.alloc(0);
        }
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

        if (data.byteLength > 4) {
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
        }
        break;

      case ADS.ADS_COMMAND.ReadState:
        ads = {} as AdsReadStateResponse;

        //0..3 Ads error number
        ads.errorCode = data.readUInt32LE(pos);
        pos += 4;

        ads.payload = {} as AdsState;

        if (data.byteLength > 4) {
          //4..5 ADS state
          ads.payload.adsState = data.readUInt16LE(pos);
          ads.payload.adsStateStr = ADS.ADS_STATE.toString(ads.payload.adsState);
          pos += 2;

          //6..7 Device state
          ads.payload.deviceState = data.readUInt16LE(pos);
          pos += 2;
        }
        break;

      case ADS.ADS_COMMAND.AddNotification:
        ads = {} as AdsAddNotificationResponse;

        //0..3 Ads error number
        ads.errorCode = data.readUInt32LE(pos);
        pos += 4;

        ads.payload = {} as AdsAddNotificationResponseData;

        if (data.byteLength > 4) {
          //4..7 Notification handle
          ads.payload.notificationHandle = data.readUInt32LE(pos);
          pos += 4;
        }
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
   * Handles the parsed AMS/TCP packet and actions/callbacks related to it.
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
        packet.amsTcp.commandStr = 'GET_LOCAL_NETID';
        //No action at the moment
        break;

      default:
        packet.amsTcp.commandStr = `Unknown command ${packet.amsTcp.command}`;
        this.debug(`onAmsTcpPacketReceived(): Unknown AMS/TCP command received: "${packet.amsTcp.command}"`);
        break;
    }
  }

  /**
   * Handles received ADS command.
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
            const subscription = this.activeSubscriptions[key]?.[sample.notificationHandle];

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
                  this.debug(`onAdsCommandReceived(): Notification received but parsing Javascript object failed: %o`, err);
                  this.emit('client-error', new ClientError(`onAdsCommandReceived(): Notification received but parsing data to Javascript object failed. Subscription: ${JSON.stringify(subscription)}`, err));
                });

            } else if (this.settings.deleteUnknownSubscriptions) {
              this.debugD(`onAdsCommandReceived(): Notification received with unknown handle ${sample.notificationHandle} (${key})`);
              this.deleteNotificationHandle(sample.notificationHandle, packet.ams.sourceAmsAddress)
                  .then(() => this.warn(`onAdsCommandReceived(): Notification received with unknown handle ${sample.notificationHandle} (${key}) was automatically deleted.`))
                  .catch((err) => this.emit('client-error', new ClientError(`onAdsCommandReceived(): Failed to delete stale notification handle ${sample.notificationHandle} (${key})`, err)));
            } else {
              this.debugD(`onAdsCommandReceived(): Notification received with unknown handle ${sample.notificationHandle} (${key})`);
              this.warn(`onAdsCommandReceived(): Notification received with unknown handle ${sample.notificationHandle} (${key}). Use unsubscribe() to save resources.`);
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
          this.emit('client-error', new ClientError(`onAdsCommandReceived(): Ads command received with unknown invokeId "${packet.ams.invokeId}"`));
        }
        break;
    }
  }

  /**
   * Called when local AMS router state has changed (router notification is received).
   * 
   * Router state changes multiple times for example when local TwinCAT system 
   * is changed from `Config` -> `Run` and vice-versa. If connected to a local system, router state changes might also cause
   * client the reconnect automatically.
   * 
   * Router state is received from the router with AMS command `AMS_TCP_PORT_ROUTER_NOTE` (see {@link ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_ROUTER_NOTE})
   * 
   * @param state New router state
   */
  private onRouterStateChanged(state: AmsRouterStateData) {
    let oldState = this.metaData.routerState !== undefined
      ? { ...this.metaData.routerState }
      : undefined;

    this.metaData.routerState = {
      state: state.routerState,
      stateStr: ADS.AMS_ROUTER_STATE.toString(state.routerState)
    };

    this.debug(`onRouterStateChanged(): Local AMS router state has changed to ${this.metaData.routerState.stateStr}`);
    this.emit("routerStateChange", this.metaData.routerState, oldState);

    //If we have a local connection, connection needs to be reinitialized
    if (this.connection.isLocal) {
      //We should stop polling TwinCAT system state, the poller will be reinitialized later
      this.clearTimer(this.tcSystemStatePollerTimer);

      this.debug("onRouterStateChanged(): Local loopback connection active, monitoring router state. Reconnecting when router is back running.");

      if (this.metaData.routerState.state === ADS.AMS_ROUTER_STATE.START) {
        this.warn(`Local AMS router state has changed to ${this.metaData.routerState.stateStr}. Reconnecting...`);
        this.onConnectionLost();

      } else {
        //Nothing to do, just wait until router has started again..
        !this.settings.hideConsoleWarnings && console.log(`WARNING: Local AMS router state has changed to ${this.metaData.routerState.stateStr}. Connection and active subscriptions might have been lost. Waiting router to start again.`);
      }
    }
  }

  /**
   * Parses received ADS notification data (stamps) from given data.
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
   * Adds a new subscription to the target (an ADS device notification).
   * 
   * Sends a `AddNotification` ADS command.
   * 
   * @param settings Subscription settings / subscription to add
   * @param internal If `true`, this is an internal subscription of the client
   * @param targetOpts Optional target settings that override values in `settings` (**NOTE:** If used, no caching is available -> possible performance impact)
   */
  private async addSubscription<T = any>(settings: SubscriptionSettings<T>, internal: boolean, targetOpts: Partial<AmsAddress> = {}): Promise<ActiveSubscription<T>> {
    this.debugD(`addSubscription(): Subscribing %o (internal: ${internal})`, settings);

    let targetAddress = {} as AdsRawAddress;
    let symbol: AdsSymbol | undefined = undefined;

    if (typeof settings.target === "string") {
      try {
        symbol = await this.getSymbol(settings.target, targetOpts);

        //Read symbol datatype to cache -> It's cached when we start getting notifications
        //Otherwise with large structs and fast cycle times there might be some issues
        //NOTE: Only when we are targetted to original target system, otherwise we don't have caching so no need to
        if (!this.settings.disableCaching && !targetOpts.adsPort && !targetOpts.amsNetId) {
          await this.getDataType(symbol.type, targetOpts);
        }

        targetAddress = {
          indexGroup: symbol.indexGroup,
          indexOffset: symbol.indexOffset,
          size: symbol.size
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
        symbol,
        unsubscribe: async function () {
          await clientRef.unsubscribe(this);
        },
        parseNotification: async function (data: Buffer, timestamp: Date): Promise<SubscriptionData<T>> {
          const result: SubscriptionData<T> = {
            timestamp,
            value: data as T
          };

          if (this.symbol) {
            const dataType = await clientRef.getDataType(this.symbol.type, this.targetOpts);
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
   * Unsubscribes from all active subscriptions.
   * 
   * @param internals If `true`, also internal subscriptions are unsubscribed
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
      this.debug(`removeSubscriptions(): Unsubscribing all failed - some subscriptions were not unsubscribed: %o`, err);
      throw new ClientError(`removeSubscriptions(): Unsubscribing all failed - some subscriptions were not unsubscribed`, err);
    }
  }

  /**
   * Backups active subscriptions for restoring them later (after reconnecting).
   * 
   * Returns number of subscriptions that were saved for restoring.
   * 
   * @param unsubscribe If `true`, {@link Client.unsubscribeAll()} is also called after saving
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
   * Restores all previously backed up subscriptions.
   * 
   * Returns array of subscription targets that failed to be subscribed
   * (empty array if all were restored successfully).
   */
  private async restoreSubscriptions() {
    const failedTargets: string[] = [];
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
   * Parses symbol from raw ADS response payload.
   * 
   * @param data Data containing ADS symbol (without first 4 bytes of ADS payload containing entry length)
   */
  private parseAdsResponseSymbol(data: Buffer): AdsSymbol {
    this.debugD(`parseAdsResponseSymbol(): Parsing symbol from data (${data.byteLength} bytes)`);

    const symbol = {} as AdsSymbol;
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
    if ((symbol.flags & ADS.ADS_SYMBOL_FLAGS.ExtendedFlags) === ADS.ADS_SYMBOL_FLAGS.ExtendedFlags) {
      symbol.extendedFlags = data.readUInt32LE(pos);
      pos += 4;
    }

    //If extended flag RefactorInfo is set
    if ((symbol.extendedFlags & ADS.ADS_SYMBOL_FLAGS_2.RefactorInfo) === ADS.ADS_SYMBOL_FLAGS_2.RefactorInfo) {
      this.warn(`Symbol ${symbol.name} (${symbol.type}) has extended flag "RefactorInfo" which is not supported. Things might not work now. Please open an issue at Github`);
    }

    //Reserved, if any
    symbol.reserved = data.subarray(pos);

    this.debugD(`parseAdsResponseSymbol(): Symbol parsed for ${symbol.name} (${symbol.type})`);
    return symbol;
  }

  /**
   * Parses data type declaration from raw ADS response payload.
   * 
   * @param data Data containing data type declaration (without first 4 bytes of ADS payload containing entry length)
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

    //If flag RefactorInfo set
    if ((dataType.flags & ADS.ADS_DATA_TYPE_FLAGS.RefactorInfo) === ADS.ADS_DATA_TYPE_FLAGS.RefactorInfo) {
      //TODO: this is not working now
      //Things probably break now
      this.warn(`Data type ${dataType.name} (${dataType.type}) has flag "RefactorInfo" which is not supported. Things might not work now. Please open an issue at Github`);
    }

    //If flag ExtendedFlags set
    if ((dataType.flags & ADS.ADS_DATA_TYPE_FLAGS.ExtendedFlags) === ADS.ADS_DATA_TYPE_FLAGS.ExtendedFlags) {
      dataType.extendedFlags = data.readUInt32LE(pos);
      pos += 4;
    }

    //If flag DeRefTypeItem set
    if ((dataType.flags & ADS.ADS_DATA_TYPE_FLAGS.DeRefTypeItem) === ADS.ADS_DATA_TYPE_FLAGS.DeRefTypeItem) {
      const count = data.readUInt16LE(pos);
      pos += 2;
      pos += count * 16;
    }

    //If flag ExtendedEnumInfos set
    if ((dataType.flags & ADS.ADS_DATA_TYPE_FLAGS.ExtendedEnumInfos) === ADS.ADS_DATA_TYPE_FLAGS.ExtendedEnumInfos) {
      //TODO: this is not working now
      //Things probably break now
      this.warn(`Data type ${dataType.name} (${dataType.type}) has flag "ExtendedEnumInfos" which is not supported. Things might not work now. Please open an issue at Github`);
    }

    //If flag SoftwareProtectionLevels set
    if ((dataType.flags & ADS.ADS_DATA_TYPE_FLAGS.SoftwareProtectionLevels) === ADS.ADS_DATA_TYPE_FLAGS.SoftwareProtectionLevels) {
      //TODO: this is not working now
      //Things probably break now
      this.warn(`Data type ${dataType.name} (${dataType.type}) has flag "SoftwareProtectionLevels" which is not supported. Things might not work now. Please open an issue at Github`);
    }

    //Reserved, if any
    dataType.reserved = data.subarray(pos);

    this.debugD(`parseAdsResponseDataType(): Data type parsed (result: ${dataType.name})`);

    return dataType;
  }

  /**
   * Gets data type declaration for requested data type.
   * 
   * **NOTE:** Only returns the requested data type and its direct children. Not the children of children.
   * 
   * To get the full datatype with all items, use {@link Client.buildDataType()}.
   * 
   * Returns previously cached value if available, otherwise reads it from the target
   * and caches it.  
   * 
   * If caching is disabled using `settings.disableCaching`, data is always read from the target.
   * 
   * If `targetOpts` is used to override target, caching is always disabled.
   * 
   * @param name Data type name in the PLC (such as `ST_Struct`)
   * @param targetOpts Optional target settings that override values in `settings` (**NOTE:** If used, no caching is available -> possible performance impact)
   */
  private async getDataTypeDeclaration(name: string, targetOpts: Partial<AmsAddress> = {}): Promise<AdsDataType> {
    this.debug(`getDataTypeDeclaration(): Data type declaration requested for ${name}`);

    //Is this data type already cached? Skip check if we have different target
    if (!this.settings.disableCaching
      && !targetOpts.adsPort
      && !targetOpts.amsNetId
      && this.metaData.plcDataTypes[name.toLowerCase()]) {

      this.debug(`getDataTypeDeclaration(): Data type declaration found from cache for ${name}`);
      return this.metaData.plcDataTypes[name.toLowerCase()];
    }

    //Reading from target
    this.debug(`getDataTypeDeclaration(): Data type declaration for ${name} not cached, reading from target`);

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
        this.metaData.plcDataTypes[name.toLowerCase()] = dataType;
      }
      this.debug(`getDataTypeDeclaration(): Data type declaration read and parsed for ${name}`);

      return dataType;

    } catch (err) {
      this.debug(`getDataTypeDeclaration(): Reading data type declaration for ${name} failed: %o`, err);
      throw new ClientError(`getDataTypeDeclaration(): Reading data type declaration for ${name} failed`, err);
    }
  }

  /**
   * Builds full data type declaration for requested data type with all children (and their children and so on).
   *
   * If available, previously cached data is used for building the full data type. Otherwise data is read from the target
   * and cached. 
   * 
   * If caching is disabled using `settings.disableCaching`, data is always read from the target.
   * 
   * If `targetOpts` is used to override target, caching is always disabled. 
   * 
   * @param name Data type name in the PLC (such as `ST_Struct`)
   * @param targetOpts Optional target settings that override values in `settings` (**NOTE:** If used, no caching is available -> possible performance impact)
   * @param isRootType If `true`, this is the root type / first call / not recursive call (default: `true`)
   * @param knownSize Data type size (if known) - used with pseudo data types and TwinCAT 2 primite types
   */
  private async buildDataType(name: string, targetOpts: Partial<AmsAddress> = {}, isRootType = true, knownSize?: number): Promise<AdsDataType> {
    try {
      this.debug(`buildDataType(): Building data type for ${name}`);

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
              extendedFlags: 0,
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
      this.debug(`buildDataType(): Building data type for ${name} failed: %o`, err);
      throw new ClientError(`buildDataType(): Building data type for ${name} failed`, err);
    }
  }

  /**
   * Converts raw data to Javascript object (primitive PLC types only)
   * 
   * @param buffer The raw data to convert
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

  /**
   * Converts raw data to Javascript object.
   * 
   * This is usually called recursively.
   * 
   * @param data The raw data to convert
   * @param dataType Target data type
   * @param isArrayItem If `true`, this is an array item (default: `false`)
   */
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

    } else if (dataType.flagsStr.includes('BitValues')) {
      //This is a BIT (special case) - offset is in bits, instead of bytes

      //First we need to know which byte to read from data (as Buffer has no bit access)
      const byteNumber = Math.floor(dataType.offset / 8);
      const byteValue = data.readUint8(byteNumber);

      //Then we need also bit number in this byte, getting the value is easy
      const bitNumber = dataType.offset % 8;
      result = !!(byteValue & 1 << bitNumber);

    } else {
      //Primitive type
      result = this.convertBufferToPrimitiveType(data.subarray(dataType.offset, dataType.offset + dataType.size), dataType) as T;
    }

    return result as T;
  }

  /**
   * Converts a Javascript object to raw data.
   * 
   * @param value Javascript object to convert
   * @param dataType Target data type
   * @param objectPath Object path that is passed forward when calling recursively. This is used for error reporting if a property is missing
   * @param isArrayItem If `true`, this is an array item (default: `false`)
   */
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

        if (subItem.flagsStr.includes('BitValues')) {
          //This is a BIT inside a STRUCT (special case) - offset is in bits, instead of bytes

          //First we need to know which byte to write data (as Buffer has no bit access)
          const byteNumber = Math.floor(subItem.offset / 8);
          let byteValue = rawValue.readUint8(byteNumber);

          //Then we need also bit number in this byte
          const bitNumber = subItem.offset % 8;

          //Using value from convertObjectToBuffer() call above, so that the conversion happens in correct place (= not here)
          const bitValue = !!res.rawValue.readUint8();

          byteValue = bitValue
            ? byteValue | (1 << bitNumber) //Set bit
            : byteValue & ~(1 << bitNumber); //Reset bit

          //Writing the changed byte back to the raw value
          rawValue.writeUint8(byteValue, byteNumber);

        } else {
          //Normal subitem - copy the subitem data to the buffer
          res.rawValue.copy(rawValue, subItem.offset);
        }
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
   * Converts a Javascript object (that is PLC primitive type) to raw data
   * 
   * @param value Javascript object to convert
   * @param dataType Data type
   * @param buffer Reference to Buffer object where to write the raw value
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
   * Used for example in {@link Client.writeValue()} when `autoFill` setting is used 
   * to merge active values (missing properties) to user-provided properties.
   * 
   * This is based on https://stackoverflow.com/a/34749873/8140625 
   * and https://stackoverflow.com/a/49727784/8140625 with some changes.
   * 
   * @param caseSensitive If `true`, the property keys are handled as case-sensitive (as they normally are). In TwinCAT everything is case-insensitive --> `false`.
   * @param target Target object where to merge source objects (this is the value provide by user)
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
   * Connects to the target that is configured in {@link Client.settings} (set in {@link Client.constructor}).
   * 
   * If success, returns the connection information (see {@link AdsClientConnection})
   * 
   * @throws Throws an error if connecting fails
   * 
   * @example
   * ```js
   * try {
   *  const res = await client.connect();
   * 
   *  console.log(`Connected to the ${res.targetAmsNetId}`);
   *  console.log(`Router assigned us AmsNetId ${res.localAmsNetId} and port ${res.localAdsPort}`);
   * } catch (err) {
   *  console.log("Connecting failed:", err);
   * }
   * ```
   */
  public connect(): Promise<Required<AdsClientConnection>> {
    return this.connectToTarget();
  }

  /**
   * Disconnects from the target and closes active connection.
   * 
   * Subscriptions are deleted in a handled manner and ADS port is unregisterd.
   * 
   * **WARNING:** If `force` is used, active subscriptions are not deleted!
   * This affects PLCs performance in the long run.
   * 
   * @param force If `true`, the connection is dropped immediately (uncontrolled) - use only in special "emergency" cases (default: `false`)
   * 
   * @throws Throws an error if disconnecting fails. However the connection stil ended.
   * 
   * @example
   * ```js
   * try {
   *  const res = await client.disconnect();
   *  console.log("Disconnected");
   * } catch (err) {
   *  console.log("Disconnected with error:", err);
   * }
   * ```
   */
  public disconnect(force: boolean = false): Promise<void> {
    return this.disconnectFromTarget(force);
  }

  /**
   * Reconnects to the target (disconnects and then connects again).
   * 
   * Active subscriptions are saved and restored automatically after reconnecting.
   * 
   * **WARNING:** If `forceDisconnect` is used, active subscriptions are not deleted!
   * This affects PLCs performance in the long run.
   * 
   * @param forceDisconnect If `true`, the connection is dropped immediately (uncontrolled - as `force` in {@link Client.disconnect()}) - use only in special "emergency" cases (default: `false`)
   * 
   * @throws Throws an error if connecting fails
   */
  public reconnect(forceDisconnect: boolean = false): Promise<Required<AdsClientConnection>> {
    return this.reconnectToTarget(forceDisconnect) as Promise<Required<AdsClientConnection>>;
  }

  /**
   * Sets active debug level.
   * 
   * Debug levels:
   *  - 0: no debugging (default)
   *  - 1: basic debugging (`$env:DEBUG='ads-client'`)
   *  - 2: detailed debugging (`$env:DEBUG='ads-client,ads-client:details'`)
   *  - 3: detailed debugging with raw I/O data (`$env:DEBUG='ads-client,ads-client:details,ads-client:raw-data'`)
   * 
   * Debug data is available in the console (See [Debug](https://www.npmjs.com/package/debug) library for mode).
   */
  setDebugLevel(level: DebugLevel): void {
    this.debugLevel_ = level;

    this.debug.enabled = level >= 1;
    this.debugD.enabled = level >= 2;
    this.debugIO.enabled = level >= 3;

    this.debug(`setDebugLevel(): Debug level set to ${level}`);
  }

  /**
   * Sends a raw ADS command to the target.
   * 
   * This can be useful in some special cases or custom system. See {@link ADS.ADS_COMMAND} for common commands.
   * 
   * **NOTE:** Client already includes all the most common commands:
   * - {@link Client.readRaw}() - `Read` command
   * - {@link Client.writeRaw}() - `Write` command
   * - {@link Client.readDeviceInfo}() - `ReadDeviceInfo` command
   * - {@link Client.readState}() - `ReadState` command
   * - {@link Client.writeControl}() - `WriteControl` command
   * - {@link Client.subscribe}() - `AddNotification` command
   * - {@link Client.unsubscribe}() - `DeleteNotification` command
   * - {@link Client.readWriteRaw}() - `ReadWrite` command
   * 
   * @template T ADS response type. If omitted, generic {@link AdsResponse} type is used
   * 
   * @throws Throws an error if sending the command fails or if target responds with an error
   * 
   * @example
   * ```js
   * TODO - DOCUMENTATION ONGOING
   * ```
   */
  public async sendAdsCommand<T = AdsResponse>(command: AdsCommandToSend) {
    return new Promise<AmsTcpPacket<T>>(async (resolve, reject) => {

      if (this.nextInvokeId >= ADS.ADS_INVOKE_ID_MAX_VALUE) {
        this.nextInvokeId = 0;
      }

      const packet: AmsTcpPacket<AdsRequest> = {
        amsTcp: {
          command: ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_AMS_CMD,
          commandStr: ADS.AMS_HEADER_FLAG.toString(ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_AMS_CMD) as keyof typeof ADS.AMS_HEADER_FLAG
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
   * Sends an ADS `WriteControl` command to the target.
   * 
   * More info: [Beckhoff documentation](https://infosys.beckhoff.com/content/1033/tc3_ads_intro/115879947.html?id=4720330147059483431)
   * 
   * @param adsState Requested ADS state - see {@link ADS.ADS_STATE}. Can be a number or a valid string, such as `Config`
   * @param deviceState  Requested device state (default: `0`)
   * @param data Additional data to send (if any)
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   * 
   * @example
   * ```js
   * try {
   *  //Set target (PLC) to run
   *  await client.writeControl("Run");
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
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
   * Starts the target PLC runtime. Same as pressing the green play button in TwinCAT XAE.
   * 
   * **NOTE:** This requires that the target is a PLC runtime or has equivalent ADS protocol support.
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if target responds with an error
   * 
   * @example
   * ```js
   * try {
   *  await client.startPlc();
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
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
   * Resets the target PLC runtime. Same as reset cold in TwinCAT XAE.
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   * 
   * @example
   * ```js
   * try {
   *  await client.resetPlc();
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
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
   * Stops the target PLC runtime. Same as pressing the red stop button in TwinCAT XAE.
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   *  
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   * 
   * @example
   * ```js
   * try {
   *  await client.stopPlc();
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
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
   * Restarts the PLC runtime. Same as calling first {@link resetPlc}() and then {@link startPlc}()`
   * 
   * **NOTE:** This requires that the target is a PLC runtime or has equivalent ADS protocol support.
   * 
   * @example
   * ```js
   * try {
   *  await client.restartPlc();
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   *  
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   * 
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
   * Sets the target TwinCAT system to run mode. Same as **Restart TwinCAT system** in TwinCAT XAE.
   * 
   * **NOTE:** As default, also reconnects the client afterwards to restore subscriptions.
   * 
   * @example
   * ```js
   * try {
   *  //Reconnect the client
   *  await client.setTcSystemToRun();
   * 
   *  //Don't reconnect the client
   *  await client.setTcSystemToRun(false);
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param reconnect If `true`, connection is reconnected afterwards to restore subscriptions etc. (default: `true`)
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   * 
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
        this.warn("Reconnecting after TwinCAT system restart");
        this.onConnectionLost();
      }

    } catch (err) {
      this.debug(`setTcSystemToRun(): Setting TwinCAT system to run mode at ${this.targetToString(targetOpts)} failed: %o`, err);
      throw new ClientError(`setTcSystemToRun(): Setting TwinCAT system to run mode at ${this.targetToString(targetOpts)} failed`, err);
    }
  }

  /**
   * Sets the target TwinCAT system to config mode. Same as **Restart TwinCAT (Config mode)** in TwinCAT XAE.
   * 
   * **NOTE:** If the target is a PLC runtime, the connection might be lost.
   * 
   * @example
   * ```js
   * try {
   *  await client.setTcSystemToConfig();
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   * 
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
   * Restarts the target TwinCAT system. 
   * 
   * Just a wrapper for {@link setTcSystemToRun}() - the operation is the same.
   * 
   * **NOTE:** As default, also reconnects the client afterwards to restore subscriptions.
   * 
   * @example
   * ```js
   * try {
   *  //Reconnect the client
   *  await client.restartTcSystem();
   * 
   *  //Don't reconnect the client
   *  await client.restartTcSystem(false);
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param reconnect If `true`, connection is reconnected afterwards to restore subscriptions etc. (default: `true`)
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   * 
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
   * Returns symbol for given variable path, such as `GVL_Test.ExampleStruct`.
   * 
   * Returns previously cached value if available, otherwise reads it from the target
   * and caches it. 
   * 
   * If caching is disabled using `settings.disableCaching`, data is always read from the target.
   * 
   * If `targetOpts` is used to override target, caching is always disabled.
   * 
   * **NOTE:** This requires that the target is a PLC runtime or has equivalent ADS protocol support.
   * 
   * @example
   * ```js
   * try {
   *  const symbol = await client.getSymbol('GVL_Test.ExampleStruct');
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param path Symbol variable path at the target (such as `GVL_Test.ExampleStruct`)
   * @param targetOpts Optional target settings that override values in `settings`. If used, caching is disabled -> possible performance impact.
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   */
  public async getSymbol(path: string, targetOpts: Partial<AmsAddress> = {}): Promise<AdsSymbol> {
    if (!this.connection.connected) {
      throw new ClientError(`getSymbol(): Client is not connected. Use connect() to connect to the target first.`);
    }
    path = path.trim();

    this.debug(`getSymbol(): Symbol requested for ${path}`);

    //Is this symbol already cached? Skip check if we have different target
    if (!this.settings.disableCaching
      && !targetOpts.adsPort
      && !targetOpts.amsNetId
      && this.metaData.plcSymbols[path.toLowerCase()]) {

      this.debug(`getSymbol(): Symbol found from cache for ${path}`);
      return this.metaData.plcSymbols[path.toLowerCase()];
    }

    //Reading from target
    this.debug(`getSymbol(): Symbol for ${path} not cached, reading from target`);

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
      const symbol = this.parseAdsResponseSymbol(res.ads.payload.subarray(4));

      //Only cache when original target
      if (!this.settings.disableCaching && !targetOpts.adsPort && !targetOpts.amsNetId) {
        this.metaData.plcSymbols[path.toLowerCase()] = symbol;
      }

      this.debug(`getSymbol(): Symbol read and parsed for ${path}`);
      return symbol;

    } catch (err) {
      this.debug(`getSymbol(): Reading symbol for ${path} failed: %o`, err);
      throw new ClientError(`getSymbol(): Reading symbol for ${path} failed`, err);
    }
  }

  /**
   * Returns full data type declaration for requested data type (such as `ST_Struct`) with all children (and their children and so on).
   * 
   * If available, previously cached data is used for building the full data type. Otherwise data is read from the target
   * and cached. 
   * 
   * If caching is disabled using `settings.disableCaching`, data is always read from the target.
   * 
   * If `targetOpts` is used to override target, caching is always disabled.
   * 
   * **NOTE:** This requires that the target is a PLC runtime or has equivalent ADS protocol support.
   * 
   * @example
   * ```js
   * try {
   *  const dataType = await client.getDataType('ST_Struct');
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param name Data type name at the target (such as `ST_Struct`)
   * @param targetOpts Optional target settings that override values in `settings`. If used, caching is disabled -> possible performance impact.
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   */
  public async getDataType(name: string, targetOpts: Partial<AmsAddress> = {}): Promise<AdsDataType> {
    if (!this.connection.connected) {
      throw new ClientError(`getDataType(): Client is not connected. Use connect() to connect to the target first.`);
    }
    name = name.trim();

    this.debug(`getDataType(): Data type requested for ${name}`);
    const dataType = await this.buildDataType(name, targetOpts);
    this.debug(`getDataType(): Data type read and built for ${name}`);

    return dataType;

  }

  /**
   * Reads target ADS state - see {@link ADS.ADS_STATE}).
   * 
   * This is the ADS protocol `ReadState` command.
   * 
   * See also {@link readPlcRuntimeState}() and {@link readTcSystemState}().
   * 
   * @example
   * ```js
   * try {
   *  const state = await client.readState();
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   */
  public async readState(targetOpts: Partial<AmsAddress> = {}): Promise<AdsState> {
    if (!this.connection.connected) {
      throw new ClientError(`readState(): Client is not connected. Use connect() to connect to the target first.`);
    }

    try {
      this.debug(`readState(): Reading target ADS state`);

      const res = await this.sendAdsCommand<AdsReadStateResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadState,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort
      });

      this.debug(`readState(): Target ADS state read successfully. State is %o`, res.ads.payload);

      return res.ads.payload;

    } catch (err) {
      this.debug(`readState(): Reading target ADS state failed: %o`, err);
      throw new ClientError(`readState(): Reading target ADS state failed`, err);
    }
  }

  /**
   * Reads target PLC runtime state (usually `Run`, `Stop` etc. - see {@link ADS.ADS_STATE})
   *
   * If `targetOpts` is not used to override target, the state is also
   * saved to the `metaData.plcRuntimeState`.
   * 
   * This is the same as {@link readState}(), except that the result is saved to
   * the `metaData.plcRuntimeState`.
   *
   * **NOTE:** This requires that the target is a PLC runtime or has equivalent ADS protocol support.
   * 
   * @example
   * ```js
   * try {
   *  const plcState = await client.readPlcRuntimeState();
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
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
   * Reads target TwinCAT system state from ADS port 10000 (usually `Run` or `Config`).
   *
   * If `targetOpts` is not used to override target, the state is also
   * saved to the `metaData.tcSystemState`.
   * 
   * This is the same as {@link readState}(), except that the result is saved to
   * the `metaData.tcSystemState`.
   *
   * @example
   * ```js
   * try {
   *  const tcSystemState = await client.readTcSystemState();
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
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
   * Reads target PLC runtime symbol version.
   * 
   * Symbol version usually changes when the PLC software is updated with download.
   *
   * **NOTE:** This requires that the target is a PLC runtime or has equivalent ADS protocol support.
   * 
   * Note that if `settings.rawClient` is not used, the symbol version should 
   * already be up-to-date in `metaData.plcSymbolVersion`, as the client
   * subscribes to its changes during connecting.
   * 
   * If `targetOpts` is not used to override target, the state is also
   * saved to the `metaData.plcSymbolVersion`.
   *
   * @example
   * ```js
   * try {
   *  const symbolVersion = await client.readPlcSymbolVersion();
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
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
   * Subscribes to value change notifications (ADS notifications) by a variable path,
   * such as `GVL_Test.ExampleStruct`.
   * 
   * Provided callback is called with the latest value of the symbol when the value changes or when
   * enough time has passed (depending on settings).
   * 
   * Check also `subscribe()` instead, this is just a wrapper for it.
   * 
   * **NOTE:** This requires that the target is a PLC runtime or has equivalent ADS protocol support.
   * 
   * @example
   * ```js
   * //Checks if value has changed every 100ms
   * //Callback is called only when the value has changed
   * await client.subscribeValue(
   *  'GVL_Test.ExampleStruct.',
   *  (data, subscription) => {
   *   console.log(`Value of ${subscription.symbol.name} has changed: ${data.value}`);
   *  },
   *  100
   * );
   * ```
   * 
   * @param path Variable path in the PLC  (such as `GVL_Test.ExampleStruct`)
   * @param callback Callback function to call when a new value is received (`(data, subscription) => {}`)
   * @param cycleTime Cycle time for subscription (default: `200 ms`)
   * 
   * - If `sendOnChange` is `true` (default), PLC checks if value has changed with `cycleTime` interval. 
   * If the value has changed, the PLC sends the value and the callback is called.
   * - If `sendOnChange` is `false`, PLC constantly sends the value with `cycleTime` interval
   * and the callback is called.
   * 
   * @param sendOnChange Send a new value only when the value has changed (default: `true`)
   * 
   * - If `true` (default), the PLC checks the value for changes every `cycleTime` milliseconds. If the value has changed, PLC sends the new value and the callback is called.
   * - If `false`, the PLC sends the value cyclically every `cycleTime` milliseconds (and the callback is called)
   * 
   * NOTE: When subscribing, the value is always sent once.
   * 
   * @param maxDelay How long the PLC waits before sending the value at maximum? (default: `0` ms --> maximum delay is off)
   * 
   * If the value is not changing, the first notification with the active value after subscribing is sent after `maxDelay`.
   * 
   * If the value is changing, the PLC sends one or more notifications every `maxDelay`. 
   * 
   * So if `cycleTime` is 100 ms, `maxDelay` is 1000 ms and value changes every 100 ms, the PLC sends 10 notifications every 1000 ms.
   * This can be useful for throttling.
   * 
   * @param targetOpts Optional target settings that override values in `settings`. If used, caching
   * is disabled -> possible performance impact.
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   * 
   * @template T In Typescript, the data type of the value, for example `subscribeValue<number>(...)` or `subscribeValue<ST_TypedStruct>(...)`. (default: `any`)
   * 
   */
  public subscribeValue<T = any>(path: string, callback: SubscriptionCallback<T>, cycleTime?: number, sendOnChange?: boolean, maxDelay?: number, targetOpts: Partial<AmsAddress> = {}): Promise<ActiveSubscription<T>> {
    if (!this.connection.connected) {
      throw new ClientError(`subscribeValue(): Client is not connected. Use connect() to connect to the target first.`);
    }

    try {
      this.debug(`subscribeValue(): Subscribing to ${path}`);

      return this.subscribe<T>({
        target: path,
        callback,
        cycleTime,
        sendOnChange,
        maxDelay
      }, targetOpts);

    } catch (err) {
      this.debug(`subscribeValue(): Subscribing to ${path} failed: %o`, err);
      throw new ClientError(`subscribeValue(): Subscribing to ${path} failed`, err);
    }
  }

  /**
   * Subscribes to raw value change notifications (ADS notifications) by a raw ADS address (index group, index offset and data length).
   * 
   * Provided callback is called with the latest value when the value changes or when
   * enough time has passed (depending on settings).
   *
   * Check also `subscribe()` instead, this is just a wrapper for it.
   * 
   * **NOTE:** This requires that the target is a PLC runtime or has equivalent ADS protocol support.
   *
   * @example
   * ```js
   * //Checks if value has changed every 100ms
   * //Callback is called only when the value has changed
   * await client.subscribeRaw(16448, 414816, 2, (data, subscription) => {
   *   console.log(`Value has changed: ${data.value.toString('hex')}`);
   *  }, 100);
   * ```
   * 
   * @param indexGroup Index group (address) of the data to subscribe to
   * @param indexOffset Index offset (address) of the data to subscribe to
   * @param size Data length (bytes)
   * @param callback Callback function to call when a new value is received (`(data, subscription) => {}`)
   * @param cycleTime Cycle time for subscription (default: `200 ms`)
   * 
   * - If `sendOnChange` is `true` (default), PLC checks if value has changed with `cycleTime` interval. 
   * If the value has changed, the PLC sends the value and the callback is called.
   * - If `sendOnChange` is `false`, PLC constantly sends the value with `cycleTime` interval
   * and the callback is called.
   * 
   * @param sendOnChange Send a new value only when the value has changed (default: `true`)
   * 
   * - If `true` (default), the PLC checks the value for changes every `cycleTime` milliseconds. If the value has changed, PLC sends the new value and the callback is called.
   * - If `false`, the PLC sends the value cyclically every `cycleTime` milliseconds (and the callback is called)
   * 
   * NOTE: When subscribing, the value is always sent once.
   * 
   * @param maxDelay How long the PLC waits before sending the value at maximum? (default: `0` ms --> maximum delay is off)
   * 
   * If the value is not changing, the first notification with the active value after subscribing is sent after `maxDelay`.
   * 
   * If the value is changing, the PLC sends one or more notifications every `maxDelay`. 
   * 
   * So if `cycleTime` is 100 ms, `maxDelay` is 1000 ms and value changes every 100 ms, the PLC sends 10 notifications every 1000 ms.
   * This can be useful for throttling.
   * 
   * @param targetOpts Optional target settings that override values in `settings`. If used, caching
   * is disabled -> possible performance impact.
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   */
  public subscribeRaw(indexGroup: number, indexOffset: number, size: number, callback: SubscriptionCallback<Buffer>, cycleTime?: number, sendOnChange?: boolean, maxDelay?: number, targetOpts: Partial<AmsAddress> = {}): Promise<ActiveSubscription<Buffer>> {
    if (!this.connection.connected) {
      throw new ClientError(`subscribeRaw(): Client is not connected. Use connect() to connect to the target first.`);
    }

    try {
      this.debug(`subscribeRaw(): Subscribing to ${JSON.stringify({ indexGroup, indexOffset, size })}`);

      return this.subscribe<Buffer>({
        target: {
          indexGroup,
          indexOffset,
          size
        },
        callback,
        cycleTime,
        sendOnChange,
        maxDelay
      }, targetOpts);

    } catch (err) {
      this.debug(`subscribeRaw(): Subscribing to ${JSON.stringify({ indexGroup, indexOffset, size })} failed: %o`, err);
      throw new ClientError(`subscribeRaw(): Subscribing to ${JSON.stringify({ indexGroup, indexOffset, size })} failed`, err);
    }
  }

  /**
   * Subscribes to value change notifications (ADS notifications) by variable path 
   * (such as `GVL_Test.ExampleStruct`) or raw ADS address (index group, index offset and data length).
   * 
   * Provided callback is called with the latest value when the value changes or when
   * enough time has passed (depending on settings).
   * 
   * **NOTE:** This requires that the target is a PLC runtime or has equivalent ADS protocol support.
   * 
   * @example
   * ```js
   * //Checks if value has changed every 100ms
   * //Callback is called only when the value has changed
   * await client.subscribe({
   *  target: 'GVL_Test.ExampleStruct',
   *  callback: (data, subscription) => {
   *    console.log(`Value of ${subscription.symbol.name} has changed: ${data.value}`);
   *  },
   *  cycleTime: 100
   * });
   * ```
   * 
   * @example
   * ```js
   * //Checks if value has changed every 100ms
   * //Callback is called only when the value has changed
   * await client.subscribe({
   *  target: {
   *    indexGroup: 16448,
   *    indexOffset: 414816,
   *    size: 2
   *  },
   *  callback: (data, subscription) => {
   *    console.log(`Value has changed: ${data.value}`);
   *  },
   *  cycleTime: 100
   * });
   * ```
   * 
   * @param options Subscription options
   * @param targetOpts Optional target settings that override values in `settings`. If used, caching
   * is disabled -> possible performance impact.
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   * 
   * @template T In Typescript, the data type of the value, for example `subscribe<number>(...)` or `subscribe<ST_TypedStruct>(...)`. If the target is a raw address, use `subscribe<Buffer>`. (default: `any`)
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
   * Unsubscribes the subscription (deletes ADS notification).
   * 
   * PLC stops checking the value for changes (if configured so) and no longer sends new values.
   * 
   * @example
   * ```js
   * const sub = await client.subscribe(...);
   * 
   * //later
   * try {
   *  await client.unsubscribe(sub);
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param subscription Subscription to unsubscribe (created previously by subscribing for example using `subscribe()`)
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   */
  public async unsubscribe(subscription: ActiveSubscription): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`unsubscribe(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`unsubscribe(): Unsubscribing %o`, subscription);

    try {
      await this.deleteNotificationHandle(subscription.notificationHandle, subscription.remoteAddress)

      const address = ADS.amsAddressToString(subscription.remoteAddress);

      if (this.activeSubscriptions[address]) {
        delete this.activeSubscriptions[address][subscription.notificationHandle];
      }

      this.debug(`unsubscribe(): Subscription with handle ${subscription.notificationHandle} unsubscribed from ${address}`);

    } catch (err) {
      this.debug(`unsubscribe(): Unsubscribing failed: %o`, err);
      throw new ClientError(`unsubscribe(): Unsubscribing failed`, err);
    }
  }

  /**
   * Delete ADS notification on PLC.
   */
   private async deleteNotificationHandle(notificationHandle: number, targetAmsAddress: AmsAddress): Promise<AdsDeleteNotificationResponse> {
    //Allocating bytes for request
    const data = Buffer.alloc(4);
    let pos = 0;

    //0..3 Notification handle
    data.writeUInt32LE(notificationHandle, pos);
    pos += 4;

    const res = await this.sendAdsCommand<AdsDeleteNotificationResponse>({
      adsCommand: ADS.ADS_COMMAND.DeleteNotification,
      targetAmsNetId: targetAmsAddress.amsNetId,
      targetAdsPort: targetAmsAddress.adsPort,
      payload: data
    });

    return res.ads;
  }

  /**
   * Unsubscribes all active subscription (deletes all ADS notifications).
   * 
   * PLC stops checking the values for changes (if configured so) and no longer sends new values.
   * 
   * @example
   * ```js
   * const sub = await client.subscribe(...);
   * const sub2 = await client.subscribe(...);
   * 
   * //later
   * try {
   *  await client.unsubscribeAll();
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
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
   * Reads target device information.
   * 
   * This is the ADS protocol `ReadDeviceInfo` command.
   * 
   * If `targetOpts` is not used to override target, the state is also
   * saved to the `metaData.deviceInfo`.
   * 
   * @example
   * ```js
   * try {
   *  const deviceInfo = await client.readDeviceInfo();
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
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
        this.metaData.plcDeviceInfo = res.ads.payload;
      }

      return res.ads.payload;

    } catch (err) {
      this.debug(`readDeviceInfo(): Reading device info failed: %o`, err);
      throw new ClientError(`readDeviceInfo():Reading device info failed`, err);
    }
  }

  /**
   * Reads target PLC runtime upload information.
   * 
   * Upload information includes information about target PLC runtime data types and symbols (count and total data length).
   * 
   * **NOTE:** This requires that the target is a PLC runtime or has equivalent ADS protocol support.
   * 
   * If `targetOpts` is not used to override target, the upload info is also
   * saved to the `metaData.plcUploadInfo`.
   * 
   * @example
   * ```js
   * try {
   *  const uploadInfo = await client.readPlcUploadInfo();
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   */
  public async readPlcUploadInfo(targetOpts: Partial<AmsAddress> = {}): Promise<AdsUploadInfo> {
    if (!this.connection.connected) {
      throw new ClientError(`readPlcUploadInfo(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`readPlcUploadInfo(): Reading upload info`);

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
        this.metaData.plcUploadInfo = uploadInfo;
      }

      this.debug(`readPlcUploadInfo(): Upload info read and parsed for ${ADS.amsAddressToString(res.ams.sourceAmsAddress)}`);
      return uploadInfo;

    } catch (err) {
      this.debug(`readPlcUploadInfo(): Reading upload info failed: %o`, err);
      throw new ClientError(`readPlcUploadInfo(): Reading upload info failed`, err);
    }
  }

  /**
   * Returns all symbols from the target PLC runtime.
   * 
   * **NOTE:** This requires that the target is a PLC runtime or has equivalent ADS protocol support.
   * 
   * **WARNING:** The returned object might be VERY large!
   * 
   * If `targetOpts` is not used to override target, the upload info is also
   * saved to the `metaData.symbols`.
   * 
   * @example
   * ```js
   * try {
   *  const symbols = await client.getSymbols();
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   * 
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async getSymbols(targetOpts: Partial<AmsAddress> = {}): Promise<AdsSymbolContainer> {
    if (!this.connection.connected) {
      throw new ClientError(`getSymbols(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`getSymbols(): Reading symbol`);

    let uploadInfo: AdsUploadInfo;
    try {
      this.debug(`getSymbols(): Updating upload info (needed for symbol reading)`)

      uploadInfo = await this.readPlcUploadInfo(targetOpts);

    } catch (err) {
      this.debug(`getSymbols(): Reading upload info failed`)
      throw new ClientError(`getSymbols(): Reading upload info failed`, err);
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

      const symbols = {} as AdsSymbolContainer;

      let response = res.ads.payload;
      let count = 0;

      while (response.byteLength > 0) {
        let pos = 0;

        //0..3 Symbol bytelength
        const len = response.readUInt32LE(pos);
        pos += 4;

        const symbol = this.parseAdsResponseSymbol(response.subarray(pos, pos + len));
        symbols[symbol.name.trim().toLowerCase()] = symbol;

        response = response.subarray(len);
        count++;
      }

      if (!targetOpts.adsPort && !targetOpts.amsNetId) {
        //Target is not overridden -> save to metadata
        this.metaData.plcSymbols = symbols;
        this.metaData.allPlcSymbolsCached = true;
        this.debug(`getSymbols(): All symbols read and cached (symbol count ${count})`);

      } else {
        this.debug(`getSymbols(): All symbols read (symbol count ${count})`);
      }

      return symbols;

    } catch (err) {
      this.debug(`getSymbols(): Reading symbols failed: %o`, err);
      throw new ClientError(`getSymbols(): Reading symbols failed`, err);
    }
  }

  /**
   * Caches all symbols from the target PLC runtime.
   * 
   * Can be used to pre-cache all symbols to speed up communication.
   * Caching is only available for the original target configured in the settings. 
   * 
   * If caching is disabled using `settings.disableCaching` nothing is done.
   * 
   * Calling `getSymbols()` without `targetOpts` has the same effect.
   * 
   * **NOTE:** This requires that the target is a PLC runtime or has equivalent ADS protocol support.
   * 
   * @example
   * ```js
   * try {
   *  await client.cacheSymbols();
   *  //client.metaData.plcSymbols now has all PLC runtime symbols
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   */
  public async cacheSymbols() {
    if (this.settings.disableCaching) {
      this.debug(`cacheSymbols(): Caching is disabled, doing nothing`);
      return;
    }

    this.debug(`cacheSymbols(): Caching all symbols`);

    try {
      await this.getSymbols();

      this.debug(`cacheSymbols(): All symbols are now cached`);

    } catch (err) {
      this.debug(`cacheSymbols(): Caching symbols failed: %o`, err);
      throw new ClientError(`cacheSymbols(): Caching symbols failed`, err);
    }
  }

  /**
   * Returns all target PLC runtime data types.
   * 
   * If `targetOpts` is not used to override target and `settings.disableCaching` is not set, 
   * the results are cached.
   * 
   * **WARNING: The returned object might be VERY large!**
   * 
   * As default, the results do not have subitems constructred, unlike when calling `getDataType()`.
   * To get all data types with full constructions (children and their children and so on), set parameter
   * `fullTypes` to `true`. **WARNING: This heavily increases the result size and CPU usage.**
   * 
   * @example
   * ```js
   * try {
   *  const dataTypes = await client.getDataTypes();
   *  //with built data types
   *  const fullDataTypes = await client.getDataTypes(true);
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param buildFullTypes If `true`, all data types are built to include all subitems (and their subitems and so on)
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   */
  public async getDataTypes(buildFullTypes?: boolean, targetOpts: Partial<AmsAddress> = {}): Promise<AdsDataTypeContainer> {
    if (!this.connection.connected) {
      throw new ClientError(`getDataTypes(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`getDataTypes(): Reading data types`);

    let uploadInfo: AdsUploadInfo;
    try {
      this.debug(`getDataTypes(): Updating upload info (needed for data type reading)`)

      uploadInfo = await this.readPlcUploadInfo(targetOpts);

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
        this.metaData.plcDataTypes = { ...dataTypes };
        this.metaData.allPlcDataTypesCached = true;
        this.debug(`getDataTypes(): All data types read and cached (data type count ${count})`);

      } else {
        this.debug(`getDataTypes(): All symbols read (data type count ${count})`);
      }

      if (buildFullTypes) {
        this.debug(`getDataTypes(): Building all data types (buildFullTypes set)`);

        for (let dataType in dataTypes) {
          dataTypes[dataType] = await this.getDataType(dataType);
        }
      }

      return dataTypes;

    } catch (err) {
      this.debug(`getDataTypes(): Reading data type information failed: %o`, err);
      throw new ClientError(`getDataTypes(): Reading data type information failed`, err);
    }
  }

  /**
   * Caches all data types from the target PLC runtime.
   * 
   * Can be used to pre-cache all data types to speed up communication.
   * Caching is only available for the original target configured in the settings.  
   * 
   * If caching is disabled using `settings.disableCaching` nothing is done.
   * 
   * Calling `getDataTypes()` without `targetOpts` has the same effect.
   * 
   * **NOTE:** This requires that the target is a PLC runtime or has equivalent ADS protocol support.
   * 
   * @example
   * ```js
   * try {
   *  await client.cacheDataTypes();
   *  //client.metaData.plcDataTypes now has all PLC runtime data types
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
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
   * Reads raw data from the target system by a raw ADS address (index group, index offset and data length).
   * 
   * This is the ADS protocol `Read` command.
   *  
   * @example
   * ```js
   * try {
   *  const data = await client.readRaw(16448, 414816, 2);
   *  console.log(data); //<Buffer ff 7f>
   * 
   *  const converted = await client.convertFromRaw(data, 'INT');
   *  console.log(converted); //32767
   * 
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param indexGroup Index group (address) of the data to read
   * @param indexOffset Index offset (address) of the data to read
   * @param size Data length to read (bytes)
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
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
   * Writes raw data to the target system by a raw ADS address (index group, index offset and data length).
   * 
   * This is the ADS protocol `Write` command.
   * 
   * @example
   * ```js
   * try {
   *  const data = await client.convertToRaw(32767, 'INT');
   *  console.log(data); //<Buffer ff 7f>
   * 
   *  await client.writeRaw(16448, 414816, data);
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   *  
   * @param indexGroup Index group (address) of the data to write to
   * @param indexOffset Index offset (address) of the data to write to
   * @param value Data to write
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
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
   * Sends multiple `readRaw()` commands in one ADS packet.
   * 
   * Reads raw data from the target system by a raw ADS addresses (index group, index offset and data length).
   * Results are returned for each command separately - see {@link ReadRawMultiResult} for details. 
   * 
   * Uses ADS sum command under the hood (better and faster performance). 
   * See [Beckhoff Information System](https://infosys.beckhoff.com/english.php?content=../content/1033/tc3_adsdll2/9007199379576075.html&id=9180083787138954512) for more info.
   * 
   * @example
   * ```js
   * try {
   *  const results = await client.readRawMulti([
   *    {
   *      indexGroup: 16448,
   *      indexOffset: 414816,
   *      size: 2
   *    },
   *    {
   *      indexGroup: 16448,
   *      indexOffset: 414900,
   *      size: 128
   *    }
   *  ]);
   *  
   *  if(results[0].success) {
   *    console.log(`First result: ${results[0].value}`); //First result: <Buffer ff 7f>
   *  } else {
   *    console.log(`First read command failed: ${results[0].errorStr}`);
   *  }
   * 
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param commands Array of read commands
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   */
  public async readRawMulti(commands: ReadRawMultiCommand[], targetOpts: Partial<AmsAddress> = {}): Promise<ReadRawMultiResult[]> {
    if (!this.connection.connected) {
      throw new ClientError(`readRawMulti(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`readRawMulti(): Sending ${commands.length} read commands`);
    const totalSize = commands.reduce((total, command) => total + command.size, 0);

    //Allocating bytes for request
    const data = Buffer.alloc(16 + commands.length * 12);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SumCommandRead, pos);
    pos += 4;

    //4..7 IndexOffset - Number of commands
    data.writeUInt32LE(commands.length, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(commands.length * 4 + totalSize, pos);
    pos += 4;

    //12..15 Write data length
    data.writeUInt32LE(commands.length * 12, pos);
    pos += 4;

    //16..n commands
    commands.forEach(command => {
      //0..3 IndexGroup
      data.writeUInt32LE(command.indexGroup, pos);
      pos += 4;

      //4..7 IndexOffset
      data.writeUInt32LE(command.indexOffset, pos);
      pos += 4;

      //8..11 Data size
      data.writeUInt32LE(command.size, pos);
      pos += 4;
    });

    try {
      const res = await this.sendAdsCommand<AdsReadWriteResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadWrite,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      this.debug(`readRawMulti(): Sending ${commands.length} read commands done (${res.ads.length} bytes)`);

      let pos = 0;
      const response = res.ads.payload;
      let results: ReadRawMultiResult[] = [];

      //Error codes of each target
      for (let i = 0; i < commands.length; i++) {
        const errorCode = response.readUInt32LE(pos);
        pos += 4;

        const result: ReadRawMultiResult = {
          command: commands[i],
          success: errorCode === 0,
          error: errorCode > 0,
          errorCode,
          errorStr: ADS.ADS_ERROR[errorCode],
          value: undefined
        };

        results.push(result);
      };

      //Value for each target
      for (let i = 0; i < commands.length; i++) {
        if (!results[i].error) {
          results[i].value = response.subarray(pos, pos + commands[i].size);
        }

        pos += commands[i].size;
      }

      return results;

    } catch (err) {
      this.debug(`readRawMulti(): Sending ${commands.length} read commands failed: %o`, err);
      throw new ClientError(`readRawMulti(): Sending ${commands.length} read commands failed`, err);
    }
  }

  /**
   * Sends multiple `writeRaw()` commands in one ADS packet.
   * 
   * Writes raw data to the target system by a raw ADS addresses (index group and index offset).
   * Results are returned for each command separately - see {@link WriteRawMultiResult} for details.
   * 
   * Uses ADS sum command under the hood (better and faster performance). 
   * See [Beckhoff Information System](https://infosys.beckhoff.com/english.php?content=../content/1033/tc3_adsdll2/9007199379576075.html&id=9180083787138954512) for more info.
   *  
   * @example
   * ```js
   * try {
   *  const data1 = await client.convertToRaw(32767, 'INT');
   *  console.log(data1); //<Buffer ff 7f>
   * 
   *  const data2 = Buffer.alloc(128); //example
   * 
   *  const results = await client.writeRawMulti([
   *    {
   *      indexGroup: 16448,
   *      indexOffset: 414816,
   *      value: data1
   *    },
   *    {
   *      indexGroup: 16448,
   *      indexOffset: 414900,
   *      value: data2
   *    }
   *  ]);
   *  
   *  if(results[0].success) {
   *    console.log(`First write command successful`); 
   *  } else {
   *    console.log(`First write command failed: ${results[0].errorStr}`);
   *  }
   * 
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param commands Array of write commands
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   */
  public async writeRawMulti(commands: WriteRawMultiCommand[], targetOpts: Partial<AmsAddress> = {}): Promise<WriteRawMultiResult[]> {
    if (!this.connection.connected) {
      throw new ClientError(`writeRawMulti(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`writeRawMulti(): Sending ${commands.length} write commands`);
    const totalSize = commands.reduce((total, command) => total + (command.size ?? command.value.byteLength), 0);

    //Allocating bytes for request
    const data = Buffer.alloc(16 + commands.length * 12 + totalSize);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SumCommandWrite, pos);
    pos += 4;

    //4..7 IndexOffset - Number of commands
    data.writeUInt32LE(commands.length, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(commands.length * 4, pos);
    pos += 4;

    //12..15 Write data length
    data.writeUInt32LE(commands.length * 12 + totalSize, pos);
    pos += 4;

    //16..n commands
    commands.forEach(command => {
      //0..3 IndexGroup
      data.writeUInt32LE(command.indexGroup, pos);
      pos += 4;

      //4..7 IndexOffset
      data.writeUInt32LE(command.indexOffset, pos);
      pos += 4;

      //8..11 Data size
      data.writeUInt32LE(command.size ?? command.value.byteLength, pos);
      pos += 4;
    });

    //values
    commands.forEach(command => {
      command.value.copy(data, pos, 0, command.size ?? command.value.byteLength);
      pos += command.size ?? command.value.byteLength;
    });

    try {
      const res = await this.sendAdsCommand<AdsReadWriteResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadWrite,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      this.debug(`writeRawMulti(): Sending ${commands.length} write commands done`);

      let pos = 0;
      let results: WriteRawMultiResult[] = [];

      //Error codes of each target
      for (let i = 0; i < commands.length; i++) {
        const errorCode = res.ads.payload.readUInt32LE(pos);
        pos += 4;

        const result: WriteRawMultiResult = {
          command: commands[i],
          success: errorCode === 0,
          error: errorCode > 0,
          errorCode,
          errorStr: ADS.ADS_ERROR[errorCode]
        };

        results.push(result);
      };

      return results;

    } catch (err) {
      this.debug(`writeRawMulti(): Sending ${commands.length} write commands failed: %o`, err);
      throw new ClientError(`writeRawMulti(): Sending ${commands.length} write commands failed`, err);
    }
  }

  /**
   * Reads raw data from the target system by variable path (such as `GVL_Test.ExampleStruct`).
   * 
   * Supports also reading `POINTER` and `REFERENCE` values (see example).
   * 
   * This uses the ADS `READ_SYMVAL_BYNAME` under the hood, so only one
   * round-trip is needed.
   *  
   * @example
   * ```js
   * try {
   *  const data = await client.readRawByPath('GVL_Read.StandardTypes.INT_');
   *  console.log(data); //<Buffer ff 7f>
   * 
   *  const converted = await client.convertFromRaw(data, 'INT');
   *  console.log(converted); //32767
   * 
   * //Reading a POINTER value (Note the dereference operator ^)
   * const ptrValue = await client.readRawByPath('GVL_Read.ComplexTypes.POINTER_^');
   * 
   * //Reading a REFERENCE value
   * const refValue = await client.readRawByPath('GVL_Read.ComplexTypes.REFERENCE_');
   * 
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param path Variable path in the PLC to read (such as `GVL_Test.ExampleStruct`)
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
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
   * Writes raw data to the target system by variable path (such as `GVL_Test.ExampleStruct`).
   * 
   * Supports also writing `POINTER` and `REFERENCE` values (see example).
   * 
   * NOTE: Unlike with {@link readRawByPath}(), this command uses multiple ADS requests for the operation.
   *  
   *  
   * @example
   * ```js
   * try {
   *  const data = await client.convertToRaw(32767, 'INT');
   *  console.log(data); //<Buffer ff 7f>
   * 
   *  await client.writeRawByPath('GVL_Write.StandardTypes.INT_', data);
   * 
   * //Writing a POINTER value (Note the dereference operator ^)
   * const ptrValue = ...
   * await client.writeRawByPath('GVL_Read.ComplexTypes.POINTER_^', ptrValue);
   * 
   * //Writing a REFERENCE value
   * const refValue = ...
   * await client.readRawByPath('GVL_Read.ComplexTypes.REFERENCE_');
   * 
   * } catch (err) {
   *  console.log("Error:", err);
   * }
   * ```
   * 
   * @param path Variable path in the PLC to write (such as `GVL_Test.ExampleStruct`)
   * @param value Data to write
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @throws Throws an error if sending the command fails or if the target responds with an error.
   */
  public async writeRawByPath(path: string, value: Buffer, targetOpts: Partial<AmsAddress> = {}): Promise<void> {
    if (!this.connection.connected) {
      throw new ClientError(`writeRawByPath(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`writeRawByPath(): Writing raw data to ${path} (${value.byteLength} bytes)`);

    try {
      let handle = null;

      try {
        handle = await this.createVariableHandle(path, targetOpts);
        await this.writeRawByHandle(handle, value, targetOpts);

      } finally {
        if (handle) {
          await this.deleteVariableHandle(handle, targetOpts);
        }
      }

      this.debug(`writeRawByPath(): Writing raw data to ${path} done (${value.byteLength} bytes)`);

    } catch (err) {
      this.debug(`writeRawByPath(): Writing raw data to ${path} failed: %o`, err);
      throw new ClientError(`writeRawByPath(): Writing raw data to ${path} failed`, err);
    }
  }

  /**
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Writes raw data to the target and reads the result as raw data
   * 
   * Uses `ADS ReadWrite` command
   * 
   * @param indexGroup Address index group
   * @param indexOffset Address index offset
   * @param size How many bytes to read
   * @param writeData Data to write
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async readWriteRaw(indexGroup: number, indexOffset: number, size: number, writeData: Buffer, targetOpts: Partial<AmsAddress> = {}): Promise<Buffer> {
    if (!this.connection.connected) {
      throw new ClientError(`readWriteRaw(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`readWriteRaw(): Sending ReadWrite command (${JSON.stringify({ indexGroup, indexOffset, size })} with ${writeData.byteLength} bytes of data`);

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
    data.writeUInt32LE(size, pos);
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

      this.debug(`readWriteRaw(): ReadWrite command (${JSON.stringify({ indexGroup, indexOffset, size })}) done - returned ${res.ads.payload.byteLength} bytes`);

      return res.ads.payload;

    } catch (err) {
      this.debug(`readWriteRaw(): ReadWrite command (${JSON.stringify({ indexGroup, indexOffset, size })}) failed: %o`, err);
      throw new ClientError(`readWriteRaw(): ReadWrite command (${JSON.stringify({ indexGroup, indexOffset, size })}) failed`, err);
    }
  }

  /**
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Sends multiple readWriteRaw() commands in one ADS packet
   * 
   * Uses ADS sum command under the hood (better performance)
   * 
   * @param commands Array of read write commands
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async readWriteRawMulti(commands: ReadWriteRawMultiCommand[], targetOpts: Partial<AmsAddress> = {}): Promise<ReadWriteRawMultiResult[]> {
    if (!this.connection.connected) {
      throw new ClientError(`readWriteRawMulti(): Client is not connected. Use connect() to connect to the target first.`);
    }
    this.debug(`readWriteRawMulti(): Sending ${commands.length} ReadWrite commands`);
    const totalSize = commands.reduce((total, command) => total + command.size, 0);
    const totalWriteSize = commands.reduce((total, command) => total + command.writeData.byteLength, 0);

    //Allocating bytes for request
    const data = Buffer.alloc(16 + commands.length * 16 + totalWriteSize);
    let pos = 0;

    //0..3 IndexGroup 
    data.writeUInt32LE(ADS.ADS_RESERVED_INDEX_GROUPS.SumCommandReadWrite, pos);
    pos += 4;

    //4..7 IndexOffset - Number of commands
    data.writeUInt32LE(commands.length, pos);
    pos += 4;

    //8..11 Read data length
    data.writeUInt32LE(commands.length * 8 + totalSize, pos);
    pos += 4;

    //12..15 Write data length
    data.writeUInt32LE(commands.length * 16 + totalWriteSize, pos);
    pos += 4;

    //16..n commands
    commands.forEach(command => {
      //0..3 IndexGroup
      data.writeUInt32LE(command.indexGroup, pos);
      pos += 4;

      //4..7 IndexOffset
      data.writeUInt32LE(command.indexOffset, pos);
      pos += 4;

      //8..11 Read data length
      data.writeUInt32LE(command.size, pos);
      pos += 4;

      //12..15 Write data length
      data.writeUInt32LE(command.writeData.byteLength, pos);
      pos += 4
    });

    //data
    commands.forEach(command => {
      command.writeData.copy(data, pos);
      pos += command.writeData.byteLength;
    });

    try {
      const res = await this.sendAdsCommand<AdsReadWriteResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadWrite,
        targetAmsNetId: targetOpts.amsNetId,
        targetAdsPort: targetOpts.adsPort,
        payload: data
      });

      this.debug(`readWriteRawMulti(): Sending ${commands.length} ReadWrite commands done`);

      let pos = 0;
      const response = res.ads.payload;
      let results: ReadWriteRawMultiResult[] = [];
      let sizes: number[] = [];

      //Error codes of each target
      for (let i = 0; i < commands.length; i++) {
        const errorCode = response.readUInt32LE(pos);
        pos += 4;

        //Data length
        sizes.push(response.readUInt32LE(pos));
        pos += 4;

        const result: ReadWriteRawMultiResult = {
          command: commands[i],
          success: errorCode === 0,
          error: errorCode > 0,
          errorCode,
          errorStr: ADS.ADS_ERROR[errorCode],
          data: undefined
        };

        results.push(result);
      };

      //Response data for each command
      for (let i = 0; i < commands.length; i++) {
        let startPos = pos;

        if (results[i].success) {
          results[i].data = Buffer.alloc(sizes[i]);
          response.copy(results[i].data!, 0, pos, pos + sizes[i]);
        }

        pos = startPos + sizes[i];
      }

      return results;

    } catch (err) {
      this.debug(`readWriteRawMulti(): Sending ${commands.length} ReadWrite commands failed: %o`, err);
      throw new ClientError(`readWriteRawMulti(): Sending ${commands.length} ReadWrite commands failed`, err);
    }
  }

  /**
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Reads a value by a variable path (such as `GVL_Test.ExampleStruct`) and converts the value to a Javascript object.
   * 
   * Returns the converted value, the raw value, the data type and the symbol.
   * 
   * @param path Variable path in the PLC to read (such as `GVL_Test.ExampleStruct`)
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @template T In Typescript, the data type of the value, for example `readValue<number>(...)` or `readValue<ST_TypedStruct>(...)` (default: `any`)
   */
  public async readValue<T = any>(path: string, targetOpts: Partial<AmsAddress> = {}): Promise<ReadValueResult<T>> {
    if (!this.connection.connected) {
      throw new ClientError(`readValue(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`readValue(): Reading value from ${path}`);

    //Getting the symbol
    let symbol: AdsSymbol;
    try {
      this.debugD(`readValue(): Getting symbol for ${path}`);
      symbol = await this.getSymbol(path, targetOpts);

    } catch (err) {
      this.debug(`readValue(): Getting symbol for ${path} failed: %o`, err);
      throw new ClientError(`readValue(): Getting symbol for ${path} failed`, err);
    }

    //Getting the symbol data type
    let dataType: AdsDataType;
    try {
      this.debugD(`readValue(): Getting data type for ${path}`);
      dataType = await this.buildDataType(symbol.type, targetOpts);

    } catch (err) {
      this.debug(`readValue(): Getting data type for ${path} failed: %o`, err);
      throw new ClientError(`readValue(): Getting data type for ${path} failed`, err);
    }

    //Reading value by the symbol address
    let rawValue: Buffer;
    try {
      this.debugD(`readValue(): Reading raw value from ${path}`);
      rawValue = await this.readRaw(symbol.indexGroup, symbol.indexOffset, symbol.size, targetOpts);

    } catch (err) {
      this.debug(`readValue(): Reading raw value from ${path} failed: %o`, err);
      throw new ClientError(`readValue(): Reading raw value from ${path} failed`, err);
    }

    //Converting byte data to javascript object
    let value: T;
    try {
      this.debugD(`readValue(): Converting raw value to object for ${path}`);
      value = await this.convertBufferToObject<T>(rawValue, dataType);

    } catch (err) {
      this.debug(`readValue(): Converting raw value to object for ${path} failed: %o`, err);
      throw new ClientError(`readValue(): Converting raw value to object for ${path} failed`, err);
    }

    this.debug(`readValue(): Reading value from ${path} done`);

    return {
      value,
      rawValue,
      dataType,
      symbol
    };
  }

  /**
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Reads a value by a symbol and converts the value to a Javascript object.
   * 
   * Returns the converted value, the raw value, the data type and the symbol.
   * 
   * @param symbol Symbol (acquired using `getSymbol()`)
   * @param targetOpts Optional target settings that override values in `settings`
   * 
   * @template T In Typescript, the data type of the value, for example `readValueBySymbol<number>(...)` or `readValueBySymbol<ST_TypedStruct>(...)` (default: `any`)
   */
  public async readValueBySymbol<T = any>(symbol: AdsSymbol, targetOpts: Partial<AmsAddress> = {}): Promise<ReadValueResult<T>> {
    if (!this.connection.connected) {
      throw new ClientError(`readValueBySymbol(): Client is not connected. Use connect() to connect to the target first.`);
    }

    return this.readValue<T>(symbol.name, targetOpts);
  }

  /**
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Writes a value by a variable path (such as `GVL_Test.ExampleStruct`). Converts the value from a Javascript object to a raw value.
   * 
   * Returns the converted value, the raw value, the data type and the symbol.
   * 
   * **NOTE:** Do not use `autoFill` for `UNION` types, it works without errors but the result isn't probably the desired one
   * 
   * @param path Variable path in the PLC to read (such as `GVL_Test.ExampleStruct`)
   * @param value Value to write
   * @param targetOpts Optional target settings that override values in `settings`
   * @param autoFill If true and data type is a container (`STRUCT`, `FUNCTION_BLOCK` etc.), missing properties are automatically **set to default values** (usually `0` or `''`) 
   * 
   * @template T In Typescript, the data type of the value, for example `writeValue<number>(...)` or `writeValue<ST_TypedStruct>(...)`
   */
  public async writeValue<T = any>(path: string, value: T, autoFill: boolean = false, targetOpts: Partial<AmsAddress> = {}): Promise<WriteValueResult<T>> {
    if (!this.connection.connected) {
      throw new ClientError(`writeValue(): Client is not connected. Use connect() to connect to the target first.`);
    }

    this.debug(`writeValue(): Writing value to ${path}`);

    //Getting the symbol
    let symbol: AdsSymbol;
    try {
      this.debugD(`writeValue(): Getting symbol for ${path}`);
      symbol = await this.getSymbol(path, targetOpts);

    } catch (err) {
      this.debug(`writeValue(): Getting symbol for ${path} failed: %o`, err);
      throw new ClientError(`writeValue(): Getting symbol for ${path} failed`, err);
    }

    //Getting the symbol data type
    let dataType: AdsDataType;
    try {
      this.debugD(`writeValue(): Getting data type for ${path}`);
      dataType = await this.buildDataType(symbol.type, targetOpts);

    } catch (err) {
      this.debug(`writeValue(): Getting data type for ${path} failed: %o`, err);
      throw new ClientError(`writeValue(): Getting data type for ${path} failed`, err);
    }

    //Creating raw data from object
    let rawValue: Buffer;
    try {
      let res = this.convertObjectToBuffer(value, dataType);

      if (res.missingProperty && autoFill) {
        //Some fields are missing and autoFill is used -> try to auto fill missing values
        this.debug(`writeValue(): Autofilling missing fields with active values`);

        this.debugD(`writeValue(): Reading active value`);
        const valueNow = await this.readValue(path, targetOpts);

        this.debugD(`writeValue(): Merging objects (adding missing fields)`);
        value = this.deepMergeObjects(false, valueNow.value, value);

        //Try conversion again - should work now
        res = this.convertObjectToBuffer(value, dataType);

        if (res.missingProperty) {
          //This shouldn't really happen
          //However, if it happened, the merge isn't working as it should
          throw new ClientError(`writeValue(): Converting object to raw value for ${path} failed. The object is missing key/value for "${res.missingProperty}". NOTE: autoFill failed - please report an issue at GitHub`);
        }

      } else if (res.missingProperty) {
        //Some fields are missing and no autoFill -> failed
        throw new ClientError(`writeValue(): Converting object to raw value for ${path} failed. The object is missing key/value for "${res.missingProperty}". Hint: Use autoFill parameter to add missing fields automatically`);
      }

      //We are here -> success!
      rawValue = res.rawValue;

    } catch (err) {
      //We can pass our own errors to keep the message on top
      if (err instanceof ClientError) {
        throw err;
      }

      this.debug(`writeValue(): Converting object to raw value for ${path} failed: %o`, err);
      throw new ClientError(`writeValue(): Converting object to raw value for ${path} failed`, err);
    }

    //Writing value by the symbol address
    try {
      this.debugD(`writeValue(): Writing raw value to ${path}`);
      await this.writeRaw(symbol.indexGroup, symbol.indexOffset, rawValue, targetOpts);

    } catch (err) {
      this.debug(`writeValue(): Writing raw value to ${path} failed: %o`, err);
      throw new ClientError(`writeValue(): Writing raw value to ${path} failed`, err);
    }

    this.debug(`writeValue(): Writing value to ${path} done`);

    return {
      value,
      rawValue,
      dataType,
      symbol
    };
  }

  /**
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Writes a value by symbol. Converts the value from a Javascript object to a raw value.
   * 
   * Returns the converted value, the raw value, the data type and the symbol.
   * 
   * **NOTE:** Do not use `autoFill` for `UNION` types, it works without errors but the result isn't probably the desired one
   * 
   * @param symbol Symbol (acquired using `getSymbol()`)
   * @param value Value to write
   * @param targetOpts Optional target settings that override values in `settings`
   * @param autoFill If true and data type is a container (`STRUCT`, `FUNCTION_BLOCK` etc.), missing properties are automatically **set to default values** (usually `0` or `''`) 
   * 
   * @template T In Typescript, the data type of the value, for example `writeValue<number>(...)` or `writeValue<ST_TypedStruct>(...)`
   */
  public async writeValueBySymbol<T = any>(symbol: AdsSymbol, value: T, autoFill: boolean = false, targetOpts: Partial<AmsAddress> = {}): Promise<WriteValueResult<T>> {
    if (!this.connection.connected) {
      throw new ClientError(`writeValue(): Client is not connected. Use connect() to connect to the target first.`);
    }

    return this.writeValue<T>(symbol.name, value, autoFill, targetOpts);
  }

  /**
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Returns a default (empty) Javascript object representing provided PLC data type.
   * 
   * @param dataType Data type name in the PLC as string (such as `ST_Struct`) or `AdsDataType` object 
   * @param targetOpts Optional target settings that override values in `settings` 
   * 
   * @template T Typescript data type of the PLC data, for example `readValue<number>(...)` or `readValue<ST_TypedStruct>(...)`
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
   * **TODO - DOCUMENTATION ONGOING**
   * 
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
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Converts a Javascript object to raw byte data.
   * 
   * **NOTE:** Do not use `autoFill` for `UNION` types, it works without errors but the result isn't probably the desired one
   * 
   * @param value Javascript object that represents the `dataType` in target system
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
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Creates a variable handle for a PLC symbol by given variable path
   * 
   * Variable value can be accessed by using the handle with `readRawByHandle()` and `writeRawByHandle()`
   * 
   * @param path Full variable path in the PLC (such as `GVL_Test.ExampleStruct`)
   * @param targetOpts Optional target settings that override values in `settings` (**NOTE:** If used, no caching is available -> possible performance impact)
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
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Sends multiple createVariableHandle() commands in one ADS packet
   * 
   * Creates a variable handle for a PLC symbol by given variable path
   * 
   * Variable value can be accessed by using the handle with `readRawByHandle()` and `writeRawByHandle()`
   * 
   * Uses ADS sum command under the hood (better perfomance)
   * 
   * @param paths Array of full variable paths in the PLC (such as `GVL_Test.ExampleStruct`)
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async createVariableHandleMulti(paths: string[], targetOpts: Partial<AmsAddress> = {}): Promise<CreateVariableHandleMultiResult[]> {
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
      let results: CreateVariableHandleMultiResult[] = [];
      let sizes: number[] = [];

      //Error codes of each target
      for (let i = 0; i < paths.length; i++) {
        const errorCode = response.readUInt32LE(pos);
        pos += 4;

        //Data length
        sizes.push(response.readUInt32LE(pos));
        pos += 4;

        const result: CreateVariableHandleMultiResult = {
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
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Deletes a variable handle that was previously created using `createVariableHandle()`
   * 
   * @param handle Variable handle to delete
   * @param targetOpts Optional target settings that override values in `settings` (**NOTE:** If used, no caching is available -> possible performance impact)
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
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Sends multiple deleteVariableHandle() commands in one ADS packet
   * 
   * Deletes a variable handle that was previously created using `createVariableHandle()`
   * 
   * Uses ADS sum command under the hood (better performance)
   * 
   * @param handles Array of variable handles to delete
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async deleteVariableHandleMulti(handles: (VariableHandle | number)[], targetOpts: Partial<AmsAddress> = {}): Promise<DeleteVariableHandleMultiResult[]> {
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
      let results: DeleteVariableHandleMultiResult[] = [];

      //Error codes of each target
      for (let i = 0; i < handles.length; i++) {
        const errorCode = res.ads.payload.readUInt32LE(pos);
        pos += 4;

        const result: DeleteVariableHandleMultiResult = {
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
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Reads raw byte data from the target system by previously created variable handle
   * 
   * @param handle Variable handle
   * @param size Optional data length to read (bytes) - as default, size in handle is used if available. Uses 0xFFFFFFFF as fallback.
   * @param targetOpts Optional target settings that override values in `settings` (**NOTE:** If used, no caching is available -> possible performance impact)
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
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Writes raw byte data to the target system by previously created variable handle
   * 
   * @param handle Variable handle
   * @param value Data to write
   * @param targetOpts Optional target settings that override values in `settings` (**NOTE:** If used, no caching is available -> possible performance impact)
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
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Reads raw data by symbol
   * 
   * @param symbol Symbol (acquired using `getSymbol()`)
   * @param targetOpts Optional target settings that override values in `settings` (**NOTE:** If used, no caching is available -> possible performance impact)
   */
  public async readRawBySymbol(symbol: AdsSymbol, targetOpts: Partial<AmsAddress> = {}): Promise<Buffer> {
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
   * **TODO - DOCUMENTATION ONGOING**
   * 
   * Writes raw data by symbol
   * 
   * @param symbol Symbol (acquired using `getSymbol()`)
   * @param value Data to write
   * @param targetOpts Optional target settings that override values in `settings`
   */
  public async writeRawBySymbol(symbol: AdsSymbol, value: Buffer, targetOpts: Partial<AmsAddress> = {}): Promise<void> {
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
   * **TODO - DOCUMENTATION ONGOING**
   * 
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
      //Getting the symbol
      let symbol: AdsSymbol;
      try {
        this.debugD(`invokeRpcMethod(): Getting symbol for ${path}`);
        symbol = await this.getSymbol(path, targetOpts);

      } catch (err) {
        this.debug(`invokeRpcMethod(): Getting symbol for ${path} failed: %o`, err);
        throw new ClientError(`invokeRpcMethod(): Getting symbol for ${path} failed`, err);
      }

      //Getting the symbol data type
      let dataType: AdsDataType;
      try {
        this.debugD(`invokeRpcMethod(): Getting data type for ${path}`);
        dataType = await this.buildDataType(symbol.type, targetOpts);

      } catch (err) {
        this.debug(`invokeRpcMethod(): Getting data type for ${path} failed: %o`, err);
        throw new ClientError(`invokeRpcMethod(): Getting data type for ${path} failed`, err);
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
