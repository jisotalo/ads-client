# ads-client

[![npm version](https://img.shields.io/npm/v/ads-client)](https://www.npmjs.org/package/ads-client) 
[![GitHub](https://img.shields.io/badge/View%20on-GitHub-brightgreen)](https://github.com/jisotalo/ads-client)
[![License](https://img.shields.io/github/license/jisotalo/ads-client)](https://choosealicense.com/licenses/mit/)

Beckhoff TwinCAT ADS client library for Node.js (unofficial). 

Connect to a Beckhoff TwinCAT automation system using the ADS protocol from a Node.js app.

If you are using Node-RED, check out the [node-red-contrib-ads-client](https://www.npmjs.com/package/node-red-contrib-ads-client).

There is automatically created documentation available at https://jisotalo.fi/ads-client/

# Project status

14.12.2024 - version 2 released!

- Rewritten in Typescript
- See [CHANGELOG.md](https://github.com/jisotalo/ads-client/blob/master/CHANGELOG.md) for details.
- See [MIGRATION.md](https://github.com/jisotalo/ads-client/blob/master/MIGRATION.md) for guide of migrating v1 -> v2 (**breaking changes!**)
- See the new [documentation](https://jisotalo.fi/ads-client/classes/Client.html)

See [`legacy-v1` branch](https://github.com/jisotalo/ads-client/tree/legacy-v1) for previous/legacy version 1.4.4.

# Features
- Supports TwinCAT 2 and 3
- Supports connecting to the local TwinCAT 3 runtime 
- Supports any kind of target systems with ADS protocol (local runtime, PLC, EtherCAT I/O...)
- Supports multiple connections from the same host
- Reading and writing any kind of variables
- Subscribing to variable value changes (ADS notifications)
- Automatic conversion between PLC and Javascript objects
- Calling function block methods (RPC)
- Automatic 32/64 bit variable support (PVOID, XINT, etc.)
- Automatic byte alignment support (all pack-modes automatically supported)

# Table of contents
- [ads-client](#ads-client)
- [Project status](#project-status)
- [Features](#features)
- [Table of contents](#table-of-contents)
- [Support](#support)
- [Installing](#installing)
- [Minimal example (TLDR)](#minimal-example-tldr)
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
    - [Reading a value using a variable handle](#reading-a-value-using-a-variable-handle)
    - [Writing a value using a variable handle](#writing-a-value-using-a-variable-handle)
  - [Calling function block RPC methods](#calling-function-block-rpc-methods)
    - [Things to note when using RPC Methods](#things-to-note-when-using-rpc-methods)
    - [About examples](#about-examples)
    - [RPC method with standard data types](#rpc-method-with-standard-data-types)
    - [RPC method with struct](#rpc-method-with-struct)
  - [Converting data between raw data and Javascript objects](#converting-data-between-raw-data-and-javascript-objects)
    - [Converting a raw value to a Javascript object](#converting-a-raw-value-to-a-javascript-object)
    - [Converting a Javascript object to a raw value](#converting-a-javascript-object-to-a-raw-value)
  - [Other features](#other-features)
    - [ADS sum commands](#ads-sum-commands)
    - [Starting and stopping a PLC](#starting-and-stopping-a-plc)
    - [Starting and stopping TwinCAT system](#starting-and-stopping-twincat-system)
    - [Client events](#client-events)
    - [Debugging](#debugging)
  - [Disconnecting](#disconnecting)
  - [Common issues and questions](#common-issues-and-questions)
    - [There are lot's of connection issues and timeouts](#there-are-lots-of-connection-issues-and-timeouts)
    - [Getting `TypeError: Do not know how to serialize a BigInt`](#getting-typeerror-do-not-know-how-to-serialize-a-bigint)
    - [Can I connect from Raspberry Pi to TwinCAT?](#can-i-connect-from-raspberry-pi-to-twincat)
    - [Receiving ADS error 1808 `Symbol not found` even when it should be found](#receiving-ads-error-1808-symbol-not-found-even-when-it-should-be-found)
    - [Having timeouts or 'mailbox is full' errors](#having-timeouts-or-mailbox-is-full-errors)
    - [Having problems to connect from OSX or Raspberry Pi to target PLC](#having-problems-to-connect-from-osx-or-raspberry-pi-to-target-plc)
    - [A data type is not found even when it should be](#a-data-type-is-not-found-even-when-it-should-be)
    - [Connection failed - failed to set PLC connection](#connection-failed---failed-to-set-plc-connection)
    - [Connection failed (error EADDRNOTAVAIL)](#connection-failed-error-eaddrnotavail)
    - [Problems running ads-client with docker](#problems-running-ads-client-with-docker)
    - [How to connect to a PLC that is in CONFIG mode?](#how-to-connect-to-a-plc-that-is-in-config-mode)
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
npm install ads-client
```

Include the module in your code:

```js
//Javascript:
const { Client } = require('ads-client');

//Typescript:
import { Client } from 'ads-client';
```

You can also clone the repository and run `npm run build`. After that, the library is available at `./dist/`

# Minimal example (TLDR)

This connects to a local PLC runtime, reads a value, writes a value, reads it again and then disconnects. The value is a string and it's located in `GVL_Global.StringValue`.

```js
const { Client } = require('ads-client');

const client = new Client({
  targetAmsNetId: 'localhost',
  targetAdsPort: 851
});

client.connect()
  .then(async (res) => {   
    console.log(`Connected to the ${res.targetAmsNetId}`);
    console.log(`Router assigned us AmsNetId ${res.localAmsNetId} and port ${res.localAdsPort}`);

    try {
      //Reading a value
      const read = await client.readValue('GVL_Global.StringValue');
      console.log('Value read (before):', read.value); 

      //Writing a value
      await client.writeValue('GVL_Global.StringValue', 'This is a new value');

      //Reading a value
      const read2 = await client.readValue('GVL_Global.StringValue');
      console.log('Value read (after):', read2.value); 

    } catch (err) {
      console.log('Something failed:', err);
    }
    
    //Disconnecting
    await client.disconnect();
    console.log('Disconnected');

  }).catch(err => {
    console.log('Error:', err);
  });
```

# Connection setup

The ads-client can be used with multiple system configurations.

![ads-client-setups](https://github.com/jisotalo/ads-client/blob/master/img/connection_setup.png?raw=true)


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

I'm available for coding work if you need help with this. See [Support](#support)

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

The documentation is available at [https://jisotalo.fi/ads-client](https://jisotalo.fi/ads-client/classes/Client.html) and `./docs` folder.

Examples in the getting started are based on a PLC project from [https://github.com/jisotalo/ads-client-test-plc-project](https://github.com/jisotalo/ads-client-test-plc-project).

You can use the test PLC project as reference together with the [ads-client.test.js](https://github.com/jisotalo/ads-client/blob/master/test/TC3/ads-client.test.js) to see and try out all available features.

## Available methods

Click a method to open it's documentation.

| Method                                                                                                          | Description                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`cacheDataTypes()`](https://jisotalo.fi/ads-client/classes/Client.html#cacheDataTypes)                         | Caches all data types from the target PLC runtime.                                                                                                                               |
| [`cacheSymbols()`](https://jisotalo.fi/ads-client/classes/Client.html#cacheSymbols)                             | Caches all symbols from the target PLC runtime.                                                                                                                                  |
| [`connect()`](https://jisotalo.fi/ads-client/classes/Client.html#connect)                                       | Connects to the target.                                                                                                                                                          |
| [`convertFromRaw()`](https://jisotalo.fi/ads-client/classes/Client.html#convertFromRaw)                         | Converts raw data to a Javascript object by using the provided data type.                                                                                                        |
| [`convertToRaw()`](https://jisotalo.fi/ads-client/classes/Client.html#convertToRaw)                             | Converts a Javascript object to raw data by using the provided data type.                                                                                                        |
| [`createVariableHandle()`](https://jisotalo.fi/ads-client/classes/Client.html#createVariableHandle)             | Creates a handle to a variable at the target system by variable path  (such as `GVL_Test.ExampleStruct`).                                                                        |
| [`createVariableHandleMulti()`](https://jisotalo.fi/ads-client/classes/Client.html#createVariableHandleMulti)   | Sends multiple `createVariableHandle()` commands in one ADS packet (ADS sum command).                                                                                            |
| [`deleteVariableHandle()`](https://jisotalo.fi/ads-client/classes/Client.html#deleteVariableHandle)             | Deletes a variable handle that was previously created using `createVariableHandle()`.                                                                                            |
| [`deleteVariableHandleMulti()`](https://jisotalo.fi/ads-client/classes/Client.html#deleteVariableHandleMulti)   | Sends multiple `deleteVariableHandle()` commands in one ADS packet (ADS sum command).                                                                                            |
| [`disconnect()`](https://jisotalo.fi/ads-client/classes/Client.html#disconnect)                                 | Disconnects from the target and closes active connection.                                                                                                                        |
| [`getDataType()`](https://jisotalo.fi/ads-client/classes/Client.html#getDataType)                               | Returns full data type declaration for requested data type (such as `ST_Struct`).                                                                                                |
| [`getDataTypes()`](https://jisotalo.fi/ads-client/classes/Client.html#getDataTypes)                             | Returns all target PLC runtime data types.                                                                                                                                       |
| [`getDefaultPlcObject()`](https://jisotalo.fi/ads-client/classes/Client.html#getDefaultPlcObject)               | Returns a default (empty) Javascript object representing provided PLC data type.                                                                                                 |
| [`getSymbol()`](https://jisotalo.fi/ads-client/classes/Client.html#getSymbol)                                   | Returns a symbol object for given variable path (such as `GVL_Test.ExampleStruct`).                                                                                              |
| [`getSymbols()`](https://jisotalo.fi/ads-client/classes/Client.html#getSymbols)                                 | Returns all symbols from the target PLC runtime.                                                                                                                                 |
| [`invokeRpcMethod()`](https://jisotalo.fi/ads-client/classes/Client.html#invokeRpcMethod)                       | Invokes a function block RPC method on the target system.                                                                                                                        |
| [`readDeviceInfo()`](https://jisotalo.fi/ads-client/classes/Client.html#readDeviceInfo)                         | Reads target device information.                                                                                                                                                 |
| [`readPlcRuntimeState()`](https://jisotalo.fi/ads-client/classes/Client.html#readPlcRuntimeState)               | Reads target PLC runtime state (`Run`, `Stop` etc.)                                                                                                                              |
| [`readPlcSymbolVersion()`](https://jisotalo.fi/ads-client/classes/Client.html#readPlcSymbolVersion)             | Reads target PLC runtime symbol version.                                                                                                                                         |
| [`readPlcUploadInfo()`](https://jisotalo.fi/ads-client/classes/Client.html#readPlcUploadInfo)                   | Reads target PLC runtime upload information.                                                                                                                                     |
| [`readRaw()`](https://jisotalo.fi/ads-client/classes/Client.html#readRaw)                                       | Reads raw data from the target system by a raw ADS address (index group, index offset and data length).                                                                          |
| [`readRawByHandle()`](https://jisotalo.fi/ads-client/classes/Client.html#readRawByHandle)                       | Reads raw data from the target system by a previously created variable handle (acquired using `createVariableHandle()`).                                                         |
| [`readRawByPath()`](https://jisotalo.fi/ads-client/classes/Client.html#readRawByPath)                           | Reads raw data from the target system by variable path (such as `GVL_Test.ExampleStruct`).                                                                                       |
| [`readRawBySymbol()`](https://jisotalo.fi/ads-client/classes/Client.html#readRawBySymbol)                       | Reads raw data from the target system by a symbol object (acquired using `getSymbol()`).                                                                                         |
| [`readRawMulti()`](https://jisotalo.fi/ads-client/classes/Client.html#readRawMulti)                             | Sends multiple `readRaw()` commands in one ADS packet (ADS sum command).                                                                                                         |
| [`readState()`](https://jisotalo.fi/ads-client/classes/Client.html#readState)                                   | Reads target ADS state.                                                                                                                                                          |
| [`readTcSystemState()`](https://jisotalo.fi/ads-client/classes/Client.html#readTcSystemState)                   | Reads target TwinCAT system state from ADS port 10000 (usually `Run` or `Config`).                                                                                               |
| [`readValue()`](https://jisotalo.fi/ads-client/classes/Client.html#readValue)                                   | Reads variable's value from the target system by a variable path (such as `GVL_Test.ExampleStruct`) and returns the value as a Javascript object.                                |
| [`readValueBySymbol()`](https://jisotalo.fi/ads-client/classes/Client.html#readValueBySymbol)                   | Reads variable's value from the target system by a symbol object (acquired using `getSymbol()`) and returns the value as a Javascript object.                                    |
| [`readWriteRaw()`](https://jisotalo.fi/ads-client/classes/Client.html#readWriteRaw)                             | Writes raw data to the target system by a raw ADS address (index group, index offset) and reads the result as raw data.                                                          |
| [`readWriteRawMulti()`](https://jisotalo.fi/ads-client/classes/Client.html#readWriteRawMulti)                   | Sends multiple `readWriteRaw()` commands in one ADS packet (ADS sum command).                                                                                                    |
| [`reconnect()`](https://jisotalo.fi/ads-client/classes/Client.html#reconnect)                                   | Reconnects to the target (disconnects and then connects again).                                                                                                                  |
| [`resetPlc()`](https://jisotalo.fi/ads-client/classes/Client.html#resetPlc)                                     | Resets the target PLC runtime. Same as reset cold in TwinCAT XAE.                                                                                                                |
| [`restartPlc()`](https://jisotalo.fi/ads-client/classes/Client.html#restartPlc)                                 | Restarts the PLC runtime. Same as calling `resetPlc()` and then `startPlc()`.                                                                                                    |
| [`restartTcSystem()`](https://jisotalo.fi/ads-client/classes/Client.html#restartTcSystem)                       | Restarts the target TwinCAT system.                                                                                                                                              |
| [`sendAdsCommand()`](https://jisotalo.fi/ads-client/classes/Client.html#sendAdsCommand)                         | Sends a raw ADS command to the target.                                                                                                                                           |
| [`sendAdsCommandWithFallback()`](https://jisotalo.fi/ads-client/classes/Client.html#sendAdsCommandWithFallback) | Sends a raw ADS command to the target. If it fails to specific ADS error codes, sends the fallback ADS command.                                                                  |
| [`setDebugLevel()`](https://jisotalo.fi/ads-client/classes/Client.html#setDebugLevel)                           | Sets active debug level.                                                                                                                                                         |
| [`setTcSystemToConfig()`](https://jisotalo.fi/ads-client/classes/Client.html#setTcSystemToConfig)               | Sets the target TwinCAT system to config mode. Same as `Restart TwinCAT (Config mode)` in TwinCAT XAE.                                                                           |
| [`setTcSystemToRun()`](https://jisotalo.fi/ads-client/classes/Client.html#setTcSystemToRun)                     | Sets the target TwinCAT system to run mode. Same as `Restart TwinCAT system` in TwinCAT XAE.                                                                                     |
| [`startPlc()`](https://jisotalo.fi/ads-client/classes/Client.html#startPlc)                                     | Starts the target PLC runtime. Same as pressing the green play button in TwinCAT XAE.                                                                                            |
| [`stopPlc()`](https://jisotalo.fi/ads-client/classes/Client.html#stopPlc)                                       | Stops the target PLC runtime. Same as pressing the red stop button in TwinCAT XAE.                                                                                               |
| [`subscribe()`](https://jisotalo.fi/ads-client/classes/Client.html#subscribe)                                   | Subscribes to value change notifications (ADS notifications) by variable path (such as `GVL_Test.ExampleStruct`) or raw ADS address (index group, index offset and data length). |
| [`subscribeRaw()`](https://jisotalo.fi/ads-client/classes/Client.html#subscribeRaw)                             | Subscribes to raw value change notifications (ADS notifications) by a raw ADS address (index group, index offset and data length).                                               |
| [`subscribeValue()`](https://jisotalo.fi/ads-client/classes/Client.html#subscribeValue)                         | Subscribes to value change notifications (ADS notifications) by a variable path, such as `GVL_Test.ExampleStruct`.                                                               |
| [`unsubscribe()`](https://jisotalo.fi/ads-client/classes/Client.html#unsubscribe)                               | Unsubscribes a subscription (deletes ADS notification).                                                                                                                          |
| [`unsubscribeAll()`](https://jisotalo.fi/ads-client/classes/Client.html#unsubscribeAll)                         | Unsubscribes all active subscription (deletes all ADS notifications).                                                                                                            |
| [`writeControl()`](https://jisotalo.fi/ads-client/classes/Client.html#writeControl)                             | Sends an ADS `WriteControl` command to the target.                                                                                                                               |
| [`writeRaw()`](https://jisotalo.fi/ads-client/classes/Client.html#writeRaw)                                     | Writes raw data to the target system by a raw ADS address (index group, index offset and data length).                                                                           |
| [`writeRawByHandle()`](https://jisotalo.fi/ads-client/classes/Client.html#writeRawByHandle)                     | Writes raw data to the target system by a previously created variable handle (acquired using `createVariableHandle()`).                                                          |
| [`writeRawByPath()`](https://jisotalo.fi/ads-client/classes/Client.html#writeRawByPath)                         | Writes raw data to the target system by variable path (such as `GVL_Test.ExampleStruct`).                                                                                        |
| [`writeRawBySymbol()`](https://jisotalo.fi/ads-client/classes/Client.html#writeRawBySymbol)                     | Writes raw data to the target system by a symbol object (acquired using `getSymbol()`).                                                                                          |
| [`writeRawMulti()`](https://jisotalo.fi/ads-client/classes/Client.html#writeRawMulti)                           | Sends multiple `writeRaw()` commands in one ADS packet (ADS sum command).                                                                                                        |
| [`writeValue()`](https://jisotalo.fi/ads-client/classes/Client.html#writeValue)                                 | Writes variable's value to the target system by a variable path (such as `GVL_Test.ExampleStruct`). Converts the value from a Javascript object to a raw value.                  |
| [`writeValueBySymbol()`](https://jisotalo.fi/ads-client/classes/Client.html#writeValueBySymbol)                 | Writes variable's value to the target system by a symbol object (acquired using `getSymbol()`). Converts the value from a Javascript object to a raw value.                      |

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
});

client.connect()
  .then(async (res) => {   
    console.log(`Connected to the ${res.targetAmsNetId}`);
    console.log(`Router assigned us AmsNetId ${res.localAmsNetId} and port ${res.localAdsPort}`);
    //Connected

    //...

    //Disconnecting
    await client.disconnect();

  }).catch(err => {
    console.log('Error:', err);
  });
```

## Reading values

### Reading any value

Use [`readValue()`](https://jisotalo.fi/ads-client/classes/Client.html#readValue) to read any PLC value.

The only exception is the dereferenced value of a reference/pointer, see [Reading reference/pointer](#reading-referencepointer).

**Reading INT**

```js
const res = await client.readValue('GVL_Read.StandardTypes.INT_');
console.log(res.value); 
// 32767
```

**Reading STRING**

```js
const res = await client.readValue('GVL_Read.StandardTypes.STRING_');
console.log(res.value); 
// A test string ääöö!!@@
```

**Reading DT**

```js
const res = await client.readValue('GVL_Read.StandardTypes.DT_');
console.log(res.value); 
// 2106-02-06T06:28:15.000Z (Date object)
```

**Reading STRUCT**

```js
const res = await client.readValue('GVL_Read.ComplexTypes.STRUCT_');
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
```

**Reading FUNCTION_BLOCK**

```js
const res = await client.readValue('GVL_Read.ComplexTypes.BLOCK_2'); //TON
console.log(res.value); 
// { IN: false, PT: 2500, Q: false, ET: 0, M: false, StartTime: 0 }
```

**Reading ARRAY**

```js
const res = await client.readValue('GVL_Read.StandardArrays.REAL_3');
console.log(res.value); 
// [ 75483.546875, 0, -75483.546875 ]
```

**Reading ENUM**

```js
const res = await client.readValue('GVL_Read.ComplexTypes.ENUM_');
console.log(res.value); 
// { name: 'Running', value: 100 }
```

**Typescript example: Reading INT**

```ts
const res = await client.readValue<number>('GVL_Read.StandardTypes.INT_');
console.log(res.value); //res.value is typed as number
// 32767
``` 

**Typescript example: Reading STRUCT**

```ts
interface ST_ComplexTypes {
  BOOL_: boolean,
  BOOL_2: boolean,
  BYTE_: number,
  WORD_: number,
  //..and so on
}

const res = await client.readValue<ST_ComplexTypes>('GVL_Read.ComplexTypes.STRUCT_');
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

Use [`readRaw()`](https://jisotalo.fi/ads-client/classes/Client.html#readRaw) or [`readRawByPath()`](https://jisotalo.fi/ads-client/classes/Client.html#readRawByPath) to read any PLC value as raw data. The raw data in this context means received bytes (a `Buffer` object).

The only exception is the dereferenced value of a reference/pointer, see [Reading reference/pointer](#reading-referencepointer).

For converting the data between raw data and Javascript object, see [Converting data between raw data and Javascript objects](#converting-data-between-raw-data-and-javascript-objects).

**readRaw()**

The `indexGroup` and `indexOffset` can be acquired by using [`getSymbol()`](https://jisotalo.fi/ads-client/classes/Client.html#getSymbol).


```js
//Read 2 bytes from indexGroup 16448 and indexOffset 414816
const data = await client.readRaw(16448, 414816, 2);
console.log(data); //<Buffer ff 7f>
```

**readRawByPath()**

```js
const data = await client.readRawByPath('GVL_Read.StandardTypes.INT_');
console.log(data); //<Buffer ff 7f>
```


### Reading reference/pointer

The dereferenced value of a reference (`REFERENCE TO`) or a pointer (`POINTER TO`)  can be read with [`readRawByPath()`](https://jisotalo.fi/ads-client/classes/Client.html#readRawByPath) or by using [variable handles](https://jisotalo.fi/ads-client/classes/Client.html#createVariableHandle).

**Reading POINTER (readRawByPath())**

```js
//Reading a raw POINTER value (Note the dereference operator ^)
const value = await client.readRawByPath('GVL_Read.ComplexTypes.POINTER_^');

//Converting to a Javascript object
const value = await client.convertFromRaw(rawValue, 'ST_StandardTypes');
console.log(value);
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

**Reading REFERENCE (readRawByPath())**

```js
//Reading a raw REFERENCE value
const rawValue = await client.readRawByPath('GVL_Read.ComplexTypes.REFERENCE_');

//Converting to a Javascript object
const value = await client.convertFromRaw(rawValue, 'ST_StandardTypes');
console.log(value);
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

**Reading POINTER (variable handle)**

```js
//Reading a POINTER value (Note the dereference operator ^)
const handle = await client.createVariableHandle('GVL_Read.ComplexTypes.POINTER_^');
const rawValue = await client.readRawByHandle(handle);
await client.deleteVariableHandle(handle);

//Converting to a Javascript object
const value = await client.convertFromRaw(rawValue, 'ST_StandardTypes');
console.log(value);
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

**Reading REFERENCE (variable handle)**

```js
//Reading a REFERENCE value
const handle = await client.createVariableHandle('GVL_Read.ComplexTypes.REFERENCE_');
const rawValue = await client.readRawByHandle(handle);
await client.deleteVariableHandle(handle);

//Converting to a Javascript object
const value = await client.convertFromRaw(rawValue, 'ST_StandardTypes');
console.log(value);
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

## Writing values

### Writing any value

Use [`writeValue()`](https://jisotalo.fi/ads-client/classes/Client.html#writeValue) to write any PLC value. 

The only exception is the dereferenced value of a reference/pointer, see [Writing reference/pointer](#writing-referencepointer).

**Writing INT**

```js
const res = await client.writeValue('GVL_Write.StandardTypes.INT_', 32767);
console.log(res.value); 
// 32767
```

**Writing STRING**

```js
await client.writeValue('GVL_Write.StandardTypes.STRING_', 'This is a test');
```

**Writing DT**

```js
await client.writeValue('GVL_Write.StandardTypes.DT_', new Date());
```

**Writing STRUCT (all properties)**

```js
await client.writeValue('GVL_Write.ComplexTypes.STRUCT_', {
  BOOL_: true,
  BOOL_2: false,
  BYTE_: 255,
  WORD_: 65535,
  //...and so on
});
```

**Writing STRUCT (some properties only)**

All other properties will keep their values. The client reads the active value first and then makes changes.

```js
await client.writeValue('GVL_Write.ComplexTypes.STRUCT_', {
  WORD_: 65535
}, true); //<-- NOTE: autoFill set
```

**Writing FUNCTION_BLOCK (all properties)**

```js
const timerBlock = {
  IN: false, 
  PT: 2500, 
  Q: false, 
  ET: 0, 
  M: false, 
  StartTime: 0
};

await client.writeValue('GVL_Write.ComplexTypes.BLOCK_2', timerBlock);
```

**Writing FUNCTION_BLOCK (some properties only)**

All other properties will keep their values. The client reads the active value first and then makes changes.

```js
await client.writeValue('GVL_Write.ComplexTypes.BLOCK_2', {
  IN: true
}, true); //<-- NOTE: autoFill set
```

**Writing ARRAY**

```js
const data = [
  75483.546875, 
  0, 
  -75483.546875
];

await client.writeValue('GVL_Write.StandardArrays.REAL_3', data);
```

**Writing ENUM**

```js
await client.writeValue('GVL_Write.ComplexTypes.ENUM_', 'Running');
//...or...
await client.writeValue('GVL_Write.ComplexTypes.ENUM_', 100);
```

### Writing raw data

Use [`writeRaw()`](https://jisotalo.fi/ads-client/classes/Client.html#writeRaw) or [`writeRawByPath()`](https://jisotalo.fi/ads-client/classes/Client.html#writeRawByPath) to write any PLC value using raw data. The raw data in this context means bytes (a `Buffer` object).

The only exception is the dereferenced value of a reference/pointer, see [Reading reference/pointer](#reading-referencepointer).

For converting the data between raw data and Javascript object, see [Converting data between raw data and Javascript objects](#converting-data-between-raw-data-and-javascript-objects).

**writeRaw()**
```js
//Creating raw data of an INT
const data = await client.convertToRaw(32767, 'INT');
console.log(data); //<Buffer ff 7f>

//Writing the value to indexGroup 16448 and indexOffset 414816
await client.writeRaw(16448, 414816, data);
```

**writeRawByPath()**

```js
//Creating raw data of an INT
const data = await client.convertToRaw(32767, 'INT');
console.log(data); //<Buffer ff 7f>

await client.writeRawByPath('GVL_Write.StandardTypes.INT_', data);
```

### Writing reference/pointer

The dereferenced value of a reference (`REFERENCE TO`) or a pointer (`POINTER TO`) can be written
with [`writeRawByPath()`](https://jisotalo.fi/ads-client/classes/Client.html#writeRawByPath) or by using [variable handles](https://jisotalo.fi/ads-client/classes/Client.html#createVariableHandle).

**Writing POINTER (writeRawByPath())**

```js
const value = {
  BOOL_: true,
  BOOL_2: false,
  BYTE_: 255,
  WORD_: 65535,
  //...and so on
};
const rawValue = await client.convertToRaw(value, 'ST_StandardTypes');

//Writing a raw POINTER value (Note the dereference operator ^)
await client.writeRawByPath('GVL_Write.ComplexTypes.POINTER_^', rawValue);
```

**Writing REFERENCE (writeRawByPath())**

```js
const value = {
  BOOL_: true,
  BOOL_2: false,
  BYTE_: 255,
  WORD_: 65535,
  //...and so on
};
const rawValue = await client.convertToRaw(value, 'ST_StandardTypes');

//Writing a raw REFERENCE value
await client.writeRawByPath('GVL_Write.ComplexTypes.REFERENCE_', rawValue);
```

**Writing POINTER (variable handle)**

```js
const value = {
  BOOL_: true,
  BOOL_2: false,
  BYTE_: 255,
  WORD_: 65535,
  //...and so on
};
const rawValue = await client.convertToRaw(value, 'ST_StandardTypes');

//Writing a raw POINTER value (Note the dereference operator ^)
const handle = await client.createVariableHandle('GVL_Write.ComplexTypes.POINTER_^');
await client.writeRawByHandle(handle, rawValue);
await client.deleteVariableHandle(handle);
```

**Writing REFERENCE (variable handle)**

```js
const value = {
  BOOL_: true,
  BOOL_2: false,
  BYTE_: 255,
  WORD_: 65535,
  //...and so on
};
const rawValue = await client.convertToRaw(value, 'ST_StandardTypes');

//Writing a raw REFERENCE value
const handle = await client.createVariableHandle('GVL_Write.ComplexTypes.POINTER_');
await client.writeRawByHandle(handle, rawValue);
await client.deleteVariableHandle(handle);
```

## Subscribing to value changes

In ads-client, subscriptions are used to handle ADS notifications. ADS notifications are data sent by PLC automatically without request. For example, the latest value of a variable every second.

By subscribing to a variable value changes, the target system (PLC) will send ADS notifications when the value changes (or every x milliseconds). The client then receives these notifications and calls the user callback function with the latest value.

More information about ADS notifications at [Beckhoff Infosys: Use of ADS Notifications](https://infosys.beckhoff.com/content/1033/tc3_ads.net/9407523595.html?id=431879546285476216).

### Any value

Use [`subscribeValue()`](https://jisotalo.fi/ads-client/classes/Client.html#subscribeValue) or [`subscribe()`](https://jisotalo.fi/ads-client/classes/Client.html#subscribe) to subscribe to PLC variable value changes.

**Example**

Subscribing to changes of `GVL_Subscription.NumericValue_10ms`. The callback is called when the PLC value changes (at maximum every 100 milliseconds).

```js
const onValueChanged = (data, subscription) => {
  console.log(`Value of ${subscription.symbol.name} has changed: ${data.value}`);
}

const subscription = await client.subscribeValue(
  'GVL_Subscription.NumericValue_10ms',
  onValueChanged,
  100 
);
```

**Example**

Subscribing to value of `GVL_Subscription.NumericValue_1000ms`. The callback is called with the latest value every 100 milliseconds (doesn't matter if the value has changed or not).

```js
const onValueReceived = (data, subscription) => {
  console.log(`Value of ${subscription.symbol.name} is: ${data.value}`);
}

const subscription = await client.subscribeValue(
  'GVL_Subscription.NumericValue_1000ms',
  onValueReceived,
  100,
  false 
);

```

**Typescript example**

Same as previous example, but with [`subscribe()`](https://jisotalo.fi/ads-client/classes/Client.html#subscribe) instead. A type can be provided for `subscribeValue<T>()` as well.

```js
const subscription = await client.subscribe<number>({
  target: 'GVL_Subscription.NumericValue_1000ms',
  callback: (data, subscription) => {
    //data.value is typed as "number" instead of "any"
    console.log(`Value of ${subscription.symbol.name} is: ${data.value}`);
  },
  cycleTime: 100,
  sendOnChange: false
});
```

### Raw data

Use [`subscribeRaw()`](https://jisotalo.fi/ads-client/classes/Client.html#subscribeRaw) or [`subscribe()`](https://jisotalo.fi/ads-client/classes/Client.html#subscribe) to subscribe to raw value changes.

The `indexGroup` and `indexOffset` can be acquired by using [`getSymbol()`](https://jisotalo.fi/ads-client/classes/Client.html#getSymbol).

**Example**

Subscribing to raw address of `indexGroup` = 16448 and `indexOffset` = 414816 (2 bytes).
  
```js
await client.subscribeRaw(16448, 414816, 2, (data, subscription) => {
  console.log(`Value has changed: ${data.value.toString('hex')}`);
}, 100);
```

**Example**

Same as previous example, but with [`subscribe()`](https://jisotalo.fi/ads-client/classes/Client.html#subscribe) instead.

```js
const onValueChanged = (data, subscription) => {
  console.log(`Value has changed: ${data.value.toString('hex')}`);
}

await client.subscribe({
  target: {
    indexGroup: 16448,
    indexOffset: 414816,
    size: 2
  },
  callback: onValueChanged,
  cycleTime: 100
});
```

### Unsubscribing

Subscriptions should always be cancelled when no longer needed (to save PLC resources). 

To unsubscribe, use [`unsubscribe()`](https://jisotalo.fi/ads-client/classes/Client.html#unsubscribe) or subscription object's [`ActiveSubscription.unsubscribe()`](https://jisotalo.fi/ads-client/interfaces/ActiveSubscription.html#unsubscribe).

```js
const subscription = await client.subscribeValue(...);

//Later when no longer needed
await subscription.unsubscribe();

//Or alternatively
await client.unsubscribe(subscription);
```

## Using variable handles

Using variable handles is an another way to read and write raw data.

First, a handle is created to a specific PLC variable by the variable path. After that, read and write operations are available.

Handles should always be deleted after no longer needed, as the PLC has limited number of handles.

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

If a function block method has pragma `{attribute 'TcRpcEnable'}`, 
the method can be called from ads-client.

Read more at [Beckhoff Infosys: Attribute 'TcRpcEnable'](https://infosys.beckhoff.com/english.php?content=../content/1033/tc3_plc_intro/7145472907.html).

### Things to note when using RPC Methods

These are my own observations.

- Do not use online change if you change RPC method parameters or return data types
- Make sure that parameters and return value have no pack-mode pragmas defined, otherwise data might be corrupted
- Do not use `ARRAY` values directly in parameters or return value, encapsulate arrays inside struct and use the struct instead
- The feature isn't well documented by Beckhoff, so there might be some things that aren't taken into account

### About examples

These examples use `FB_RPC` from the test PLC project at [https://github.com/jisotalo/ads-client-test-plc-project](https://github.com/jisotalo/ads-client-test-plc-project). 

![](https://github.com/jisotalo/ads-client/blob/master/img/fb_rpc.png?raw=true)

There is an instance of the function block at `GVL_RPC.RpcBlock`.

### RPC method with standard data types
conn
The `Calculator()` method calculates sum, product and division of the input values. The method returns `true`, if all calculations were successful.
```
{attribute 'TcRpcEnable'}
METHOD Calculator : BOOL
VAR_INPUT
	Value1	: REAL;
	Value2	: REAL;
END_VAR
VAR_OUTPUT
	Sum			: REAL;
	Product 	: REAL;
	Division	: REAL;
END_VAR

//--- Code starts ---

//Return TRUE if all success
Calculator := TRUE;

Sum := Value1 + Value2;
Product := Value1 * Value2;

IF Value2 <> 0 THEN
	Division := Value1 / Value2;
ELSE
	Division := 0;
	Calculator := FALSE;
END_IF
```

Example call:

```js
const res = await client.invokeRpcMethod('GVL_RPC.RpcBlock', 'Calculator', {
  Value1: 1,
  Value2: 123
});

console.log(res);
/*
{
  returnValue: true,
  outputs: { 
    Sum: 124, 
    Product: 123, 
    Division: 0.008130080997943878 
  }
}
*/
```

### RPC method with struct

The `Structs()` method takes a struct value as input, changes its values and then returns the result.

```
{attribute 'TcRpcEnable'}
METHOD Structs : ST_Struct
VAR_INPUT
	Input	: ST_Struct;
END_VAR

//--- Code starts ---

Structs.SomeText := CONCAT('Response: ', Input.SomeText);
Structs.SomeReal := Input.SomeReal * 10.0;
Structs.SomeDate := Input.SomeDate + T#24H;
```

Example call:

```js
const res = await client.invokeRpcMethod('GVL_RPC.RpcBlock', 'Structs', {
  Input: {
    SomeText: 'Hello ads-client',
    SomeReal: 3.14,
    SomeDate: new Date('2024-12-24T00:00:00.000Z') 
  }
});

console.log(res);
/*
{
  returnValue: {
    SomeText: 'Response: Hello ads-client',
    SomeReal: 31.4,
    SomeDate: 2024-12-24T01:00:00.000Z
  },
  outputs: {}
}
*/
```

## Converting data between raw data and Javascript objects

The raw data in this context means sent or received bytes (a `Buffer` object).

When using methods such as [`readValue()`](https://jisotalo.fi/ads-client/classes/Client.html#readValue), [`writeValue()`](https://jisotalo.fi/ads-client/classes/Client.html#writeValue) and [`subscribeValue()`](https://jisotalo.fi/ads-client/classes/Client.html#subscribeValue),
the client converts data automatically. The conversion can be done manually as well, by using [`convertFromRaw()`](https://jisotalo.fi/ads-client/classes/Client.html#convertFromRaw) and [`convertToRaw()`](https://jisotalo.fi/ads-client/classes/Client.html#convertToRaw).

See my other library [iec-61131-3](https://github.com/jisotalo/iec-61131-3) for other possibilities to convert data between Javascript and IEC 61131-3 types.

### Converting a raw value to a Javascript object

Use [`convertFromRaw()`](https://jisotalo.fi/ads-client/classes/Client.html#convertFromRaw) to convert raw data to Javascript object.

**Converting INT**

```js
const data = await client.readRaw(16448, 414816, 2);
console.log(data); //<Buffer ff 7f>

const converted = await client.convertFromRaw(data, 'INT');
console.log(converted); //32767
```

**Converting STRUCT**

```js
const converted = await client.convertFromRaw(data, 'ST_StandardTypes');
console.log(converted);
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


### Converting a Javascript object to a raw value

Use [`convertToRaw()`](https://jisotalo.fi/ads-client/classes/Client.html#convertToRaw) to convert Javascript object to raw data.

**Converting INT**

```js
const data = await client.convertToRaw(12345, 'INT');
console.log(data); //<Buffer 39 30>
```

**Converting STRUCT**

```js
const value = {
  BOOL_: true,
  BOOL_2: false,
  BYTE_: 255,
  WORD_: 65535,
  //...and so on
};

const data = await client.convertToRaw(value, 'ST_StandardTypes');
console.log(data); //<Buffer ...>
```

**Converting STRUCT (some properties only)**

All other (missing) properties are set to default values (zero / empty string).
```js
const value = {
  WORD_: 65535
};

const data = await client.convertToRaw(value, 'ST_StandardTypes', true); //<-- NOTE: autoFill set
console.log(data); //<Buffer ...>
```

## Other features

### ADS sum commands

ADS sum commands can be used to have multiple ADS commands in one request. This can be useful for efficiency reasons.

See [Beckhoff Information System](https://infosys.beckhoff.com/english.php?content=../content/1033/tc3_adsdll2/9007199379576075.html&id=9180083787138954512) for more info.

- [`createVariableHandleMulti()`](https://jisotalo.fi/ads-client/classes/Client.html#createVariableHandleMulti)
- [`deleteVariableHandleMulti()`](https://jisotalo.fi/ads-client/classes/Client.html#deleteVariableHandleMulti)
- [`readRawMulti()`](https://jisotalo.fi/ads-client/classes/Client.html#readRawMulti)
- [`writeRawMulti()`](https://jisotalo.fi/ads-client/classes/Client.html#writeRawMulti)
- [`readWriteRawMulti()`](https://jisotalo.fi/ads-client/classes/Client.html#readWriteRawMulti)

### Starting and stopping a PLC 

- [`startPlc()`](https://jisotalo.fi/ads-client/classes/Client.html#startPlc)
- [`stopPlc()`](https://jisotalo.fi/ads-client/classes/Client.html#stopPlc)
- [`resetPlc()`](https://jisotalo.fi/ads-client/classes/Client.html#resetPlc)
- [`restartPlc()`](https://jisotalo.fi/ads-client/classes/Client.html#restartPlc)

### Starting and stopping TwinCAT system

- [`setTcSystemToConfig()`](https://jisotalo.fi/ads-client/classes/Client.html#setTcSystemToConfig)
- [`setTcSystemToRun()`](https://jisotalo.fi/ads-client/classes/Client.html#setTcSystemToRun)
- [`restartTcSystem()`](https://jisotalo.fi/ads-client/classes/Client.html#restartTcSystem)

### Client events

See [`AdsClientEvents`](https://jisotalo.fi/ads-client/interfaces/AdsClientEvents.html) for all available events, their descriptions and examples.

```js
client.on('connect', (connection) => {
  console.log('Connected:', connection);
});
```

### Debugging

Use [`setDebugLevel()`](https://jisotalo.fi/ads-client/classes/Client.html#setDebugLevel) to change debug level.

```js
client.setDebugLevel(1);
```

 - 0: no debugging (default)
 - 1: basic debugging (`$env:DEBUG='ads-client'`)
 - 2: detailed debugging (`$env:DEBUG='ads-client,ads-client:details'`)
 - 3: detailed debugging with raw I/O data (`$env:DEBUG='ads-client,ads-client:details,ads-client:raw-data'`)

Debug data is available in the console (See [Debug](https://www.npmjs.com/package/debug) library for more).


## Disconnecting

After the client is no more used, always use [`disconnect()`](https://jisotalo.fi/ads-client/classes/Client.html#disconnect) to release all subscription handles and other resources.

```js
await client.disconnect();
```

## Common issues and questions

### There are lot's of connection issues and timeouts
Things to try: 
- Remove all TwinCAT routes and create them again (yes, really)
- Increase value of [`timeoutDelay`](https://jisotalo.fi/ads-client/interfaces/AdsClientSettings.html#timeoutDelay) setting
- Cache all data types and symbols straight after connecting using [`cacheDataTypes`](https://jisotalo.fi/ads-client/classes/Client.html#cacheDataTypes) and [`cacheSymbols`](https://jisotalo.fi/ads-client/classes/Client.html#cacheSymbols)

### Getting `TypeError: Do not know how to serialize a BigInt`
- `JSON.stringify` doesn't understand BigInt values (such as `LINT` or similar 64 bit PLC values)
- Check [this Github issue](https://github.com/GoogleChromeLabs/jsbi/issues/30#issuecomment-953187833) for the following patch:

```js
BigInt.prototype.toJSON = function() { return this.toString() }
```

### Can I connect from Raspberry Pi to TwinCAT?

Yes, for example using [Setup 3 - Connect from any Node.js system](#setup-3---connect-from-any-nodejs-system).
1. Open a TCP port 48898 from your PLC
2. Edit `StaticRoutes.xml` file from your PLC
3. Connect from the Raspberry Pi using the PLC IP address as `routerAddress` and the AmsNetID written to `StaticRoutes.xml` as `localAmsNetId`

### Receiving ADS error 1808 `Symbol not found` even when it should be found

- Make sure you have updated the latest PLC software using *download*. Sometimes online change causes this.
- If you are using TwinCAT 2, see chapter [Differences when using with TwinCAT 2](#differences-when-using-with-twincat-2)
- Double check variable path for typos

### Having timeouts or 'mailbox is full' errors

- The AMS router is capable of handling only limited number of requests in a certain time. 
- Other possible reason is that operating system TCP window is full because of large number of requests.
- Solution: 
  - Use structs or arrays to send data in larger packets 
  - Try raw commands or sum commands to decrease data usage

### Having problems to connect from OSX or Raspberry Pi to target PLC

- The local machine has no AMS router
- You need to connect to the PLC's AMS router instead
- See [this issue comment](https://github.com/jisotalo/ads-client/issues/51#issuecomment-758016428)

### A data type is not found even when it should be

If you use methods like `convertFromRaw()` and `getDataType()` but receive an error similar to `ClientException: Finding data type *data type* failed`, make sure you have really written the data type correctly.

For example, when copying a variable name from TwinCAT online view using CTRL+C, it might not work:
- Displayed name: `ARRAY [0..1, 0..1] OF ST_Example`
- The value copied to clipboard `ARRAY [0..1, 0..1] OF ST_Example`
- --> **This causes error!**
- The real data type name that needs to be used is `ARRAY [0..1,0..1] OF ST_Example` (note no whitespace between array dimensions)

If you have problems, try to read the symbol object using `getSymbol()`. The final solution is to read all data types using `getDataTypes()` and manually locate the correct type.

### Connection failed - failed to set PLC connection

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

### How to connect to a PLC that is in CONFIG mode?
As default, the ads-client checks if the target has PLC runtime at given port. However, when target system manager is at config mode, there is none. The client will throw an error during connecting:

`Connection failed - failed to set PLC connection. If target is not PLC runtime, use setting "rawClient". If system is in config mode or there is no PLC software yet, you might want to use setting "allowHalfOpen"`

You can disable the check by providing setting `allowHalfOpen: true`. After that, it's possible to start the PLC by `setTcSystemToRun()`.

Another option is to use setting `rawClient: true` - see [Connecting to targets without a PLC runtime](#connecting-to-targets-without-a-plc-runtime).

### Issues with TwinCAT 2 low-end devices (BK9050, BC9050 etc.)
* You can only use raw commands (such as `readRaw()`, `writeRaw()`, `subscribeRaw()`) as these devices provide no symbols
* See [issue 114](https://github.com/jisotalo/ads-client/issues/114) and [issue 116](https://github.com/jisotalo/ads-client/issues/116)



## External links

| Description                                  | Link                                                    |
| -------------------------------------------- | ------------------------------------------------------- |
| ADS client for Node-RED                      | https://github.com/jisotalo/node-red-contrib-ads-client |
| ADS server for Node.js                       | https://github.com/jisotalo/ads-server                  |
| IEC 61131-3 PLC data type helper for Node.js | https://github.com/jisotalo/iec-61131-3/                |
| Codesys client for Node.js                   | https://github.com/jisotalo/codesys-client/             |


## Library testing

All features of this library are tested using quite large test suite - see `./test/` directory. 
This prevents regression, thus updating the ads-client should be always safe.

There are separate tests for TwinCAT 2 and TwinCAT 3.

PLC projects for running test suites are located in the following repository:
[https://github.com/jisotalo/ads-client-test-plc-project](https://github.com/jisotalo/ads-client-test-plc-project).

### TwinCAT 3 tests

Tests are run with command `npm run test-tc3`. TwinCAT 3 test PLC projects needs to be running in the target system.

### TwinCAT 2 tests

Tests are run with command `npm run test-tc2`. TwinCAT 2 test PLC projects needs to be running in the target system.

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
