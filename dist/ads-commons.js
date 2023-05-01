"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeSTRING = exports.trimPlcString = exports.amsNetIdStrToByteArray = exports.byteArrayToAmsNetIdStr = exports.AMS_ROUTER_STATE = exports.RCP_METHOD_PARAM_FLAGS = exports.ADS_DATA_TYPES = exports.ADS_DATA_TYPE_FLAGS = exports.ADS_SYMBOL_FLAGS = exports.ADS_RESERVED_INDEX_GROUPS = exports.ADS_STATE = exports.ADS_TRANS_MODE = exports.ADS_ERROR = exports.ADS_STATE_FLAGS = exports.ADS_COMMAND = exports.ADS_RESERVED_PORTS = exports.AMS_HEADER_FLAG = exports.LOOPBACK_AMS_NET_ID = exports.ADS_DEFAULT_TCP_PORT = exports.ADS_INVOKE_ID_MAX_VALUE = exports.ADS_INDEX_GROUP_LENGTH = exports.ADS_INDEX_OFFSET_LENGTH = exports.AMS_NET_ID_LENGTH = exports.AMS_HEADER_LENGTH = exports.AMS_TCP_HEADER_LENGTH = void 0;
/*
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
const iconv_lite_1 = __importDefault(require("iconv-lite"));
/**
 * AMS/TCP header length
 */
exports.AMS_TCP_HEADER_LENGTH = 6;
/**
 * AMS header length
 */
exports.AMS_HEADER_LENGTH = 32;
/**
 * AmsNetId length
 */
exports.AMS_NET_ID_LENGTH = 6;
/**
 * ADS index offset length
 */
exports.ADS_INDEX_OFFSET_LENGTH = 4;
/**
 * ADS index group length
 */
exports.ADS_INDEX_GROUP_LENGTH = 4;
/**
 * ADS invoke ID maximum value (32bit unsigned integer)
 */
exports.ADS_INVOKE_ID_MAX_VALUE = 4294967295;
/**
 * Default ADS server TCP port for incoming connections
 */
exports.ADS_DEFAULT_TCP_PORT = 48898;
/**
 * Loopback (localhost) AmsNetId
 */
exports.LOOPBACK_AMS_NET_ID = '127.0.0.1.1.1';
/**
 * AMS header flag (AMS command)
 */
