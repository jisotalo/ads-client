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
    √ client is not connected at beginning (1 ms)                            
    √ checking ads client settings (1 ms)                                    
    √ connecting to the target (33 ms)                                       
    √ checking that test PLC project is active (11 ms)                       
    √ checking that test PLC project version is correct (9 ms)               
    √ reconnecting (30 ms)                                                   
  resetting PLC to original state                                            
    √ resetting PLC (12 ms)                                                  
    √ checking that reset was successful (7 ms)                              
    √ checking that PLC is not running (12 ms)                               
    √ setting IsReset to false (3 ms)                                        
    √ starting PLC (8 ms)                                                    
    √ checking that test PLC project is running (504 ms)                     
  testing PLC runtime stop, start, restart                                   
    √ stopping PLC (19 ms)                                                   
    √ starting PLC (15 ms)                                                   
    √ restarting PLC (530 ms)                                                
  system state, PLC runtime states and device information                    
    √ reading TwinCAT system state (7 ms)                                    
    √ reading PLC runtime (port 851) state (6 ms)                            
    √ reading PLC runtime (port 852) state (3 ms)                            
    √ reading PLC runtime device info (7 ms)                                 
    √ reading TwinCAT system device info (6 ms)                              
    √ reading PLC runtime symbol version (3 ms)                              
  symbols and data types                                                     
    √ reading upload info (4 ms)                                             
    √ reading all symbol information (15 ms)                                 
    √ reading single symbol information (1 ms)                               
    √ reading all data type information (16 ms)                              
    √ reading single data type information (3 ms)                            
  data conversion                                                            
    √ converting a raw PLC value to a Javascript variable (5 ms)             
    √ converting a Javascript value to a raw PLC value (44 ms)               
  reading values                                                             
    reading standard values                                                  
      √ reading BOOL (14 ms)                                                 
      √ reading BYTE (5 ms)                                                  
      √ reading WORD (8 ms)                                                  
      √ reading DWORD (7 ms)                                                 
      √ reading SINT (13 ms)                                                 
      √ reading USINT (8 ms)                                                 
      √ reading INT (17 ms)                                                  
      √ reading UINT (7 ms)                                                  
      √ reading DINT (12 ms)                                                 
      √ reading UDINT (6 ms)                                                 
      √ reading REAL (26 ms)                                                 
      √ reading STRING (9 ms)                                                
      √ reading DATE (6 ms)                                                  
      √ reading DT (12 ms)                                                   
      √ reading TOD (11 ms)                                                  
      √ reading TIME (8 ms)                                                  
      √ reading LWORD (7 ms)                                                 
      √ reading LINT (12 ms)                                                 
      √ reading ULINT (7 ms)                                                 
      √ reading LREAL (26 ms)                                                
      √ reading WSTRING (15 ms)                                              
      √ reading LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)             
      √ reading LDT (---- TODO: Needs TC 3.1.4026 ----)                      
      √ reading LTOD (---- TODO: Needs TC 3.1.4026 ----)                     
      √ reading LTIME (8 ms)                                                 
    reading standard array values                                            
      √ reading ARRAY OF BOOL (14 ms)                                        
      √ reading ARRAY OF BYTE (5 ms)                                         
      √ reading ARRAY OF WORD (6 ms)                                         
      √ reading ARRAY OF DWORD (7 ms)                                        
      √ reading ARRAY OF SINT (11 ms)                                        
      √ reading ARRAY OF USINT (6 ms)                                        
      √ reading ARRAY OF INT (14 ms)                                         
      √ reading ARRAY OF UINT (7 ms)
      √ reading ARRAY OF DINT (17 ms)                                        
      √ reading ARRAY OF UDINT (6 ms)                                        
      √ reading ARRAY OF REAL (32 ms)                                        
      √ reading ARRAY OF STRING (17 ms)                                      
      √ reading ARRAY OF DATE (5 ms)                                         
      √ reading ARRAY OF DT (15 ms)                                          
      √ reading ARRAY OF TOD (16 ms)                                         
      √ reading ARRAY OF TIME (8 ms)                                         
      √ reading ARRAY OF LWORD (9 ms)                                        
      √ reading ARRAY OF LINT (13 ms)                                        
      √ reading ARRAY OF ULINT (8 ms)                                        
      √ reading ARRAY OF LREAL (25 ms)                                       
      √ reading ARRAY OF WSTRING (15 ms)                                     
      √ reading ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)    
      √ reading ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)      
      √ reading ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)            
      √ reading ARRAY OF LTIME (6 ms)                                        
    reading complex values                                                   
      √ reading STRUCT (17 ms)                                               
      √ reading ALIAS (4 ms)                                                 
      √ reading ENUM (40 ms)                                                 
      √ reading POINTER (address) (6 ms)                                     
      √ reading SUBRANGE (5 ms)                                              
      √ reading UNION (24 ms)                                                
      √ reading FUNCTION_BLOCK (29 ms)                                       
      √ reading INTERFACE (8 ms)                                             
    reading complex array values                                             
      √ reading ARRAY OF STRUCT (19 ms)                                      
      √ reading ARRAY OF ALIAS (7 ms)                                        
      √ reading ARRAY OF ENUM (36 ms)                                        
      √ reading ARRAY OF POINTER (address) (6 ms)                            
      √ reading ARRAY OF SUBRANGE (6 ms)                                     
      √ reading ARRAY OF UNION (8 ms)                                        
      √ reading ARRAY OF FUNCTION_BLOCK (33 ms)                              
      √ reading ARRAY OF INTERFACE (10 ms)                                   
    reading special types / cases                                            
      √ reading ARRAY with negative index (9 ms)                             
      √ reading multi-dimensional ARRAY (5 ms)                               
      √ reading ARRAY OF ARRAY (7 ms)                                        
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (8 ms)    
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (6 ms)    
      √ reading an empty FUNCTION_BLOCK (8 ms)                               
      √ reading an empty STRUCT (5 ms)                                       
      √ reading an empty ARRAY (7 ms)                                        
    reading dereferenced POINTER and REFERENCE values                        
      √ reading POINTER (value) (8 ms)                                       
      √ reading REFERENCE (value) (8 ms)                                     
    reading raw data                                                         
      √ reading a raw value (4 ms)                                           
      √ reading a raw value using symbol (5 ms)                              
      √ reading a raw value using path (3 ms)                                
      √ reading multiple raw values (multi/sum command) (5 ms)               
  writing values
    writing standard values                                                  
      √ writing BOOL (21 ms)                                                 
      √ writing BYTE (9 ms)                                                  
      √ writing WORD (12 ms)                                                 
      √ writing DWORD (9 ms)                                                 
      √ writing SINT (24 ms)                                                 
      √ writing USINT (10 ms)                                                
      √ writing INT (24 ms)                                                  
      √ writing UINT (8 ms)                                                  
      √ writing DINT (22 ms)                                                 
      √ writing UDINT (11 ms)                                                
      √ writing REAL (40 ms)                                                 
      √ writing STRING (21 ms)                                               
      √ writing DATE (12 ms)                                                 
      √ writing DT (24 ms)                                                   
      √ writing TOD (22 ms)                                                  
      √ writing TIME (10 ms)                                                 
      √ writing LWORD (13 ms)                                                
      √ writing LINT (21 ms)                                                 
      √ writing ULINT (12 ms)                                                
      √ writing LREAL (45 ms)                                                
      √ writing WSTRING (21 ms)                                              
      √ writing LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)             
      √ writing LDT (---- TODO: Needs TC 3.1.4026 ----)                      
      √ writing LTOD (---- TODO: Needs TC 3.1.4026 ----)                     
      √ writing LTIME (13 ms)                                                
    writing standard array values                                            
      √ writing ARRAY OF BOOL (24 ms)                                        
      √ writing ARRAY OF BYTE (11 ms)                                        
      √ writing ARRAY OF WORD (9 ms)                                         
      √ writing ARRAY OF DWORD (11 ms)                                       
      √ writing ARRAY OF SINT (22 ms)                                        
      √ writing ARRAY OF USINT (13 ms)                                       
      √ writing ARRAY OF INT (23 ms)                                         
      √ writing ARRAY OF UINT (7 ms)                                         
      √ writing ARRAY OF DINT (20 ms)                                        
      √ writing ARRAY OF UDINT (12 ms)                                       
      √ writing ARRAY OF REAL (46 ms)                                        
      √ writing ARRAY OF STRING (23 ms)                                      
      √ writing ARRAY OF DATE (11 ms)                                        
      √ writing ARRAY OF DT (23 ms)                                          
      √ writing ARRAY OF TOD (22 ms)                                         
      √ writing ARRAY OF TIME (14 ms)                                        
      √ writing ARRAY OF LWORD (12 ms)                                       
      √ writing ARRAY OF LINT (21 ms)                                        
      √ writing ARRAY OF ULINT (9 ms)                                        
      √ writing ARRAY OF LREAL (39 ms)                                       
      √ writing ARRAY OF WSTRING (19 ms)                                     
      √ writing ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)    
      √ writing ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)             
      √ writing ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)     
      √ writing ARRAY OF LTIME (8 ms)                                        
    writing complex values                                                   
      √ writing STRUCT (23 ms)                                               
      √ writing ALIAS (9 ms)                                                 
      √ writing ENUM (52 ms)                                                 
      √ writing POINTER (address) (11 ms)                                    
      √ writing SUBRANGE (12 ms)                                             
      √ writing UNION (28 ms)                                                
      √ writing FUNCTION_BLOCK (50 ms)                                       
      √ writing INTERFACE (17 ms)                                            
    writing complex array values                                             
      √ writing ARRAY OF STRUCT (33 ms)                                      
      √ writing ARRAY OF ALIAS (14 ms)                                       
      √ writing ARRAY OF ENUM (63 ms)                                        
      √ writing ARRAY OF POINTER (address) (20 ms)                           
      √ writing ARRAY OF SUBRANGE (13 ms)                                    
      √ writing ARRAY OF UNION (14 ms)                                       
      √ writing ARRAY OF FUNCTION_BLOCK (48 ms)                              
      √ writing ARRAY OF INTERFACE (16 ms)                                   
    writing special types / cases                                            
      √ writing ARRAY with negative index (17 ms)                            
      √ writing multi-dimensional ARRAY (17 ms)                              
      √ writing ARRAY OF ARRAY (18 ms)                                       
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '1'} (17 ms)   
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '8'} (17 ms)   
      √ writing an empty FUNCTION_BLOCK (8 ms)                               
      √ writing an empty STRUCT (9 ms)                                       
    writing dereferenced POINTER and REFERENCE values                        
      √ writing POINTER (value) (27 ms)                                      
      √ writing REFERENCE (value) (30 ms)                                    
    writing raw data                                                         
      √ writing a raw value (9 ms)                                           
      √ writing a raw value using symbol (11 ms)                             
      √ writing a raw value using path (16 ms)                               
      √ writing multiple raw values (multi/sum command) (19 ms)              
    using variable handles for reading and writing                           
      √ creating and deleting a varible handle (15 ms)                       
      √ reading value using a variable handle (11 ms)                        
      √ writing value using a variable handle (29 ms)                        
      √ creating and deleting multiple varible handles (multi/sum command) (9 ms)                                                                         
  subscriptions (ADS notifications)
    √ subscribing and unsubscribing successfully (2035 ms)                   
    √ subscribing to a changing value (10 ms) with default cycle time (3022 ms)                                                                           
    √ subscribing to a changing value (10 ms) with 10 ms cycle time (35 ms)
    √ subscribing to a constant value with maximum delay of 2000 ms (2037 ms)
    √ subscribing to a raw ADS address (221 ms)                              
  remote procedure calls (RPC methods)                                       
    √ calling a RPC method (10 ms)                                           
    √ calling a RPC method with struct parameters (10 ms)
    √ calling a RPC method without return value and without parameters (12 ms)                                                                            
  miscellaneous
    √ sending read write ADS command (7 ms)                                  
    √ sending multiple read write ADS commands (multi/sum command) (12 ms)   
  issue specific tests                                                       
    issue 103 (https://github.com/jisotalo/ads-client/issues/103)            
      √ calling unsubscribeAll() multiple times (should not crash to unhandled exception) (62 ms)                                                         
  disconnecting
    √ disconnecting client (1 ms)                                            
  controlling TwinCAT system service                                         
    √ connecting (1 ms)                                                      
    √ setting TwinCAT system to config (2024 ms)                             
    √ setting TwinCAT system to run (2027 ms)                                
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
