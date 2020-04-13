# ads-client

A node.js ADS library for connecting to Beckhoff TwinCAT automation systems using ADS protocol.

Coded from scratch using [TwinCAT ADS specification](https://infosys.beckhoff.com/content/1033/tc3_ads_intro/116157835.html?id=124964102706356243) and [Beckhoff.TwinCAT.Ads nuget package](https://www.nuget.org/packages/Beckhoff.TwinCAT.Ads/5.0.0-preview6). Inspiration from similar projects like [node-ads](https://www.npmjs.com/package/node-ads), [beckhoff-js](https://www.npmjs.com/package/beckhoff-js) and [iecstruct](https://www.npmjs.com/package/iecstruct).

---
## *Readme is still under construction!*


**Important note**:

There is still some work to do for "production ready" version. See this [Github milestone for details](https://github.com/jisotalo/ads-client/milestone/1)

---
## Table of contents

- [Features](#installation)
- [Installation](#installation)
- [Enabling localhost support](#enabling-localhost-support)
- [Examples](#examples)
- [Documentation](#documentation)
- [License](#license)


## Features

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


## Installation

Install the [npm package](https://www.npmjs.com/package/ads-client) using npm command:
```bash
npm i ads-client
```

## Enabling localhost support 
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

## Examples ##

This chapter includes some examples for using the library. See the [documentation](#documentation) for detailed description.

### Connecting to the PLC

Connecting to the local TwinCAT 3 runtime 1 (port is 851) using local ADS router (= you have TwinCAT ADS router installed).

```javascript
const ads = require('ads-client')

const client = new ads.Client({
  targetAmsNetId: '127.0.0.1.1.1', //Local system, you could use local AmsNetId too
  targetAdsPort: 851
})

client.connect()
  .then(res => {
    console.log(`Connected to the ${res.targetAmsNetId}`)
    console.log(`Router assigned us AmsNetId ${res.localAmsNetId} and port ${res.localAdsPort}`)
  })
  .catch(err => {
    console.log('Connection failed:', err)
  })
```

## Documentation

You can find the full html documentation from the project [GitHub home page](https://jisotalo.github.io/ads-client/) as well as from `./docs/` folder in the repository.

## License

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