/*
Copyright (c) 2022 Jussi Isotalo <j.isotalo91@gmail.com>

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
*/

/**
 * PLC project version
 * This must match with GVL_AdsClientTests.VERSION
 */
const PLC_PROJECT_VERSION = '2.0.0';
const AMS_NET_ID = '192.168.4.1.1.1';

const { Client, ADS } = require('../dist/ads-client');
const util = require('util');
const {
  ST_STANDARD_TYPES,
  SYMBOL_INFO_OBJECT,
  DATA_TYPE_OBJECT,
  ST_STANDARD_ARRAY_TYPES,
  ST_STANDARD_TYPES_WRITE,
  ST_STANDARD_ARRAY_TYPES_WRITE,
  BLOCK_4
} = require("./ads-client-test-helper");

const client = new Client({
  targetAmsNetId: AMS_NET_ID,
  targetAdsPort: 851
});

const inspect = (data) => util.inspect(data, false, 9999, true);

const delay = (ms) => new Promise((resolve, reject) => {
  setTimeout(() => resolve(), ms);
});



test('IMPORTANT NOTE: This test requires running a specific PLC project locally (https://github.com/jisotalo/ads-client-test-plc-project)', () => { });

describe('connection', () => {

  test('client is not connected at beginning', () => {
    expect(client.connection.connected).toBe(false);
  });

  test('checking ads client settings', async () => {
    expect(client).toBeInstanceOf(Client);
    expect(client).toHaveProperty('settings');
    expect(client.settings.targetAmsNetId).toBe(AMS_NET_ID);
    expect(client.settings.targetAdsPort).toBe(851);
  });

  test('connecting to target', async () => {
    try {
      const res = await client.connect();

      expect(res).toHaveProperty('connected');
      expect(res.connected).toBe(true);

    } catch (err) {
      throw new Error(`connecting localhost failed (${err.message}`, err);
    }
  });

  test('checking that test PLC project is active', async () => {
    try {
      const res = await client.readSymbol('GVL_AdsClientTests.IsTestProject');
      expect(res).toHaveProperty('value');
      expect(res.value).toBe(true);

    } catch (err) {
      throw new Error('Failed to check for test PLC project - is correct PLC project active?');
    }
  });

  test('checking that test PLC project version is correct', async () => {
    const res = await client.readSymbol('GVL_AdsClientTests.VERSION');
    expect(res.value).toBe(PLC_PROJECT_VERSION);
  });
});

describe('resetting PLC to original state', () => {
  test('resetting PLC', async () => {
    await client.resetPlc();
  });

  test('checking that reset was successful', async () => {
    const res = await client.readSymbol('GVL_AdsClientTests.IsReset');
    expect(res.value).toBe(true);
  });

  test('checking that PLC is not running', async () => {
    const res = await client.readSymbol('GVL_AdsClientTests.IsRunning');
    expect(res.value).toBe(false);

    const state = await client.readPlcRuntimeState();
    expect(state.adsState).toBe(ADS.ADS_STATE.Stop);
  });

  test('setting IsReset to false', async () => {
    const res = await client.writeSymbol('GVL_AdsClientTests.IsReset', false);
  });

  test('starting PLC', async () => {
    await client.startPlc();
  });

  test('checking that test PLC project is running', async () => {
    //Some delay as PLC was just started
    await delay(500);
    const res = await client.readSymbol('GVL_AdsClientTests.IsRunning');
    expect(res.value).toBe(true);
  });
});

describe('testing PLC runtime stop, start, restart', () => {
  test('stopping PLC', async () => {
    let state = await client.readPlcRuntimeState();
    expect(state.adsState).toBe(ADS.ADS_STATE.Run);

    await client.stopPlc();

    state = await client.readPlcRuntimeState();
    expect(state.adsState).toBe(ADS.ADS_STATE.Stop);
  });

  test('starting PLC', async () => {
    let state = await client.readPlcRuntimeState();
    expect(state.adsState).toBe(ADS.ADS_STATE.Stop);

    await client.startPlc();

    state = await client.readPlcRuntimeState();
    expect(state.adsState).toBe(ADS.ADS_STATE.Run);
  });

  test('restarting PLC', async () => {
    let state = await client.readPlcRuntimeState();
    expect(state.adsState).toBe(ADS.ADS_STATE.Run);
    await client.writeSymbol('GVL_AdsClientTests.IsReset', false);

    await client.restartPlc();

    //Some delay as PLC was just started
    await delay(500);

    state = await client.readPlcRuntimeState();
    expect(state.adsState).toBe(ADS.ADS_STATE.Run);

    const res = await client.readSymbol('GVL_AdsClientTests.IsReset');
    expect(res.value).toBe(true);
  });
});

describe('system state, PLC runtime states and device information', () => {
  test('reading TwinCAT system state', async () => {
    const res = await client.readTcSystemState();
    expect(res).toHaveProperty('adsState');
    expect(res).toHaveProperty('adsStateStr');
    expect(res).toHaveProperty('deviceState');
    expect(res.adsState).toBe(ADS.ADS_STATE.Run);
  });

  test('reading PLC runtime (port 851) state', async () => {
    const res = await client.readPlcRuntimeState();
    expect(res).toHaveProperty('adsState');
    expect(res).toHaveProperty('adsStateStr');
    expect(res).toHaveProperty('deviceState');
  });

  test('reading PLC runtime (port 852) state', async () => {
    const res = await client.readPlcRuntimeState({ adsPort: 852 });
    expect(res).toHaveProperty('adsState');
    expect(res).toHaveProperty('adsStateStr');
    expect(res).toHaveProperty('deviceState');
  });

  test('reading PLC runtime device info', async () => {
    const res = await client.readDeviceInfo();

    //Note: checking only keys
    expect(Object.keys(res)).toStrictEqual(Object.keys({
      majorVersion: 0,
      minorVersion: 0,
      versionBuild: 0,
      deviceName: ''
    }));

    expect(res.deviceName).toBe('Plc30 App');
  });

  test('reading TwinCAT system device info', async () => {
    const res = await client.readDeviceInfo({ adsPort: 10000 });

    //Note: checking only keys
    expect(Object.keys(res)).toStrictEqual(Object.keys({
      majorVersion: 0,
      minorVersion: 0,
      versionBuild: 0,
      deviceName: ''
    }));

    expect(res.deviceName).toBe('TwinCAT System');
  });
});