exports.AMS_HEADER_FLAG = {
    /** 0x0000 - Used for ADS commands */
    AMS_TCP_PORT_AMS_CMD: 0,
    /** 0x0001 - Port close command*/
    AMS_TCP_PORT_CLOSE: 1,
    /** 0x1000 - Port connect command */
    AMS_TCP_PORT_CONNECT: 4096,
    /** 0x1001 - Router notification */
    AMS_TCP_PORT_ROUTER_NOTE: 4097,
    /** 0x1002 - Requests local AmsNetId */
    GET_LOCAL_NETID: 4098,
    /** Returns the corresponding key as string by given value (number) */
    toString: function (value) {
        const val = Object.keys(this).find((key) => this[key] == value);
        return (val !== undefined ? val : 'UNKNOWN');
    }
};
/**
 * Reserved/known ADS ports
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
exports.ADS_RESERVED_PORTS = {
    None: 0,
    /**  AMS Router (Port 1) */
    Router: 1,
    /**  AMS Debugger (Port 2) */
    Debugger: 2,
    /**  The TCom Server. Dpc or passive level. */
    R0_TComServer: 10,
    /**  TCom Server Task. RT context. */
    R0_TComServerTask: 11,
    /**  TCom Serve Task. Passive level. */
    R0_TComServer_PL: 12,
    /**  TwinCAT Debugger */
    R0_TcDebugger: 20,
    /**  TwinCAT Debugger Task */
    R0_TcDebuggerTask: 21,
    /**  The License Server (Port 30) */
    R0_LicenseServer: 30,
    /**  Logger (Port 100) */
    Logger: 100,
    /**  Event Logger (Port 110) */
    EventLog: 110,
    /**  application for coupler (EK), gateway (EL), etc. */
    DeviceApplication: 120,
    /**  Event Logger UM */
    EventLog_UM: 130,
    /**  Event Logger RT */
    EventLog_RT: 131,
    /**  Event Logger Publisher */
    EventLogPublisher: 132,
    /**  R0 Realtime (Port 200) */
    R0_Realtime: 200,
    /**  R0 Trace (Port 290) */
    R0_Trace: 290,
    /**  R0 IO (Port 300) */
    R0_IO: 300,
    /**  NC (R0) (Port 500) */
    R0_NC: 500,
    /**  R0 Satzausführung (Port 501) */
    R0_NCSAF: 501,
    /**  R0 Satzvorbereitung (Port 511) */
    R0_NCSVB: 511,
    /**  Preconfigured Nc2-Nc3-Instance */
    R0_NCINSTANCE: 520,
    /**  R0 ISG (Port 550) */
    R0_ISG: 550,
    /**  R0 CNC (Port 600) */
    R0_CNC: 600,
    /**  R0 Line (Port 700) */
    R0_LINE: 700,
    /**  R0 PLC (Port 800) */
    R0_PLC: 800,
    /**  Tc2 PLC RuntimeSystem 1 (Port 801) */
    Tc2_Plc1: 801,
    /**  Tc2 PLC RuntimeSystem 2 (Port 811) */
    Tc2_Plc2: 811,
    /**  Tc2 PLC RuntimeSystem 3 (Port 821) */
    Tc2_Plc3: 821,
    /**  Tc2 PLC RuntimeSystem 4 (Port 831) */
    Tc2_Plc4: 831,
    /**  R0 RTS (Port 850) */
    R0_RTS: 850,
    /**  Tc3 PLC RuntimeSystem 1 (Port 851) */
    Tc3_Plc1: 851,
    /**  Tc3 PLC RuntimeSystem 2 (Port 852) */
    Tc3_Plc2: 852,
    /**  Tc3 PLC RuntimeSystem 3 (Port 853) */
    Tc3_Plc3: 853,
    /**  Tc3 PLC RuntimeSystem 4 (Port 854) */
    Tc3_Plc4: 854,
    /**  Tc3 PLC RuntimeSystem 5 (Port 855) */
    Tc3_Plc5: 855,
    /**  Camshaft Controller (R0) (Port 900) */
    CamshaftController: 900,
    /**  R0 CAM Tool (Port 950) */
    R0_CAMTOOL: 950,
    /**  R0 User (Port 2000) */
    R0_USER: 2000,
    /**  (Port 10000) */
    R3_CTRLPROG: 10000,
    /**  System Service (AMSPORT_R3_SYSSERV, 10000) */
    SystemService: 10000,
    /**  (Port 10001) */
    R3_SYSCTRL: 10001,
    /**  Port 10100 */
    R3_SYSSAMPLER: 10100,
    /**  Port 10200 */
    R3_TCPRAWCONN: 10200,
    /**  Port 10201 */
    R3_TCPIPSERVER: 10201,
    /**  Port 10300 */
    R3_SYSMANAGER: 10300,
    /**  Port 10400 */
    R3_SMSSERVER: 10400,
    /**  Port 10500 */
    R3_MODBUSSERVER: 10500,
    /**  Port 10502 */
    R3_AMSLOGGER: 10502,
    /**  Port 10600 */
    R3_XMLDATASERVER: 10600,
    /**  Port 10700 */
    R3_AUTOCONFIG: 10700,
    /**  Port 10800 */
    R3_PLCCONTROL: 10800,
    /**  Port 10900 */
    R3_FTPCLIENT: 10900,
    /**  Port 11000 */
    R3_NCCTRL: 11000,
    /**  Port 11500 */
    R3_NCINTERPRETER: 11500,
    /**  Port 11600 */
    R3_GSTINTERPRETER: 11600,
    /**  Port 12000 */
    R3_STRECKECTRL: 12000,
    /**  Port 13000 */
    R3_CAMCTRL: 13000,
    /**  Port 14000 */
    R3_SCOPE: 14000,
    /**  Port 14100 */
    R3_CONDITIONMON: 14100,
    /**  Port 15000 */
    R3_SINECH1: 15000,
    /**  Port 16000 */
    R3_CONTROLNET: 16000,
    /**  Port 17000 */
    R3_OPCSERVER: 17000,
    /**  Port 17500 */
    R3_OPCCLIENT: 17500,
    /**  Port 18000 */
    R3_MAILSERVER: 18000,
    /**  Port 19000 */
    R3_EL60XX: 19000,
    /**  Port 19100 */
    R3_MANAGEMENT: 19100,
    /**  Port 19200 */
    R3_MIELEHOME: 19200,
    /**  Port 19300 */
    R3_CPLINK3: 19300,
    /**  Port 19500 */
    R3_VNSERVICE: 19500,
    /**  Multiuser (Port 19600) */
    R3_MULTIUSER: 19600,
    /**  Default (AMS router assigns) */
    USEDEFAULT: 65535, // 0x0000FFFF
};
/**
 * ADS command
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
exports.ADS_COMMAND = {
    /**  Invalid */
    Invalid: 0,
    /**  None / Uninitialized */
    None: 0,
    /**  ReadDeviceInfo command */
    ReadDeviceInfo: 1,
    /**  Read Command */
    Read: 2,
    /**  Write Command */
    Write: 3,
    /**  ReadState Command */
    ReadState: 4,
    /**  WriteControl Command */
    WriteControl: 5,
    /**  AddNotification Command */
    AddNotification: 6,
    /**  DeleteNotification Command */
    DeleteNotification: 7,
    /**  Notification event. */
    Notification: 8,
    /**  ReadWrite Command */
    ReadWrite: 9,
    /** Returns the corresponding key as string by given value (number) */
    toString: function (value) {
        const val = Object.keys(this).find((key) => this[key] == value);
        return (val !== undefined ? val : 'UNKNOWN');
    }
};
/**
 * ADS state flags
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
exports.ADS_STATE_FLAGS = {
    //The response (AMSCMDSF_RESPONSE)
    Response: 1,
    /**  (AMSCMDSF_NORETURN) */
    NoReturn: 2,
    /**  AdsCommand */
    AdsCommand: 4,
    /**  Internal generated cmds (AMSCMDSF_SYSCMD) */
    SysCommand: 8,
    /**  High Priority (R0 to R0 checked at task begin, AMSCMDSF_HIGHPRIO) */
    HighPriority: 16,
    /**  (cbData um 8 Byte vergrößert, AMSCMDSF_TIMESTAMPADDED) */
    TimeStampAdded: 32,
    /**  (UDP instead of TCP, AMSCMDSF_UDP) */
    Udp: 64,
    /**  (command during init phase of TwinCAT, AMSCMDSF_INITCMD) */
    InitCmd: 128,
    /**  (AMSCMDSF_BROADCAST) */
    Broadcast: 32768,
    /** Returns the flags as comma separated list by given flag value (number) */
    toString: function (value) {
        const flags = [];
        for (const key of Object.keys(this)) {
            const typedKey = key;
            if (typeof this[typedKey] !== 'number')
                continue;
            if ((value & this[typedKey]) === this[typedKey])
                flags.push(key);
        }
        //Specials: For helping debugging
        if (!flags.includes('Udp'))
            flags.push('Tcp');
        if (!flags.includes('Response'))
            flags.push('Request');
        return flags.join(', ');
    }
};
/**
 * ADS error code
 *
 * Source: Beckhoff InfoSys
 */
