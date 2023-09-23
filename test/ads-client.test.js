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
const PLC_PROJECT_VERSION = '1.0.0.0'
const ads = require('../src/ads-client')
const AMS_NET_ID = (process.env['ADS_CLIENT_TEST_AMS'] ?? 'localhost').trim()

const client = new ads.Client({
  targetAmsNetId: AMS_NET_ID,
  targetAdsPort: 851
})

test('IMPORTANT NOTE: This test requires running a specific PLC project locally (https://github.com/jisotalo/ads-client-test-plc-project)', () => { })

describe('connection', () => {

  test('client is not connected at beginning', () => {
    expect(client.connection.connected).toBe(false)
  })

  test('checking ads client settings', async () => {
    expect(client).toBeInstanceOf(ads.Client)
    expect(client).toHaveProperty('settings')
    expect(client.settings.targetAmsNetId).toBe(AMS_NET_ID === 'localhost' ? '127.0.0.1.1.1' : AMS_NET_ID)
    expect(client.settings.targetAdsPort).toBe(851)
  })

  test('connecting to localhost and 851', async () => {
    try {
      const res = await client.connect()

      expect(res).toHaveProperty('connected')
      expect(res.connected).toBe(true)

    } catch (err) {
      throw new Error(`connecting localhost failed (${err.message}`, err)
    }
  })


  test('checking that test PLC project is active', async () => {
    try {
      const res = await client.readSymbol('GVL_AdsClientTests.IsTestProject')
      //console.log(res)
      expect(res).toHaveProperty('value')

      expect(res.value).toBe(true)
    } catch (err) {
      throw new Error('Failed to check for test PLC project - is correct PLC project active?')
    }
  })

  test('checking that test PLC project version is correct', async () => {
    const res = await client.readSymbol('GVL_AdsClientTests.VERSION')
    expect(res.value).toBe(PLC_PROJECT_VERSION)
  })
})

describe('resetting PLC to original state', () => {
  test('resetting PLC', async () => {
    await client.restartPlc()
  })

  test('checking that reset was succesful', async () => {
    const res = await client.readSymbol('GVL_AdsClientTests.IsReset')
    expect(res.value).toBe(true)
  })

  test('setting IsReset to false', async () => {
    const res = await client.writeSymbol('GVL_AdsClientTests.IsReset', false)
  })

  test('checking that test PLC project is running', async () => {
    const res = await client.readSymbol('GVL_AdsClientTests.IsRunning')
    expect(res.value).toBe(true)
  })
})

describe('basic tests', () => {
  test('reading system manager state', async () => {
    const res = await client.readSystemManagerState()
    expect(res).toHaveProperty('adsState')
    expect(res).toHaveProperty('adsStateStr')
    expect(res).toHaveProperty('deviceState')
  })

  test('reading plc runtime state', async () => {
    const res = await client.readPlcRuntimeState()
    expect(res).toHaveProperty('adsState')
    expect(res).toHaveProperty('adsStateStr')
    expect(res).toHaveProperty('deviceState')
  })

  test('reading device info', async () => {
    const res = await client.readDeviceInfo()
    //console.log(res)
    expect(res).toHaveProperty('deviceName')
    expect(res).toHaveProperty('majorVersion')
    expect(res).toHaveProperty('minorVersion')
    expect(res).toHaveProperty('versionBuild')
  })

})

