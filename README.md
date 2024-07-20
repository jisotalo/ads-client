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
    √ connecting to the target (46 ms)                                            
    √ checking that test PLC project is active (13 ms)                            
    √ checking that test PLC project version is correct (14 ms)                   
    √ reconnecting (36 ms)                                                        
  resetting PLC to original state                                                 
    √ resetting PLC (11 ms)                                                       
    √ checking that reset was successful (9 ms)                                   
    √ checking that PLC is not running (13 ms)                                    
    √ setting IsReset to false (4 ms)                                             
    √ starting PLC (10 ms)                                                        
    √ checking that test PLC project is running (509 ms)                          
  testing PLC runtime stop, start, restart                                        
    √ stopping PLC (19 ms)                                                        
    √ starting PLC (19 ms)                                                        
    √ restarting PLC (536 ms)                                                     
  system state, PLC runtime states and device information                         
    √ reading TwinCAT system state (9 ms)
    √ reading PLC runtime (port 851) state (6 ms)                                 
    √ reading PLC runtime (port 852) state (5 ms)                                 
    √ reading PLC runtime device info (6 ms)                                      
    √ reading TwinCAT system device info (10 ms)                                  
    √ reading PLC runtime symbol version (4 ms)                                   
  symbols and data types                                                          
    √ reading upload info (5 ms)                                                  
    √ reading all symbol information (26 ms)                                      
    √ reading single symbol information (3 ms)                                    
    √ reading all data type information (36 ms)                                   
    √ reading single data type information (6 ms)                                 
  data conversion                                                                 
    √ converting a raw PLC value to a Javascript variable (5 ms)                  
    √ converting a Javascript value to a raw PLC value (81 ms)                    
  reading values                                                                  
    reading standard values                                                       
      √ reading BOOL (15 ms)                                                      
      √ reading BYTE (7 ms)                                                       
      √ reading WORD (9 ms)                                                       
      √ reading DWORD (10 ms)                                                     
      √ reading SINT (17 ms)                                                      
      √ reading USINT (9 ms)                                                      
      √ reading INT (17 ms)
      √ reading UINT (11 ms)                                                      
      √ reading DINT (17 ms)                                                      
      √ reading UDINT (11 ms)                                                     
      √ reading REAL (34 ms)                                                      
      √ reading STRING (16 ms)                                                    
      √ reading DATE (9 ms)                                                       
      √ reading DT (17 ms)                                                        
      √ reading TOD (15 ms)                                                       
      √ reading TIME (7 ms)                                                       
      √ reading LWORD (8 ms)                                                      
      √ reading LINT (16 ms)                                                      
      √ reading ULINT (7 ms)                                                      
      √ reading LREAL (32 ms)                                                     
      √ reading WSTRING (17 ms)                                                   
      √ reading LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                  
      √ reading LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                    
      √ reading LTOD (---- TODO: Needs TC 3.1.4026 ----)                          
      √ reading LTIME (11 ms)                                                     
    reading standard array values                                                 
      √ reading ARRAY OF BOOL (14 ms)                                             
      √ reading ARRAY OF BYTE (6 ms)                                              
      √ reading ARRAY OF WORD (8 ms)                                              
      √ reading ARRAY OF DWORD (9 ms)                                             
      √ reading ARRAY OF SINT (13 ms)                                             
      √ reading ARRAY OF USINT (9 ms)                                             
      √ reading ARRAY OF INT (18 ms)                                              
      √ reading ARRAY OF UINT (7 ms)                                              
      √ reading ARRAY OF DINT (16 ms)                                             
      √ reading ARRAY OF UDINT (10 ms)                                            
      √ reading ARRAY OF REAL (35 ms)                                             
      √ reading ARRAY OF STRING (16 ms)                                           
      √ reading ARRAY OF DATE (9 ms)                                              
      √ reading ARRAY OF DT (17 ms)                                               
      √ reading ARRAY OF TOD (19 ms)
      √ reading ARRAY OF TIME (7 ms)                                              
      √ reading ARRAY OF LWORD (11 ms)                                            
      √ reading ARRAY OF LINT (16 ms)                                             
      √ reading ARRAY OF ULINT (9 ms)                                             
      √ reading ARRAY OF LREAL (35 ms)                                            
      √ reading ARRAY OF WSTRING (17 ms)                                          
      √ reading ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)         
      √ reading ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)                  
      √ reading ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)          
      √ reading ARRAY OF LTIME (9 ms)                                             
    reading complex values                                                        
      √ reading STRUCT (18 ms)                                                    
      √ reading ALIAS (9 ms)                                                      
      √ reading ENUM (43 ms)                                                      
      √ reading POINTER (address) (7 ms)                                          
      √ reading SUBRANGE (6 ms)                                                   
      √ reading UNION (24 ms)                                                     
      √ reading FUNCTION_BLOCK (32 ms)                                            
      √ reading INTERFACE (8 ms)                                                  
    reading complex array values                                                  
      √ reading ARRAY OF STRUCT (20 ms)                                           
      √ reading ARRAY OF ALIAS (11 ms)                                            
      √ reading ARRAY OF ENUM (42 ms)                                             
      √ reading ARRAY OF POINTER (address) (6 ms)                                 
      √ reading ARRAY OF SUBRANGE (6 ms)                                          
      √ reading ARRAY OF UNION (8 ms)                                             
      √ reading ARRAY OF FUNCTION_BLOCK (37 ms)                                   
      √ reading ARRAY OF INTERFACE (7 ms)                                         
    reading special types / cases                                                 
      √ reading ARRAY with negative index (8 ms)                                  
      √ reading multi-dimensional ARRAY (8 ms)                                    
      √ reading ARRAY OF ARRAY (9 ms)                                             
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (7 ms)         
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (9 ms)         
      √ reading an empty FUNCTION_BLOCK (9 ms)                                    
      √ reading an empty STRUCT (8 ms)                                            
      √ reading an empty ARRAY (8 ms)                                             
    reading dereferenced POINTER and REFERENCE values                             
      √ reading POINTER (value) (8 ms)                                            
      √ reading REFERENCE (value) (7 ms)                                          
    reading raw data                                                              
      √ reading a raw value (3 ms)                                                
      √ reading a raw value using symbol (4 ms)                                   
      √ reading a raw value using path (4 ms)                                     
      √ reading multiple raw values (multi/sum command) (6 ms)                    
  writing values                                                                  
    writing standard values                                                       
      √ writing BOOL (24 ms)                                                      
      √ writing BYTE (11 ms)                                                      
      √ writing WORD (7 ms)                                                       
      √ writing DWORD (12 ms)                                                     
      √ writing SINT (25 ms)                                                      
      √ writing USINT (13 ms)                                                     
      √ writing INT (27 ms)                                                       
      √ writing UINT (13 ms)                                                      
      √ writing DINT (26 ms)                                                      
      √ writing UDINT (14 ms)                                                     
      √ writing REAL (45 ms)                                                      
      √ writing STRING (25 ms)                                                    
      √ writing DATE (11 ms)                                                      
      √ writing DT (25 ms)                                                        
      √ writing TOD (26 ms)                                                       
      √ writing TIME (14 ms)                                                      
      √ writing LWORD (12 ms)                                                     
      √ writing LINT (25 ms)                                                      
      √ writing ULINT (13 ms)                                                     
      √ writing LREAL (48 ms)                                                     
      √ writing WSTRING (23 ms)                                                   
      √ writing LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                  
      √ writing LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                    
      √ writing LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                   
      √ writing LTIME (11 ms)                                                     
    writing standard array values                                                 
      √ writing ARRAY OF BOOL (25 ms)                                             
      √ writing ARRAY OF BYTE (13 ms)                                             
      √ writing ARRAY OF WORD (11 ms)                                             
      √ writing ARRAY OF DWORD (12 ms)                                            
      √ writing ARRAY OF SINT (25 ms)                                             
      √ writing ARRAY OF USINT (13 ms)                                            
      √ writing ARRAY OF INT (27 ms)                                              
      √ writing ARRAY OF UINT (12 ms)                                             
      √ writing ARRAY OF DINT (24 ms)                                             
      √ writing ARRAY OF UDINT (14 ms)                                            
      √ writing ARRAY OF REAL (50 ms)                                             
      √ writing ARRAY OF STRING (25 ms)                                           
      √ writing ARRAY OF DATE (14 ms)                                             
      √ writing ARRAY OF DT (27 ms)                                               
      √ writing ARRAY OF TOD (25 ms)                                              
      √ writing ARRAY OF TIME (14 ms)                                             
      √ writing ARRAY OF LWORD (15 ms)                                            
      √ writing ARRAY OF LINT (24 ms)                                             
      √ writing ARRAY OF ULINT (13 ms)                                            
      √ writing ARRAY OF LREAL (48 ms)                                            
      √ writing ARRAY OF WSTRING (25 ms)                                          
      √ writing ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)
      √ writing ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)           
      √ writing ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)                 
      √ writing ARRAY OF LTIME (14 ms)                                            
    writing complex values                                                        
      √ writing STRUCT (36 ms)                                                    
      √ writing ALIAS (13 ms)                                                     
      √ writing ENUM (59 ms)                                                      
      √ writing POINTER (address) (20 ms)                                         
      √ writing SUBRANGE (21 ms)                                                  
      √ writing UNION (49 ms)                                                     
      √ writing FUNCTION_BLOCK (57 ms)                                            
      √ writing INTERFACE (16 ms)                                                 
    writing complex array values                                                  
      √ writing ARRAY OF STRUCT (42 ms)                                           
      √ writing ARRAY OF ALIAS (15 ms)                                            
      √ writing ARRAY OF ENUM (60 ms)                                             
      √ writing ARRAY OF POINTER (address) (16 ms)                                
      √ writing ARRAY OF SUBRANGE (10 ms)                                         
      √ writing ARRAY OF UNION (17 ms)                                            
      √ writing ARRAY OF FUNCTION_BLOCK (58 ms)                                   
      √ writing ARRAY OF INTERFACE (17 ms)                                        
    writing special types / cases                                                 
      √ writing ARRAY with negative index (19 ms)                                 
      √ writing multi-dimensional ARRAY (16 ms)                                   
      √ writing ARRAY OF ARRAY (16 ms)                                            
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '1'} (19 ms)        
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '8'} (18 ms)        
      √ writing an empty FUNCTION_BLOCK (8 ms)
      √ writing an empty STRUCT (7 ms)                                            
    writing dereferenced POINTER and REFERENCE values                             
      √ writing POINTER (value) (41 ms)                                           
      √ writing REFERENCE (value) (46 ms)                                         
    writing raw data                                                              
      √ writing a raw value (7 ms)                                                
      √ writing a raw value using symbol (9 ms)                                   
      √ writing a raw value using path (17 ms)                                    
    using variable handles for reading and writing                                
      √ creating and deleting a varible handle (17 ms)                            
      √ reading value using a variable handle (13 ms)                             
      √ writing value using a variable handle (33 ms)                             
  subscriptions (ADS notifications)                                               
    √ subscribing and unsubscribing successfully (2027 ms)                        
    √ subscribing to a changing value (10 ms) with default cycle time (2635 ms)   
    √ subscribing to a changing value (10 ms) with 10 ms cycle time (44 ms)       
    √ subscribing to a constant value with maximum delay of 2000 ms (2043 ms)     
    √ subscribing to a raw ADS address (231 ms)                                   
  remote procedure calls (RPC methods)                                            
    √ calling a RPC method (16 ms)                                                
    √ calling a RPC method with struct parameters (15 ms)                         
    √ calling a RPC method without return value and without parameters (12 ms)    
  issue specific tests                                                            
    issue 103 (https://github.com/jisotalo/ads-client/issues/103)                 
      √ calling unsubscribeAll() multiple times (should not crash to unhandled exception) (112 ms)                                                                  
  disconnecting
    √ disconnecting client                                                        
  controlling TwinCAT system service                                              
    √ connecting (3 ms)                                                           
    √ setting TwinCAT system to config (2024 ms)                                  
    √ setting TwinCAT system to run (2027 ms)                                     
    √ disconnecting                                                                        
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
