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

`npm test` results - updated 11.07.2024

```
√ IMPORTANT NOTE: This test requires running a specific PLC project locally (https://github.com/jisotalo/ads-client-test-plc-project) (1 ms)                                    
  connection
    √ client is not connected at beginning (1 ms)                                        
    √ checking ads client settings (1 ms)                                                
    √ connecting to target (31 ms)                                                       
    √ checking that test PLC project is active (8 ms)                                    
    √ checking that test PLC project version is correct (12 ms)                          
  resetting PLC to original state                                                        
    √ resetting PLC (11 ms)                                                              
    √ checking that reset was successful (8 ms)                                          
    √ checking that PLC is not running (12 ms)                                           
    √ setting IsReset to false (5 ms)                                                    
    √ starting PLC (8 ms)                                                                
    √ checking that test PLC project is running (506 ms)                                 
  testing PLC runtime stop, start, restart                                               
    √ stopping PLC (17 ms)                                                               
    √ starting PLC (18 ms)                                                               
    √ restarting PLC (536 ms)                                                            
  system state, PLC runtime states and device information                                
    √ reading TwinCAT system state (8 ms)                                                
    √ reading PLC runtime (port 851) state (5 ms)                                        
    √ reading PLC runtime (port 852) state (4 ms)                                        
    √ reading PLC runtime device info (4 ms)                                             
    √ reading TwinCAT system device info (4 ms)                                          
  symbols and data types                                                                 
    √ reading upload info (3 ms)                                                         
    √ reading all symbol information (17 ms)                                             
    √ reading single symbol information (1 ms)                                           
    √ reading all data type information (19 ms)                                          
    √ reading single data type information (3 ms)                                        
  data conversion                                                                        
    √ converting a raw PLC value to a Javascript variable (4 ms)                         
    √ converting a Javascript value to a raw PLC value (4 ms)                            
  reading values                                                                         
    reading standard values                                                              
      √ reading BOOL (16 ms)                                                             
      √ reading BYTE (9 ms)                                                              
      √ reading WORD (7 ms)                                                              
      √ reading DWORD (8 ms)                                                             
      √ reading SINT (16 ms)                                                             
      √ reading USINT (8 ms)                                                             
      √ reading INT (16 ms)                                                              
      √ reading UINT (8 ms)                                                              
      √ reading DINT (13 ms)                                                             
      √ reading UDINT (5 ms)                                                             
      √ reading REAL (30 ms)                                                             
      √ reading STRING (13 ms)                                                           
      √ reading DATE (8 ms)                                                              
      √ reading DT (16 ms)                                                               
      √ reading TOD (13 ms)                                                              
      √ reading TIME (8 ms)                                                              
      √ reading LWORD (8 ms)                                                             
      √ reading LINT (17 ms)
      √ reading ULINT (9 ms)                                                             
      √ reading LREAL (25 ms)                                                            
      √ reading WSTRING (16 ms)                                                          
      √ reading LDATE (---- TODO: Needs TC 3.1.4026 ----)                                
      √ reading LDT (---- TODO: Needs TC 3.1.4026 ----)                                  
      √ reading LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                          
      √ reading LTIME (7 ms)                                                             
    reading standard array values                                                        
      √ reading ARRAY OF BOOL (16 ms)                                                    
      √ reading ARRAY OF BYTE (8 ms)                                                     
      √ reading ARRAY OF WORD (7 ms)                                                     
      √ reading ARRAY OF DWORD (8 ms)                                                    
      √ reading ARRAY OF SINT (13 ms)                                                    
      √ reading ARRAY OF USINT (7 ms)                                                    
      √ reading ARRAY OF INT (14 ms)                                                     
      √ reading ARRAY OF UINT (8 ms)                                                     
      √ reading ARRAY OF DINT (15 ms)                                                    
      √ reading ARRAY OF UDINT (7 ms)                                                    
      √ reading ARRAY OF REAL (29 ms)                                                    
      √ reading ARRAY OF STRING (17 ms)                                                  
      √ reading ARRAY OF DATE (7 ms)                                                     
      √ reading ARRAY OF DT (17 ms)                                                      
      √ reading ARRAY OF TOD (16 ms)                                                     
      √ reading ARRAY OF TIME (8 ms)                                                     
      √ reading ARRAY OF LWORD (9 ms)                                                    
      √ reading ARRAY OF LINT (16 ms)                                                    
      √ reading ARRAY OF ULINT (8 ms)                                                    
      √ reading ARRAY OF LREAL (29 ms)                                                   
      √ reading ARRAY OF WSTRING (16 ms)                                                 
      √ reading ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----)                       
      √ reading ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                  
      √ reading ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                 
      √ reading ARRAY OF LTIME (8 ms)                                                    
    reading complex values                                                               
      √ reading STRUCT (17 ms)                                                           
      √ reading ALIAS (9 ms)                                                             
      √ reading ENUM (44 ms)                                                             
      √ reading POINTER (address) (9 ms)                                                 
      √ reading SUBRANGE (7 ms)                                                          
      √ reading UNION (24 ms)                                                            
      √ reading FUNCTION_BLOCK (29 ms)                                                   
      √ reading INTERFACE (6 ms)                                                         
    reading complex array values                                                         
      √ reading ARRAY OF STRUCT (21 ms)                                                  
      √ reading ARRAY OF ALIAS (9 ms)                                                    
      √ reading ARRAY OF ENUM (38 ms)                                                    
      √ reading ARRAY OF POINTER (address) (8 ms)                                        
      √ reading ARRAY OF SUBRANGE (5 ms)                                                 
      √ reading ARRAY OF UNION (8 ms)                                                    
      √ reading ARRAY OF FUNCTION_BLOCK (32 ms)                                          
      √ reading ARRAY OF INTERFACE (8 ms)
    reading special types / cases                                                        
      √ reading ARRAY with negative index (6 ms)                                         
      √ reading multi-dimensional ARRAY (8 ms)                                           
      √ reading ARRAY OF ARRAY (8 ms)                                                    
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (7 ms)                
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (8 ms)                
      √ reading an empty FUNCTION_BLOCK (9 ms)                                           
      √ reading an empty STRUCT (6 ms)                                                   
      √ reading an empty ARRAY (6 ms)                                                    
    reading dereferenced POINTER and REFERENCE values                                    
      √ reading POINTER (value) (9 ms)                                                   
      √ reading REFERENCE (value) (7 ms)                                                 
    reading raw data                                                                     
      √ reading a raw value (3 ms)                                                       
  writing values                                                                         
    writing standard values                                                              
      √ writing BOOL (22 ms)                                                             
      √ writing BYTE (12 ms)                                                             
      √ writing WORD (12 ms)                                                             
      √ writing DWORD (11 ms)                                                            
      √ writing SINT (24 ms)                                                             
      √ writing USINT (9 ms)                                                             
      √ writing INT (24 ms)                                                              
      √ writing UINT (11 ms)                                                             
      √ writing DINT (22 ms)                                                             
      √ writing UDINT (12 ms)                                                            
      √ writing REAL (46 ms)                                                             
      √ writing STRING (23 ms)                                                           
      √ writing DATE (12 ms)                                                             
      √ writing DT (21 ms)                                                               
      √ writing TOD (22 ms)                                                              
      √ writing TIME (12 ms)                                                             
      √ writing LWORD (11 ms)                                                            
      √ writing LINT (24 ms)                                                             
      √ writing ULINT (10 ms)                                                            
      √ writing LREAL (48 ms)                                                            
      √ writing WSTRING (24 ms)                                                          
      √ writing LDATE (---- TODO: Needs TC 3.1.4026 ----)                                
      √ writing LDT (---- TODO: Needs TC 3.1.4026 ----)                                  
      √ writing LTOD (---- TODO: Needs TC 3.1.4026 ----)                                 
      √ writing LTIME (12 ms)                                                            
    writing standard array values                                                        
      √ writing ARRAY OF BOOL (23 ms)                                                    
      √ writing ARRAY OF BYTE (9 ms)
      √ writing ARRAY OF WORD (11 ms)                                                    
      √ writing ARRAY OF DWORD (11 ms)                                                   
      √ writing ARRAY OF SINT (22 ms)                                                    
      √ writing ARRAY OF USINT (11 ms)                                                   
      √ writing ARRAY OF INT (17 ms)                                                     
      √ writing ARRAY OF UINT (11 ms)                                                    
      √ writing ARRAY OF DINT (23 ms)                                                    
      √ writing ARRAY OF UDINT (12 ms)                                                   
      √ writing ARRAY OF REAL (41 ms)                                                    
      √ writing ARRAY OF STRING (20 ms)                                                  
      √ writing ARRAY OF DATE (12 ms)                                                    
      √ writing ARRAY OF DT (20 ms)                                                      
      √ writing ARRAY OF TOD (21 ms)                                                     
      √ writing ARRAY OF TIME (12 ms)                                                    
      √ writing ARRAY OF LWORD (13 ms)                                                   
      √ writing ARRAY OF LINT (24 ms)                                                    
      √ writing ARRAY OF ULINT (10 ms)                                                   
      √ writing ARRAY OF LREAL (38 ms)                                                   
      √ writing ARRAY OF WSTRING (22 ms)                                                 
      √ writing ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                
      √ writing ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                  
      √ writing ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)                        
      √ writing ARRAY OF LTIME (12 ms)                                                   
    writing complex values                                                               
      √ writing STRUCT (24 ms)                                                           
      √ writing ALIAS (10 ms)                                                            
      √ writing ENUM (55 ms)                                                             
      √ writing POINTER (address) (17 ms)                                                
      √ writing SUBRANGE (19 ms)                                                         
      √ writing UNION (48 ms)                                                            
      √ writing FUNCTION_BLOCK (47 ms)                                                   
      √ writing INTERFACE (15 ms)                                                        
    writing complex array values                                                         
      √ writing ARRAY OF STRUCT (26 ms)                                                  
      √ writing ARRAY OF ALIAS (15 ms)                                                   
      √ writing ARRAY OF ENUM (59 ms)                                                    
      √ writing ARRAY OF POINTER (address) (16 ms)                                       
      √ writing ARRAY OF SUBRANGE (13 ms)                                                
      √ writing ARRAY OF UNION (16 ms)                                                   
      √ writing ARRAY OF FUNCTION_BLOCK (48 ms)                                          
      √ writing ARRAY OF INTERFACE (16 ms)                                               
    writing special types / cases                                                        
      √ writing ARRAY with negative index (14 ms)                                        
      √ writing multi-dimensional ARRAY (16 ms)                                          
      √ writing ARRAY OF ARRAY (16 ms)                                                   
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '1'} (16 ms)               
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '8'} (16 ms)               
      √ writing an empty FUNCTION_BLOCK (8 ms)                                           
      √ writing an empty STRUCT (9 ms)                                                   
    writing dereferenced POINTER and REFERENCE values                                    
      √ writing POINTER (value) (26 ms)                                                  
      √ writing REFERENCE (value) (24 ms)                                                
    writing raw data                                                                     
      √ writing a raw value (4 ms)                                                       
    using variable handles for reading and writing                                       
      √ creating and deleting a varible handle (15 ms)                                   
      √ reading value using a variable handle (12 ms)                                    
      √ writing value using a variable handle (32 ms)                                    
  subscriptions (ADS notifications)                                                      
    √ subscribing and unsubscribing successfully (2025 ms)                               
    √ subscribing to a changing value (10 ms) with default cycle time (3034 ms)          
    √ subscribing to a changing value (10 ms) with 10 ms cycle time (34 ms)              
    √ subscribing to a constant value with maximum delay of 2000 ms (2026 ms)            
    √ subscribing to a raw ADS address (229 ms)                                          
  issue specific tests                                                                   
    issue 103 (https://github.com/jisotalo/ads-client/issues/103)                        
      √ calling unsubscribeAll() multiple times (should not crash to unhandled exception) (91 ms)                                                                                 
  finalizing
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
