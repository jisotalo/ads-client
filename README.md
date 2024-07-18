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
    √ connecting to the target (38 ms)                                                                                            
    √ checking that test PLC project is active (13 ms)                                                                            
    √ checking that test PLC project version is correct (10 ms)                                                                   
    √ reconnecting (31 ms)                                                                                                        
  resetting PLC to original state                                                                                                 
    √ resetting PLC (11 ms)                                                                                                       
    √ checking that reset was successful (7 ms)                                                                                   
    √ checking that PLC is not running (12 ms)                                                                                    
    √ setting IsReset to false (3 ms)                                                                                             
    √ starting PLC (8 ms)                                                                                                         
    √ checking that test PLC project is running (506 ms)                                                                          
  testing PLC runtime stop, start, restart                                                                                        
    √ stopping PLC (12 ms)                                                                                                        
    √ starting PLC (17 ms)                                                                                                        
    √ restarting PLC (526 ms)                                                                                                     
  system state, PLC runtime states and device information                                                                         
    √ reading TwinCAT system state (5 ms)                                                                                         
    √ reading PLC runtime (port 851) state (3 ms)                                                                                 
    √ reading PLC runtime (port 852) state (3 ms)                                                                                 
    √ reading PLC runtime device info (4 ms)                                                                                      
    √ reading TwinCAT system device info (5 ms)                                                                                   
    √ reading PLC runtime symbol version (5 ms)                                                                                   
  symbols and data types                                                                                                          
    √ reading upload info (3 ms)                                                                                                  
    √ reading all symbol information (16 ms)                                                                                      
    √ reading single symbol information (1 ms)                                                                                    
    √ reading all data type information (23 ms)                                                                                   
    √ reading single data type information (2 ms)                                                                                 
  data conversion                                                                                                                 
    √ converting a raw PLC value to a Javascript variable (3 ms)                                                                  
    √ converting a Javascript value to a raw PLC value (44 ms)                                                                    
  reading values                                                                                                                  
    reading standard values                                                                                                       
      √ reading BOOL (16 ms)                                                                                                      
      √ reading BYTE (8 ms)                                                                                                       
      √ reading WORD (8 ms)                                                                                                       
      √ reading DWORD (8 ms)                                                                                                      
      √ reading SINT (16 ms)                                                                                                      
      √ reading USINT (7 ms)                                                                                                      
      √ reading INT (14 ms)                                                                                                       
      √ reading UINT (7 ms)                                                                                                       
      √ reading DINT (17 ms)                                                                                                      
      √ reading UDINT (8 ms)                                                                                                      
      √ reading REAL (31 ms)                                                                                                      
      √ reading STRING (16 ms)                                                                                                    
      √ reading DATE (8 ms)                                                                                                       
      √ reading DT (15 ms)                                                                                                        
      √ reading TOD (16 ms)                                                                                                       
      √ reading TIME (7 ms)                                                                                                       
      √ reading LWORD (8 ms)                                                                                                      
      √ reading LINT (16 ms)                                                                                                      
      √ reading ULINT (6 ms)                                                                                                      
      √ reading LREAL (30 ms)                                                                                                     
      √ reading WSTRING (16 ms)                                                                                                   
      √ reading LDATE (---- TODO: Needs TC 3.1.4026 ----)                                                                         
      √ reading LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                                    
      √ reading LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                                          
      √ reading LTIME (9 ms)                                                                                                      
    reading standard array values                                                                                                 
      √ reading ARRAY OF BOOL (16 ms)                                                                                             
      √ reading ARRAY OF BYTE (8 ms)                                                                                              
      √ reading ARRAY OF WORD (8 ms)                                                                                              
      √ reading ARRAY OF DWORD (8 ms)                                                                                             
      √ reading ARRAY OF SINT (17 ms)                                                                                             
      √ reading ARRAY OF USINT (9 ms)                                                                                             
      √ reading ARRAY OF INT (18 ms)                                                                                              
      √ reading ARRAY OF UINT (9 ms)                                                                                              
      √ reading ARRAY OF DINT (15 ms)                                                                                             
      √ reading ARRAY OF UDINT (7 ms)                                                                                             
      √ reading ARRAY OF REAL (32 ms)                                                                                             
      √ reading ARRAY OF STRING (16 ms)                                                                                           
      √ reading ARRAY OF DATE (8 ms)                                                                                              
      √ reading ARRAY OF DT (16 ms)                                                                                               
      √ reading ARRAY OF TOD (16 ms)                                                                                              
      √ reading ARRAY OF TIME (8 ms)                                                                                              
      √ reading ARRAY OF LWORD (8 ms)                                                                                             
      √ reading ARRAY OF LINT (16 ms)                                                                                             
      √ reading ARRAY OF ULINT (8 ms)                                                                                             
      √ reading ARRAY OF LREAL (31 ms)                                                                                            
      √ reading ARRAY OF WSTRING (14 ms)                                                                                          
      √ reading ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                         
      √ reading ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)                                                                  
      √ reading ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                                 
      √ reading ARRAY OF LTIME (8 ms)                                                                                             
    reading complex values                                                                                                        
      √ reading STRUCT (17 ms)                                                                                                    
      √ reading ALIAS (7 ms)                                                                                                      
      √ reading ENUM (43 ms)                                                                                                      
      √ reading POINTER (address) (7 ms)                                                                                          
      √ reading SUBRANGE (7 ms)                                                                                                   
      √ reading UNION (17 ms)                                                                                                     
      √ reading FUNCTION_BLOCK (29 ms)                                                                                            
      √ reading INTERFACE (7 ms)                                                                                                  
    reading complex array values                                                                                                  
      √ reading ARRAY OF STRUCT (18 ms)                                                                                           
      √ reading ARRAY OF ALIAS (9 ms)                                                                                             
      √ reading ARRAY OF ENUM (43 ms)                                                                                             
      √ reading ARRAY OF POINTER (address) (7 ms)                                                                                 
      √ reading ARRAY OF SUBRANGE (9 ms)                                                                                          
      √ reading ARRAY OF UNION (7 ms)                                                                                             
      √ reading ARRAY OF FUNCTION_BLOCK (33 ms)                                                                                   
      √ reading ARRAY OF INTERFACE (7 ms)                                                                                         
    reading special types / cases                                                                                                 
      √ reading ARRAY with negative index (8 ms)                                                                                  
      √ reading multi-dimensional ARRAY (8 ms)                                                                                    
      √ reading ARRAY OF ARRAY (7 ms)                                                                                             
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (8 ms)                                                         
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (8 ms)                                                         
      √ reading an empty FUNCTION_BLOCK (5 ms)                                                                                    
      √ reading an empty STRUCT (8 ms)                                                                                            
      √ reading an empty ARRAY (7 ms)                                                                                             
    reading dereferenced POINTER and REFERENCE values                                                                             
      √ reading POINTER (value) (6 ms)                                                                                            
      √ reading REFERENCE (value) (8 ms)                                                                                          
    reading raw data                                                                                                              
      √ reading a raw value (3 ms)                                                                                                
      √ reading a raw value using symbol (4 ms)                                                                                   
      √ reading a raw value using path (4 ms)                                                                                     
  writing values                                                                                                                  
    writing standard values                                                                                                       
      √ writing BOOL (24 ms)                                                                                                      
      √ writing BYTE (11 ms)                                                                                                      
      √ writing WORD (14 ms)                                                                                                      
      √ writing DWORD (13 ms)                                                                                                     
      √ writing SINT (23 ms)                                                                                                      
      √ writing USINT (8 ms)                                                                                                      
      √ writing INT (21 ms)                                                                                                       
      √ writing UINT (13 ms)                                                                                                      
      √ writing DINT (21 ms)                                                                                                      
      √ writing UDINT (10 ms)                                                                                                     
      √ writing REAL (41 ms)                                                                                                      
      √ writing STRING (24 ms)                                                                                                    
      √ writing DATE (12 ms)                                                                                                      
      √ writing DT (24 ms)                                                                                                        
      √ writing TOD (25 ms)                                                                                                       
      √ writing TIME (9 ms)                                                                                                       
      √ writing LWORD (11 ms)                                                                                                     
      √ writing LINT (15 ms)                                                                                                      
      √ writing ULINT (11 ms)                                                                                                     
      √ writing LREAL (33 ms)                                                                                                     
      √ writing WSTRING (22 ms)                                                                                                   
      √ writing LDATE (---- TODO: Needs TC 3.1.4026 ----)                                                                         
      √ writing LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                                    
      √ writing LTOD (---- TODO: Needs TC 3.1.4026 ----)                                                                          
      √ writing LTIME (13 ms)                                                                                                     
    writing standard array values                                                                                                 
      √ writing ARRAY OF BOOL (24 ms)                                                                                             
      √ writing ARRAY OF BYTE (12 ms)                                                                                             
      √ writing ARRAY OF WORD (12 ms)                                                                                             
      √ writing ARRAY OF DWORD (10 ms)                                                                                            
      √ writing ARRAY OF SINT (23 ms)                                                                                             
      √ writing ARRAY OF USINT (11 ms)                                                                                            
      √ writing ARRAY OF INT (24 ms)                                                                                              
      √ writing ARRAY OF UINT (12 ms)                                                                                             
      √ writing ARRAY OF DINT (24 ms)                                                                                             
      √ writing ARRAY OF UDINT (14 ms)                                                                                            
      √ writing ARRAY OF REAL (51 ms)                                                                                             
      √ writing ARRAY OF STRING (25 ms)                                                                                           
      √ writing ARRAY OF DATE (12 ms)                                                                                             
      √ writing ARRAY OF DT (23 ms)                                                                                               
      √ writing ARRAY OF TOD (23 ms)                                                                                              
      √ writing ARRAY OF TIME (12 ms)                                                                                             
      √ writing ARRAY OF LWORD (13 ms)                                                                                            
      √ writing ARRAY OF LINT (24 ms)                                                                                             
      √ writing ARRAY OF ULINT (13 ms)                                                                                            
      √ writing ARRAY OF LREAL (47 ms)                                                                                            
      √ writing ARRAY OF WSTRING (26 ms)                                                                                          
      √ writing ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                         
      √ writing ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)                                                                  
      √ writing ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                          
      √ writing ARRAY OF LTIME (11 ms)                                                                                            
    writing complex values                                                                                                        
      √ writing STRUCT (30 ms)                                                                                                    
      √ writing ALIAS (12 ms)                                                                                                     
      √ writing ENUM (59 ms)                                                                                                      
      √ writing POINTER (address) (14 ms)                                                                                         
      √ writing SUBRANGE (20 ms)                                                                                                  
      √ writing UNION (50 ms)                                                                                                     
      √ writing FUNCTION_BLOCK (55 ms)                                                                                            
      √ writing INTERFACE (14 ms)                                                                                                 
    writing complex array values                                                                                                  
      √ writing ARRAY OF STRUCT (29 ms)                                                                                           
      √ writing ARRAY OF ALIAS (12 ms)                                                                                            
      √ writing ARRAY OF ENUM (59 ms)                                                                                             
      √ writing ARRAY OF POINTER (address) (17 ms)                                                                                
      √ writing ARRAY OF SUBRANGE (11 ms)                                                                                         
      √ writing ARRAY OF UNION (17 ms)                                                                                            
      √ writing ARRAY OF FUNCTION_BLOCK (56 ms)                                                                                   
      √ writing ARRAY OF INTERFACE (16 ms)                                                                                        
    writing special types / cases
      √ writing ARRAY with negative index (15 ms)                                                                                 
      √ writing multi-dimensional ARRAY (17 ms)                                                                                   
      √ writing ARRAY OF ARRAY (14 ms)                                                                                            
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '1'} (15 ms)                                                        
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '8'} (16 ms)                                                        
      √ writing an empty FUNCTION_BLOCK (12 ms)                                                                                   
      √ writing an empty STRUCT (7 ms)                                                                                            
    writing dereferenced POINTER and REFERENCE values                                                                             
      √ writing POINTER (value) (31 ms)                                                                                           
      √ writing REFERENCE (value) (34 ms)                                                                                         
    writing raw data                                                                                                              
      √ writing a raw value (8 ms)                                                                                                
      √ writing a raw value using symbol (7 ms)                                                                                   
      √ writing a raw value using path (15 ms)                                                                                    
    using variable handles for reading and writing                                                                                
      √ creating and deleting a varible handle (17 ms)                                                                            
      √ reading value using a variable handle (14 ms)                                                                             
      √ writing value using a variable handle (21 ms)                                                                             
  subscriptions (ADS notifications)                                                                                               
    √ subscribing and unsubscribing successfully (2030 ms)                                                                        
    √ subscribing to a changing value (10 ms) with default cycle time (3043 ms)                                                   
    √ subscribing to a changing value (10 ms) with 10 ms cycle time (37 ms)                                                       
    √ subscribing to a constant value with maximum delay of 2000 ms (2027 ms)                                                     
    √ subscribing to a raw ADS address (227 ms)                                                                                   
  issue specific tests                                                                                                            
    issue 103 (https://github.com/jisotalo/ads-client/issues/103)                                                                 
      √ calling unsubscribeAll() multiple times (should not crash to unhandled exception) (61 ms)                                 
  disconnecting                                                                                                                   
    √ disconnecting client (1 ms)                                                                                                 
  controlling TwinCAT system service                                                                                              
    √ connecting (2 ms)                                                                                                           
    √ setting TwinCAT system to config (2022 ms)                                                                                  
    √ setting TwinCAT system to run (2024 ms)                                                                                     
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
