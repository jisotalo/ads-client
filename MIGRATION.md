# ads-client migration

This document contains breaking changes between ads-client major versions.

## 1.x.x → 2.x.x

### Typescript types

ads-client is now natively Typescript. Please remove the type definition package, if installed:

```
npm remove @types/ads-client
```

### Client general
<table>
  <thead>
    <tr>
      <th>
      </th>
      <th>
        Changes
      </th>
      <th>
        Action
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td valign="top">
        <code>settings</code>
      </td>
      <td valign="top">
        <ul>
          <li><code>checkStateInterval</code> renamed to <code>connectionCheckInterval</code></li>
          <li><code>disableSymbolVersionMonitoring</code> renamed to <code>monitorPlcSymbolVersion</code> (and operation inverted)</li>
          <li><code>bareClient</code> renamed to <code>rawClient</code></li>
          <li><code>disableBigInt</code> removed</li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Check if renamed settings were used and rename them</li>
          <ul>
            <li>E.g. <code>const client = new Client({bareClient: true, ...})</code> <br> -> <br> <code>const client = new Client({rawClient: true, ...})</code></li>
          </ul>
          <li>Check if removed settings were used and remove them</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>metaData</code>
      </td>
      <td valign="top">
        <ul>
          <li><code>systemManagerState</code> renamed to <code>tcSystemState</code></li>
          <li><code>symbolVersion</code> renamed to <code>plcSymbolVersion</code></li>
          <li><code>uploadInfo</code> renamed to <code>plcUploadInfo</code></li>
          <li><code>allSymbolsCached</code> renamed to <code>allPlcSymbolsCached</code></li>
          <li><code>symbols</code> renamed to <code>plcSymbols</code></li>
          <li><code>allDataTypesCached</code> renamed to <code>allPlcDataTypesCached</code></li>
          <li><code>dataTypes</code> renamed to <code>plcDataTypes</code></li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Check if renamed metadata properties were used and rename them</li>
          <ul>
            <li>E.g. <code>client.metaData.symbolVersion</code> <br> -> <br> <code>client.metaData.plcSymbolVersion</code></li>
          </ul>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        Errors
      </td>
      <td valign="top">
        <ul>
          <li>Error object <code>ClientException</code> renamed to <code>ClientError</code></li>
          <li>Properties changed</li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Change all usages of <code>ClientException</code> to <code>ClientError</code></li>
          <li>Check that old properties of the error object are not used and change to use new properties (<code>{adsError, stack}</code>)</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        Events
      </td>
      <td valign="top">
        <ul>
          <li><code>systemManagerStateChange</code> event renamed to <code>tcSystemStateChange</code></li>
          <li><code>symbolVersionChange</code> event renamed to <code>plcSymbolVersionChange</code></li>
          <li><code>ads-client-error</code> renamed to <code>client-error</code></li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Check if renamed events were used and rename them</li>
          <ul>
            <li>E.g. <code>.on('systemManagerStateChange', ...)</code> <br> -> <br> <code>.on('tcSystemStateChange', ...)</code></li>
          </ul>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        Subscription callback
      </td>
      <td valign="top">
        <ul>
          <li>Callback <code>data</code> parameter property <code>timeStamp</code> renamed to <code>timestamp</code></li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Check if <code>data.timeStamp</code> was used in subscription callback and rename it</li>
          <ul>
            <li>E.g. <code>console.log(`${data.timeStamp}: Value changed to ${data.value}`)</code> <br> -> <br><code>console.log(`${data.timestamp}: Value changed to ${data.value}`)</code></li>
          </ul>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        Symbol object (e.g. from <code>getSymbol()</code>)
      </td>
      <td valign="top">
        <ul>
          <li>Properties removed: <code>nameLength, typeLength, commentLength, attributeCount</code></li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Check if renamed properties were used and rename them</li>
          <li>Check if removed properties were used and remove them</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        Data type object (e.g. from <code>getDataType()</code>)
      </td>
      <td valign="top">
        <ul>
          <li>Properties removed: <code>nameLength, typeLength, commentLength, subItemCount, attributeCount</code></li>
          <li>Property <code>enumInfo</code> renamed to <code>enumInfos</code></li>
          <li>Property <code>arrayData</code> renamed to <code>arrayInfos</code></li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Check if renamed properties were used and rename them</li>
          <li>Check if removed properties were used and remove them</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        Conversion of <code>ENUM</code> values
      </td>
      <td valign="top">
        <ul>
          <li>If <code>ENUM</code> value has no corresponding string value, it's set to empty string instead of <code>null</code></li>
          <ul>
            <li>E.g. <code>{name: null, value: 123}</code> <br> -> <br><code>{name: '', value: 123}</code></li>
          </ul>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Check if <code>ENUM</code> value name was checked for null and change to check for empty string instead</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>


