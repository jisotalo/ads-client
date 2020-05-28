# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 28.05.2020
### Added
- Support for multi-dimensional arrays of any type
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

## Changed
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
