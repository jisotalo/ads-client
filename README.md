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
 √ IMPORTANT NOTE: This test requires running a specific PLC project locally (https://github.com/jisotalo/ads-client-test-plc-project)
  connection
    √ client is not connected at beginning (1 ms)
    √ checking ads client settings
    √ connecting to the target (32 ms)
    √ checking that test PLC project is active (10 ms)
    √ checking that test PLC project version is correct (7 ms)
    √ reconnecting (28 ms)
  resetting PLC to original state
    √ resetting PLC (9 ms)
    √ checking that reset was successful (9 ms)                                                               
    √ checking that PLC is not running (12 ms)                                                                
    √ setting IsReset to false (4 ms)                                                                         
    √ starting PLC (8 ms)                                                                                     
    √ checking that test PLC project is running (503 ms)                                                      
  testing PLC runtime stop, start, restart                                                                    
    √ stopping PLC (15 ms)                                                                                    
    √ starting PLC (12 ms)                                                                                    
    √ restarting PLC (532 ms)                                                                                 
  system state, PLC runtime states and device information                                                     
    √ reading TwinCAT system state (6 ms)                                                                     
    √ reading PLC runtime (port 851) state (5 ms)                                                             
    √ reading PLC runtime (port 852) state (3 ms)                                                             
    √ reading PLC runtime device info (4 ms)                                                                  
    √ reading TwinCAT system device info (6 ms)                                                               
    √ reading PLC runtime symbol version (4 ms)                                                               
  symbols and data types                                                                                      
    √ reading upload info (4 ms)                                                                              
    √ reading all symbol information (13 ms)                                                                  
    √ reading single symbol information (1 ms)                                                                
    √ reading all data type information (14 ms)                                                               
    √ reading single data type information (3 ms)                                                             
  data conversion                                                                                             
    √ converting a raw PLC value to a Javascript variable (5 ms)                                              
    √ converting a Javascript value to a raw PLC value (42 ms)                                                
  reading values                                                                                              
    reading standard values                                                                                   
      √ reading BOOL (12 ms)                                                                                  
      √ reading BYTE (4 ms)                                                                                   
      √ reading WORD (6 ms)                                                                                   
      √ reading DWORD (6 ms)                                                                                  
      √ reading SINT (8 ms)                                                                                   
      √ reading USINT (4 ms)                                                                                  
      √ reading INT (9 ms)                                                                                    
      √ reading UINT (4 ms)                                                                                   
      √ reading DINT (16 ms)                                                                                  
      √ reading UDINT (8 ms)                                                                                  
      √ reading REAL (32 ms)                                                                                  
      √ reading STRING (15 ms)                                                                                
      √ reading DATE (8 ms)                                                                                   
      √ reading DT (17 ms)                                                                                    
      √ reading TOD (15 ms)                                                                                   
      √ reading TIME (8 ms)                                                                                   
      √ reading LWORD (8 ms)                                                                                  
      √ reading LINT (14 ms)                                                                                  
      √ reading ULINT (8 ms)                                                                                  
      √ reading LREAL (31 ms)                                                                                 
      √ reading WSTRING (18 ms)                                                                               
      √ reading LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                              
      √ reading LDT (---- TODO: Needs TC 3.1.4026 ----)                                                       
      √ reading LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                               
      √ reading LTIME (6 ms)                                                                                  
    reading standard array values                                                                             
      √ reading ARRAY OF BOOL (16 ms)                                                                         
      √ reading ARRAY OF BYTE (6 ms)                                                                          
      √ reading ARRAY OF WORD (8 ms)                                                                          
      √ reading ARRAY OF DWORD (6 ms)                                                                         
      √ reading ARRAY OF SINT (10 ms)                                                                         
      √ reading ARRAY OF USINT (5 ms)                                                                         
      √ reading ARRAY OF INT (10 ms)                                                                          
      √ reading ARRAY OF UINT (6 ms)                                                                          
      √ reading ARRAY OF DINT (10 ms)                                                                         
      √ reading ARRAY OF UDINT (4 ms)                                                                         
      √ reading ARRAY OF REAL (30 ms)                                                                         
      √ reading ARRAY OF STRING (15 ms)                                                                       
      √ reading ARRAY OF DATE (8 ms)                                                                          
      √ reading ARRAY OF DT (17 ms)                                                                           
      √ reading ARRAY OF TOD (16 ms)                                                                          
      √ reading ARRAY OF TIME (10 ms)                                                                         
      √ reading ARRAY OF LWORD (8 ms)                                                                         
      √ reading ARRAY OF LINT (16 ms)                                                                         
      √ reading ARRAY OF ULINT (7 ms)                                                                         
      √ reading ARRAY OF LREAL (32 ms)                                                                        
      √ reading ARRAY OF WSTRING (16 ms)                                                                      
      √ reading ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----)                                            
      √ reading ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                       
      √ reading ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)                                             
      √ reading ARRAY OF LTIME (9 ms)                                                                         
    reading complex values                                                                                    
      √ reading STRUCT (19 ms)                                                                                
      √ reading ALIAS (9 ms)                                                                                  
      √ reading ENUM (46 ms)                                                                                  
      √ reading POINTER (address) (8 ms)                                                                      
      √ reading SUBRANGE (9 ms)                                                                               
      √ reading UNION (23 ms)                                                                                 
      √ reading FUNCTION_BLOCK (32 ms)                                                                        
      √ reading INTERFACE (7 ms)                                                                              
    reading complex array values                                                                              
      √ reading ARRAY OF STRUCT (18 ms)                                                                       
      √ reading ARRAY OF ALIAS (6 ms)                                                                         
      √ reading ARRAY OF ENUM (43 ms)                                                                         
      √ reading ARRAY OF POINTER (address) (6 ms)                                                             
      √ reading ARRAY OF SUBRANGE (4 ms)                                                                      
      √ reading ARRAY OF UNION (8 ms)                                                                         
      √ reading ARRAY OF FUNCTION_BLOCK (32 ms)                                                               
      √ reading ARRAY OF INTERFACE (9 ms)                                                                     
    reading special types / cases                                                                             
      √ reading ARRAY with negative index (9 ms)                                                              
      √ reading multi-dimensional ARRAY (7 ms)                                                                
      √ reading ARRAY OF ARRAY (6 ms)                                                                         
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (7 ms)                                     
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (5 ms)                                     
      √ reading an empty FUNCTION_BLOCK (5 ms)                                                                
      √ reading an empty STRUCT (8 ms)                                                                        
      √ reading an empty ARRAY (8 ms)                                                                         
    reading dereferenced POINTER and REFERENCE values                                                         
      √ reading POINTER (value) (8 ms)                                                                        
      √ reading REFERENCE (value) (7 ms)                                                                      
    reading raw data                                                                                          
      √ reading a raw value (5 ms)                                                                            
      √ reading a raw value using symbol (4 ms)                                                               
  writing values                                                                                              
    writing standard values                                                                                   
      √ writing BOOL (20 ms)                                                                                  
      √ writing BYTE (12 ms)                                                                                  
      √ writing WORD (13 ms)                                                                                  
      √ writing DWORD (12 ms)                                                                                 
      √ writing SINT (25 ms)                                                                                  
      √ writing USINT (12 ms)                                                                                 
      √ writing INT (25 ms)                                                                                   
      √ writing UINT (12 ms)                                                                                  
      √ writing DINT (25 ms)                                                                                  
      √ writing UDINT (11 ms)                                                                                 
      √ writing REAL (45 ms)                                                                                  
      √ writing STRING (20 ms)                                                                                
      √ writing DATE (15 ms)                                                                                  
      √ writing DT (21 ms)                                                                                    
      √ writing TOD (24 ms)                                                                                   
      √ writing TIME (11 ms)                                                                                  
      √ writing LWORD (19 ms)                                                                                 
      √ writing LINT (24 ms)                                                                                  
      √ writing ULINT (12 ms)                                                                                 
      √ writing LREAL (45 ms)                                                                                 
      √ writing WSTRING (23 ms)                                                                               
      √ writing LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                              
      √ writing LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                                
      √ writing LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                                               
      √ writing LTIME (11 ms)                                                                                 
    writing standard array values                                                                             
      √ writing ARRAY OF BOOL (26 ms)                                                                         
      √ writing ARRAY OF BYTE (12 ms)                                                                         
      √ writing ARRAY OF WORD (11 ms)                                                                         
      √ writing ARRAY OF DWORD (11 ms)                                                                        
      √ writing ARRAY OF SINT (25 ms)                                                                         
      √ writing ARRAY OF USINT (12 ms)                                                                        
      √ writing ARRAY OF INT (24 ms)                                                                          
      √ writing ARRAY OF UINT (9 ms)                                                                          
      √ writing ARRAY OF DINT (24 ms)                                                                         
      √ writing ARRAY OF UDINT (11 ms)                                                                        
      √ writing ARRAY OF REAL (45 ms)                                                                         
      √ writing ARRAY OF STRING (22 ms)                                                                       
      √ writing ARRAY OF DATE (12 ms)                                                                         
      √ writing ARRAY OF DT (23 ms)                                                                           
      √ writing ARRAY OF TOD (24 ms)                                                                          
      √ writing ARRAY OF TIME (10 ms)                                                                         
      √ writing ARRAY OF LWORD (12 ms)                                                                        
      √ writing ARRAY OF LINT (24 ms)                                                                         
      √ writing ARRAY OF ULINT (12 ms)                                                                        
      √ writing ARRAY OF LREAL (46 ms)                                                                        
      √ writing ARRAY OF WSTRING (21 ms)                                                                      
      √ writing ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----)                                            
      √ writing ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)
      √ writing ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)                                             
      √ writing ARRAY OF LTIME (12 ms)                                                                        
    writing complex values                                                                                    
      √ writing STRUCT (23 ms)                                                                                
      √ writing ALIAS (11 ms)                                                                                 
      √ writing ENUM (44 ms)                                                                                  
      √ writing POINTER (address) (14 ms)                                                                     
      √ writing SUBRANGE (18 ms)                                                                              
      √ writing UNION (32 ms)                                                                                 
      √ writing FUNCTION_BLOCK (39 ms)                                                                        
      √ writing INTERFACE (14 ms)                                                                             
    writing complex array values                                                                              
      √ writing ARRAY OF STRUCT (26 ms)                                                                       
      √ writing ARRAY OF ALIAS (10 ms)                                                                        
      √ writing ARRAY OF ENUM (44 ms)                                                                         
      √ writing ARRAY OF POINTER (address) (13 ms)                                                            
      √ writing ARRAY OF SUBRANGE (9 ms)                                                                      
      √ writing ARRAY OF UNION (12 ms)                                                                        
      √ writing ARRAY OF FUNCTION_BLOCK (36 ms)                                                               
      √ writing ARRAY OF INTERFACE (13 ms)                                                                    
    writing special types / cases                                                                             
      √ writing ARRAY with negative index (9 ms)                                                              
      √ writing multi-dimensional ARRAY (13 ms)                                                               
      √ writing ARRAY OF ARRAY (15 ms)                                                                        
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '1'} (13 ms)                                    
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '8'} (15 ms)                                    
      √ writing an empty FUNCTION_BLOCK (8 ms)                                                                
      √ writing an empty STRUCT (5 ms)                                                                        
    writing dereferenced POINTER and REFERENCE values                                                         
      √ writing POINTER (value) (22 ms)                                                                       
      √ writing REFERENCE (value) (21 ms)                                                                     
    writing raw data                                                                                          
      √ writing a raw value (9 ms)                                                                            
      √ writing a raw value using symbol (6 ms)                                                               
    using variable handles for reading and writing                                                            
      √ creating and deleting a varible handle (13 ms)                                                        
      √ reading value using a variable handle (10 ms)                                                         
      √ writing value using a variable handle (28 ms)                                                         
  subscriptions (ADS notifications)                                                                           
    √ subscribing and unsubscribing successfully (2035 ms)                                                    
    √ subscribing to a changing value (10 ms) with default cycle time (3254 ms)                               
    √ subscribing to a changing value (10 ms) with 10 ms cycle time (33 ms)                                   
    √ subscribing to a constant value with maximum delay of 2000 ms (2034 ms)                                 
    √ subscribing to a raw ADS address (218 ms)                                                               
  issue specific tests                                                                                        
    issue 103 (https://github.com/jisotalo/ads-client/issues/103)                                             
      √ calling unsubscribeAll() multiple times (should not crash to unhandled exception) (61 ms)             
  disconnecting                                                                                               
    √ disconnecting client                                                                                    
  controlling TwinCAT system service                                                                          
    √ connecting (1 ms)                                                                                       
    √ setting TwinCAT system to config (2021 ms)                                                              
    √ setting TwinCAT system to run (2026 ms)                                                                 
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
