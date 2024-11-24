# ads-client


[![npm version](https://img.shields.io/npm/v/ads-client)](https://www.npmjs.org/package/ads-client) 
[![GitHub](https://img.shields.io/badge/View%20on-GitHub-brightgreen)](https://github.com/jisotalo/ads-client)
[![License](https://img.shields.io/github/license/jisotalo/ads-client)](https://choosealicense.com/licenses/mit/)


Beckhoff TwinCAT ADS client library for Node.js (unofficial). 

Connect to a Beckhoff TwinCAT automation system using the ADS protocol from a Node.js app.

If you are using Node-RED, check out the [node-red-contrib-ads-client](https://www.npmjs.com/package/node-red-contrib-ads-client).

# Project status

<u><b>NOTE: DOCUMENTATION LINKS ARE NOT WORKING UNTIL RELEASED - CLONE REPOSITORY FOR DOCS</b></u>

Version 2 is almost ready! 

- Rewritten in Typescript
- See [CHANGELOG.md](https://github.com/jisotalo/ads-client/blob/v2-dev/CHANGELOG.md) for details.
- See [MIGRATION.md](https://github.com/jisotalo/ads-client/blob/v2-dev/MIGRATION.md) for guide of migrating v1 -> v2 (breaking changes!)
- See the new [documentation](TODO-DOC-URL-HERE/classes/Client.html)

# Features
- Supports TwinCAT 2 and 3
- Supports any kind of target systems with ADS protocol (local runtime, PLC, EtherCAT I/O...)
- Supports multiple connections from the same host
- Reading and writing any kind of variables
- Subscribing to variable value changes (ADS notifications)
- Automatic conversion between PLC and Javascript objects
- Calling function block methods (RPC)
- Automatic 32/64 bit variable support (PVOID, XINT, etc.)
- Automatic byte alignment support (all pack-modes automatically supported)

# Table of contents
- [Support](#support)
- [Installing](#installing)
- [Connection setup](#connection-setup)
  - [Setup 1 - Connect from Windows](#setup-1---connect-from-windows)
  - [Setup 2 - Connect from Linux/Windows](#setup-2---connect-from-linuxwindows)
  - [Setup 3 - Connect from any Node.js system](#setup-3---connect-from-any-nodejs-system)
  - [Setup 4 - Connect from local system](#setup-4---connect-from-local-system)
  - [Setup 5 - Docker container](#setup-5---docker-container)
- [Important](#important)
  - [Enabling localhost support on TwinCAT 3](#enabling-localhost-support-on-twincat-3)
  - [Structured variables](#structured-variables)
  - [Connecting to targets without a PLC runtime](#connecting-to-targets-without-a-plc-runtime)
  - [Differences when using with TwinCAT 2](#differences-when-using-with-twincat-2)
- [Getting started](#getting-started)
  - [Documentation](#documentation)
  - [Available methods](#available-methods)
  - [Creating a client](#creating-a-client)
  - [Connecting](#connecting)
  - [Reading values](#reading-values)
    - [Reading any value](#reading-any-value)
    - [Reading raw data](#reading-raw-data)
    - [Reading reference/pointer](#reading-referencepointer)
  - [Writing values](#writing-values)
    - [Writing any value](#writing-any-value)
    - [Writing raw data](#writing-raw-data)
    - [Writing reference/pointer](#writing-referencepointer)
  - [Subscribing to value changes](#subscribing-to-value-changes)
    - [Any value](#any-value)
    - [Raw data](#raw-data)
    - [Unsubscribing](#unsubscribing)
  - [Using variable handles](#using-variable-handles)
  - [Calling function block RPC methods](#calling-function-block-rpc-methods)
  - [Converting from/to raw data](#converting-fromto-raw-data)
  - [Other features](#other-features)
  - [Disconnecting](#disconnecting)
  - [FAQ](#faq)
    - [Lot's of connection issues and timeouts](#lots-of-connection-issues-and-timeouts)
    - [Getting `TypeError: Do not know how to serialize a BigInt`](#getting-typeerror-do-not-know-how-to-serialize-a-bigint)
    - [Can I connect from Raspberry Pi to TwinCAT?](#can-i-connect-from-raspberry-pi-to-twincat)
    - [Receiving ADS error 1808 `Symbol not found` even when it should be found](#receiving-ads-error-1808-symbol-not-found-even-when-it-should-be-found)
    - [Having timeouts or 'mailbox is full' errors](#having-timeouts-or-mailbox-is-full-errors)
    - [Having problems to connect from OSX or Raspberry Pi to target PLC](#having-problems-to-connect-from-osx-or-raspberry-pi-to-target-plc)
    - [A data type is not found even when it should be](#a-data-type-is-not-found-even-when-it-should-be)
    - [ClientException: Connection failed: Device system manager state read failed](#clientexception-connection-failed-device-system-manager-state-read-failed)
    - [Connection failed (error EADDRNOTAVAIL)](#connection-failed-error-eaddrnotavail)
    - [Problems running ads-client with docker](#problems-running-ads-client-with-docker)
    - [How to connect to PLC that is in CONFIG mode?](#how-to-connect-to-plc-that-is-in-config-mode)
    - [Issues with TwinCAT 2 low-end devices (BK9050, BC9050 etc.)](#issues-with-twincat-2-low-end-devices-bk9050-bc9050-etc)
  - [External links](#external-links)
  - [Library testing](#library-testing)
    - [TwinCAT 3 tests](#twincat-3-tests)
    - [TwinCAT 2 tests](#twincat-2-tests)
- [License](#license)


# Support

* Bugs and feature requests: 
  * [Github Issues](https://github.com/jisotalo/ads-client/issues)
* Help, support and discussion: 
  * [Github Discussions](https://github.com/jisotalo/ads-client/discussions)

If you want to support my work, you can buy me a coffee! Contact for more options. 

<a href="https://www.buymeacoffee.com/jisotalo" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

[![Donate](https://img.shields.io/badge/Donate-PayPal-yellow)](https://www.paypal.com/donate/?business=KUWBXXCVGZZME&no_recurring=0&currency_code=EUR)

If you need help with integrating the ads-client, I'm available for coding work with invoicing. Contact for further details. 

# Installing

Install the [npm package](https://www.npmjs.com/package/ads-client):

```
npm install ads-client@beta
```

Include the module in your code:

```js
//Javascript:
const { Client } = require('ads-client');

//Typescript:
import { Client } from 'ads-client';
```

You can also clone the repository and run `npm run build`. After that, the library is available at `./dist/`

# Connection setup

The ads-client can be used with multiple system configurations.

[![ads-client-setups](https://user-images.githubusercontent.com/13457157/82724547-8dde0800-9cdf-11ea-8dd1-0a1f06f8559f.PNG)](https://user-images.githubusercontent.com/13457157/82724547-8dde0800-9cdf-11ea-8dd1-0a1f06f8559f.PNG)


## Setup 1 - Connect from Windows

This is the most common scenario. The client is running on a Windows PC that has TwinCAT Router installed (such as development laptop, Beckhoff IPC/PC, Beckhoff PLC).

**Requirements:**
- Client has one of the following installed
  - TwinCAT XAE (dev. environment)
  - TwinCAT XAR (runtime)
  - [TwinCAT ADS](https://www.beckhoff.com/en-en/products/automation/twincat/tc1xxx-twincat-3-base/tc1000.html)
- An ADS route is created between the client and the PLC using TwinCAT router

**Client settings:**

```js
const client = new Client({
  targetAmsNetId: '192.168.1.120.1.1', //AmsNetId of the target PLC
  targetAdsPort: 851,
});
```

## Setup 2 - Connect from Linux/Windows

In this scenario, the client is running on Linux or Windows without TwinCAT Router. The .NET based router can be run separately on the same machine.

**Requirements:**
- Client has .NET runtime installed
- Client has [AdsRouterConsoleApp](https://github.com/Beckhoff/TF6000_ADS_DOTNET_V5_Samples/tree/main/Sources/RouterSamples/AdsRouterConsoleApp) or similar running
- An ADS route is created between the client and the PLC (see [AdsRouterConsoleApp](https://github.com/Beckhoff/TF6000_ADS_DOTNET_V5_Samples/tree/main/Sources/RouterSamples/AdsRouterConsoleApp) docs)

**Client settings:**

```js
const client = new Client({
  targetAmsNetId: '192.168.1.120.1.1', //AmsNetId of the target PLC
  targetAdsPort: 851,
});
```

## Setup 3 - Connect from any Node.js system

In this scenario, the client is running on a machine that has no router running (no TwinCAT router and no 3rd party router). For example, Raspberry Pi without any additional installations.

In this setup, the client directly connects to the PLC and uses its TwinCAT router for communication. Only one simultaneous connection from the client is possible.

**Requirements:**
- Target system (PLC) firewall has TCP port 48898 open
  - Windows Firewall might block, make sure Ethernet connection is handled as "private"
- Local AmsNetId and ADS port are set manually
  - Used `localAmsNetId` is not already in use
  - Used `localAdsPort` is not already in use
- An ADS route is configured to the PLC (see blow)

**Setting up the route:**

1. At the PLC, open `C:\TwinCAT\3.1\Target\StaticRoutes.xml`
2. Copy paste the following under  `<RemoteConnections>`

```xml
<Route>
  <Name>UI</Name>
  <Address>192.168.1.10</Address>
  <NetId>192.168.1.10.1.1</NetId>
  <Type>TCP_IP</Type>
  <Flags>64</Flags>
</Route>
```

3. Edit `Address` to IP address of the client (which runs the Node.js app), such as `192.168.1.10`
4. Edit `NetId` to any unused AmsNetId address, such as `192.168.1.10.1.1`
5. Restart PLC

**Client settings:**

```js
const client = new Client({
  localAmsNetId: '192.168.1.10.1.1',  //Same as Address in PLC's StaticRoutes.xml (see above)
  localAdsPort: 32750,                //Can be anything that is not used
  targetAmsNetId: '192.168.1.120.1.1',//AmsNetId of the target PLC
  targetAdsPort: 851,
  routerAddress: '192.168.1.120',     //PLC IP address
  routerTcpPort: 48898                
});
```

**See also:**
* [Issue #51](https://github.com/jisotalo/ads-client/issues/51#issuecomment-758016428)

## Setup 4 - Connect from local system

In this scenario, the PLC is running Node.js app locally. For example, the development PC or Beckhoff PLC with a screen for HMI.

**Requirements:**
- AMS router TCP loopback enabled (see [Enabling localhost support](#enabling-localhost-support))
  - Should be already enabled in TwinCAT versions >= 4024.5.

**Client settings:**

```js
const client = new Client({
  targetAmsNetId: '127.0.0.1.1.1', //or 'localhost'
  targetAdsPort: 851,
});
```

## Setup 5 - Docker container

It's also possible to run the client in a docker containers, also with a separate router (Linux systems).

I'm available for coding work if you need help with this. See [Supporting](#supporting)

# Important 

## Enabling localhost support on TwinCAT 3

If connecting to the local TwinCAT runtime (Node.js and PLC on the same machine), the ADS router TCP loopback feature has to be enabled.

TwinCAT 4024.5 and newer already have this enabled as default.

1. Open registery edition (`regedit`)
2. Navigate to

```
32 bit operating system:
  HKEY_LOCAL_MACHINE\SOFTWARE\Beckhoff\TwinCAT3\System\

64 bit it operating system:
  HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Beckhoff\TwinCAT3\System\
```

3. Create new DWORD registery named `EnableAmsTcpLoopback` with value of `1`
4. Restart
  
![ads-client-tcp-loopback](https://user-images.githubusercontent.com/13457157/82748398-2640bf00-9daa-11ea-98e5-0032b3537969.png)

Now you can connect to the localhost using `targetAmsNetId` address of `127.0.0.1.1.1` or `localhost`.

## Structured variables

When writing structured variables, the object properties are handled case-insensitively. This is because the TwinCAT is case-insensitive.

In practice, it means that the following objects are equal when passed to `writevalue()` or `convertToRaw()`:

```js
{
  sometext: 'hello',
  somereal: 3.14
}
```

```js
{
  SOmeTEXT: 'hello',
  SOMEreal: 3.14
}
```

If there are multiple properties with the same name (in case-insensitive manner), the client selects probably the first one (the selection is done by `Object.find()`):

```js
//In this case, probably the first one (sometext) is selected and the SOMEtext is skipped.
{
  sometext: 'hello',
  SOMEtext: 'good day'
}
```

## Connecting to targets without a PLC runtime

Usually the `ads-client` is used to connect to a PLC runtime. Howevever, it's also possible to connect to any device supporting ADS protocol, such as

* TwinCAT system service
* I/O devices (EtherCAT, K-bus etc.)
* [ads-server](https://github.com/jisotalo/ads-server) instances

As default, the client assumes that there should be a PLC runtime. This causes errors with non-PLC systems, as different PLC related things are initialized.
```
Connection failed - failed to set PLC connection. If target is not PLC runtime, use setting "rawClient". If system is in config mode or there is no PLC software yet, you might want to use setting "allowHalfOpen".
```

By using the `rawClient` setting, the client allows raw connections to any ADS supported system.

```js
const client = new Client({
  targetAmsNetId: '192.168.5.131.3.1', 
  targetAdsPort: 1002,
  rawClient: true // <-- NOTE
})
```

Note that when the `rawclient` setting is set, the client only connects to the target. All other background features, such as monitoring system state, PLC symbol version or connection issues, are not available.


## Differences when using with TwinCAT 2

* ADS port for first the PLC runtime is 801 instead of 851

```js
const client = new ads.Client({
  targetAmsNetId: '...', 
  targetAdsPort: 801 //<-- NOTE
});
```

* All variable and data type names are in UPPERCASE

This might cause problems if your app is used with both TC2 & TC3 systems.

![image](https://user-images.githubusercontent.com/13457157/86540055-96df0d80-bf0a-11ea-8f94-7e04515213c2.png)


* Global variables are accessed with dot (`.`) prefix (without the GVL name)
 
```js
await client.readSymbol('GVL_Test.ExampleSTRUCT') //TwinCAT 3
await client.readSymbol('.ExampleSTRUCT') //TwinCAT 2
```

* ENUMs are always numeric values only

* Empty structs and function blocks (without members) can't be read

# Getting started

## Documentation

The documentation is available at [https://jisotalo.fi/ads-client](TODO-DOC-URL-HERE/classes/Client.html) and `./docs` folder.

Examples in the getting started are based on a PLC project from [https://github.com/jisotalo/ads-client-test-plc-project](https://github.com/jisotalo/ads-client-test-plc-project).

You can use the test PLC project as reference together with the [ads-client.test.js](https://github.com/jisotalo/ads-client/blob/master/test/TC3/ads-client.test.js) to see and try out all available features.

## Available methods

Click a method to open it's documentation.

| Method                                                                                           | Description                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`cacheDataTypes()`](TODO-DOC-URL-HERE/classes/Client.html#cacheDataTypes)                       | Caches all data types from the target PLC runtime.                                                                                                                               |
| [`cacheSymbols()`](TODO-DOC-URL-HERE/classes/Client.html#cacheSymbols)                           | Caches all symbols from the target PLC runtime.                                                                                                                                  |
| [`connect()`](TODO-DOC-URL-HERE/classes/Client.html#connect)                                     | Connects to the target.                                                                                                                                                          |
| [`convertFromRaw()`](TODO-DOC-URL-HERE/classes/Client.html#convertFromRaw)                       | Converts raw data to a Javascript object by using the provided data type.                                                                                                        |
| [`convertToRaw()`](TODO-DOC-URL-HERE/classes/Client.html#convertToRaw)                           | Converts a Javascript object to raw data by using the provided data type.                                                                                                        |
| [`createVariableHandle()`](TODO-DOC-URL-HERE/classes/Client.html#createVariableHandle)           | Creates a handle to a variable at the target system by variable path  (such as `GVL_Test.ExampleStruct`).                                                                        |
| [`createVariableHandleMulti()`](TODO-DOC-URL-HERE/classes/Client.html#createVariableHandleMulti) | Sends multiple `createVariableHandle()` commands in one ADS packet (ADS sum command).                                                                                            |
| [`deleteVariableHandle()`](TODO-DOC-URL-HERE/classes/Client.html#deleteVariableHandle)           | Deletes a variable handle that was previously created using `createVariableHandle()`.                                                                                            |
| [`deleteVariableHandleMulti()`](TODO-DOC-URL-HERE/classes/Client.html#deleteVariableHandleMulti) | Sends multiple `deleteVariableHandle()` commands in one ADS packet (ADS sum command).                                                                                            |
| [`disconnect()`](TODO-DOC-URL-HERE/classes/Client.html#disconnect)                               | Disconnects from the target and closes active connection.                                                                                                                        |
| [`getDataType()`](TODO-DOC-URL-HERE/classes/Client.html#getDataType)                             | Returns full data type declaration for requested data type (such as `ST_Struct`).                                                                                                |
| [`getDataTypes()`](TODO-DOC-URL-HERE/classes/Client.html#getDataTypes)                           | Returns all target PLC runtime data types.                                                                                                                                       |
| [`getDefaultPlcObject()`](TODO-DOC-URL-HERE/classes/Client.html#getDefaultPlcObject)             | Returns a default (empty) Javascript object representing provided PLC data type.                                                                                                 |
| [`getSymbol()`](TODO-DOC-URL-HERE/classes/Client.html#getSymbol)                                 | Returns a symbol object for given variable path (such as `GVL_Test.ExampleStruct`).                                                                                              |
| [`getSymbols()`](TODO-DOC-URL-HERE/classes/Client.html#getSymbols)                               | Returns all symbols from the target PLC runtime.                                                                                                                                 |
| [`invokeRpcMethod()`](TODO-DOC-URL-HERE/classes/Client.html#invokeRpcMethod)                     | Invokes a function block RPC method on the target system.                                                                                                                        |
| [`readDeviceInfo()`](TODO-DOC-URL-HERE/classes/Client.html#readDeviceInfo)                       | Reads target device information.                                                                                                                                                 |
| [`readPlcRuntimeState()`](TODO-DOC-URL-HERE/classes/Client.html#readPlcRuntimeState)             | Reads target PLC runtime state (`Run`, `Stop` etc.)                                                                                                                              |
| [`readPlcSymbolVersion()`](TODO-DOC-URL-HERE/classes/Client.html#readPlcSymbolVersion)           | Reads target PLC runtime symbol version.                                                                                                                                         |
| [`readPlcUploadInfo()`](TODO-DOC-URL-HERE/classes/Client.html#readPlcUploadInfo)                 | Reads target PLC runtime upload information.                                                                                                                                     |
| [`readRaw()`](TODO-DOC-URL-HERE/classes/Client.html#readRaw)                                     | Reads raw data from the target system by a raw ADS address (index group, index offset and data length).                                                                          |
| [`readRawByHandle()`](TODO-DOC-URL-HERE/classes/Client.html#readRawByHandle)                     | Reads raw data from the target system by a previously created variable handle (acquired using `createVariableHandle()`).                                                         |
| [`readRawByPath()`](TODO-DOC-URL-HERE/classes/Client.html#readRawByPath)                         | Reads raw data from the target system by variable path (such as `GVL_Test.ExampleStruct`).                                                                                       |
| [`readRawBySymbol()`](TODO-DOC-URL-HERE/classes/Client.html#readRawBySymbol)                     | Reads raw data from the target system by a symbol object (acquired using `getSymbol()`).                                                                                         |
| [`readRawMulti()`](TODO-DOC-URL-HERE/classes/Client.html#readRawMulti)                           | Sends multiple `readRaw()` commands in one ADS packet (ADS sum command).                                                                                                         |
| [`readState()`](TODO-DOC-URL-HERE/classes/Client.html#readState)                                 | Reads target ADS state.                                                                                                                                                          |
| [`readTcSystemState()`](TODO-DOC-URL-HERE/classes/Client.html#readTcSystemState)                 | Reads target TwinCAT system state from ADS port 10000 (usually `Run` or `Config`).                                                                                               |
| [`readValue()`](TODO-DOC-URL-HERE/classes/Client.html#readValue)                                 | Reads variable's value from the target system by a variable path (such as `GVL_Test.ExampleStruct`) and returns the value as a Javascript object.                                |
| [`readValueBySymbol()`](TODO-DOC-URL-HERE/classes/Client.html#readValueBySymbol)                 | Reads variable's value from the target system by a symbol object (acquired using `getSymbol()`) and returns the value as a Javascript object.                                    |
| [`readWriteRaw()`](TODO-DOC-URL-HERE/classes/Client.html#readWriteRaw)                           | Writes raw data to the target system by a raw ADS address (index group, index offset) and reads the result as raw data.                                                          |
| [`readWriteRawMulti()`](TODO-DOC-URL-HERE/classes/Client.html#readWriteRawMulti)                 | Sends multiple `readWriteRaw()` commands in one ADS packet (ADS sum command).                                                                                                    |
| [`reconnect()`](TODO-DOC-URL-HERE/classes/Client.html#reconnect)                                 | Reconnects to the target (disconnects and then connects again).                                                                                                                  |
| [`resetPlc()`](TODO-DOC-URL-HERE/classes/Client.html#resetPlc)                                   | Resets the target PLC runtime. Same as reset cold in TwinCAT XAE.                                                                                                                |
| [`restartPlc()`](TODO-DOC-URL-HERE/classes/Client.html#restartPlc)                               | Restarts the PLC runtime. Same as calling `resetPlc()` and then `startPlc()`.                                                                                                    |
| [`restartTcSystem()`](TODO-DOC-URL-HERE/classes/Client.html#restartTcSystem)                     | Restarts the target TwinCAT system.                                                                                                                                              |
| [`sendAdsCommand()`](TODO-DOC-URL-HERE/classes/Client.html#sendAdsCommand)                       | Sends a raw ADS command to the target.                                                                                                                                           |
| [`setDebugLevel()`](TODO-DOC-URL-HERE/classes/Client.html#setDebugLevel)                         | Sets active debug level.                                                                                                                                                         |
| [`setTcSystemToConfig()`](TODO-DOC-URL-HERE/classes/Client.html#setTcSystemToConfig)             | Sets the target TwinCAT system to config mode. Same as `Restart TwinCAT (Config mode)` in TwinCAT XAE.                                                                           |
| [`setTcSystemToRun()`](TODO-DOC-URL-HERE/classes/Client.html#setTcSystemToRun)                   | Sets the target TwinCAT system to run mode. Same as `Restart TwinCAT system` in TwinCAT XAE.                                                                                     |
| [`startPlc()`](TODO-DOC-URL-HERE/classes/Client.html#startPlc)                                   | Starts the target PLC runtime. Same as pressing the green play button in TwinCAT XAE.                                                                                            |
| [`stopPlc()`](TODO-DOC-URL-HERE/classes/Client.html#stopPlc)                                     | Stops the target PLC runtime. Same as pressing the red stop button in TwinCAT XAE.                                                                                               |
| [`subscribe()`](TODO-DOC-URL-HERE/classes/Client.html#subscribe)                                 | Subscribes to value change notifications (ADS notifications) by variable path (such as `GVL_Test.ExampleStruct`) or raw ADS address (index group, index offset and data length). |
| [`subscribeRaw()`](TODO-DOC-URL-HERE/classes/Client.html#subscribeRaw)                           | Subscribes to raw value change notifications (ADS notifications) by a raw ADS address (index group, index offset and data length).                                               |
| [`subscribeValue()`](TODO-DOC-URL-HERE/classes/Client.html#subscribeValue)                       | Subscribes to value change notifications (ADS notifications) by a variable path, such as `GVL_Test.ExampleStruct`.                                                               |
| [`unsubscribe()`](TODO-DOC-URL-HERE/classes/Client.html#unsubscribe)                             | Unsubscribes a subscription (deletes ADS notification).                                                                                                                          |
| [`unsubscribeAll()`](TODO-DOC-URL-HERE/classes/Client.html#unsubscribeAll)                       | Unsubscribes all active subscription (deletes all ADS notifications).                                                                                                            |
| [`writeControl()`](TODO-DOC-URL-HERE/classes/Client.html#writeControl)                           | Sends an ADS `WriteControl` command to the target.                                                                                                                               |
| [`writeRaw()`](TODO-DOC-URL-HERE/classes/Client.html#writeRaw)                                   | Writes raw data to the target system by a raw ADS address (index group, index offset and data length).                                                                           |
| [`writeRawByHandle()`](TODO-DOC-URL-HERE/classes/Client.html#writeRawByHandle)                   | Writes raw data to the target system by a previously created variable handle (acquired using `createVariableHandle()`).                                                          |
| [`writeRawByPath()`](TODO-DOC-URL-HERE/classes/Client.html#writeRawByPath)                       | Writes raw data to the target system by variable path (such as `GVL_Test.ExampleStruct`).                                                                                        |
| [`writeRawBySymbol()`](TODO-DOC-URL-HERE/classes/Client.html#writeRawBySymbol)                   | Writes raw data to the target system by a symbol object (acquired using `getSymbol()`).                                                                                          |
| [`writeRawMulti()`](TODO-DOC-URL-HERE/classes/Client.html#writeRawMulti)                         | Sends multiple `writeRaw()` commands in one ADS packet (ADS sum command).                                                                                                        |
| [`writeValue()`](TODO-DOC-URL-HERE/classes/Client.html#writeValue)                               | Writes variable's value to the target system by a variable path (such as `GVL_Test.ExampleStruct`). Converts the value from a Javascript object to a raw value.                  |
| [`writeValueBySymbol()`](TODO-DOC-URL-HERE/classes/Client.html#writeValueBySymbol)               | Writes variable's value to the target system by a symbol object (acquired using `getSymbol()`). Converts the value from a Javascript object to a raw value.                      |






## Creating a client

Settings are passed via the [`Client`](https://jisotalo.fi/ads-client/classes/Client.html) constructor. The following settings are mandatory:
- [`targetAmsNetId`](https://jisotalo.fi/ads-client/interfaces/AdsClientSettings.html#targetAmsNetId) - Target runtime AmsNetId
- [`targetAdsPort`](https://jisotalo.fi/ads-client/interfaces/AdsClientSettings.html#targetAdsPort) - Target runtime ADS port

See other settings from the [`AdsClientSettings` documentation](https://jisotalo.fi/ads-client/interfaces/AdsClientSettings.html).

```js
const client = new Client({
  targetAmsNetId: "localhost",
  targetAdsPort: 851
});
```

## Connecting

It's a good practice to start a connection at startup and keep it open until the app is closed. 
If there are connection issues or the PLC software is updated, the client will handle everything automatically.


```js
const { Client } = require('ads-client');

const client = new Client({
  targetAmsNetId: 'localhost',
  targetAdsPort: 851
})

client.connect()
  .then(res => {   
    console.log(`Connected to the ${res.targetAmsNetId}`)
    console.log(`Router assigned us AmsNetId ${res.localAmsNetId} and port ${res.localAdsPort}`)

  }).catch(err => {
    console.log('Error:', err)
  });
```

## Reading values

### Reading any value

Use [`readValue()`](TODO-DOC-URL-HERE/classes/Client.html#readValue) to read any PLC value as a Javascript object. If using Typescript, the type of the PLC variable can be passed as well (`readValue<T>()`).

The only exception is the dereferenced value of a reference/pointer, see [Reading reference/pointer](#reading-referencepointer).

```js
try {
  let res;

  //Example: INT
  res = await client.readValue('GVL_Read.StandardTypes.INT_');
  console.log(res.value); 
  // 32767

  //Example: STRING
  res = await client.readValue('GVL_Read.StandardTypes.STRING_');
  console.log(res.value); 
  // A test string ääöö!!@@

  //Example: DT
  res = await client.readValue('GVL_Read.StandardTypes.DT_');
  console.log(res.value); 
  // 2106-02-06T06:28:15.000Z (Date object)
  
  //Example: STRUCT
  res = await client.readValue('GVL_Read.ComplexTypes.STRUCT_');
  console.log(res.value); 
  /* 
  {
    BOOL_: true,
    BOOL_2: false,
    BYTE_: 255,
    WORD_: 65535,
    //...and so on
  }
  */
  
  //Example: FUNCTION_BLOCK
  res = await client.readValue('GVL_Read.ComplexTypes.BLOCK_2'); //TON
  console.log(res.value); 
  // { IN: false, PT: 2500, Q: false, ET: 0, M: false, StartTime: 0 }

  //Example: ARRAY
  res = await client.readValue('GVL_Read.StandardArrays.REAL_3');
  console.log(res.value); 
  // [ 75483.546875, 0, -75483.546875 ]

  //Example: ENUM
  res = await client.readValue('GVL_Read.ComplexTypes.ENUM_');
  console.log(res.value); 
  // { name: 'Running', value: 100 }

} catch (err) {
 console.log("Error:", err);
}
```

**Typescript example**:

```ts
let res;

//Example: INT
res = await client.readValue<number>('GVL_Read.StandardTypes.INT_');
console.log(res.value); //res.value is typed as number
// 32767

//Example: STRUCT
interface ST_ComplexTypes {
  BOOL_: boolean,
  BOOL_2: boolean,
  BYTE_: number,
  WORD_: number,
  //..and so on
}

res = await client.readValue<ST_ComplexTypes>('GVL_Read.ComplexTypes.STRUCT_');
console.log(res.value); //res.value is typed as ST_ComplexTypes
/* 
{
  BOOL_: true,
  BOOL_2: false,
  BYTE_: 255,
  WORD_: 65535,
  //..and so on
}
*/
```

### Reading raw data

Use [`readRaw()`](TODO-DOC-URL-HERE/classes/Client.html#readRaw) to read any PLC value as raw data. Raw data is a `Buffer` object, containing the data as bytes.

The only exception is the dereferenced value of a reference/pointer, see [Reading reference/pointer](#reading-referencepointer).

The `indexGroup` and `indexOffset` can be acquired for example by using [`getSymbol()`](TODO-DOC-URL-HERE/classes/Client.html#getSymbol).

```js
try {
  //Example: Reading raw data by index offset and index group 
  //and converting it to a Javascript object manually
  const data = await client.readRaw(16448, 414816, 2);
  console.log(data); //<Buffer ff 7f>

  const converted = await client.convertFromRaw(data, 'INT');
  console.log(converted); //32767

} catch (err) {
  console.log("Error:", err);
}
```

[`readRawByPath()`](TODO-DOC-URL-HERE/classes/Client.html#readRawByPath) can be used to read raw data by a variable path.

```js
try {
  //Example: Reading raw data by variable path 
  //and converting it to a Javascript object manually
  const data = await client.readRawByPath('GVL_Read.StandardTypes.INT_');
  console.log(data); //<Buffer ff 7f>

  const converted = await client.convertFromRaw(data, 'INT');
  console.log(converted); //32767

} catch (err) {
  console.log("Error:", err);
}
```

### Reading reference/pointer

The dereferenced value of a reference (`REFERENCE TO`) or a pointer (`POINTER TO`)  can be read 
using [`readRawByPath()`](TODO-DOC-URL-HERE/classes/Client.html#readRawByPath).

```js
try {
  //Reading a raw POINTER value (Note the dereference operator ^)
  const rawPtrValue = await client.readRawByPath('GVL_Read.ComplexTypes.POINTER_^');

  //Converting to a Javascript object
  const ptrValue = await client.convertFromRaw(rawPtrValue, 'ST_StandardTypes');
  console.log(ptrValue);

  //Reading a raw REFERENCE value
  const rawRefValue = await client.readRawByPath('GVL_Read.ComplexTypes.REFERENCE_');
  
  //Converting to a Javascript object
  const refValue = await client.convertFromRaw(rawRefValue, 'ST_StandardTypes');
  console.log(refValue);

  //Short version:
  const refValue2 = await client.convertFromRaw(
    await client.readRawByPath('GVL_Read.ComplexTypes.REFERENCE_'), 
    'ST_StandardTypes'
  );

} catch (err) {
  console.log("Error:", err);
}
```

Another way is to use [variable handles](TODO-DOC-URL-HERE/classes/Client.html#createVariableHandle).

```js
try {
  //Reading a POINTER value (Note the dereference operator ^)
  const ptrHandle = await client.createVariableHandle('GVL_Read.ComplexTypes.POINTER_^');
  const rawPtrValue = await client.readRawByHandle(ptrHandle);
  await client.deleteVariableHandle(ptrHandle);

  //Converting to a Javascript object
  const ptrValue = await client.convertFromRaw(rawPtrValue, 'ST_StandardTypes');
  console.log(ptrValue);

  //Reading a REFERENCE value
  const refHandle = await client.createVariableHandle('GVL_Read.ComplexTypes.REFERENCE_');
  const rawRefValue = await client.readRawByHandle(refHandle);
  await client.deleteVariableHandle(refHandle);

  //Converting to a Javascript object
  const refValue = await client.convertFromRaw(rawRefValue, 'ST_StandardTypes');
  console.log(refValue);

} catch (err) {
  console.log("Error:", err);
}
```

## Writing values

### Writing any value

Use [`writeValue()`](TODO-DOC-URL-HERE/classes/Client.html#writeValue) to write any PLC value. 

The only exception is the dereferenced value of a reference/pointer, see [Writing reference/pointer](#writing-referencepointer).

```js
try {
  //Example: INT
  await client.writeValue('GVL_Write.StandardTypes.INT_', 32767);

  //Example: STRING
  await client.writeValue('GVL_Write.StandardTypes.STRING_', 'This is a test');
  
  //Example: DT
  await client.writeValue('GVL_Write.StandardTypes.DT_', new Date());

  //Example: STRUCT (all properties)
  await client.writeValue('GVL_Write.ComplexTypes.STRUCT_', {
    BOOL_: true,
    BOOL_2: false,
    BYTE_: 255,
    WORD_: 65535,
    //...and so on
  });

  //Example: STRUCT (only some properties)
  await client.writeValue('GVL_Write.ComplexTypes.STRUCT_', {
    WORD_: 65535
  }, true); //<-- NOTE: autoFill set

  //Example: FUNCTION_BLOCK (all properties)
  await client.writeValue('GVL_Write.ComplexTypes.BLOCK_2', {
    IN: false, 
    PT: 2500, 
    Q: false, 
    ET: 0, 
    M: false, 
    StartTime: 0
  });

  //Example: FUNCTION_BLOCK (only some properties)
  await client.writeValue('GVL_Write.ComplexTypes.BLOCK_2', {
    IN: true
  }, true); //<-- NOTE: autoFill set

  //Example: ARRAY
  await client.writeValue('GVL_Write.StandardArrays.REAL_3', [
    75483.546875, 
    0, 
    -75483.546875
  ]);

  //Example: ENUM
  res = await client.writeValue('GVL_Write.ComplexTypes.ENUM_', 'Running');
  //...or...
  res = await client.writeValue('GVL_Write.ComplexTypes.ENUM_', 100);

} catch (err) {
 console.log("Error:", err);
}
```

### Writing raw data

Use [`writeRaw()`](TODO-DOC-URL-HERE/classes/Client.html#writeRaw) to write any PLC value using raw data. Raw data is a `Buffer` object, containing the data as bytes.

The only exception is the dereferenced value of a reference/pointer, see [Reading reference/pointer](#reading-referencepointer).

The `indexGroup` and `indexOffset` can be acquired for example by using [`getSymbol()`](TODO-DOC-URL-HERE/classes/Client.html#getSymbol).

```js
try {
  //Example: Writing a INT variable by index offset and index group using raw data
  const data = await client.convertToRaw(32767, 'INT');
  console.log(data); //<Buffer ff 7f>

  await client.writeRaw(16448, 414816, data);

} catch (err) {
  console.log("Error:", err);
}
```

[`writeRawByPath()`](TODO-DOC-URL-HERE/classes/Client.html#writeRawByPath) can be used to write raw data by a variable path.

```js
try {
  //Example: Writing a INT variable by its variable path using raw data
  const data = await client.convertToRaw(32767, 'INT');
  console.log(data); //<Buffer ff 7f>

  await client.writeRawByPath('GVL_Write.StandardTypes.INT_', data);

} catch (err) {
  console.log("Error:", err);
}
```

### Writing reference/pointer

The dereferenced value of a reference (`REFERENCE TO`) or a pointer (`POINTER TO`) can be written
using [`writeRawByPath()`](TODO-DOC-URL-HERE/classes/Client.html#writeRawByPath).

```js
try {
  //Writing a POINTER value
  const ptrValue = {...} //some value
  const rawPtrValue = await client.convertToRaw(ptrValue, 'ST_StandardTypes');

  await client.writeRawByPath('GVL_Write.ComplexTypes.POINTER_^', rawPtrValue);

  //Writing a REFERENCE value  
  const refValue = {...} //some value
  const rawRefValue = await client.convertToRaw(refValue, 'ST_StandardTypes');
  await client.writeRawByPath('GVL_Write.ComplexTypes.REFERENCE_', rawRefValue);

} catch (err) {
  console.log("Error:", err);
}
```

Another way is to use [variable handles](TODO-DOC-URL-HERE/classes/Client.html#createVariableHandle).

```js
try {
  //Writing a POINTER value (Note the dereference operator ^)
  const ptrValue = {...} //some value
  const rawPtrValue = await client.convertToRaw(ptrValue, 'ST_StandardTypes');

  const ptrHandle = await client.createVariableHandle('GVL_Write.ComplexTypes.POINTER_^');
  await client.writeRawByHandle(ptrHandle, rawPtrValue);
  await client.deleteVariableHandle(ptrHandle);

  //Writing a REFERENCE value
  const refValue = {...} //some value
  const rawRefValue = await client.convertToRaw(refValue, 'ST_StandardTypes');

  const refHandle = await client.createVariableHandle('GVL_Write.ComplexTypes.REFERENCE_');
  await client.writeRawByHandle(refHandle, rawRefValue);
  await client.deleteVariableHandle(refHandle);

} catch (err) {
  console.log("Error:", err);
}
```

## Subscribing to value changes

In ads-client, subscriptions are used to handle ADS notifications.

By subscribing to a variable value changes, the target system (PLC) will send ADS notifications when the value changes (or every x milliseconds). The client then receives these notifications and calls the callback function with the latest value.

More information about ADS notifications at [Beckhoff Infosys: Use of ADS Notifications](https://infosys.beckhoff.com/content/1033/tc3_ads.net/9407523595.html?id=431879546285476216).

### Any value

Use [`subscribeValue()`](TODO-DOC-URL-HERE/classes/Client.html#subscribeValue) or [`subscribe()`](TODO-DOC-URL-HERE/classes/Client.html#subscribe) to subscribe to PLC variable value changes.

Example: Subscribe to changes of `GVL_Subscription.NumericValue_10ms`. The callback is called when the PLC value changes (at maximum every 100 milliseconds).
```js
try {
  const sub = await client.subscribeValue(
    'GVL_Subscription.NumericValue_10ms',
    (data, subscription) => {
      console.log(`Value of ${subscription.symbol.name} has changed: ${data.value}`);
    },
    100
  );

} catch (err) {
  console.log("Error:", err);
}
```

Example: Subscribe to value of `GVL_Subscription.NumericValue_1000ms`. The callback is called with the latest value every 100 milliseconds (changed or not).

```js
try {
  const valueChanged = (data, subscription) => {
    console.log(`Value of ${subscription.symbol.name}: ${data.value}`);
  }

  const sub = await client.subscribeValue(
    'GVL_Subscription.NumericValue_1000ms',
    valueChanged,
    100,
    false
  );

} catch (err) {
  console.log("Error:", err);
}
```

Example: Same as previous example but using [`subscribe()`](TODO-DOC-URL-HERE/classes/Client.html#subscribe) and Typescript type for the variable value. A type can be provided for `subscribeValue<T>()` as well.

```js
//NOTE: Typescript
try {
  const valueChanged = (data, subscription) => {
    //data.value is typed as "number" instead of "any" (see subscribe() call below)
    console.log(`Value of ${subscription.symbol.name}: ${data.value}`);
  }

  const sub = await client.subscribe<number>({
    target: 'GVL_Subscription.NumericValue_1000ms',
    callback: valueChanged,
    cycleTime: 100,
    sendOnChange: false
  });

} catch (err) {
  console.log("Error:", err);
}
```

### Raw data

Use [`subscribeRaw()`](TODO-DOC-URL-HERE/classes/Client.html#subscribeRaw) or [`subscribe()`](TODO-DOC-URL-HERE/classes/Client.html#subscribe) to subscribe to raw value changes.

The `indexGroup` and `indexOffset` can be acquired for example by using [`getSymbol()`](TODO-DOC-URL-HERE/classes/Client.html#getSymbol).

Example: Subscribe to raw address of `indexGroup` = 16448, `indexOffset` = 414816 and `size` = 2 bytes.
  
```js
try {
  await client.subscribeRaw(16448, 414816, 2, (data, subscription) => {
    console.log(`Value has changed: ${data.value.toString('hex')}`);
  }, 100);

} catch (err) {
  console.log("Error:", err);
}
```

Same using [`subscribe()`](TODO-DOC-URL-HERE/classes/Client.html#subscribe):
```js
try {
  await client.subscribe({
    target: {
      indexGroup: 16448,
      indexOffset: 414816,
      size: 2
    },
    callback: (data, subscription) => {
      console.log(`Value has changed: ${data.value.toString('hex')}`);
    },
    cycleTime: 100
  });

} catch (err) {
  console.log("Error:", err);
}
```

### Unsubscribing

Subscriptions should always be cancelled when no longer needed (to save PLC resources). Use [`unsubscribe()`](TODO-DOC-URL-HERE/classes/Client.html#unsubscribe) or subscription object's [`ActiveSubscription.unsubscribe()`](TODO-DOC-URL-HERE/interfaces/ActiveSubscription.html#unsubscribe) to unsubscribe.

```js
const sub = await client.subscribeValue(...);

//Later when no longer needed
await sub.unsubscribe();
//or await client.unsubscribe(sub);
```

## Using variable handles

Variable handles are another alternative to read and write raw data.

A handle is created to a specific PLC variable and after that, read and write operations are available.
There is no need to use `indexGroup` or `indexOffset`.

Handles should always be deleted after no longer needed, as the PLC has limited number of handles.
However, it's a perfectly valid practice to keep the handles open as long as needed.

Handles can also be used to read/write reference and pointer values, see [Reading reference/pointer](#reading-referencepointer).

### Reading a value using a variable handle

```js
//Creating a handle
const handle = await client.createVariableHandle('GVL_Read.StandardTypes.INT_');

//Reading a value
const data = await client.readRawByHandle(handle);

//Deleting the handle
await client.deleteVariableHandle(handle);

//Converting to a Javascript value
const converted = await client.convertFromRaw(data, 'INT');
console.log(data); //<Buffer ff 7f>
console.log(converted); //32767
```

### Writing a value using a variable handle

```js
//Creating a raw value
const data = await client.convertToRaw(32767, 'INT');
console.log(data); //<Buffer ff 7f>

//Creating a handle
const handle = await client.createVariableHandle('GVL_Write.StandardTypes.INT_');

//Writing the value
await client.writeRawByHandle(handle, data);

//Deleting the handle
await client.deleteVariableHandle(handle);
```

## Calling function block RPC methods

If a function block method has pragma `{attribute 'TcRpcEnable'}`, the method can be called from ads-client.

Read more at [Beckhoff Infosys: Attribute 'TcRpcEnable'](https://infosys.beckhoff.com/english.php?content=../content/1033/tc3_plc_intro/7145472907.html).

### Things to note when using RPC Methods

- Do not use online change if you change RPC method parameters or return data types
- Make sure that parameters and return value have no pack-mode pragmas defined, otherwise data might be corrupted
- Do not use `ARRAY` values directly in parameters or return value, encapsulate arrays inside struct and use the struct instead
- The feature isn't well documented by Bechkhoff, so there might be some things that aren't taken into account

### Simple RPC method example

### RPC methods with structs

## Converting from/to raw data

README in progress.

## Other features

README in progress.

## Disconnecting

After the client is no more used, always use [`disconnect()`](TODO-DOC-URL-HERE/classes/Client.html#disconnect) to release all subscription handles and other resources.

```js
await client.disconnect();
```

## FAQ 

### Lot's of connection issues and timeouts
Things to try: 
- Remove all TwinCAT routes and create them again (yes, really)
- Increase value of [`timeoutDelay`](TODO-DOC-URL-HERE/interfaces/AdsClientSettings.html#timeoutDelay) setting
- Cache all data types and symbols straight after connecting using [`cacheDataTypes`](TODO-DOC-URL-HERE/classes/Client.html#cacheDataTypes) and [`cacheSymbols`](TODO-DOC-URL-HERE/classes/Client.html#cacheSymbols)

### Getting `TypeError: Do not know how to serialize a BigInt`
- `JSON.stringify` doesn't understand BigInt values (such as `LINT` or similar 64 bit PLC values)
- Check [this Github issue](https://github.com/GoogleChromeLabs/jsbi/issues/30#issuecomment-953187833) for a patch
  - `BigInt.prototype.toJSON = function() { return this.toString() }`

### Can I connect from Raspberry Pi to TwinCAT?

Yes, for example using [Setup 3 - Connect from any Node.js system](#setup-3---connect-from-any-nodejs-system).
1. Open a TCP port 48898 from your PLC
2. Edit `StaticRoutes.xml` file from your PLC
3. Connect from the Raspberry Pi using the PLC IP address as `routerAddress` and the AmsNetID written to `StaticRoutes.xml` as `localAmsNetId`

### Receiving ADS error 1808 `Symbol not found` even when it should be found

- Make sure you have updated the latest PLC software using *download*. Sometimes online change causes this.
- If you are using TwinCAT 2, see chapter [Differences when using with TwinCAT 2](#differences-when-using-with-twincat-2)

### Having timeouts or 'mailbox is full' errors

- The AMS router is capable of handling only limited number of requests in a certain time. 
- Other possible reason is that operating system TCP window is full because of large number of requests.
- Solution: 
  - Use structs or arrays to send data in larger packets 
  - Try raw/multi commands to decrease data usage

### Having problems to connect from OSX or Raspberry Pi to target PLC

- You need to connect to the PLC AMS router instead
- See [this issue comment](https://github.com/jisotalo/ads-client/issues/51#issuecomment-758016428)

### A data type is not found even when it should be

If you use methods like `convertFromRaw()` and `getDataType()` but receive an error similar to `ClientException: Finding data type *data type* failed`, make sure you have really written the data type correctly.

For example, when copying a variable name from TwinCAT online view using CTRL+C, it might not work:
- Displayed name: `ARRAY [0..1, 0..1] OF ST_Example`
- The value copied to clipboard `ARRAY [0..1, 0..1] OF ST_Example`
- --> **This causes error!**
- The real data type name that needs to be used is `ARRAY [0..1,0..1] OF ST_Example` (note no whitespace between array dimensions)

If you have problems, try to read the symbol object using `getSymbol()`. The final solution is to read all data types using `getDataTypes()` and manually finding the correct type.

### ClientException: Connection failed: Device system manager state read failed

- The `targetAmsNetId` didn't contain a system manager service (port `10000`)
- The target is not a PLC and `rawClient` setting is not set
- Solution:
  - Double-check connection settings
  - [Use `rawClient` setting ](#connecting-to-targets-without-a-plc-runtime)

### Connection failed (error EADDRNOTAVAIL)
This could happen if you have manually provided `localAddress` or `localTcpPort` that don't exist.
For example, setting `localAddress` to `192.168.10.1` when the computer has only ethernet interface with IP `192.168.1.1`.

See also https://github.com/jisotalo/ads-client/issues/82

### Problems running ads-client with docker

- EADDRNOTAVAIL: See above and https://github.com/jisotalo/ads-client/issues/82

### How to connect to PLC that is in CONFIG mode?
As default, the ads-client checks if the target has PLC runtime at given port. However, when target system manager is at config mode, there is none. The client will throw an error during connecting:

`Connection failed - failed to set PLC connection. If target is not PLC runtime, use setting "rawClient". If system is in config mode or there is no PLC software yet, you might want to use setting "allowHalfOpen"`

You can disable the check by providing setting `allowHalfOpen: true`. After that, it's possible to start the PLC by `setTcSystemToRun()`.

Another option is to use setting `rawClient: true` - see [Connecting to targets without a PLC runtime](#connecting-to-targets-without-a-plc-runtime).

### Issues with TwinCAT 2 low-end devices (BK9050, BC9050 etc.)
* You can only use raw commands (such as `readRaw()`, `writeRaw()`, `subscribeRaw()`) as these devices provide no symbols
* See [issue 114](https://github.com/jisotalo/ads-client/issues/114) and [issue 116](https://github.com/jisotalo/ads-client/issues/116)



## External links

README in progress.

## Library testing

All features of this library are tested using quite large test suite - see `./test/` directory. 
This prevents regression, thus updating the ads-client should be always safe.

There are separate tests for TwinCAT 2 and TwinCAT 3.

PLC projects for running test suites are located in the following repository:
[https://github.com/jisotalo/ads-client-test-plc-project/tree/v2-dev](https://github.com/jisotalo/ads-client-test-plc-project/tree/v2-dev).

### TwinCAT 3 tests

Tests are run with command `npm run test-tc3`. TwinCAT 3 test PLC projects needs to be running in the target system.

**Results 28.09.2024:**

<details>
<summary>Click to show test results</summary>
<pre>
  PASS  test/TC3/ads-client.test.js (24.801 s)
  √ IMPORTANT NOTE: This test requires running a specific TwinCAT 3 PLC project (https://github.com/jisotalo/ads-client-test-plc-project) (1 ms)                                                                                                                        
  connection
    √ client is not connected at beginning (1 ms)                                                                                   
    √ checking ads client settings (1 ms)                                                                                           
    √ connecting to the target (41 ms)                                                                                              
    √ checking that test PLC project is active (13 ms)                                                                              
    √ checking that test PLC project version is correct (10 ms)                                                                     
    √ checking 32/64 bitness (4 ms)                                                                                                 
    √ caching of symbols and data types                                                                                             
    √ reconnecting (34 ms)                                                                                                          
  resetting PLC to original state                                                                                                   
    √ resetting PLC (514 ms)                                                                                                        
    √ checking that reset was successful (8 ms)                                                                                     
    √ checking that PLC is not running (11 ms)                                                                                      
    √ setting IsReset to false (6 ms)                                                                                               
    √ starting PLC (7 ms)                                                                                                           
    √ checking that test PLC project is running (505 ms)                                                                            
  testing PLC runtime stop, start, restart                                                                                          
    √ stopping PLC (15 ms)                                                                                                          
    √ starting PLC (14 ms)                                                                                                          
    √ restarting PLC (528 ms)                                                                                                       
  system state, PLC runtime states and device information                                                                           
    √ reading TwinCAT system state (5 ms)                                                                                           
    √ reading PLC runtime (port 851) state (3 ms)                                                                                   
    √ reading PLC runtime (port 852) state (3 ms)                                                                                   
    √ reading PLC runtime device info (3 ms)                                                                                        
    √ reading TwinCAT system device info (5 ms)                                                                                     
    √ reading PLC runtime symbol version (4 ms)                                                                                     
  symbols and data types                                                                                                            
    √ reading upload info (4 ms)                                                                                                    
    √ reading all symbols (16 ms)                                                                                                   
    √ reading single symbol information (1 ms)                                                                                      
    √ reading all data type information (19 ms)                                                                                     
    √ reading single data type information (2 ms)                                                                                   
  data conversion                                                                                                                   
    √ converting a raw PLC value to a Javascript variable (4 ms)                                                                    
    √ converting a Javascript value to a raw PLC value (40 ms)                                                                      
  reading values                                                                                                                    
    reading standard values                                                                                                         
      √ reading BOOL (16 ms)                                                                                                        
      √ reading BYTE (8 ms)                                                                                                         
      √ reading WORD (9 ms)                                                                                                         
      √ reading DWORD (7 ms)                                                                                                        
      √ reading SINT (15 ms)                                                                                                        
      √ reading USINT (7 ms)                                                                                                        
      √ reading INT (14 ms)                                                                                                         
      √ reading UINT (7 ms)                                                                                                         
      √ reading DINT (13 ms)                                                                                                        
      √ reading UDINT (7 ms)                                                                                                        
      √ reading REAL (31 ms)                                                                                                        
      √ reading STRING (16 ms)                                                                                                      
      √ reading DATE (7 ms)                                                                                                         
      √ reading DT (14 ms)                                                                                                          
      √ reading TOD (16 ms)                                                                                                         
      √ reading TIME (8 ms)                                                                                                         
      √ reading LWORD (8 ms)                                                                                                        
      √ reading LINT (13 ms)                                                                                                        
      √ reading ULINT (7 ms)                                                                                                        
      √ reading LREAL (31 ms)                                                                                                       
      √ reading WSTRING (16 ms)                                                                                                     
      √ reading LDATE (---- TODO: Needs TC 3.1.4026 ----)                                                                           
      √ reading LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                                      
      √ reading LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                                            
      √ reading LTIME (9 ms)                                                                                                        
    reading standard array values                                                                                                   
      √ reading ARRAY OF BOOL (14 ms)                                                                                               
      √ reading ARRAY OF BYTE (8 ms)                                                                                                
      √ reading ARRAY OF WORD (9 ms)                                                                                                
      √ reading ARRAY OF DWORD (8 ms)                                                                                               
      √ reading ARRAY OF SINT (13 ms)                                                                                               
      √ reading ARRAY OF USINT (7 ms)                                                                                               
      √ reading ARRAY OF INT (13 ms)                                                                                                
      √ reading ARRAY OF UINT (8 ms)                                                                                                
      √ reading ARRAY OF DINT (16 ms)                                                                                               
      √ reading ARRAY OF UDINT (7 ms)                                                                                               
      √ reading ARRAY OF REAL (31 ms)                                                                                               
      √ reading ARRAY OF STRING (15 ms)                                                                                             
      √ reading ARRAY OF DATE (8 ms)                                                                                                
      √ reading ARRAY OF DT (15 ms)                                                                                                 
      √ reading ARRAY OF TOD (14 ms)                                                                                                
      √ reading ARRAY OF TIME (5 ms)                                                                                                
      √ reading ARRAY OF LWORD (8 ms)                                                                                               
      √ reading ARRAY OF LINT (16 ms)                                                                                               
      √ reading ARRAY OF ULINT (7 ms)                                                                                               
      √ reading ARRAY OF LREAL (26 ms)                                                                                              
      √ reading ARRAY OF WSTRING (13 ms)                                                                                            
      √ reading ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----)                                                                  
      √ reading ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)                                                                    
      √ reading ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                                   
      √ reading ARRAY OF LTIME (6 ms)                                                                                               
    reading complex values                                                                                                          
      √ reading STRUCT (14 ms)                                                                                                      
      √ reading ALIAS (7 ms)                                                                                                        
      √ reading ENUM (44 ms)                                                                                                        
      √ reading POINTER (address) (8 ms)                                                                                            
      √ reading SUBRANGE (8 ms)                                                                                                     
      √ reading UNION (22 ms)                                                                                                       
      √ reading FUNCTION_BLOCK (28 ms)                                                                                              
      √ reading INTERFACE (8 ms)                                                                                                    
    reading complex array values                                                                                                    
      √ reading ARRAY OF STRUCT (19 ms)                                                                                             
      √ reading ARRAY OF ALIAS (9 ms)                                                                                               
      √ reading ARRAY OF ENUM (38 ms)                                                                                               
      √ reading ARRAY OF POINTER (address) (6 ms)                                                                                   
      √ reading ARRAY OF SUBRANGE (6 ms)                                                                                            
      √ reading ARRAY OF UNION (8 ms)                                                                                               
      √ reading ARRAY OF FUNCTION_BLOCK (27 ms)                                                                                     
      √ reading ARRAY OF INTERFACE (6 ms)                                                                                           
    reading special types / cases                                                                                                   
      √ reading ARRAY with negative index (9 ms)                                                                                    
      √ reading multi-dimensional ARRAY (9 ms)                                                                                      
      √ reading ARRAY OF ARRAY (7 ms)                                                                                               
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (8 ms)                                                           
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (8 ms)                                                           
      √ reading an empty FUNCTION_BLOCK (7 ms)                                                                                      
      √ reading an empty STRUCT (8 ms)                                                                                              
      √ reading an empty ARRAY (9 ms)                                                                                               
      √ reading a single BIT (15 ms)                                                                                                
      √ reading a struct with BIT types (8 ms)                                                                                      
    reading dereferenced POINTER and REFERENCE values                                                                               
      √ reading POINTER (value) (8 ms)                                                                                              
      √ reading REFERENCE (value) (5 ms)                                                                                            
    reading raw data                                                                                                                
      √ reading a raw value (4 ms)                                                                                                  
      √ reading a raw value using symbol (3 ms)                                                                                     
      √ reading a raw value using path (4 ms)                                                                                       
      √ reading multiple raw values (multi/sum command) (5 ms)                                                                      
    reading (misc)                                                                                                                  
      √ reading a value using symbol (3 ms)                                                                                         
  writing values                                                                                                                    
    writing standard values                                                                                                         
      √ writing BOOL (22 ms)                                                                                                        
      √ writing BYTE (12 ms)                                                                                                        
      √ writing WORD (12 ms)                                                                                                        
      √ writing DWORD (12 ms)                                                                                                       
      √ writing SINT (24 ms)                                                                                                        
      √ writing USINT (10 ms)                                                                                                       
      √ writing INT (23 ms)                                                                                                         
      √ writing UINT (11 ms)                                                                                                        
      √ writing DINT (25 ms)                                                                                                        
      √ writing UDINT (11 ms)                                                                                                       
      √ writing REAL (46 ms)                                                                                                        
      √ writing STRING (21 ms)                                                                                                      
      √ writing DATE (11 ms)                                                                                                        
      √ writing DT (22 ms)                                                                                                          
      √ writing TOD (22 ms)                                                                                                         
      √ writing TIME (11 ms)                                                                                                        
      √ writing LWORD (7 ms)                                                                                                        
      √ writing LINT (24 ms)                                                                                                        
      √ writing ULINT (9 ms)                                                                                                        
      √ writing LREAL (44 ms)                                                                                                       
      √ writing WSTRING (22 ms)                                                                                                     
      √ writing LDATE (---- TODO: Needs TC 3.1.4026 ----)                                                                           
      √ writing LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                                      
      √ writing LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                                            
      √ writing LTIME (7 ms)                                                                                                        
    writing standard array values                                                                                                   
      √ writing ARRAY OF BOOL (24 ms)                                                                                               
      √ writing ARRAY OF BYTE (13 ms)                                                                                               
      √ writing ARRAY OF WORD (12 ms)                                                                                               
      √ writing ARRAY OF DWORD (13 ms)                                                                                              
      √ writing ARRAY OF SINT (22 ms)                                                                                               
      √ writing ARRAY OF USINT (12 ms)                                                                                              
      √ writing ARRAY OF INT (19 ms)                                                                                                
      √ writing ARRAY OF UINT (11 ms)                                                                                               
      √ writing ARRAY OF DINT (22 ms)                                                                                               
      √ writing ARRAY OF UDINT (12 ms)                                                                                              
      √ writing ARRAY OF REAL (44 ms)                                                                                               
      √ writing ARRAY OF STRING (23 ms)                                                                                             
      √ writing ARRAY OF DATE (11 ms)                                                                                               
      √ writing ARRAY OF DT (20 ms)                                                                                                 
      √ writing ARRAY OF TOD (22 ms)                                                                                                
      √ writing ARRAY OF TIME (11 ms)                                                                                               
      √ writing ARRAY OF LWORD (12 ms)                                                                                              
      √ writing ARRAY OF LINT (21 ms)
      √ writing ARRAY OF ULINT (12 ms)                                                                                              
      √ writing ARRAY OF LREAL (46 ms)                                                                                              
      √ writing ARRAY OF WSTRING (22 ms)                                                                                            
      √ writing ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                           
      √ writing ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                             
      √ writing ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                                   
      √ writing ARRAY OF LTIME (10 ms)                                                                                              
    writing complex values                                                                                                          
      √ writing STRUCT (26 ms)                                                                                                      
      √ writing ALIAS (11 ms)                                                                                                       
      √ writing ENUM (49 ms)                                                                                                        
      √ writing POINTER (address) (14 ms)                                                                                           
      √ writing SUBRANGE (17 ms)                                                                                                    
      √ writing UNION (46 ms)                                                                                                       
      √ writing FUNCTION_BLOCK (46 ms)                                                                                              
      √ writing INTERFACE (13 ms)                                                                                                   
    writing complex array values                                                                                                    
      √ writing ARRAY OF STRUCT (24 ms)                                                                                             
      √ writing ARRAY OF ALIAS (10 ms)                                                                                              
      √ writing ARRAY OF ENUM (57 ms)                                                                                               
      √ writing ARRAY OF POINTER (address) (12 ms)                                                                                  
      √ writing ARRAY OF SUBRANGE (11 ms)                                                                                           
      √ writing ARRAY OF UNION (16 ms)                                                                                              
      √ writing ARRAY OF FUNCTION_BLOCK (48 ms)                                                                                     
      √ writing ARRAY OF INTERFACE (16 ms)                                                                                          
    writing special types / cases                                                                                                   
      √ writing ARRAY with negative index (14 ms)                                                                                   
      √ writing multi-dimensional ARRAY (15 ms)                                                                                     
      √ writing ARRAY OF ARRAY (16 ms)                                                                                              
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '1'} (14 ms)                                                          
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '8'} (16 ms)                                                          
      √ writing an empty FUNCTION_BLOCK (8 ms)                                                                                      
      √ writing an empty STRUCT (7 ms)                                                                                              
      √ writing an empty ARRAY (7 ms)                                                                                               
      √ writing a single BIT (36 ms)                                                                                                
      √ writing a struct with BIT types (11 ms)                                                                                     
    writing dereferenced POINTER and REFERENCE values                                                                               
      √ writing POINTER (value) (22 ms)                                                                                             
      √ writing REFERENCE (value) (23 ms)                                                                                           
    writing raw data                                                                                                                
      √ writing a raw value (6 ms)                                                                                                  
      √ writing a raw value using symbol (7 ms)                                                                                     
      √ writing a raw value using path (11 ms)                                                                                      
      √ writing multiple raw values (multi/sum command) (20 ms)                                                                     
    writing (misc)                                                                                                                  
      √ writing a value using symbol (8 ms)                                                                                         
  variable handles                                                                                                                  
    √ creating and deleting a varible handle (14 ms)                                                                                
    √ reading value using a variable handle (12 ms)                                                                                 
    √ writing value using a variable handle (30 ms)                                                                                 
    √ creating and deleting multiple varible handles (multi/sum command) (9 ms)                                                     
  subscriptions (ADS notifications)                                                                                                 
    √ subscribing and unsubscribing successfully (2033 ms)                                                                          
    √ subscribing to a changing value (10 ms) with default cycle time (3023 ms)                                                     
    √ subscribing to a changing value (10 ms) with 10 ms cycle time (28 ms)                                                         
    √ subscribing to a constant value with maximum delay of 2000 ms (2016 ms)                                                       
    √ subscribing to a raw ADS address (222 ms)                                                                                     
    √ subscribing using subscribeValue() (2030 ms)                                                                                  
    √ subscribing to a raw ADS address using subscribeRaw() (219 ms)                                                                
  remote procedure calls (RPC methods)                                                                                              
    √ calling a RPC method (13 ms)                                                                                                  
    √ calling a RPC method with struct parameters (9 ms)                                                                            
    √ calling a RPC method without return value and without parameters (11 ms)                                                      
  miscellaneous                                                                                                                     
    √ sending read write ADS command (6 ms)                                                                                         
    √ sending multiple read write ADS commands (multi/sum command) (12 ms)                                                          
  issue specific tests                                                                                                              
    issue 103 (https://github.com/jisotalo/ads-client/issues/103)                                                                   
      √ calling unsubscribeAll() multiple times (should not crash to unhandled exception) (50 ms)                                   
  disconnecting                                                                                                                     
    √ disconnecting client (9 ms)                                                                                                   
  controlling TwinCAT system service                                                                                                
    √ connecting (1 ms)                                                                                                             
    √ setting TwinCAT system to config (4024 ms)                                                                                    
    √ setting TwinCAT system to run (4018 ms)                                                                                       
    √ disconnecting (2 ms)                                                                                                          
  handling unknown/stale ADS notifications                                                                                          
    √ connecting (27 ms)                                                                                                            
    √ creating an unknown notification handle by forced disconnecting (1040 ms)                                                     
    √ deleting an unknown notification handle automatically (1034 ms)                                                               
    √ disconnecting (1 ms)                                                                                                          
                                                                                                                                    
Test Suites: 1 passed, 1 total                                                                                                      
Tests:       223 passed, 223 total                                                                                                  
Snapshots:   0 total
Time:        24.889 s, estimated 25 s
Ran all test suites matching /TC3\\ads-client.test.js/i.
</pre>
</details>

### TwinCAT 2 tests

Tests are run with command `npm run test-tc2`. TwinCAT 2 test PLC projects needs to be running in the target system.

TwinCAT 2 tests only have features that are supported by TC2.

**Results 28.09.2024:**

<details>
<summary>Click to show test results</summary>
<pre>
 PASS  test/TC2/ads-client.test.js (26.971 s)
  √ IMPORTANT NOTE: This test requires running a specific TwinCAT 2 PLC project (https://github.com/jisotalo/ads-client-test-plc-project)                                                                                                                               
  connection
    √ client is not connected at beginning                                                                                          
    √ checking ads client settings                                                                                                  
    √ connecting to the target (35 ms)                                                                                              
    √ checking that test PLC project is active (58 ms)                                                                              
    √ checking that test PLC project version is correct (9 ms)                                                                      
    √ checking 32/64 bitness (2 ms)                                                                                                 
    √ caching of symbols and data types (1 ms)                                                                                      
    √ reconnecting (22 ms)                                                                                                          
  resetting PLC to original state                                                                                                   
    √ resetting PLC (507 ms)                                                                                                        
    √ checking that reset was successful (5 ms)                                                                                     
    √ checking that PLC is not running (8 ms)                                                                                       
    √ setting IsReset to false (3 ms)                                                                                               
    √ starting PLC (5 ms)                                                                                                           
    √ checking that test PLC project is running (506 ms)                                                                            
  testing PLC runtime stop, start, restart                                                                                          
    √ stopping PLC (13 ms)                                                                                                          
    √ starting PLC (10 ms)                                                                                                          
    √ restarting PLC (523 ms)                                                                                                       
  system state, PLC runtime states and device information                                                                           
    √ reading TwinCAT system state (2 ms)                                                                                           
    √ reading PLC runtime (port 801) state (2 ms)                                                                                   
    √ reading PLC runtime device info (2 ms)                                                                                        
    √ reading TwinCAT system device info (2 ms)                                                                                     
    √ reading PLC runtime symbol version (2 ms)                                                                                     
  symbols and data types                                                                                                            
    √ reading upload info (2 ms)                                                                                                    
    √ reading all symbols (15 ms)                                                                                                   
    √ reading single symbol information                                                                                             
    √ reading all data type information (33 ms)                                                                                     
    √ reading single data type information (9 ms)                                                                                   
  data conversion                                                                                                                   
    √ converting a raw PLC value to a Javascript variable (7 ms)                                                                    
    √ converting a Javascript value to a raw PLC value (41 ms)                                                                      
  reading values                                                                                                                    
    reading standard values                                                                                                         
      √ reading BOOL (12 ms)                                                                                                        
      √ reading BYTE (6 ms)                                                                                                         
      √ reading WORD (6 ms)                                                                                                         
      √ reading DWORD (7 ms)                                                                                                        
      √ reading SINT (11 ms)
      √ reading USINT (7 ms)                                                                                                        
      √ reading INT (11 ms)                                                                                                         
      √ reading UINT (7 ms)                                                                                                         
      √ reading DINT (13 ms)                                                                                                        
      √ reading UDINT (6 ms)                                                                                                        
      √ reading REAL (19 ms)                                                                                                        
      √ reading STRING (10 ms)                                                                                                      
      √ reading DATE (4 ms)                                                                                                         
      √ reading DT (9 ms)                                                                                                           
      √ reading TOD (8 ms)                                                                                                          
      √ reading TIME (6 ms)                                                                                                         
      √ reading LREAL (26 ms)                                                                                                       
    reading standard array values                                                                                                   
      √ reading ARRAY OF BOOL (9 ms)                                                                                                
      √ reading ARRAY OF BYTE (5 ms)                                                                                                
      √ reading ARRAY OF WORD (5 ms)                                                                                                
      √ reading ARRAY OF DWORD (4 ms)                                                                                               
      √ reading ARRAY OF SINT (10 ms)                                                                                               
      √ reading ARRAY OF USINT (6 ms)                                                                                               
      √ reading ARRAY OF INT (9 ms)                                                                                                 
      √ reading ARRAY OF UINT (6 ms)                                                                                                
      √ reading ARRAY OF DINT (10 ms)                                                                                               
      √ reading ARRAY OF UDINT (3 ms)                                                                                               
      √ reading ARRAY OF REAL (18 ms)                                                                                               
      √ reading ARRAY OF STRING (9 ms)                                                                                              
      √ reading ARRAY OF DATE (7 ms)                                                                                                
      √ reading ARRAY OF DT (11 ms)                                                                                                 
      √ reading ARRAY OF TOD (9 ms)                                                                                                 
      √ reading ARRAY OF TIME (4 ms)                                                                                                
      √ reading ARRAY OF LREAL (24 ms)                                                                                              
    reading complex values                                                                                                          
      √ reading STRUCT (15 ms)                                                                                                      
      √ reading ALIAS (8 ms)                                                                                                        
      √ reading ENUM (16 ms)                                                                                                        
      √ reading POINTER (address) (6 ms)                                                                                            
      √ reading SUBRANGE (6 ms)                                                                                                     
      √ reading FUNCTION_BLOCK (23 ms)                                                                                              
    reading complex array values                                                                                                    
      √ reading ARRAY OF STRUCT (12 ms)                                                                                             
      √ reading ARRAY OF ALIAS (6 ms)                                                                                               
      √ reading ARRAY OF ENUM (20 ms)                                                                                               
      √ reading ARRAY OF POINTER (address) (5 ms)                                                                                   
      √ reading ARRAY OF SUBRANGE (3 ms)                                                                                            
      √ reading ARRAY OF FUNCTION_BLOCK (22 ms)                                                                                     
    reading special types / cases                                                                                                   
      √ reading ARRAY with negative index (8 ms)                                                                                    
      √ reading multi-dimensional ARRAY (5 ms)                                                                                      
      √ reading ARRAY OF ARRAY (5 ms)                                                                                               
    reading dereferenced POINTER values                                                                                             
      √ reading POINTER (value) (5 ms)                                                                                              
    reading raw data                                                                                                                
      √ reading a raw value (3 ms)                                                                                                  
      √ reading a raw value using symbol (2 ms)                                                                                     
      √ reading a raw value using path (2 ms)                                                                                       
      √ reading multiple raw values (multi/sum command) (4 ms)                                                                      
    reading (misc)                                                                                                                  
      √ reading a value using symbol (3 ms)                                                                                         
  writing values                                                                                                                    
    writing standard values                                                                                                         
      √ writing BOOL (22 ms)                                                                                                        
      √ writing BYTE (10 ms)                                                                                                        
      √ writing WORD (8 ms)                                                                                                         
      √ writing DWORD (10 ms)                                                                                                       
      √ writing SINT (18 ms)                                                                                                        
      √ writing USINT (6 ms)                                                                                                        
      √ writing INT (16 ms)                                                                                                         
      √ writing UINT (8 ms)                                                                                                         
      √ writing DINT (13 ms)                                                                                                        
      √ writing UDINT (7 ms)                                                                                                        
      √ writing REAL (30 ms)                                                                                                        
      √ writing STRING (14 ms)                                                                                                      
      √ writing DATE (6 ms)                                                                                                         
      √ writing DT (15 ms)                                                                                                          
      √ writing TOD (15 ms)                                                                                                         
      √ writing TIME (8 ms)                                                                                                         
      √ writing LREAL (28 ms)                                                                                                       
    writing standard array values                                                                                                   
      √ writing ARRAY OF BOOL (14 ms)                                                                                               
      √ writing ARRAY OF BYTE (7 ms)                                                                                                
      √ writing ARRAY OF WORD (7 ms)                                                                                                
      √ writing ARRAY OF DWORD (9 ms)                                                                                               
      √ writing ARRAY OF SINT (13 ms)                                                                                               
      √ writing ARRAY OF USINT (7 ms)                                                                                               
      √ writing ARRAY OF INT (15 ms)                                                                                                
      √ writing ARRAY OF UINT (7 ms)                                                                                                
      √ writing ARRAY OF DINT (13 ms)                                                                                               
      √ writing ARRAY OF UDINT (9 ms)                                                                                               
      √ writing ARRAY OF REAL (25 ms)                                                                                               
      √ writing ARRAY OF STRING (17 ms)                                                                                             
      √ writing ARRAY OF DATE (7 ms)                                                                                                
      √ writing ARRAY OF DT (18 ms)                                                                                                 
      √ writing ARRAY OF TOD (18 ms)                                                                                                
      √ writing ARRAY OF TIME (10 ms)                                                                                               
      √ writing ARRAY OF LREAL (35 ms)                                                                                              
    writing complex values                                                                                                          
      √ writing STRUCT (19 ms)                                                                                                      
      √ writing ALIAS (10 ms)                                                                                                       
      √ writing ENUM (25 ms)                                                                                                        
      √ writing POINTER (address) (13 ms)                                                                                           
      √ writing SUBRANGE (12 ms)                                                                                                    
      √ writing FUNCTION_BLOCK (39 ms)                                                                                              
    writing complex array values                                                                                                    
      √ writing ARRAY OF STRUCT (24 ms)                                                                                             
      √ writing ARRAY OF ALIAS (11 ms)                                                                                              
      √ writing ARRAY OF ENUM (28 ms)                                                                                               
      √ writing ARRAY OF POINTER (address) (14 ms)                                                                                  
      √ writing ARRAY OF SUBRANGE (11 ms)                                                                                           
      √ writing ARRAY OF FUNCTION_BLOCK (48 ms)                                                                                     
    writing special types / cases                                                                                                   
      √ writing ARRAY with negative index (18 ms)                                                                                   
      √ writing multi-dimensional ARRAY (13 ms)                                                                                     
      √ writing ARRAY OF ARRAY (12 ms)                                                                                              
      √ writing an empty FUNCTION_BLOCK (7 ms)                                                                                      
    writing dereferenced POINTER and REFERENCE values                                                                               
      √ writing POINTER (value) (15 ms)                                                                                             
    writing raw data                                                                                                                
      √ writing a raw value (7 ms)                                                                                                  
      √ writing a raw value using symbol (4 ms)                                                                                     
      √ writing a raw value using path (10 ms)                                                                                      
      √ writing multiple raw values (multi/sum command) (11 ms)                                                                     
    writing (misc)                                                                                                                  
      √ writing a value using symbol (5 ms)                                                                                         
  variable handles                                                                                                                  
    √ creating and deleting a varible handle (12 ms)                                                                                
    √ reading value using a variable handle (6 ms)                                                                                  
    √ writing value using a variable handle (19 ms)                                                                                 
    √ creating and deleting multiple varible handles (multi/sum command) (5 ms)                                                     
  subscriptions (ADS notifications)                                                                                                 
    √ subscribing and unsubscribing successfully (2010 ms)                                                                          
    √ subscribing to a changing value (10 ms) with default cycle time (3018 ms)                                                     
    √ subscribing to a changing value (10 ms) with 10 ms cycle time (30 ms)                                                         
    √ subscribing to a constant value with maximum delay of 2000 ms (2010 ms)                                                       
    √ subscribing to a raw ADS address (220 ms)
    √ subscribing using subscribeValue() (2010 ms)                                                                                  
    √ subscribing to a raw ADS address using subscribeRaw() (218 ms)                                                                
  miscellaneous                                                                                                                     
    √ sending read write ADS command (7 ms)                                                                                         
    √ sending multiple read write ADS commands (multi/sum command) (10 ms)                                                          
  issue specific tests                                                                                                              
    issue 103 (https://github.com/jisotalo/ads-client/issues/103)                                                                   
      √ calling unsubscribeAll() multiple times (should not crash to unhandled exception) (28 ms)                                   
  disconnecting                                                                                                                     
    √ disconnecting client (6 ms)                                                                                                   
  controlling TwinCAT system service                                                                                                
    √ connecting (2 ms)                                                                                                             
    √ setting TwinCAT system to config (5248 ms)                                                                                    
    √ setting TwinCAT system to run (6303 ms)                                                                                       
    √ disconnecting (1 ms)                                                                                                          
  handling unknown/stale ADS notifications                                                                                          
    √ connecting (23 ms)                                                                                                            
    √ creating an unknown notification handle by forced disconnecting (1033 ms)                                                     
    √ deleting an unknown notification handle automatically (1021 ms)                                                               
    √ disconnecting (1 ms)                                                                                                          
                                                                                                                                    
Test Suites: 1 passed, 1 total
Tests:       164 passed, 164 total                                                                                                  
Snapshots:   0 total
Time:        27.056 s
Ran all test suites matching /TC2\\ads-client.test.js/i.
</pre>
</details>

# License

Licensed under [MIT License](http://www.opensource.org/licenses/MIT).

Copyright (c) Jussi Isotalo <<j.isotalo91@gmail.com>>

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
