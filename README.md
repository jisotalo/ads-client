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

`npm test` results - updated 23.04.2024

```
  √ IMPORTANT NOTE: This test requires running a specific PLC project locally (https://github.com/jisotalo/ads-client-test-plc-project) (1 ms)
  connection
    √ client is not connected at beginning (1 ms)            
    √ checking ads client settings (2 ms)                    
    √ connecting to target (50 ms)                           
    √ checking that test PLC project is active (16 ms)       
    √ checking that test PLC project version is correct (16 ms)                                                           
  resetting PLC to original state
    √ resetting PLC (12 ms)                                  
    √ checking that reset was succesful (11 ms)              
    √ checking that PLC is not running (11 ms)               
    √ setting IsReset to false (6 ms)                        
    √ starting PLC (10 ms)                                   
    √ checking that test PLC project is running (506 ms)     
  testing PLC runtime stop, start, restart                   
    √ stopping PLC (19 ms)                                   
    √ starting PLC (17 ms)                                   
    √ restarting PLC (538 ms)                                
  system state, PLC runtime states and device information    
    √ reading twinCAT system state (7 ms)                    
    √ reading PLC runtime (port 851) state (7 ms)            
    √ reading PLC runtime (port 852) state (6 ms)            
    √ reading PLC runtime device info (8 ms)                 
    √ reading TwinCAT system device info (7 ms)              
  symbols and data types                                     
    √ reading upload info (5 ms)                             
    √ reading all symbol information (27 ms)                 
    √ reading single symbol information (2 ms)               
    √ reading all data type information (25 ms)              
    √ reading single data type information (5 ms)            
  reading values using readSymbol()                          
    √ reading INT (5 ms)                                     
    √ reading STRING (4 ms)                                  
    √ reading STRUCT (5 ms)                                  
    √ reading TIME_OF_DAY (5 ms)                             
    √ reading ENUM (object) (102 ms)                         
    √ reading ENUM (number) (6 ms)                           
    √ reading UNION value (STRING) (4 ms)                    
    √ reading UNION value (REAL) (4 ms)                      
    √ reading ARRAY [0..4] OF INT (4 ms)                     
    √ reading ARRAY [0..4] OF STRUCT (5 ms)                  
    √ reading ARRAY[-100..100] OF LREAL (6 ms)               
    √ reading ARRAY[1..3, 1..2] OF BYTE (5 ms)               
    √ reading ARRAY[1..3] OF ARRAY[1..2] OF SINT (5 ms)      
    √ reading FUNCTION_BLOCK (TON) (5 ms)                    
    √ reading FUNCTION_BLOCK (TC2_System.FB_CreateDir) (5 ms)
    √ reading FUNCTION_BLOCK (Tc2_DataExchange.FB_ReadAdsSymByName) (20 ms)                                               
    √ reading POINTER (5 ms)
    √ reading REFERENCE (5 ms)                               
    √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (6 ms)                                                   
    √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (6 ms)                                                   
  reading values using readRaw() and converting to objects using convertFromRaw()                                         
    √ reading INT (4 ms)
    √ reading STRING (5 ms)                                  
    √ reading STRUCT (4 ms)                                  
    √ --> TODO: add same as in readSymbol()? <--             
    √ reading STRUCT with pragma: {attribute 'pack_mode' := '1'} (7 ms)                                                   
    √ reading STRUCT with pragma: {attribute 'pack_mode' := '8'} (4 ms)                                                   
  writing values using writeRaw()
    √ writing INT                                            
  finalizing                                                 
    √ disconnecting (3 ms)     
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
