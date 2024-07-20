# ads-client


[![npm version](https://img.shields.io/npm/v/ads-client)](https://www.npmjs.org/package/ads-client) 
[![GitHub](https://img.shields.io/badge/View%20on-GitHub-brightgreen)](https://github.com/jisotalo/ads-client)
[![License](https://img.shields.io/github/license/jisotalo/ads-client)](https://choosealicense.com/licenses/mit/)
[![Support](https://img.shields.io/badge/Support_with-PayPal-yellow)](https://www.paypal.com/donate/?business=KUWBXXCVGZZME&no_recurring=0&currency_code=EUR)

Beckhoff TwinCAT ADS client library for Node.js (unofficial). 

Connects to Beckhoff TwinCAT automation systems using ADS protocol from a Node.js app.

This project is coded from scratch using
* [TwinCAT ADS specification](https://infosys.beckhoff.com/content/1033/tc3_ads_intro/116157835.html?id=124964102706356243)
* [Beckhoff.TwinCAT.Ads nuget package](https://www.nuget.org/packages/Beckhoff.TwinCAT.Ads/)
* [TwinCAT ADS-monitor](https://www.beckhoff.com/en-en/products/automation/twincat/tfxxxx-twincat-3-functions/tf6xxx-tc3-connectivity/tf6010.html)
* [WireShark](https://www.wireshark.org/)

# Project status
This is version 2.0 branch of the project. 

The target of 2.0 is to rewrite evertyhing in Typescript. During the development some features are added, caching is optimized and everything is checked for possible improvements.

**This branch is not ready for production use!**

## Development status

`npm test` results - updated 18.07.2024

```
  √ IMPORTANT NOTE: This test requires running a specific PLC project locally (https://github.com/jisotalo/ads-client-test-plc-project) (1 ms)                                                                                                                                            
  connection
    √ client is not connected at beginning                                                                                                   
    √ checking ads client settings                                                                                                           
    √ connecting to the target (39 ms)                                                                                                       
    √ checking that test PLC project is active (13 ms)                                                                                       
    √ checking that test PLC project version is correct (10 ms)                                                                              
    √ reconnecting (25 ms)                                                                                                                   
  resetting PLC to original state                                                                                                            
    √ resetting PLC (7 ms)                                                                                                                   
    √ checking that reset was successful (4 ms)                                                                                              
    √ checking that PLC is not running (10 ms)                                                                                               
    √ setting IsReset to false (3 ms)                                                                                                        
    √ starting PLC (10 ms)                                                                                                                   
    √ checking that test PLC project is running (506 ms)                                                                                     
  testing PLC runtime stop, start, restart                                                                                                   
    √ stopping PLC (16 ms)                                                                                                                   
    √ starting PLC (13 ms)                                                                                                                   
    √ restarting PLC (536 ms)                                                                                                                
  system state, PLC runtime states and device information                                                                                    
    √ reading TwinCAT system state (7 ms)                                                                                                    
    √ reading PLC runtime (port 851) state (6 ms)                                                                                            
    √ reading PLC runtime (port 852) state (4 ms)                                                                                            
    √ reading PLC runtime device info (5 ms)                                                                                                 
    √ reading TwinCAT system device info (6 ms)                                                                                              
    √ reading PLC runtime symbol version (4 ms)                                                                                              
  symbols and data types                                                                                                                     
    √ reading upload info (3 ms)                                                                                                             
    √ reading all symbol information (17 ms)                                                                                                 
    √ reading single symbol information (1 ms)                                                                                               
    √ reading all data type information (21 ms)                                                                                              
    √ reading single data type information (4 ms)                                                                                            
  data conversion                                                                                                                            
    √ converting a raw PLC value to a Javascript variable (4 ms)                                                                             
    √ converting a Javascript value to a raw PLC value (45 ms)                                                                               
  reading values                                                                                                                             
    reading standard values                                                                                                                  
      √ reading BOOL (16 ms)
      √ reading BYTE (8 ms)                                                                                                                  
      √ reading WORD (8 ms)                                                                                                                  
      √ reading DWORD (8 ms)                                                                                                                 
      √ reading SINT (16 ms)                                                                                                                 
      √ reading USINT (8 ms)                                                                                                                 
      √ reading INT (16 ms)                                                                                                                  
      √ reading UINT (9 ms)                                                                                                                  
      √ reading DINT (15 ms)                                                                                                                 
      √ reading UDINT (7 ms)                                                                                                                 
      √ reading REAL (32 ms)                                                                                                                 
      √ reading STRING (16 ms)                                                                                                               
      √ reading DATE (7 ms)                                                                                                                  
      √ reading DT (16 ms)                                                                                                                   
      √ reading TOD (13 ms)                                                                                                                  
      √ reading TIME (7 ms)                                                                                                                  
      √ reading LWORD (7 ms)                                                                                                                 
      √ reading LINT (15 ms)                                                                                                                 
      √ reading ULINT (9 ms)                                                                                                                 
      √ reading LREAL (32 ms)                                                                                                                
      √ reading WSTRING (17 ms)                                                                                                              
      √ reading LDATE (---- TODO: Needs TC 3.1.4026 ----)                                                                                    
      √ reading LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                                               
      √ reading LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                                                     
      √ reading LTIME (8 ms)                                                                                                                 
    reading standard array values                                                                                                            
      √ reading ARRAY OF BOOL (19 ms)                                                                                                        
      √ reading ARRAY OF BYTE (8 ms)                                                                                                         
      √ reading ARRAY OF WORD (8 ms)                                                                                                         
      √ reading ARRAY OF DWORD (8 ms)                                                                                                        
      √ reading ARRAY OF SINT (14 ms)                                                                                                        
      √ reading ARRAY OF USINT (8 ms)                                                                                                        
      √ reading ARRAY OF INT (15 ms)                                                                                                         
      √ reading ARRAY OF UINT (7 ms)                                                                                                         
      √ reading ARRAY OF DINT (15 ms)                                                                                                        
      √ reading ARRAY OF UDINT (7 ms)                                                                                                        
      √ reading ARRAY OF REAL (33 ms)                                                                                                        
      √ reading ARRAY OF STRING (15 ms)                                                                                                      
      √ reading ARRAY OF DATE (7 ms)                                                                                                         
      √ reading ARRAY OF DT (12 ms)                                                                                                          
      √ reading ARRAY OF TOD (16 ms)                                                                                                         
      √ reading ARRAY OF TIME (7 ms)                                                                                                         
      √ reading ARRAY OF LWORD (5 ms)                                                                                                        
      √ reading ARRAY OF LINT (14 ms)                                                                                                        
      √ reading ARRAY OF ULINT (9 ms)                                                                                                        
      √ reading ARRAY OF LREAL (36 ms)                                                                                                       
      √ reading ARRAY OF WSTRING (17 ms)                                                                                                     
      √ reading ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----)                                                                           
      √ reading ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)                                                                             
      √ reading ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                                            
      √ reading ARRAY OF LTIME (7 ms)                                                                                                        
    reading complex values                                                                                                                   
      √ reading STRUCT (20 ms)                                                                                                               
      √ reading ALIAS (8 ms)                                                                                                                 
      √ reading ENUM (45 ms)                                                                                                                 
      √ reading POINTER (address) (9 ms)                                                                                                     
      √ reading SUBRANGE (10 ms)                                                                                                             
      √ reading UNION (26 ms)                                                                                                                
      √ reading FUNCTION_BLOCK (37 ms)                                                                                                       
      √ reading INTERFACE (7 ms)                                                                                                             
    reading complex array values                                                                                                             
      √ reading ARRAY OF STRUCT (27 ms)                                                                                                      
      √ reading ARRAY OF ALIAS (7 ms)                                                                                                        
      √ reading ARRAY OF ENUM (42 ms)                                                                                                        
      √ reading ARRAY OF POINTER (address) (5 ms)                                                                                            
      √ reading ARRAY OF SUBRANGE (9 ms)                                                                                                     
      √ reading ARRAY OF UNION (7 ms)                                                                                                        
      √ reading ARRAY OF FUNCTION_BLOCK (38 ms)                                                                                              
      √ reading ARRAY OF INTERFACE (8 ms)                                                                                                    
    reading special types / cases                                                                                                            
      √ reading ARRAY with negative index (9 ms)                                                                                             
      √ reading multi-dimensional ARRAY (10 ms)                                                                                              
      √ reading ARRAY OF ARRAY (7 ms)                                                                                                        
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (8 ms)                                                                    
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (7 ms)                                                                    
      √ reading an empty FUNCTION_BLOCK (7 ms)                                                                                               
      √ reading an empty STRUCT (8 ms)                                                                                                       
      √ reading an empty ARRAY (6 ms)                                                                                                        
    reading dereferenced POINTER and REFERENCE values                                                                                        
      √ reading POINTER (value) (8 ms)                                                                                                       
      √ reading REFERENCE (value) (10 ms)                                                                                                    
    reading raw data                                                                                                                         
      √ reading a raw value (4 ms)                                                                                                           
      √ reading a raw value using symbol (5 ms)                                                                                              
      √ reading a raw value using path (3 ms)                                                                                                
      √ reading multiple raw values (multi/sum command) (5 ms)                                                                               
  writing values                                                                                                                             
    writing standard values                                                                                                                  
      √ writing BOOL (22 ms)                                                                                                                 
      √ writing BYTE (11 ms)                                                                                                                 
      √ writing WORD (12 ms)                                                                                                                 
      √ writing DWORD (12 ms)                                                                                                                
      √ writing SINT (25 ms)                                                                                                                 
      √ writing USINT (9 ms)                                                                                                                 
      √ writing INT (25 ms)                                                                                                                  
      √ writing UINT (13 ms)                                                                                                                 
      √ writing DINT (24 ms)                                                                                                                 
      √ writing UDINT (12 ms)                                                                                                                
      √ writing REAL (44 ms)                                                                                                                 
      √ writing STRING (25 ms)                                                                                                               
      √ writing DATE (12 ms)                                                                                                                 
      √ writing DT (23 ms)                                                                                                                   
      √ writing TOD (23 ms)                                                                                                                  
      √ writing TIME (13 ms)                                                                                                                 
      √ writing LWORD (13 ms)                                                                                                                
      √ writing LINT (19 ms)                                                                                                                 
      √ writing ULINT (9 ms)                                                                                                                 
      √ writing LREAL (34 ms)                                                                                                                
      √ writing WSTRING (15 ms)                                                                                                              
      √ writing LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                                             
      √ writing LDT (---- TODO: Needs TC 3.1.4026 ----)                                                                                      
      √ writing LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                                              
      √ writing LTIME (9 ms)                                                                                                                 
    writing standard array values                                                                                                            
      √ writing ARRAY OF BOOL (23 ms)                                                                                                        
      √ writing ARRAY OF BYTE (13 ms)                                                                                                        
      √ writing ARRAY OF WORD (11 ms)                                                                                                        
      √ writing ARRAY OF DWORD (13 ms)                                                                                                       
      √ writing ARRAY OF SINT (19 ms)                                                                                                        
      √ writing ARRAY OF USINT (12 ms)                                                                                                       
      √ writing ARRAY OF INT (23 ms)                                                                                                         
      √ writing ARRAY OF UINT (13 ms)                                                                                                        
      √ writing ARRAY OF DINT (25 ms)                                                                                                        
      √ writing ARRAY OF UDINT (15 ms)                                                                                                       
      √ writing ARRAY OF REAL (49 ms)                                                                                                        
      √ writing ARRAY OF STRING (23 ms)                                                                                                      
      √ writing ARRAY OF DATE (10 ms)                                                                                                        
      √ writing ARRAY OF DT (22 ms)                                                                                                          
      √ writing ARRAY OF TOD (24 ms)                                                                                                         
      √ writing ARRAY OF TIME (13 ms)                                                                                                        
      √ writing ARRAY OF LWORD (11 ms)                                                                                                       
      √ writing ARRAY OF LINT (24 ms)                                                                                                        
      √ writing ARRAY OF ULINT (12 ms)                                                                                                       
      √ writing ARRAY OF LREAL (49 ms)                                                                                                       
      √ writing ARRAY OF WSTRING (24 ms)                                                                                                     
      √ writing ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                                    
      √ writing ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)                                                                             
      √ writing ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                                     
      √ writing ARRAY OF LTIME (12 ms)                                                                                                       
    writing complex values                                                                                                                   
      √ writing STRUCT (30 ms)                                                                                                               
      √ writing ALIAS (13 ms)                                                                                                                
      √ writing ENUM (59 ms)                                                                                                                 
      √ writing POINTER (address) (15 ms)                                                                                                    
      √ writing SUBRANGE (19 ms)                                                                                                             
      √ writing UNION (50 ms)                                                                                                                
      √ writing FUNCTION_BLOCK (48 ms)                                                                                                       
      √ writing INTERFACE (16 ms)                                                                                                            
    writing complex array values                                                                                                             
      √ writing ARRAY OF STRUCT (30 ms)                                                                                                      
      √ writing ARRAY OF ALIAS (10 ms)                                                                                                       
      √ writing ARRAY OF ENUM (58 ms)                                                                                                        
      √ writing ARRAY OF POINTER (address) (16 ms)                                                                                           
      √ writing ARRAY OF SUBRANGE (11 ms)                                                                                                    
      √ writing ARRAY OF UNION (14 ms)                                                                                                       
      √ writing ARRAY OF FUNCTION_BLOCK (74 ms)                                                                                              
      √ writing ARRAY OF INTERFACE (15 ms)                                                                                                   
    writing special types / cases                                                                                                            
      √ writing ARRAY with negative index (15 ms)                                                                                            
      √ writing multi-dimensional ARRAY (20 ms)                                                                                              
      √ writing ARRAY OF ARRAY (30 ms)                                                                                                       
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '1'} (15 ms)                                                                   
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '8'} (12 ms)                                                                   
      √ writing an empty FUNCTION_BLOCK (8 ms)                                                                                               
      √ writing an empty STRUCT (8 ms)                                                                                                       
    writing dereferenced POINTER and REFERENCE values                                                                                        
      √ writing POINTER (value) (20 ms)                                                                                                      
      √ writing REFERENCE (value) (19 ms)                                                                                                    
    writing raw data                                                                                                                         
      √ writing a raw value (7 ms)                                                                                                           
      √ writing a raw value using symbol (6 ms)                                                                                              
      √ writing a raw value using path (14 ms)                                                                                               
      √ writing multiple raw values (multi/sum command) (19 ms)                                                                              
    using variable handles for reading and writing                                                                                           
      √ creating and deleting a varible handle (15 ms)                                                                                       
      √ reading value using a variable handle (13 ms)                                                                                        
      √ writing value using a variable handle (31 ms)                                                                                        
      √ creating and deleting multiple varible handles (multi/sum command) (10 ms)                                                           
  subscriptions (ADS notifications)                                                                                                          
    √ subscribing and unsubscribing successfully (2037 ms)                                                                                   
    √ subscribing to a changing value (10 ms) with default cycle time (2833 ms)                                                              
    √ subscribing to a changing value (10 ms) with 10 ms cycle time (29 ms)                                                                  
    √ subscribing to a constant value with maximum delay of 2000 ms (2041 ms)                                                                
    √ subscribing to a raw ADS address (229 ms)                                                                                              
  remote procedure calls (RPC methods)
    √ calling a RPC method (16 ms)                                                                                                           
    √ calling a RPC method with struct parameters (15 ms)                                                                                    
    √ calling a RPC method without return value and without parameters (13 ms)                                                               
  miscellaneous                                                                                                                              
    √ ReadWrite ADS command (8 ms)                                                                                                           
  issue specific tests                                                                                                                       
    issue 103 (https://github.com/jisotalo/ads-client/issues/103)                                                                            
      √ calling unsubscribeAll() multiple times (should not crash to unhandled exception) (76 ms)                                            
  disconnecting                                                                                                                              
    √ disconnecting client                                                                                                                   
  controlling TwinCAT system service                                                                                                         
    √ connecting (2 ms)                                                                                                                      
    √ setting TwinCAT system to config (2022 ms)                                                                                             
    √ setting TwinCAT system to run (2021 ms)                                                                                                
    √ disconnecting (1 ms)                                                                            
```


# License

Licensed under [MIT License](http://www.opensource.org/licenses/MIT) so commercial use is possible.


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
