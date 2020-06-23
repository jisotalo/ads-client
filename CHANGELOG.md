# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 23.06.2020
### Added
- New method `readWriteRaw()`
  - Wrapper for ADS ReadWrite command ([Issue #34](https://github.com/jisotalo/ads-client/issues/34))
- New setting `disableBigInt` (default: false)
  - If true, 64 bit integer PLC variables are kept as Buffer objects instead of converting to Javascript BigInt variables 
  - JSON.strigify and libraries that use it have no BigInt support (like express json(), socket.io emit() etc.)

### Updated
- `subscribe()` now reads and caches the data type before subscribing -> better operation with large data and fast cycle time
- Added more fault checks to ADS notification related operations


## [1.6.0] - 22.06.2020
### Added
- Automatic support for all kinds of byte alignments ([See issue #13](https://github.com/jisotalo/ads-client/issues/13))
  - Pragma `{attribute 'pack_mode' := '1'}` above STRUCT is no more needed 
  - Reading any TwinCAT variable without changes is now possible

### Changed
- `readAndCacheDataTypes()`: Changed ADS data type variables (`dataType`, `dataTypeStr`) to `adsDataType` and `adsDataTypeStr` ([See issue #36](https://github.com/jisotalo/ads-client/issues/36))
  - Now all PLC data type objects have the same object layout
- Bug fix: Fixed bug that caused reading a `ULINT` to fail
- Changed default `subscribe()` cycle time from 250 ms to 10 ms 
    - Usually a notification is wanted always when the value chages
    - The default TwinCAT 3 cycle time is 10 ms
    - User can always provide different cycle time if required, but usually it just tries the default value -> less "bug" reports about variable notifications missing
    
## [1.5.1] - 08.06.2020
### Changed
- Fixed a bug that caused reading multi-dimensional arrays to fail if they are part of a struct and not the last struct element ([See issue #10 comment](https://github.com/jisotalo/ads-client/issues/10#issuecomment-640470603))

## [1.5.0] - 30.05.2020
### Added
- `WriteControl()` method for connecting device states using ADS WriteControl command
- Support for WriteControl ADS command response
- Methods for controlling PLC runtime
  - `startPlc`
  - `stopPlc`
  - `restartPlc`
- Methods for controlling TwinCAT system
  - `setSystemManagerToRun`
  - `setSystemManagerToConfig`
  -  `restartSystemManager`
### Changed
- `readPlcRuntimeState` now accepts target ADS port as optional parameter
## [1.4.0] - 28.05.2020
### Added
- Support for multi-dimensional arrays of any type (issue #10)
- **Ready for production milestone reached!**

### Changed
- README updated
## [1.3.0] - 24.05.2020
### Added
- Multi read and write methods
  - `readRawMulti` and `writeRawMulti`
- Method for converting raw byte data to Javascript object
  - `convertFromRaw`
- Method for converting Javascript object to raw byte data
  - `convertToRaw`
- Method for generating an empty Javascript object of a data type
  - `getEmptyPlcType`

### Changed
- Fixed a problem that JSDoc documentation header links were not working
- Added DT to base data types
- `deleteVariableHandle` accepts handle object as parameter 
- `_readDataTypeInfo` bug fix with pseudo types
- README updated
  - New raw read/write explained
  - Updated guides for different setups




## [1.2.0] - 16.05.2020
### Added
- Automatic reconnection
  - If connection is lost, the ads-client tries to reconnect automatically
  - When/if connection is resumed, all previously active subscriptions are reinitialized/continued
  - Will be optimized in future updates as well
  - Works in all cases:
    - Connected to localhost directly
    - Connected to remote through local router 
    - Connected to remote through remote router (directly)
  - New setting added relating this:
    - `autoReconnect`, `reconnectInterval`, `checkStateInterval`, `connectionDownDelay`
- System manager state is polled intervally (used for connection checking)
  - Latest state always in client.metaData.systemManagerState
- New method `setDebugging` for setting debug modes

### Changed
- connect(): Connecting now fails if remote PLC runtime is not found. This can be disabled with setting `allowHalfOpen` 
- Bug fix: `localhost` as target AMS net id works


## [1.1.2] - 23.04.2020
### Changed
- Changed all string encoding/decoding from ascii to cp1252
- Added trim() to few variable name parameters and similar

## [1.1.1] - 20.04.2020
### Changed
- Updated README.md

## [1.1.0] - 16.04.2020
### Added
- Support for pseudo data types (like PVOID, XINT, UXINT etc.)
- Reserved ADS ports to ads-client-ads.js

### Changed
- writeSymbol is now case-insensitive (as the PLC system is)
- Fixed bug: Changed iconv-encode unicode to ucs2 at WSTRING
- Fixed bug: Better suppor for arrays when using `autoFill = true` parameter
- Updated README.md



## [1.0.3] - 13.04.2020 (2)
### Changed
- README.md continued. Now includes some examples, still lots of work to do.

## [1.0.2] - 13.04.2020
### Added
- CHANGELOG.md

### Changed
- Bug fix to `_parseJsVariableToPlc` that caused writeSymbol() fail
