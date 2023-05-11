import EventEmitter from "events";
import type { ActiveAdsRequestContainer, ActiveSubscription, ActiveSubscriptionContainer, AdsClientConnection, AdsClientSettings, AdsCommandToSend, ConnectionMetaData, SubscriptionCallback, SubscriptionData, SubscriptionSettings, SubscriptionTarget, SymbolInfo, TargetOptions, TimerObject } from "./types/ads-client-types";
import { AdsAddNotificationResponse, AdsArrayDataEntry, AdsData, AdsDataType, AdsDeleteNotificationResponse, AdsDeviceInfo, AdsNotification, AdsNotificationResponse, AdsNotificationSample, AdsNotificationStamp, AdsRawInfo, AdsReadDeviceInfoResponse, AdsReadResponse, AdsReadStateResponse, AdsReadWriteResponse, AdsRequest, AdsResponse, AdsState, AdsSymbolInfo, AdsSymbolInfoArrayDataEntry, AdsSymbolInfoAttributeEntry, AdsWriteControlResponse, AdsWriteResponse, AmsHeader, AmsPortRegisteredData, AmsRouterState, AmsRouterStateData, AmsTcpHeader, AmsTcpPacket, BaseAdsResponse, EmptyAdsResponse, UnknownAdsResponse } from "./types/ads-protocol-types";

import {
  Socket,
  SocketConnectOpts
} from "net"
import Debug from "debug"
import { ClientException } from "./client-exception";
import * as ADS from './ads-commons'
import Long from "long";
export * as ADS from './ads-commons';

export class Client extends EventEmitter {
  protected debug = Debug("ads-client");
  protected debugD = Debug(`ads-client:details`);
  protected debugIO = Debug(`ads-client:raw-data`);


  /**
   * Active debug level
   */
  private debugLevel_ = 0;

  /** Active debug level (read-only)
   * 
   *  - 0 = no debugging
   *  - 1 = Extended exception stack trace
   *  - 2 = basic debugging (same as $env:DEBUG='ads-server')
   *  - 3 = detailed debugging (same as $env:DEBUG='ads-server,ads-server:details')
   *  - 4 = full debugging (same as $env:DEBUG='ads-server,ads-server:details,ads-server:raw-data')
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
    disableSymbolVersionMonitoring: false,
    hideConsoleWarnings: false,
    checkStateInterval: 1000,
    connectionDownDelay: 5000,
    allowHalfOpen: false,
    bareClient: false
  } as Required<AdsClientSettings>;

  /**
   * Active connection information
   */
  public connection: AdsClientConnection = {
    connected: false,
    isLocal: false
  };

  /**
   * Callback used for AMS/TCp commands (like port register)
   */
  protected amsTcpCallback?: ((packet: AmsTcpPacket) => void);

  /**
   * Local router state (if available and known)
   */
  public routerState?: AmsRouterState = undefined;

  /**
   * Connection metadata
   */
  private metaData: ConnectionMetaData = {
    deviceInfo: undefined,
    systemManagerState: undefined,
    plcRuntimeState: undefined,
    uploadInfo: undefined,
    symbolVersion: undefined,
    allSymbolsCached: false,
    symbols: {},
    allDataTypesCached: false,
    dataTypes: {},
    routerState: undefined
  };

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
   * Timer ID and handle of system manager state poller timer 
   */
  private systemManagerStatePoller: TimerObject = { id: 0 };

  /**
   * Timer handle for port register timeout
   */
  private portRegisterTimeoutTimer?: NodeJS.Timeout = undefined;

  /**
   * Active subsriptions created using subscribe()
   */
  private activeSubscriptions: ActiveSubscriptionContainer = {};

  /**
   * Active ADS requests that are waiting for responses
   */
  private activeAdsRequests: ActiveAdsRequestContainer = {};

  /**
   * Next invoke ID to be used for ADS requests
   */
  private nextInvokeId: number = 0;

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
   * Connects to the target AMS router and registers a new ADS port
   */
  public connect(): Promise<Required<AdsClientConnection>> {
    return this.connectToTarget();
  }

