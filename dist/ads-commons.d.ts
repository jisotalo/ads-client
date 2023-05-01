/**
 * AMS/TCP header length
 */
export declare const AMS_TCP_HEADER_LENGTH = 6;
/**
 * AMS header length
 */
export declare const AMS_HEADER_LENGTH = 32;
/**
 * AmsNetId length
 */
export declare const AMS_NET_ID_LENGTH = 6;
/**
 * ADS index offset length
 */
export declare const ADS_INDEX_OFFSET_LENGTH = 4;
/**
 * ADS index group length
 */
export declare const ADS_INDEX_GROUP_LENGTH = 4;
/**
 * ADS invoke ID maximum value (32bit unsigned integer)
 */
export declare const ADS_INVOKE_ID_MAX_VALUE = 4294967295;
/**
 * Default ADS server TCP port for incoming connections
 */
export declare const ADS_DEFAULT_TCP_PORT = 48898;
/**
 * Loopback (localhost) AmsNetId
 */
export declare const LOOPBACK_AMS_NET_ID = "127.0.0.1.1.1";
/**
 * AMS header flag (AMS command)
 */
export declare const AMS_HEADER_FLAG: {
    /** 0x0000 - Used for ADS commands */
    AMS_TCP_PORT_AMS_CMD: number;
    /** 0x0001 - Port close command*/
    AMS_TCP_PORT_CLOSE: number;
    /** 0x1000 - Port connect command */
    AMS_TCP_PORT_CONNECT: number;
    /** 0x1001 - Router notification */
    AMS_TCP_PORT_ROUTER_NOTE: number;
    /** 0x1002 - Requests local AmsNetId */
    GET_LOCAL_NETID: number;
    /** Returns the corresponding key as string by given value (number) */
    toString: (value: number) => string;
};
/**
 * Reserved/known ADS ports
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
export declare const ADS_RESERVED_PORTS: {
    None: number;
    /**  AMS Router (Port 1) */
    Router: number;
    /**  AMS Debugger (Port 2) */
    Debugger: number;
    /**  The TCom Server. Dpc or passive level. */
    R0_TComServer: number;
    /**  TCom Server Task. RT context. */
    R0_TComServerTask: number;
    /**  TCom Serve Task. Passive level. */
    R0_TComServer_PL: number;
    /**  TwinCAT Debugger */
    R0_TcDebugger: number;
    /**  TwinCAT Debugger Task */
    R0_TcDebuggerTask: number;
    /**  The License Server (Port 30) */
    R0_LicenseServer: number;
    /**  Logger (Port 100) */
    Logger: number;
    /**  Event Logger (Port 110) */
    EventLog: number;
    /**  application for coupler (EK), gateway (EL), etc. */
    DeviceApplication: number;
    /**  Event Logger UM */
    EventLog_UM: number;
    /**  Event Logger RT */
    EventLog_RT: number;
    /**  Event Logger Publisher */
    EventLogPublisher: number;
    /**  R0 Realtime (Port 200) */
    R0_Realtime: number;
    /**  R0 Trace (Port 290) */
    R0_Trace: number;
    /**  R0 IO (Port 300) */
    R0_IO: number;
    /**  NC (R0) (Port 500) */
    R0_NC: number;
    /**  R0 Satzausführung (Port 501) */
    R0_NCSAF: number;
    /**  R0 Satzvorbereitung (Port 511) */
    R0_NCSVB: number;
    /**  Preconfigured Nc2-Nc3-Instance */
    R0_NCINSTANCE: number;
    /**  R0 ISG (Port 550) */
    R0_ISG: number;
    /**  R0 CNC (Port 600) */
    R0_CNC: number;
    /**  R0 Line (Port 700) */
    R0_LINE: number;
    /**  R0 PLC (Port 800) */
    R0_PLC: number;
    /**  Tc2 PLC RuntimeSystem 1 (Port 801) */
    Tc2_Plc1: number;
    /**  Tc2 PLC RuntimeSystem 2 (Port 811) */
    Tc2_Plc2: number;
    /**  Tc2 PLC RuntimeSystem 3 (Port 821) */
    Tc2_Plc3: number;
    /**  Tc2 PLC RuntimeSystem 4 (Port 831) */
    Tc2_Plc4: number;
    /**  R0 RTS (Port 850) */
    R0_RTS: number;
    /**  Tc3 PLC RuntimeSystem 1 (Port 851) */
    Tc3_Plc1: number;
    /**  Tc3 PLC RuntimeSystem 2 (Port 852) */
    Tc3_Plc2: number;
    /**  Tc3 PLC RuntimeSystem 3 (Port 853) */
    Tc3_Plc3: number;
    /**  Tc3 PLC RuntimeSystem 4 (Port 854) */
    Tc3_Plc4: number;
    /**  Tc3 PLC RuntimeSystem 5 (Port 855) */
    Tc3_Plc5: number;
    /**  Camshaft Controller (R0) (Port 900) */
    CamshaftController: number;
    /**  R0 CAM Tool (Port 950) */
    R0_CAMTOOL: number;
    /**  R0 User (Port 2000) */
    R0_USER: number;
    /**  (Port 10000) */
    R3_CTRLPROG: number;
    /**  System Service (AMSPORT_R3_SYSSERV, 10000) */
    SystemService: number;
    /**  (Port 10001) */
    R3_SYSCTRL: number;
    /**  Port 10100 */
    R3_SYSSAMPLER: number;
    /**  Port 10200 */
    R3_TCPRAWCONN: number;
    /**  Port 10201 */
    R3_TCPIPSERVER: number;
    /**  Port 10300 */
    R3_SYSMANAGER: number;
    /**  Port 10400 */
    R3_SMSSERVER: number;
    /**  Port 10500 */
    R3_MODBUSSERVER: number;
    /**  Port 10502 */
    R3_AMSLOGGER: number;
    /**  Port 10600 */
    R3_XMLDATASERVER: number;
    /**  Port 10700 */
    R3_AUTOCONFIG: number;
    /**  Port 10800 */
    R3_PLCCONTROL: number;
    /**  Port 10900 */
    R3_FTPCLIENT: number;
    /**  Port 11000 */
    R3_NCCTRL: number;
    /**  Port 11500 */
    R3_NCINTERPRETER: number;
    /**  Port 11600 */
    R3_GSTINTERPRETER: number;
    /**  Port 12000 */
    R3_STRECKECTRL: number;
    /**  Port 13000 */
    R3_CAMCTRL: number;
    /**  Port 14000 */
    R3_SCOPE: number;
    /**  Port 14100 */
    R3_CONDITIONMON: number;
    /**  Port 15000 */
    R3_SINECH1: number;
    /**  Port 16000 */
    R3_CONTROLNET: number;
    /**  Port 17000 */
    R3_OPCSERVER: number;
    /**  Port 17500 */
    R3_OPCCLIENT: number;
    /**  Port 18000 */
    R3_MAILSERVER: number;
    /**  Port 19000 */
    R3_EL60XX: number;
    /**  Port 19100 */
    R3_MANAGEMENT: number;
    /**  Port 19200 */
    R3_MIELEHOME: number;
    /**  Port 19300 */
    R3_CPLINK3: number;
    /**  Port 19500 */
    R3_VNSERVICE: number;
    /**  Multiuser (Port 19600) */
    R3_MULTIUSER: number;
    /**  Default (AMS router assigns) */
    USEDEFAULT: number;
};
/**
 * ADS command
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
export declare const ADS_COMMAND: {
    /**  Invalid */
    Invalid: number;
    /**  None / Uninitialized */
    None: number;
    /**  ReadDeviceInfo command */
    ReadDeviceInfo: number;
    /**  Read Command */
    Read: number;
    /**  Write Command */
    Write: number;
    /**  ReadState Command */
    ReadState: number;
    /**  WriteControl Command */
    WriteControl: number;
    /**  AddNotification Command */
    AddNotification: number;
    /**  DeleteNotification Command */
    DeleteNotification: number;
    /**  Notification event. */
    Notification: number;
    /**  ReadWrite Command */
    ReadWrite: number;
    /** Returns the corresponding key as string by given value (number) */
    toString: (value: number) => string;
};
/**
 * ADS state flags
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
export declare const ADS_STATE_FLAGS: {
    Response: number;
    /**  (AMSCMDSF_NORETURN) */
    NoReturn: number;
    /**  AdsCommand */
    AdsCommand: number;
    /**  Internal generated cmds (AMSCMDSF_SYSCMD) */
    SysCommand: number;
    /**  High Priority (R0 to R0 checked at task begin, AMSCMDSF_HIGHPRIO) */
    HighPriority: number;
    /**  (cbData um 8 Byte vergrößert, AMSCMDSF_TIMESTAMPADDED) */
    TimeStampAdded: number;
    /**  (UDP instead of TCP, AMSCMDSF_UDP) */
    Udp: number;
    /**  (command during init phase of TwinCAT, AMSCMDSF_INITCMD) */
    InitCmd: number;
    /**  (AMSCMDSF_BROADCAST) */
    Broadcast: number;
    /** Returns the flags as comma separated list by given flag value (number) */
    toString: (value: number) => string;
};
/**
 * ADS error code
 *
 * Source: Beckhoff InfoSys
 */
