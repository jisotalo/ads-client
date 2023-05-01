import EventEmitter from "events";
import type { ActiveAdsRequestContainer, ActiveSubscriptionContainer, AdsClientConnection, AdsClientSettings, TimerObject } from "./types/ads-client-types";
import { AmsPortRegisteredData, AmsRouterState, AmsTcpPacket } from "./types/ads-types";

import {
  Socket,
  SocketConnectOpts
} from "net"
import Debug from "debug"
import { ClientException } from "./client-exception";
import * as ADS from './ads-commons'

export class AdsClient extends EventEmitter {
  protected debug = Debug("ads-client")
  protected debugD = Debug(`ads-client:details`)
  protected debugIO = Debug(`ads-client:raw-data`)

  /**
   * Active settings 
   */
  public settings: AdsClientSettings = {
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
  }

  /**
   * Active connection information
   */
  public connection: AdsClientConnection = {
    connected: false
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
   * Timer handle for port register timeout
   */
  private portRegisterTimeoutTimer?: NodeJS.Timeout = undefined;

  /**
   * Socket instance
   */
  private activeSubscriptions: ActiveSubscriptionContainer = {};

  /**
   * Socket instance
   */
  private activeAdsRequests: ActiveAdsRequestContainer = {};

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
  };

  /**
   * Connects to the AMS router and registers ADS port.
   * Starts listening for incoming ADS commands
   * 
   * @returns {ServerConnection} Connection info
   */
  public connect(): Promise<AdsClientConnection> {
    return this.connectToTarget();
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
    return new Promise<AdsClientConnection>(async (resolve, reject) => {
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
            await setupPlcConnection();
          } catch (err) {
            return reject(new ClientException(this, 'connectToTarget()', `Connection failed - failed to set PLC connection (see setting "bareClient"): ${(err as ClientException).message}`, err));
          }
        }

        //Listening connection lost events
        this.socketConnectionLostHandler = this.onConnectionLost.bind(this, true);
        socket.on("close", this.socketConnectionLostHandler as (hadError: boolean) => void);

        //We are connected to the target
        this.emit("connect", this.connection);
        resolve(this.connection);
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
    const packet = {} as AmsTcpPacket;

    //1. Parse AMS/TCP header
    const parsedAmsTcpHeader = this.parseAmsTcpHeader(data)
    packet.amsTcp = parsedAmsTcpHeader.amsTcp;
    data = parsedAmsTcpHeader.data;

    //2. Parse AMS header (if exists)
    const parsedAmsHeader = this.parseAmsHeader(data);
    packet.ams = parsedAmsHeader.ams;
    data = parsedAmsHeader.data;

    //3. Parse ADS data (if exists)
    packet.ads = packet.ams.error ? { rawData: Buffer.alloc(0) } : this.parseAdsData(packet, data);

    //4. Handle the parsed packet
    this.onAmsTcpPacketReceived(packet);
  }


  /**
   * Handles the parsed AMS/TCP packet and actions/callbacks etc. related to it.
   * 
   * @param packet Fully parsed AMS/TCP packet, includes AMS/TCP header and if available, also AMS header and ADS data
   */
  protected onAmsTcpPacketReceived(packet: AmsTcpPacket) {
    this.debugD(`onAmsTcpPacketReceived(): AMS packet received with command ${packet.amsTcp.command}`);

    switch (packet.amsTcp.command) {
      //ADS command
      case ADS.AMS_HEADER_FLAG.AMS_TCP_PORT_AMS_CMD: ;
        packet.amsTcp.commandStr = 'ADS command';

        if (packet.ams.targetAmsNetId === this.connection.localAmsNetId
          || packet.ams.targetAmsNetId === ADS.LOOPBACK_AMS_NET_ID) {
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
          const data = packet.amsTcp.data as Buffer;

          packet.amsTcp.data = {
            //0..3 Router state
            routerState: data.readUInt32LE(0)
          };

          this.routerStateChangedCallback && this.routerStateChangedCallback(packet);

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
  protected onAdsCommandReceived(packet: AmsTcpPacket, socket: Socket): void {
    this.debugD(`onAdsCommandReceived(): ADS command received (command: ${packet.ams.adsCommand})`);

    switch (packet.ams.adsCommand) {
      //ADS notification
      case ADS.ADS_COMMAND.Notification:
        //Try to find the callback with received notification handles
        packet.ads.data.stamps.forEach(async stamp => {
          stamp.samples.forEach(async sample => {
            if (this.activeSubscriptions[sample.notificationHandle]) {
              const sub = this.activeSubscriptions[sample.notificationHandle];
              this.debug(`onAdsCommandReceived(): Notification received for handle "${sample.notificationHandle}" (%o)`, sub.target)
              try {
                const parsedValue = await sub.dataParser(sample.data);
                parsedValue.timeStamp = stamp.timeStamp;

                sub.callback && sub.callback(parsedValue, sub);

              } catch (err) {
                this.debug(`onAdsCommandReceived(): Ads notification received but parsing Javascript object failed: %o`, err)
                this.emit('ads-client-error', new ClientException(this, `onAdsCommandReceived`, `Ads notification received but parsing data to Javascript object failed. Subscription: ${JSON.stringify(sub)}`, err, sub))
              }

            } else {
              this.debugD(`onAdsCommandReceived(): Ads notification received with unknown notificationHandle "${sample.notificationHandle}". Use unsubscribe() to save resources`);
              this.emit('ads-client-error', new ClientException(this, `onAdsCommandReceived`, `Ads notification received with unknown notificationHandle (${sample.notificationHandle}). Use unsubscribe() to save resources.`));
            }
          })
        });
        break;

      //All other ADS commands
      default:
        //Try to find the callback with received invoke id and call it
        if (this.activeAdsRequests[packet.ams.invokeId]) {
          const adsRequest = this.activeAdsRequests[packet.ams.invokeId];
          clearTimeout(adsRequest.timeoutTimer);
          adsRequest.callback.call(this, packet);

        } else {
          this.debugD(`onAdsCommandReceived(): Ads command received with unknown invokeId "${packet.ams.invokeId}"`);
          this.emit('ads-client-error', new ClientException(this, `onAdsCommandReceived`, `Ads command received with unknown invokeId "${packet.ams.invokeId}"`, packet));
        }
        break;
    }
  }

}