  /**
   * Sets debugging using debug package on/off. 
   * Another way for environment variable DEBUG:
   *  - 0 = no debugging
   *  - 1 = Extended exception stack trace
   *  - 2 = basic debugging (same as $env:DEBUG='ads-server')
   *  - 3 = detailed debugging (same as $env:DEBUG='ads-server,ads-server:details')
   *  - 4 = full debugging (same as $env:DEBUG='ads-server,ads-server:details,ads-server:raw-data')
   * 
   * @param level 0 = none, 1 = extended stack traces, 2 = basic, 3 = detailed, 4 = detailed + raw data
   */
  setDebugging(level: number): void {
    this.debug(`setDebugging(): Setting debug level to ${level}`);

    this.debugLevel_ = level;

    this.debug.enabled = level >= 2;
    this.debugD.enabled = level >= 3;
    this.debugIO.enabled = level >= 4;

    this.debug(`setDebugging(): Debug level set to ${level}`);
  }

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
        return reject(new ClientException(this, "connectToTarget()", `Required setting "targetAmsNetId" is missing`));
      }
      if (this.settings.targetAdsPort === undefined) {
        return reject(new ClientException(this, "connectToTarget()", `Required setting "targetAdsPort" is missing`));
      }

      if (this.socket) {
        this.debug(`connectToTarget(): Socket is already assigned (need to disconnect first)`);
        return reject(new ClientException(this, "connectToTarget()", "Connection is already opened. Close the connection first by calling disconnect()"));
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

        reject(new ClientException(this, "connectToTarget()", `Connecting to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed (socket error ${err.errno})`, err));
      });

      //Listening close event during connection
      socket.once("close", hadError => {
        this.debug(`connectToTarget(): Socket closed by remote, connection failed`);

        //Remove all events from socket
        socket.removeAllListeners();
        this.socket = undefined;

        //Reset connection flag
        this.connection.connected = false;

        reject(new ClientException(this, "connectToTarget()", `Connecting to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed - socket closed by remote (hadError: ${hadError})`))
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
          return reject(new ClientException(this, "connectToTarget()", `Connecting to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed - socket ended by remote (is the ADS port "${this.settings.localAdsPort}" already in use?)`));
        }
        reject(new ClientException(this, "connectToTarget()", `Connecting to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed - socket ended by remote`));
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

        reject(new ClientException(this, "connectToTarget()", `Connecting to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed - No response from target in ${this.settings.timeoutDelay} ms (timeout)`));
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
            isLocal: this.settings.targetAmsNetId === ADS.LOOPBACK_AMS_NET_ID || this.settings.targetAmsNetId === amsPortData.localAmsNetId,
            localAmsNetId: amsPortData.localAmsNetId,
            localAdsPort: amsPortData.localAdsPort
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

          return reject(new ClientException(this, "connectToTarget()", `Registering ADS port failed`, err));
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
            //await this.setupPlcConnection();
          } catch (err) {
            return reject(new ClientException(this, 'connectToTarget()', `Connection failed - failed to set PLC connection (see setting "bareClient"): ${(err as ClientException).message}`, err));
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

        reject(new ClientException(this, "connectToTarget()", `Opening socket connection to ${this.settings.routerAddress}:${this.settings.routerTcpPort} failed`, err));
      }
    })
  }

  /**
   * Unregisters ADS port from router (if it was registered) and disconnects
   *
   * @param [forceDisconnect] - If true, the connection is dropped immediately (default: false)
   * @param [isReconnecting] - If true, call is made during reconnecting (default: false)
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

      //If forced, then just destroy the socket
      if (forceDisconnect) {
        this.connection = {
          connected: false
        };

        this.socket?.removeAllListeners();
        this.socket?.destroy();
        this.socket = undefined;

        this.emit("disconnect");
        return resolve();
      }

      try {
        await this.unregisterAdsPort();

        //Done
        this.connection = {
          connected: false
        };

        this.socket?.removeAllListeners();
        this.socket?.destroy();
        this.socket = undefined;

        this.debug(`disconnectFromTarget(): Connection closed successfully`);
        this.emit("disconnect");
        return resolve();

      } catch (err) {
        //Force socket close
        this.socket?.removeAllListeners();
        this.socket?.destroy();
        this.socket = undefined;

        this.connection = {
          connected: false
        };

        this.debug(`disconnectFromTarget(): Connection closing failed, connection was forced to close`);
        this.emit("disconnect");
        return reject(new ClientException(this, "disconnect()", `Disconnected with errors: ${(err as Error).message}`, err));
      }
    })
  }

  /**
   * Disconnects and reconnects again
   *
   * @param [forceDisconnect] - If true, the connection is dropped immediately (default = false)
   * @param [isReconnecting] - If true, call is made during reconnecting
   */
  private reconnectToTarget(forceDisconnect = false, isReconnecting = false) {
    return new Promise<AdsClientConnection>(async (resolve, reject) => {
      if (this.socket) {
        this.debug(`reconnectToTarget(): Trying to disconnect`);
        await this.disconnectFromTarget(forceDisconnect, isReconnecting).catch();
      }
      this.debug(`reconnectToTarget(): Trying to connect...`);
      return this.connectToTarget(true)
        .then(res => {
          this.debug(`reconnectToTarget(): Connected!`);
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
              localAmsNetId: this.settings.localAmsNetId,
              localAdsPort: this.settings.localAdsPort
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

        this.debug(`registerAdsPort(): ADS port registered, assigned AMS address is ${data.localAmsNetId}:${data.localAdsPort}`);
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
        return reject(new ClientException(this, 'registerAdsPort()', `Timeout - no response in ${this.settings.timeoutDelay} ms`, adsError));

      }, this.settings.timeoutDelay);

      const errorHandler = () => {
        this.portRegisterTimeoutTimer && clearTimeout(this.portRegisterTimeoutTimer);
        this.debugD("registerAdsPort(): Socket connection error during port registeration");
        reject(new ClientException(this, 'registerAdsPort()', "Socket connection error during port registeration"))
      };

      this.socket?.once('error', errorHandler);

      try {
        await this.socketWrite(packet);

      } catch (err) {
        this.socket?.off('error', errorHandler);
        this.portRegisterTimeoutTimer && clearTimeout(this.portRegisterTimeoutTimer);
        return reject(new ClientException(this, 'registerAdsPort()', "Error - Writing data to the socket failed", err));
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
   * Configures internals for PLC connection
   */
  private async setupPlcConnection() {

    //Read device status and subscribe to its changes
    await this.readPlcRuntimeState();
    await subcribeToPlcRuntimeStateChanges;

    //Read device info
    await this.readDeviceInfo();
    await this.readUploadInfo();

    //Read symbol version and subscribe to its changes
    if (!this.settings.disableSymbolVersionMonitoring) await this.readSymbolVersion();
    if (!this.settings.disableSymbolVersionMonitoring) await _subscribeToSymbolVersionChanges.call(this);

    //Cache data 
    if (this.settings.readAndCacheSymbols || this.metaData.allSymbolsCached) await this.readAndCacheSymbols();
    if (this.settings.readAndCacheDataTypes || this.metaData.allDataTypesCached) await this.readAndCacheDataTypes();
  }

  /**
   * Event listener for socket errors
   */
  private onSocketError(err: Error) {
    !this.settings.hideConsoleWarnings && console.log(`WARNING: Socket connection to target closes to an an error, disconnecting: ${JSON.stringify(err)}`);
    this.onConnectionLost(true);
  }

  /**
   * Called when connection to the remote is lost. Handles automatic reconnecting (if enabled)
   * 
   * @param socketFailure - If true, connection was lost due to a socket/tcp problem
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
   * 
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
          targetAmsNetId: command.targetAmsNetId ?? this.settings.targetAmsNetId,
          targetAdsPort: command.targetAdsPort ?? this.settings.targetAdsPort,
          sourceAmsNetId: this.connection.localAmsNetId!,
          sourceAdsPort: this.connection.localAdsPort!,
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

      if (packet.ams.targetAmsNetId === 'localhost') {
        packet.ams.targetAmsNetId = '127.0.0.1.1.1';
      }

      this.debugD(`sendAdsCommand(): Sending an ads command ${packet.ams.adsCommandStr} (${packet.ams.dataLength} bytes): %o`, packet);

      //Creating a full AMS/TCP request
      try {
        var request = this.createAmsTcpRequest(packet);
      } catch (err) {
        return reject(new ClientException(this, 'sendAdsCommand()', "Creating AmsTcpRequest failed", err));
      }

      //Registering callback for response handling
      this.activeAdsRequests[packet.ams.invokeId] = {
        responseCallback: (res: AmsTcpPacket<AdsResponse>) => {

          this.debugD(`sendAdsCommand(): Response received for command "${packet.ams.adsCommandStr}" with invokeId ${packet.ams.invokeId}`);

          //Callback is no longer needed, delete it
          delete this.activeAdsRequests[packet.ams.invokeId];

          if (res.ams.error) {
            return reject(new ClientException(this, '_sendAdsCommand()', 'Response with AMS error received', res));
          } else if (res.ads.error) {
            return reject(new ClientException(this, '_sendAdsCommand()', 'Response with ADS error received', res));
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
          return reject(new ClientException(this, 'sendAdsCommand()', `Timeout for command ${packet.ams.adsCommandStr} with invokeId ${packet.ams.invokeId} - No response in ${this.settings.timeoutDelay} ms`, adsError));

        }, this.settings.timeoutDelay)
      };

      //Write the data 
      try {
        this.socketWrite(request);
      } catch (err) {
        return reject(new ClientException(this, 'sendAdsCommand()', `Error - Socket is not available (failed to send data)`, err));
      }
    })
  }

  /**
   * Creates an AMS/TCP request from given packet object
   * 
   * @param packet Object containing the full AMS/TCP packet
   */
  protected createAmsTcpRequest(packet: AmsTcpPacket<AdsRequest>): Buffer {
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
  protected createAmsHeader(packet: AmsTcpPacket): Buffer {
    //Allocating bytes for AMS header
    const header = Buffer.alloc(ADS.AMS_HEADER_LENGTH);
    let pos = 0;

    //0..5 Target AmsNetId
    Buffer.from(ADS.amsNetIdStrToByteArray(packet.ams.targetAmsNetId)).copy(header, 0);
    pos += ADS.AMS_NET_ID_LENGTH;

    //6..8 Target ADS port
    header.writeUInt16LE(packet.ams.targetAdsPort, pos);
    pos += 2;

    //8..13 Source AmsNetId
    Buffer.from(ADS.amsNetIdStrToByteArray(packet.ams.sourceAmsNetId)).copy(header, pos);
    pos += ADS.AMS_NET_ID_LENGTH;

    //14..15 Source ADS port
    header.writeUInt16LE(packet.ams.sourceAdsPort, pos);
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
  protected createAmsTcpHeader(packet: AmsTcpPacket, amsHeader: Buffer): Buffer {
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
  protected parseAmsTcpPacket(data: Buffer) {
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
   * @param data Buffer that contains data for a single full AMS/TCP packet
   * @returns Object `{amsTcp, data}`, where amsTcp is the parsed header and data is rest of the data
   */
  protected parseAmsTcpHeader(data: Buffer): { amsTcp: AmsTcpHeader, data: Buffer } {
    this.debugD(`parseAmsTcpHeader(): Starting to parse AMS/TCP header`)

    let pos = 0;
    const amsTcp = {} as AmsTcpHeader;

    //0..1 AMS command (header flag)
    amsTcp.command = data.readUInt16LE(pos);
    amsTcp.commandStr = ADS.AMS_HEADER_FLAG.toString(amsTcp.command);
    pos += 2;

    //2..5 Data length
    amsTcp.dataLength = data.readUInt32LE(pos);
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

    return { amsTcp, data }
  }

  /**
   * Parses an AMS header from given buffer
   * 
   * @param data Buffer that contains data for a single AMS packet (without AMS/TCP header)
   * @returns Object `{ams, data}`, where ams is the parsed AMS header and data is rest of the data
   */
  protected parseAmsHeader(data: Buffer): { ams: AmsHeader, data: Buffer } {
    this.debugD("parseAmsHeader(): Starting to parse AMS header");

    let pos = 0;
    const ams = {} as AmsHeader;

    if (data.byteLength < ADS.AMS_HEADER_LENGTH) {
      this.debugD("parseAmsHeader(): No AMS header found");
      return { ams, data };
    }

    //0..5 Target AMSNetId
    ams.targetAmsNetId = ADS.byteArrayToAmsNetIdStr(data.subarray(pos, pos + ADS.AMS_NET_ID_LENGTH));
    pos += ADS.AMS_NET_ID_LENGTH;

    //6..8 Target ads port
    ams.targetAdsPort = data.readUInt16LE(pos);
    pos += 2;

    //8..13 Source AMSNetId
    ams.sourceAmsNetId = ADS.byteArrayToAmsNetIdStr(data.subarray(pos, pos + ADS.AMS_NET_ID_LENGTH));
    pos += ADS.AMS_NET_ID_LENGTH;

    //14..15 Source ads port
    ams.sourceAdsPort = data.readUInt16LE(pos);
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
 * @returns Object that contains the parsed ADS data
 */
  protected parseAdsResponse(packet: AmsTcpPacket, data: Buffer): AdsResponse {
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

        ads.payload = {} as AdsNotificationHandle;

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
  protected onAmsTcpPacketReceived(packet: AmsTcpPacket<AdsResponse>) {
    this.debugD(`onAmsTcpPacketReceived(): AMS packet received with command ${packet.amsTcp.command}`);

    switch (packet.amsTcp.command) {
      //ADS command
      case ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_AMS_CMD: ;
        packet.amsTcp.commandStr = 'ADS command';

        if (packet.ams.targetAmsNetId === this.connection.localAmsNetId || packet.ams.targetAmsNetId === ADS.LOOPBACK_AMS_NET_ID) {
          this.onAdsCommandReceived(packet);
        } else {
          this.debug(`Received ADS command but it's not for us (target: ${packet.ams.targetAmsNetId}:${packet.ams.targetAdsPort})`);
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
            localAmsNetId: ADS.byteArrayToAmsNetIdStr(data.subarray(0, ADS.AMS_NET_ID_LENGTH)),
            //5..6 Client ADS port
            localAdsPort: data.readUInt16LE(ADS.AMS_NET_ID_LENGTH)
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
   * @param socket Socket connection to use for responding
   */
  protected onAdsCommandReceived(packet: AmsTcpPacket<AdsResponse>) {
    this.debugD(`onAdsCommandReceived(): ADS command received (command: ${packet.ams.adsCommand})`);

    switch (packet.ams.adsCommand) {
      //ADS notification
      case ADS.ADS_COMMAND.Notification:
        //Try to find the callback with received notification handles
        for (let stamp of (packet.ads as AdsNotificationResponse).payload.stamps) {
          //Stamp has n samples inside
          for (let sample of stamp.samples) {
            //Try to find the subscription
            const subscription = this.activeSubscriptions[sample.notificationHandle];

            if (subscription) {
              this.debug(`onAdsCommandReceived(): Notification received for handle "${sample.notificationHandle}" (%o)`, subscription.target)

              subscription.parseNotification(sample.payload, stamp.timestamp)
                .then(data => {
                  subscription.latestData = data;

                  try {
                    subscription.userCallback && subscription.userCallback(subscription.latestData, subscription);
                  } catch (err) {
                    this.debug(`onAdsCommandReceived(): Calling user callback for notification failed: %o`, err);
                  }
                })
                .catch(err => {
                  this.debug(`onAdsCommandReceived(): Ads notification received but parsing Javascript object failed: %o`, err);
                  this.emit('ads-client-error', new ClientException(this, `onAdsCommandReceived`, `Ads notification received but parsing data to Javascript object failed. Subscription: ${JSON.stringify(subscription)}`, err, subscription));
                });
            } else {
              this.debugD(`onAdsCommandReceived(): Ads notification received with unknown notificationHandle "${sample.notificationHandle}". Use unsubscribe() to save resources`);
              this.emit('ads-client-error', new ClientException(this, `onAdsCommandReceived`, `Ads notification received with unknown notificationHandle (${sample.notificationHandle}). Use unsubscribe() to save resources.`));
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
          this.emit('ads-client-error', new ClientException(this, `onAdsCommandReceived`, `Ads command received with unknown invokeId "${packet.ams.invokeId}"`, packet));
        }
        break;
    }
  }

  /**
   * Called when local AMS router status has changed (Router notification received)
   * For example router state changes when local TwinCAT switches from Config to Run state and vice-versa
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
      //We should stop polling system manager, it will be reinitialized later
      this.clearTimer(this.systemManagerStatePoller);

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
   * @returns Parsed ADS notification
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
   * @returns 
   */
  private async addSubscription(target: SubscriptionTarget, callback: SubscriptionCallback, settings: SubscriptionSettings, opts: TargetOptions = {}) {
    this.debugD(`addSubscription(): Subscribing to %o with settings %o`, target, settings);

    let targetAddress = {} as AdsRawInfo;
    let symbolInfo: AdsSymbolInfo | undefined = undefined;

    if (typeof target === "string") {
      try {
        symbolInfo = await this.getSymbolInfo(target);

        //Read symbol datatype to cache -> It's cached when we start getting notifications
        //Otherwise with large structs and fast cycle times there might be some issues
        await this.getDataType(symbolInfo.type);

        targetAddress = {
          indexGroup: symbolInfo.indexGroup,
          indexOffset: symbolInfo.indexOffset,
          size: symbolInfo.size
        };

      } catch (err) {
        throw new ClientException(this, 'addSubscription()', `Getting symbol and data type info for ${target} failed`, err);
      }
    } else {
      if (target.indexGroup === undefined || target.indexOffset === undefined) {
        throw new ClientException(this, 'addSubscription()', `Target is missing indexGroup or indexOffset`);

      } else if (target.size === undefined) {
        target.size = 0xFFFFFFFF;
      }
      targetAddress = target;
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
    data.writeUInt32LE(targetAddress.size, pos);
    pos += 4;

    //12..15 Transmission mode
    data.writeUInt32LE(settings.transmissionMode, pos);
    pos += 4

    //16..19 Maximum delay (ms) - When subscribing, a notification is sent after this time even if no changes 
    data.writeUInt32LE(settings.maximumDelay * 10000, pos);
    pos += 4;

    //20..23 Cycle time (ms) - How often the PLC checks for value changes (minimum value: Task 0 cycle time)
    data.writeUInt32LE(settings.cycleTime * 10000, pos);
    pos += 4;

    //24..40 reserved

    try {
      const res = await this.sendAdsCommand<AdsAddNotificationResponse>({
        adsCommand: ADS.ADS_COMMAND.AddNotification,
        targetAmsNetId: opts.targetAmsNetId,
        targetAdsPort: opts.targetAdsPort,
        payload: data
      });

      this.debugD(`addSubscription(): Subscribed to %o`, target);

      const subscription: ActiveSubscription = {
        target: target,
        notificationHandle: res.ads.payload.notificationHandle,
        internal: settings.internal === true,
        symbolInfo: symbolInfo,
        settings: settings,

      };

      this.activeSubscriptions[subscription.notificationHandle] = subscription;

    } catch (err) {
      this.debug(`addSubscription(): Subscribing to %o failed: %o`, target, err);
      throw new ClientException(this, 'addSubscription()', `Subscribing to ${JSON.stringify(target)} failed`, err);

    }
    /*
        //Passing the client to the newSub object so it can access itself by "this"
        let client = this

        //Creating new subscription object
        let newSub = {
          target: target,
          settings: settings,
          callback: callback,
          symbolInfo: symbolInfo,
          notificationHandle: res.ads.payload.notificationHandle,
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


        resolve(newSub)
      })
      .catch((res) => {
      })
  })*/
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

    //Array data
    symbol.arrayData = [];
    for (let i = 0; i < symbol.arrayDimension; i++) {
      const array = {} as AdsSymbolInfoArrayDataEntry;

      array.startIndex = data.readInt32LE(pos);
      pos += 4;

      array.length = data.readUInt32LE(pos);
      pos += 4;

      symbol.arrayData.push(array);
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
        let attr = {} as AdsSymbolInfoAttributeEntry;

        //Name length
        let nameLength = data.readUInt8(pos);
        pos += 1;

        //Value length
        let valueLength = data.readUInt8(pos);
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
    this.debugD(`parseAdsResponseDataType(): Parsing symbol info from data (${data.byteLength} bytes)`);

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

    //Array data
    dataType.arrayData = [];
    for (let i = 0; i < dataType.arrayDimension; i++) {
      const array = {} as AdsArrayDataEntry;

      array.startIndex = data.readInt32LE(pos);
      pos += 4;

      array.length = data.readUInt32LE(pos);
      pos += 4;

      dataType.arrayData.push(array);
    }

/*
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

        //0..3 method length
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

        //24..39 Return type GUID
        method.returnTypeGuid = data.slice(pos, pos + 16).toString('hex')
        pos += 16

        //40..43 Return data type
        method.retunAdsDataType = data.readUInt32LE(pos)
        method.retunAdsDataTypeStr = ADS.ADS_DATA_TYPES.toString(method.retunAdsDataType)
        pos += 4

        //44..47 Flags (AdsDataTypeFlags)
        method.flags = data.readUInt32LE(pos)
        method.flagsStr = ADS.ADS_DATA_TYPE_FLAGS.toStringArray(method.flags)
        pos += 4

        //48..49 Name length
        method.nameLength = data.readUInt16LE(pos)
        pos += 2

        //50..51 Return type length
        method.returnTypeLength = data.readUInt16LE(pos)
        pos += 2

        //52..53 Comment length
        method.commentLength = data.readUInt16LE(pos)
        pos += 2

        //54..55 Parameter count
        method.parameterCount = data.readUInt16LE(pos)
        pos += 2

        //56.... Name
        method.name = _trimPlcString(iconv.decode(data.slice(pos, pos + method.nameLength + 1), 'cp1252'))
        pos += method.nameLength + 1

        //.. Return type
        method.returnType = _trimPlcString(iconv.decode(data.slice(pos, pos + method.returnTypeLength + 1), 'cp1252'))
        pos += method.returnTypeLength + 1

        //.. Comment
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

          //.. Type
          param.type = _trimPlcString(iconv.decode(data.slice(pos, pos + param.typeLength + 1), 'cp1252'))
          pos += param.typeLength + 1

          //.. Comment
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
*/
    return dataType
  }

  /**
   * Builds data type declaration for requested type.
   * Calls itself recursively to build also subtypes
   * 
   * @param name Data type name in the PLC (such as `ST_Struct`)
   * @param opts Optional target settings that override values in `settings` 
   */
  private async buildDataType(name: string, opts: TargetOptions = {}): Promise<AdsDataType> {
    this.debug(`buildDataType(): Building data type for "${name}"`);

    //Is this symbol already cached?
    if (this.metaData.symbols[path.toLowerCase()]) {
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
    pos += path.length;

    try {
      const res = await this.sendAdsCommand<AdsReadWriteResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadWrite,
        targetAmsNetId: opts.targetAmsNetId,
        targetAdsPort: opts.targetAdsPort,
        payload: data
      });

      //Parsing the symbol, first 4 bytes can be skipped (data length)
      const symbol = this.parseAdsResponseSymbolInfo(res.ads.payload.subarray(4));
      this.metaData.symbols[path.toLowerCase()] = symbol;

      this.debug(`getSymbolInfo(): Symbol info read and parsed for "${path}"`);

      return symbol;

    } catch (err) {
      this.debug(`getSymbolInfo(): Reading symbol info for "${path} failed: %o`, err);
      throw new ClientException(this, 'getSymbolInfo()', `Reading symbol info for "${path} failed`, err);
    }
  }

  /**
   * Gets data type declaration for requested type 
   * 
   * @param name Data type name in the PLC (such as `ST_Struct`)
   * @param opts Optional target settings that override values in `settings` 
   */
  public async TEST_getDataTypeDeclaration(name: string, opts: TargetOptions = {}): Promise<AdsDataType> {
    this.debug(`getDataTypeDeclaration(): Data type declaration requested for "${name}"`);

    //Is this data type already cached? Skip check if we have different target
    if (!opts.targetAdsPort && !opts.targetAmsNetId && this.metaData.dataTypes[name.toLowerCase()]) {
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
        targetAmsNetId: opts.targetAmsNetId,
        targetAdsPort: opts.targetAdsPort,
        payload: data
      });

      //Parsing the data type, first 4 bytes can be skipped (data length)
      const dataType = this.parseAdsResponseDataType(res.ads.payload.subarray(4));
      this.metaData.dataTypes[name.toLowerCase()] = dataType;

      this.debug(`getDataTypeDeclaration(): Data type declaration read and parsed for "${name}"`);

      return dataType;

    } catch (err) {
      this.debug(`getDataTypeDeclaration(): Reading data type declaration for "${name} failed: %o`, err);
      throw new ClientException(this, 'getDataTypeDeclaration()', `Reading data type declaration for "${name} failed`, err);
    }
  }

  /**
   * Returns symbol information for given variable path (symbol)
   * 
   * @param path Full variable path in the PLC (such as `GVL_Test.ExampleStruct`)
   * @param opts Optional target settings that override values in `settings` 
   */
  public async getSymbolInfo(path: string, opts: TargetOptions = {}): Promise<AdsSymbolInfo> {
    if (!this.connection.connected) {
      throw new ClientException(this, 'getSymbolInfo()', `Client is not connected. Use connect() to connect to the target first.`);
    }
    path = path.trim();

    this.debug(`getSymbolInfo(): Symbol info requested for "${path}"`);

    //Is this symbol already cached?
    if (this.metaData.symbols[path.toLowerCase()]) {
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
        targetAmsNetId: opts.targetAmsNetId,
        targetAdsPort: opts.targetAdsPort,
        payload: data
      });

      //Parsing the symbol, first 4 bytes can be skipped (data length)
      const symbol = this.parseAdsResponseSymbolInfo(res.ads.payload.subarray(4));
      this.metaData.symbols[path.toLowerCase()] = symbol;

      this.debug(`getSymbolInfo(): Symbol info read and parsed for "${path}"`);

      return symbol;

    } catch (err) {
      this.debug(`getSymbolInfo(): Reading symbol info for "${path} failed: %o`, err);
      throw new ClientException(this, 'getSymbolInfo()', `Reading symbol info for "${path} failed`, err);
    }
  }

  /**
   * Returns data type declaration for given data type
   * 
   * @param name Data type name in the PLC (such as `ST_Struct`)
   * @param opts Optional target settings that override values in `settings` 
   */
  public async getDataType(name: string, opts: TargetOptions = {}): Promise<AdsDataType> {
    if (!this.connection.connected) {
      throw new ClientException(this, 'getDataType()', `Client is not connected. Use connect() to connect to the target first.`);
    }
    name = name.trim();

    this.debug(`getDataType(): Data type requested for "${name}"`);
    const dataType = await this.buildDataType(name, opts);
    this.debug(`getDataType(): Data type read and built for "${name}"`);

    return dataType;
  }

  /**
    * Reads target PLC runtime state
    * Also saves it to the `metaData.plcRuntimeStatus`
    */
  public async readPlcRuntimeState(opts: TargetOptions = {}) {
    if (!this.connection.connected) {
      throw new ClientException(this, 'readPlcRuntimeState()', `Client is not connected. Use connect() to connect to the target first.`);
    }

    try {
      this.debug(`readPlcRuntimeState(): Reading PLC runtime state`);

      const res = await this.sendAdsCommand<AdsReadStateResponse>({
        adsCommand: ADS.ADS_COMMAND.ReadState,
        targetAmsNetId: opts.targetAmsNetId,
        targetAdsPort: opts.targetAdsPort
      });

      this.debug(`readPlcRuntimeState(): Device state read successfully. State is %o`, res.ads.payload);

      if (!opts.targetAdsPort) {
        //Target is not overridden -> save to metadata
        this.metaData.plcRuntimeState = res.ads.payload;
      }

      return res.ads.payload;

    } catch (err) {
      this.debug(`readPlcRuntimeState(): Reading PLC runtime state failed: %o`, err);
      throw new ClientException(this, 'readPlcRuntimeState()', `Reading PLC runtime state failed`, err);
    }
  }

  /**
   * Subscribes to variable value change notifications.
   * Callback is called with latest value when it changes.
   * 
   * @param variableName Variable name in the PLC (full path) - Example: "MAIN.SomeStruct.SomeValue"
   * @param callback - Callback function that is called when new value (notification) is received
   * @param cycleTimeMs - How often (ms) the PLC checks for value changes (default: 10 ms)
   * @param sendOnChange - If true, PLC sends the notification only when value has changed. If false, the value is sent every `cycleTime` milliseconds even when not changed (default: true)
   * @param initialDelayMs - How long the PLC waits before sending the value (default: 0 ms)
   */
  public subscribe(variableName: string, callback: SubscriptionCallback, cycleTimeMs = 10, sendOnChange = true, initialDelayMs = 0) {
    if (!this.connection.connected) {
      throw new ClientException(this, 'subscribe()', `Client is not connected. Use connect() to connect to the target first.`);
    }

    try {
      this.debug(`subscribe(): Subscribing to variable "${variableName}" changes`);

      const res = this.createSubscription(
        variableName,
        callback,
        {
          transmissionMode: (onChange === true ? ADS.ADS_TRANS_MODE.OnChange : ADS.ADS_TRANS_MODE.Cyclic),
          cycleTime: cycleTime,
          maximumDelay: initialDelay
        }
      )
        .then(res => resolve(res))
        .catch(err => reject(new ClientException(this, 'subscribe()', `Subscribing to ${variableName} failed`, err)))
    } catch { }
  }
}