export declare const ADS_ERROR: {
    0: string;
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
    6: string;
    7: string;
    8: string;
    9: string;
    10: string;
    11: string;
    12: string;
    13: string;
    14: string;
    15: string;
    16: string;
    17: string;
    18: string;
    19: string;
    20: string;
    21: string;
    22: string;
    23: string;
    24: string;
    25: string;
    26: string;
    27: string;
    28: string;
    1280: string;
    1281: string;
    1282: string;
    1283: string;
    1284: string;
    1285: string;
    1286: string;
    1287: string;
    1288: string;
    1289: string;
    1290: string;
    1792: string;
    1793: string;
    1794: string;
    1795: string;
    1796: string;
    1797: string;
    1798: string;
    1799: string;
    1800: string;
    1801: string;
    1802: string;
    1803: string;
    1804: string;
    1805: string;
    1806: string;
    1807: string;
    1808: string;
    1809: string;
    1810: string;
    1811: string;
    1812: string;
    1813: string;
    1814: string;
    1815: string;
    1816: string;
    1817: string;
    1818: string;
    1819: string;
    1820: string;
    1821: string;
    1822: string;
    1823: string;
    1824: string;
    1825: string;
    1826: string;
    1827: string;
    1828: string;
    1829: string;
    1830: string;
    1831: string;
    1832: string;
    1833: string;
    1834: string;
    1835: string;
    1836: string;
    1837: string;
    1838: string;
    1839: string;
    1856: string;
    1857: string;
    1858: string;
    1859: string;
    1860: string;
    1861: string;
    1862: string;
    1863: string;
    1864: string;
    1872: string;
    1873: string;
    1874: string;
    1875: string;
    1876: string;
    1877: string;
    4096: string;
    4097: string;
    4098: string;
    4099: string;
    4100: string;
    4101: string;
    4102: string;
    4103: string;
    4109: string;
    4110: string;
    4111: string;
    4112: string;
    4119: string;
    4120: string;
    4121: string;
    4122: string;
};
/**
 * ADS notification transmission mode
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
export declare const ADS_TRANS_MODE: {
    None: number;
    ClientCycle: number;
    ClientOnChange: number;
    Cyclic: number;
    OnChange: number;
    CyclicInContext: number;
    OnChangeInContext: number;
    /** Returns the corresponding key as string by given value (number) */
    toString: (value: number) => string;
};
/**
 * ADS state
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
export declare const ADS_STATE: {
    Invalid: number;
    Idle: number;
    Reset: number;
    Initialize: number;
    Start: number;
    Run: number;
    Stop: number;
    SaveConfig: number;
    LoadConfig: number;
    PowerFailure: number;
    PowerGood: number;
    Error: number;
    Shutdown: number;
    Susped: number;
    Resume: number;
    Config: number;
    Reconfig: number;
    Stopping: number;
    Incompatible: number;
    Exception: number;
    /** Returns the corresponding key as string by given value (number) */
    toString: (value: number) => string;
};
/**
 * Reserved ADS index groups
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
export declare const ADS_RESERVED_INDEX_GROUPS: {
    /**  PlcRWIB (0x4000, 16384) */
    PlcRWIB: number;
    /**  PlcRWOB (0x4010, 16400) */
    PlcRWOB: number;
    /**  PlcRWMB (0x4020, 16416) */
    PlcRWMB: number;
    /**  PlcRWRB (0x4030, 16432) */
    PlcRWRB: number;
    /**  PlcRWDB (0x4040,16448) */
    PlcRWDB: number;
    /**  SymbolTable (0xF000, 61440) */
    SymbolTable: number;
    /**  SymbolName (0xF001, 61441) */
    SymbolName: number;
    /**  SymbolValue (0xF002, 61442) */
    SymbolValue: number;
    /**  SymbolHandleByName (0xF003, 61443) */
    SymbolHandleByName: number;
    /**  SymbolValueByName (0xF004, 61444) */
    SymbolValueByName: number;
    /**  SymbolValueByHandle (0xF005, 61445) */
    SymbolValueByHandle: number;
    /**  SymbolReleaseHandle (0xF006, 61446) */
    SymbolReleaseHandle: number;
    /**  SymbolInfoByName (0xF007, 61447) */
    SymbolInfoByName: number;
    /**  SymbolVersion (0xF008, 61448) */
    SymbolVersion: number;
    /**  SymbolInfoByNameEx (0xF009, 61449) */
    SymbolInfoByNameEx: number;
    /**  SymbolDownload (F00A, 61450) */
    SymbolDownload: number;
    /**  SymbolUpload (F00B, 61451) */
    SymbolUpload: number;
    /**  SymbolUploadInfo (0xF00C, 61452) */
    SymbolUploadInfo: number;
    /**  SymbolDownload2 */
    SymbolDownload2: number;
    /**  SymbolDataTypeUpload */
    SymbolDataTypeUpload: number;
    /**  SymbolUploadInfo2 */
    SymbolUploadInfo2: number;
    /**  Notification of named handle (0xF010, 61456) */
    SymbolNote: number;
    /**  DataDataTypeInfoByNameEx */
    DataDataTypeInfoByNameEx: number;
    /**  read/write input byte(s) (0xF020, 61472) */
    IOImageRWIB: number;
    /**  read/write input bit (0xF021, 61473) */
    IOImageRWIX: number;
    /**  read/write output byte(s) (0xF030, 61488) */
    IOImageRWOB: number;
    /**  read/write output bit (0xF031, 61489) */
    IOImageRWOX: number;
    /**  write inputs to null (0xF040, 61504) */
    IOImageClearI: number;
    /**  write outputs to null (0xF050, 61520) */
    IOImageClearO: number;
    /**  ADS Sum Read Command (ADSIGRP_SUMUP_READ, 0xF080, 61568) */
    SumCommandRead: number;
    /**  ADS Sum Write Command (ADSIGRP_SUMUP_WRITE, 0xF081, 61569) */
    SumCommandWrite: number;
    /**  ADS sum Read/Write command (ADSIGRP_SUMUP_READWRITE, 0xF082, 61570) */
    SumCommandReadWrite: number;
    /**  ADS sum ReadEx command (ADSIGRP_SUMUP_READEX, 0xF083, 61571) */
    /**  AdsRW  IOffs list size */
    /**  W: {list of IGrp, IOffs, Length} */
    /**  R: {list of results, Length} followed by {list of data (expepted lengths)} */
    SumCommandReadEx: number;
    /**  ADS sum ReadEx2 command (ADSIGRP_SUMUP_READEX2, 0xF084, 61572) */
    /**  AdsRW  IOffs list size */
    /**  W: {list of IGrp, IOffs, Length} */
    /**  R: {list of results, Length} followed by {list of data (returned lengths)} */
    SumCommandReadEx2: number;
    /**  ADS sum AddDevNote command (ADSIGRP_SUMUP_ADDDEVNOTE, 0xF085, 61573) */
    /**  AdsRW  IOffs list size */
    /**  W: {list of IGrp, IOffs, Attrib} */
    /**  R: {list of results, handles} */
    SumCommandAddDevNote: number;
    /**  ADS sum DelDevNot command (ADSIGRP_SUMUP_DELDEVNOTE, 0xF086, 61574) */
    /**  AdsRW  IOffs list size */
    /**  W: {list of handles} */
    /**  R: {list of results} */
    SumCommandDelDevNote: number;
    /**  DeviceData (0xF100,61696) */
    DeviceData: number;
    /** Returns the corresponding key as string by given value (number) */
    toString: (value: number) => string;
};
/**
 * ADS symbol flags
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
export declare const ADS_SYMBOL_FLAGS: {
    None: number;
    /**  ADSSYMBOLFLAG_PERSISTENT */
    Persistent: number;
    /**  ADSSYMBOLFLAG_BITVALUE */
    BitValue: number;
    /**  ADSSYMBOLFLAG_REFERENCETO */
    ReferenceTo: number;
    /**  ADSSYMBOLFLAG_TYPEGUID */
    TypeGuid: number;
    /**  ADSSYMBOLFLAG_TCCOMIFACEPTR */
    TComInterfacePtr: number;
    /**  ADSSYMBOLFLAG_READONLY */
    ReadOnly: number;
    /**  ADSSYMBOLFLAG_ITFMETHODACCESS */
    ItfMethodAccess: number;
    /**  ADSSYMBOLFLAG_METHODDEREF */
    MethodDeref: number;
    /**  ADSSYMBOLFLAG_CONTEXTMASK (4 Bit) */
    ContextMask: number;
    /**  ADSSYMBOLFLAG_ATTRIBUTES */
    Attributes: number;
    /**   Symbol is static (ADSSYMBOLFLAG_STATIC,0x2000) */
    Static: number;
    /**   Persistent data will not restored after reset (cold, ADSSYMBOLFLAG_INITONRESET 0x4000) */
    InitOnReset: number;
    /**   Extended Flags in symbol (ADSSYMBOLFLAG_EXTENDEDFLAGS,0x8000) */
    ExtendedFlags: number;
    /** Return given flag value as string array */
    toStringArray: (flags: number) => string[];
};
/**
 * ADS data type flags
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
export declare const ADS_DATA_TYPE_FLAGS: {
    /**  ADSDATATYPEFLAG_DATATYPE */
    DataType: number;
    /**  ADSDATATYPEFLAG_DATAITEM */
    DataItem: number;
    /**  ADSDATATYPEFLAG_REFERENCETO */
    ReferenceTo: number;
    /**  ADSDATATYPEFLAG_METHODDEREF */
    MethodDeref: number;
    /**  ADSDATATYPEFLAG_OVERSAMPLE */
    Oversample: number;
    /**  ADSDATATYPEFLAG_BITVALUES */
    BitValues: number;
    /**  ADSDATATYPEFLAG_PROPITEM */
    PropItem: number;
    /**  ADSDATATYPEFLAG_TYPEGUID */
    TypeGuid: number;
    /**  ADSDATATYPEFLAG_PERSISTENT */
    Persistent: number;
    /**  ADSDATATYPEFLAG_COPYMASK */
    CopyMask: number;
    /**  ADSDATATYPEFLAG_TCCOMIFACEPTR */
    TComInterfacePtr: number;
    /**  ADSDATATYPEFLAG_METHODINFOS */
    MethodInfos: number;
    /**  ADSDATATYPEFLAG_ATTRIBUTES */
    Attributes: number;
    /**  ADSDATATYPEFLAG_ENUMINFOS */
    EnumInfos: number;
    /**   this flag is set if the datatype is aligned (ADSDATATYPEFLAG_ALIGNED) */
    Aligned: number;
    /**   data item is static - do not use offs (ADSDATATYPEFLAG_STATIC) */
    Static: number;
    /**   means "ContainSpLevelss" for DATATYPES and "HasSpLevels" for DATAITEMS (ADSDATATYPEFLAG_SPLEVELS) */
    SpLevels: number;
    /**   do not restore persistent data (ADSDATATYPEFLAG_IGNOREPERSIST) */
    IgnorePersist: number;
    /**  Any size array (ADSDATATYPEFLAG_ANYSIZEARRAY) */
    AnySizeArray: number;
    /**    data type used for persistent variables -&gt; should be saved with persistent data (ADSDATATYPEFLAG_PERSIST_DT,0x00200000) */
    PersistantDatatype: number;
    /**   Persistent data will not restored after reset (cold) (ADSDATATYPEFLAG_INITONRESET,0x00400000) */
    InitOnResult: number;
    /**  None / No Flag set */
    None: number;
    /** Return given flag value as string array */
    toStringArray: (flags: number) => string[];
};
/**
 * ADS data types
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
export declare const ADS_DATA_TYPES: {
    /** Empty Type*/
    ADST_VOID: number;
    /**Integer 16 Bit*/
    ADST_INT16: number;
    /**Integer 32 Bit*/
    ADST_INT32: number;
    /**Real (32 Bit)*/
    ADST_REAL32: number;
    /**Real 64 Bit*/
    ADST_REAL64: number;
    /**Integer 8 Bit*/
    ADST_INT8: number;
    /**Unsigned integer 8 Bit*/
    ADST_UINT8: number;
    /**Unsigned integer 16 Bit*/
    ADST_UINT16: number;
    /**Unsigned Integer 32 Bit*/
    ADST_UINT32: number;
    /**LONG Integer 64 Bit*/
    ADST_INT64: number;
    /**Unsigned Long integer 64 Bit*/
    ADST_UINT64: number;
    /**STRING*/
    ADST_STRING: number;
    /**WSTRING*/
    ADST_WSTRING: number;
    /**ADS REAL80*/
    ADST_REAL80: number;
    /**ADS BIT*/
    ADST_BIT: number;
    /**Internal Only*/
    ADST_MAXTYPES: number;
    /**Blob*/
    ADST_BIGTYPE: number;
    /** Returns the corresponding key as string by given value (number) */
    toString: (value: number) => string;
};
/**
 * ADS RCP method parameter flags
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
export declare const RCP_METHOD_PARAM_FLAGS: {
    /**  Input Parameter (ADSMETHODPARAFLAG_IN) */
    In: number;
    /**  Output Parameter (ADSMETHODPARAFLAG_OUT) */
    Out: number;
    /**   By reference Parameter (ADSMETHODPARAFLAG_BYREFERENCE) */
    ByReference: number;
    /**  Mask for In parameters. */
    MaskIn: number;
    /**  Mask for Out parameters. */
    MaskOut: number;
    /** Return given flag value as string array */
    toStringArray: (flags: number) => string[];
};
/**
 * AMS router state
 */
export declare const AMS_ROUTER_STATE: {
    /** Router is stopped */
    STOP: number;
    /** Router is started */
    START: number;
    /** Router is remove (unavailable?) */
    REMOVED: number;
    /** Returns the corresponding key as string by given value (number) */
    toString: (value: number) => string;
};
/**
 * Converts array of bytes (or Buffer) to AmsNetId string, such as 192.168.1.10.1.1
 *
 * @param byteArray Array of bytes or Buffer object
 */
export declare const byteArrayToAmsNetIdStr: (byteArray: Buffer | number[]) => string;
/**
 * Converts AmsNetId string (such as 192.168.10.1.1) to array of bytes
 *
 * @param str AmsNetId as string
 */
export declare const amsNetIdStrToByteArray: (str: string) => number[];
/**
 * Trims the given PLC string until end mark (\0) is found (removes empty bytes from the end)
 *
 * @param plcString String to trim
 * @returns Trimmed string
 */
export declare const trimPlcString: (plcStr: string) => string;
export declare const decodeSTRING: (data: Buffer) => string;