### Client methods

<table>
  <thead>
    <tr>
      <th>
      </th>
      <th>
        Changes
      </th>
      <th>
        Action
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td valign="top">
        <code>setDebugging()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Renamed to <code>setDebugLevel()</code></li>
          <li>Debug levels changed: 0,1,2,3 instead of 0,1,2,3,4</li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Rename all <code>setDebugging()</code> calls to <code>setDebugLevel()</code></li>
          <li>Change all debug levels of 1 to 0</li>
          <li>Change all debug levels of 2 to 1</li>
          <li>Change all debug levels of 3 to 2</li>
          <li>Change all debug levels of 4 to 3</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>subscribe()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Renamed to <code>subscribeValue()</code></li>
          <li>Default cycle time changed 10ms -> 200ms (as in <a href="https://www.nuget.org/packages/Beckhoff.TwinCAT.Ads">Beckhoff.TwinCAT.Ads</a>)</li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Rename all <code>subscribe()</code> calls to <code>subscribeValue()</code></li>
          <li>Check if default cycle time was used and set <code>cycleTime</code> it if needed</li>
        </ul>
        NOTE: Consider using the new <code>subscribe()</code> instead
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>subscribeRaw()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Default cycle time changed 10ms -> 200ms (as in <a href="https://www.nuget.org/packages/Beckhoff.TwinCAT.Ads">Beckhoff.TwinCAT.Ads</a>)</li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Check if default cycle time was used and set <code>cycleTime</code> it if needed</li>
        </ul>
        NOTE: Consider using the new <code>subscribe()</code> instead
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>unsubscribe()</code>
      </td>
      <td valign="top">
        <ul>
          <li>No longer accepts a numeric handle value</li>
          <ul>
            <li>Reason: multiple targets are allowed, numeric handle values are no longer unique</li>
          </ul>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Check that all <code>client.unsubscribe()</code> calls use handle object as parameter instead of a numerical handle value</li>
          <ul>
            <li>If you always use return value of a subscription method, everything if fine</li>
            <li>E.g. <code>const { handle } = await client.subscribe(...); await client.unsubscribe(handle)</code> is OK!</li>
          </ul>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>readSymbol()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Renamed to <code>readValue()</code></li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Rename all <code>readSymbol()</code> calls to <code>readValue()</code></li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>readRaw()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Parameter <code>targetAdsPort</code> removed</li>
          <li>Parameter <code>targetOpts</code> added</li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>If target ADS port was overridden with <code>targetAdsPort</code>, change to use new <code>targetOpts</code> format instead</li>
          <ul>
            <li><code>readRaw(*, *, *, 852)</code> <br> -> <br> <code>readRaw(*, *, *, { adsPort: 852 })</code></li>
          </ul>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>writeSymbol()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Renamed to <code>writeValue()</code></li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Rename all <code>writeSymbol()</code> calls to <code>writeValue()</code></li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>writeRaw()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Parameter <code>targetAdsPort</code> removed</li>
          <li>Parameter <code>targetOpts</code> added</li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>If target ADS port was overridden with <code>targetAdsPort</code>, change to use new <code>targetOpts</code> format instead</li>
          <ul>
            <li><code>writeRaw(*, *, *, 852)</code> <br> -> <br> <code>writeRaw(*, *, *, { adsPort: 852 })</code></li>
          </ul>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>readRawMulti()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Return value type changed</li>
          <li>Parameter <code>targetAdsPort</code> removed</li>
          <li>Parameter <code>targetOpts</code> added</li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Change all <code>readRawMulti()</code> calls to use new return value type</li>
          <ul>
            <li><code>{success, errorInfo, target, data}[]</code> <br> -> <br><code>{success, command, value, error, errorCode, errorStr}[]</code></li>
            <li>Old <code>data</code> property is renamed to <code>value</code></li>
          </ul>
          <li>If target ADS port was overridden with <code>targetAdsPort</code>, change to use new <code>targetOpts</code> format instead</li>
          <ul>
            <li><code>readRawMulti(*, 852)</code> <br> -> <br> <code>readRawMulti(*, { adsPort: 852 })</code></li>
          </ul>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>writeRawMulti()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Return value type changed</li>
          <li>Parameter <code>targetAdsPort</code> removed</li>
          <li>Parameter <code>targetOpts</code> added</li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Change all <code>writeRawMulti()</code> calls to use new return value type</li>
          <ul>
            <li><code>{success, errorInfo, target}[]</code> <br> -> <br><code>{success, command, error, errorCode, errorStr}[]</code></li>
          </ul>
          <li>If target ADS port was overridden with <code>targetAdsPort</code>, change to use new <code>targetOpts</code> format instead</li>
          <ul>
            <li><code>writeRawMulti(*, 852)</code> <br> -> <br> <code>writeRawMulti(*, { adsPort: 852 })</code></li>
          </ul>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>restartPlc()</code><br>
        <code>startPlc()</code><br>
        <code>stopPlc()</code><br>
      </td>
      <td valign="top">
        <ul>
          <li>Parameter <code>adsPort</code> removed</li>
          <li>Parameter <code>targetOpts</code> added</li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>If target ADS port was overridden with <code>adsPort</code>, change to use new <code>targetOpts</code> format instead</li>
          <ul>
            <li>E.g. <code>restartPlc(852)</code> <br> -> <br> <code>restartPlc({ adsPort: 852 })</code></li>
          </ul>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>writeControl()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Parameter order has changed</li>
          <li><code>adsState</code> allows string value as well</li>
          <li>Parameter <code>adsPort</code> removed</li>
          <li>Parameter <code>targetOpts</code> added</li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Change parameter order and <code>adsPort</code> parameter to use new <code>targetOpts</code> format instead</li>
          <ul>
            <li>E.g. <code>writeControl(10000, 16, 0)</code> <br> -> <br> <code>writeControl(16, 0, undefined, { adsPort: 10000 })</code></li>
          </ul>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>getEmptyPlcType()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Renamed to <code>getDefaultPlcObject()</code></li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Rename all <code>getEmptyPlcType()</code> calls to <code>getDefaultPlcObject()</code></li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>getSymbolInfo()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Renamed to <code>getSymbols()</code></li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Rename all <code>getSymbolInfo()</code> calls to <code>getSymbols()</code></li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>readAndCacheSymbols()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Method removed</li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Use <code>cacheSymbols()</code> to cache all symbols</li>
          <li>Use <code>getSymbols()</code> to get all symbols</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>readAndCacheDataTypes()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Method removed</li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Use <code>cacheDataTypes()</code> to cache all data types</li>
          <li>Use <code>getDataTypes()</code> to get all data types</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>setSystemManagerToRun()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Renamed to <code>setTcSystemToRun()</code></li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Rename all <code>setSystemManagerToRun()</code> calls to <code>setTcSystemToRun()</code></li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>setSystemManagerToConfig()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Renamed to <code>setTcSystemToConfig()</code></li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Rename all <code>setSystemManagerToConfig()</code> calls to <code>setTcSystemToConfig()</code></li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>restartSystemManager()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Renamed to <code>restartTcSystem()</code></li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Rename all <code>restartSystemManager()</code> calls to <code>restartTcSystem()</code></li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>readSymbolVersion()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Renamed to <code>readPlcSymbolVersion()</code></li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Rename all <code>readSymbolVersion()</code> calls to <code>readPlcSymbolVersion()</code></li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>readUploadInfo()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Renamed to <code>readPlcUploadInfo()</code></li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Rename all <code>readUploadInfo()</code> calls to <code>readPlcUploadInfo()</code></li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>readRawByName()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Renamed to <code>readRawByPath()</code></li>
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Rename all <code>readRawByName()</code> calls to <code>readRawByPath()</code></li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>createVariableHandleMulti()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Return value type changed</li>
          <li>Return value property <code>handle</code> type changed from number to object
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Change all <code>createVariableHandleMulti()</code> calls to use new return value type</li>
          <ul>
            <li><code>{success, errorInfo, target, handle}[]</code> <br> -> <br><code>{success, path, handle, error, errorCode, errorStr}[]</code></li>
          </ul>
          <li>If returned <code>handle</code> property was used as a number, change it to use new returned <code>handle.handle</code></li>
        </ul>
      </td>
    </tr>
    <tr>
      <td valign="top">
        <code>deleteVariableHandleMulti()</code>
      </td>
      <td valign="top">
        <ul>
          <li>Return value type changed</li>
          <li>Return value property <code>handle</code> type changed from number to object
        </ul>
      </td>
      <td valign="top">
        <ul>
          <li>Change all <code>deleteVariableHandleMulti()</code> calls to use new return value type</li>
          <ul>
            <li><code>{success, errorInfo, target, handle}[]</code> <br> -> <br><code>{success, handle, error, errorCode, errorStr}[]</code></li>
          </ul>
          <li>If returned <code>handle</code> property was used as a number, change it to use new returned <code>handle.handle</code></li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>