describe('symbols and data types', () => {
  test('reading upload info', async () => {
    const res = await client.readUploadInfo();

    //Note: checking only keys
    expect(Object.keys(res)).toStrictEqual(Object.keys({
      symbolCount: 0,
      symbolLength: 0,
      dataTypeCount: 0,
      dataTypeLength: 0,
      extraCount: 0,
      extraLength: 0
    }));
  });

  test('reading all symbol information', async () => {
    const res = await client.getSymbolInfos();
    const uploadInfo = await client.readUploadInfo();

    expect(Object.keys(res).length).toBe(uploadInfo.symbolCount);
    const testSymbol = res['GVL_SymbolsAndDataTypes.TestSymbol'.toLowerCase()];

    expect(testSymbol).toBeDefined();

    //Checking keys
    expect(Object.keys(testSymbol)).toStrictEqual(Object.keys(SYMBOL_INFO_OBJECT));

    //Checking object data types
    for (const key of Object.keys(SYMBOL_INFO_OBJECT)) {
      expect(typeof testSymbol[key]).toBe(typeof SYMBOL_INFO_OBJECT[key]);
    }

    //Note: Commented out properties that are system-dependant
    expect(testSymbol).toMatchObject({
      //indexGroup: 16448,
      //indexOffset: 450248,
      size: 83,
      adsDataType: 30,
      adsDataTypeStr: 'ADST_STRING',
      flags: 4105,
      flagsStr: ['Persistent', 'TypeGuid', 'Attributes'],
      arrayDimension: 0,
      name: 'GVL_SymbolsAndDataTypes.TestSymbol',
      type: 'STRING(82)',
      comment: 'Test comment äääöö',
      arrayInfo: [],
      //typeGuid: '95190718000000000000000100000052',
      attributes: [{ name: 'ads-client-attribute', value: 'example-value-ääö' }],
      extendedFlags: 0,
      //reserved: <Buffer 00 00 00 00 00 00 00 88 00 00 00>
    });
  });

  test('reading single symbol information', async () => {
    const res = await client.getSymbolInfo('GVL_SymbolsAndDataTypes.TestSymbol');

    //Checking keys
    expect(Object.keys(res)).toStrictEqual(Object.keys(SYMBOL_INFO_OBJECT));

    //Checking object data types
    for (const key of Object.keys(SYMBOL_INFO_OBJECT)) {
      expect(typeof res[key]).toBe(typeof SYMBOL_INFO_OBJECT[key]);
    }

    //Note: Commented out properties that are system-dependant
    expect(res).toMatchObject({
      //indexGroup: 16448,
      //indexOffset: 450248,
      size: 83,
      adsDataType: 30,
      adsDataTypeStr: 'ADST_STRING',
      flags: 4105,
      flagsStr: ['Persistent', 'TypeGuid', 'Attributes'],
      arrayDimension: 0,
      name: 'GVL_SymbolsAndDataTypes.TestSymbol',
      type: 'STRING(82)',
      comment: 'Test comment äääöö',
      arrayInfo: [],
      //typeGuid: '95190718000000000000000100000052',
      attributes: [{ name: 'ads-client-attribute', value: 'example-value-ääö' }],
      extendedFlags: 0,
      //reserved: <Buffer 00 00 00 00 00 00 00 88 00 00 00>
    });
  });

  test('reading all data type information', async () => {
    const res = await client.getDataTypes();
    const uploadInfo = await client.readUploadInfo();

    expect(Object.keys(res).length).toBe(uploadInfo.dataTypeCount);
    const testType = res['ST_TestDataType'.toLowerCase()];

    expect(testType).toBeDefined();

    //Note: checking only keys
    expect(Object.keys(testType)).toStrictEqual(Object.keys(DATA_TYPE_OBJECT));

    //Note: Commented out properties that are system-dependant
    expect(testType).toMatchObject({
      version: 1,
      hashValue: 0,
      typeHashValue: 0,
      size: 60,
      offset: 0,
      adsDataType: 65,
      adsDataTypeStr: 'ADST_BIGTYPE',
      flags: 2101377,
      flagsStr: ['DataType', 'TypeGuid', 'Attributes', 'PersistantDatatype'],
      arrayDimension: 0,
      name: 'ST_TestDataType',
      type: '',
      comment: 'Test comment äääöö ',
      arrayInfos: [],
      subItems: [
        {
          version: 1,
          hashValue: 0,
          typeHashValue: 0,
          size: 60,
          offset: 0,
          adsDataType: 65,
          adsDataTypeStr: 'ADST_BIGTYPE',
          flags: 130,
          flagsStr: ['DataItem', 'TypeGuid'],
          arrayDimension: 0,
          name: 'Member',
          type: 'ST_Struct',
          comment: '',
          arrayInfos: [],
          subItems: [],
          //typeGuid: 'c2654024f8dfbe4b020b33f08643d2ad',
          rpcMethods: [],
          attributes: [],
          enumInfos: [],
          //reserved: Buffer.alloc(0)
        }
      ],
      //typeGuid: 'e25ca2c595fc17906eb25949c2faeb1c',
      rpcMethods: [],
      attributes: [
        { name: 'pack_mode', value: '3' },
        {
          name: 'ads-client-datatype-attribute',
          value: 'example-datatype-value-ääö'
        }
      ],
      enumInfos: [],
      //reserved: Buffer.alloc(0)
    });
  });

  test('reading single data type information', async () => {
    const res = await client.getDataType('ST_TestDataType');

    //Checking object keys
    expect(Object.keys(res)).toStrictEqual(Object.keys(DATA_TYPE_OBJECT));

    for (const subItem of res.subItems) {
      expect(Object.keys(subItem)).toStrictEqual(Object.keys(DATA_TYPE_OBJECT));
    }

    //Checking object data types
    for (const key of Object.keys(DATA_TYPE_OBJECT)) {
      expect(typeof res[key]).toBe(typeof DATA_TYPE_OBJECT[key]);
    }

    for (const subItem of res.subItems) {
      for (const key of Object.keys(DATA_TYPE_OBJECT)) {
        expect(typeof subItem[key]).toBe(typeof DATA_TYPE_OBJECT[key]);
      }
    }

    //Note: Commented out properties that are system-dependant
    expect(res).toMatchObject({
      version: 1,
      hashValue: 0,
      typeHashValue: 0,
      size: 60,
      offset: 0,
      adsDataType: 65,
      adsDataTypeStr: 'ADST_BIGTYPE',
      flags: 2101377,
      flagsStr: ['DataType', 'TypeGuid', 'Attributes', 'PersistantDatatype'],
      arrayDimension: 0,
      name: '',
      type: 'ST_TestDataType',
      comment: 'Test comment äääöö ',
      arrayInfos: [],
      subItems: [
        {
          version: 1,
          hashValue: 0,
          typeHashValue: 0,
          size: 60,
          offset: 0,
          adsDataType: 65,
          adsDataTypeStr: 'ADST_BIGTYPE',
          flags: 2097281,
          flagsStr: ['DataType', 'TypeGuid', 'PersistantDatatype'],
          arrayDimension: 0,
          name: 'Member',
          type: 'ST_Struct',
          comment: '',
          arrayInfos: [],
          subItems: [
            {
              version: 1,
              hashValue: 0,
              typeHashValue: 0,
              size: 51,
              offset: 0,
              adsDataType: 30,
              adsDataTypeStr: 'ADST_STRING',
              flags: 2097281,
              flagsStr: ['DataType', 'TypeGuid', 'PersistantDatatype'],
              arrayDimension: 0,
              name: 'SomeText',
              type: 'STRING(50)',
              comment: '',
              arrayInfos: [],
              subItems: [],
              //typeGuid: '95190718000000000000000100000032',
              rpcMethods: [],
              attributes: [],
              enumInfos: [],
              //reserved: Buffer.alloc(0)
            },
            {
              version: 1,
              hashValue: 0,
              typeHashValue: 0,
              size: 4,
              offset: 52,
              adsDataType: 4,
              adsDataTypeStr: 'ADST_REAL32',
              flags: 2101377,
              flagsStr: ['DataType', 'TypeGuid', 'Attributes', 'PersistantDatatype'],
              arrayDimension: 0,
              name: 'SomeReal',
              type: 'REAL',
              comment: '',
              arrayInfos: [],
              subItems: [],
              //typeGuid: '9519071800000000000000000000000d',
              rpcMethods: [],
              attributes: [
                { name: 'DisplayMinValue', value: '-10000' },
                { name: 'DisplayMaxValue', value: '10000' }
              ],
              enumInfos: [],
              //reserved: Buffer.alloc(0)
            },
            {
              version: 1,
              hashValue: 0,
              typeHashValue: 0,
              size: 4,
              offset: 56,
              adsDataType: 19,
              adsDataTypeStr: 'ADST_UINT32',
              flags: 2097281,
              flagsStr: ['DataType', 'TypeGuid', 'PersistantDatatype'],
              arrayDimension: 0,
              name: 'SomeDate',
              type: 'DATE_AND_TIME',
              comment: '',
              arrayInfos: [],
              subItems: [],
              //typeGuid: '9519071800000000000000000000004d',
              rpcMethods: [],
              attributes: [],
              enumInfos: [],
              //reserved: Buffer.alloc(0)
            }
          ],
          //typeGuid: 'c2654024f8dfbe4b020b33f08643d2ad',
          rpcMethods: [],
          attributes: [],
          enumInfos: [],
          //reserved: Buffer.alloc(0)
        }
      ],
      //typeGuid: 'e25ca2c595fc17906eb25949c2faeb1c',
      rpcMethods: [],
      attributes: [
        { name: 'pack_mode', value: '3' },
        {
          name: 'ads-client-datatype-attribute',
          value: 'example-datatype-value-ääö'
        }
      ],
      enumInfos: [],
      //reserved: Buffer.alloc(0)
    });

  });
});

describe('data conversion', () => {

  test('converting a raw PLC value to a Javascript variable', async () => {
    //Only testing once, as this is used internally in readSymbol(), which is tested very well
    const res = await client.readRawByName('GVL_Read.StandardTypes.WORD_');

    const value = await client.convertFromRaw(res, 'WORD');
    expect(value).toBe(ST_STANDARD_TYPES.WORD_);
  });

  test('converting a Javascript value to a raw PLC value', async () => {
    //Only testing once, as this is used internally in writeymbol(), which is tested very well
    const res = await client.readRawByName('GVL_Read.StandardTypes.WORD_');

    const value = await client.convertFromRaw(res, 'WORD');

    expect(await client.convertToRaw(value, 'WORD')).toStrictEqual(res);
  });
});

