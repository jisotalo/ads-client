# ads-client migration

This file contains detailed migration guide from migrating from ads-client major versions.

## From version 1.x.x to 2.x.x

### Required
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
* `readSystemManagerState()`
  * Renamed to `readTcSystemState()`
* `metaData.systemManagerState` renamed to `metaData.tcSystemState`
* `getEmptyPlcType()` -> `getDefaultPlcObject()`
### Optional  
* Remove `disableBigInt` from settings 
