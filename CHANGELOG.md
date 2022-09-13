# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.14.1] - 13.09.2022
### Changed
- Bug fix: Connecting to local router failed with ECONNREFUSED error on Node.js version 17 and newer
  - See [https://github.com/nodejs/node/issues/40702](https://github.com/nodejs/node/issues/40702)
  - Fixed by using `127.0.0.1` instead of `localhost`


## [1.14.0] - 23.07.2022
### Added
- Created end-to-end testing for the library using Jest
  - Separate PLC project required for testing: https://github.com/jisotalo/ads-client-test-plc-project
  - Test is started using command `npm test`
  - First version tests
    - Connecting
    - Reading
    - Writing
    - RPC methods

### Changed
- Bug fix: Value converted to Javascript variable incorrectly in some edge cases [See issue #94](https://github.com/jisotalo/ads-client/issues/94)

## [1.13.2] - 17.05.2022
### Changed
- Bug fix: Incorrect parsing of ARRAY OF ARRAY, now works as should [See issue #91](https://github.com/jisotalo/ads-client/issues/91)
- Added settings descriptions to README

## [1.13.1] - 04.04.2022
### Changed
- Bug fix: Undefined variable `message` [See issue #89](https://github.com/jisotalo/ads-client/issues/89)
- Updated ADS error codes with new ones [See issue #88](https://github.com/jisotalo/ads-client/issues/88)
- Updated README

## [1.13.0] - 27.02.2022
### Added
- Added new setting `bareClient`. If it's set, the client will only connect to the target, nothing else
  - No system manager, symbol version, device info and upload info are read
  - Can be used to connect to non-PLC systems such as [ads-server](https://github.com/jisotalo/ads-server) targets and other ADS supported devices
  - Only requirement is that ADS route is available

### Changed
- Updated README

## [1.12.2] - 12.02.2022
### Changed
- Bug fix: `TOD` data type was not regonized on TwinCAT 2 and TwinCAT 3 (TC3 builds <= 4020)
  - [See issue #83](https://github.com/jisotalo/ads-client/issues/83)

## [1.12.1] - 17.01.2022
### Changed
- Updated dependecies to latest versions 
  - ([See issue #80](https://github.com/jisotalo/ads-client/issues/80))
- Updated `toString()` methods from `ads-client-ads.js` (problem with undefined variable)

## [1.12.0] - 28.12.2021
### Changed
- Improving handling of connection losses ([See pull request #78](https://github.com/jisotalo/ads-client/pull/78))
  - Thank you [Hopperpop](https://github.com/Hopperpop) for contribution!
  - Re-design of connection, reconnection and disconnection system
  - Re-design of automatic reconnection
- Calling `reconnect()` now automatically re-subscribes all existing subscriptions

## [1.11.4] - 17.10.2021
### Added
- Added optional `targetAdsPort` parameter to basic raw read and write methods. ([Pull request #79](https://github.com/jisotalo/ads-client/pull/79))
  - Thank you [Hopperpop](https://github.com/Hopperpop) for contribution!

## [1.11.3] - 08.08.2021
### Changed
- Minor bug fix for unhandled exception ([node-red-contrib-ads-client, issue #12](https://github.com/jisotalo/node-red-contrib-ads-client/issues/12#issuecomment-894711952))

## [1.11.2] - 01.08.2021
### Changed
- Mainly minor bug fixes / adjustments that have been found during Node-RED development
  - Updated operation during sudden disconnect (preventing multiple simultaneous reconnects)
  - Added timeout timer to port registering and unregistering to fix some edge cases
  - Bug fix: Sometimes unhandled exception was thrown during disconnect

## [1.11.1] - 10.07.2021
### Changed
- Tried to fix edge cases where unhandled exception was thrown ([node-red-contrib-ads-client, issue #13](https://github.com/jisotalo/node-red-contrib-ads-client/issues/13))
  - Example: When PLC was restarted (config mode) multiple times, sometimes an exception was thrown
- Improved operation during connection faults
- Fixed typos ([See issue #71](https://github.com/jisotalo/ads-client/issues/71))
  - `byteArrayToAmsNedIdStr` --> `byteArrayToAmsNetIdStr`
  - `amsNedIdStrToByteArray `--> `amsNetIdStrToByteArray`

## [1.11.0] - 29.06.2021
### Added
- Added public access to a method `sendAdsCommand()` for sending raw ADS commands
- Added public access to two helper methods `byteArrayToAmsNedIdStr()` and `amsNedIdStrToByteArray()`

## [1.10.7] - 27.06.2021
### Changed
- Bug fix: `connection.connected` flag was staying `true` if connection failed during initial connecting. ([See pull request #67](https://github.com/jisotalo/ads-client/pull/67))
- Bug fix: Set `connection.connected` only after successful ADS port register

## [1.10.6] - 24.06.2021
### Changed
- Bug fix: Added try..catch blocks around _socketWrite calls. In some situations caused uncaught exception problems. ([See issue #63](https://github.com/jisotalo/ads-client/issues/63))
- Bug fix: Better exception handling to `disconnect()`

## [1.10.5] - 30.05.2021
### Changed
- Optimized data type parsing to be a little faster ([See issue #57](https://github.com/jisotalo/ads-client/issues/57))
- Bug fix: Array information startIndex is unsigned when it should be signed ([See issue #59](https://github.com/jisotalo/ads-client/issues/59))
- Bug fix: Uncaught socket expression during connect ([See issue #63](https://github.com/jisotalo/ads-client/issues/63))
- Updated npm packages
  - Two vulnerabilities in some devDependencies (not used in production)
- Updated README
  - Added information about Node-RED package ([node-red-contrib-ads-client](https://www.npmjs.com/package/node-red-contrib-ads-client))

## [1.10.4] - 11.04.2021
### Changed
- Bug fix: Converting array data from raw Buffer failed ([See issue #53](https://github.com/jisotalo/ads-client/issues/53))
- Updated README
  - Updated FAQ
  - Added guide how to read POINTERs

## [1.10.3] - 09.02.2021
### Changed
- Bug fix: Reading 16-bit unsigned value (UINT, WORD) was faulty converted to a 16-bit signed value

## [1.10.2] - 06.12.2020
### Changed
- Bug fix: Duplicate key for ADS_RESERVERD_PORTS ([See issue #49](https://github.com/jisotalo/ads-client/issues/49))
- Bug fix: Reconnection timer handle was saved in a wrong variable
- Bug fix: `WriteControl` wrote values as 32 bit instead of 16 bit
- Updating README

## [1.10.1] - 25.07.2020
### Changed
- Dependecy updated by dependabot[bot] <support@github.com>
  - Bumps [lodash](https://github.com/lodash/lodash) from 4.17.15 to 4.17.19.
    - [Release notes](https://github.com/lodash/lodash/releases)
    - [Commits](lodash/lodash@4.17.15...4.17.19)


## [1.10.0] - 09.07.2020
### Added
- Added new methods `createVariableHandleMulti()` and `deleteVariableHandleMulti()`
- Client class now implements EventEmitter class -> added new events that can be listened
  - `Client.on('connectionLost')`
  - `Client.on('symbolVersionChange', symbolVersion)`
  - `Client.on('systemManagerStateChange', state)`
  - `Client.on('routerStateChange', state)`
  - `Client.on('plcRuntimeStateChange', state)`
  - `Client.on('ads-client-error', err)`
  - `Client.on('connect', connectionInfo)`
  - `Client.on('disconnect')`
  - `Client.on('reconnect)`

### Changed
- If not connected when calling any method, an error is thrown 

## [1.9.0] - 05.07.2020
### Added
- TwinCAT 2 support!
- TwinCAT 3 support for older versions than 4022!

### Changed
- Symbol info (`symbol`) is returned in addition to the data type (`type`) and value in `readSymbol()` and similar
- Device info is read when connected

## [1.8.0] - 02.07.2020
### Added
- New method `invokeRpcMethod()`
  - Call any function block METHOD from Node.js (requires pragma `{attribute 'TcRpcEnable'}` to object definition)
  - Input parameters (VAR_INPUT) can be provided as Javascript objects
  - Method return value is returned as Javascript object
  - Method outputs (VAR_OUTPUT) are also returned as Javascript objects
- Support for `UNION` data type confirmed

## [1.7.1] - 24.06.2020
### Changed
- Fixed `readAndCacheSymbols()` or `getSymbolInfo()` to return more information about symbol (attributes, array data)

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
