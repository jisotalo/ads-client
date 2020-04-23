# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


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
