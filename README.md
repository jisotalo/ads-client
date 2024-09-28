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

## TwinCAT 2

The library works also with TwinCAT 2.

Please note the following things when communicating with TC2 systems:
* ADS port for first PLC runtime is 801 instead of 851
* All variable names are in UPPERCASE
* All data type names are in UPPERCASE
* Global variables are accessed with dot (`.`) prefix, without the GVL name
* ENUMs are always numeric values only
* Empty structs and function blocks (no members) can't be read

See the TwinCAT 2 tests for supported and tested features.

## Library testing

Target is that library has tests for all its features, see `./test/` directory. 
This prevents regression, thus updating the ads-client should be always safe.

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
