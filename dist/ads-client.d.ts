/// <reference types="node" />
/// <reference types="node" />
import EventEmitter from "events";
import type { AdsClientConnection, AdsClientSettings } from "./types/ads-client-types";
import { AdsResponse, AmsHeader, AmsRouterState, AmsTcpHeader, AmsTcpPacket } from "./types/ads-protocol-types";
import Debug from "debug";
export declare class AdsClient extends EventEmitter {
    protected debug: Debug.Debugger;
    protected debugD: Debug.Debugger;
    protected debugIO: Debug.Debugger;
    /**
     * Active settings
     */
    settings: AdsClientSettings;
    /**
     * Active connection information
     */
    connection: AdsClientConnection;
    /**
     * Callback used for AMS/TCp commands (like port register)
     */
    protected amsTcpCallback?: ((packet: AmsTcpPacket) => void);
    /**
     * Local router state (if available and known)
     */
    routerState?: AmsRouterState;
    /**
     * Received data buffer
     */
    private receiveBuffer;
    /**
     * Socket instance
     */
    private socket?;
    /**
     * Handler for socket error event
     */
    private socketErrorHandler?;
    /**
     * Handler for socket close event
     */
    private socketConnectionLostHandler?;
    /**
     * Timer ID and handle of reconnection timer
     */
    private reconnectionTimer;
    /**
     * Timer handle for port register timeout
     */
    private portRegisterTimeoutTimer?;
    /**
     * Socket instance
     */
    private activeSubscriptions;
    /**
     * Socket instance
     */
    private activeAdsRequests;
    /**
     * Creates a new ADS client instance.
     *
     * Settings are provided as parameter
     */
    constructor(settings: AdsClientSettings);
    /**
     * Connects to the AMS router and registers ADS port.
     * Starts listening for incoming ADS commands
     *
     * @returns {ServerConnection} Connection info
     */
    connect(): Promise<AdsClientConnection>;
    /**
     * Clears given timer if it's available and increases the id
     * @param timerObject Timer object
     */
    private clearTimer;
    /**
     * Writes given data buffer to the socket
     * @param data Data to write
     */
    private socketWrite;
    /**
     * Connects to the target.
     *
     * @param isReconnecting If true, reconnecting in progress
     */
    private connectToTarget;
    /**
     * Unregisters ADS port from router (if it was registered) and disconnects
     *
     * @param [forceDisconnect] - If true, the connection is dropped immediately (default: false)
     * @param [isReconnecting] - If true, call is made during reconnecting (default: false)
     */
    private disconnectFromTarget;
    /**
     * Disconnects and reconnects again
     *
     * @param [forceDisconnect] - If true, the connection is dropped immediately (default = false)
     * @param [isReconnecting] - If true, call is made during reconnecting
     */
    private reconnectToTarget;
    /**
     * Registers a new ADS port from AMS router
     */
    private registerAdsPort;
    /**
     * Unregisters previously registered ADS port from AMS router.
     * Connection is usually also closed by remote during unregistering
     */
    private unregisterAdsPort;
    /**
     * Event listener for socket errors
     */
    private onSocketError;
    /**
     * Called when connection to the remote is lost. Handles automatic reconnecting (if enabled)
     *
     * @param socketFailure - If true, connection was lost due to a socket/tcp problem
     */
    private onConnectionLost;
    /**
     * Checks received data buffer for full AMS packets. If full packet is found, it is parsed and handled.
     * Calls itself recursively if multiple packets available. Added also setImmediate calls to prevent event loop from blocking
     */
    private handleReceivedData;
    /**
     * Parses an AMS/TCP packet from given buffer and then handles it
     *
     * @param data Buffer that contains data for a single full AMS/TCP packet
     */
    protected parseAmsTcpPacket(data: Buffer): void;
    /**
     * Parses an AMS/TCP header from given buffer
     *
     * @param data Buffer that contains data for a single full AMS/TCP packet
     * @returns Object `{amsTcp, data}`, where amsTcp is the parsed header and data is rest of the data
     */
    protected parseAmsTcpHeader(data: Buffer): {
        amsTcp: AmsTcpHeader;
        data: Buffer;
    };
    /**
     * Parses an AMS header from given buffer
     *
     * @param data Buffer that contains data for a single AMS packet (without AMS/TCP header)
     * @returns Object `{ams, data}`, where ams is the parsed AMS header and data is rest of the data
     */
    protected parseAmsHeader(data: Buffer): {
        ams: AmsHeader;
        data: Buffer;
    };
    /**
   * Parses ADS data from given buffer. Uses `packet.ams` to determine the ADS command.
   *
   * @param data Buffer that contains data for a single ADS packet (without AMS/TCP header and AMS header)
   * @returns Object that contains the parsed ADS data
   */
    protected parseAdsResponse(packet: AmsTcpPacket, data: Buffer): AdsResponse;
    /**
     * Handles the parsed AMS/TCP packet and actions/callbacks etc. related to it.
     *
     * @param packet Fully parsed AMS/TCP packet, includes AMS/TCP header and if available, also AMS header and ADS data
     */
    protected onAmsTcpPacketReceived(packet: AmsTcpPacket): void;
    /**
     * Handles received ADS command
     *
     * @param packet Fully parsed AMS/TCP packet, includes AMS/TCP header, AMS header and ADS data
     * @param socket Socket connection to use for responding
     */
    protected onAdsCommandReceived(packet: AmsTcpPacket): void;
    /**
     * Called when local AMS router status has changed (Router notification received)
     * For example router state changes when local TwinCAT switches from Config to Run state and vice-versa
     *
     * @param state New router state
     */
    private onRouterStateChanged;
}