describe('reading values', () => {

  describe('reading standard values', () => {
    test('reading BOOL', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.BOOL_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.BOOL_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.BOOL_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.BOOL_2);
      }
    });

    test('reading BYTE', async () => {
      const res = await client.readSymbol('GVL_Read.StandardTypes.BYTE_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.BYTE_);
    });

    test('reading WORD', async () => {
      const res = await client.readSymbol('GVL_Read.StandardTypes.WORD_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.WORD_);
    });

    test('reading DWORD', async () => {
      const res = await client.readSymbol('GVL_Read.StandardTypes.DWORD_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.DWORD_);
    });

    test('reading SINT', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.SINT_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.SINT_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.SINT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.SINT_2);
      }
    });

    test('reading USINT', async () => {
      const res = await client.readSymbol('GVL_Read.StandardTypes.USINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.USINT_);
    });

    test('reading INT', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.INT_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.INT_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.INT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.INT_2);
      }
    });

    test('reading UINT', async () => {
      const res = await client.readSymbol('GVL_Read.StandardTypes.UINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.UINT_);
    });

    test('reading DINT', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.DINT_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.DINT_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.DINT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.DINT_2);
      }
    });

    test('reading UDINT', async () => {
      const res = await client.readSymbol('GVL_Read.StandardTypes.UDINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.UDINT_);
    });

    test('reading REAL', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.REAL_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.REAL_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.REAL_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.REAL_2);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.REAL_3');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.REAL_3);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.REAL_4');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.REAL_4);
      }
    });

    test('reading STRING', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.STRING_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.STRING_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.STRING_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.STRING_2);
      }
    });

    test('reading DATE', async () => {
      const res = await client.readSymbol('GVL_Read.StandardTypes.DATE_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.DATE_);
    });

    test('reading DT', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.DT_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.DT_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.DT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.DT_2);
      }
    });

    test('reading TOD', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.TOD_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.TOD_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.TOD_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.TOD_2);
      }
    });

    test('reading TIME', async () => {
      const res = await client.readSymbol('GVL_Read.StandardTypes.TIME_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.TIME_);
    });

    test('reading LWORD', async () => {
      const res = await client.readSymbol('GVL_Read.StandardTypes.LWORD_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LWORD_);
    });

    test('reading LINT', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.LINT_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LINT_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.LINT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LINT_2);
      }
    });

    test('reading ULINT', async () => {
      const res = await client.readSymbol('GVL_Read.StandardTypes.ULINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.ULINT_);
    });

    test('reading LREAL', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.LREAL_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LREAL_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.LREAL_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LREAL_2);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.LREAL_3');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LREAL_3);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.LREAL_4');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LREAL_4);
      }
    });

    test('reading WSTRING', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.WSTRING_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.WSTRING_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardTypes.WSTRING_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.WSTRING_2);
      }
    });

    test('reading LDATE (---- TODO: Needs TC 3.1.4026 ----)', async () => {
      expect(true).toBe(true);
      //const res = await client.readSymbol('GVL_Read.StandardTypes.LDATE_');
      //expect(res.value).toStrictEqual(??);
    });

    test('reading LDT (---- TODO: Needs TC 3.1.4026 ----)', async () => {
      expect(true).toBe(true);
      //const res = await client.readSymbol('GVL_Read.StandardTypes.LDT_');
      //expect(res.value).toStrictEqual(??);
    });

    test('reading LTOD (---- TODO: Needs TC 3.1.4026 ----)', async () => {
      expect(true).toBe(true);
      //const res = await client.readSymbol('GVL_Read.StandardTypes.LTOD_');
      //expect(res.value).toStrictEqual(??);
    });

    test('reading LTIME', async () => {
      const res = await client.readSymbol('GVL_Read.StandardTypes.LTIME_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LTIME_);
    });
  });

  describe('reading standard array values', () => {
    test('reading ARRAY OF BOOL', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.BOOL_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.BOOL_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.BOOL_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.BOOL_2);
      }
    });

    test('reading ARRAY OF BYTE', async () => {
      const res = await client.readSymbol('GVL_Read.StandardArrays.BYTE_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.BYTE_);
    });

    test('reading ARRAY OF WORD', async () => {
      const res = await client.readSymbol('GVL_Read.StandardArrays.WORD_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.WORD_);
    });

    test('reading ARRAY OF DWORD', async () => {
      const res = await client.readSymbol('GVL_Read.StandardArrays.DWORD_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DWORD_);
    });

    test('reading ARRAY OF SINT', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.SINT_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.SINT_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.SINT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.SINT_2);
      }
    });

    test('reading ARRAY OF USINT', async () => {
      const res = await client.readSymbol('GVL_Read.StandardArrays.USINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.USINT_);
    });

    test('reading ARRAY OF INT', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.INT_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.INT_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.INT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.INT_2);
      }
    });

    test('reading ARRAY OF UINT', async () => {
      const res = await client.readSymbol('GVL_Read.StandardArrays.UINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.UINT_);
    });

    test('reading ARRAY OF DINT', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.DINT_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DINT_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.DINT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DINT_2);
      }
    });

    test('reading ARRAY OF UDINT', async () => {
      const res = await client.readSymbol('GVL_Read.StandardArrays.UDINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.UDINT_);
    });

    test('reading ARRAY OF REAL', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.REAL_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.REAL_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.REAL_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.REAL_2);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.REAL_3');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.REAL_3);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.REAL_4');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.REAL_4);
      }
    });

    test('reading ARRAY OF STRING', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.STRING_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.STRING_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.STRING_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.STRING_2);
      }
    });

    test('reading ARRAY OF DATE', async () => {
      const res = await client.readSymbol('GVL_Read.StandardArrays.DATE_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DATE_);
    });

    test('reading ARRAY OF DT', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.DT_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DT_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.DT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DT_2);
      }
    });

    test('reading ARRAY OF TOD', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.TOD_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.TOD_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.TOD_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.TOD_2);
      }
    });

    test('reading ARRAY OF TIME', async () => {
      const res = await client.readSymbol('GVL_Read.StandardArrays.TIME_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.TIME_);
    });

    test('reading ARRAY OF LWORD', async () => {
      const res = await client.readSymbol('GVL_Read.StandardArrays.LWORD_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LWORD_);
    });

    test('reading ARRAY OF LINT', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.LINT_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LINT_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.LINT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LINT_2);
      }
    });

    test('reading ARRAY OF ULINT', async () => {
      const res = await client.readSymbol('GVL_Read.StandardArrays.ULINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.ULINT_);
    });

    test('reading ARRAY OF LREAL', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.LREAL_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LREAL_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.LREAL_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LREAL_2);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.LREAL_3');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LREAL_3);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.LREAL_4');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LREAL_4);
      }
    });

    test('reading ARRAY OF WSTRING', async () => {
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.WSTRING_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.WSTRING_);
      }
      {
        const res = await client.readSymbol('GVL_Read.StandardArrays.WSTRING_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.WSTRING_2);
      }
    });

    test('reading ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----)', async () => {
      expect(true).toBe(true);
      //const res = await client.readSymbol('GVL_Read.StandardArrays.LDATE_');
      //expect(res.value).toStrictEqual(??);
    });

    test('reading ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)', async () => {
      expect(true).toBe(true);
      //const res = await client.readSymbol('GVL_Read.StandardArrays.LDT_');
      //expect(res.value).toStrictEqual(??);
    });

    test('reading ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)', async () => {
      expect(true).toBe(true);
      //const res = await client.readSymbol('GVL_Read.StandardArrays.LTOD_');
      //expect(res.value).toStrictEqual(??);
    });

    test('reading ARRAY OF LTIME', async () => {
      const res = await client.readSymbol('GVL_Read.StandardArrays.LTIME_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LTIME_);
    });

  });

  describe('reading complex values', () => {
    test('reading STRUCT', async () => {
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.STRUCT_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES);
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.STRUCT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES);
      }
    });

    test('reading ALIAS', async () => {
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.ALIAS_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES);
        expect(res.dataType.type).toBe('ST_StandardTypes');
      }
    });

    test('reading ENUM', async () => {
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.ENUM_');
        expect(res.value).toMatchObject({
          name: 'Running',
          value: 100
        });
      }
      {
        client.settings.objectifyEnumerations = false;
        const res = await client.readSymbol('GVL_Read.ComplexTypes.ENUM_');
        expect(res.value).toBe(100);
        client.settings.objectifyEnumerations = true;
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.ENUM_2');
        expect(res.value).toMatchObject({
          name: 'Unknown',
          value: -99
        });
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.ENUM_3');
        expect(res.value).toMatchObject({
          name: '',
          value: 5555
        });
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.ENUM_4');
        expect(res.value).toMatchObject({
          name: 'Negative',
          value: -9223372036854775808n
        });
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.ENUM_5');
        expect(res.value).toMatchObject({
          name: 'Values',
          value: 2
        });
      }
    });

    test('reading POINTER (address)', async () => {
      //Note: dereferenced pointer value is not possible to read using readSymbol() - we only get memory address
      const res = await client.readSymbol('GVL_Read.ComplexTypes.POINTER_');

      expect(typeof res.value).toBe("bigint");
      expect(res.symbolInfo.type).toBe("POINTER TO ST_StandardTypes");
    });

    test('reading SUBRANGE', async () => {
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.SUBRANGE_');
        expect(res.value).toBe(1234);
      }
    });

    test('reading UNION', async () => {
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.UNION_');
        expect(res.value.STRING_).toBe('A test string ääöö!!@@');
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.UNION_2');
        expect(res.value.INT_).toBe(32767);
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.UNION_3');
        expect(res.value.REAL_).toBeCloseTo(3.14);
      }
    });

    test('reading FUNCTION_BLOCK', async () => {
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.BLOCK_');
        expect(res.value).toStrictEqual({
          Data: ST_STANDARD_TYPES,
          StrValue: ''
        });
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.BLOCK_2');
        expect(res.value).toStrictEqual({
          ET: 0,
          IN: false,
          M: false,
          PT: 2500,
          Q: false,
          StartTime: 0
        });
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.BLOCK_3');
        expect(res.value).toStrictEqual({
          sNetId: '',
          sPathName: 'C:\\Test',
          ePath: {
            name: 'PATH_GENERIC',
            value: 1
          },
          bExecute: false,
          tTimeout: 5000,
          bBusy: false,
          bError: false,
          nErrId: 0
        });
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.BLOCK_4');
        expect(res.value).toStrictEqual({
          ...BLOCK_4,
          sVarName: 'GVL_Test.Variable',
        });
      }
    });

    test('reading INTERFACE', async () => {
      {
        const res = await client.readSymbol('GVL_Read.ComplexTypes.INTERFACE_');
        expect(typeof res.value).toBe('bigint');
      }
    });
  });

  describe('reading complex array values', () => {
    test('reading ARRAY OF STRUCT', async () => {
      {
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.STRUCT_');
        expect(res.value).toStrictEqual([
          ST_STANDARD_TYPES,
          ST_STANDARD_TYPES,
          ST_STANDARD_TYPES
        ]);
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.STRUCT_2');
        expect(res.value).toStrictEqual([
          ST_STANDARD_ARRAY_TYPES,
          ST_STANDARD_ARRAY_TYPES,
          ST_STANDARD_ARRAY_TYPES
        ]);
      }
    });

    test('reading ARRAY OF ALIAS', async () => {
      {
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.ALIAS_');
        expect(res.value).toStrictEqual([
          ST_STANDARD_TYPES,
          ST_STANDARD_TYPES,
          ST_STANDARD_TYPES
        ]);
        expect(res.dataType.type).toBe('ST_StandardTypes');
      }
    });

    test('reading ARRAY OF ENUM', async () => {
      {
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.ENUM_');
        expect(res.value).toMatchObject([
          {
            name: 'Running',
            value: 100
          },
          {
            name: 'Disabled',
            value: 0
          },
          {
            name: 'Stopping',
            value: 200
          }
        ]);
      }
      {
        client.settings.objectifyEnumerations = false;
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.ENUM_');
        expect(res.value).toStrictEqual([100, 0, 200]);
        client.settings.objectifyEnumerations = true;
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.ENUM_2');
        expect(res.value).toMatchObject([
          {
            name: 'Unknown',
            value: -99
          },
          {
            name: 'Disabled',
            value: 0
          },
          {
            name: 'Starting',
            value: 50
          }
        ]);
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.ENUM_3');
        expect(res.value).toMatchObject([
          {
            name: '',
            value: 5555
          },
          {
            name: 'Disabled',
            value: 0
          },
          {
            name: 'Unknown',
            value: -99
          }
        ]);
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.ENUM_4');
        expect(res.value).toMatchObject([
          {
            name: 'Negative',
            value: -9223372036854775808n
          },
          {
            name: 'Zero',
            value: 0n
          },
          {
            name: 'Positive',
            value: 9223372036854775807n
          }
        ]);
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.ENUM_5');
        expect(res.value).toMatchObject([
          {
            name: 'Values',
            value: 2
          },
          {
            name: 'Implicit',
            value: 0
          },
          {
            name: 'Here',
            value: 4
          }
        ]);
      }
    });

    test('reading ARRAY OF POINTER (address)', async () => {
      //Note: dereferenced pointer value is not possible to read using readSymbol() - we only get memory address
      const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.POINTER_');

      expect(typeof res.value[0]).toBe("bigint");
      expect(res.symbolInfo.type).toBe("ARRAY [0..2] OF POINTER TO ST_StandardTypes"); //TODO: Is this valid really?
    });

    test('reading ARRAY OF SUBRANGE', async () => {
      {
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.SUBRANGE_');
        expect(res.value).toStrictEqual([1234, 0, -1234]);
      }
    });

    test('reading ARRAY OF UNION', async () => {
      {
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.UNION_');
        expect(res.value[0].STRING_).toBe('A test string ääöö!!@@');
        expect(res.value[1].INT_).toBe(32767);
        expect(res.value[2].REAL_).toBeCloseTo(3.14);
      }
    });

    test('reading ARRAY OF FUNCTION_BLOCK', async () => {
      {
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.BLOCK_');
        expect(res.value).toStrictEqual([
          {
            Data: ST_STANDARD_TYPES,
            StrValue: 'First'
          },
          {
            Data: ST_STANDARD_TYPES,
            StrValue: ''
          },
          {
            Data: ST_STANDARD_TYPES,
            StrValue: 'Third'
          }
        ]);
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.BLOCK_2');

        const base = {
          ET: 0,
          IN: false,
          M: false,
          PT: 0,
          Q: false,
          StartTime: 0
        };

        expect(res.value).toStrictEqual([
          {
            ...base,
            PT: 2500
          },
          base,
          {
            ...base,
            PT: 123000,
          }
        ]);
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.BLOCK_3');

        const base = {
          sNetId: '',
          sPathName: '',
          ePath: {
            name: 'PATH_GENERIC',
            value: 1
          },
          bExecute: false,
          tTimeout: 5000,
          bBusy: false,
          bError: false,
          nErrId: 0
        };

        expect(res.value).toStrictEqual([
          {
            ...base,
            sPathName: 'C:\\Test'
          },
          base,
          {
            ...base,
            sPathName: 'C:\\AnotherTest'
          },
        ]);
      }
      {
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.BLOCK_4');
        expect(res.value).toStrictEqual([
          {
            ...BLOCK_4,
            sVarName: 'GVL_Test.Variable',
          },
          BLOCK_4,
          {
            ...BLOCK_4,
            sVarName: 'GVL_Test.AnotherVariable',
          },
        ]);
      }
    });

    test('reading ARRAY OF INTERFACE', async () => {
      {
        const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.INTERFACE_');
        expect(typeof res.value).toBe('object');
        expect(typeof res.value[0]).toBe('bigint');
        expect(typeof res.value[1]).toBe('bigint');
        expect(typeof res.value[2]).toBe('bigint');

        expect(res.value[1]).toBe(0n);
      }
    });
  });

  describe('reading special types / cases', () => {
    test('reading ARRAY with negative index', async () => {
      const res = await client.readSymbol('GVL_Read.SpecialTypes.NegativeIndexArray');
      expect(res.value).toBeInstanceOf(Array);
      expect(res.value).toHaveLength(201);
      expect(res.value[0]).toBeCloseTo(1.11);
      expect(res.value[100]).toBeCloseTo(5.55);
      expect(res.value[200]).toBeCloseTo(9.99);
    });

    test('reading multi-dimensional ARRAY', async () => {
      const res = await client.readSymbol('GVL_Read.SpecialTypes.MultiDimensionalArray');
      expect(res.value).toBeInstanceOf(Array);
      expect(res.value).toHaveLength(3);
      expect(res.value).toStrictEqual([[1, 2], [3, 4], [5, 6]]);
    });

    test('reading ARRAY OF ARRAY', async () => {
      const res = await client.readSymbol('GVL_Read.SpecialTypes.ArrayOfArrays');
      expect(res.value).toBeInstanceOf(Array);
      expect(res.value).toHaveLength(3);
      expect(res.value).toStrictEqual([[-1, -2], [-3, -4], [-5, -6]]);
    });

    test(`reading STRUCT with pragma: {attribute 'pack_mode' := '1'}`, async () => {
      {
        const res = await client.readSymbol('GVL_Read.SpecialTypes.PackMode1');

        expect(res.dataType.attributes).toStrictEqual([{
          name: 'pack_mode',
          value: '1'
        }]);
        expect(res.symbolInfo.size).toBe(1145);
        expect(res.rawValue.byteLength).toBe(1145);
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES);
      }

      //TODO: complex struct
    });

    test(`reading STRUCT with pragma: {attribute 'pack_mode' := '8'}`, async () => {
      {
        const res = await client.readSymbol('GVL_Read.SpecialTypes.PackMode8');

        expect(res.dataType.attributes).toStrictEqual([{
          name: 'pack_mode',
          value: '8'
        }]);
        expect(res.symbolInfo.size).toBe(1160);
        expect(res.rawValue.byteLength).toBe(1160);
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES);
      }

      //TODO: complex struct
    });

    test(`reading an empty FUNCTION_BLOCK`, async () => {
      {
        const res = await client.readSymbol('GVL_Read.SpecialTypes.EmptyBlock');

        expect(typeof res.value).toBe("bigint");
      }
    });

    test(`reading an empty STRUCT`, async () => {
      {
        const res = await client.readSymbol('GVL_Read.SpecialTypes.EmptyStruct');
        expect(res.value).toStrictEqual({});
      }
    });

    test(`reading an empty ARRAY`, async () => {
      {
        //Why is this even allowed? However result is empty array, as in PLC online view
        const res = await client.readSymbol('GVL_Read.SpecialTypes.EmptyArray');
        expect(res.value).toStrictEqual([]);
      }
    });
  });

  describe('reading dereferenced POINTER and REFERENCE values', () => {
    test('reading POINTER (value)', async () => {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.POINTER_^');
      const res = await client.readRawByName('GVL_Read.ComplexTypes.POINTER_^');
      expect(res.byteLength).toBe(symbolInfo.size);
      expect(symbolInfo.type).toBe("ST_StandardTypes");

      const value = await client.convertFromRaw(res, symbolInfo.type);
      expect(value).toStrictEqual(ST_STANDARD_TYPES);
    });

    test('reading REFERENCE (value)', async () => {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.REFERENCE_');
      const res = await client.readRawByName('GVL_Read.ComplexTypes.REFERENCE_');
      expect(res.byteLength).toBe(symbolInfo.size);
      expect(symbolInfo.type).toBe("ST_StandardTypes");

      const value = await client.convertFromRaw(res, symbolInfo.type);
      expect(value).toStrictEqual(ST_STANDARD_TYPES);
    });
  });

  describe('reading raw data', () => {
    test('reading a raw value', async () => {
      {
        //Only testing once, as this is used internally in readSymbol(), which is tested very well
        const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.BOOL_');
        const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);

        expect(Buffer.isBuffer(res)).toBe(true);
        expect(res.byteLength).toBe(1);

        const compare = Buffer.alloc(1);
        compare.writeUInt8(1);
        expect(res).toStrictEqual(compare);

        const value = await client.convertFromRaw(res, 'BOOL');

        expect(value).toBe(ST_STANDARD_TYPES.BOOL_);
      }
    });
  });

});

