# ads-client migration

This file contains detailed migration guide from migrating from ads-client major versions.

## From version 1.x.x to 2.x.x

### Required
* `subscribe()`
  * Change old `subscribe()` calls to use new parameter format
  * New default cycleTime is 200 ms instead of 10 ms (similar to Bechoff's .NET library)
* `subscribeRaw()` -> use `subscribe()` instead
* `readSymbol()`
  * Result object `symbol` -> `symbolInfo`
* `readRaw()`
  * Target setting parameters changed to new `targetOpts` format. Check if old format used.
* `writeRaw()`
  * Target setting parameters changed to new `targetOpts` format. Check if old format used.
* `writeRawMulti()`
  * Target setting parameters changed to new `targetOpts` format. Check if old format used.
* `restartPlc()`: 
  * Now resets and also starts the PLC, as name has always implied
  * If used and PLC **should not start** after calling this, change to `resetPlc()` 
  * Target setting parameters changed to new `targetOpts` format. Check if old format used.
* `startPlc()`
  * Target setting parameters changed to new `targetOpts` format. Check if old format used.
* `stopPlc()`
  * Target setting parameters changed to new `targetOpts` format. Check if old format used.
* `writeControl()`
  * Parameters and their order changed
  * Target setting parameters changed to new `targetOpts` format. Check if old format used.
* `readSystemManagerState()` -> `readTcSystemState()`
* `metaData.systemManagerState` -> `metaData.tcSystemState`
* `getEmptyPlcType()` -> `getDefaultPlcObject()`
* `readAndCacheSymbols()` -> `cacheSymbolInfos()` and `getSymbolInfos()`
* `readAndCacheDataTypes()` -> `cacheDataTypes()` and `getDataTypes()`
* `setSystemManagerToRun()` -> `setTcSystemToRun()`
* `setSystemManagerToConfig()` -> `setTcSystemToConfig()`
* `restartSystemManager()` -> `restartTcSystem()`
* `readSymbolVersion()` -> `readPlcSymbolVersion()`
* `readRawByName()` -> `readRawByPath()`
*  `settings.checkStateInterval` -> `settings.connectionCheckInterval`  
* `metaData.symbolVersion` -> `metaData.plcSymbolVersion`
* `readRawMulti()` return value changed
* Setting `disableSymbolVersionMonitoring` -> `monitorPlcSymbolVersion`
* Events
  * `systemManagerStateChange` -> `tcSystemStateChange` and payload value changed to AdsState object instead of state number
  * `symbolVersionChange` -> `plcSymbolVersionChange`
### Optional  
* Remove `disableBigInt` from settings 