describe('reading values', () => {

  test('reading INT', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.IntValue')
    //console.log(res.value)
    expect(res.value).toBe(1234)
  })

  test('reading STRING', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.StringValue')
    //console.log(res.value)
    expect(res.value).toBe('Hello this is a test string')
  })

  test('reading STRUCT', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.StructValue')
    //console.log(res.value)
    expect(res.value).toMatchObject({
      SomeText: 'Hello ads-client',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    })
  })

  test('reading TIME_OF_DAY', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.TodValue')
    //console.log(res.value)
    expect(res.value).toBe(55800000)
    expect(res.value / 1000 / 60 / 60).toBeCloseTo(15.5)
  })

  test('reading ENUM as object', async () => {
    client.settings.objectifyEnumerations = true
    const res = await client.readSymbol('GVL_ReadingAndWriting.EnumValue')
    //console.log(res)
    expect(res.value).toMatchObject({ "name": "Running", "value": 100 })
  })

  test('reading ENUM as number', async () => {
    client.settings.objectifyEnumerations = false
    const res = await client.readSymbol('GVL_ReadingAndWriting.EnumValue')
    //console.log(res)
    expect(res.value).toBe(100)
    client.settings.objectifyEnumerations = true
  })

  test('reading UNION STRING value', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.UnionValueStr')
    //console.log(res)
    expect(res.value).toHaveProperty('StringValue')
    expect(res.value.StringValue).toBe('A test string ääöö!!@@')
  })

  test('reading UNION REAL value', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.UnionValueReal')
    //console.log(res)
    expect(res.value).toHaveProperty('RealValue')
    expect(res.value.RealValue).toBeCloseTo(1.234567)
  })

  test('reading ARRAY OF INT', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.IntArray')
    //console.log(res)
    expect(res.value).toBeInstanceOf(Array)
    expect(res.value).toHaveLength(5)
    expect(res.value).toEqual([0, 10, 200, 3000, 4000])
  })

  test('reading ARRAY OF STRUCT', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.StructArray')
    //console.log(res)
    expect(res.value).toBeInstanceOf(Array)
    expect(res.value).toHaveLength(5)
    expect(res.value).toMatchObject([{
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
    ])
  })

  test('reading ARRAY[-100..100] OF LREAL', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.NegativeIndexArray')
    //console.log(res)
    expect(res.value).toBeInstanceOf(Array)
    expect(res.value).toHaveLength(201)
    expect(res.value[0]).toBeCloseTo(1.11)
    expect(res.value[100]).toBeCloseTo(5.55)
    expect(res.value[200]).toBeCloseTo(9.99)
  })

  test('reading ARRAY[1..3, 1..2] OF BYTE (multi dimensional)', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.MultiDimArray')
    //console.log(res)
    expect(res.value).toBeInstanceOf(Array)
    expect(res.value).toHaveLength(3)
    expect(res.value).toEqual([[1, 2], [3, 4], [5, 6]])
  })

  test('reading ARRAY[1..3] OF ARRAY[1..2] OF SINT (multi dimensional)', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.ArrayOfArrays')
    //console.log(res)
    expect(res.value).toBeInstanceOf(Array)
    expect(res.value).toHaveLength(3)
    expect(res.value).toEqual([[-1, -2], [-3, -4], [-5, -6]])
  })

  test('reading FUNCTION BLOCK', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.TimerBlock')
    //console.log(res)
    expect(res.value).toMatchObject({ "ET": 0, "IN": false, "M": false, "PT": 2500, "Q": false, "StartTime": 0 })
  })

  test('reading POINTER target value', async () => {
    const res = await client.convertFromRaw(
      await client.readRawByName('GVL_ReadingAndWriting.PointerValue^'),
      'ST_Struct'
    )
    //console.log(res)
    expect(res).toMatchObject({
      SomeText: 'Hello ads-client',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    })
  })

  test('reading REFERENCE target value', async () => {
    const res = await client.convertFromRaw(
      await client.readRawByName('GVL_ReadingAndWriting.ReferenceValue'),
      'ST_Struct'
    )
    //console.log(res)
    expect(res).toMatchObject({
      SomeText: 'Hello ads-client',
      SomeReal: expect.closeTo(3.14159274),
      SomeDate: new Date('2020-04-13T12:25:33.000Z')
    })
  })

  test('reading and comparing pack-mode struct sizes', async () => {
    const mode1 = await client.getSymbolInfo('GVL_ReadingAndWriting.StructPackMode1')
    const mode2 = await client.getSymbolInfo('GVL_ReadingAndWriting.StructPackMode8')
    expect(mode1.size).toBe(594)
    expect(mode2.size).toBe(600)
  })

  test('reading STRUCT with pack-mode 1', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.StructPackMode1')
    //console.log(res.value)
    expect(res.symbol.size).toBe(594)
    expect(res.value).toMatchObject(
      {
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
      }
    )
  })

  test('reading STRUCT with pack-mode 8', async () => {
    const res = await client.readSymbol('GVL_ReadingAndWriting.StructPackMode8')
    //console.log(res.value)
    expect(res.symbol.size).toBe(600)
    expect(res.value).toMatchObject(
      {
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
      }
    )
  })
})


