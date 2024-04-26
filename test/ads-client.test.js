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

  test('reading INT', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.IntValue');
    expect(res.value).toBe(1234);
  });

  test('reading STRING', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.StringValue');
    expect(res.value).toBe('Hello this is a test string');
  });

  test('reading STRUCT', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.StructValue');
    expect(res.value).toStrictEqual({
      SomeText: 'Hello ads-client',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    });
  });

  test('reading TIME_OF_DAY', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.TodValue');
    expect(res.value).toBe(55800000);
    expect(res.value / 1000 / 60 / 60).toBeCloseTo(15.5);
  });

  test('reading ENUM (object)', async () => {
    client.settings.objectifyEnumerations = true;
    console.log(client.connection)
    const res = await client.readSymbol('GVL_ReadingAndWriting.EnumValue');
    expect(res.value).toMatchObject({
      name: 'Running',
      value: 100
    });
  });

  test('reading ENUM (number)', async () => {
    client.settings.objectifyEnumerations = false;
    const res = await client.readSymbol('GVL_ReadingAndWriting.EnumValue');
    expect(res.value).toBe(100);
    client.settings.objectifyEnumerations = true;
  });

  test('reading UNION value (STRING)', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.UnionValueStr');

    expect(Object.keys(res.value)).toStrictEqual(Object.keys({
      BoolValue: false,
      IntValue: 8257,
      UdintValue: 1702109249,
      RealValue: 7.205327508588529e+22,
      StringValue: 'A test string ääöö!!@@'
    }));

    expect(res.value.BoolValue).toBe(false);
    expect(res.value.IntValue).toBe(8257);
    expect(res.value.UdintValue).toBe(1702109249);
    expect(res.value.RealValue).toBeCloseTo(7.205327508588529e+22);
    expect(res.value.StringValue).toBe('A test string ääöö!!@@');
  });

  test('reading UNION value (REAL)', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.UnionValueReal');

    expect(Object.keys(res.value)).toStrictEqual(Object.keys({
      BoolValue: false,
      IntValue: 1611,
      UdintValue: 1067320907,
      RealValue: 1.2345670461654663,
      StringValue: 'K\x06ž?'
    }));

    expect(res.value.BoolValue).toBe(false); //In TC3 it is <Value of the expression cannot be retrieved.>, however should be false here(?)
    expect(res.value.IntValue).toBe(1611);
    expect(res.value.UdintValue).toBe(1067320907);
    expect(res.value.RealValue).toBeCloseTo(1.234567);
    expect(res.value.StringValue).toBe('K\x06ž?');
  });

  test('reading ARRAY [0..4] OF INT', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.IntArray');
    expect(res.value).toBeInstanceOf(Array);
    expect(res.value).toHaveLength(5);
    expect(res.value).toEqual([0, 10, 200, 3000, 4000]);
  });

  test('reading ARRAY [0..4] OF STRUCT', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.StructArray');

    expect(res.value).toBeInstanceOf(Array);
    expect(res.value).toHaveLength(5);

    expect(res.value).toStrictEqual([{
      SomeText: 'Just for demo purposes',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    },
    {
      SomeText: 'Hello ads-client',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    },
    {
      SomeText: 'Hello ads-client',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    },
    {
      SomeText: 'Hello ads-client',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    },
    {
      SomeText: 'Hello ads-client',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    }
    ]);
  });

  test('reading ARRAY[-100..100] OF LREAL', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.NegativeIndexArray');
    expect(res.value).toBeInstanceOf(Array);
    expect(res.value).toHaveLength(201);
    expect(res.value[0]).toBeCloseTo(1.11);
    expect(res.value[100]).toBeCloseTo(5.55);
    expect(res.value[200]).toBeCloseTo(9.99);
  });

  test('reading ARRAY[1..3, 1..2] OF BYTE', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.MultiDimArray');
    expect(res.value).toBeInstanceOf(Array);
    expect(res.value).toHaveLength(3);
    expect(res.value).toStrictEqual([[1, 2], [3, 4], [5, 6]]);
  });

  test('reading ARRAY[1..3] OF ARRAY[1..2] OF SINT', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.ArrayOfArrays');
    expect(res.value).toBeInstanceOf(Array);
    expect(res.value).toHaveLength(3);
    expect(res.value).toStrictEqual([[-1, -2], [-3, -4], [-5, -6]]);
  });

  test('reading FUNCTION_BLOCK (TON)', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.TimerBlock');
    expect(res.value).toStrictEqual({
      ET: 0,
      IN: false,
      M: false,
      PT: 2500,
      Q: false,
      StartTime: 0
    });
  });

  test('reading FUNCTION_BLOCK (TC2_System.FB_CreateDir)', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.CreateDirBlock');
    expect(res.value).toStrictEqual({
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
    });
  });

  test('reading FUNCTION_BLOCK (Tc2_DataExchange.FB_ReadAdsSymByName)', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.AdsReadBlock');
    expect(res.value).toStrictEqual({
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
    });
  });

  test('reading POINTER', async () => {
    //Note: Deferenced pointer value is not possible to read using readSymbol() - we only get memory address
    const res = await client.readSymbol('GVL_ReadingAndWriting.PointerValue');

    expect(typeof res.value).toBe("bigint");
    expect(res.symbolInfo.type).toBe("POINTER TO ST_Struct");
  });

  test('reading REFERENCE', async () => {
    //Note: Deferenced reference value is not possible to read using readSymbol() - we only get memory address
    const res = await client.readSymbol('GVL_ReadingAndWriting.ReferenceValue');

    expect(typeof res.value).toBe("bigint");
    expect(res.symbolInfo.type).toBe("REFERENCE TO ST_Struct");
  });

  test(`reading STRUCT with pragma: {attribute 'pack_mode' := '1'}`, async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.StructPackMode1');

    expect(res.dataType.attributes).toStrictEqual([{
      name: 'pack_mode',
      value: '1'
    }]);
    expect(res.symbolInfo.size).toBe(594);
    expect(res.rawValue.byteLength).toBe(594);
    expect(res.value).toStrictEqual({
      BoolValue: true,
      StringValue: 'A string value',
      LrealValue: expect.closeTo(12321.3123123),
      BoolArray: [false, false, false, false, false],
      BlockArray: [
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false }
      ],
      LargeBlock: {
        sNetId: '',
        sPathName: 'test_path',
        nMode: 0,
        ePath: {
          name: "PATH_GENERIC",
          value: 1,
        },
        bExecute: false,
        tTimeout: 5000,
        bBusy: false,
        bError: false,
        nErrId: 0,
        hFile: 0
      }
    });
  });

  test(`reading STRUCT with pragma: {attribute 'pack_mode' := '8'}`, async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.StructPackMode8');

    expect(res.dataType.attributes).toStrictEqual([{
      name: 'pack_mode',
      value: '8'
    }]);
    expect(res.symbolInfo.size).toBe(600);
    expect(res.rawValue.byteLength).toBe(600);
    expect(res.value).toStrictEqual({
      BoolValue: true,
      StringValue: 'A string value',
      LrealValue: expect.closeTo(12321.3123123),
      BoolArray: [false, false, false, false, false],
      BlockArray: [
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false }
      ],
      LargeBlock: {
        sNetId: '',
        sPathName: 'test_path',
        nMode: 0,
        ePath: {
          name: "PATH_GENERIC",
          value: 1,
        },
        bExecute: false,
        tTimeout: 5000,
        bBusy: false,
        bError: false,
        nErrId: 0,
        hFile: 0
      }
    });
  });
});