exports.ADS_ERROR = {
    0: 'No error',
    1: 'Internal error',
    2: 'No Rtime',
    3: 'Allocation locked memory error',
    4: 'Insert mailbox error',
    5: 'Wrong receive HMSG',
    6: 'Target port not found',
    7: 'Target machine not found',
    8: 'Unknown command ID',
    9: 'Bad task ID',
    10: 'No IO',
    11: 'Unknown ADS command',
    12: 'Win 32 error',
    13: 'Port not connected',
    14: 'Invalid ADS length',
    15: 'Invalid AMS Net ID',
    16: 'Low Installation level',
    17: 'No debug available',
    18: 'Port disabled',
    19: 'Port already connected',
    20: 'ADS Sync Win32 error',
    21: 'ADS Sync Timeout',
    22: 'ADS Sync AMS error',
    23: 'ADS Sync no index map',
    24: 'Invalid ADS port',
    25: 'No memory',
    26: 'TCP send error',
    27: 'Host unreachable',
    28: 'Invalid AMS fragment',
    1280: 'No locked memory can be allocated',
    1281: 'The size of the router memory could not be changed',
    1282: 'The mailbox has reached the maximum number of possible messages. The current sent message was rejected',
    1283: 'The mailbox has reached the maximum number of possible messages.',
    1284: 'Unknown port type',
    1285: 'Router is not initialized',
    1286: 'The desired port number is already assigned',
    1287: 'Port not registered',
    1288: 'The maximum number of Ports reached',
    1289: 'Invalid port',
    1290: 'TwinCAT Router not active',
    1792: 'General device error',
    1793: 'Service is not supported by server',
    1794: 'Invalid index group',
    1795: 'Invalid index offset',
    1796: 'Reading/writing not permitted',
    1797: 'Parameter size not correct',
    1798: 'Invalid parameter value(s)',
    1799: 'Device is not in a ready state',
    1800: 'Device is busy',
    1801: 'Invalid context (must be in Windows)',
    1802: 'Out of memory',
    1803: 'Invalid parameter value(s)',
    1804: 'Not found (files, ...)',
    1805: 'Syntax error in command or file',
    1806: 'Objects do not match',
    1807: 'Object already exists',
    1808: 'Symbol not found',
    1809: 'Symbol version invalid',
    1810: 'Server is in invalid state',
    1811: 'AdsTransMode not supported',
    1812: 'Notification handle is invalid',
    1813: 'Notification client not registered',
    1814: 'No more notification handles',
    1815: 'Size for watch too big',
    1816: 'Device not initialized',
    1817: 'Device has a timeout',
    1818: 'Query interface failed',
    1819: 'Wrong interface required',
    1820: 'Class ID is invalid',
    1821: 'Object ID is invalid',
    1822: 'Request is pending',
    1823: 'Request is aborted',
    1824: 'Signal warning',
    1825: 'Invalid array index',
    1826: 'Symbol not active',
    1827: 'Access denied',
    1828: 'Missing license',
    1829: 'License expired',
    1830: 'License exceeded',
    1831: 'License invalid',
    1832: 'License invalid system id',
    1833: 'License not time limited',
    1834: 'License issue time in the future',
    1835: 'License time period to long',
    1836: 'Exception occured during system start',
    1837: 'License file read twice',
    1838: 'Invalid signature',
    1839: 'Public key certificate',
    1856: 'Error class <client error>',
    1857: 'Invalid parameter at service',
    1858: 'Polling list is empty',
    1859: 'Var connection already in use',
    1860: 'Invoke ID in use',
    1861: 'Timeout elapsed',
    1862: 'Error in win32 subsystem',
    1863: 'Invalid client timeout value',
    1864: 'Ads-port not opened',
    1872: 'Internal error in ads sync',
    1873: 'Hash table overflow',
    1874: 'Key not found in hash',
    1875: 'No more symbols in cache',
    1876: 'Invalid response received',
    1877: 'Sync port is locked',
    4096: 'Internal fatal error in the TwinCAT real-time system',
    4097: 'Timer value not vaild',
    4098: 'Task pointer has the invalid value ZERO',
    4099: 'Task stack pointer has the invalid value ZERO',
    4100: 'The demand task priority is already assigned',
    4101: 'No more free TCB (Task Control Block) available. Maximum number of TCBs is 64',
    4102: 'No more free semaphores available. Maximum number of semaphores is 64',
    4103: 'No more free queue available. Maximum number of queue is 64',
    4109: 'An external synchronization interrupt is already applied',
    4110: 'No external synchronization interrupt applied',
    4111: 'The apply of the external synchronization interrupt failed',
    4112: 'Call of a service function in the wrong context',
    4119: 'Intel VT-x extension is not supported',
    4120: 'Intel VT-x extension is not enabled in system BIOS',
    4121: 'Missing function in Intel VT-x extension',
    4122: 'Enabling Intel VT-x fails',
};
/**
 * ADS notification transmission mode
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
exports.ADS_TRANS_MODE = {
    None: 0,
    ClientCycle: 1,
    ClientOnChange: 2,
    Cyclic: 3,
    OnChange: 4,
    CyclicInContext: 5,
    OnChangeInContext: 6,
    /** Returns the corresponding key as string by given value (number) */
    toString: function (value) {
        const val = Object.keys(this).find((key) => this[key] == value);
        return (val !== undefined ? val : 'UNKNOWN');
    }
};
/**
 * ADS state
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
exports.ADS_STATE = {
    Invalid: 0,
    Idle: 1,
    Reset: 2,
    Initialize: 3,
    Start: 4,
    Run: 5,
    Stop: 6,
    SaveConfig: 7,
    LoadConfig: 8,
    PowerFailure: 9,
    PowerGood: 10,
    Error: 11,
    Shutdown: 12,
    Susped: 13,
    Resume: 14,
    Config: 15,
    Reconfig: 16,
    Stopping: 17,
    Incompatible: 18,
    Exception: 19,
    /** Returns the corresponding key as string by given value (number) */
    toString: function (value) {
        const val = Object.keys(this).find((key) => this[key] == value);
        return (val !== undefined ? val : 'UNKNOWN');
    }
};
/**
 * Reserved ADS index groups
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
exports.ADS_RESERVED_INDEX_GROUPS = {
    /**  PlcRWIB (0x4000, 16384) */
    PlcRWIB: 16384,
    /**  PlcRWOB (0x4010, 16400) */
    PlcRWOB: 16400,
    /**  PlcRWMB (0x4020, 16416) */
    PlcRWMB: 16416,
    /**  PlcRWRB (0x4030, 16432) */
    PlcRWRB: 16432,
    /**  PlcRWDB (0x4040,16448) */
    PlcRWDB: 16448,
    /**  SymbolTable (0xF000, 61440) */
    SymbolTable: 61440,
    /**  SymbolName (0xF001, 61441) */
    SymbolName: 61441,
    /**  SymbolValue (0xF002, 61442) */
    SymbolValue: 61442,
    /**  SymbolHandleByName (0xF003, 61443) */
    SymbolHandleByName: 61443,
    /**  SymbolValueByName (0xF004, 61444) */
    SymbolValueByName: 61444,
    /**  SymbolValueByHandle (0xF005, 61445) */
    SymbolValueByHandle: 61445,
    /**  SymbolReleaseHandle (0xF006, 61446) */
    SymbolReleaseHandle: 61446,
    /**  SymbolInfoByName (0xF007, 61447) */
    SymbolInfoByName: 61447,
    /**  SymbolVersion (0xF008, 61448) */
    SymbolVersion: 61448,
    /**  SymbolInfoByNameEx (0xF009, 61449) */
    SymbolInfoByNameEx: 61449,
    /**  SymbolDownload (F00A, 61450) */
    SymbolDownload: 61450,
    /**  SymbolUpload (F00B, 61451) */
    SymbolUpload: 61451,
    /**  SymbolUploadInfo (0xF00C, 61452) */
    SymbolUploadInfo: 61452,
    /**  SymbolDownload2 */
    SymbolDownload2: 0xF00D,
    /**  SymbolDataTypeUpload */
    SymbolDataTypeUpload: 0xF00E,
    /**  SymbolUploadInfo2 */
    SymbolUploadInfo2: 0xF00F,
    /**  Notification of named handle (0xF010, 61456) */
    SymbolNote: 61456,
    /**  DataDataTypeInfoByNameEx */
    DataDataTypeInfoByNameEx: 0xF011,
    /**  read/write input byte(s) (0xF020, 61472) */
    IOImageRWIB: 61472,
    /**  read/write input bit (0xF021, 61473) */
    IOImageRWIX: 61473,
    /**  read/write output byte(s) (0xF030, 61488) */
    IOImageRWOB: 61488,
    /**  read/write output bit (0xF031, 61489) */
    IOImageRWOX: 61489,
    /**  write inputs to null (0xF040, 61504) */
    IOImageClearI: 61504,
    /**  write outputs to null (0xF050, 61520) */
    IOImageClearO: 61520,
    /**  ADS Sum Read Command (ADSIGRP_SUMUP_READ, 0xF080, 61568) */
    SumCommandRead: 61568,
    /**  ADS Sum Write Command (ADSIGRP_SUMUP_WRITE, 0xF081, 61569) */
    SumCommandWrite: 61569,
    /**  ADS sum Read/Write command (ADSIGRP_SUMUP_READWRITE, 0xF082, 61570) */
    SumCommandReadWrite: 61570,
    /**  ADS sum ReadEx command (ADSIGRP_SUMUP_READEX, 0xF083, 61571) */
    /**  AdsRW  IOffs list size */
    /**  W: {list of IGrp, IOffs, Length} */
    /**  R: {list of results, Length} followed by {list of data (expepted lengths)} */
    SumCommandReadEx: 61571,
    /**  ADS sum ReadEx2 command (ADSIGRP_SUMUP_READEX2, 0xF084, 61572) */
    /**  AdsRW  IOffs list size */
    /**  W: {list of IGrp, IOffs, Length} */
    /**  R: {list of results, Length} followed by {list of data (returned lengths)} */
    SumCommandReadEx2: 61572,
    /**  ADS sum AddDevNote command (ADSIGRP_SUMUP_ADDDEVNOTE, 0xF085, 61573) */
    /**  AdsRW  IOffs list size */
    /**  W: {list of IGrp, IOffs, Attrib} */
    /**  R: {list of results, handles} */
    SumCommandAddDevNote: 61573,
    /**  ADS sum DelDevNot command (ADSIGRP_SUMUP_DELDEVNOTE, 0xF086, 61574) */
    /**  AdsRW  IOffs list size */
    /**  W: {list of handles} */
    /**  R: {list of results} */
    SumCommandDelDevNote: 61574,
    /**  DeviceData (0xF100,61696) */
    DeviceData: 61696,
    /** Returns the corresponding key as string by given value (number) */
    toString: function (value) {
        const val = Object.keys(this).find((key) => this[key] == value);
        return (val !== undefined ? val : 'UNKNOWN');
    }
};
/**
 * ADS symbol flags
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
exports.ADS_SYMBOL_FLAGS = {
    //None
    None: 0,
    /**  ADSSYMBOLFLAG_PERSISTENT */
    Persistent: 1,
    /**  ADSSYMBOLFLAG_BITVALUE */
    BitValue: 2,
    /**  ADSSYMBOLFLAG_REFERENCETO */
    ReferenceTo: 4,
    /**  ADSSYMBOLFLAG_TYPEGUID */
    TypeGuid: 8,
    /**  ADSSYMBOLFLAG_TCCOMIFACEPTR */
    TComInterfacePtr: 16,
    /**  ADSSYMBOLFLAG_READONLY */
    ReadOnly: 32,
    /**  ADSSYMBOLFLAG_ITFMETHODACCESS */
    ItfMethodAccess: 64,
    /**  ADSSYMBOLFLAG_METHODDEREF */
    MethodDeref: 128,
    /**  ADSSYMBOLFLAG_CONTEXTMASK (4 Bit) */
    ContextMask: 3840,
    /**  ADSSYMBOLFLAG_ATTRIBUTES */
    Attributes: 4096,
    /**   Symbol is static (ADSSYMBOLFLAG_STATIC,0x2000) */
    Static: 8192,
    /**   Persistent data will not restored after reset (cold, ADSSYMBOLFLAG_INITONRESET 0x4000) */
    InitOnReset: 16384,
    /**   Extended Flags in symbol (ADSSYMBOLFLAG_EXTENDEDFLAGS,0x8000) */
    ExtendedFlags: 32768,
    /** Return given flag value as string array */
    toStringArray: function (flags) {
        const flagsArr = [];
        for (const key of Object.keys(this)) {
            const typedKey = key;
            if (typeof this[typedKey] !== 'number')
                continue;
            //Check if flag is available
            if ((flags & this[typedKey]) === this[typedKey]) {
                if (flags === 0 || this[typedKey] !== 0)
                    flagsArr.push(key);
            }
        }
        return flagsArr;
    }
};
/**
 * ADS data type flags
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
exports.ADS_DATA_TYPE_FLAGS = {
    /**  ADSDATATYPEFLAG_DATATYPE */
    DataType: 1,
    /**  ADSDATATYPEFLAG_DATAITEM */
    DataItem: 2,
    /**  ADSDATATYPEFLAG_REFERENCETO */
    ReferenceTo: 4,
    /**  ADSDATATYPEFLAG_METHODDEREF */
    MethodDeref: 8,
    /**  ADSDATATYPEFLAG_OVERSAMPLE */
    Oversample: 16,
    /**  ADSDATATYPEFLAG_BITVALUES */
    BitValues: 32,
    /**  ADSDATATYPEFLAG_PROPITEM */
    PropItem: 64,
    /**  ADSDATATYPEFLAG_TYPEGUID */
    TypeGuid: 128,
    /**  ADSDATATYPEFLAG_PERSISTENT */
    Persistent: 256,
    /**  ADSDATATYPEFLAG_COPYMASK */
    CopyMask: 512,
    /**  ADSDATATYPEFLAG_TCCOMIFACEPTR */
    TComInterfacePtr: 1024,
    /**  ADSDATATYPEFLAG_METHODINFOS */
    MethodInfos: 2048,
    /**  ADSDATATYPEFLAG_ATTRIBUTES */
    Attributes: 4096,
    /**  ADSDATATYPEFLAG_ENUMINFOS */
    EnumInfos: 8192,
    /**   this flag is set if the datatype is aligned (ADSDATATYPEFLAG_ALIGNED) */
    Aligned: 65536,
    /**   data item is static - do not use offs (ADSDATATYPEFLAG_STATIC) */
    Static: 131072,
    /**   means "ContainSpLevelss" for DATATYPES and "HasSpLevels" for DATAITEMS (ADSDATATYPEFLAG_SPLEVELS) */
    SpLevels: 262144,
    /**   do not restore persistent data (ADSDATATYPEFLAG_IGNOREPERSIST) */
    IgnorePersist: 524288,
    /**  Any size array (ADSDATATYPEFLAG_ANYSIZEARRAY) */
    AnySizeArray: 1048576,
    /**    data type used for persistent variables -&gt; should be saved with persistent data (ADSDATATYPEFLAG_PERSIST_DT,0x00200000) */
    PersistantDatatype: 2097152,
    /**   Persistent data will not restored after reset (cold) (ADSDATATYPEFLAG_INITONRESET,0x00400000) */
    InitOnResult: 4194304,
    /**  None / No Flag set */
    None: 0,
    /** Return given flag value as string array */
    toStringArray: function (flags) {
        const flagsArr = [];
        for (const key of Object.keys(this)) {
            const typedKey = key;
            if (typeof this[typedKey] !== 'number')
                continue;
            //Check if flag is available
            if ((flags & this[typedKey]) === this[typedKey]) {
                if (flags === 0 || this[typedKey] !== 0)
                    flagsArr.push(key);
            }
        }
        return flagsArr;
    }
};
/**
 * ADS data types
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
exports.ADS_DATA_TYPES = {
    /** Empty Type*/
    ADST_VOID: 0,
    /**Integer 16 Bit*/
    ADST_INT16: 2,
    /**Integer 32 Bit*/
    ADST_INT32: 3,
    /**Real (32 Bit)*/
    ADST_REAL32: 4,
    /**Real 64 Bit*/
    ADST_REAL64: 5,
    /**Integer 8 Bit*/
    ADST_INT8: 16,
    /**Unsigned integer 8 Bit*/
    ADST_UINT8: 17,
    /**Unsigned integer 16 Bit*/
    ADST_UINT16: 18,
    /**Unsigned Integer 32 Bit*/
    ADST_UINT32: 19,
    /**LONG Integer 64 Bit*/
    ADST_INT64: 20,
    /**Unsigned Long integer 64 Bit*/
    ADST_UINT64: 21,
    /**STRING*/
    ADST_STRING: 30,
    /**WSTRING*/
    ADST_WSTRING: 31,
    /**ADS REAL80*/
    ADST_REAL80: 32,
    /**ADS BIT*/
    ADST_BIT: 33,
    /**Internal Only*/
    ADST_MAXTYPES: 34,
    /**Blob*/
    ADST_BIGTYPE: 65,
    /** Returns the corresponding key as string by given value (number) */
    toString: function (value) {
        const val = Object.keys(this).find((key) => this[key] == value);
        return (val !== undefined ? val : 'UNKNOWN');
    }
};
/**
 * ADS RCP method parameter flags
 *
 * Source: TwinCAT.Ads.dll By Beckhoff
 */
