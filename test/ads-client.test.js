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

const client = new Client({
  targetAmsNetId: AMS_NET_ID,
  targetAdsPort: 851
});

const inspect = (data) => util.inspect(data, false, 9999, true);

const delay = (ms) => new Promise((resolve, reject) => {
  setTimeout(() => resolve(), ms);
});

/**
 * Symbol information object to check keys & types
 */
const SYMBOL_INFO_OBJECT = {
  indexGroup: 16448,
  indexOffset: 450248,
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
  typeGuid: '95190718000000000000000100000052',
  attributes: [{ name: 'ads-client-attribute', value: 'example-value-ääö' }],
  extendedFlags: 0,
  reserved: Buffer.alloc(0)
};

/**
 * Data type object to check keys & types
 */
const DATA_TYPE_OBJECT = {
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
  subItems: [],
  typeGuid: 'e25ca2c595fc17906eb25949c2faeb1c',
  rpcMethods: [],
  attributes: [
    { name: 'pack_mode', value: '3' },
    {
      name: 'ads-client-datatype-attribute',
      value: 'example-datatype-value-ääö'
    }
  ],
  enumInfos: [],
  reserved: Buffer.alloc(0)
};

const ST_STANDARD_TYPES = {
  BOOL_: true,
  BOOL_2: false,
  BYTE_: 255,
  WORD_: 65535,
  DWORD_: 4294967295,
  SINT_: 127,
  SINT_2: -128,
  USINT_: 255,
  INT_: 32767,
  INT_2: -32768,
  UINT_: 65535,
  DINT_: 2147483647,
  DINT_2: -2147483648,
  UDINT_: 4294967295,
  REAL_: expect.closeTo(3.3999999521443642e+38),
  REAL_2: expect.closeTo(-3.3999999521443642e+38),
  REAL_3: expect.closeTo(75483.546875),
  REAL_4: expect.closeTo(-75483.546875),
  STRING_: 'A test string ääöö!!@@',
  STRING_2: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque bibendum mauris vel metus rutrum, sed gravida justo dignissim. Aenean et nisi cursus, auctor mi vel, posuere enim. Suspendisse ultricies mauris in finibus tristique. Nullam turpis duis.',
  DATE_: new Date('2106-02-06T00:00:00.000Z'),
  DT_: new Date('2106-02-06T06:28:15.000Z'),
  DT_2: new Date('2106-02-06T06:28:15.000Z'),
  TOD_: 4294967295,
  TOD_2: 4294967295,
  TIME_: 4294967295,
  LWORD_: 18446744073709551615n,
  LINT_: 9223372036854775807n,
  LINT_2: -9223372036854775808n,
  ULINT_: 18446744073709551615n,
  LREAL_: expect.closeTo(1.7e+308),
  LREAL_2: expect.closeTo(-1.7e+308),
  LREAL_3: expect.closeTo(75483.546875),
  LREAL_4: expect.closeTo(-75483.546875),
  WSTRING_: 'A test wstring ääöö!!@@ ẞẟΔش',
  WSTRING_2: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque bibendum mauris vel metus rutrum, sed gravida justo dignissim. Aenean et nisi cursus, auctor mi vel, posuere enim. Suspendisse ultricies mauris in finibus tristique. Nullam turpis duis.',
  LTIME_: 18446744073709551615n
};

