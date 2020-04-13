# ads-client

A node.js ADS library for connecting to Beckhoff TwinCAT automation systems using ADS protocol.

Coded from scratch using [TwinCAT ADS specification](https://infosys.beckhoff.com/content/1033/tc3_ads_intro/116157835.html?id=124964102706356243) and [Beckhoff.TwinCAT.Ads nuget package](https://www.nuget.org/packages/Beckhoff.TwinCAT.Ads/5.0.0-preview6). Inspiration from similar projects like [node-ads](https://www.npmjs.com/package/node-ads), [beckhoff-js](https://www.npmjs.com/package/beckhoff-js) and [iecstruct](https://www.npmjs.com/package/iecstruct).

---
## *Readme is still under construction!*


**Important note**:

There is still some work to do for "production ready" version. See this [Github milestone for details](https://github.com/jisotalo/ads-client/milestone/1)

---
# Table of contents

- [Features](#installation)
- [Installation](#installation)
- [Enabling localhost support](#enabling-localhost-support)
- [IMPORTANT: Note about STRUCT variables](#IMPORTANT-Note-about-STRUCT-variables)
- [Examples](#examples)
  - [Creating a new Client instance](#Creating-a-new-Client-instance)
  - [Connecting and disconnecting](#Connecting-and-disconnecting)
  - [Reading any PLC variable](#Reading-any-PLC-variable)
    - [Reading a base type PLC variable (INT)](#reading-a-base-type-plc-variable-int)
    - [Reading a STRUCT type PLC variable](#reading-a-struct-type-plc-variable)
  - [Writing any PLC variable](#Writing-any-PLC-variable)
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
- Automatic updating of symbols, data types and sunbscriptions when PLC program changes or system starts (*NOTE: Not 100 % ready yet*)
- Tested to work successfully
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

# Enabling localhost support 
*NOTE: Only required for TwinCAT versions older than 4024.5. Newer versions have this already enabled.*

If you want to connect to the local TwinCAT runtime (Node.js and the TwinCAT on the same computer), the ADS router TCP loopback feature has to be enabled. Tested with TwinCAT 4022.27 and 4024.4.

The following method is from [Beckhoff.TwinCAT.Ads nuget package](https://www.nuget.org/packages/Beckhoff.TwinCAT.Ads/5.0.0-preview6) installation guide.

1. Stop TwinCAT System Service

1. Enable TCP Loopback for TwinCAT via registery:

32-Bit Windows Operating System:

```
Create following DWORD and set value to 1:
HKEY_LOCAL_MACHINE\SOFTWARE\Beckhoff\TwinCAT3\System\EnableAmsTcpLoopback
 ```
64-Bit Windows Operating System:
```
Create following DWORD and set value to 1:
HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Beckhoff\TwinCAT3\System\EnableAmsTcpLoopback
 ```
3. Restart TwinCAT System Service 

Now the connection to localhost using AMS address 127.0.0.1.1.1 should work.

# IMPORTANT: Note about STRUCT variables

At the moment all structs need to have attribute `{attribute 'pack_mode' := '1'}` defined:
````
{attribute 'pack_mode' := '1'}
TYPE ST_Example :
STRUCT
	SomeText : STRING(50) := 'Hello ads-client';
	SomeReal : REAL := 3.14159265359;
END_STRUCT
END_TYPE

````

If the attribute is not found, the library will print a warning to the console:
````
ads-client: WARNING: PLC data type ST_Example is a STRUCT and has no attribute {attribute 'pack_mode' := '1'} above it's definition -> Read data may be corrupted depending on the struct layout. Disable this warning with setting 'disableStructPackModeWarning: true'
````
The warning can be hidden using setting `'disableStructPackModeWarning: true'`


# Examples

This chapter includes some examples for using the library. See the [documentation](#documentation) for detailed description.

## Creating a new Client instance

The constructor takes settings as its parameter. See all settings from the [Settings documentation](https://jisotalo.github.io/ads-client/global.html#Settings)

**Minimun required**

*Connects to the given AmsNetId and port using local ADS router*
```javascript
const ads = require('ads-client')

const client = new ads.Client({
  targetAmsNetId: '127.0.0.1.1.1',
  targetAdsPort: 851,
})
````

**Example 2**

*Same as previous but do not convert enumerations to objects and dates to Date objects*
```javascript
const ads = require('ads-client')

const client = new ads.Client({
  targetAmsNetId: '127.0.0.1.1.1',
  targetAdsPort: 851,
  objectifyEnumerations: false,
  convertDatesToJavascript: false
})
````

**Example 3**

*Cache all PLC runtime data types and symbols when connecting*
```javascript
const ads = require('ads-client')

const client = new ads.Client({
  targetAmsNetId: '127.0.0.1.1.1',
  targetAdsPort: 851,
  readAndCacheDataTypes: true,
  readAndCacheSymbols: true
})
````


## Connecting and disconnecting

Connecting to the local TwinCAT 3 runtime 1 (port is 851) using local ADS router (= you have TwinCAT ADS router installed).

```javascript
const ads = require('ads-client')

const client = new ads.Client({
  targetAmsNetId: '127.0.0.1.1.1', //Loopback AmsNetId, you could use local AmsNetId too if you know it
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
```
Example console output
````
Connected to the 127.0.0.1.1.1
Router assigned us AmsNetId 192.168.1.1.1.1 and port 36837
Disconnected
````

## Reading any PLC variable

### Reading a base type PLC variable (INT)

First, we need to have a GVL_Test at the PLC with the following:
````
VAR_GLOBAL
	TestINT : INT := 1234;
END_VAR
````

```javascript
const ads = require('ads-client')

const client = new ads.Client({
  targetAmsNetId: '127.0.0.1.1.1',
  targetAdsPort: 851
})

client.connect()
  .then(res => {   
    console.log(`Connected to the ${res.targetAmsNetId}`)

    return client.readSymbol('GVL_Test.TestINT')
  })
  .then(res => {
    console.log(`Value read: ${res.value}`)

    return client.disconnect()
  })
  .then(() => {
    console.log('Disconnected')
  })
  .catch(err => {
    console.log('Something failed:', err)
  })
```
Example console output
````
Connected to the 127.0.0.1.1.1
Value read: 1234
Disconnected
````

### Reading a STRUCT type PLC variable

**IMPORTANT NOTE:** See chapter [IMPORTANT: Note about STRUCT variables](#IMPORTANT-Note-about-STRUCT-variables)

First, we need to have a ST_Example like the following:
````
{attribute 'pack_mode' := '1'}
TYPE ST_Example :
STRUCT
	SomeText : STRING(50) := 'Hello ads-client';
	SomeReal : REAL := 3.14159265359;
END_STRUCT
END_TYPE
````

Second, we need to have a GVL_Test at the PLC with the following:
````
VAR_GLOBAL
	ExampleSTRUCT   : ST_Example;
END_VAR
````

Then reading is simple.

*Note: Using async/await just for example purposes*
```javascript
const ads = require('ads-client')

const client = new ads.Client({
  targetAmsNetId: '127.0.0.1.1.1', //Loopback AmsNetId, you could use local AmsNetId too if you know it
  targetAdsPort: 851
}); //Note required ; because of (async()...

(async () => {
  try {
    //Connecting
    const res = await client.connect()
    console.log(`Connected to the ${res.targetAmsNetId}`)

    //Reading
    try {
      const res = await client.readSymbol('GVL_Test.ExampleSTRUCT')
      console.log('Value read:', res.value)
    } catch (err) {
      console.log('Reading failed:', err)
      return
    }

    //Disconnecting
    try {
      const res = await client.disconnect()
      console.log('Disconneted')
    } catch (err) {
      console.log('Disconnecting failed:', err)
      return
    }

  } catch (err) {
    console.log('Connecting failed:', err)
    return
  }
})()

```
Example console output
````
Connected to the 127.0.0.1.1.1
Value read: { SomeText: 'Hello ads-client', SomeReal: 3.1415927410125732 }
Disconneted
````


## Writing any PLC variable

### Writing a base type PLC variable

First, we need to have a GVL_Test at the PLC with the following:
````
VAR_GLOBAL
	TestINT : INT := 1234;
END_VAR
````

Let's read the value, change it and read again:
```javascript
const ads = require('ads-client')

const client = new ads.Client({
  targetAmsNetId: '127.0.0.1.1.1', //Loopback AmsNetId, you could use local AmsNetId too if you know it
  targetAdsPort: 851
}); //Note required ; because of (async()...

(async () => {
  try {
    //Connecting
    const res = await client.connect()
    console.log(`Connected to the ${res.targetAmsNetId}`)

    try {
      
      //Reading the value
      let res = await client.readSymbol('GVL_Test.TestINT')
      console.log('Value read:', res.value)

      //Writing the value
      res = await client.writeSymbol('GVL_Test.TestINT', 5)
      console.log('Value written:', res.value)

      //Reading the value again to be sure
      res = await client.readSymbol('GVL_Test.TestINT')
      console.log('Value read:', res.value)

    } catch (err) {
      console.log('Something failed:', err)
      return
    }

    //Disconnecting
    try {
      const res = await client.disconnect()
      console.log('Disconneted')
    } catch (err) {
      console.log('Disconnecting failed:', err)
      return
    }

  } catch (err) {
    console.log('Connecting failed:', err)
    return
  }
})()

```
Example console output
````
Connected to the 127.0.0.1.1.1
Value read: 1234
Value written: 5
Value read: 5
````

### Writing a STRUCT type PLC variable

**IMPORTANT NOTE:** See chapter [IMPORTANT: Note about STRUCT variables](#IMPORTANT-Note-about-STRUCT-variables)

First, we need to have a ST_Example like the following:
````
{attribute 'pack_mode' := '1'}
TYPE ST_Example :
STRUCT
	SomeText : STRING(50) := 'Hello ads-client';
	SomeReal : REAL := 3.14159265359;
END_STRUCT
END_TYPE
````

Second, we need to have a GVL_Test at the PLC with the following:
````
VAR_GLOBAL
	ExampleSTRUCT   : ST_Example;
END_VAR
````


**NOTE** At the moment the given object keys are case-sensitive, so writing to `someTEXT` instead of `SomeText` won't work. This will be fixed soon, see [issue #5](https://github.com/jisotalo/ads-client/issues/5).
```javascript
const ads = require('ads-client')

const client = new ads.Client({
  targetAmsNetId: '127.0.0.1.1.1', //Loopback AmsNetId, you could use local AmsNetId too if you know it
  targetAdsPort: 851
}); //Note required ; because of (async()...

(async () => {
  try {
    //Connecting
    const res = await client.connect()
    console.log(`Connected to the ${res.targetAmsNetId}`)

    try {
      //Reading the value
      let res = await client.readSymbol('GVL_Test.ExampleSTRUCT')
      console.log('Value read:', res.value)

      //Writing the value
      res = await client.writeSymbol('GVL_Test.ExampleSTRUCT', {
        SomeText: 'Hello to you too, Mr. PLC!',
        SomeReal: 5456.06854
      })
      console.log('Value written:', res.value)

      //Reading the value to be sure
      res = await client.readSymbol('GVL_Test.ExampleSTRUCT')
      console.log('Value read:', res.value)

    } catch (err) {
      console.log('Something failed:', err)
      return
    }

    //Disconnecting
    try {
      const res = await client.disconnect()
      console.log('Disconneted')
    } catch (err) {
      console.log('Disconnecting failed:', err)
      return
    }

  } catch (err) {
    console.log('Connecting failed:', err)
    return
  }
})()

```
Example console output
````
Connected to the 127.0.0.1.1.1
Value read: { SomeText: 'Hello ads-client', SomeReal: 3.1415927410125732 }
Value written: { SomeText: 'Hello to you too, Mr. PLC!', SomeReal: 5456.06854 }
Value read: { SomeText: 'Hello to you too, Mr. PLC!',
  SomeReal: 5456.068359375 }
Disconneted
````

### Writing a STRUCT type PLC variable (just some members of the struct)

**IMPORTANT NOTE:** See chapter [IMPORTANT: Note about STRUCT variables](#IMPORTANT-Note-about-STRUCT-variables)


**NOTE** At the moment the given object keys are case-sensitive, so writing to `someTEXT` instead of `SomeText` won't work. This will be fixed soon, see [issue #5](https://github.com/jisotalo/ads-client/issues/5).

We can also write just some members of the struct if we like.

The following will throw an error:


```javascript
//...the previous lines are hidden

//Writing the value
res = await client.writeSymbol('GVL_Test.ExampleSTRUCT', {
  SomeText: 'This will not work...'
})

//...the next lines are hidden
```
Example console output
````
Connected to the 127.0.0.1.1.1
Value read: { SomeText: 'Hello to you too, Mr. PLC!',
  SomeReal: 5456.068359375 }
Something failed: { ClientException: Writing symbol GVL_Test.ExampleSTRUCT failed: Given Javascript object is missing key/value for at least ".SomeReal" (REAL) - Set 
writeSymbol() 3rd parameter (autoFill) to true to allow uncomplete objects
    at Promise ...
Disconneted
````

We need to tell the `WriteSymbol` that we indeed want to write just some members and the rest will stay the same. This happens by providing the 3rd parameter `autoFill`, which causes the method first read the newest value and then overwrite only the given members.


```javascript
//...the previous lines are hidden

//Writing the value
res = await client.writeSymbol('GVL_Test.ExampleSTRUCT', {
  SomeText: 'But this works!'
}, true)

//...the next lines are hidden
```
Example console output
````
Connected to the 127.0.0.1.1.1
Value read: { SomeText: 'Hello to you too, Mr. PLC!',
  SomeReal: 5456.068359375 }
Value written: { SomeText: 'But this works!', SomeReal: 5456.068359375 }
Value read: { SomeText: 'But this works!', SomeReal: 5456.068359375 }
Disconneted
````
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