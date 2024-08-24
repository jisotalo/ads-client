# ads-client


[![npm version](https://img.shields.io/npm/v/ads-client)](https://www.npmjs.org/package/ads-client) 
[![GitHub](https://img.shields.io/badge/View%20on-GitHub-brightgreen)](https://github.com/jisotalo/ads-client)
[![License](https://img.shields.io/github/license/jisotalo/ads-client)](https://choosealicense.com/licenses/mit/)
[![Support](https://img.shields.io/badge/Donate-PayPal-yellow)](https://www.paypal.com/donate/?business=KUWBXXCVGZZME&no_recurring=0&currency_code=EUR)

Beckhoff TwinCAT ADS client library for Node.js (unofficial). 

Connect to a Beckhoff TwinCAT automation system using the ADS protocol from a Node.js app.

## v2 project status

**24.08.2024:** Beta 1 released! 

All breaking changes are (hopefully) now done.

* See [milestone #2](https://github.com/jisotalo/ads-client/milestone/2) for tasks to be done.
* See [MIGRATION.md](https://github.com/jisotalo/ads-client/blob/v2-dev/MIGRATION.md) for guide of migrating v1->v2
* See [CHANGELOG.md](https://github.com/jisotalo/ads-client/blob/v2-dev/CHANGELOG.md) for some more changes
* Clone repository and open `docs/index.html` in browser for documentation

## Getting started

README is under construction.

### Install
`npm install ads-client@beta`

### Create a client

```js
const { Client } = require('ads-client');

const client = new Client({
  targetAmsNetId: "localhost",
  targetAdsPort: 851
});
```

### Read a value

```js
const res = await client.readValue('GVL_Example.StringValue');
console.log(res.value);
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

`npm test` results - updated 24.08.2024

<details>
<summary>Click to show test results</summary>
<pre>
√ IMPORTANT NOTE: This test requires running a specific PLC project locally (https://github.com/jisotalo/ads-client-test-plc-project)                                                                                                                         
  connection
    √ client is not connected at beginning (1 ms)                                                                               
    √ checking ads client settings (1 ms)                                                                                       
    √ connecting to the target (31 ms)                                                                                          
    √ checking that test PLC project is active (13 ms)                                                                          
    √ checking that test PLC project version is correct (10 ms)                                                                 
    √ caching of symbols and data types (1 ms)                                                                                  
    √ reconnecting (36 ms)                                                                                                      
  resetting PLC to original state                                                                                               
    √ resetting PLC (514 ms)                                                                                                    
    √ checking that reset was successful (8 ms)                                                                                 
    √ checking that PLC is not running (12 ms)                                                                                  
    √ setting IsReset to false (4 ms)                                                                                           
    √ starting PLC (8 ms)                                                                                                       
    √ checking that test PLC project is running (506 ms)                                                                        
  testing PLC runtime stop, start, restart                                                                                      
    √ stopping PLC (16 ms)                                                                                                      
    √ starting PLC (15 ms)                                                                                                      
    √ restarting PLC (538 ms)                                                                                                   
  system state, PLC runtime states and device information                                                                       
    √ reading TwinCAT system state (7 ms)                                                                                       
    √ reading PLC runtime (port 851) state (5 ms)                                                                               
    √ reading PLC runtime (port 852) state (5 ms)                                                                               
    √ reading PLC runtime device info (4 ms)                                                                                    
    √ reading TwinCAT system device info (5 ms)                                                                                 
    √ reading PLC runtime symbol version (5 ms)                                                                                 
  symbols and data types                                                                                                        
    √ reading upload info (4 ms)                                                                                                
    √ reading all symbols (15 ms)                                                                                               
    √ reading single symbol information (2 ms)                                                                                  
    √ reading all data type information (19 ms)                                                                                 
    √ reading single data type information (2 ms)                                                                               
  data conversion                                                                                                               
    √ converting a raw PLC value to a Javascript variable (5 ms)                                                                
    √ converting a Javascript value to a raw PLC value (40 ms)                                                                  
  reading values                                                                                                                
    reading standard values                                                                                                     
      √ reading BOOL (15 ms)                                                                                                    
      √ reading BYTE (8 ms)                                                                                                     
      √ reading WORD (7 ms)                                                                                                     
      √ reading DWORD (6 ms)
      √ reading SINT (11 ms)                                                                                                    
      √ reading USINT (6 ms)                                                                                                    
      √ reading INT (13 ms)                                                                                                     
      √ reading UINT (7 ms)                                                                                                     
      √ reading DINT (15 ms)                                                                                                    
      √ reading UDINT (8 ms)                                                                                                    
      √ reading REAL (32 ms)                                                                                                    
      √ reading STRING (15 ms)                                                                                                  
      √ reading DATE (8 ms)                                                                                                     
      √ reading DT (13 ms)                                                                                                      
      √ reading TOD (16 ms)                                                                                                     
      √ reading TIME (9 ms)                                                                                                     
      √ reading LWORD (8 ms)                                                                                                    
      √ reading LINT (12 ms)                                                                                                    
      √ reading ULINT (7 ms)                                                                                                    
      √ reading LREAL (29 ms)                                                                                                   
      √ reading WSTRING (12 ms)                                                                                                 
      √ reading LDATE (---- TODO: Needs TC 3.1.4026 ----)                                                                       
      √ reading LDT (---- TODO: Needs TC 3.1.4026 ----)                                                                         
      √ reading LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                                        
      √ reading LTIME (7 ms)                                                                                                    
    reading standard array values                                                                                               
      √ reading ARRAY OF BOOL (13 ms)                                                                                           
      √ reading ARRAY OF BYTE (8 ms)                                                                                            
      √ reading ARRAY OF WORD (7 ms)                                                                                            
      √ reading ARRAY OF DWORD (8 ms)                                                                                           
      √ reading ARRAY OF SINT (13 ms)                                                                                           
      √ reading ARRAY OF USINT (7 ms)                                                                                           
      √ reading ARRAY OF INT (15 ms)                                                                                            
      √ reading ARRAY OF UINT (8 ms)                                                                                            
      √ reading ARRAY OF DINT (16 ms)                                                                                           
      √ reading ARRAY OF UDINT (10 ms)                                                                                          
      √ reading ARRAY OF REAL (31 ms)                                                                                           
      √ reading ARRAY OF STRING (15 ms)                                                                                         
      √ reading ARRAY OF DATE (3 ms)                                                                                            
      √ reading ARRAY OF DT (14 ms)                                                                                             
      √ reading ARRAY OF TOD (14 ms)                                                                                            
      √ reading ARRAY OF TIME (8 ms)                                                                                            
      √ reading ARRAY OF LWORD (4 ms)                                                                                           
      √ reading ARRAY OF LINT (10 ms)                                                                                           
      √ reading ARRAY OF ULINT (4 ms)                                                                                           
      √ reading ARRAY OF LREAL (24 ms)                                                                                          
      √ reading ARRAY OF WSTRING (13 ms)                                                                                        
      √ reading ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----)                                                              
      √ reading ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)                                                                
      √ reading ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                               
      √ reading ARRAY OF LTIME (6 ms)                                                                                           
    reading complex values                                                                                                      
      √ reading STRUCT (15 ms)                                                                                                  
      √ reading ALIAS (5 ms)                                                                                                    
      √ reading ENUM (41 ms)                                                                                                    
      √ reading POINTER (address) (7 ms)                                                                                        
      √ reading SUBRANGE (7 ms)                                                                                                 
      √ reading UNION (23 ms)                                                                                                   
      √ reading FUNCTION_BLOCK (29 ms)                                                                                          
      √ reading INTERFACE (9 ms)                                                                                                
    reading complex array values                                                                                                
      √ reading ARRAY OF STRUCT (18 ms)                                                                                         
      √ reading ARRAY OF ALIAS (8 ms)                                                                                           
      √ reading ARRAY OF ENUM (40 ms)                                                                                           
      √ reading ARRAY OF POINTER (address) (7 ms)                                                                               
      √ reading ARRAY OF SUBRANGE (7 ms)
      √ reading ARRAY OF UNION (8 ms)                                                                                           
      √ reading ARRAY OF FUNCTION_BLOCK (32 ms)                                                                                 
      √ reading ARRAY OF INTERFACE (6 ms)                                                                                       
    reading special types / cases                                                                                               
      √ reading ARRAY with negative index (7 ms)                                                                                
      √ reading multi-dimensional ARRAY (8 ms)                                                                                  
      √ reading ARRAY OF ARRAY (8 ms)                                                                                           
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (9 ms)                                                       
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (9 ms)                                                       
      √ reading an empty FUNCTION_BLOCK (7 ms)                                                                                  
      √ reading an empty STRUCT (8 ms)                                                                                          
      √ reading an empty ARRAY (7 ms)                                                                                           
      √ reading a single BIT (14 ms)                                                                                            
      √ reading a struct with BIT types (8 ms)                                                                                  
    reading dereferenced POINTER and REFERENCE values                                                                           
      √ reading POINTER (value) (8 ms)                                                                                          
      √ reading REFERENCE (value) (8 ms)                                                                                        
    reading raw data                                                                                                            
      √ reading a raw value (5 ms)                                                                                              
      √ reading a raw value using symbol (3 ms)                                                                                 
      √ reading a raw value using path (2 ms)                                                                                   
      √ reading multiple raw values (multi/sum command) (5 ms)                                                                  
    reading (misc)                                                                                                              
      √ reading a value using symbol (5 ms)                                                                                     
  writing values                                                                                                                
    writing standard values                                                                                                     
      √ writing BOOL (23 ms)                                                                                                    
      √ writing BYTE (11 ms)                                                                                                    
      √ writing WORD (9 ms)                                                                                                     
      √ writing DWORD (9 ms)                                                                                                    
      √ writing SINT (24 ms)                                                                                                    
      √ writing USINT (12 ms)                                                                                                   
      √ writing INT (22 ms)                                                                                                     
      √ writing UINT (11 ms)                                                                                                    
      √ writing DINT (22 ms)                                                                                                    
      √ writing UDINT (9 ms)                                                                                                    
      √ writing REAL (47 ms)                                                                                                    
      √ writing STRING (24 ms)                                                                                                  
      √ writing DATE (12 ms)                                                                                                    
      √ writing DT (22 ms)                                                                                                      
      √ writing TOD (23 ms)                                                                                                     
      √ writing TIME (12 ms)
      √ writing LWORD (12 ms)                                                                                                   
      √ writing LINT (25 ms)                                                                                                    
      √ writing ULINT (12 ms)                                                                                                   
      √ writing LREAL (47 ms)                                                                                                   
      √ writing WSTRING (21 ms)                                                                                                 
      √ writing LDATE (---- TODO: Needs TC 3.1.4026 ----)                                                                       
      √ writing LDT (---- TODO: Needs TC 3.1.4026 ----)                                                                         
      √ writing LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                                        
      √ writing LTIME (11 ms)                                                                                                   
    writing standard array values                                                                                               
      √ writing ARRAY OF BOOL (25 ms)                                                                                           
      √ writing ARRAY OF BYTE (12 ms)                                                                                           
      √ writing ARRAY OF WORD (10 ms)                                                                                           
      √ writing ARRAY OF DWORD (13 ms)                                                                                          
      √ writing ARRAY OF SINT (18 ms)                                                                                           
      √ writing ARRAY OF USINT (9 ms)                                                                                           
      √ writing ARRAY OF INT (19 ms)                                                                                            
      √ writing ARRAY OF UINT (12 ms)                                                                                           
      √ writing ARRAY OF DINT (19 ms)                                                                                           
      √ writing ARRAY OF UDINT (10 ms)                                                                                          
      √ writing ARRAY OF REAL (48 ms)                                                                                           
      √ writing ARRAY OF STRING (25 ms)                                                                                         
      √ writing ARRAY OF DATE (11 ms)                                                                                           
      √ writing ARRAY OF DT (21 ms)                                                                                             
      √ writing ARRAY OF TOD (25 ms)                                                                                            
      √ writing ARRAY OF TIME (12 ms)                                                                                           
      √ writing ARRAY OF LWORD (13 ms)                                                                                          
      √ writing ARRAY OF LINT (23 ms)                                                                                           
      √ writing ARRAY OF ULINT (12 ms)                                                                                          
      √ writing ARRAY OF LREAL (48 ms)                                                                                          
      √ writing ARRAY OF WSTRING (23 ms)                                                                                        
      √ writing ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----)                                                              
      √ writing ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                         
      √ writing ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                               
      √ writing ARRAY OF LTIME (12 ms)                                                                                          
    writing complex values                                                                                                      
      √ writing STRUCT (22 ms)                                                                                                  
      √ writing ALIAS (11 ms)                                                                                                   
      √ writing ENUM (54 ms)                                                                                                    
      √ writing POINTER (address) (17 ms)                                                                                       
      √ writing SUBRANGE (20 ms)                                                                                                
      √ writing UNION (48 ms)                                                                                                   
      √ writing FUNCTION_BLOCK (47 ms)                                                                                          
      √ writing INTERFACE (15 ms)                                                                                               
    writing complex array values                                                                                                
      √ writing ARRAY OF STRUCT (26 ms)                                                                                         
      √ writing ARRAY OF ALIAS (13 ms)                                                                                          
      √ writing ARRAY OF ENUM (55 ms)                                                                                           
      √ writing ARRAY OF POINTER (address) (16 ms)                                                                              
      √ writing ARRAY OF SUBRANGE (11 ms)                                                                                       
      √ writing ARRAY OF UNION (13 ms)                                                                                          
      √ writing ARRAY OF FUNCTION_BLOCK (48 ms)                                                                                 
      √ writing ARRAY OF INTERFACE (15 ms)                                                                                      
    writing special types / cases                                                                                               
      √ writing ARRAY with negative index (17 ms)                                                                               
      √ writing multi-dimensional ARRAY (16 ms)                                                                                 
      √ writing ARRAY OF ARRAY (16 ms)                                                                                          
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '1'} (14 ms)                                                      
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '8'} (14 ms)                                                      
      √ writing an empty FUNCTION_BLOCK (7 ms)                                                                                  
      √ writing an empty STRUCT (8 ms)                                                                                          
      √ writing an empty ARRAY (7 ms)                                                                                           
      √ writing a single BIT (39 ms)                                                                                            
      √ writing a struct with BIT types (15 ms)                                                                                 
    writing dereferenced POINTER and REFERENCE values                                                                           
      √ writing POINTER (value) (21 ms)                                                                                         
      √ writing REFERENCE (value) (21 ms)                                                                                       
    writing raw data                                                                                                            
      √ writing a raw value (7 ms)                                                                                              
      √ writing a raw value using symbol (5 ms)                                                                                 
      √ writing a raw value using path (16 ms)                                                                                  
      √ writing multiple raw values (multi/sum command) (18 ms)                                                                 
    writing (misc)                                                                                                              
      √ writing a value using symbol (7 ms)                                                                                     
  variable handles                                                                                                              
    √ creating and deleting a varible handle (14 ms)
    √ reading value using a variable handle (10 ms)                                                                             
    √ writing value using a variable handle (31 ms)                                                                             
    √ creating and deleting multiple varible handles (multi/sum command) (9 ms)                                                 
  subscriptions (ADS notifications)                                                                                             
    √ subscribing and unsubscribing successfully (2036 ms)                                                                      
    √ subscribing to a changing value (10 ms) with default cycle time (3028 ms)                                                 
    √ subscribing to a changing value (10 ms) with 10 ms cycle time (27 ms)                                                     
    √ subscribing to a constant value with maximum delay of 2000 ms (2036 ms)                                                   
    √ subscribing to a raw ADS address (229 ms)                                                                                 
    √ subscribing using subscribeSymbol() (2020 ms)                                                                             
    √ subscribing to a raw ADS address using subscribeRaw() (219 ms)                                                            
  remote procedure calls (RPC methods)                                                                                          
    √ calling a RPC method (15 ms)                                                                                              
    √ calling a RPC method with struct parameters (14 ms)                                                                       
    √ calling a RPC method without return value and without parameters (9 ms)                                                   
  miscellaneous                                                                                                                 
    √ sending read write ADS command (6 ms)                                                                                     
    √ sending multiple read write ADS commands (multi/sum command) (10 ms)                                                      
  issue specific tests                                                                                                          
    issue 103 (https://github.com/jisotalo/ads-client/issues/103)                                                               
      √ calling unsubscribeAll() multiple times (should not crash to unhandled exception) (51 ms)                               
  disconnecting                                                                                                                 
    √ disconnecting client (5 ms)                                                                                               
  controlling TwinCAT system service                                                                                            
    √ connecting (1 ms)                                                                                                         
    √ setting TwinCAT system to config (2022 ms)                                                                                
    √ setting TwinCAT system to run (2027 ms)                                                                                   
    √ disconnecting (2 ms)   
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