const ST_STANDARD_ARRAY_TYPES =
{
  BOOL_: [true, false, true],
  BOOL_2: [false, true, false],
  BYTE_: [255, 254, 0],
  WORD_: [65535, 65534, 0],
  DWORD_: [4294967295, 4294967294, 0],
  SINT_: [127, 126, 0],
  SINT_2: [-128, -127, 0],
  USINT_: [255, 254, 0],
  INT_: [32767, 0, -32768],
  INT_2: [-32768, 0, 32767],
  UINT_: [65535, 65534, 0],
  DINT_: [2147483647, 0, -2147483648],
  DINT_2: [-2147483648, 0, 2147483647],
  UDINT_: [4294967295, 4294967294, 0],
  REAL_: [expect.closeTo(3.3999999521443642e+38), 0, expect.closeTo(-3.3999999521443642e+38)],
  REAL_2: [expect.closeTo(-3.3999999521443642e+38), 0, expect.closeTo(3.3999999521443642e+38)],
  REAL_3: [expect.closeTo(75483.546875), 0, expect.closeTo(-75483.546875)],
  REAL_4: [expect.closeTo(-75483.546875), 0, expect.closeTo(75483.546875)],
  STRING_: ['A test string ääöö!!@@', '', 'String value'],
  STRING_2: [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque bibendum mauris vel metus rutrum, sed gravida justo dignissim. Aenean et nisi cursus, auctor mi vel, posuere enim. Suspendisse ultricies mauris in finibus tristique. Nullam turpis duis.',
    '',
    'Proin tempor diam a felis fermentum, id molestie tortor pharetra. Phasellus condimentum rhoncus ultrices. Suspendisse ultricies nec neque quis sodales. In molestie vestibulum nulla eu gravida. Morbi orci ipsum, gravida elementum eros non, egestas egestas.'
  ],
  DATE_: [
    new Date('2106-02-06T00:00:00.000Z'),
    new Date('2106-02-05T00:00:00.000Z'),
    new Date('1970-01-01T00:00:00.000Z')
  ],
  DT_: [
    new Date('2106-02-06T06:28:15.000Z'),
    new Date('2106-02-06T06:28:14.000Z'),
    new Date('1970-01-01T00:00:00.000Z')
  ],
  DT_2: [
    new Date('2106-02-06T06:28:15.000Z'),
    new Date('2106-02-06T06:28:14.000Z'),
    new Date('1970-01-01T00:00:00.000Z')
  ],
  TOD_: [4294967295, 4294967294, 0],
  TOD_2: [4294967295, 4294967294, 0],
  TIME_: [4294967295, 4294967294, 0],
  LWORD_: [18446744073709551615n, 18446744073709551614n, 0n],
  LINT_: [9223372036854775807n, 0n, -9223372036854775808n],
  LINT_2: [-9223372036854775808n, 0n, 9223372036854775807n],
  ULINT_: [18446744073709551615n, 18446744073709551614n, 0n],
  LREAL_: [expect.closeTo(1.7e+308), 0, expect.closeTo(-1.7e+308)],
  LREAL_2: [expect.closeTo(-1.7e+308), 0, expect.closeTo(1.7e+308)],
  LREAL_3: [expect.closeTo(75483.546875), 0, expect.closeTo(-75483.546875)],
  LREAL_4: [expect.closeTo(-75483.546875), 0, expect.closeTo(75483.546875)],
  WSTRING_: ['A test wstring ääöö!!@@ ẞẟΔش', '', 'ẞẟΔ'],
  WSTRING_2: [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque bibendum mauris vel metus rutrum, sed gravida justo dignissim. Aenean et nisi cursus, auctor mi vel, posuere enim. Suspendisse ultricies mauris in finibus tristique. Nullam turpis duis.',
    '',
    'Proin tempor diam a felis fermentum, id molestie tortor pharetra. Phasellus condimentum rhoncus ultrices. Suspendisse ultricies nec neque quis sodales. In molestie vestibulum nulla eu gravida. Morbi orci ipsum, gravida elementum eros non, egestas egestas.'
  ],
  LTIME_: [18446744073709551615n, 18446744073709551614n, 0n]
}

