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
    √ connecting to the target (35 ms)                                                                                            
    √ checking that test PLC project is active (13 ms)                                                                            
    √ checking that test PLC project version is correct (11 ms)                                                                   
    √ reconnecting (34 ms)                                                                                                        
  resetting PLC to original state                                                                                                 
    √ resetting PLC (12 ms)                                                                                                       
    √ checking that reset was successful (8 ms)
    √ checking that PLC is not running (9 ms)                                                                                     
    √ setting IsReset to false (4 ms)                                                                                             
    √ starting PLC (7 ms)                                                                                                         
    √ checking that test PLC project is running (504 ms)                                                                          
  testing PLC runtime stop, start, restart                                                                                        
    √ stopping PLC (16 ms)                                                                                                        
    √ starting PLC (15 ms)                                                                                                        
    √ restarting PLC (532 ms)                                                                                                     
  system state, PLC runtime states and device information                                                                         
    √ reading TwinCAT system state (5 ms)                                                                                         
    √ reading PLC runtime (port 851) state (6 ms)                                                                                 
    √ reading PLC runtime (port 852) state (3 ms)                                                                                 
    √ reading PLC runtime device info (4 ms)                                                                                      
    √ reading TwinCAT system device info (5 ms)                                                                                   
    √ reading PLC runtime symbol version (3 ms)                                                                                   
  symbols and data types                                                                                                          
    √ reading upload info (4 ms)                                                                                                  
    √ reading all symbol information (14 ms)                                                                                      
    √ reading single symbol information (1 ms)                                                                                    
    √ reading all data type information (22 ms)                                                                                   
    √ reading single data type information (5 ms)                                                                                 
  data conversion                                                                                                                 
    √ converting a raw PLC value to a Javascript variable (4 ms)                                                                  
    √ converting a Javascript value to a raw PLC value (53 ms)                                                                    
  reading values                                                                                                                  
    reading standard values                                                                                                       
      √ reading BOOL (16 ms)                                                                                                      
      √ reading BYTE (9 ms)                                                                                                       
      √ reading WORD (8 ms)                                                                                                       
      √ reading DWORD (8 ms)                                                                                                      
      √ reading SINT (17 ms)                                                                                                      
      √ reading USINT (10 ms)                                                                                                     
      √ reading INT (17 ms)                                                                                                       
      √ reading UINT (10 ms)                                                                                                      
      √ reading DINT (17 ms)                                                                                                      
      √ reading UDINT (9 ms)                                                                                                      
      √ reading REAL (35 ms)                                                                                                      
      √ reading STRING (15 ms)                                                                                                    
      √ reading DATE (8 ms)                                                                                                       
      √ reading DT (18 ms)                                                                                                        
      √ reading TOD (17 ms)
      √ reading TIME (7 ms)                                                                                                       
      √ reading LWORD (6 ms)                                                                                                      
      √ reading LINT (9 ms)                                                                                                       
      √ reading ULINT (6 ms)                                                                                                      
      √ reading LREAL (19 ms)                                                                                                     
      √ reading WSTRING (13 ms)                                                                                                   
      √ reading LDATE (---- TODO: Needs TC 3.1.4026 ----)                                                                         
      √ reading LDT (---- TODO: Needs TC 3.1.4026 ----)                                                                           
      √ reading LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                                          
      √ reading LTIME (4 ms)                                                                                                      
    reading standard array values                                                                                                 
      √ reading ARRAY OF BOOL (20 ms)                                                                                             
      √ reading ARRAY OF BYTE (9 ms)                                                                                              
      √ reading ARRAY OF WORD (8 ms)                                                                                              
      √ reading ARRAY OF DWORD (7 ms)                                                                                             
      √ reading ARRAY OF SINT (15 ms)                                                                                             
      √ reading ARRAY OF USINT (9 ms)                                                                                             
      √ reading ARRAY OF INT (15 ms)                                                                                              
      √ reading ARRAY OF UINT (9 ms)                                                                                              
      √ reading ARRAY OF DINT (16 ms)                                                                                             
      √ reading ARRAY OF UDINT (7 ms)                                                                                             
      √ reading ARRAY OF REAL (34 ms)                                                                                             
      √ reading ARRAY OF STRING (17 ms)                                                                                           
      √ reading ARRAY OF DATE (7 ms)                                                                                              
      √ reading ARRAY OF DT (16 ms)                                                                                               
      √ reading ARRAY OF TOD (17 ms)                                                                                              
      √ reading ARRAY OF TIME (8 ms)                                                                                              
      √ reading ARRAY OF LWORD (8 ms)                                                                                             
      √ reading ARRAY OF LINT (12 ms)                                                                                             
      √ reading ARRAY OF ULINT (11 ms)                                                                                            
      √ reading ARRAY OF LREAL (29 ms)                                                                                            
      √ reading ARRAY OF WSTRING (17 ms)                                                                                          
      √ reading ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                         
      √ reading ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                           
      √ reading ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                          
      √ reading ARRAY OF LTIME (9 ms)                                                                                             
    reading complex values                                                                                                        
      √ reading STRUCT (23 ms)                                                                                                    
      √ reading ALIAS (10 ms)                                                                                                     
      √ reading ENUM (46 ms)                                                                                                      
      √ reading POINTER (address) (9 ms)                                                                                          
      √ reading SUBRANGE (7 ms)                                                                                                   
      √ reading UNION (27 ms)                                                                                                     
      √ reading FUNCTION_BLOCK (36 ms)                                                                                            
      √ reading INTERFACE (8 ms)                                                                                                  
    reading complex array values                                                                                                  
      √ reading ARRAY OF STRUCT (25 ms)                                                                                           
      √ reading ARRAY OF ALIAS (6 ms)                                                                                             
      √ reading ARRAY OF ENUM (39 ms)                                                                                             
      √ reading ARRAY OF POINTER (address) (7 ms)
      √ reading ARRAY OF SUBRANGE (8 ms)                                                                                          
      √ reading ARRAY OF UNION (9 ms)                                                                                             
      √ reading ARRAY OF FUNCTION_BLOCK (35 ms)                                                                                   
      √ reading ARRAY OF INTERFACE (8 ms)                                                                                         
    reading special types / cases                                                                                                 
      √ reading ARRAY with negative index (10 ms)                                                                                 
      √ reading multi-dimensional ARRAY (9 ms)                                                                                    
      √ reading ARRAY OF ARRAY (9 ms)                                                                                             
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (8 ms)                                                         
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (9 ms)                                                         
      √ reading an empty FUNCTION_BLOCK (6 ms)                                                                                    
      √ reading an empty STRUCT (8 ms)                                                                                            
      √ reading an empty ARRAY (8 ms)                                                                                             
    reading dereferenced POINTER and REFERENCE values                                                                             
      √ reading POINTER (value) (9 ms)                                                                                            
      √ reading REFERENCE (value) (8 ms)                                                                                          
    reading raw data                                                                                                              
      √ reading a raw value (5 ms)                                                                                                
      √ reading a raw value using symbol (5 ms)                                                                                   
      √ reading a raw value using path (3 ms)                                                                                     
  writing values                                                                                                                  
    writing standard values                                                                                                       
      √ writing BOOL (21 ms)                                                                                                      
      √ writing BYTE (11 ms)                                                                                                      
      √ writing WORD (11 ms)                                                                                                      
      √ writing DWORD (11 ms)                                                                                                     
      √ writing SINT (25 ms)                                                                                                      
      √ writing USINT (12 ms)                                                                                                     
      √ writing INT (26 ms)                                                                                                       
      √ writing UINT (14 ms)                                                                                                      
      √ writing DINT (24 ms)                                                                                                      
      √ writing UDINT (13 ms)                                                                                                     
      √ writing REAL (35 ms)                                                                                                      
      √ writing STRING (12 ms)                                                                                                    
      √ writing DATE (10 ms)                                                                                                      
      √ writing DT (24 ms)                                                                                                        
      √ writing TOD (25 ms)                                                                                                       
      √ writing TIME (14 ms)                                                                                                      
      √ writing LWORD (14 ms)                                                                                                     
      √ writing LINT (23 ms)                                                                                                      
      √ writing ULINT (14 ms)                                                                                                     
      √ writing LREAL (50 ms)                                                                                                     
      √ writing WSTRING (23 ms)                                                                                                   
      √ writing LDATE (---- TODO: Needs TC 3.1.4026 ----)                                                                         
      √ writing LDT (---- TODO: Needs TC 3.1.4026 ----)                                                                           
      √ writing LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                                          
      √ writing LTIME (12 ms)
    writing standard array values                                                                                                 
      √ writing ARRAY OF BOOL (24 ms)                                                                                             
      √ writing ARRAY OF BYTE (11 ms)                                                                                             
      √ writing ARRAY OF WORD (13 ms)                                                                                             
      √ writing ARRAY OF DWORD (11 ms)                                                                                            
      √ writing ARRAY OF SINT (26 ms)                                                                                             
      √ writing ARRAY OF USINT (12 ms)                                                                                            
      √ writing ARRAY OF INT (22 ms)                                                                                              
      √ writing ARRAY OF UINT (14 ms)                                                                                             
      √ writing ARRAY OF DINT (25 ms)                                                                                             
      √ writing ARRAY OF UDINT (13 ms)                                                                                            
      √ writing ARRAY OF REAL (47 ms)                                                                                             
      √ writing ARRAY OF STRING (25 ms)                                                                                           
      √ writing ARRAY OF DATE (12 ms)                                                                                             
      √ writing ARRAY OF DT (24 ms)                                                                                               
      √ writing ARRAY OF TOD (20 ms)                                                                                              
      √ writing ARRAY OF TIME (10 ms)                                                                                             
      √ writing ARRAY OF LWORD (10 ms)                                                                                            
      √ writing ARRAY OF LINT (20 ms)                                                                                             
      √ writing ARRAY OF ULINT (7 ms)                                                                                             
      √ writing ARRAY OF LREAL (46 ms)                                                                                            
      √ writing ARRAY OF WSTRING (21 ms)                                                                                          
      √ writing ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----)                                                                
      √ writing ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)                                                                  
      √ writing ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                                 
      √ writing ARRAY OF LTIME (10 ms)                                                                                            
    writing complex values                                                                                                        
      √ writing STRUCT (32 ms)                                                                                                    
      √ writing ALIAS (13 ms)
      √ writing ENUM (40 ms)                                                                                                      
      √ writing POINTER (address) (14 ms)                                                                                         
      √ writing SUBRANGE (13 ms)                                                                                                  
      √ writing UNION (38 ms)                                                                                                     
      √ writing FUNCTION_BLOCK (46 ms)                                                                                            
      √ writing INTERFACE (15 ms)                                                                                                 
    writing complex array values                                                                                                  
      √ writing ARRAY OF STRUCT (29 ms)                                                                                           
      √ writing ARRAY OF ALIAS (12 ms)                                                                                            
      √ writing ARRAY OF ENUM (60 ms)                                                                                             
      √ writing ARRAY OF POINTER (address) (15 ms)                                                                                
      √ writing ARRAY OF SUBRANGE (9 ms)                                                                                          
      √ writing ARRAY OF UNION (16 ms)                                                                                            
      √ writing ARRAY OF FUNCTION_BLOCK (47 ms)                                                                                   
      √ writing ARRAY OF INTERFACE (15 ms)                                                                                        
    writing special types / cases                                                                                                 
      √ writing ARRAY with negative index (17 ms)                                                                                 
      √ writing multi-dimensional ARRAY (15 ms)                                                                                   
      √ writing ARRAY OF ARRAY (15 ms)                                                                                            
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '1'} (14 ms)                                                        
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '8'} (16 ms)                                                        
      √ writing an empty FUNCTION_BLOCK (7 ms)                                                                                    
      √ writing an empty STRUCT (8 ms)                                                                                            
    writing dereferenced POINTER and REFERENCE values                                                                             
      √ writing POINTER (value) (24 ms)                                                                                           
      √ writing REFERENCE (value) (23 ms)                                                                                         
    writing raw data                                                                                                              
      √ writing a raw value (6 ms)                                                                                                
      √ writing a raw value using symbol (5 ms)                                                                                   
      √ writing a raw value using path (14 ms)                                                                                    
    using variable handles for reading and writing                                                                                
      √ creating and deleting a varible handle (15 ms)                                                                            
      √ reading value using a variable handle (17 ms)                                                                             
      √ writing value using a variable handle (104 ms)                                                                            
  subscriptions (ADS notifications)                                                                                               
    √ subscribing and unsubscribing successfully (2027 ms)                                                                        
    √ subscribing to a changing value (10 ms) with default cycle time (2832 ms)                                                   
    √ subscribing to a changing value (10 ms) with 10 ms cycle time (39 ms)                                                       
    √ subscribing to a constant value with maximum delay of 2000 ms (2016 ms)                                                     
    √ subscribing to a raw ADS address (221 ms)                                                                                   
  remote procedure calls (RPC methods)                                                                                            
    √ calling a RPC method (13 ms)                                                                                                
    √ calling a RPC method with struct parameters (13 ms)                                                                         
    √ calling a RPC method without return value and without parameters (11 ms)                                                    
  issue specific tests                                                                                                            
    issue 103 (https://github.com/jisotalo/ads-client/issues/103)                                                                 
      √ calling unsubscribeAll() multiple times (should not crash to unhandled exception) (84 ms)                                 
  disconnecting                                                                                                                   
    √ disconnecting client                                                                                                        
  controlling TwinCAT system service                                                                                              
    √ connecting (1 ms)                                                                                                           
    √ setting TwinCAT system to config (2021 ms)                                                                                  
    √ setting TwinCAT system to run (2026 ms)                                                                                     
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