describe('writing values', () => {

  describe('writing standard values', () => {
    test('writing BOOL', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardTypes.BOOL_', ST_STANDARD_TYPES_WRITE.BOOL_);
        const res = await client.readSymbol('GVL_Write.StandardTypes.BOOL_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.BOOL_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardTypes.BOOL_2', ST_STANDARD_TYPES_WRITE.BOOL_2);
        const res = await client.readSymbol('GVL_Write.StandardTypes.BOOL_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.BOOL_2);
      }
    });

    test('writing BYTE', async () => {
      await client.writeSymbol('GVL_Write.StandardTypes.BYTE_', ST_STANDARD_TYPES_WRITE.BYTE_);
      const res = await client.readSymbol('GVL_Write.StandardTypes.BYTE_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.BYTE_);
    });

    test('writing WORD', async () => {
      await client.writeSymbol('GVL_Write.StandardTypes.WORD_', ST_STANDARD_TYPES_WRITE.WORD_);
      const res = await client.readSymbol('GVL_Write.StandardTypes.WORD_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.WORD_);
    });

    test('writing DWORD', async () => {
      await client.writeSymbol('GVL_Write.StandardTypes.DWORD_', ST_STANDARD_TYPES_WRITE.DWORD_);
      const res = await client.readSymbol('GVL_Write.StandardTypes.DWORD_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.DWORD_);
    });

    test('writing SINT', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardTypes.SINT_', ST_STANDARD_TYPES_WRITE.SINT_);
        const res = await client.readSymbol('GVL_Write.StandardTypes.SINT_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.SINT_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardTypes.SINT_2', ST_STANDARD_TYPES_WRITE.SINT_2);
        const res = await client.readSymbol('GVL_Write.StandardTypes.SINT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.SINT_2);
      }
    });

    test('writing USINT', async () => {
      await client.writeSymbol('GVL_Write.StandardTypes.USINT_', ST_STANDARD_TYPES_WRITE.USINT_);
      const res = await client.readSymbol('GVL_Write.StandardTypes.USINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.USINT_);
    });

    test('writing INT', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardTypes.INT_', ST_STANDARD_TYPES_WRITE.INT_);
        const res = await client.readSymbol('GVL_Write.StandardTypes.INT_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.INT_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardTypes.INT_2', ST_STANDARD_TYPES_WRITE.INT_2);
        const res = await client.readSymbol('GVL_Write.StandardTypes.INT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.INT_2);
      }
    });

    test('writing UINT', async () => {
      await client.writeSymbol('GVL_Write.StandardTypes.UINT_', ST_STANDARD_TYPES_WRITE.UINT_);
      const res = await client.readSymbol('GVL_Write.StandardTypes.UINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.UINT_);
    });

    test('writing DINT', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardTypes.DINT_', ST_STANDARD_TYPES_WRITE.DINT_);
        const res = await client.readSymbol('GVL_Write.StandardTypes.DINT_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.DINT_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardTypes.DINT_2', ST_STANDARD_TYPES_WRITE.DINT_2);
        const res = await client.readSymbol('GVL_Write.StandardTypes.DINT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.DINT_2);
      }
    });

    test('writing UDINT', async () => {
      await client.writeSymbol('GVL_Write.StandardTypes.UDINT_', ST_STANDARD_TYPES_WRITE.UDINT_);
      const res = await client.readSymbol('GVL_Write.StandardTypes.UDINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.UDINT_);
    });

    test('writing REAL', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardTypes.REAL_', ST_STANDARD_TYPES_WRITE.REAL_);
        const res = await client.readSymbol('GVL_Write.StandardTypes.REAL_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.REAL_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardTypes.REAL_2', ST_STANDARD_TYPES_WRITE.REAL_2);
        const res = await client.readSymbol('GVL_Write.StandardTypes.REAL_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.REAL_2);
      }
      {
        await client.writeSymbol('GVL_Write.StandardTypes.REAL_3', ST_STANDARD_TYPES_WRITE.REAL_3);
        const res = await client.readSymbol('GVL_Write.StandardTypes.REAL_3');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.REAL_3);
      }
      {
        await client.writeSymbol('GVL_Write.StandardTypes.REAL_4', ST_STANDARD_TYPES_WRITE.REAL_4);
        const res = await client.readSymbol('GVL_Write.StandardTypes.REAL_4');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.REAL_4);
      }
    });

    test('writing STRING', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardTypes.STRING_', ST_STANDARD_TYPES_WRITE.STRING_);
        const res = await client.readSymbol('GVL_Write.StandardTypes.STRING_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.STRING_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardTypes.STRING_2', ST_STANDARD_TYPES_WRITE.STRING_2);
        const res = await client.readSymbol('GVL_Write.StandardTypes.STRING_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.STRING_2);
      }
    });

    test('writing DATE', async () => {
      await client.writeSymbol('GVL_Write.StandardTypes.DATE_', ST_STANDARD_TYPES_WRITE.DATE_);
      const res = await client.readSymbol('GVL_Write.StandardTypes.DATE_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.DATE_);
    });

    test('writing DT', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardTypes.DT_', ST_STANDARD_TYPES_WRITE.DT_);
        const res = await client.readSymbol('GVL_Write.StandardTypes.DT_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.DT_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardTypes.DT_2', ST_STANDARD_TYPES_WRITE.DT_2);
        const res = await client.readSymbol('GVL_Write.StandardTypes.DT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.DT_2);
      }
    });

    test('writing TOD', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardTypes.TOD_', ST_STANDARD_TYPES_WRITE.TOD_);
        const res = await client.readSymbol('GVL_Write.StandardTypes.TOD_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.TOD_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardTypes.TOD_2', ST_STANDARD_TYPES_WRITE.TOD_2);
        const res = await client.readSymbol('GVL_Write.StandardTypes.TOD_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.TOD_2);
      }
    });

    test('writing TIME', async () => {
      await client.writeSymbol('GVL_Write.StandardTypes.TIME_', ST_STANDARD_TYPES_WRITE.TIME_);
      const res = await client.readSymbol('GVL_Write.StandardTypes.TIME_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.TIME_);
    });

    test('writing LWORD', async () => {
      await client.writeSymbol('GVL_Write.StandardTypes.LWORD_', ST_STANDARD_TYPES_WRITE.LWORD_);
      const res = await client.readSymbol('GVL_Write.StandardTypes.LWORD_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LWORD_);
    });

    test('writing LINT', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardTypes.LINT_', ST_STANDARD_TYPES_WRITE.LINT_);
        const res = await client.readSymbol('GVL_Write.StandardTypes.LINT_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LINT_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardTypes.LINT_2', ST_STANDARD_TYPES_WRITE.LINT_2);
        const res = await client.readSymbol('GVL_Write.StandardTypes.LINT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LINT_2);
      }
    });

    test('writing ULINT', async () => {
      await client.writeSymbol('GVL_Write.StandardTypes.ULINT_', ST_STANDARD_TYPES_WRITE.ULINT_);
      const res = await client.readSymbol('GVL_Write.StandardTypes.ULINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES.ULINT_);
    });

    test('writing LREAL', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardTypes.LREAL_', ST_STANDARD_TYPES_WRITE.LREAL_);
        const res = await client.readSymbol('GVL_Write.StandardTypes.LREAL_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LREAL_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardTypes.LREAL_2', ST_STANDARD_TYPES_WRITE.LREAL_2);
        const res = await client.readSymbol('GVL_Write.StandardTypes.LREAL_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LREAL_2);
      }
      {
        await client.writeSymbol('GVL_Write.StandardTypes.LREAL_3', ST_STANDARD_TYPES_WRITE.LREAL_3);
        const res = await client.readSymbol('GVL_Write.StandardTypes.LREAL_3');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LREAL_3);
      }
      {
        await client.writeSymbol('GVL_Write.StandardTypes.LREAL_4', ST_STANDARD_TYPES_WRITE.LREAL_4);
        const res = await client.readSymbol('GVL_Write.StandardTypes.LREAL_4');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LREAL_4);
      }
    });

    test('writing WSTRING', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardTypes.WSTRING_', ST_STANDARD_TYPES_WRITE.WSTRING_);
        const res = await client.readSymbol('GVL_Write.StandardTypes.WSTRING_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.WSTRING_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardTypes.WSTRING_2', ST_STANDARD_TYPES_WRITE.WSTRING_2);
        const res = await client.readSymbol('GVL_Write.StandardTypes.WSTRING_2');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES.WSTRING_2);
      }
    });

    test('writing LDATE (---- TODO: Needs TC 3.1.4026 ----)', async () => {
      expect(true).toBe(true);
      //await client.writeSymbol('GVL_Write.StandardTypes.LDATE_', ST_STANDARD_TYPES_WRITE.LDATE_);
      //const res = await client.readSymbol('GVL_Write.StandardTypes.LDATE_');
      //expect(res.value).toStrictEqual(??);
    });

    test('writing LDT (---- TODO: Needs TC 3.1.4026 ----)', async () => {
      expect(true).toBe(true);
      //await client.writeSymbol('GVL_Write.StandardTypes.LDT_', ST_STANDARD_TYPES_WRITE.LDT_);
      //const res = await client.readSymbol('GVL_Write.StandardTypes.LDT_');
      //expect(res.value).toStrictEqual(??);
    });

    test('writing LTOD (---- TODO: Needs TC 3.1.4026 ----)', async () => {
      expect(true).toBe(true);
      //await client.writeSymbol('GVL_Write.StandardTypes.LTOD_', ST_STANDARD_TYPES_WRITE.LTOD_);
      //const res = await client.readSymbol('GVL_Write.StandardTypes.LTOD_');
      //expect(res.value).toStrictEqual(??);
    });

    test('writing LTIME', async () => {
      await client.writeSymbol('GVL_Write.StandardTypes.LTIME_', ST_STANDARD_TYPES_WRITE.LTIME_);
      const res = await client.readSymbol('GVL_Write.StandardTypes.LTIME_');
      expect(res.value).toStrictEqual(ST_STANDARD_TYPES_WRITE.LTIME_);
    });
  });

  describe('writing standard array values', () => {
    test('writing ARRAY OF BOOL', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardArrays.BOOL_', ST_STANDARD_ARRAY_TYPES_WRITE.BOOL_);
        const res = await client.readSymbol('GVL_Write.StandardArrays.BOOL_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.BOOL_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardArrays.BOOL_2', ST_STANDARD_ARRAY_TYPES_WRITE.BOOL_2);
        const res = await client.readSymbol('GVL_Write.StandardArrays.BOOL_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.BOOL_2);
      }
    });

    test('writing ARRAY OF BYTE', async () => {
      await client.writeSymbol('GVL_Write.StandardArrays.BYTE_', ST_STANDARD_ARRAY_TYPES_WRITE.BYTE_);
      const res = await client.readSymbol('GVL_Write.StandardArrays.BYTE_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.BYTE_);
    });

    test('writing ARRAY OF WORD', async () => {
      await client.writeSymbol('GVL_Write.StandardArrays.WORD_', ST_STANDARD_ARRAY_TYPES_WRITE.WORD_);
      const res = await client.readSymbol('GVL_Write.StandardArrays.WORD_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.WORD_);
    });

    test('writing ARRAY OF DWORD', async () => {
      await client.writeSymbol('GVL_Write.StandardArrays.DWORD_', ST_STANDARD_ARRAY_TYPES_WRITE.DWORD_);
      const res = await client.readSymbol('GVL_Write.StandardArrays.DWORD_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DWORD_);
    });

    test('writing ARRAY OF SINT', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardArrays.SINT_', ST_STANDARD_ARRAY_TYPES_WRITE.SINT_);
        const res = await client.readSymbol('GVL_Write.StandardArrays.SINT_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.SINT_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardArrays.SINT_2', ST_STANDARD_ARRAY_TYPES_WRITE.SINT_2);
        const res = await client.readSymbol('GVL_Write.StandardArrays.SINT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.SINT_2);
      }
    });

    test('writing ARRAY OF USINT', async () => {
      await client.writeSymbol('GVL_Write.StandardArrays.USINT_', ST_STANDARD_ARRAY_TYPES_WRITE.USINT_);
      const res = await client.readSymbol('GVL_Write.StandardArrays.USINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.USINT_);
    });

    test('writing ARRAY OF INT', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardArrays.INT_', ST_STANDARD_ARRAY_TYPES_WRITE.INT_);
        const res = await client.readSymbol('GVL_Write.StandardArrays.INT_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.INT_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardArrays.INT_2', ST_STANDARD_ARRAY_TYPES_WRITE.INT_2);
        const res = await client.readSymbol('GVL_Write.StandardArrays.INT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.INT_2);
      }
    });

    test('writing ARRAY OF UINT', async () => {
      await client.writeSymbol('GVL_Write.StandardArrays.UINT_', ST_STANDARD_ARRAY_TYPES_WRITE.UINT_);
      const res = await client.readSymbol('GVL_Write.StandardArrays.UINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.UINT_);
    });

    test('writing ARRAY OF DINT', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardArrays.DINT_', ST_STANDARD_ARRAY_TYPES_WRITE.DINT_);
        const res = await client.readSymbol('GVL_Write.StandardArrays.DINT_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DINT_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardArrays.DINT_2', ST_STANDARD_ARRAY_TYPES_WRITE.DINT_2);
        const res = await client.readSymbol('GVL_Write.StandardArrays.DINT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DINT_2);
      }
    });

    test('writing ARRAY OF UDINT', async () => {
      await client.writeSymbol('GVL_Write.StandardArrays.UDINT_', ST_STANDARD_ARRAY_TYPES_WRITE.UDINT_);
      const res = await client.readSymbol('GVL_Write.StandardArrays.UDINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.UDINT_);
    });

    test('writing ARRAY OF REAL', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardArrays.REAL_', ST_STANDARD_ARRAY_TYPES_WRITE.REAL_);
        const res = await client.readSymbol('GVL_Write.StandardArrays.REAL_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.REAL_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardArrays.REAL_2', ST_STANDARD_ARRAY_TYPES_WRITE.REAL_2);
        const res = await client.readSymbol('GVL_Write.StandardArrays.REAL_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.REAL_2);
      }
      {
        await client.writeSymbol('GVL_Write.StandardArrays.REAL_3', ST_STANDARD_ARRAY_TYPES_WRITE.REAL_3);
        const res = await client.readSymbol('GVL_Write.StandardArrays.REAL_3');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.REAL_3);
      }
      {
        await client.writeSymbol('GVL_Write.StandardArrays.REAL_4', ST_STANDARD_ARRAY_TYPES_WRITE.REAL_4);
        const res = await client.readSymbol('GVL_Write.StandardArrays.REAL_4');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.REAL_4);
      }
    });

    test('writing ARRAY OF STRING', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardArrays.STRING_', ST_STANDARD_ARRAY_TYPES_WRITE.STRING_);
        const res = await client.readSymbol('GVL_Write.StandardArrays.STRING_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.STRING_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardArrays.STRING_2', ST_STANDARD_ARRAY_TYPES_WRITE.STRING_2);
        const res = await client.readSymbol('GVL_Write.StandardArrays.STRING_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.STRING_2);
      }
    });

    test('writing ARRAY OF DATE', async () => {
      await client.writeSymbol('GVL_Write.StandardArrays.DATE_', ST_STANDARD_ARRAY_TYPES_WRITE.DATE_);
      const res = await client.readSymbol('GVL_Write.StandardArrays.DATE_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DATE_);
    });

    test('writing ARRAY OF DT', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardArrays.DT_', ST_STANDARD_ARRAY_TYPES_WRITE.DT_);
        const res = await client.readSymbol('GVL_Write.StandardArrays.DT_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DT_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardArrays.DT_2', ST_STANDARD_ARRAY_TYPES_WRITE.DT_2);
        const res = await client.readSymbol('GVL_Write.StandardArrays.DT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DT_2);
      }
    });

    test('writing ARRAY OF TOD', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardArrays.TOD_', ST_STANDARD_ARRAY_TYPES_WRITE.TOD_);
        const res = await client.readSymbol('GVL_Write.StandardArrays.TOD_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.TOD_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardArrays.TOD_2', ST_STANDARD_ARRAY_TYPES_WRITE.TOD_2);
        const res = await client.readSymbol('GVL_Write.StandardArrays.TOD_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.TOD_2);
      }
    });

    test('writing ARRAY OF TIME', async () => {
      await client.writeSymbol('GVL_Write.StandardArrays.TIME_', ST_STANDARD_ARRAY_TYPES_WRITE.TIME_);
      const res = await client.readSymbol('GVL_Write.StandardArrays.TIME_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.TIME_);
    });

    test('writing ARRAY OF LWORD', async () => {
      await client.writeSymbol('GVL_Write.StandardArrays.LWORD_', ST_STANDARD_ARRAY_TYPES_WRITE.LWORD_);
      const res = await client.readSymbol('GVL_Write.StandardArrays.LWORD_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LWORD_);
    });

    test('writing ARRAY OF LINT', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardArrays.LINT_', ST_STANDARD_ARRAY_TYPES_WRITE.LINT_);
        const res = await client.readSymbol('GVL_Write.StandardArrays.LINT_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LINT_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardArrays.LINT_2', ST_STANDARD_ARRAY_TYPES_WRITE.LINT_2);
        const res = await client.readSymbol('GVL_Write.StandardArrays.LINT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LINT_2);
      }
    });

    test('writing ARRAY OF ULINT', async () => {
      await client.writeSymbol('GVL_Write.StandardArrays.ULINT_', ST_STANDARD_ARRAY_TYPES_WRITE.ULINT_);
      const res = await client.readSymbol('GVL_Write.StandardArrays.ULINT_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.ULINT_);
    });

    test('writing ARRAY OF LREAL', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardArrays.LREAL_', ST_STANDARD_ARRAY_TYPES_WRITE.LREAL_);
        const res = await client.readSymbol('GVL_Write.StandardArrays.LREAL_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LREAL_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardArrays.LREAL_2', ST_STANDARD_ARRAY_TYPES_WRITE.LREAL_2);
        const res = await client.readSymbol('GVL_Write.StandardArrays.LREAL_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LREAL_2);
      }
      {
        await client.writeSymbol('GVL_Write.StandardArrays.LREAL_3', ST_STANDARD_ARRAY_TYPES_WRITE.LREAL_3);
        const res = await client.readSymbol('GVL_Write.StandardArrays.LREAL_3');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LREAL_3);
      }
      {
        await client.writeSymbol('GVL_Write.StandardArrays.LREAL_4', ST_STANDARD_ARRAY_TYPES_WRITE.LREAL_4);
        const res = await client.readSymbol('GVL_Write.StandardArrays.LREAL_4');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LREAL_4);
      }
    });

    test('writing ARRAY OF WSTRING', async () => {
      {
        await client.writeSymbol('GVL_Write.StandardArrays.WSTRING_', ST_STANDARD_ARRAY_TYPES_WRITE.WSTRING_);
        const res = await client.readSymbol('GVL_Write.StandardArrays.WSTRING_');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.WSTRING_);
      }
      {
        await client.writeSymbol('GVL_Write.StandardArrays.WSTRING_2', ST_STANDARD_ARRAY_TYPES_WRITE.WSTRING_2);
        const res = await client.readSymbol('GVL_Write.StandardArrays.WSTRING_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.WSTRING_2);
      }
    });

    test('writing ARRAY OF LDATE (---- TODO: Needs TC 3.1.4026 ----)', async () => {
      expect(true).toBe(true);
      //await client.writeSymbol('GVL_Write.StandardArrays.LDATE_', ST_STANDARD_ARRAY_TYPES_WRITE.LDATE_);
      //const res = await client.readSymbol('GVL_Write.StandardArrays.LDATE_');
      //expect(res.value).toStrictEqual(??);
    });

    test('writing ARRAY OF LDT (---- TODO: Needs TC 3.1.4026 ----)', async () => {
      expect(true).toBe(true);
      //await client.writeSymbol('GVL_Write.StandardArrays.LDT_', ST_STANDARD_ARRAY_TYPES_WRITE.LDT_);
      //const res = await client.readSymbol('GVL_Write.StandardArrays.LDT_');
      //expect(res.value).toStrictEqual(??);
    });

    test('writing ARRAY OF LTOD (---- TODO: Needs TC 3.1.4026 ----)', async () => {
      expect(true).toBe(true);
      //await client.writeSymbol('GVL_Write.StandardArrays.LTOD_', ST_STANDARD_ARRAY_TYPES_WRITE.LTOD_);
      //const res = await client.readSymbol('GVL_Write.StandardArrays.LTOD_');
      //expect(res.value).toStrictEqual(??);
    });

    test('writing ARRAY OF LTIME', async () => {
      await client.writeSymbol('GVL_Write.StandardArrays.LTIME_', ST_STANDARD_ARRAY_TYPES_WRITE.LTIME_);
      const res = await client.readSymbol('GVL_Write.StandardArrays.LTIME_');
      expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LTIME_);
    });
  });

  describe('writing complex values', () => {
    test('writing STRUCT', async () => {
      {
        await client.writeSymbol('GVL_Write.ComplexTypes.STRUCT_', ST_STANDARD_TYPES_WRITE);
        const res = await client.readSymbol('GVL_Write.ComplexTypes.STRUCT_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES);
      }
      {
        await client.writeSymbol('GVL_Write.ComplexTypes.STRUCT_2', ST_STANDARD_ARRAY_TYPES_WRITE);
        const res = await client.readSymbol('GVL_Write.ComplexTypes.STRUCT_2');
        expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES);
      }
    });
    test('writing ALIAS', async () => {
      {
        await client.writeSymbol('GVL_Write.ComplexTypes.ALIAS_', ST_STANDARD_TYPES_WRITE);
        const res = await client.readSymbol('GVL_Write.ComplexTypes.ALIAS_');
        expect(res.value).toStrictEqual(ST_STANDARD_TYPES);
        expect(res.dataType.type).toBe('ST_StandardTypes');
      }
    });

    test('writing ENUM', async () => {
      {
        const value = {
          name: 'Running',
          value: 100
        };

        await client.writeSymbol('GVL_Write.ComplexTypes.ENUM_', value);

        const res = await client.readSymbol('GVL_Write.ComplexTypes.ENUM_');
        expect(res.value).toStrictEqual(value);
      }
      {
        const value = {
          name: 'Unknown',
          value: -99
        };

        await client.writeSymbol('GVL_Write.ComplexTypes.ENUM_2', value);

        const res = await client.readSymbol('GVL_Write.ComplexTypes.ENUM_2');
        expect(res.value).toStrictEqual(value);
      }
      {
        await client.writeSymbol('GVL_Write.ComplexTypes.ENUM_3', 5555);

        const res = await client.readSymbol('GVL_Write.ComplexTypes.ENUM_3');
        expect(res.value).toMatchObject({
          name: '',
          value: 5555
        });
      }
      {
        const value = {
          name: 'Negative',
          value: -9223372036854775808n
        };

        await client.writeSymbol('GVL_Write.ComplexTypes.ENUM_4', value);

        const res = await client.readSymbol('GVL_Write.ComplexTypes.ENUM_4');
        expect(res.value).toStrictEqual(value);
      }
      {
        const value = {
          name: 'Values',
          value: 2
        };

        await client.writeSymbol('GVL_Write.ComplexTypes.ENUM_5', value);

        const res = await client.readSymbol('GVL_Write.ComplexTypes.ENUM_5');
        expect(res.value).toStrictEqual(value);
      }
    });

    test('writing POINTER (address)', async () => {
      //Note: This writes pointer address, not dereferenced value
      const { value } = await client.readSymbol('GVL_Read.ComplexTypes.POINTER_');
      await client.writeSymbol('GVL_Write.ComplexTypes.POINTER_', value);

      const res = await client.readSymbol('GVL_Write.ComplexTypes.POINTER_');
      expect(res.value).toStrictEqual(value);
    });

    test('writing SUBRANGE', async () => {
      {
        const value = 1234;
        await client.writeSymbol('GVL_Write.ComplexTypes.SUBRANGE_', value);

        const res = await client.readSymbol('GVL_Write.ComplexTypes.SUBRANGE_');
        expect(res.value).toBe(value);
      }
      {
        //Writing arrows outside of range should work in SUBRANGE
        const value = 9999;
        await client.writeSymbol('GVL_Write.ComplexTypes.SUBRANGE_', value);

        const res = await client.readSymbol('GVL_Write.ComplexTypes.SUBRANGE_');
        expect(res.value).toBe(value);
      }
    });

    test('writing UNION', async () => {
      {
        const value = 'second test string';
        await client.writeSymbol('GVL_Write.ComplexTypes.UNION_.STRING_', value);

        const res = await client.readSymbol('GVL_Write.ComplexTypes.UNION_');
        expect(res.value.STRING_).toBe(value);
      }
      {
        const value = 32767;
        await client.writeSymbol('GVL_Write.ComplexTypes.UNION_2.INT_', value);

        const res = await client.readSymbol('GVL_Write.ComplexTypes.UNION_2');
        expect(res.value.INT_).toBe(value);
      }
      {
        const value = 3.14;
        await client.writeSymbol('GVL_Write.ComplexTypes.UNION_3.REAL_', value);

        const res = await client.readSymbol('GVL_Write.ComplexTypes.UNION_3');
        expect(res.value.REAL_).toBeCloseTo(value);
      }
    });

    test('writing FUNCTION_BLOCK', async () => {
      {
        const value = {
          Data: ST_STANDARD_TYPES_WRITE,
          StrValue: ''
        };
        await client.writeSymbol('GVL_Write.ComplexTypes.BLOCK_', value);

        const res = await client.readSymbol('GVL_Write.ComplexTypes.BLOCK_');
        expect(res.value).toStrictEqual(value);
      }
      {
        const value = {
          ET: 0,
          IN: false,
          M: false,
          PT: 2500,
          Q: false,
          StartTime: 0
        };
        await client.writeSymbol('GVL_Write.ComplexTypes.BLOCK_2', value);

        const res = await client.readSymbol('GVL_Write.ComplexTypes.BLOCK_2');
        expect(res.value).toStrictEqual(value);
      }
      {
        const value = {
          sNetId: '',
          sPathName: 'C:\\Test',
          ePath: {
            name: 'PATH_GENERIC',
            value: 1
          },
          bExecute: false,
          tTimeout: 5000,
          bBusy: false,
          bError: false,
          nErrId: 0
        };
        await client.writeSymbol('GVL_Write.ComplexTypes.BLOCK_3', value);

        const res = await client.readSymbol('GVL_Write.ComplexTypes.BLOCK_3');
        expect(res.value).toStrictEqual(value);
      }
      {
        const value = {
          bRead: false,
          sNetId: '',
          nPort: 851,
          sVarName: 'GVL_Test.Variable',
          nDestAddr: 0n,
          nLen: 0,
          tTimeout: 5000,
          eComMode: { name: 'eAdsComModeSecureCom', value: 0 },
          bClearOnError: true,
          bBusy: false,
          bError: false,
          nErrorId: 0,
          sVarName_Int: '',
          sNetId_Int: '',
          nPort_Int: 801,
          fbGetHandle: {
            NETID: '',
            PORT: 0,
            IDXGRP: 0,
            IDXOFFS: 0,
            WRITELEN: 0,
            READLEN: 0,
            SRCADDR: 0n,
            DESTADDR: 0n,
            WRTRD: false,
            TMOUT: 5000,
            BUSY: false,
            ERR: false,
            ERRID: 0
          },
          fbReleaseHandle: {
            NETID: '',
            PORT: 0,
            IDXGRP: 0,
            IDXOFFS: 0,
            LEN: 0,
            SRCADDR: 0n,
            WRITE: false,
            TMOUT: 5000,
            BUSY: false,
            ERR: false,
            ERRID: 0
          },
          fbReadByHandle: {
            NETID: '',
            PORT: 0,
            IDXGRP: 0,
            IDXOFFS: 0,
            LEN: 0,
            DESTADDR: 0n,
            READ: false,
            TMOUT: 5000,
            BUSY: false,
            ERR: false,
            ERRID: 0
          },
          trigRead: { CLK: false, Q: false, M: false },
          iStep: 0,
          iNextStep: 0,
          nSymbolHandle: 0
        };
        await client.writeSymbol('GVL_Write.ComplexTypes.BLOCK_4', value);

        const res = await client.readSymbol('GVL_Write.ComplexTypes.BLOCK_4');
        expect(res.value).toStrictEqual(value);
      }
    });

    test('writing INTERFACE', async () => {
      {
        const { value } = await client.readSymbol('GVL_Read.ComplexTypes.INTERFACE_');
        await client.writeSymbol('GVL_Write.ComplexTypes.INTERFACE_', value);
        const res = await client.readSymbol('GVL_Write.ComplexTypes.INTERFACE_');
        expect(res.value).toStrictEqual(value);
      }
    });
  });

  describe('writing complex array values', () => {
    test('writing ARRAY OF STRUCT', async () => {
      {
        await client.writeSymbol('GVL_Write.ComplexArrayTypes.STRUCT_', [
          ST_STANDARD_TYPES_WRITE,
          ST_STANDARD_TYPES_WRITE,
          ST_STANDARD_TYPES_WRITE
        ]);

        const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.STRUCT_');
        expect(res.value).toStrictEqual([
          ST_STANDARD_TYPES,
          ST_STANDARD_TYPES,
          ST_STANDARD_TYPES
        ]);
      }
      {
        await client.writeSymbol('GVL_Write.ComplexArrayTypes.STRUCT_2', [
          ST_STANDARD_ARRAY_TYPES_WRITE,
          ST_STANDARD_ARRAY_TYPES_WRITE,
          ST_STANDARD_ARRAY_TYPES_WRITE
        ]);

        const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.STRUCT_2');
        expect(res.value).toStrictEqual([
          ST_STANDARD_ARRAY_TYPES,
          ST_STANDARD_ARRAY_TYPES,
          ST_STANDARD_ARRAY_TYPES
        ]);
      }
    });

    test('writing ARRAY OF ALIAS', async () => {
      {
        await client.writeSymbol('GVL_Write.ComplexArrayTypes.ALIAS_', [
          ST_STANDARD_TYPES_WRITE,
          ST_STANDARD_TYPES_WRITE,
          ST_STANDARD_TYPES_WRITE
        ]);

        const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.ALIAS_');
        expect(res.value).toStrictEqual([
          ST_STANDARD_TYPES,
          ST_STANDARD_TYPES,
          ST_STANDARD_TYPES
        ]);
      }
    });

    test('writing ARRAY OF ENUM', async () => {
      {
        const value = [
          {
            name: 'Running',
            value: 100
          },
          {
            name: 'Disabled',
            value: 0
          },
          {
            name: 'Stopping',
            value: 200
          }
        ];

        await client.writeSymbol('GVL_Write.ComplexArrayTypes.ENUM_', value);

        const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.ENUM_');
        expect(res.value).toStrictEqual(value);
      }
      {
        const value = [
          {
            name: 'Unknown',
            value: -99
          },
          {
            name: 'Disabled',
            value: 0
          },
          {
            name: 'Starting',
            value: 50
          }
        ];
        await client.writeSymbol('GVL_Write.ComplexArrayTypes.ENUM_2', value);

        const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.ENUM_2');
        expect(res.value).toStrictEqual(value);
      }
      {
        const value = [
          {
            name: '',
            value: 5555
          },
          {
            name: 'Disabled',
            value: 0
          },
          {
            name: 'Unknown',
            value: -99
          }
        ];
        await client.writeSymbol('GVL_Write.ComplexArrayTypes.ENUM_3', value);

        const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.ENUM_3');
        expect(res.value).toStrictEqual(value);
      }
      {
        const value = [
          {
            name: 'Negative',
            value: -9223372036854775808n
          },
          {
            name: 'Zero',
            value: 0n
          },
          {
            name: 'Positive',
            value: 9223372036854775807n
          }
        ];
        await client.writeSymbol('GVL_Write.ComplexArrayTypes.ENUM_4', value);

        const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.ENUM_4');
        expect(res.value).toMatchObject(value);
      }
      {
        const value = [
          {
            name: 'Values',
            value: 2
          },
          {
            name: 'Implicit',
            value: 0
          },
          {
            name: 'Here',
            value: 4
          }
        ];
        await client.writeSymbol('GVL_Write.ComplexArrayTypes.ENUM_5', value);

        const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.ENUM_5');
        expect(res.value).toStrictEqual(value);
      }
    });

    test('writing ARRAY OF POINTER (address)', async () => {
      //Note: This writes pointer address, not dereferenced value
      const { value } = await client.readSymbol('GVL_Read.ComplexTypes.POINTER_');

      const arrayValue = [
        value,
        0n,
        value
      ];

      await client.writeSymbol('GVL_Write.ComplexArrayTypes.POINTER_', arrayValue);

      const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.POINTER_');
      expect(res.value).toStrictEqual(arrayValue);
    });

    test('writing ARRAY OF SUBRANGE', async () => {
      {
        const value = [1234, 0, -1234];
        await client.writeSymbol('GVL_Write.ComplexArrayTypes.SUBRANGE_', value);

        const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.SUBRANGE_');
        expect(res.value).toStrictEqual(value);
      }
    });

    test('writing ARRAY OF UNION', async () => {
      {
        const { value } = await client.readSymbol('GVL_Read.ComplexArrayTypes.UNION_');

        await client.writeSymbol('GVL_Write.ComplexArrayTypes.UNION_', value);

        const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.UNION_');
        expect(res.value).toStrictEqual(value);
      }
    });

    test('writing ARRAY OF FUNCTION_BLOCK', async () => {
      {
        await client.writeSymbol('GVL_Write.ComplexArrayTypes.BLOCK_', [
          {
            Data: ST_STANDARD_TYPES_WRITE,
            StrValue: 'First'
          },
          {
            Data: ST_STANDARD_TYPES_WRITE,
            StrValue: ''
          },
          {
            Data: ST_STANDARD_TYPES_WRITE,
            StrValue: 'Third'
          }
        ]);


        const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.BLOCK_');
        expect(res.value).toStrictEqual([
          {
            Data: ST_STANDARD_TYPES,
            StrValue: 'First'
          },
          {
            Data: ST_STANDARD_TYPES,
            StrValue: ''
          },
          {
            Data: ST_STANDARD_TYPES,
            StrValue: 'Third'
          }
        ]);
      }
      {
        const base = {
          ET: 0,
          IN: false,
          M: false,
          PT: 0,
          Q: false,
          StartTime: 0
        };

        const value = [
          {
            ...base,
            PT: 2500
          },
          base,
          {
            ...base,
            PT: 123000,
          }
        ];
        await client.writeSymbol('GVL_Write.ComplexArrayTypes.BLOCK_2', value);

        const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.BLOCK_2');


        expect(res.value).toStrictEqual(value);
      }
      {
        const base = {
          sNetId: '',
          sPathName: '',
          ePath: {
            name: 'PATH_GENERIC',
            value: 1
          },
          bExecute: false,
          tTimeout: 5000,
          bBusy: false,
          bError: false,
          nErrId: 0
        };

        const value = [
          {
            ...base,
            sPathName: 'C:\\Test'
          },
          base,
          {
            ...base,
            sPathName: 'C:\\AnotherTest'
          },
        ];
        await client.writeSymbol('GVL_Write.ComplexArrayTypes.BLOCK_3', value);

        const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.BLOCK_3');
        expect(res.value).toStrictEqual(value);
      }
      {
        const value = [
          {
            ...BLOCK_4,
            sVarName: 'GVL_Test.Variable',
          },
          BLOCK_4,
          {
            ...BLOCK_4,
            sVarName: 'GVL_Test.AnotherVariable',
          },
        ];
        await client.writeSymbol('GVL_Write.ComplexArrayTypes.BLOCK_4', value);

        const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.BLOCK_4');
        expect(res.value).toStrictEqual(value);
      }
    });

    test('writing ARRAY OF INTERFACE', async () => {
      {
        const { value } = await client.readSymbol('GVL_Read.ComplexTypes.INTERFACE_');
        const arrayValue = [
          value,
          0n,
          value
        ];

        await client.writeSymbol('GVL_Write.ComplexArrayTypes.INTERFACE_', arrayValue);

        const res = await client.readSymbol('GVL_Write.ComplexArrayTypes.INTERFACE_');
        expect(res.value).toStrictEqual(arrayValue);
      }
    });
  });

  describe('writing special types / cases', () => {

    test('writing ARRAY with negative index', async () => {
      const { value } = await client.readSymbol('GVL_Read.SpecialTypes.NegativeIndexArray');
      await client.writeSymbol('GVL_Write.SpecialTypes.NegativeIndexArray', value);

      const res = await client.readSymbol('GVL_Write.SpecialTypes.NegativeIndexArray');
      expect(res.value).toBeInstanceOf(Array);
      expect(res.value).toHaveLength(201);
      expect(res.value[0]).toBeCloseTo(1.11);
      expect(res.value[100]).toBeCloseTo(5.55);
      expect(res.value[200]).toBeCloseTo(9.99);
    });

    test('writing multi-dimensional ARRAY', async () => {
      const { value } = await client.readSymbol('GVL_Read.SpecialTypes.MultiDimensionalArray');
      await client.writeSymbol('GVL_Write.SpecialTypes.MultiDimensionalArray', value);

      const res = await client.readSymbol('GVL_Write.SpecialTypes.MultiDimensionalArray');
      expect(res.value).toStrictEqual(value);
    });

    test('writing ARRAY OF ARRAY', async () => {
      const { value } = await client.readSymbol('GVL_Read.SpecialTypes.ArrayOfArrays');
      await client.writeSymbol('GVL_Write.SpecialTypes.ArrayOfArrays', value);

      const res = await client.readSymbol('GVL_Write.SpecialTypes.ArrayOfArrays');
      expect(res.value).toBeInstanceOf(Array);
      expect(res.value).toHaveLength(3);
      expect(res.value).toStrictEqual(value);
    });

    test(`writing STRUCT with pragma: {attribute 'pack_mode' := '1'}`, async () => {
      {
        const { value } = await client.readSymbol('GVL_Read.SpecialTypes.PackMode1');
        await client.writeSymbol('GVL_Write.SpecialTypes.PackMode1', value);

        const res = await client.readSymbol('GVL_Write.SpecialTypes.PackMode1');

        expect(res.value).toStrictEqual(value);
      }

      //TODO: complex struct
    });

    test(`writing STRUCT with pragma: {attribute 'pack_mode' := '8'}`, async () => {
      {
        const { value } = await client.readSymbol('GVL_Read.SpecialTypes.PackMode8');
        await client.writeSymbol('GVL_Write.SpecialTypes.PackMode8', value);

        const res = await client.readSymbol('GVL_Write.SpecialTypes.PackMode8');

        expect(res.value).toStrictEqual(value);
      }

      //TODO: complex struct
    });

    test(`writing an empty FUNCTION_BLOCK`, async () => {
      {
        await client.writeSymbol('GVL_Write.SpecialTypes.EmptyBlock', {});
      }
    });

    test(`writing an empty STRUCT`, async () => {
      {
        await client.writeSymbol('GVL_Write.SpecialTypes.EmptyStruct', {});
      }
    });
  });

  describe('writing dereferenced POINTER and REFERENCE values', () => {
    test('writing POINTER (value)', async () => {
      const value = await client.convertToRaw(ST_STANDARD_TYPES_WRITE, 'ST_StandardTypes');

      const handle = await client.createVariableHandle('GVL_Write.ComplexTypes.POINTER_^');
      await client.writeRawByHandle(handle, value);
      const res = await client.readRawByHandle(handle);
      await client.deleteVariableHandle(handle);

      expect(value).toStrictEqual(res);
    });

    test('writing REFERENCE (value)', async () => {
      const value = await client.convertToRaw(ST_STANDARD_TYPES_WRITE, 'ST_StandardTypes');

      const handle = await client.createVariableHandle('GVL_Write.ComplexTypes.REFERENCE_');
      await client.writeRawByHandle(handle, value);
      const res = await client.readRawByHandle(handle);
      await client.deleteVariableHandle(handle);

      expect(value).toStrictEqual(res);
    });
  });

  describe('writing raw data', () => {

    test('writing a raw value', async () => {
      {
        //Only testing once, as this is used internally in writeSymbol(), which is tested very well
        const symbolInfo = await client.getSymbolInfo('GVL_Write.StandardTypes.BOOL_');

        const value = await client.convertToRaw(!ST_STANDARD_TYPES.BOOL_, 'BOOL');
        await client.writeRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, value);

        const res = await client.readSymbol('GVL_Write.StandardTypes.BOOL_');
        expect(res.value).toStrictEqual(!ST_STANDARD_TYPES.BOOL_);
      }
    });
  });

  describe('using variable handles for reading and writing', () => {
    test('creating and deleting a varible handle', async () => {
      {
        const res = await client.createVariableHandle('GVL_Read.StandardTypes.BOOL_');

        //Note: checking only keys
        //TODO: Check values (is UM runtime having issue?)
        expect(Object.keys(res)).toStrictEqual(Object.keys({
          handle: 0,
          size: 0,
          typeDecoration: 0,
          dataType: ''
        }));

        await client.deleteVariableHandle(res);
      }

      {
        const res = await client.createVariableHandle('GVL_Read.StandardTypes.BOOL_');

        await client.deleteVariableHandle(res.handle);
      }
    });

    test('reading value using a variable handle', async () => {
      {
        const handle = await client.createVariableHandle('GVL_Read.StandardTypes.BOOL_');
        const res = await client.readRawByHandle(handle);
        await client.deleteVariableHandle(handle);

        expect(Buffer.isBuffer(res)).toBe(true);
        expect(res.byteLength).toBe(1);

        const compare = Buffer.alloc(1);
        compare.writeUInt8(1);
        expect(res).toStrictEqual(compare);

        const value = await client.convertFromRaw(res, 'BOOL');
        expect(value).toBe(ST_STANDARD_TYPES.BOOL_);
      }
    });

    test('writing value using a variable handle', async () => {
      {
        const value = !ST_STANDARD_TYPES_WRITE.BOOL_;

        const handle = await client.createVariableHandle('GVL_Write.StandardTypes.BOOL_');
        await client.writeRawByHandle(handle, await client.convertToRaw(value, 'BOOL'));
        await client.deleteVariableHandle(handle);

        const res = await client.readSymbol('GVL_Write.StandardTypes.BOOL_');

        expect(res.value).toBe(value);
      }
      {
        const value = ST_STANDARD_TYPES_WRITE.BOOL_;

        const handle = await client.createVariableHandle('GVL_Write.StandardTypes.BOOL_');
        await client.writeRawByHandle(handle, await client.convertToRaw(value, 'BOOL'));
        await client.deleteVariableHandle(handle);

        const res = await client.readSymbol('GVL_Write.StandardTypes.BOOL_');

        expect(res.value).toBe(value);
      }
    });
  });

});