describe('writing values', () => {

  test('writing INT', async () => {
    await client.writeSymbol('GVL_ReadingAndWriting.IntValue', 4685)
    let res = await client.readSymbol('GVL_ReadingAndWriting.IntValue')
    //console.log(res.value)
    expect(res.value).toBe(4685)

    await client.writeSymbol('GVL_ReadingAndWriting.IntValue', -32768)
    res = await client.readSymbol('GVL_ReadingAndWriting.IntValue')
    //console.log(res.value)
    expect(res.value).toBe(-32768)
  })

  test('writing STRING', async () => {
    const str = 'hello from ads-client side with speci@l characters ä ö @@'
    await client.writeSymbol('GVL_ReadingAndWriting.StringValue', str)
    const res = await client.readSymbol('GVL_ReadingAndWriting.StringValue')
    //console.log(res.value)
    expect(res.value).toBe(str)
  })

  test('writing STRUCT', async () => {
    await client.writeSymbol('GVL_ReadingAndWriting.StructValue', {
      SomeText: 'greetings from ads-client @@@',
      SomeReal: 194958.845398,
      SomeDate: new Date('1986-11-15T12:25:33.000Z')
    })
    const res = await client.readSymbol('GVL_ReadingAndWriting.StructValue')
    //console.log(res.value)
    expect(res.value).toMatchObject({
      SomeText: 'greetings from ads-client @@@',
      SomeReal: expect.closeTo(194958.845398),
      SomeDate: new Date('1986-11-15T12:25:33.000Z')
    })
  })

  test('writing STRUCT (without autoFill -> should throw error)', async () => {
    const res = client.writeSymbol('GVL_ReadingAndWriting.StructValue', {
      SomeText: 'greetings from ads-client @@@'
    })

    expect(res).rejects.toThrowError()
  })

  test('writing STRUCT (with autoFill)', async () => {
    await client.writeSymbol('GVL_ReadingAndWriting.StructValue', {
      SomeText: 'changing just the string value',
    }, true)
    const res = await client.readSymbol('GVL_ReadingAndWriting.StructValue')
    //console.log(res.value)
    expect(res.value).toMatchObject({
      SomeText: 'changing just the string value',
      SomeReal: expect.closeTo(194958.845398),
      SomeDate: new Date('1986-11-15T12:25:33.000Z')
    })
  })

  test('writing TIME_OF_DAY', async () => {
    const milliseconds = Math.round(10.5 * 60 * 60 * 1000) //clock 10:30

    await client.writeSymbol('GVL_ReadingAndWriting.TodValue', milliseconds)
    const res = await client.readSymbol('GVL_ReadingAndWriting.TodValue')
    //console.log(res.value)
    expect(res.value).toBe(milliseconds)
    expect(res.value / 1000 / 60 / 60).toBeCloseTo(10.5)
  })

  test('writing ENUM as string', async () => {
    client.settings.objectifyEnumerations = true
    await client.writeSymbol('GVL_ReadingAndWriting.EnumValue', 'Stopping')
    const res = await client.readSymbol('GVL_ReadingAndWriting.EnumValue')
    //console.log(res.value)
    expect(res.value).toMatchObject({ "name": "Stopping", "value": 200 })
  })

  test('writing ENUM as number', async () => {
    client.settings.objectifyEnumerations = true
    await client.writeSymbol('GVL_ReadingAndWriting.EnumValue', 50)
    const res = await client.readSymbol('GVL_ReadingAndWriting.EnumValue')
    //console.log(res.value)
    expect(res.value).toMatchObject({ "name": "Starting", "value": 50 })
  })

  test('writing UNION STRING value', async () => {
    const str = 'a string value to union'
    await client.writeSymbol('GVL_ReadingAndWriting.UnionValueStr.StringValue', str)
    const res = await client.readSymbol('GVL_ReadingAndWriting.UnionValueStr')
    //console.log(res.value)
    expect(res.value).toHaveProperty('StringValue')
    expect(res.value.StringValue).toBe(str)
  })


  test('writing UNION REAL value', async () => {
    const value = 43853.589
    await client.writeSymbol('GVL_ReadingAndWriting.UnionValueReal.Realvalue', value)
    const res = await client.readSymbol('GVL_ReadingAndWriting.UnionValueReal')
    //console.log(res.value)
    expect(res.value).toHaveProperty('RealValue')
    expect(res.value.RealValue).toBeCloseTo(value)
  })

  test('writing ARRAY OF INT', async () => {
    const value = [-32768, -1000, 0, 5000, 32767]
    await client.writeSymbol('GVL_ReadingAndWriting.IntArray', value)
    const res = await client.readSymbol('GVL_ReadingAndWriting.IntArray')
    //console.log(res.value)
    expect(res.value).toBeInstanceOf(Array)
    expect(res.value).toHaveLength(5)
    expect(res.value).toEqual(value)
  })

  test('writing ARRAY OF STRUCT', async () => {
    const value = [
      {
        SomeText: 'string value 1',
        SomeReal: -1111.1111,
        SomeDate: new Date('2010-04-13T12:25:33.000Z')
      },
      {
        SomeText: 'string value 2',
        SomeReal: 2222.2222,
        SomeDate: new Date('2011-04-13T12:25:33.000Z')
      },
      {
        SomeText: 'string value 3',
        SomeReal: 0.001,
        SomeDate: new Date('2012-04-13T12:25:33.000Z')
      },
      {
        SomeText: 'string value 4',
        SomeReal: -0.004,
        SomeDate: new Date('2013-04-13T12:25:33.000Z')
      },
      {
        SomeText: 'string value 5',
        SomeReal: 0.0,
        SomeDate: new Date('2014-04-13T12:25:33.000Z')
      }
    ]

    await client.writeSymbol('GVL_ReadingAndWriting.StructArray', value)

    const res = await client.readSymbol('GVL_ReadingAndWriting.StructArray')
    //console.log(res)
    expect(res.value).toBeInstanceOf(Array)
    expect(res.value).toHaveLength(5)
    expect(res.value).toMatchObject(
      [
        {
          SomeText: 'string value 1',
          SomeReal: expect.closeTo(-1111.1111),
          SomeDate: new Date('2010-04-13T12:25:33.000Z')
        },
        {
          SomeText: 'string value 2',
          SomeReal: expect.closeTo(2222.2222),
          SomeDate: new Date('2011-04-13T12:25:33.000Z')
        },
        {
          SomeText: 'string value 3',
          SomeReal: expect.closeTo(0.001),
          SomeDate: new Date('2012-04-13T12:25:33.000Z')
        },
        {
          SomeText: 'string value 4',
          SomeReal: expect.closeTo(-0.004),
          SomeDate: new Date('2013-04-13T12:25:33.000Z')
        },
        {
          SomeText: 'string value 5',
          SomeReal: expect.closeTo(0.0),
          SomeDate: new Date('2014-04-13T12:25:33.000Z')
        }
      ]
    )
  })

  test('writing ARRAY[-100..100] OF LREAL', async () => {
    let value = []
    for (let i = 0; i < 201; i++) {
      value.push(i * 1000.1111)
    }
    await client.writeSymbol('GVL_ReadingAndWriting.NegativeIndexArray', value)

    const res = await client.readSymbol('GVL_ReadingAndWriting.NegativeIndexArray')
    //console.log(res)
    expect(res.value).toBeInstanceOf(Array)
    expect(res.value).toHaveLength(201)

    for (let i = 0; i < 201; i++) {
      expect(res.value[i]).toBeCloseTo(value[i])
    }
  })

  test('writing ARRAY[1..3, 1..2] OF BYTE (multi dimensional)', async () => {
    const value = [[100, 101], [5, 10], [0, 255]]
    await client.writeSymbol('GVL_ReadingAndWriting.MultiDimArray', value)

    const res = await client.readSymbol('GVL_ReadingAndWriting.MultiDimArray')
    //console.log(res)
    expect(res.value).toBeInstanceOf(Array)
    expect(res.value).toHaveLength(3)
    expect(res.value).toEqual(value)
  })

  test('writing ARRAY[1..3] OF ARRAY[1..2] OF SINT (multi dimensional)', async () => {
    const value = [[-100, 101], [-5, 10], [-128, 127]]
    await client.writeSymbol('GVL_ReadingAndWriting.ArrayOfArrays', value)

    const res = await client.readSymbol('GVL_ReadingAndWriting.ArrayOfArrays')
    //console.log(res)
    expect(res.value).toBeInstanceOf(Array)
    expect(res.value).toHaveLength(3)
    expect(res.value).toEqual(value)
  })

  test('writing FUNCTION BLOCK', async () => {
    const value = { "ET": 5000, "IN": true, "M": false, "PT": 12345, "Q": false, "StartTime": 5 }
    await client.writeSymbol('GVL_ReadingAndWriting.TimerBlock', value)

    const res = await client.readSymbol('GVL_ReadingAndWriting.TimerBlock')
    //console.log(res)
    expect(res.value).toMatchObject(value)
  })

  test('writing POINTER target value', async () => {
    const handle = await client.createVariableHandle('GVL_ReadingAndWriting.PointerValue^')

    await client.writeRawByHandle(
      handle,
      await client.convertToRaw({
        SomeText: 'struct written from pointer',
        SomeReal: 999.2222,
        SomeDate: new Date('2000-04-13T12:25:33.000Z')
      }, 'ST_Struct')
    )

    const res = await client.convertFromRaw(
      await client.readRawByName('GVL_ReadingAndWriting.PointerValue^'),
      'ST_Struct'
    )
    //console.log(res)
    expect(res).toMatchObject({
      SomeText: 'struct written from pointer',
      SomeReal: expect.closeTo(999.2222),
      SomeDate: new Date('2000-04-13T12:25:33.000Z')
    })
  })

  test('writing REFERENCE target value', async () => {
    const handle = await client.createVariableHandle('GVL_ReadingAndWriting.ReferenceValue')

    await client.writeRawByHandle(
      handle,
      await client.convertToRaw({
        SomeText: 'struct written from reference',
        SomeReal: -12345,
        SomeDate: new Date('1970-04-13T12:25:33.000Z')
      }, 'ST_Struct')
    )

    const res = await client.convertFromRaw(
      await client.readRawByName('GVL_ReadingAndWriting.ReferenceValue'),
      'ST_Struct'
    )
    //console.log(res)
    expect(res).toMatchObject({
      SomeText: 'struct written from reference',
      SomeReal: expect.closeTo(-12345),
      SomeDate: new Date('1970-04-13T12:25:33.000Z')
    })
  })

  test('writing STRUCT with pack-mode 1', async () => {
    const value = {
      BoolValue: false,
      StringValue: 'pack mode 1 string value',
      LrealValue: -11111,
      BoolArray: [true, false, true, false, true],
      BlockArray: [
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: true, Q: true, M: true },
        { CLK: false, Q: false, M: false },
        { CLK: true, Q: true, M: true }
      ],
      LargeBlock: {
        sNetId: 'localhost',
        sPathName: 'c:/hello',
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
        hFile: 12345
      }
    }
    await client.writeSymbol('GVL_ReadingAndWriting.StructPackMode1', value)

    const res = await client.readSymbol('GVL_ReadingAndWriting.StructPackMode1')
    //console.log(res.value)
    expect(res.symbol.size).toBe(594)
    expect(res.value).toMatchObject({
      BoolValue: false,
      StringValue: 'pack mode 1 string value',
      LrealValue: expect.closeTo(-11111),
      BoolArray: [true, false, true, false, true],
      BlockArray: [
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: true, Q: true, M: true },
        { CLK: false, Q: false, M: false },
        { CLK: true, Q: true, M: true }
      ],
      LargeBlock: {
        sNetId: 'localhost',
        sPathName: 'c:/hello',
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
        hFile: 12345
      }
    }
    )
  })

  test('writing STRUCT with pack-mode 8', async () => {
    const value = {
      BoolValue: false,
      StringValue: 'pack mode 8 string value',
      LrealValue: -11111,
      BoolArray: [true, false, true, false, true],
      BlockArray: [
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: true, Q: true, M: true },
        { CLK: false, Q: false, M: false },
        { CLK: true, Q: true, M: true }
      ],
      LargeBlock: {
        sNetId: 'localhost',
        sPathName: 'c:/hello',
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
        hFile: 12345
      }
    }
    await client.writeSymbol('GVL_ReadingAndWriting.StructPackMode8', value)

    const res = await client.readSymbol('GVL_ReadingAndWriting.StructPackMode8')
    //console.log(res.value)
    expect(res.symbol.size).toBe(600)
    expect(res.value).toMatchObject({
      BoolValue: false,
      StringValue: 'pack mode 8 string value',
      LrealValue: expect.closeTo(-11111),
      BoolArray: [true, false, true, false, true],
      BlockArray: [
        { CLK: false, Q: false, M: false },
        { CLK: false, Q: false, M: false },
        { CLK: true, Q: true, M: true },
        { CLK: false, Q: false, M: false },
        { CLK: true, Q: true, M: true }
      ],
      LargeBlock: {
        sNetId: 'localhost',
        sPathName: 'c:/hello',
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
        hFile: 12345
      }
    }
    )
  })
})


