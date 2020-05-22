# ads-client


[![npm version](https://img.shields.io/npm/v/ads-client)](https://www.npmjs.org/package/ads-client)
[![GitHub](https://img.shields.io/badge/View%20on-GitHub!-brightgreen)](https://img.shields.io/github/license/jisotalo/ads-client)
[![License](https://img.shields.io/github/license/jisotalo/ads-client)](https://choosealicense.com/licenses/mit/)

Unofficial node.js ADS library for connecting to Beckhoff TwinCAT automation systems using ADS protocol.

Coded from scratch using [TwinCAT ADS specification](https://infosys.beckhoff.com/content/1033/tc3_ads_intro/116157835.html?id=124964102706356243) and [Beckhoff.TwinCAT.Ads nuget package](https://www.nuget.org/packages/Beckhoff.TwinCAT.Ads/5.0.0-preview6). Inspiration from similar projects like [node-ads](https://www.npmjs.com/package/node-ads), [beckhoff-js](https://www.npmjs.com/package/beckhoff-js) and [iecstruct](https://www.npmjs.com/package/iecstruct).

---
## ***NOTE:** Readme is still under construction!*


**Important note**:

[![GitHub milestone](https://img.shields.io/github/milestones/progress-percent/jisotalo/ads-client/1)](https://github.com/jisotalo/ads-client/milestone/1)

There is still some work to do for "production ready" version. See this [Github milestone for details](https://github.com/jisotalo/ads-client/milestone/1)



---
# Table of contents

- [Installation](#installation)
- [Features](#installation)
- [Supported platforms and setups](#supported-platforms-and-setups)
- [Enabling localhost support](#enabling-localhost-support)
- [IMPORTANT: Note about STRUCT variables](#important-note-about-struct-variables)
- [IMPORTANT: Writing STRUCT variables](#important-note-writing-sturct-variables)
- [Getting started](#getting-started)
  - [Data types used in getting started](data-types-used-in-getting-started)
  - [Creating a new Client instance](#creating-a-new-client-instance)
  - [Connecting and disconnecting](#connecting-and-disconnecting)
  - [Reading any PLC variable](#reading-any-plc-variable)
    - [Reading INT type variable](#reading-int-type-variable)
    - [Reading STRING type variable](#reading-string-type-variable)
    - [Reading ENUM type variable](#reading-enum-type-variable)
    - [Reading STRUCT type variable](#reading-struct-type-variable)
    - [Reading ARRAY OF INT type variable](#reading-array-of-int-type-variable)
    - [Reading ARRAY OF STRUCT type variable](#reading-array-of-struct-type-variable)
  - [Writing any PLC variable](#writing-any-plc-variable)
    - [Writing INT type PLC variable](#writing-int-type-plc-variable)
    - [Writing STRING type PLC variable](#writing-string-type-plc-variable)
    - [Writing ENUM type variable](#writing-enum-type-variable)
    - [Writing STRUCT type PLC variable](#writing-struct-type-plc-variable)
    - [Writing STRUCT type PLC variable (with autoFill parameter)](#writing-struct-type-plc-variable-with-autofill-parameter)
    - [Writing ARRAY OF INT type variable](#writing-array-of-int-type-variable)
    - [Writing ARRAY of STRUCT type variable](#writing-array-of-struct-type-variable)
  - [Subscribing to PLC variables (device notifications)](#subscribing-to-plc-variables-device-notifications)
    - [Subcribe to variable value (on-change)](#subcribe-to-variable-value-on-change)
    - [Subcribe to variable value (cyclic)](#subcribe-to-variable-value-cyclic)
- [Debugging](#debugging)
- [FAQ](#faq)
- [Documentation](#documentation)
- [License](#license)


# Installation

Install the [npm package](https://www.npmjs.com/package/ads-client) using npm command:
```bash
npm i ads-client
```

Include the module in your code
```js
const ads = require('ads-client')
```
# Features

- Promise and async/await support
- Supports connecting to the local TwinCAT runtime (see [enabling localhost support](#localhost-support))
- Supports multiple connections from the same host
- Reading and writing all any PLC variable
- Subscribing to PLC variables (ADS notifications)
- Automatic conversion between PLC<->Javascript objects
- PLC symbol and data type handling and caching
- Reading PLC runtime and system manager states
- Automatic 32/64 bit variable support (PVOID, XINT, etc.)
- Automatic cache and subscription refreshing when PLC program changes or system starts



# Supported platforms and setups

The ads-client package is tested so far with the following setups:
  - **At the moment, TwinCAT 4022 or newer is required** (see issue #21)
  - TwinCAT 3 4022.27 running on 64bit Windows 10
  - TwinCAT 3 4024.4 running on 64bit Windows 10
  - TwinCAT 3 4022.27 running on 64bit Windows 7 Embedded @ Beckhoff PLC
  - Node.js v10.16.3 and newer

The ads-client can be used in different system setups:

![ads-client-setups](https://user-images.githubusercontent.com/13457157/79771661-c59c0d80-8337-11ea-809f-b7c41bcb099d.png)

## Setup 1

*Connect from Windows PC to the PLC.*

Requirements:
- UI client has TwinCAT installed
- ADS route is created between the UI and the PLC

Example connection when PLC has AmsNetId of `192.168.1.120.1.1`.
```js
const client = new ads.Client({
  targetAmsNetId: '192.168.1.120.1.1',
  targetAdsPort: 851,
})
```

## Setup 2

*Connect from Unix PC to the PLC.*

Requirements:
- UI client has [AdsRouterConsole](https://www.nuget.org/packages/Beckhoff.TwinCAT.Ads.AdsRouterConsole/5.0.0-preview4) or similar running
- ADS route is created between the UI and the PLC

Example connection when PLC has AmsNetId of `192.168.1.120.1.1`.
```js
const client = new ads.Client({
  targetAmsNetId: '192.168.1.120.1.1',
  targetAdsPort: 851,
})
```
Example entry in the PLCs 


## Setup 3

*Connect from Windows PC, Unix PC or other device to the PLC.*

Requirements:
- PLC has TCP port 48898 open
- Given `localAmsNetId` is not already in use
- Given `localAdsPort` is not already in use
- PLC has ADS route manually created to UI machines IP address and the given `localAmsNetId`

Example connection when PLC has AmsNetId of `192.168.1.120.1.1` and IP of `192.168.1.120`.
```js
const client = new ads.Client({
  localAmsNetId: '192.168.1.10.1.1',
  localAdsPort: 32750,
  targetAmsNetId: '192.168.1.120.1.1',
  targetAdsPort: 851,
  routerAddress: '192.168.1.120',
  routerTcpPort: 48898
})
```

Example entry in the PLCs `TwinCAT\3.1\Target\StaticRoutes.xml` file when UI has AmsNetId of `192.168.1.10.1.1` and IP of `192.168.1.10`.
```xml
<Route>
  <Name>UI</Name>
  <Address>192.168.1.10</Address>
  <NetId>192.168.1.10.1.1</NetId>
  <Type>TCP_IP</Type>
  <Flags>64</Flags>
</Route>
```
## Setup 4

*Connect from the PLC to the localhost (PLC and UI on the same machine).*

Requirements:
- No special requirements
- AMS router TCP loopback enabled (see "Enabling localhost support")

```js
const client = new ads.Client({
  targetAmsNetId: '127.0.0.1.1.1',
  targetAdsPort: 851,
})

```


# Enabling localhost support 
*NOTE: Only required for TwinCAT versions older than 4024.5. Newer versions have this already enabled.*

If you want to connect to the local TwinCAT runtime (Node.js and the TwinCAT on the same computer - **as in these examples**), the ADS router TCP loopback feature has to be enabled. Tested with TwinCAT 4022.27 and 4024.4.

The following method is from [Beckhoff.TwinCAT.Ads nuget package](https://www.nuget.org/packages/Beckhoff.TwinCAT.Ads/5.0.0-preview6) installation guide.

1. Stop TwinCAT System Service

2. Enable TCP Loopback for TwinCAT via registery (regedit):

    - 32-Bit Windows Operating System:

      ```
      Create following DWORD and set value to 1:
      HKEY_LOCAL_MACHINE\SOFTWARE\Beckhoff\TwinCAT3\System\EnableAmsTcpLoopback
      ```
    - 64-Bit Windows Operating System:
      ```
      Create following DWORD and set value to 1:
      HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Beckhoff\TwinCAT3\System\EnableAmsTcpLoopback
      ```
3. Restart TwinCAT System Service 

Now you can connect to the localhost using `localAmsNetId` address of `127.0.0.1.1.1` or `localhost`.

# IMPORTANT: Note about STRUCT variables

At the moment all structs need to have attribute `{attribute 'pack_mode' := '1'}` above the definition. This forces the TwinCAT to use 1-byte variable alignment.
```
{attribute 'pack_mode' := '1'}
TYPE ST_Example :
STRUCT
	SomeText : STRING(50) := 'Hello ads-client';
	SomeReal : REAL := 3.14159265359;
END_STRUCT
END_TYPE
```

If the attribute is not found, the library will print a warning to the console:
```
ads-client: WARNING: PLC data type ST_Example is a STRUCT and has no attribute {attribute 'pack_mode' := '1'} above it's definition -> Read data may be corrupted depending on the struct layout. Disable this warning with setting 'disableStructPackModeWarning: true'
```
The warning can be hidden using setting `'disableStructPackModeWarning: true'`. If the pack-mode is not defined, reading or writing data will cause corrupted data in some cases.

See [this GitHub issue](https://github.com/jisotalo/ads-client/issues/13) for developing support for TwinCAT 3 default byte alignment.

---
# IMPORTANT: Writing STRUCT variables

When writing a struct using `writeSymbol`, the given Javascript object keys are handled as case-insensitive because the TwinCAT 3 system is **case-insensitive**.

Basically this means that the following Javascript objects are used as-equals if passing to the `writeSymbol` method:

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

**NOTE** If the object has multiple keys with same name, `writeSymbol` tries to find the same case as in PLC. If it's not found, it depends on the `Object.find()` method which one is selected.

```js
//In this case, probably the first one (sometext) is selected and the SOMEtext is skipped.
{
  sometext: 'hello',
  SOMEtext: 'good day'
}
```

# Getting started

This chapter includes some short getting started examples. See the JSDoc [documentation](#documentation) for detailed description of library classes and methods.


## Data types used in getting started

These examples assume that the PLC has the following Global Variable List (GVL):
```
//GVL_Test
VAR_GLOBAL
	TestINT         	: INT := 1234;
	TestSTRING 	    	: STRING := 'Hello this is a test string';
	ExampleSTRUCT   	: ST_Example;
	TestARRAY  			: ARRAY[0..4] OF INT := [0, 10, 200, 3000, 4000];
	TestARRAY2			: ARRAY[0..4] OF ST_Example := [(SomeText := 'Just for demo purposes')];
	TestENUM  			: E_TestEnum := E_TestEnum.Running;
	IncrementingValue 	: INT; //This should change every 500 ms or so
END_VAR
```

The `ST_Example` should be defined as below:
```
{attribute 'pack_mode' := '1'}
TYPE ST_Example :
STRUCT
	SomeText : STRING(50) := 'Hello ads-client';
	SomeReal : REAL := 3.14159265359;
	SomeDate : DT := DT#2020-4-13-12:25:33;
END_STRUCT
END_TYPE
```

The `E_TestEnum` should be defined as below:
```
TYPE E_TestEnum :
(
	Disabled 	:= 0,
	Starting 	:= 50,
	Running 	:= 100,
	Stopping	:= 200	
);
END_TYPE
```

## Creating a new Client instance

The constructor takes settings as its parameter. Two settings are mandatory: `targetAmsNetId` and `targetAdsPort`. The first is the target PLC system AmsNetId (like *127.0.0.1.1.1* or *192.168.1.10.1.1*) and the latter is target system ADS port (*like 851 for TwinCAT 3 runtime 1*).

See all settings from the [Settings documentation](https://jisotalo.github.io/ads-client/global.html#Settings)

```js
const ads = require('ads-client')

//Creates a new Client instance and sets the local system and TC3 runtime 1 as target
const client = new ads.Client({
  targetAmsNetId: '127.0.0.1.1.1', //Loopback address, same as 'localhost' since version 1.1.0
  targetAdsPort: 851,
})
```


## Connecting and disconnecting

Connecting to the local TwinCAT 3 runtime 1 (port is 851) using local ADS router (= you have TwinCAT ADS router installed).

```js
const ads = require('ads-client')

const client = new ads.Client({
  targetAmsNetId: '127.0.0.1.1.1',
  targetAdsPort: 851
})

client.connect()
  .then(res => {   
    console.log(`Connected to the ${res.targetAmsNetId}`)
    console.log(`Router assigned us AmsNetId ${res.localAmsNetId} and port ${res.localAdsPort}`)

    return client.disconnect()
  })
  .then(() => {
    console.log('Disconnected')
  })
  .catch(err => {
    console.log('Something failed:', err)
  })

/*
Example console output:

Connected to the 127.0.0.1.1.1
Router assigned us AmsNetId 192.168.1.1.1.1 and port 36837
Disconnected
*/
```


## Reading any PLC variable

By using `readSymbol` method we can read all kind of types from the PLC, including base type variables, structs, arrays and so on. These examples cover just a few cases.

See full `readSymbol` documentation [from the docs](https://jisotalo.github.io/ads-client/Client.html#readSymbol).

### Reading `INT` type variable
```js
//Using Promises
client.readSymbol('GVL_Test.TestSTRING')
  .then(res => {
    console.log(`Value read: ${res.value}`)
  })
  .catch(err => {
    console.log('Something failed:', err)
  })

/*
Example console output:

Value read: 1234
*/
```

---

### Reading `STRING` type variable
```js
client.readSymbol('GVL_Test.TestSTRING')
  .then(res => {
    console.log(`Value read: ${res.value}`)
  })
  .catch(err => {
    console.log('Something failed:', err)
  })
/*
Example console output:

Value read: Hello this is a test string
*/
```

---



### Reading `ENUM` type variable

If `objectifyEnumerations` is set to false, only ENUM value (number) is returned.

```js 
//objectifyEnumerations: true
client.readSymbol('GVL_Test.TestENUM')
  .then(res => {
    console.log(`Value read: ${res.value}`)
  })
  .catch(err => {
    console.log('Something failed:', err)
  })

/*
Example console output:

Value read: { name: 'Running', value: 100 }
*/
```

---


### Reading `STRUCT` type variable

**IMPORTANT NOTE:** See chapter [IMPORTANT: Note about STRUCT variables](#IMPORTANT-Note-about-STRUCT-variables)



```js
//Using await for example purposes
try {
  const res = await client.readSymbol('GVL_Test.ExampleSTRUCT')

  console.log('Value read:', res.value)
} catch (err) {
  console.log('Reading failed:', err)
}

/*
Example console output:

Value read: { SomeText: 'Hello ads-client',
  SomeReal: 3.1415927410125732,
  SomeDate: 2020-04-13T12:25:33.000Z }   
*/
```

---



### Reading `ARRAY OF INT` type variable

**NOTE:** Handling multi-dimensional arrays is not supported at the moment. See [this GitHub issue](https://github.com/jisotalo/ads-client/issues/10) for the development of the multi-dimensional array support.

```js
try {
  const res = await client.readSymbol('GVL_Test.TestARRAY')

  console.log('Value read:', res.value)
} catch (err) {
  console.log('Reading failed:', err)
}

/*
Example console output:

Value read: [ 0, 10, 200, 3000, 4000 ] 
*/
```

---

### Reading `ARRAY OF STRUCT` type variable

**NOTE:** Handling multi-dimensional arrays is not supported at the moment. See [this GitHub issue](https://github.com/jisotalo/ads-client/issues/10) for the development of the multi-dimensional array support.

```javascript
try {
  const res = await client.readSymbol('GVL_Test.TestARRAY2')

  console.log('Value read:', res.value)
} catch (err) {
  console.log('Reading failed:', err)
}

/*
Example console output:

Value read: [ { SomeText: 'Just for demo purposes',
    SomeReal: 3.1415927410125732,
    SomeDate: 2020-04-13T12:25:33.000Z },
  { SomeText: 'Hello ads-client',
    SomeReal: 3.1415927410125732,
    SomeDate: 2020-04-13T12:25:33.000Z },
  { SomeText: 'Hello ads-client',
    SomeReal: 3.1415927410125732,
    SomeDate: 2020-04-13T12:25:33.000Z },
  { SomeText: 'Hello ads-client',
    SomeReal: 3.1415927410125732,
    SomeDate: 2020-04-13T12:25:33.000Z },
  { SomeText: 'Hello ads-client',
    SomeReal: 3.1415927410125732,
    SomeDate: 2020-04-13T12:25:33.000Z } ]
*/
```


----


## Writing any PLC variable

By using `writeSymbol` method we can write all kind of types to the PLC, including base type variables, structs, arrays and so on. These examples cover just a few cases.

See full `writeSymbol` documentation [from the docs](https://jisotalo.github.io/ads-client/Client.html#writeSymbol).

---

### Writing `INT` type PLC variable


```js
try {
  const res = await client.writeSymbol('GVL_Test.TestINT', 5)

  console.log('Value written:', res.value)
} catch (err) {
  console.log('Something failed:', err)
}
```

---

### Writing `STRING` type PLC variable

```js

try {
  const res = await client.writeSymbol('GVL_Test.TestSTRING', 'Changing the string value to this')

  console.log('Value written:', res.value)
} catch (err) {
  console.log('Something failed:', err)
}
```


---

### Writing `ENUM` type variable

When writing `ENUM` value, it can always be given as number or string.


```js 
try {
  const res = await client.writeSymbol('GVL_Test.TestENUM', 'Starting')
  //The following does the same:
  //const res = await client.writeSymbol('GVL_Test.TestENUM', 50)

  console.log('Value written:', res.value)
} catch (err) {
  console.log('Something failed:', err)
}
```

---
### Writing `STRUCT` type PLC variable

**IMPORTANT NOTE:** See chapter [IMPORTANT: Note about STRUCT variables](#IMPORTANT-Note-about-STRUCT-variables)

```js
try {
  const res = await client.writeSymbol('GVL_Test.ExampleSTRUCT', {
    SomeText: 'Hello to you too, Mr. PLC!',
    SomeReal: 5456.06854,
    SomeDate: new Date()
  })

  console.log('Value written:', res.value)
} catch (err) {
  console.log('Something failed:', err)
}
```


### Writing `STRUCT` type PLC variable (with autoFill parameter)

---

**IMPORTANT NOTE:** See chapter [IMPORTANT: Note about STRUCT variables](#IMPORTANT-Note-about-STRUCT-variables)


The following code will not work. The PLC struct has three members but we provide only two, which causes an exception.


```js
//NOTE: This won't work
try {
  const res = await client.writeSymbol('GVL_Test.ExampleSTRUCT', {
    SomeReal: 123.45,
    SomeText: 'This will not work...'
  })

} catch (err) {
  console.log('Something failed:', err)
}

/*
Example console output

Something failed: { ClientException: Writing symbol GVL_Test.ExampleSTRUCT failed: Given Javascript object is missing key/value for at least ".SomeDate" (DATE_AND_TIME) - Set writeSymbol() 3rd parameter (autoFill) to true to allow uncomplete objects
    at Promise ...
*/
```

We need to tell the `WriteSymbol` that we *indeed* want to write just some members and the rest will stay the same. This happens by setting the 3rd parameter `autoFill` to true.

If `autoFill` is true, the method first reads the latest value and then writes it with only the new given changes.

```js
try {
  const res = await client.writeSymbol('GVL_Test.ExampleSTRUCT', {
    SomeReal: 123.45,
    SomeText: 'But this works!'
  }, true) //Note this!

  console.log('Value written:', res.value)

} catch (err) {
  console.log('Something failed:', err)
}
```


Of course, it would be possible to do with two separate commands too:
```js
res = await client.writeSymbol('GVL_Test.ExampleSTRUCT.SomeReal', 123.45)
res = await client.writeSymbol('GVL_Test.ExampleSTRUCT.SomeText', 'This is also possible')
```

---

### Writing `ARRAY OF INT` type variable

```js
try {
  const res = await client.writeSymbol('GVL_Test.TestArray', [9999, 8888, 6666, 5555, 4444])

  console.log('Value written:', res.value)

} catch (err) {
  console.log('Something failed:', err)
  return
}
```

---

### Writing `ARRAY of STRUCT` type variable

```js
try {
  const res = await client.writeSymbol('GVL_Test.TestArray', 
    [ { SomeText: 'First value',
        SomeReal: 1.0,
        SomeDate: new Date()},
      { SomeText: 'Second',
        SomeReal: 10.10,
        SomeDate: new Date()},
      { SomeText: 'Third',
        SomeReal: 20.20,
        SomeDate: new Date()},
      { SomeText: 'Fourth',
        SomeReal: 30.30,
        SomeDate: new Date()},
      { SomeText: 'Fifth',
        SomeReal: 40.40,
        SomeDate: new Date()}]
  )

  console.log('Value written:', res.value)
  
} catch (err) {
  console.log('Something failed:', err)
  return
}
```


## Subscribing to PLC variables (device notifications)

By using `subscribe` method, we can receive variable values automatically from the PLC if they change or periodically.

See full `subscribe` documentation [from the docs](https://jisotalo.github.io/ads-client/Client.html#subscribe).

---

### Subcribe to variable value (on-change)


The following wants the PLC to check if the value has changed every 1000 milliseconds. If it has changed, callback is called with the latest value in `data` parameter.

After 10 seconds the subscription is unsubscribed.

```js
try {
  let subscription = await client.subscribe('GVL_Test.IncrementingValue', (data, sub) => {
    //Note: The sub parameter is the same as returned by client.subcribe()
    console.log(`${data.timeStamp}: Value changed to ${data.value}`)

  }, 1000)

  console.log(`Subscribed to ${subscription.target}`)

  //Unsubscribe and disconnect after 10 seconds
  setTimeout((async () => {
    //The subscribe() returns object that contains unsubscribe() method
    await subscription.unsubscribe()

    console.log('Unsubscribed')
  }), 10000)

} catch (err) {
  console.log('Something failed:', err)
  return
}

/*
Example console output

Subscribed to GVL_Test.IncrementingValue
Mon Apr 13 2020 13:02:26 GMT+0300 (GMT+03:00): Value changed to 1586
Mon Apr 13 2020 13:02:27 GMT+0300 (GMT+03:00): Value changed to 1588
Mon Apr 13 2020 13:02:28 GMT+0300 (GMT+03:00): Value changed to 1590
...
Mon Apr 13 2020 13:02:34 GMT+0300 (GMT+03:00): Value changed to 1602
Unsubscribed
```

---

### Subcribe to variable value (cyclic)

The following wants the PLC to send the variable value every 1000 milliseconds. The callback is called with the latest value in `data` parameter (it might have changed or not).

```js
//Our callback function
const onChange = (data, sub) => {
  console.log(`${data.timeStamp}: ${sub.target} changed to ${data.value}`)

  //We can call sub.unsubscribe() here if we want
}

try {
  let subscription = await client.subscribe('GVL_Test.IncrementingValue', onChange, 1000, false)

  console.log(`Subscribed to ${subscription.target}`)

} catch (err) {
  console.log('Something failed:', err)
  return
}

/*
Example console output


Subscribed to GVL_Test.IncrementingValue
Mon Apr 13 2020 13:09:04 GMT+0300 (GMT+03:00): GVL_Test.IncrementingValue changed to 273
Mon Apr 13 2020 13:09:05 GMT+0300 (GMT+03:00): GVL_Test.IncrementingValue changed to 275
Mon Apr 13 2020 13:09:06 GMT+0300 (GMT+03:00): GVL_Test.IncrementingValue changed to 277
...
```

## Reading and writing raw data

It's possible to read and write raw data using ads-client. Reading will result in a `Buffer` object, that contains the read data as bytes. Writing accepts a `Buffer` object that is then written to the PLC.

Handling raw data is usually the most fastest and efficient way, as there is usually much less network traffic required. The methods require known `indexGroup` and `indexOffset` values.

### Reading a single raw value
```js
//Reading DINT from indexGroup 16448 and indexOffset 411836 (4 bytes)
const result = await client.readRaw(16448, 411836, 4)
console.log(result) //<Buffer 37 61 00 00>
```

### Writing a single raw value
```js
//Writing value 123 to DINT from indexGroup 16448 and indexOffset 411836 (4 bytes)
const data = Buffer.alloc(4)
data.writeInt32LE(123)

await client.writeRaw(16448, 411836, data)
```

### Reading multiple raw values

Starting from version 1.3.0 you can use ADS sum commands to read multiple values in a single request. This is faster than reading one by one.

Method returns an array of results, one result object for each read operation. If result has `success` of true, the read was succesful and data is located in `data`. Otherwise error information can be read from `errorInfo`.

```js
const result = await client.readRawMulti([
  {
    indexGroup: 16448,
    indexOffset: 411836,
    size: 4
  },{
    indexGroup: 123, //Note: Incorrect on purpose
    indexOffset: 436040,
    size: 255
  }
])
console.log(result)
/*
[ { success: true,
    errorInfo: { error: false, errorCode: 0, errorStr: 'No error' },
    target: { indexGroup: 16448, indexOffset: 411836 },
    data: <Buffer 00 43 3a d4> },
  { success: false,
    errorInfo:
     { error: true, errorCode: 1794, errorStr: 'Invalid index group' },
    target: { indexGroup: 123, indexOffset: 436040 },
    data:
     <Buffer 00 00 00 00 ... > } ]
*/
```

### Writing multiple raw values

Starting from version 1.3.0 you can use ADS sum commands to write multiple values in a single request. This is faster than reading one by one.

Method returns an array of results, one result object for each read operation. If result has `success` of true, the write was succesful. Otherwise error information can be read from `errorInfo`.

```js
//Create raw data for DINT with value 555
const data = Buffer.alloc(4)
data.writeInt32LE(555)

const result = await client.writeRawMulti([
  {
    indexGroup: 16448,
    indexOffset: 411836,
    data: data
  },{
    indexGroup: 123, //Note: Incorrect on purpose
    indexOffset: 436040,
    data: Buffer.alloc(255)
  }
])
console.log(result)
/*
[ { success: true,
    errorInfo: { error: false, errorCode: 0, errorStr: 'No error' },
    target: { indexGroup: 16448, indexOffset: 411836 } },
  { success: false,
    errorInfo:
     { error: true,
       errorCode: 1793,
       errorStr: 'Service is not supported by server' },
    target: { indexGroup: 123, indexOffset: 436040 } } ]
*/
```

### Creating a variable handle and reading a raw value

Using handles is another alternative for reading and writing raw data. A handle is first made using variable name and then using the returned handle, read and write operations can be made. No need to know `indexGroup` and `indexOffset`.

NOTE: Handles should always be deleted if no more used. This doesn't mean that it wouldn't be a good habit to use the same handle all the time (for example in application backend until app is terminated). The reason is that there are limited number of handles available.

```js
const handle = await client.createVariableHandle('GVL_Test.TestINT')
console.log(handle)
//{ handle: 905969897, size: 2, type: 'INT' }

const result = await client.readRawByHandle(handle)
console.log(result)
//<Buffer d2 04>

await client.deleteVariableHandle(handle)
```


### Creating a variable handle and writing a raw value

See *Creating a variable handle and reading a raw value* for more info about handles.

```js
const handle = await client.createVariableHandle('GVL_Test.TestINT')
console.log(handle)
//{ handle: 905969897, size: 2, type: 'INT' }

//Create raw data for INT with value 12345
const data = Buffer.alloc(2)
data.writeInt32LE(12345)

await client.writeRawByHandle(handle, data)
await client.deleteVariableHandle(handle)
```

### Converting a raw value to Javascript object
Using `convertFromRaw` method, raw data can be converted to Javascript object. The conversion works internally like in `readSymbol`.

```js
//result = <Buffer 37 61 00 00>
const value = await client.convertFromRaw(result, 'DINT')
console.log(value) //24887
```

Example with `readRawMulti` and custom struct:
```js
const result = await client.readRawMulti([
  {
    indexGroup: 16448,
    indexOffset: 449659,
    size: 59
  },{
    indexGroup: 16448,
    indexOffset: 436040,
    size: 255
  }
])

const value = await client.convertFromRaw(result[0].data, 'ST_Example')
console.log(value)
/*
{ SomeText: 'Hello ads-client',
  SomeReal: 3.1415927410125732,
  SomeDate: 2020-04-13T12:25:33.000Z }
*/
```

### Converting a Javascript object to raw value
Using `convertToRaw` method, Javascript object can be converted to raw data. The conversion works internally like in `writeSymbol`.

The 3rd parameter `autoFill` works as in `writeSymbol`.

```js
const data = await client.convertToRaw(12345, 'INT')
console.log(data) //<Buffer 39 30>
```



### Getting symbol index group, offset and size

Variable symbol information can be acquired with method `getSymbolInfo`. The symbol infoc contains required `indexGroup`, `indexOffset` and `size`.

```js
const info = await client.getSymbolInfo('GVL_Test.TestINT')
console.log(info)
/*
{ indexGroup: 16448,
  indexOffset: 414816,
  size: 2,
  dataType: 2,
  dataTypeStr: 'ADST_INT16',
  flags: 8,
  flagsStr: [ 'TypeGuid' ],
  arrayDimension: 0,
  nameLength: 16,
  typeLength: 3,
  commentLength: 0,
  name: 'GVL_Test.TestINT',
  type: 'INT',
  comment: '' }
*/
```

# Debugging
If you have problems or you are interested, you can enabled debug output to console. The ads-client uses `debug` package for debugging.

Debugging can be enabled from terminal or from Javascript code.

## Enabling debug from code

You can change the debug level with method `setDebugging(level)`:
```js
client.setDebugging(2)
```
Different debug levels explained:
- 0: No debugging (default)
- 1: Errors have full stack traces, no debug printing
- 2: Basic debug printing (same as `DEBUG='ads-client'`) 
- 3: Detailed debug printing (same as `DEBUG='ads-client,ads-client:details'`)
- 4: Detailed debug printing and raw I/O data (same as `DEBUG='ads-client*'`)

## Enabling debugging from terminal
See [debug package](https://www.npmjs.com/package/debug) for instructions.

Example for Visual Studio Code (PowerShell):
```bash
$env:DEBUG='ads-client,ads-client:details'
```

Different debug levels explained:
- Basic debug printing `DEBUG='ads-client'`
- Basic and detailed debug printing `DEBUG='ads-client,ads-client:details'`
- Basic, detailed and raw I/O data: `DEBUG='ads-client*'`

# FAQ 

### Connection is working very badly and lot's of timeouts
Possible fixes: 
- Remove all routes and create them again
- Increase timeout delay setting (`timeoutDelay`)


### Can I connect from Raspberry Pi to TwinCAT?

Absolutely. See chapter "Supported platforms and setups", but basically:
1. Open a TCP port 48898 from your PLC
2. Edit StaticRoutes.xml file from your PLC
3. Connect from Raspberry using the PLC IP address as router address and the local AMS Net Id you wrote to StaticRoutes.xml

# Documentation

You can find the full html documentation from the project [GitHub home page](https://jisotalo.github.io/ads-client/) as well as from `./docs/` folder in the repository.

# License

Licensed under [MIT License](http://www.opensource.org/licenses/MIT). 


Copyright (c) 2020 Jussi Isotalo <<j.isotalo91@gmail.com>>

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
