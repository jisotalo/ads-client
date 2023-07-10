# ads-client migration

This file contains detailed migration guide from migrating from ads-client major versions.

## From version 1.x.x to 2.x.x

### Required
* If any of the following methods have specific `targetAmsNetId` or `targetAdsPort` provided as parameter, change it to use new `targetOpts` object instead
  * `readRaw`, `writeRaw`, `writeRawMulti`, 

### Optional  
* Remove `disableBigInt` from settings 