describe('reading values using readRaw() + convertFromRaw()', () => {
  test('reading INT', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.IntValue');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);
    expect(res.toString('hex')).toBe('d204');

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(value).toBe(1234);
  });

  test('reading STRING', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.StringValue');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);
    expect(ADS.decodePlcStringBuffer(res)).toBe('Hello this is a test string');

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(value).toBe('Hello this is a test string');
  });

  test('reading STRUCT', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.StructValue');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(value).toStrictEqual({
      SomeText: 'Hello ads-client',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    });
  });

  test('reading TIME_OF_DAY', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.TodValue');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(value).toBe(55800000);
    expect(value / 1000 / 60 / 60).toBeCloseTo(15.5);
  });

  test('reading ENUM (object)', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.EnumValue');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(value).toStrictEqual({
      name: 'Running',
      value: 100
    });
  });

  test('reading ENUM (number)', async () => {
    client.settings.objectifyEnumerations = false;

    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.EnumValue');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(value).toBe(100);

    client.settings.objectifyEnumerations = true;
  });

  test('eading UNION value (STRING)', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.UnionValueStr');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(Object.keys(value)).toStrictEqual(Object.keys({
      BoolValue: false,
      IntValue: 8257,
      UdintValue: 1702109249,
      RealValue: 7.205327508588529e+22,
      StringValue: 'A test string ääöö!!@@'
    }));
    expect(value.BoolValue).toBe(false);
    expect(value.IntValue).toBe(8257);
    expect(value.UdintValue).toBe(1702109249);
    expect(value.RealValue).toBeCloseTo(7.205327508588529e+22);
    expect(value.StringValue).toBe('A test string ääöö!!@@');
  });

  test('Reading UNION value (REAL)', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.UnionValueReal');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(Object.keys(value)).toStrictEqual(Object.keys({
      BoolValue: false,
      IntValue: 1611,
      UdintValue: 1067320907,
      RealValue: 1.2345670461654663,
      StringValue: 'K\x06ž?'
    }));
    expect(value.BoolValue).toBe(false); //In TC3 it is <Value of the expression cannot be retrieved.>, however should be false here(?)
    expect(value.IntValue).toBe(1611);
    expect(value.UdintValue).toBe(1067320907);
    expect(value.RealValue).toBeCloseTo(1.234567);
    expect(value.StringValue).toBe('K\x06ž?');
  });

  test('reading ARRAY [0..4] OF INT', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.IntArray');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(value).toBeInstanceOf(Array);
    expect(value).toHaveLength(5);
    expect(value).toEqual([0, 10, 200, 3000, 4000]);
  });

  test('reading ARRAY [0..4] OF STRUCT', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.StructArray');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(value).toBeInstanceOf(Array);
    expect(value).toHaveLength(5);

    expect(value).toStrictEqual([{
      SomeText: 'Just for demo purposes',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    },
    {
      SomeText: 'Hello ads-client',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    },
    {
      SomeText: 'Hello ads-client',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    },
    {
      SomeText: 'Hello ads-client',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    },
    {
      SomeText: 'Hello ads-client',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    }
    ]);
  });

  test('reading ARRAY[-100..100] OF LREAL', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.NegativeIndexArray');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(value).toBeInstanceOf(Array);
    expect(value).toHaveLength(201);
    expect(value[0]).toBeCloseTo(1.11);
    expect(value[100]).toBeCloseTo(5.55);
    expect(value[200]).toBeCloseTo(9.99);
  });

  test('reading ARRAY[1..3, 1..2] OF BYTE', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.MultiDimArray');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(value).toBeInstanceOf(Array);
    expect(value).toHaveLength(3);
    expect(value).toStrictEqual([[1, 2], [3, 4], [5, 6]]);
  });

  test('reading ARRAY[1..3] OF ARRAY[1..2] OF SINT', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.ArrayOfArrays');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(value).toBeInstanceOf(Array);
    expect(value).toHaveLength(3);
    expect(value).toStrictEqual([[-1, -2], [-3, -4], [-5, -6]]);
  });

  test('reading FUNCTION_BLOCK (TON)', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.TimerBlock');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(value).toStrictEqual({
      ET: 0,
      IN: false,
      M: false,
      PT: 2500,
      Q: false,
      StartTime: 0
    });
  });

  test('reading FUNCTION_BLOCK (TC2_System.FB_CreateDir)', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.CreateDirBlock');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(value).toStrictEqual({
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
    });
  });
  
  test('reading FUNCTION_BLOCK (Tc2_DataExchange.FB_ReadAdsSymByName)', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.AdsReadBlock');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(value).toStrictEqual({
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
    });
  });

  test('reading POINTER (memory address)', async () => {
    //Note: Deferenced pointer value is not possible to read using readRaw() - we only get memory address
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.PointerValue');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);
    expect(symbolInfo.type).toBe("POINTER TO ST_Struct");

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(typeof value).toBe("bigint");
  });

  test('reading REFERENCE (memory address)', async () => {
    //Note: Deferenced reference value is not possible to read using readRaw() - we only get memory address
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.ReferenceValue');
    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);
    expect(res.byteLength).toBe(symbolInfo.size);
    expect(symbolInfo.type).toBe("REFERENCE TO ST_Struct");

    const value = await client.convertFromRaw(res, symbolInfo.type);
    expect(typeof value).toBe("bigint");
  });

  test(`reading STRUCT with pragma: {attribute 'pack_mode' := '1'}`, async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.StructPackMode1');

    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);

    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(symbolInfo.size).toBe(594);
    expect(res.byteLength).toBe(594);
    expect(value).toStrictEqual({
      BoolValue: true,
      StringValue: 'A string value',
      LrealValue: expect.closeTo(12321.3123123),
      BoolArray: [false, false, false, false, false],
      BlockArray: [
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false }
      ],
      LargeBlock: {
        sNetId: '',
        sPathName: 'test_path',
        nMode: 0,
        ePath: {
          name: "PATH_GENERIC",
          value: 1,
        },
        bExecute: false,
        tTimeout: 5000,
        bBusy: false,
        bError: false,
        nErrId: 0,
        hFile: 0
      }
    });
  });

  test(`reading STRUCT with pragma: {attribute 'pack_mode' := '8'}`, async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.StructPackMode8');

    const res = await client.readRaw(symbolInfo.indexGroup, symbolInfo.indexOffset, symbolInfo.size);

    expect(res.byteLength).toBe(symbolInfo.size);

    const value = await client.convertFromRaw(res, symbolInfo.type);

    expect(symbolInfo.size).toBe(600);
    expect(res.byteLength).toBe(600);
    expect(value).toStrictEqual({
      BoolValue: true,
      StringValue: 'A string value',
      LrealValue: expect.closeTo(12321.3123123),
      BoolArray: [false, false, false, false, false],
      BlockArray: [
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false }
      ],
      LargeBlock: {
        sNetId: '',
        sPathName: 'test_path',
        nMode: 0,
        ePath: {
          name: "PATH_GENERIC",
          value: 1,
        },
        bExecute: false,
        tTimeout: 5000,
        bBusy: false,
        bError: false,
        nErrId: 0,
        hFile: 0
      }
    });
  });
});

describe('reading POINTER and REFERENCE values using readRawByName() + convertFromRaw()', () => {
  test('reading POINTER (actual value)', async () => {
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.PointerValue^');
    const res = await client.readRawByName('GVL_ReadingAndWriting.PointerValue^');
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
    const symbolInfo = await client.getSymbolInfo('GVL_ReadingAndWriting.ReferenceValue');
    const dataType = await client.getDataType(symbolInfo.type.replace('REFERENCE TO ', ''));
    const res = await client.readRawByName('GVL_ReadingAndWriting.ReferenceValue');
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

describe('writing values using writeRaw()', () => {

  test('writing INT', async () => {
    //TODO
    return;
    {
      await client.writeSymbol('GVL_ReadingAndWriting.IntValue', 4685);
      let res = await client.readSymbol('GVL_ReadingAndWriting.IntValue');
      expect(res.value).toBe(4685);
    }

    {
      await client.writeSymbol('GVL_ReadingAndWriting.IntValue', -32768);
      let res = await client.readSymbol('GVL_ReadingAndWriting.IntValue');
      expect(res.value).toBe(-32768);
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