exports.RCP_METHOD_PARAM_FLAGS = {
    /**  Input Parameter (ADSMETHODPARAFLAG_IN) */
    In: 1,
    /**  Output Parameter (ADSMETHODPARAFLAG_OUT) */
    Out: 2,
    /**   By reference Parameter (ADSMETHODPARAFLAG_BYREFERENCE) */
    ByReference: 4,
    /**  Mask for In parameters. */
    MaskIn: 5,
    /**  Mask for Out parameters. */
    MaskOut: 6,
    /** Return given flag value as string array */
    toStringArray: function (flags) {
        const flagsArr = [];
        for (const key of Object.keys(this)) {
            const typedKey = key;
            if (typeof this[typedKey] !== 'number')
                continue;
            //Check if flag is available
            if ((flags & this[typedKey]) === this[typedKey]) {
                if (flags === 0 || this[typedKey] !== 0)
                    flagsArr.push(key);
            }
        }
        return flagsArr;
    }
};
/**
 * AMS router state
 */
exports.AMS_ROUTER_STATE = {
    /** Router is stopped */
    STOP: 0,
    /** Router is started */
    START: 1,
    /** Router is remove (unavailable?) */
    REMOVED: 2,
    /** Returns the corresponding key as string by given value (number) */
    toString: function (value) {
        const val = Object.keys(this).find((key) => this[key] == value);
        return (val !== undefined ? val : 'UNKNOWN');
    }
};
/**
 * Converts array of bytes (or Buffer) to AmsNetId string, such as 192.168.1.10.1.1
 *
 * @param byteArray Array of bytes or Buffer object
 */
const byteArrayToAmsNetIdStr = (byteArray) => {
    return byteArray.join('.');
};
exports.byteArrayToAmsNetIdStr = byteArrayToAmsNetIdStr;
/**
 * Converts AmsNetId string (such as 192.168.10.1.1) to array of bytes
 *
 * @param str AmsNetId as string
 */
const amsNetIdStrToByteArray = (str) => {
    return str.split('.').map(x => parseInt(x));
};
exports.amsNetIdStrToByteArray = amsNetIdStrToByteArray;
/**
 * Trims the given PLC string until end mark (\0) is found (removes empty bytes from the end)
 *
 * @param plcString String to trim
 * @returns Trimmed string
 */
const trimPlcString = (plcStr) => plcStr.substring(0, plcStr.indexOf("\0"));
exports.trimPlcString = trimPlcString;
const decodeSTRING = (data) => (0, exports.trimPlcString)(iconv_lite_1.default.decode(data, "cp1252"));
exports.decodeSTRING = decodeSTRING;