describe('Remote procedure calls (RPC)', () => {
  test('calling simple RPC method', async () => {
    const res = await client.invokeRpcMethod('GVL_RPC.RpcBlock', 'Calculator', {
      Value1: -100.123,
      Value2: 1231.453
    })
    //console.log(res)

    expect(res).toMatchObject({
      returnValue: true,
      outputs: {
        Sum: expect.closeTo(1131.3299560546875),
        Product: expect.closeTo(-123296.7734375),
        Division: expect.closeTo(-0.08130476623773575)
      }
    })
  })

  test('calling RPC method with structs', async () => {
    const res = await client.invokeRpcMethod('GVL_RPC.RpcBlock', 'StructTest', {
      Input: {
        SomeText: 'Hello RPC method',
        SomeReal: 1200.50,
        SomeDate: new Date('2020-07-03T14:57:22.000Z')
      }
    })
    //console.log(res)

    expect(res).toMatchObject({
      returnValue: {
        SomeText: 'Response: Hello RPC method',
        SomeReal: expect.closeTo(12005),
        SomeDate: new Date('2020-07-04T14:57:22.000Z')
      },
      outputs: {}
    })
  })
})

describe('issue specific tests', () => {
  describe('issue 94 (https://github.com/jisotalo/ads-client/issues/94)', () => {
    test('writing value and reading it', async () => {
      await client.writeSymbol('GVL_ReadingAndWriting.Issue94', {
        BoolValue: false,
        ArrayValue: [
          { ByteValue: 234 },
          { ByteValue: 99 }
        ]
      })

      const res = await client.readSymbol('GVL_ReadingAndWriting.Issue94')
      //console.log(res.value)
      expect(res.value).toMatchObject(
        {
          BoolValue: false,
          ArrayValue: [
            { ByteValue: 234 },
            { ByteValue: 99 }
          ]
        }
      )
    })
  })

  describe('issue 103 (https://github.com/jisotalo/ads-client/issues/103)', () => {
    test('calling unsubscribeAll() multiple times (should not crash to unhandled exception)', async () => {
      await client.subscribe('GVL_ReadingAndWriting.IntValue');
      await client.subscribe('GVL_ReadingAndWriting.IntValue');
      await client.subscribe('GVL_ReadingAndWriting.IntValue');
      await client.subscribe('GVL_ReadingAndWriting.IntValue');
      await client.subscribe('GVL_ReadingAndWriting.IntValue');

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
})

describe('finalizing', () => {
  test('disconnecting', async () => {
    if (client?.connection.connected) {
      const task = client.disconnect()

      expect(task).resolves.toBeUndefined()
    }
  })
})
