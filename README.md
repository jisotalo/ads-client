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

`npm test` results - updated 15.06.2024

```
√ IMPORTANT NOTE: This test requires running a specific PLC project locally (https://github.com/jisotalo/ads-client-test-plc-project) (2 ms)          
connection
  √ client is not connected at beginning (2 ms)                           
  √ checking ads client settings (1 ms)                                   
  √ connecting to target (60 ms)                                          
  √ checking that test PLC project is active (14 ms)                      
  √ checking that test PLC project version is correct (15 ms)             
resetting PLC to original state                                           
  √ resetting PLC (14 ms)                                                 
  √ checking that reset was succesful (9 ms)                              
  √ checking that PLC is not running (16 ms)                              
  √ setting IsReset to false (6 ms)                                       
  √ starting PLC (9 ms)                                                   
  √ checking that test PLC project is running (505 ms)                    
testing PLC runtime stop, start, restart                                  
  √ stopping PLC (16 ms)                                                  
  √ starting PLC (18 ms)                                                  
  √ restarting PLC (544 ms)                                               
system state, PLC runtime states and device information                   
  √ reading twinCAT system state (8 ms)                                   
  √ reading PLC runtime (port 851) state (5 ms)                           
  √ reading PLC runtime (port 852) state (5 ms)                           
  √ reading PLC runtime device info (6 ms)                                
  √ reading TwinCAT system device info (7 ms)                             
symbols and data types                                                    
  √ reading upload info (6 ms)                                            
  √ reading all symbol information (25 ms)                                
  √ reading single symbol information (3 ms)                              
  √ reading all data type information (33 ms)                             
  √ reading single data type information (9 ms)                           
reading values                                                            
  reading standard values                                                 
    √ reading BOOL (18 ms)                                                
    √ reading BYTE (11 ms)                                                
    √ reading WORD (10 ms)                                                
    √ reading DWORD (9 ms)                                                
    √ reading SINT (20 ms)                                                
    √ reading USINT (8 ms)                                                
    √ reading INT (22 ms)                                                 
    √ reading UINT (10 ms)                                                
    √ reading DINT (18 ms)                                                
    √ reading UDINT (8 ms)                                                
    √ reading REAL (37 ms)                                                
    √ reading STRING (17 ms)                                              
    √ reading DATE (10 ms)                                                
    √ reading DT (17 ms)                                                  
    √ reading TOD (19 ms)                                                 
    √ reading TIME (7 ms)                                                 
    √ reading LWORD (10 ms)                                               
    √ reading LINT (19 ms)                                                
    √ reading ULINT (8 ms)                                                
    √ reading LREAL (33 ms)                                               
    √ reading WSTRING (17 ms)                                             
    × reading LDATE (TODO) (1 ms)                                         
    × reading LDT (TODO)                                                  
    × reading LTOD (TODO) (1 ms)                                          
    √ reading LTIME (9 ms)                                                
  reading standard array values                                           
    √ reading ARRAY OF BOOL (23 ms)                                       
    √ reading ARRAY OF BYTE (9 ms)                                        
    √ reading ARRAY OF WORD (10 ms)                                       
    √ reading ARRAY OF DWORD (7 ms)                                       
    √ reading ARRAY OF SINT (14 ms)                                       
    √ reading ARRAY OF USINT (11 ms)                                      
    √ reading ARRAY OF INT (18 ms)                                        
    √ reading ARRAY OF UINT (8 ms)                                        
    √ reading ARRAY OF DINT (20 ms)                                       
    √ reading ARRAY OF UDINT (12 ms)                                      
    √ reading ARRAY OF REAL (37 ms)                                       
    √ reading ARRAY OF STRING (18 ms)                                     
    √ reading ARRAY OF DATE (11 ms)                                       
    √ reading ARRAY OF DT (18 ms)                                         
    √ reading ARRAY OF TOD (20 ms)
    √ reading ARRAY OF TIME (8 ms)                                        
    √ reading ARRAY OF LWORD (11 ms)                                      
    √ reading ARRAY OF LINT (16 ms)                                       
    √ reading ARRAY OF ULINT (8 ms)                                       
    √ reading ARRAY OF LREAL (38 ms)                                      
    √ reading ARRAY OF WSTRING (22 ms)                                    
    × reading ARRAY OF LDATE (TODO) (1 ms)                                
    × reading ARRAY OF LDT (TODO) (1 ms)                                  
    × reading ARRAY OF LTOD (TODO) (1 ms)                                 
    √ reading ARRAY OF LTIME (11 ms)                                      
  reading complex values                                                  
    √ reading STRUCT (26 ms)                                              
    √ reading ALIAS (10 ms)                                               
    √ reading ENUM (43 ms)                                                
    √ reading POINTER (10 ms)                                             
    √ reading REFERENCE (----TODO----) (1 ms)                             
    √ reading SUBRANGE (10 ms)                                            
    √ reading UNION (29 ms)                                               
    √ reading FUNCTION_BLOCK (40 ms)                                      
    √ reading INTERFACE (11 ms)                                           
  reading complex array values                                            
    √ reading ARRAY OF STRUCT (26 ms)                                     
    √ reading ARRAY OF ALIAS (11 ms)                                      
    √ reading ARRAY OF ENUM (52 ms)                                       
    √ reading ARRAY OF POINTER (10 ms)                                    
    √ reading ARRAY OF SUBRANGE (13 ms)                                   
    √ reading ARRAY OF UNION (10 ms)                                      
    √ reading ARRAY OF FUNCTION_BLOCK (44 ms)                             
    √ reading ARRAY OF INTERFACE (10 ms)                                  
  reading special types / cases                                           
    √ reading ARRAY with negative index (11 ms)                           
    √ reading multi-dimensional ARRAY (12 ms)                             
    √ reading ARRAY OF ARRAY (9 ms)                                       
    √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (9 ms)   
    √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (10 ms)  
    √ reading an empty FUNCTION_BLOCK (6 ms)                              
    √ reading an empty STRUCT (9 ms)                                      
    √ reading an empty ARRAY (10 ms)                                      
  reading dereferenced POINTER and REFERENCE values                       
    √ reading POINTER (12 ms)                                             
    √ reading REFERENCE (7 ms)                                            
  reading using variable handles                                          
    × TODO                                                                
  reading raw data                                                        
    × TODO (1 ms)                                                         
writing values                                                            
  writing standard values                                                 
    √ writing BOOL (25 ms)                                                
    √ writing BYTE (13 ms)                                                
    √ writing WORD (13 ms)                                                
    √ writing DWORD (12 ms)                                               
    √ writing SINT (25 ms)
    √ writing USINT (12 ms)                                               
    √ writing INT (22 ms)                                                 
    √ writing UINT (11 ms)                                                
    √ writing DINT (24 ms)                                                
    √ writing UDINT (16 ms)                                               
    √ writing REAL (48 ms)                                                
    √ writing STRING (24 ms)                                              
    √ writing DATE (13 ms)                                                
    √ writing DT (28 ms)                                                  
    √ writing TOD (24 ms)                                                 
    √ writing TIME (14 ms)                                                
    √ writing LWORD (12 ms)                                               
    √ writing LINT (27 ms)                                                
    √ writing ULINT (12 ms)                                               
    √ writing LREAL (51 ms)                                               
    √ writing WSTRING (28 ms)                                             
    × writing LDATE (TODO) (1 ms)                                         
    × writing LDT (TODO) (1 ms)                                           
    × writing LTOD (TODO) (1 ms)                                          
    √ writing LTIME (12 ms)                                               
  writing standard array values                                           
    √ writing ARRAY OF BOOL (20 ms)                                       
    √ writing ARRAY OF BYTE (11 ms)                                       
    √ writing ARRAY OF WORD (13 ms)                                       
    √ writing ARRAY OF DWORD (14 ms)                                      
    √ writing ARRAY OF SINT (28 ms)                                       
    √ writing ARRAY OF USINT (12 ms)                                      
    √ writing ARRAY OF INT (29 ms)                                        
    √ writing ARRAY OF UINT (14 ms)                                       
    √ writing ARRAY OF DINT (25 ms)                                       
    √ writing ARRAY OF UDINT (16 ms)                                      
    √ writing ARRAY OF REAL (49 ms)                                       
    √ writing ARRAY OF STRING (27 ms)                                     
    √ writing ARRAY OF DATE (13 ms)                                       
    √ writing ARRAY OF DT (27 ms)                                         
    √ writing ARRAY OF TOD (27 ms)                                        
    √ writing ARRAY OF TIME (10 ms)                                       
    √ writing ARRAY OF LWORD (14 ms)                                      
    √ writing ARRAY OF LINT (26 ms)                                       
    √ writing ARRAY OF ULINT (12 ms)                                      
    √ writing ARRAY OF LREAL (52 ms)                                      
    √ writing ARRAY OF WSTRING (24 ms)                                    
    × writing ARRAY OF LDATE (TODO) (1 ms)                                
    × writing ARRAY OF LDT (TODO) (1 ms)                                  
    × writing ARRAY OF LTOD (TODO)                                        
    √ writing ARRAY OF LTIME (12 ms)                                      
  writing complex values                                                  
    √ writing STRUCT (36 ms)                                              
    √ writing ALIAS (17 ms)                                               
    √ writing ENUM (73 ms)
    √ writing POINTER (18 ms)                                             
    √ writing REFERENCE (----TODO----)                                    
    √ writing SUBRANGE (20 ms)                                            
    √ writing UNION (52 ms)                                               
    √ writing FUNCTION_BLOCK (66 ms)                                      
    √ writing INTERFACE (18 ms)                                           
  writing complex array values                                            
    √ writing ARRAY OF STRUCT (40 ms)                                     
    √ writing ARRAY OF ALIAS (14 ms)                                      
    √ writing ARRAY OF ENUM (57 ms)                                       
    √ writing ARRAY OF POINTER (20 ms)                                    
    √ writing ARRAY OF SUBRANGE (18 ms)                                   
    √ writing ARRAY OF UNION (21 ms)                                      
    √ writing ARRAY OF FUNCTION_BLOCK (56 ms)                             
    √ writing ARRAY OF INTERFACE (16 ms)                                  
  writing special types / cases                                           
    √ writing ARRAY with negative index (22 ms)                           
    √ writing multi-dimensional ARRAY (18 ms)                             
    √ writing ARRAY OF ARRAY (17 ms)                                      
    √ writing STRUCT with pragma: {attribute 'pack_mode' := '1'} (19 ms)  
    √ writing STRUCT with pragma: {attribute 'pack_mode' := '8'} (19 ms)  
    √ writing an empty FUNCTION_BLOCK (8 ms)                              
    √ writing an empty STRUCT (7 ms)                                      
  writing dereferenced POINTER and REFERENCE values
    × writing POINTER - TODO (1 ms)                                       
    × writing REFERENCE - TODO                                            
  writing raw data                                                        
    × TODO                                                                
  writing using variable handles                                          
    × TODO (1 ms)                                                         
subscriptions (ADS notifications)                                         
  √ subscribing and unsubscribing successfully (2235 ms)                  
  √ subscribing to a changing value (10 ms) with default cycle time (2907 ms)                                                                         
  √ subscribing to a changing value (10 ms) with 10 ms cycle time (36 ms)
  √ subscribing to a constant value with maximum delay of 2000 ms (2186 ms)                                                                           
  √ subscribing to a raw ADS address (2181 ms)
issue specific tests                                                      
  issue 103 (https://github.com/jisotalo/ads-client/issues/103)           
    √ calling unsubscribeAll() multiple times (should not crash to unhandled exception) (102 ms)                                                      
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
