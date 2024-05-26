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

`npm test` results - updated 26.05.2024

```
√ IMPORTANT NOTE: This test requires running a specific PLC project locally (https://github.com/jisotalo/ads-client-test-plc-project) (2 ms)            
  connection
    √ client is not connected at beginning (2 ms)                            
    √ checking ads client settings (2 ms)                                    
    √ connecting to target (51 ms)                                           
    √ checking that test PLC project is active (16 ms)                       
    √ checking that test PLC project version is correct (16 ms)              
  resetting PLC to original state                                            
    √ resetting PLC (13 ms)                                                  
    √ checking that reset was succesful (10 ms)                              
    √ checking that PLC is not running (13 ms)                               
    √ setting IsReset to false (8 ms)                                        
    √ starting PLC (10 ms)                                                   
    √ checking that test PLC project is running (503 ms)                     
  testing PLC runtime stop, start, restart                                   
    √ stopping PLC (10 ms)                                                   
    √ starting PLC (9 ms)                                                    
    √ restarting PLC (526 ms)                                                
  system state, PLC runtime states and device information                    
    √ reading twinCAT system state (7 ms)                                    
    √ reading PLC runtime (port 851) state (4 ms)                            
    √ reading PLC runtime (port 852) state (5 ms)                            
    √ reading PLC runtime device info (7 ms)                                 
    √ reading TwinCAT system device info (7 ms)                              
  symbols and data types                                                     
    √ reading upload info (3 ms)                                             
    √ reading all symbol information (22 ms)                                 
    √ reading single symbol information (2 ms)                               
    √ reading all data type information (25 ms)                              
    √ reading single data type information (6 ms)                            
  reading values                                                             
    reading standard values                                                  
      √ reading BOOL (17 ms)                                                 
      √ reading BYTE (8 ms)                                                  
      √ reading WORD (10 ms)                                                 
      √ reading DWORD (8 ms)                                                 
      √ reading SINT (15 ms)                                                 
      √ reading USINT (8 ms)                                                 
      √ reading INT (15 ms)                                                  
      √ reading UINT (7 ms)                                                  
      √ reading DINT (13 ms)                                                 
      √ reading UDINT (9 ms)                                                 
      √ reading REAL (33 ms)                                                 
      √ reading STRING (18 ms)                                               
      √ reading DATE (6 ms)                                                  
      √ reading DT (17 ms)                                                   
      √ reading TOD (18 ms)                                                  
      √ reading TIME (9 ms)                                                  
      √ reading LWORD (13 ms)                                                
      √ reading LINT (20 ms)                                                 
      √ reading ULINT (12 ms)                                                
      √ reading LREAL (31 ms)                                                
      √ reading WSTRING (19 ms)                                              
      × reading LDATE (TODO)                                                 
      × reading LDT (TODO)                                                   
      × reading LTOD (TODO)                                                  
      √ reading LTIME (5 ms)                                                 
    reading standard array values                                            
      √ reading ARRAY OF BOOL (14 ms)                                        
      √ reading ARRAY OF BYTE (8 ms)                                         
      √ reading ARRAY OF WORD (9 ms)                                         
      √ reading ARRAY OF DWORD (9 ms)                                        
      √ reading ARRAY OF SINT (18 ms)                                        
      √ reading ARRAY OF USINT (9 ms)                                        
      √ reading ARRAY OF INT (18 ms)                                         
      √ reading ARRAY OF UINT (9 ms)                                         
      √ reading ARRAY OF DINT (18 ms)                                        
      √ reading ARRAY OF UDINT (9 ms)                                        
      √ reading ARRAY OF REAL (33 ms)                                        
      √ reading ARRAY OF STRING (16 ms)                                      
      √ reading ARRAY OF DATE (10 ms)                                        
      √ reading ARRAY OF DT (17 ms)                                          
      √ reading ARRAY OF TOD (17 ms)                                         
      √ reading ARRAY OF TIME (20 ms)                                        
      √ reading ARRAY OF LWORD (8 ms)                                        
      √ reading ARRAY OF LINT (16 ms)                                        
      √ reading ARRAY OF ULINT (9 ms)                                        
      √ reading ARRAY OF LREAL (29 ms)                                       
      √ reading ARRAY OF WSTRING (15 ms)                                     
      × reading ARRAY OF LDATE (TODO)                                        
      × reading ARRAY OF LDT (TODO)                                          
      × reading ARRAY OF LTOD (TODO) (1 ms)                                  
      √ reading ARRAY OF LTIME (9 ms)                                        
    reading complex values                                                   
      √ reading STRUCT (20 ms)                                               
      √ reading ALIAS (9 ms)                                                 
      √ reading ENUM (48 ms)                                                 
      √ reading POINTER (11 ms)                                              
      √ reading REFERENCE (----TODO----) (1 ms)                              
      √ reading SUBRANGE (7 ms)                                              
      √ reading UNION (23 ms)                                                
      √ reading FUNCTION_BLOCK (34 ms)                                       
      √ reading INTERFACE (7 ms)                                             
    reading complex array values                                             
      √ reading ARRAY OF STRUCT (18 ms)                                      
      √ reading ARRAY OF ALIAS (10 ms)                                       
      √ reading ARRAY OF ENUM (38 ms)                                        
      √ reading ARRAY OF POINTER (7 ms)                                      
      √ reading ARRAY OF SUBRANGE (11 ms)                                    
      √ reading ARRAY OF UNION (11 ms)                                       
      √ reading ARRAY OF FUNCTION_BLOCK (36 ms)                              
      √ reading ARRAY OF INTERFACE (9 ms)                                    
    reading special types / cases                                            
      √ reading ARRAY with negative index (8 ms)                             
      √ reading multi-dimensional ARRAY (9 ms)                               
      √ reading ARRAY OF ARRAY (9 ms)                                        
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (10 ms)   
      √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (8 ms)    
      √ reading an empty FUNCTION_BLOCK (7 ms)                               
      √ reading an empty STRUCT (10 ms)                                      
      √ reading an empty ARRAY (8 ms)                                        
    reading dereferenced POINTER and REFERENCE values                        
      √ reading POINTER (10 ms)                                              
      √ reading REFERENCE (12 ms)                                            
    reading using variable handles                                           
      × TODO                                                                 
    reading raw data                                                         
      × TODO (1 ms)                                                          
  writing values                                                             
    writing standard values                                                  
      √ writing BOOL (25 ms)                                                 
      √ writing BYTE (13 ms)                                                 
      √ writing WORD (12 ms)                                                 
      √ writing DWORD (15 ms)                                                
      √ writing SINT (26 ms)                                                 
      √ writing USINT (15 ms)                                                
      √ writing INT (27 ms)                                                  
      √ writing UINT (11 ms)                                                 
      √ writing DINT (28 ms)                                                 
      √ writing UDINT (11 ms)                                                
      √ writing REAL (39 ms)                                                 
      √ writing STRING (24 ms)                                               
      √ writing DATE (10 ms)                                                 
      √ writing DT (22 ms)                                                   
      √ writing TOD (23 ms)                                                  
      √ writing TIME (12 ms)                                                 
      √ writing LWORD (12 ms)                                                
      √ writing LINT (24 ms)                                                 
      √ writing ULINT (12 ms)                                                
      √ writing LREAL (42 ms)                                                
      √ writing WSTRING (20 ms)                                              
      × writing LDATE (TODO) (1 ms)                                          
      × writing LDT (TODO)                                                   
      × writing LTOD (TODO)                                                  
      √ writing LTIME (11 ms)                                                
    writing standard array values                                            
      √ writing ARRAY OF BOOL (22 ms)                                        
      √ writing ARRAY OF BYTE (10 ms)                                        
      √ writing ARRAY OF WORD (12 ms)                                        
      √ writing ARRAY OF DWORD (13 ms)                                       
      √ writing ARRAY OF SINT (25 ms)                                        
      √ writing ARRAY OF USINT (13 ms)                                       
      √ writing ARRAY OF INT (20 ms)                                         
      √ writing ARRAY OF UINT (12 ms)                                        
      √ writing ARRAY OF DINT (23 ms)                                        
      √ writing ARRAY OF UDINT (14 ms)                                       
      √ writing ARRAY OF REAL (42 ms)                                        
      √ writing ARRAY OF STRING (22 ms)                                      
      √ writing ARRAY OF DATE (12 ms)                                        
      √ writing ARRAY OF DT (24 ms)                                          
      √ writing ARRAY OF TOD (24 ms)                                         
      √ writing ARRAY OF TIME (12 ms)                                        
      √ writing ARRAY OF LWORD (13 ms)                                       
      √ writing ARRAY OF LINT (22 ms)                                        
      √ writing ARRAY OF ULINT (13 ms)                                       
      √ writing ARRAY OF LREAL (55 ms)                                       
      √ writing ARRAY OF WSTRING (24 ms)                                     
      × writing ARRAY OF LDATE (TODO) (1 ms)                                 
      × writing ARRAY OF LDT (TODO)                                          
      × writing ARRAY OF LTOD (TODO)                                         
      √ writing ARRAY OF LTIME (12 ms)                                       
    writing complex values                                                   
      √ writing STRUCT (27 ms)                                               
      √ writing ALIAS (11 ms)                                                
      √ writing ENUM (53 ms)                                                 
      √ writing POINTER (14 ms)                                              
      √ writing REFERENCE (----TODO----) (1 ms)                              
      √ writing SUBRANGE (14 ms)                                             
      √ writing UNION (46 ms)                                                
      √ writing FUNCTION_BLOCK (51 ms)                                       
      √ writing INTERFACE (14 ms)                                            
    writing complex array values                                             
      √ writing ARRAY OF STRUCT (33 ms)                                      
      √ writing ARRAY OF ALIAS (10 ms)                                       
      √ writing ARRAY OF ENUM (43 ms)                                        
      √ writing ARRAY OF POINTER (16 ms)                                     
      √ writing ARRAY OF SUBRANGE (12 ms)                                    
      √ writing ARRAY OF UNION (19 ms)                                       
      √ writing ARRAY OF FUNCTION_BLOCK (58 ms)                              
      √ writing ARRAY OF INTERFACE (15 ms)                                   
    writing special types / cases                                            
      √ writing ARRAY with negative index (17 ms)                            
      √ writing multi-dimensional ARRAY (15 ms)                              
      √ writing ARRAY OF ARRAY (17 ms)                                       
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '1'} (17 ms)   
      √ writing STRUCT with pragma: {attribute 'pack_mode' := '8'} (17 ms)   
      √ writing an empty FUNCTION_BLOCK (7 ms)                               
      √ writing an empty STRUCT (9 ms)                                       
    writing dereferenced POINTER and REFERENCE values                        
      × writing POINTER - TODO (1 ms)                                        
      × writing REFERENCE - TODO                                             
    writing raw data                                                         
      × TODO                                                                 
    writing using variable handles
      × TODO (1 ms)                                                          
  subscriptions (ADS notifications)                                          
    × TODO (1 ms)                                                            
  finalizing                                                                 
    √ disconnecting (2 ms) 
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