describe('subscriptions (ADS notifications)', () => {
  test('subscribing and unsubscribing successfully', async () => {
    await new Promise(async (resolve, reject) => {
      let startTime = Date.now();

      await client.subscribe({
        target: 'GVL_Subscription.Numericvalue_Constant',
        maxDelay: 2000,
        callback: async (data, subscription) => {
          await subscription.unsubscribe();

          const timeDiff = Date.now() - startTime;

          expect(data.value).toBe(12245);

          //First value should be received after 2000ms at earliest
          if (timeDiff >= 2000) {
            resolve();
          } else {
            reject(`Failed - value was received after ${timeDiff} ms (should be after 2000 ms)`);
          }

        }
      });
    });
  });

  test('subscribing to a changing value (10 ms) with default cycle time', async () => {
    await new Promise(async (resolve, reject) => {
      //Idea is to check that count has not changed since unsubscription
      let count = 0;

      await client.subscribe({
        target: 'GVL_Subscription.NumericValue_1000ms',
        callback: async (data, subscription) => {
          count++;

          if (count >= 2) {
            await subscription.unsubscribe();

            setTimeout(() => {
              if (count === 2) {
                //success
                resolve()

              } else {
                reject('Unsubscribing failed')
              }
            }, 2000)
          }
        }
      });
    });
  });

  test('subscribing to a changing value (10 ms) with 10 ms cycle time', async () => {
    let subscription = null;

    await new Promise(async (resolve, reject) => {
      let firstData = null;

      subscription = await client.subscribe({
        target: 'GVL_Subscription.NumericValue_10ms',
        cycleTime: 10,
        callback: async (data, subscription) => {
          if (!firstData) {
            firstData = data;

          } else {
            const timeDiff = data.timestamp.getTime() - firstData.timestamp.getTime();

            if (data.value === firstData.value + 1 && timeDiff > 5 && timeDiff < 15) {
              resolve();
            } else {
              reject(`Failed - received value of ${data.value} with ${timeDiff} ms time difference. Expected was ${firstData.value + 1} with time difference between 5...15 ms`);
            }
          }
        }
      });
    });

    await subscription.unsubscribe();
  });

  test('subscribing to a constant value with maximum delay of 2000 ms', async () => {
    let subscription = null;

    await new Promise(async (resolve, reject) => {
      let startTime = Date.now();

      subscription = await client.subscribe({
        target: 'GVL_Subscription.Numericvalue_Constant',
        maxDelay: 2000,
        callback: async (data, subscription) => {
          const timeDiff = Date.now() - startTime;

          expect(data.value).toBe(12245);

          //First value should be received after 2000ms at earliest
          if (timeDiff >= 2000 && timeDiff < 2300) {
            resolve();
          } else {
            reject(`Failed - value was received after ${timeDiff} ms (target 2000...2300)`);
          }
        }
      });
    });

    await subscription.unsubscribe();
  });

  test('subscribing to a raw ADS address', async () => {

    let subscription = null;

    await new Promise(async (resolve, reject) => {
      const symbolInfo = await client.getSymbolInfo('GVL_Subscription.NumericValue_100ms');

      let startTime = Date.now();

      subscription = await client.subscribe({
        target: {
          indexGroup: symbolInfo.indexGroup,
          indexOffset: symbolInfo.indexOffset,
          size: symbolInfo.size
        },
        callback: async (data, subscription) => {
          expect(Buffer.isBuffer(data.value)).toBe(true);
          resolve();
        }
      });
    });

    await subscription.unsubscribe();
  });
});

describe('issue specific tests', () => {
  describe('issue 103 (https://github.com/jisotalo/ads-client/issues/103)', () => {
    test('calling unsubscribeAll() multiple times (should not crash to unhandled exception)', async () => {

      const target = {
        target: 'GVL_Subscription.Numericvalue_Constant',
        callback: () => { }
      };

      await client.subscribe(target);
      await client.subscribe(target);
      await client.subscribe(target);
      await client.subscribe(target);
      await client.subscribe(target);

      //calling multiple times
      const promises = [
        client.unsubscribeAll(),
        client.unsubscribeAll(),
        client.unsubscribeAll(),
        client.unsubscribeAll()
      ]

      try {
        await Promise.all(promises)
      } catch { }

      //If we are here, there was no unhandled exception -> issue OK
      expect(true).toBe(true)
    })
  })
});

describe('finalizing', () => {
  test('disconnecting', async () => {
    if (client?.connection.connected) {
      const task = client.disconnect()
      expect(task).resolves.toBeUndefined()
    }
  })
})