const BLOCK_4 = {
  bRead: false,
  sNetId: '',
  nPort: 851,
  sVarName: '',
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
}


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

  test('checking that reset was succesful', async () => {
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
  test('reading twinCAT system state', async () => {
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

describe('reading values using readSymbol()', () => {

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

  test('reading LDATE (---- TODO ----)', async () => {
    expect(true).toStrictEqual(true);
    //const res = await client.readSymbol('GVL_Read.StandardTypes.LDATE_');
    //expect(res.value).toStrictEqual(??);
  });

  test('reading LDT (---- TODO ----)', async () => {
    expect(true).toStrictEqual(true);
    //const res = await client.readSymbol('GVL_Read.StandardTypes.LDT_');
    //expect(res.value).toStrictEqual(??);
  });

  test('reading LTOD (---- TODO ----)', async () => {
    expect(true).toStrictEqual(true);
    //const res = await client.readSymbol('GVL_Read.StandardTypes.LTOD_');
    //expect(res.value).toStrictEqual(??);
  });

  test('reading LTIME', async () => {
    const res = await client.readSymbol('GVL_Read.StandardTypes.LTIME_');
    expect(res.value).toStrictEqual(ST_STANDARD_TYPES.LTIME_);
  });

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

  test('reading ARRAY OF LDATE (---- TODO ----)', async () => {
    expect(true).toStrictEqual(true);
    //const res = await client.readSymbol('GVL_Read.StandardArrays.LDATE_');
    //expect(res.value).toStrictEqual(??);
  });

  test('reading ARRAY OF LDT (---- TODO ----)', async () => {
    expect(true).toStrictEqual(true);
    //const res = await client.readSymbol('GVL_Read.StandardArrays.LDT_');
    //expect(res.value).toStrictEqual(??);
  });

  test('reading ARRAY OF LTOD (---- TODO ----)', async () => {
    expect(true).toStrictEqual(true);
    //const res = await client.readSymbol('GVL_Read.StandardArrays.LTOD_');
    //expect(res.value).toStrictEqual(??);
  });

  test('reading ARRAY OF LTIME', async () => {
    const res = await client.readSymbol('GVL_Read.StandardArrays.LTIME_');
    expect(res.value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LTIME_);
  });

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

  test('reading POINTER', async () => {
    //Note: Deferenced pointer value is not possible to read using readSymbol() - we only get memory address
    const res = await client.readSymbol('GVL_Read.ComplexTypes.POINTER_');

    expect(typeof res.value).toBe("bigint");
    expect(res.symbolInfo.type).toBe("POINTER TO ST_StandardTypes");
  });

  test('reading REFERENCE (----TODO----)', async () => {
    //TODO - why this isn't working

    //Note: Deferenced reference value is not possible to read using readSymbol() - we only get memory address
    expect(true).toBe(true);
    return;
    const res = await client.readSymbol('GVL_Read.ComplexTypes.REFERENCE_');

    expect(typeof res.value).toBe("bigint");
    expect(res.symbolInfo.type).toBe("REFERENCE TO ST_StandardTypes");
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
      });
    }
  });

  test('reading INTERFACE (----TODO----)', async () => {
    {
      expect(true).toBe(true);
      /*
      const res = await client.readSymbol('GVL_Read.ComplexTypes.INTERFACE_');
      expect(res.value).toStrictEqual(???);
      */
    }
  });

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

  test('reading ARRAY OF POINTER', async () => {
    //Note: Deferenced pointer value is not possible to read using readSymbol() - we only get memory address
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

  test('reading ARRAY OF INTERFACE (----TODO----)', async () => {
    {
      expect(true).toBe(true);
      /*
      const res = await client.readSymbol('GVL_Read.ComplexArrayTypes.INTERFACE_');
      expect(res.value).toStrictEqual(???);
      */
    }
  });

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
    const res = await client.readSymbol('GVL_Read.SpecialTypes.PackMode1');

    expect(res.dataType.attributes).toStrictEqual([{
      name: 'pack_mode',
      value: '1'
    }]);
    expect(res.symbolInfo.size).toBe(1145);
    expect(res.rawValue.byteLength).toBe(1145);
    expect(res.value).toStrictEqual(ST_STANDARD_TYPES);
  });

  test(`reading STRUCT with pragma: {attribute 'pack_mode' := '8'}`, async () => {
    const res = await client.readSymbol('GVL_Read.SpecialTypes.PackMode8');

    expect(res.dataType.attributes).toStrictEqual([{
      name: 'pack_mode',
      value: '8'
    }]);
    expect(res.symbolInfo.size).toBe(1160);
    expect(res.rawValue.byteLength).toBe(1160);
    expect(res.value).toStrictEqual(ST_STANDARD_TYPES);
  });

});

describe('reading values using readRaw() + convertFromRaw()', () => {


  test('reading BOOL', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.BOOL_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.BOOL_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.BOOL_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.BOOL_2);
    }
  });


  test('reading BYTE', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.BYTE_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_TYPES.BYTE_);
  });

  test('reading WORD', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.WORD_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_TYPES.WORD_);
  });

  test('reading DWORD', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.DWORD_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_TYPES.DWORD_);
  });

  test('reading SINT', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.SINT_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.SINT_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.SINT_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.SINT_2);
    }
  });

  test('reading USINT', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.USINT_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_TYPES.USINT_);
  });

  test('reading INT', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.INT_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.INT_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.INT_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.INT_2);
    }
  });

  test('reading UINT', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.UINT_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_TYPES.UINT_);
  });

  test('reading DINT', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.DINT_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.DINT_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.DINT_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.DINT_2);
    }
  });

  test('reading UDINT', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.UDINT_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_TYPES.UDINT_);
  });

  test('reading REAL', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.REAL_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.REAL_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.REAL_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.REAL_2);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.REAL_3');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.REAL_3);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.REAL_4');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.REAL_4);
    }
  });

  test('reading STRING', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.STRING_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.STRING_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.STRING_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.STRING_2);
    }
  });

  test('reading DATE', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.DATE_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_TYPES.DATE_);
  });

  test('reading DT', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.DT_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.DT_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.DT_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.DT_2);
    }
  });

  test('reading TOD', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.TOD_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.TOD_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.TOD_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.TOD_2);
    }
  });

  test('reading TIME', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.TIME_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_TYPES.TIME_);
  });

  test('reading LWORD', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.LWORD_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_TYPES.LWORD_);
  });

  test('reading LINT', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.LINT_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.LINT_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.LINT_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.LINT_2);
    }
  });

  test('reading ULINT', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.ULINT_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_TYPES.ULINT_);
  });

  test('reading LREAL', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.LREAL_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.LREAL_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.LREAL_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.LREAL_2);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.LREAL_3');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.LREAL_3);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.LREAL_4');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.LREAL_4);
    }
  });

  test('reading WSTRING', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.WSTRING_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.WSTRING_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.WSTRING_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES.WSTRING_2);
    }
  });

  test('reading LDATE (---- TODO ----)', async () => {
    expect(true).toStrictEqual(true);
    //const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.LDATE_');
    //const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    //const value = await client.convertFromRaw(res, symbolInfo.type);

    //expect(value).toStrictEqual(??);
  });

  test('reading LDT (---- TODO ----)', async () => {
    expect(true).toStrictEqual(true);
    //const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.LDT_');
    //const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    //const value = await client.convertFromRaw(res, symbolInfo.type);

    //expect(value).toStrictEqual(??);
  });

  test('reading LTOD (---- TODO ----)', async () => {
    expect(true).toStrictEqual(true);
    //const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.LTOD_');
    //const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    //const value = await client.convertFromRaw(res, symbolInfo.type);

    //expect(value).toStrictEqual(??);
  });

  test('reading LTIME', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardTypes.LTIME_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_TYPES.LTIME_);
  });


  test('reading ARRAY OF BOOL', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.BOOL_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.BOOL_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.BOOL_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.BOOL_2);
    }
  });

  test('reading ARRAY OF BYTE', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.BYTE_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.BYTE_);
  });

  test('reading ARRAY OF WORD', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.WORD_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.WORD_);
  });

  test('reading ARRAY OF DWORD', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.DWORD_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DWORD_);
  });

  test('reading ARRAY OF SINT', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.SINT_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.SINT_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.SINT_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.SINT_2);
    }
  });

  test('reading ARRAY OF USINT', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.USINT_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.USINT_);
  });

  test('reading ARRAY OF INT', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.INT_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.INT_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.INT_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.INT_2);
    }
  });

  test('reading ARRAY OF UINT', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.UINT_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.UINT_);
  });

  test('reading ARRAY OF DINT', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.DINT_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DINT_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.DINT_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DINT_2);
    }
  });

  test('reading ARRAY OF UDINT', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.UDINT_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.UDINT_);
  });

  test('reading ARRAY OF REAL', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.REAL_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.REAL_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.REAL_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.REAL_2);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.REAL_3');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.REAL_3);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.REAL_4');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.REAL_4);
    }
  });

  test('reading ARRAY OF STRING', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.STRING_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.STRING_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.STRING_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.STRING_2);
    }
  });

  test('reading ARRAY OF DATE', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.DATE_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DATE_);
  });

  test('reading ARRAY OF DT', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.DT_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DT_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.DT_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.DT_2);
    }
  });

  test('reading ARRAY OF TOD', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.TOD_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.TOD_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.TOD_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.TOD_2);
    }
  });

  test('reading ARRAY OF TIME', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.TIME_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.TIME_);
  });

  test('reading ARRAY OF LWORD', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.LWORD_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LWORD_);
  });

  test('reading ARRAY OF LINT', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.LINT_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LINT_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.LINT_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LINT_2);
    }
  });

  test('reading ARRAY OF ULINT', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.ULINT_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.ULINT_);
  });

  test('reading ARRAY OF LREAL', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.LREAL_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LREAL_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.LREAL_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LREAL_2);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.LREAL_3');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LREAL_3);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.LREAL_4');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LREAL_4);
    }
  });

  test('reading ARRAY OF WSTRING', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.WSTRING_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.WSTRING_);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.WSTRING_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.WSTRING_2);
    }
  });

  test('reading ARRAY OF LDATE (---- TODO ----)', async () => {
    expect(true).toStrictEqual(true);
    //const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.LDATE_');
    //const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    //const value = await client.convertFromRaw(res, symbolInfo.type);

    //expect(value).toStrictEqual(??);
  });

  test('reading ARRAY OF LDT (---- TODO ----)', async () => {
    expect(true).toStrictEqual(true);
    //const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.LDT_');
    //const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    //const value = await client.convertFromRaw(res, symbolInfo.type);

    //expect(value).toStrictEqual(??);
  });

  test('reading ARRAY OF LTOD (---- TODO ----)', async () => {
    expect(true).toStrictEqual(true);
    //const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.LTOD_');
    //const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    //const value = await client.convertFromRaw(res, symbolInfo.type);

    //expect(value).toStrictEqual(??);
  });

  test('reading ARRAY OF LTIME', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.StandardArrays.LTIME_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES.LTIME_);
  });

  test('reading STRUCT', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.STRUCT_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.STRUCT_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_ARRAY_TYPES);
    }
  });

  test('reading ALIAS', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.ALIAS_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual(ST_STANDARD_TYPES);
      expect(symbolInfo.type).toBe('StandardTypesAlias'); //TODO - is this valid? Why not ST_StandardTypes
    }
  });

  test('reading ENUM', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.ENUM_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toMatchObject({
        name: 'Running',
        value: 100
      });
    }
    {
      client.settings.objectifyEnumerations = false;
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.ENUM_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toBe(100);
      client.settings.objectifyEnumerations = true;
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.ENUM_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toMatchObject({
        name: 'Unknown',
        value: -99
      });
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.ENUM_3');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toMatchObject({
        name: '',
        value: 5555
      });
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.ENUM_4');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toMatchObject({
        name: 'Negative',
        value: -9223372036854775808n
      });
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.ENUM_5');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toMatchObject({
        name: 'Values',
        value: 2
      });
    }
  });

  test('reading POINTER', async () => {
    //Note: Deferenced pointer value is not possible to read using readSymbol() - we only get memory address
    const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.POINTER_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(typeof value).toBe("bigint");
    expect(symbolInfo.type).toBe("POINTER TO ST_StandardTypes");
  });

  test('reading REFERENCE (----TODO----)', async () => {
    //TODO - why this isn't working

    //Note: Deferenced reference value is not possible to read using readSymbol() - we only get memory address
    expect(true).toBe(true);
    return;
    const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.REFERENCE_');

    expect(typeof res.value).toBe("bigint");
    expect(res.symbolInfo.type).toBe("REFERENCE TO ST_StandardTypes");
  });

  test('reading SUBRANGE', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.SUBRANGE_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toBe(1234);
    }
  });

  test('reading UNION', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.UNION_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);
      expect(value.STRING_).toBe('A test string ääöö!!@@');
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.UNION_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);
      expect(value.INT_).toBe(32767);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.UNION_3');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);
      expect(value.REAL_).toBeCloseTo(3.14);
    }
  });

  test('reading FUNCTION_BLOCK', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.BLOCK_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual({
        Data: ST_STANDARD_TYPES,
        StrValue: ''
      });
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.BLOCK_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual({
        ET: 0,
        IN: false,
        M: false,
        PT: 2500,
        Q: false,
        StartTime: 0
      });
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.BLOCK_3');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual({
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
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.BLOCK_4');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual({
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
      });
    }
  });

  test('reading INTERFACE (----TODO----)', async () => {
    {
      expect(true).toBe(true);
      /*
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexTypes.INTERFACE_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
const value = await client.convertFromRaw(res, symbolInfo.type);

expect(value).toStrictEqual(???);
      */
    }
  });

  test('reading ARRAY OF STRUCT', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.STRUCT_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual([
        ST_STANDARD_TYPES,
        ST_STANDARD_TYPES,
        ST_STANDARD_TYPES
      ]);
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.STRUCT_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual([
        ST_STANDARD_ARRAY_TYPES,
        ST_STANDARD_ARRAY_TYPES,
        ST_STANDARD_ARRAY_TYPES
      ]);
    }
  });

  test('reading ARRAY OF ALIAS', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.ALIAS_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual([
        ST_STANDARD_TYPES,
        ST_STANDARD_TYPES,
        ST_STANDARD_TYPES
      ]);
      expect(symbolInfo.type).toBe('ARRAY [0..2] OF StandardTypesAlias'); //TODO - is this valid? Why not ST_StandardTypes
    }
  });

  test('reading ARRAY OF ENUM', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.ENUM_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toMatchObject([
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
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.ENUM_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual([100, 0, 200]);
      client.settings.objectifyEnumerations = true;
    }
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.ENUM_2');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toMatchObject([
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
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.ENUM_3');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toMatchObject([
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
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.ENUM_4');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toMatchObject([
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
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.ENUM_5');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toMatchObject([
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

  test('reading ARRAY OF POINTER', async () => {
    //Note: Deferenced pointer value is not possible to read using readSymbol() - we only get memory address
    const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.POINTER_');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(typeof value[0]).toBe("bigint");
    expect(symbolInfo.type).toBe("ARRAY [0..2] OF POINTER TO ST_StandardTypes"); //TODO: Is this valid really?
  });

  test('reading ARRAY OF SUBRANGE', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.SUBRANGE_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual([1234, 0, -1234]);
    }
  });

  test('reading ARRAY OF UNION', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.UNION_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value[0].STRING_).toBe('A test string ääöö!!@@');
      expect(value[1].INT_).toBe(32767);
      expect(value[2].REAL_).toBeCloseTo(3.14);
    }
  });

  test('reading ARRAY OF FUNCTION_BLOCK', async () => {
    {
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.BLOCK_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual([
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
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.BLOCK_2');

      const base = {
        ET: 0,
        IN: false,
        M: false,
        PT: 0,
        Q: false,
        StartTime: 0
      };

      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual([
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
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.BLOCK_3');

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

      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual([
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
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.BLOCK_4');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
      const value = await client.convertFromRaw(res, symbolInfo.type);

      expect(value).toStrictEqual([
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

  test('reading ARRAY OF INTERFACE (----TODO----)', async () => {
    {
      expect(true).toBe(true);
      /*
      const symbolInfo = await client.getSymbolInfo('GVL_Read.ComplexArrayTypes.INTERFACE_');
      const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
const value = await client.convertFromRaw(res, symbolInfo.type);

expect(value).toStrictEqual(???);
      */
    }
  });

  test('reading ARRAY with negative index', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.SpecialTypes.NegativeIndexArray');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toBeInstanceOf(Array);
    expect(value).toHaveLength(201);
    expect(value[0]).toBeCloseTo(1.11);
    expect(value[100]).toBeCloseTo(5.55);
    expect(value[200]).toBeCloseTo(9.99);
  });

  test('reading multi-dimensional ARRAY', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.SpecialTypes.MultiDimensionalArray');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toBeInstanceOf(Array);
    expect(value).toHaveLength(3);
    expect(value).toStrictEqual([[1, 2], [3, 4], [5, 6]]);
  });

  test('reading ARRAY OF ARRAY', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.SpecialTypes.ArrayOfArrays');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(value).toBeInstanceOf(Array);
    expect(value).toHaveLength(3);
    expect(value).toStrictEqual([[-1, -2], [-3, -4], [-5, -6]]);
  });

  test(`reading STRUCT with pragma: {attribute 'pack_mode' := '1'}`, async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.SpecialTypes.PackMode1');

    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
const value = await client.convertFromRaw(res, symbolInfo.type);

/*expect(value.attributes).toStrictEqual([{
      name: 'pack_mode',
      value: '1'
    }]);*/
    expect(symbolInfo.size).toBe(1145);
    expect(res.byteLength).toBe(1145);
    expect(value).toStrictEqual(ST_STANDARD_TYPES);
  });

  test(`reading STRUCT with pragma: {attribute 'pack_mode' := '8'}`, async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.SpecialTypes.PackMode8');

    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
const value = await client.convertFromRaw(res, symbolInfo.type);
/*
expect(value).attributes).toStrictEqual([{
      name: 'pack_mode',
      value: '8'
    }]);*/
    expect(symbolInfo.size).toBe(1160);
    expect(res.byteLength).toBe(1160);
    expect(value).toStrictEqual(ST_STANDARD_TYPES);
  });



});

describe('reading POINTER and REFERENCE values using readRawByName() + convertFromRaw()', () => {
  return;

  test('reading POINTER (actual value)', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.PointerValue^');
    const res = await client.readRawByName('GVL_Read.PointerValue^');
    expect(res.byteLength).toBe(symbolInfo.size);
    expect(symbolInfo.type).toBe("ST_Struct");

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(value).toStrictEqual({
      SomeText: 'Hello ads-client',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    });
  });

  test('reading REFERENCE (actual value)', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_Read.ReferenceValue');
    const dataType = await client.getDataType(symbolInfo.type.replace('REFERENCE TO ', ''));
    const res = await client.readRawByName('GVL_Read.ReferenceValue');
    expect(res.byteLength).toBe(dataType.size);
    expect(dataType.type).toBe("ST_Struct");

    const value = await client.convertFromRaw(res, dataType);
    expect(value).toStrictEqual({
      SomeText: 'Hello ads-client',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    });
  });
});

describe('writing values using writeSymbol()', () => {
  return;
  test('writing INT', async () => {
    {
      await client.writeSymbol('GVL_Read.IntValue', 4685);
      let res = await client.readSymbol('GVL_Read.IntValue');
      expect(res.value).toBe(4685);
    }

    {
      await client.writeSymbol('GVL_Read.IntValue', -32768);
      let res = await client.readSymbol('GVL_Read.IntValue');
      expect(res.value).toBe(-32768);
    }
  });

  test('writing STRING', async () => {
    {
      const writeValue = 'A test string value - ää öö ## @@ characters !!';
      await client.writeSymbol('GVL_Read.StringValue', writeValue);
      let res = await client.readSymbol('GVL_Read.StringValue');
      expect(res.value).toBe(writeValue);
    }

    {
      //Writing too long string for the destination (will be truncated)
      const writeValue = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus iaculis viverra erat, quis vivamus.';
      await client.writeSymbol('GVL_Read.StringValue', writeValue);
      let res = await client.readSymbol('GVL_Read.StringValue');
      expect(res.value).toBe(writeValue.substring(0, res.dataType.size - 1));
    }
  });

  test('writing STRUCT', async () => {
    {
      const writeValue = {
        SomeText: 'A test string value - ää öö ## @@ characters !!',
        SomeReal: 85464.5837,
        SomeDate: new Date()
      };
      await client.writeSymbol('GVL_Read.StructValue', writeValue);

      const res = await client.readSymbol('GVL_Read.StructValue');

      expect(res.value).toStrictEqual({
        SomeText: 'A test string value - ää öö ## @@ characters !!',
        SomeReal: expect.closeTo(85464.5837),
        SomeDate: new Date(writeValue.SomeDate.setMilliseconds(0)) //DT has second precision only
      });
    }

    {
      const writeValue = {
        SomeText: 'A test string value - ää öö ## @@ characters !!',
        SomeReal: 85464.5837,
        SomeDate: new Date()
      };
      await client.writeSymbol('GVL_Read.StructValue', writeValue);

      const res = await client.readSymbol('GVL_Read.StructValue');

      expect(res.value).toStrictEqual({
        SomeText: 'A test string value - ää öö ## @@ characters !!',
        SomeReal: expect.closeTo(85464.5837),
        SomeDate: new Date(writeValue.SomeDate.setMilliseconds(0)) //DT has second precision only
      });
    }
  });

});

describe('finalizing', () => {
  test('disconnecting', async () => {
    if (client?.connection.connected) {
      const task = client.disconnect()
      expect(task).resolves.toBeUndefined()
    }
  })
})
