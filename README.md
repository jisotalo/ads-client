# ads-client


[![npm version](https://img.shields.io/npm/v/ads-client)](https://www.npmjs.org/package/ads-cllient)
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
# Latest update

## [1.1.0] - 16.04.2020
### Added
- Support for pseudo data types (like PVOID, XINT, UXINT etc.)
- Reserved ADS ports to ads-client-ads.js

### Changed
- writeSymbol is now case-insensitive (as the PLC system is)
- Fixed bug: Changed iconv-encode unicode to ucs2 at WSTRING
- Fixed bug: Better suppor for arrays when using `autoFill = true` parameter
- Updated README.md
  - array examples
  - `writeSymbol` and case-insensitive information


---
# Table of contents

- [Features](#installation)
- [Installation](#installation)
- [Enabling localhost support](#enabling-localhost-support)
- [IMPORTANT: Note about STRUCT variables](#IMPORTANT-Note-about-STRUCT-variables)
- [IMPORTANT: Writing STRUCT variables](#IMPORTANT-Writing-STRUCT-variables)
- [Getting started](#getting-started)
  - [Creating a new Client instance](#Creating-a-new-Client-instance)
  - [Connecting and disconnecting](#Connecting-and-disconnecting)
  - [Reading any PLC variable](#Reading-any-PLC-variable)
    - [Reading a base type PLC variable (INT)](#reading-a-base-type-plc-variable-int)
    - [Reading a STRUCT type PLC variable](#reading-a-struct-type-plc-variable)
    - [Reading an ARRAY of base type PLC variable](#Reading-an-ARRAY-of-base-type-PLC-variable)
    - [Reading an ARRAY of STRUCT type PLC variable](#Reading-an-ARRAY-of-STRUCT-type-PLC-variable)
  - [Writing any PLC variable](#Writing-any-PLC-variable)
    - [Writing a base type PLC variable (INT)](#writing-a-base-type-plc-variable-int)
    - [Writing a STRUCT type PLC variable](#writing-a-struct-type-plc-variable)
    - [Writing a STRUCT type PLC variable (just some members of the struct)](#writing-a-struct-type-plc-variable-just-some-members-of-the-struct)
    - [Writing an ARRAY of base type PLC variable](#Writing-an-ARRAY-of-base-type-PLC-variable)
    - [Writing an ARRAY of STRUCT type PLC variable](#Writing-an-ARRAY-of-STRUCT-type-PLC-variable)
  - [Subscribing to PLC variable changes](#subscribing-to-plc-variable-changes)
- [Documentation](#documentation)
- [License](#license)


# Features

- Promises and async/await
- Supports connecting to the local TwinCAT runtime (see [enabling localhost support](#localhost-support))
- Supports multiple connections from the same host
- Reading and writing all kinds of variables by PLC variable name
- Subscribing to variable changes by PLC variable name (ADS notifications)
- Automatic conversion from PLC variables to Javascript objects and vice-versa
- Reading symbol and data type information
- Reading PLC runtime and system manager states
- Caching symbol and data type information (only read at first time when needed)
- Automatic pointer/reference support for 32bit and 64bit systems
- Automatic updating of symbols, data types and subscriptions when PLC program changes or system starts (*NOTE: Not 100 % ready yet*)
- Tested to work successfully
  - Node.js v10.16.3 and newer
  - Local computer with TwinCAT 3 4022.27 running on 64bit Windows 10
  - Local computer with TwinCAT 3 4024.4 running on 64bit Windows 10
  - Beckhoff PLC with TwinCAT 3 4022.27 running on 64bit Windows 7 Embedded
- Yet to be tested
  - Beckhoff PLC with 32 bit system 
  - TwinCAT 2 systems
  - Running on Linux device with and without ADS router
  - Running on Windows device without ADS router


# Installation

Install the [npm package](https://www.npmjs.com/package/ads-client) using npm command:
```bash
npm i ads-client
```

Include the module in your code
```js
const ads = require('ads-client')
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
	TestINT         : INT := 1234;
	TestSTRING 	    : STRING := 'Hello this is a test string';
	ExampleSTRUCT   : ST_Example;
	TestARRAY  		: ARRAY[0..4] OF INT := [0, 10, 200, 3000, 4000];
	TestARRAY2		: ARRAY[0..4] OF ST_Example := [(SomeText := 'Just for demo purposes')];
  TestENUM  		: E_TestEnum := E_TestEnum.Running;
  IncrementingValue : INT; //This should change every 500 ms or so
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
//Using await
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

The PLC struct has three members but we provided only two, which caused an exception.

We need to tell the `WriteSymbol` that we *indeed* want to write just some members and the rest will stay the same. This happens by setting the 3rd parameter `autoFill` to true.

If `autoFill` is true, the method first reads the latest value and then writes it with only the new given changes.

```js
try {
  const res = await client.writeSymbol('GVL_Test.ExampleSTRUCT', {
    SomeReal: 123.45,
    SomeText: 'But this works!'
  }, true)

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

### Subcribe to variable value changes


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

### Subcribe to variable periodically

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