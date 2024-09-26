# ads-client


[![npm version](https://img.shields.io/npm/v/ads-client)](https://www.npmjs.org/package/ads-client) 
[![GitHub](https://img.shields.io/badge/View%20on-GitHub-brightgreen)](https://github.com/jisotalo/ads-client)
[![License](https://img.shields.io/github/license/jisotalo/ads-client)](https://choosealicense.com/licenses/mit/)
[![Support](https://img.shields.io/badge/Donate-PayPal-yellow)](https://www.paypal.com/donate/?business=KUWBXXCVGZZME&no_recurring=0&currency_code=EUR)

Beckhoff TwinCAT ADS client library for Node.js (unofficial). 

Connect to a Beckhoff TwinCAT automation system using the ADS protocol from a Node.js app.

## v2 project status

**10.09.2024:** Beta 3 released! See [CHANGELOG.md](https://github.com/jisotalo/ads-client/blob/v2-dev/CHANGELOG.md) for details.

All breaking changes are (hopefully) done.

* See [milestone #2](https://github.com/jisotalo/ads-client/milestone/2) for tasks to be done.
* See [MIGRATION.md](https://github.com/jisotalo/ads-client/blob/v2-dev/MIGRATION.md) for guide of migrating v1->v2
* Clone repository and open `docs/index.html` in browser for documentation

## Getting started

README is under construction.

### Install
`npm install ads-client@beta`

### Import the client
```js
//Javascript:
const { Client } = require('ads-client');

//Typescript:
import { Client } from 'ads-client';
```

### Create a client and connect

```js
const client = new Client({
  targetAmsNetId: "localhost",
  targetAdsPort: 851
});

await client.connect();
```

### Read a value

```js
const res = await client.readValue('GVL_Example.StringValue');
console.log(res.value);

//Typescript:
const res = await client.readValue<string>('GVL_Example.StringValue');
console.log(res.value); //res.value is typed as string (instead of any)

```

### Write a value

```js
await client.writeValue('GVL_Example.StringValue', 'a new value');
```
### Subscribe to value changes

```js
await client.subscribe({
  target: 'GVL_Example.ChangingValue',
  cycleTime: 100,
  callback: (data, subscription) => console.log(`${data.timestamp}: Value changed to ${data.value}`)
});

//Typescript:
await client.subscribe<number>({
  target: 'GVL_Example.ChangingValue',
  cycleTime: 100,
  callback: (data, subscription) => {
    //data.value is typed as string (instead of any)
    console.log(`${data.timestamp}: Value changed to ${data.value}`);
  }
});
```

## Support

* Bugs and feature requests: 
  * [Github Issues](https://github.com/jisotalo/ads-client/issues)
* Help, support and discussion: 
  * [Github Discussions](https://github.com/jisotalo/ads-client/discussions)
* Professional support: 
  * Support and also development available 
  * Contact me!

If the library has been useful for you or your business, Paypal can be used to support my work. Or contact me and let's discuss the options!

[![Donate](https://img.shields.io/badge/Donate-PayPal-yellow)](https://www.paypal.com/donate/?business=KUWBXXCVGZZME&no_recurring=0&currency_code=EUR)

## Library testing

Target is that all functions of the library are always tested before releasing.

`npm test` results - updated 26.09.2024

<details>
<summary>Click to show test results</summary>
<pre>
 PASS  test/ads-client.test.js (25.1 s)
  √ IMPORTANT NOTE: This test requires running a specific PLC project locally (https://github.com/jisotalo/ads-client-test-plc-project) (1 ms)                                                        
  connection
    √ client is not connected at beginning (2 ms)                                                  
    √ checking ads client settings (1 ms)                                                          
    √ connecting to the target (49 ms)                                                             
    √ checking that test PLC project is active (14 ms)                                             
    √ checking that test PLC project version is correct (11 ms)                                    
    √ checking 32/64 bitness (5 ms)                                                                
    √ caching of symbols and data types (1 ms)                                                     
    √ reconnecting (40 ms)                                                                         
  resetting PLC to original state
    √ resetting PLC (511 ms)                                                                       
    √ checking that reset was successful (9 ms)                                                    
    √ checking that PLC is not running (12 ms)                                                     
    √ setting IsReset to false (7 ms)                                                              
    √ starting PLC (8 ms)                                                                          
    √ checking that test PLC project is running (505 ms)                                           
  testing PLC runtime stop, start, restart                                                         
    √ stopping PLC (16 ms)                                                                         
    √ starting PLC (16 ms)                                                                         
    √ restarting PLC (534 ms)                                                                      
  system state, PLC runtime states and device information                                          
    √ reading TwinCAT system state (8 ms)                                                          
    √ reading PLC runtime (port 851) state (4 ms)                                                  
    √ reading PLC runtime (port 852) state (4 ms)                                                  
    √ reading PLC runtime device info (4 ms)                                                       
    √ reading TwinCAT system device info (7 ms)                                                    
    √ reading PLC runtime symbol version (4 ms)                                                    
  symbols and data types                                                                           
    √ reading upload info (5 ms)                                                                   
    √ reading all symbols (25 ms)                                                                  
    √ reading single symbol information (3 ms)                                                     
    √ reading all data type information (30 ms)                                                    
    √ reading single data type information (4 ms)                                                  
  data conversion                                                                                  
    √ converting a raw PLC value to a Javascript variable (4 ms)                                   
    √ converting a Javascript value to a raw PLC value (69 ms)                                     
  reading values                                                                                   
    reading standard values                                                                        
      √ reading BOOL (13 ms)                                                                       
      √ reading BYTE (9 ms)                                                                        
      √ reading WORD (9 ms)                                                                        
      √ reading DWORD (10 ms)                                                                      
      √ reading SINT (17 ms)                                                                       
      √ reading USINT (5 ms)                                                                       
      √ reading INT (18 ms)                                                                        
      √ reading UINT (10 ms)                                                                       
      √ reading DINT (15 ms)                                                                       
      √ reading UDINT (9 ms)                                                                       
      √ reading REAL (33 ms)                                                                       
      √ reading STRING (18 ms)                                                                     
      √ reading DATE (9 ms)                                                                        
      √ reading DT (16 ms)                                                                         
      √ reading TOD (17 ms)                                                                        
      √ reading TIME (10 ms)                                                                       
      √ reading LWORD (8 ms)                                                                       
      √ reading LINT (18 ms)                                                                       
      √ reading ULINT (9 ms)                                                                       
      √ reading LREAL (35 ms)                                                                      
      √ reading WSTRING (17 ms)                                                                    
      √ reading LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                   
      √ reading LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                     
      √ reading LTOD (---- TODO: Needs TC 3.1.4026 ----)                                           
      √ reading LTIME (10 ms)                                                                      
    reading standard array values
      √ reading ARRAY OF BOOL (16 ms)                                                              
      √ reading ARRAY OF BYTE (5 ms)                                                               
      √ reading ARRAY OF WORD (5 ms)                                                               
      √ reading ARRAY OF DWORD (10 ms)                                                             
      √ reading ARRAY OF SINT (14 ms)                                                              
      √ reading ARRAY OF USINT (9 ms)                                                              
      √ reading ARRAY OF INT (17 ms)                                                               
      √ reading ARRAY OF UINT (9 ms)                                                               
      √ reading ARRAY OF DINT (16 ms)                                                              
      √ reading ARRAY OF UDINT (9 ms)                                                              
      √ reading ARRAY OF REAL (32 ms)                                                              
      √ reading ARRAY OF STRING (18 ms)                                                            
      √ reading ARRAY OF DATE (9 ms)                                                               
      √ reading ARRAY OF DT (18 ms)                                                                
      √ reading ARRAY OF TOD (15 ms)                                                               
      √ reading ARRAY OF TIME (10 ms)                                                              
      √ reading ARRAY OF LWORD (9 ms)                                                              
      √ reading ARRAY OF LINT (16 ms)                                                              
      √ reading ARRAY OF ULINT (10 ms)                                                             
      √ reading ARRAY OF LREAL (33 ms)                                                             
      √ reading ARRAY OF WSTRING (15 ms)                                                           
      √ reading ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                          
      √ reading ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)                                   
      √ reading ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                           
      √ reading ARRAY OF LTIME (9 ms)                                                              
    reading complex values                                                                         
      √ reading STRUCT (19 ms)                                                                     
      √ reading ALIAS (8 ms)                                                                       
      √ reading ENUM (45 ms)
      √ reading POINTER (address) (9 ms)                                                           
      √ reading SUBRANGE (9 ms)                                                                    
      √ reading UNION (25 ms)                                                                      
      √ reading FUNCTION_BLOCK (37 ms)                                                             
      √ reading INTERFACE (9 ms)                                                                   
    reading complex array values                                                                   
      √ reading ARRAY OF STRUCT (21 ms)                                                            
      √ reading ARRAY OF ALIAS (9 ms)                                                              
      √ reading ARRAY OF ENUM (41 ms)                                                              
      √ reading ARRAY OF POINTER (address) (6 ms)                                                  
      √ reading ARRAY OF SUBRANGE (8 ms)                                                           
      √ reading ARRAY OF UNION (9 ms)                                                              
      √ reading ARRAY OF FUNCTION_BLOCK (39 ms)                                                    
      √ reading ARRAY OF INTERFACE (9 ms)                                                          
    reading special types / cases                                                                  
      √ reading ARRAY with negative index (11 ms)                                                  
      √ reading multi-dimensional ARRAY (8 ms)                                                     
      √ reading ARRAY OF ARRAY (9 ms)                                                              
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (10 ms)                         
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (8 ms)                          
      √ reading an empty FUNCTION_BLOCK (9 ms)                                                     
      √ reading an empty STRUCT (10 ms)                                                            
      √ reading an empty ARRAY (8 ms)                                                              
      √ reading a single BIT (17 ms)                                                               
      √ reading a struct with BIT types (10 ms)                                                    
    reading dereferenced POINTER and REFERENCE values                                              
      √ reading POINTER (value) (9 ms)                                                             
      √ reading REFERENCE (value) (7 ms)                                                           
    reading raw data                                                                               
      √ reading a raw value (4 ms)                                                                 
      √ reading a raw value using symbol (4 ms)
      √ reading a raw value using path (4 ms)                                                      
      √ reading multiple raw values (multi/sum command) (7 ms)                                     
    reading (misc)                                                                                 
      √ reading a value using symbol (5 ms)                                                        
  writing values                                                                                   
    writing standard values                                                                        
      √ writing BOOL (24 ms)                                                                       
      √ writing BYTE (18 ms)                                                                       
      √ writing WORD (13 ms)                                                                       
      √ writing DWORD (15 ms)                                                                      
      √ writing SINT (26 ms)                                                                       
      √ writing USINT (13 ms)                                                                      
      √ writing INT (23 ms)                                                                        
      √ writing UINT (13 ms)                                                                       
      √ writing DINT (26 ms)                                                                       
      √ writing UDINT (12 ms)                                                                      
      √ writing REAL (45 ms)                                                                       
      √ writing STRING (23 ms)                                                                     
      √ writing DATE (12 ms)                                                                       
      √ writing DT (24 ms)                                                                         
      √ writing TOD (28 ms)                                                                        
      √ writing TIME (13 ms)                                                                       
      √ writing LWORD (11 ms)                                                                      
      √ writing LINT (25 ms)                                                                       
      √ writing ULINT (13 ms)                                                                      
      √ writing LREAL (45 ms)                                                                      
      √ writing WSTRING (19 ms)                                                                    
      √ writing LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                   
      √ writing LDT (---- TODO: Needs TC 3.1.4026 ----)
      √ writing LTOD (---- TODO: Needs TC 3.1.4026 ----)                                           
      √ writing LTIME (12 ms)                                                                      
    writing standard array values                                                                  
      √ writing ARRAY OF BOOL (24 ms)                                                              
      √ writing ARRAY OF BYTE (12 ms)                                                              
      √ writing ARRAY OF WORD (13 ms)                                                              
      √ writing ARRAY OF DWORD (13 ms)                                                             
      √ writing ARRAY OF SINT (25 ms)                                                              
      √ writing ARRAY OF USINT (13 ms)                                                             
      √ writing ARRAY OF INT (26 ms)                                                               
      √ writing ARRAY OF UINT (15 ms)                                                              
      √ writing ARRAY OF DINT (27 ms)                                                              
      √ writing ARRAY OF UDINT (13 ms)                                                             
      √ writing ARRAY OF REAL (49 ms)                                                              
      √ writing ARRAY OF STRING (26 ms)                                                            
      √ writing ARRAY OF DATE (10 ms)                                                              
      √ writing ARRAY OF DT (26 ms)                                                                
      √ writing ARRAY OF TOD (23 ms)                                                               
      √ writing ARRAY OF TIME (10 ms)                                                              
      √ writing ARRAY OF LWORD (12 ms)                                                             
      √ writing ARRAY OF LINT (25 ms)                                                              
      √ writing ARRAY OF ULINT (9 ms)                                                              
      √ writing ARRAY OF LREAL (51 ms)                                                             
      √ writing ARRAY OF WSTRING (25 ms)                                                           
      √ writing ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                          
      √ writing ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)                                   
      √ writing ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                           
      √ writing ARRAY OF LTIME (13 ms)
    writing complex values                                                                         
      √ writing STRUCT (31 ms)                                                                     
      √ writing ALIAS (15 ms)                                                                      
      √ writing ENUM (59 ms)                                                                       
      √ writing POINTER (address) (16 ms)                                                          
      √ writing SUBRANGE (21 ms)                                                                   
      √ writing UNION (50 ms)                                                                      
      √ writing FUNCTION_BLOCK (53 ms)                                                             
      √ writing INTERFACE (15 ms)                                                                  
    writing complex array values                                                                   
      √ writing ARRAY OF STRUCT (36 ms)                                                            
      √ writing ARRAY OF ALIAS (13 ms)                                                             
      √ writing ARRAY OF ENUM (54 ms)                                                              
      √ writing ARRAY OF POINTER (address) (14 ms)                                                 
      √ writing ARRAY OF SUBRANGE (13 ms)                                                          
      √ writing ARRAY OF UNION (18 ms)                                                             
      √ writing ARRAY OF FUNCTION_BLOCK (59 ms)                                                    
      √ writing ARRAY OF INTERFACE (17 ms)                                                         
    writing special types / cases                                                                  
      √ writing ARRAY with negative index (20 ms)                                                  
      √ writing multi-dimensional ARRAY (17 ms)                                                    
      √ writing ARRAY OF ARRAY (18 ms)                                                             
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '1'} (18 ms)                         
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '8'} (18 ms)                         
      √ writing an empty FUNCTION_BLOCK (8 ms)                                                     
      √ writing an empty STRUCT (10 ms)                                                            
      √ writing an empty ARRAY (9 ms)                                                              
      √ writing a single BIT (42 ms)                                                               
      √ writing a struct with BIT types (18 ms)                                                    
    writing dereferenced POINTER and REFERENCE values                                              
      √ writing POINTER (value) (37 ms)                                                            
      √ writing REFERENCE (value) (47 ms)                                                          
    writing raw data                                                                               
      √ writing a raw value (7 ms)                                                                 
      √ writing a raw value using symbol (10 ms)                                                   
      √ writing a raw value using path (16 ms)                                                     
      √ writing multiple raw values (multi/sum command) (28 ms)                                    
    writing (misc)                                                                                 
      √ writing a value using symbol (7 ms)                                                        
  variable handles                                                                                 
    √ creating and deleting a varible handle (18 ms)                                               
    √ reading value using a variable handle (10 ms)                                                
    √ writing value using a variable handle (31 ms)                                                
    √ creating and deleting multiple varible handles (multi/sum command) (12 ms)                   
  subscriptions (ADS notifications)                                                                
    √ subscribing and unsubscribing successfully (2034 ms)                                         
    √ subscribing to a changing value (10 ms) with default cycle time (2428 ms)                    
    √ subscribing to a changing value (10 ms) with 10 ms cycle time (39 ms)                        
    √ subscribing to a constant value with maximum delay of 2000 ms (2040 ms)                      
    √ subscribing to a raw ADS address (227 ms)                                                    
    √ subscribing using subscribeValue() (2033 ms)                                                 
    √ subscribing to a raw ADS address using subscribeRaw() (221 ms)                               
  remote procedure calls (RPC methods)                                                             
    √ calling a RPC method (13 ms)                                                                 
    √ calling a RPC method with struct parameters (13 ms)                                          
    √ calling a RPC method without return value and without parameters (13 ms)                     
  miscellaneous                                                                                    
    √ sending read write ADS command (9 ms)                                                        
    √ sending multiple read write ADS commands (multi/sum command) (15 ms)                         
  issue specific tests                                                                             
    issue 103 (https://github.com/jisotalo/ads-client/issues/103)                                  
      √ calling unsubscribeAll() multiple times (should not crash to unhandled exception) (86 ms)  
  disconnecting                                                                                    
    √ disconnecting client (7 ms)                                                                  
  controlling TwinCAT system service                                                               
    √ connecting (2 ms)                                                                            
    √ setting TwinCAT system to config (4024 ms)                                                   
    √ setting TwinCAT system to run (4024 ms)                                                      
    √ disconnecting (2 ms)                                                                         
  handling unknown/stale ADS notifications                                                         
    √ connecting (30 ms)                                                                           
    √ creating an unknown notification handle by forced disconnecting (1044 ms)                    
    √ deleting an unknown notification handle automatically (1031 ms)                              
    √ disconnecting (2 ms)                                                                         
                                                                                                   
Test Suites: 1 passed, 1 total                                                                     
Tests:       223 passed, 223 total                                                                 
Snapshots:   0 total
Time:        25.254 s
Ran all test suites.
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
