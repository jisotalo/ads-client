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
    √ IMPORTANT NOTE: This test requires running a specific PLC project locally (https://github.com/jisotalo/ads-client-test-plc-project) (2 ms)          
  connection
    √ client is not connected at beginning (1 ms)                           
    √ checking ads client settings (1 ms)                                   
    √ connecting to the target (59 ms)                                      
    √ checking that test PLC project is active (18 ms)                      
    √ checking that test PLC project version is correct (12 ms)             
    √ reconnecting (39 ms)                                                  
  resetting PLC to original state                                           
    √ resetting PLC (14 ms)                                                 
    √ checking that reset was successful (9 ms)                             
    √ checking that PLC is not running (14 ms)                              
    √ setting IsReset to false (11 ms)                                      
    √ starting PLC (10 ms)                                                  
    √ checking that test PLC project is running (506 ms)                    
  testing PLC runtime stop, start, restart                                  
    √ stopping PLC (21 ms)                                                  
    √ starting PLC (17 ms)                                                  
    √ restarting PLC (541 ms)                                               
  system state, PLC runtime states and device information                   
    √ reading TwinCAT system state (6 ms)                                   
    √ reading PLC runtime (port 851) state (6 ms)                           
    √ reading PLC runtime (port 852) state (7 ms)                           
    √ reading PLC runtime device info (5 ms)                                
    √ reading TwinCAT system device info (8 ms)                             
  symbols and data types                                                    
    √ reading upload info (6 ms)                                            
    √ reading all symbol information (29 ms)                                
    √ reading single symbol information (3 ms)                              
    √ reading all data type information (34 ms)                             
    √ reading single data type information (7 ms)                           
  data conversion                                                           
    √ converting a raw PLC value to a Javascript variable (4 ms)            
    √ converting a Javascript value to a raw PLC value (79 ms)              
  reading values                                                            
    reading standard values                                                 
      √ reading BOOL (14 ms)                                                
      √ reading BYTE (7 ms)                                                 
      √ reading WORD (10 ms)                                                
      √ reading DWORD (9 ms)                                                
      √ reading SINT (17 ms)                                                
      √ reading USINT (9 ms)                                                
      √ reading INT (18 ms)                                                 
      √ reading UINT (9 ms)                                                 
      √ reading DINT (17 ms)                                                
      √ reading UDINT (8 ms)                                                
      √ reading REAL (33 ms)                                                
      √ reading STRING (17 ms)                                              
      √ reading DATE (8 ms)                                                 
      √ reading DT (16 ms)                                                  
      √ reading TOD (17 ms)                                                 
      √ reading TIME (9 ms)                                                 
      √ reading LWORD (9 ms)                                                
      √ reading LINT (17 ms)                                                
      √ reading ULINT (9 ms)                                                
      √ reading LREAL (34 ms)                                               
      √ reading WSTRING (18 ms)                                             
      √ reading LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)            
      √ reading LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)              
      √ reading LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)             
      √ reading LTIME (10 ms)                                               
    reading standard array values                                           
      √ reading ARRAY OF BOOL (18 ms)                                       
      √ reading ARRAY OF BYTE (10 ms)                                       
      √ reading ARRAY OF WORD (8 ms)                                        
      √ reading ARRAY OF DWORD (9 ms)                                       
      √ reading ARRAY OF SINT (17 ms)                                       
      √ reading ARRAY OF USINT (9 ms)                                       
      √ reading ARRAY OF INT (15 ms)                                        
      √ reading ARRAY OF UINT (9 ms)                                        
      √ reading ARRAY OF DINT (21 ms)                                       
      √ reading ARRAY OF UDINT (9 ms)                                       
      √ reading ARRAY OF REAL (34 ms)                                       
      √ reading ARRAY OF STRING (17 ms)                                     
      √ reading ARRAY OF DATE (9 ms)                                        
      √ reading ARRAY OF DT (18 ms)                                         
      √ reading ARRAY OF TOD (25 ms)                                        
      √ reading ARRAY OF TIME (10 ms)                                       
      √ reading ARRAY OF LWORD (8 ms)                                       
      √ reading ARRAY OF LINT (16 ms)                                       
      √ reading ARRAY OF ULINT (10 ms)                                      
      √ reading ARRAY OF LREAL (31 ms)                                      
      √ reading ARRAY OF WSTRING (21 ms)                                    
      √ reading ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)
      √ reading ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)     
      √ reading ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)           
      √ reading ARRAY OF LTIME (10 ms)                                      
    reading complex values                                                  
      √ reading STRUCT (28 ms)                                              
      √ reading ALIAS (11 ms)                                               
      √ reading ENUM (45 ms)                                                
      √ reading POINTER (address) (9 ms)                                    
      √ reading SUBRANGE (9 ms)                                             
      √ reading UNION (24 ms)                                               
      √ reading FUNCTION_BLOCK (35 ms)                                      
      √ reading INTERFACE (10 ms)                                           
    reading complex array values                                            
      √ reading ARRAY OF STRUCT (24 ms)                                     
      √ reading ARRAY OF ALIAS (10 ms)                                      
      √ reading ARRAY OF ENUM (42 ms)                                       
      √ reading ARRAY OF POINTER (address) (10 ms)                          
      √ reading ARRAY OF SUBRANGE (9 ms)                                    
      √ reading ARRAY OF UNION (10 ms)                                      
      √ reading ARRAY OF FUNCTION_BLOCK (42 ms)                             
      √ reading ARRAY OF INTERFACE (8 ms)
    reading special types / cases                                           
      √ reading ARRAY with negative index (10 ms)                           
      √ reading multi-dimensional ARRAY (8 ms)                              
      √ reading ARRAY OF ARRAY (10 ms)                                      
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (9 ms)   
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (10 ms)  
      √ reading an empty FUNCTION_BLOCK (7 ms)                              
      √ reading an empty STRUCT (9 ms)                                      
      √ reading an empty ARRAY (9 ms)                                       
    reading dereferenced POINTER and REFERENCE values                       
      √ reading POINTER (value) (11 ms)                                     
      √ reading REFERENCE (value) (10 ms)                                   
    reading raw data                                                        
      √ reading a raw value (6 ms)                                          
      √ reading a raw value using symbol (84 ms)                            
  writing values                                                            
    writing standard values                                                 
      √ writing BOOL (25 ms)                                                
      √ writing BYTE (13 ms)                                                
      √ writing WORD (10 ms)                                                
      √ writing DWORD (12 ms)                                               
      √ writing SINT (23 ms)                                                
      √ writing USINT (12 ms)                                               
      √ writing INT (24 ms)                                                 
      √ writing UINT (13 ms)                                                
      √ writing DINT (21 ms)                                                
      √ writing UDINT (13 ms)                                               
      √ writing REAL (59 ms)                                                
      √ writing STRING (27 ms)                                              
      √ writing DATE (12 ms)                                                
      √ writing DT (27 ms)                                                  
      √ writing TOD (25 ms)                                                 
      √ writing TIME (13 ms)                                                
      √ writing LWORD (13 ms)                                               
      √ writing LINT (26 ms)
      √ writing ULINT (15 ms)                                               
      √ writing LREAL (47 ms)                                               
      √ writing WSTRING (27 ms)                                             
      √ writing LDATE (---- TODO: Needs TC 3.1.4026 ----)                   
      √ writing LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)              
      √ writing LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)             
      √ writing LTIME (14 ms)                                               
    writing standard array values                                           
      √ writing ARRAY OF BOOL (25 ms)                                       
      √ writing ARRAY OF BYTE (15 ms)                                       
      √ writing ARRAY OF WORD (12 ms)                                       
      √ writing ARRAY OF DWORD (25 ms)                                      
      √ writing ARRAY OF SINT (26 ms)                                       
      √ writing ARRAY OF USINT (13 ms)                                      
      √ writing ARRAY OF INT (25 ms)                                        
      √ writing ARRAY OF UINT (11 ms)                                       
      √ writing ARRAY OF DINT (26 ms)                                       
      √ writing ARRAY OF UDINT (15 ms)                                      
      √ writing ARRAY OF REAL (48 ms)                                       
      √ writing ARRAY OF STRING (24 ms)                                     
      √ writing ARRAY OF DATE (17 ms)                                       
      √ writing ARRAY OF DT (24 ms)                                         
      √ writing ARRAY OF TOD (26 ms)                                        
      √ writing ARRAY OF TIME (13 ms)                                       
      √ writing ARRAY OF LWORD (14 ms)                                      
      √ writing ARRAY OF LINT (28 ms)                                       
      √ writing ARRAY OF ULINT (13 ms)                                      
      √ writing ARRAY OF LREAL (49 ms)                                      
      √ writing ARRAY OF WSTRING (25 ms)                                    
      √ writing ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)
      √ writing ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)     
      √ writing ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----) (1 ms)    
      √ writing ARRAY OF LTIME (14 ms)                                      
    writing complex values                                                  
      √ writing STRUCT (40 ms)                                              
      √ writing ALIAS (16 ms)                                               
      √ writing ENUM (69 ms)                                                
      √ writing POINTER (address) (16 ms)                                   
      √ writing SUBRANGE (20 ms)                                            
      √ writing UNION (43 ms)                                               
      √ writing FUNCTION_BLOCK (54 ms)                                      
      √ writing INTERFACE (20 ms)                                           
    writing complex array values                                            
      √ writing ARRAY OF STRUCT (40 ms)                                     
      √ writing ARRAY OF ALIAS (17 ms)                                      
      √ writing ARRAY OF ENUM (62 ms)                                       
      √ writing ARRAY OF POINTER (address) (18 ms)                          
      √ writing ARRAY OF SUBRANGE (11 ms)                                   
      √ writing ARRAY OF UNION (17 ms)                                      
      √ writing ARRAY OF FUNCTION_BLOCK (53 ms)                             
      √ writing ARRAY OF INTERFACE (14 ms)                                  
    writing special types / cases                                           
      √ writing ARRAY with negative index (14 ms)                           
      √ writing multi-dimensional ARRAY (17 ms)                             
      √ writing ARRAY OF ARRAY (18 ms)                                      
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '1'} (20 ms)  
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '8'} (21 ms)  
      √ writing an empty FUNCTION_BLOCK (8 ms)                              
      √ writing an empty STRUCT (10 ms)                                     
    writing dereferenced POINTER and REFERENCE values                       
      √ writing POINTER (value) (42 ms)                                     
      √ writing REFERENCE (value) (41 ms)                                   
    writing raw data                                                        
      √ writing a raw value (10 ms)                                         
      √ writing a raw value using symbol (8 ms)                             
    using variable handles for reading and writing                          
      √ creating and deleting a varible handle (15 ms)                      
      √ reading value using a variable handle (13 ms)                       
      √ writing value using a variable handle (32 ms)                       
  subscriptions (ADS notifications)                                         
    √ subscribing and unsubscribing successfully (2069 ms)                  
    √ subscribing to a changing value (10 ms) with default cycle time (2439 ms)                                                                         
    √ subscribing to a changing value (10 ms) with 10 ms cycle time (30 ms)
    √ subscribing to a constant value with maximum delay of 2000 ms (2074 ms)                                                                           
    √ subscribing to a raw ADS address (227 ms)
  issue specific tests                                                      
    issue 103 (https://github.com/jisotalo/ads-client/issues/103)           
      √ calling unsubscribeAll() multiple times (should not crash to unhandled exception) (88 ms)                                                       
  disconnecting
    √ disconnecting client (1 ms)                                           
  controlling TwinCAT system service                                        
    √ connecting (3 ms)                                                     
    √ setting TwinCAT system to config (2026 ms)                            
    √ setting TwinCAT system to run (2023 ms)                               
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
