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

`npm test` results - updated 07.07.2024

```
√ IMPORTANT NOTE: This test requires running a specific PLC project locally (https://github.com/jisotalo/ads-client-test-plc-project) (3 ms)                                    
  connection
    √ client is not connected at beginning (2 ms)                                        
    √ checking ads client settings (2 ms)                                                
    √ connecting to target (52 ms)                                                       
    √ checking that test PLC project is active (19 ms)                                   
    √ checking that test PLC project version is correct (13 ms)                          
  resetting PLC to original state                                                        
    √ resetting PLC (11 ms)                                                              
    √ checking that reset was successful (10 ms)                                         
    √ checking that PLC is not running (15 ms)                                           
    √ setting IsReset to false (6 ms)                                                    
    √ starting PLC (9 ms)
    √ checking that test PLC project is running (507 ms)                                 
  testing PLC runtime stop, start, restart                                               
    √ stopping PLC (18 ms)                                                               
    √ starting PLC (19 ms)                                                               
    √ restarting PLC (546 ms)                                                            
  system state, PLC runtime states and device information                                
    √ reading TwinCAT system state (7 ms)                                                
    √ reading PLC runtime (port 851) state (6 ms)                                        
    √ reading PLC runtime (port 852) state (5 ms)                                        
    √ reading PLC runtime device info (6 ms)                                             
    √ reading TwinCAT system device info (7 ms)                                          
  symbols and data types                                                                 
    √ reading upload info (4 ms)                                                         
    √ reading all symbol information (21 ms)                                             
    √ reading single symbol information (2 ms)                                           
    √ reading all data type information (30 ms)                                          
    √ reading single data type information (8 ms)                                        
  data conversion                                                                        
    √ converting a raw PLC value to a Javascript variable (4 ms)                         
    √ converting a Javascript value to a raw PLC value (6 ms)                            
  reading values                                                                         
    reading standard values                                                              
      √ reading BOOL (18 ms)                                                             
      √ reading BYTE (8 ms)                                                              
      √ reading WORD (10 ms)                                                             
      √ reading DWORD (11 ms)                                                            
      √ reading SINT (18 ms)                                                             
      √ reading USINT (10 ms)                                                            
      √ reading INT (20 ms)
      √ reading UINT (10 ms)                                                             
      √ reading DINT (17 ms)                                                             
      √ reading UDINT (10 ms)                                                            
      √ reading REAL (33 ms)                                                             
      √ reading STRING (16 ms)                                                           
      √ reading DATE (9 ms)                                                              
      √ reading DT (19 ms)                                                               
      √ reading TOD (17 ms)                                                              
      √ reading TIME (7 ms)                                                              
      √ reading LWORD (10 ms)                                                            
      √ reading LINT (15 ms)                                                             
      √ reading ULINT (9 ms)
      √ reading LREAL (33 ms)                                                            
      √ reading WSTRING (19 ms)                                                          
      √ reading LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                         
      √ reading LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                           
      √ reading LTOD (---- TODO: Needs TC 3.1.4026 ----)                                 
      √ reading LTIME (10 ms)                                                            
    reading standard array values                                                        
      √ reading ARRAY OF BOOL (21 ms)                                                    
      √ reading ARRAY OF BYTE (12 ms)                                                    
      √ reading ARRAY OF WORD (10 ms)                                                    
      √ reading ARRAY OF DWORD (9 ms)                                                    
      √ reading ARRAY OF SINT (77 ms)                                                    
      √ reading ARRAY OF USINT (9 ms)                                                    
      √ reading ARRAY OF INT (17 ms)                                                     
      √ reading ARRAY OF UINT (7 ms)                                                     
      √ reading ARRAY OF DINT (12 ms)                                                    
      √ reading ARRAY OF UDINT (9 ms)                                                    
      √ reading ARRAY OF REAL (34 ms)                                                    
      √ reading ARRAY OF STRING (14 ms)                                                  
      √ reading ARRAY OF DATE (6 ms)                                                     
      √ reading ARRAY OF DT (17 ms)                                                      
      √ reading ARRAY OF TOD (19 ms)                                                     
      √ reading ARRAY OF TIME (7 ms)                                                     
      √ reading ARRAY OF LWORD (9 ms)                                                    
      √ reading ARRAY OF LINT (13 ms)                                                    
      √ reading ARRAY OF ULINT (9 ms)                                                    
      √ reading ARRAY OF LREAL (36 ms)                                                   
      √ reading ARRAY OF WSTRING (17 ms)                                                 
      √ reading ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----)                       
      √ reading ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)                         
      √ reading ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)                        
      √ reading ARRAY OF LTIME (8 ms)                                                    
    reading complex values                                                               
      √ reading STRUCT (24 ms)                                                           
      √ reading ALIAS (9 ms)
      √ reading ENUM (43 ms)                                                             
      √ reading POINTER (7 ms)                                                           
      √ reading REFERENCE (----TODO----)                                                 
      √ reading SUBRANGE (8 ms)                                                          
      √ reading UNION (24 ms)                                                            
      √ reading FUNCTION_BLOCK (36 ms)                                                   
      √ reading INTERFACE (8 ms)                                                         
    reading complex array values                                                         
      √ reading ARRAY OF STRUCT (28 ms)                                                  
      √ reading ARRAY OF ALIAS (11 ms)                                                   
      √ reading ARRAY OF ENUM (47 ms)                                                    
      √ reading ARRAY OF POINTER (10 ms)                                                 
      √ reading ARRAY OF SUBRANGE (11 ms)                                                
      √ reading ARRAY OF UNION (9 ms)
      √ reading ARRAY OF FUNCTION_BLOCK (38 ms)                                          
      √ reading ARRAY OF INTERFACE (13 ms)                                               
    reading special types / cases                                                        
      √ reading ARRAY with negative index (11 ms)                                        
      √ reading multi-dimensional ARRAY (9 ms)                                           
      √ reading ARRAY OF ARRAY (8 ms)                                                    
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (11 ms)               
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (8 ms)                
      √ reading an empty FUNCTION_BLOCK (8 ms)                                           
      √ reading an empty STRUCT (7 ms)                                                   
      √ reading an empty ARRAY (8 ms)                                                    
    reading dereferenced POINTER and REFERENCE values                                    
      √ reading POINTER (9 ms)                                                           
      √ reading REFERENCE (10 ms)                                                        
    reading raw data
      √ reading a raw value (5 ms)                                                       
  writing values                                                                         
    writing standard values                                                              
      √ writing BOOL (28 ms)                                                             
      √ writing BYTE (13 ms)                                                             
      √ writing WORD (14 ms)                                                             
      √ writing DWORD (12 ms)                                                            
      √ writing SINT (26 ms)                                                             
      √ writing USINT (12 ms)                                                            
      √ writing INT (24 ms)                                                              
      √ writing UINT (14 ms)                                                             
      √ writing DINT (25 ms)                                                             
      √ writing UDINT (13 ms)                                                            
      √ writing REAL (55 ms)
      √ writing STRING (20 ms)                                                           
      √ writing DATE (10 ms)                                                             
      √ writing DT (26 ms)                                                               
      √ writing TOD (21 ms)                                                              
      √ writing TIME (13 ms)                                                             
      √ writing LWORD (13 ms)                                                            
      √ writing LINT (23 ms)                                                             
      √ writing ULINT (13 ms)                                                            
      √ writing LREAL (47 ms)                                                            
      √ writing WSTRING (26 ms)                                                          
      √ writing LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                         
      √ writing LDT (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                           
      √ writing LTOD (---- TODO: Needs TC 3.1.4026 ----)                                 
      √ writing LTIME (13 ms)                                                            
    writing standard array values                                                        
      √ writing ARRAY OF BOOL (26 ms)                                                    
      √ writing ARRAY OF BYTE (11 ms)                                                    
      √ writing ARRAY OF WORD (14 ms)                                                    
      √ writing ARRAY OF DWORD (14 ms)                                                   
      √ writing ARRAY OF SINT (24 ms)                                                    
      √ writing ARRAY OF USINT (14 ms)                                                   
      √ writing ARRAY OF INT (26 ms)                                                     
      √ writing ARRAY OF UINT (12 ms)                                                    
      √ writing ARRAY OF DINT (27 ms)                                                    
      √ writing ARRAY OF UDINT (16 ms)                                                   
      √ writing ARRAY OF REAL (50 ms)                                                    
      √ writing ARRAY OF STRING (25 ms)                                                  
      √ writing ARRAY OF DATE (14 ms)                                                    
      √ writing ARRAY OF DT (24 ms)                                                      
      √ writing ARRAY OF TOD (27 ms)                                                     
      √ writing ARRAY OF TIME (12 ms)                                                    
      √ writing ARRAY OF LWORD (14 ms)                                                   
      √ writing ARRAY OF LINT (26 ms)                                                    
      √ writing ARRAY OF ULINT (13 ms)                                                   
      √ writing ARRAY OF LREAL (49 ms)                                                   
      √ writing ARRAY OF WSTRING (21 ms)                                                 
      √ writing ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----) (1 ms)                
      √ writing ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)                         
      √ writing ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)
      √ writing ARRAY OF LTIME (12 ms)                                                   
    writing complex values                                                               
      √ writing STRUCT (31 ms)                                                           
      √ writing ALIAS (14 ms)                                                            
      √ writing ENUM (59 ms)                                                             
      √ writing POINTER (21 ms)                                                          
      √ writing REFERENCE (----TODO----) (1 ms)                                          
      √ writing SUBRANGE (23 ms)                                                         
      √ writing UNION (52 ms)                                                            
      √ writing FUNCTION_BLOCK (56 ms)                                                   
      √ writing INTERFACE (14 ms)                                                        
    writing complex array values                                                         
      √ writing ARRAY OF STRUCT (43 ms)                                                  
      √ writing ARRAY OF ALIAS (16 ms)                                                   
      √ writing ARRAY OF ENUM (59 ms)                                                    
      √ writing ARRAY OF POINTER (18 ms)                                                 
      √ writing ARRAY OF SUBRANGE (13 ms)                                                
      √ writing ARRAY OF UNION (16 ms)                                                   
      √ writing ARRAY OF FUNCTION_BLOCK (58 ms)                                          
      √ writing ARRAY OF INTERFACE (16 ms)                                               
    writing special types / cases                                                        
      √ writing ARRAY with negative index (15 ms)                                        
      √ writing multi-dimensional ARRAY (18 ms)                                          
      √ writing ARRAY OF ARRAY (18 ms)                                                   
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '1'} (17 ms)               
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '8'} (17 ms)               
      √ writing an empty FUNCTION_BLOCK (8 ms)                                           
      √ writing an empty STRUCT (9 ms)                                                   
    writing dereferenced POINTER and REFERENCE values                                    
      × writing POINTER - TODO (1 ms)                                                    
      × writing REFERENCE - TODO                                                         
    writing raw data                                                                     
      √ writing a raw value (8 ms)                                                       
    using variable handles for reading and writing                                       
      √ creating and deleting a varible handle (15 ms)                                   
      √ reading value using a variable handle (12 ms)                                    
      √ writing value using a variable handle (33 ms)                                    
  subscriptions (ADS notifications)                                                      
    √ subscribing and unsubscribing successfully (2112 ms)                               
    √ subscribing to a changing value (10 ms) with default cycle time (2660 ms)          
    √ subscribing to a changing value (10 ms) with 10 ms cycle time (38 ms)              
    √ subscribing to a constant value with maximum delay of 2000 ms (2073 ms)            
    √ subscribing to a raw ADS address (235 ms)                                          
  issue specific tests
    issue 103 (https://github.com/jisotalo/ads-client/issues/103)                        
      √ calling unsubscribeAll() multiple times (should not crash to unhandled exception) (105 ms)                                                                                
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
