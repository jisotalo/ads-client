/**
 * Tests for the compiled decoder (settings.useCompiledDecoders).
 *
 * Verifies that compiled decoders produce output identical to
 * Client.convertBufferToObject() using synthetic data type metadata
 * (shaped like Client.buildDataType() output). Runs standalone -
 * no PLC connection needed.
 *
 * Run: npx jest test/compiled-decoder.test.js
 */
const { Client } = require('../dist/ads-client');
const { compileDataTypeDecoder } = require('../dist/compiled-decoder');
const ADS = require('../dist/ads-commons');

/** Creates an AdsDataType object with defaults (shaped like buildDataType() output) */
const makeType = (props) => ({
  version: 1,
  hashValue: 0,
  typeHashValue: 0,
  size: 0,
  offset: 0,
  adsDataType: 0,
  adsDataTypeStr: '',
  flags: 0,
  flagsStr: [],
  arrayDimension: 0,
  name: '',
  type: '',
  comment: '',
  arrayInfos: [],
  subItems: [],
  typeGuid: '',
  rpcMethods: [],
  attributes: [],
  enumInfos: [],
  extendedFlags: 0,
  reserved: Buffer.alloc(0),
  ...props
});

const T = ADS.ADS_DATA_TYPES;

/** ST_Point: {x: REAL, y: REAL} - 8 bytes */
const pointSubItems = () => [
  makeType({ name: 'x', type: 'REAL', adsDataType: T.ADST_REAL32, size: 4, offset: 0 }),
  makeType({ name: 'y', type: 'REAL', adsDataType: T.ADST_REAL32, size: 4, offset: 4 }),
];

/**
 * A struct exercising every decoder branch: primitives of all widths, strings,
 * enums (known + unknown value), TIME/DT, nested struct, arrays (primitive,
 * struct, 2D) and BitValues bits. 152 bytes.
 */
const mixedStructType = () => makeType({
  name: 'ST_Mixed',
  adsDataType: T.ADST_BIGTYPE,
  size: 152,
  subItems: [
    makeType({ name: 'bBool', type: 'BOOL', adsDataType: T.ADST_BIT, size: 1, offset: 0 }),
    makeType({ name: 'nByte', type: 'BYTE', adsDataType: T.ADST_UINT8, size: 1, offset: 1 }),
    makeType({ name: 'nInt', type: 'INT', adsDataType: T.ADST_INT16, size: 2, offset: 2 }),
    makeType({ name: 'nUInt', type: 'UINT', adsDataType: T.ADST_UINT16, size: 2, offset: 4 }),
    makeType({ name: 'nDInt', type: 'DINT', adsDataType: T.ADST_INT32, size: 4, offset: 8 }),
    makeType({ name: 'nUDInt', type: 'UDINT', adsDataType: T.ADST_UINT32, size: 4, offset: 12 }),
    makeType({ name: 'fReal', type: 'REAL', adsDataType: T.ADST_REAL32, size: 4, offset: 16 }),
    makeType({ name: 'fLReal', type: 'LREAL', adsDataType: T.ADST_REAL64, size: 8, offset: 24 }),
    makeType({ name: 'nLInt', type: 'LINT', adsDataType: T.ADST_INT64, size: 8, offset: 32 }),
    makeType({ name: 'nLWord', type: 'LWORD', adsDataType: T.ADST_UINT64, size: 8, offset: 40 }),
    makeType({ name: 'sStr', type: 'STRING(15)', adsDataType: T.ADST_STRING, size: 16, offset: 48 }),
    makeType({ name: 'wStr', type: 'WSTRING(5)', adsDataType: T.ADST_WSTRING, size: 12, offset: 64 }),
    makeType({
      name: 'eMode', type: 'INT', adsDataType: T.ADST_INT16, size: 2, offset: 76,
      enumInfos: [{ name: 'A', value: 0 }, { name: 'B', value: 5 }, { name: 'C', value: 10 }]
    }),
    makeType({ name: 'tTime', type: 'TIME', adsDataType: T.ADST_UINT32, size: 4, offset: 80 }),
    makeType({ name: 'dtDate', type: 'DT', adsDataType: T.ADST_UINT32, size: 4, offset: 84 }),
    makeType({
      name: 'stInner', type: 'ST_Point', adsDataType: T.ADST_BIGTYPE, size: 8, offset: 88,
      subItems: pointSubItems()
    }),
    makeType({
      name: 'aInts', type: 'INT', adsDataType: T.ADST_INT16, size: 2, offset: 100,
      arrayDimension: 1, arrayInfos: [{ startIndex: 0, length: 4 }]
    }),
    makeType({
      name: 'aPoints', type: 'ST_Point', adsDataType: T.ADST_BIGTYPE, size: 8, offset: 108,
      arrayDimension: 1, arrayInfos: [{ startIndex: 0, length: 2 }],
      subItems: pointSubItems()
    }),
    makeType({
      name: 'a2d', type: 'UDINT', adsDataType: T.ADST_UINT32, size: 4, offset: 124,
      arrayDimension: 2, arrayInfos: [{ startIndex: 0, length: 2 }, { startIndex: 0, length: 3 }]
    }),
    //BitValues: offset is in bits (148 bytes = 1184 bits)
    makeType({ name: 'bFlag0', type: 'BOOL', adsDataType: T.ADST_BIT, size: 1, offset: 1184, flagsStr: ['BitValues'] }),
    makeType({ name: 'bFlag3', type: 'BOOL', adsDataType: T.ADST_BIT, size: 1, offset: 1187, flagsStr: ['BitValues'] }),
  ]
});

/** Builds a buffer matching mixedStructType() with non-trivial values */
const mixedStructBuffer = (enumValue = 5) => {
  const data = Buffer.alloc(152);
  data.writeUInt8(1, 0); //bBool
  data.writeUInt8(200, 1); //nByte
  data.writeInt16LE(-12345, 2); //nInt
  data.writeUInt16LE(54321, 4); //nUInt
  data.writeInt32LE(-7654321, 8); //nDInt
  data.writeUInt32LE(4000000000, 12); //nUDInt
  data.writeFloatLE(3.25, 16); //fReal
  data.writeDoubleLE(-2.5e42, 24); //fLReal
  data.writeBigInt64LE(-1234567890123456789n, 32); //nLInt
  data.writeBigUInt64LE(18446744073709551615n, 40); //nLWord
  Buffer.from('hello\0garbage!', 'latin1').copy(data, 48); //sStr (null-terminated + garbage)
  Buffer.from('wide\0', 'utf16le').copy(data, 64); //wStr
  data.writeInt16LE(enumValue, 76); //eMode
  data.writeUInt32LE(123456, 80); //tTime
  data.writeUInt32LE(1700000000, 84); //dtDate (epoch seconds)
  data.writeFloatLE(1.5, 88); data.writeFloatLE(-1.5, 92); //stInner
  [10, -20, 30, -40].forEach((v, i) => data.writeInt16LE(v, 100 + i * 2)); //aInts
  [0.5, 1.5, 2.5, 3.5].forEach((v, i) => data.writeFloatLE(v, 108 + i * 4)); //aPoints
  [1, 2, 3, 4, 5, 6].forEach((v, i) => data.writeUInt32LE(v, 124 + i * 4)); //a2d
  data.writeUInt8(0b00001001, 148); //bFlag0 = true, bFlag3 = true
  return data;
};

const makeClient = (settings = {}) => new Client({
  targetAmsNetId: '192.168.4.1.1.1',
  targetAdsPort: 851,
  ...settings
});

const SETTING_VARIANTS = [
  { objectifyEnumerations: true, convertDatesToJavascript: true },
  { objectifyEnumerations: false, convertDatesToJavascript: true },
  { objectifyEnumerations: true, convertDatesToJavascript: false },
  { objectifyEnumerations: false, convertDatesToJavascript: false },
];

describe('compileDataTypeDecoder', () => {

  test.each(SETTING_VARIANTS)('matches convertBufferToObject() (%o)', (settings) => {
    const client = makeClient(settings);
    const dataType = mixedStructType();
    const data = mixedStructBuffer();

    const interpreted = client['convertBufferToObject'](data, dataType);
    const decoder = compileDataTypeDecoder(dataType, client.settings);

    expect(decoder).toBeDefined();
    expect(decoder(data)).toStrictEqual(interpreted);
  });

  test('matches convertBufferToObject() for unknown enum values', () => {
    const client = makeClient();
    const dataType = mixedStructType();
    const data = mixedStructBuffer(7); //7 is not a valid eMode value

    const decoded = compileDataTypeDecoder(dataType, client.settings)(data);

    expect(decoded).toStrictEqual(client['convertBufferToObject'](data, dataType));
    expect(decoded.eMode).toEqual({ name: '', value: 7 });
  });

  test('returns the shared enum entry object for known values (like the interpreter)', () => {
    const client = makeClient();
    const dataType = mixedStructType();
    const data = mixedStructBuffer(5);

    const decoded = compileDataTypeDecoder(dataType, client.settings)(data);
    const enumEntry = dataType.subItems.find(item => item.name === 'eMode').enumInfos[1];

    expect(decoded.eMode).toBe(enumEntry); //Identity, not just equality
    expect(client['convertBufferToObject'](data, dataType).eMode).toBe(enumEntry);
  });

  test('decodes primitives at the top level (no struct)', () => {
    const client = makeClient();
    const dataType = makeType({ name: 'LREAL', type: 'LREAL', adsDataType: T.ADST_REAL64, size: 8 });
    const data = Buffer.alloc(8);
    data.writeDoubleLE(123.456, 0);

    expect(compileDataTypeDecoder(dataType, client.settings)(data))
      .toStrictEqual(client['convertBufferToObject'](data, dataType));
  });

  test('applies UTF-8 string encoding from symbol attributes (root only, like the interpreter)', () => {
    const client = makeClient();
    const dataType = makeType({ name: 'STRING(15)', type: 'STRING(15)', adsDataType: T.ADST_STRING, size: 16 });
    const attributes = [{ name: 'TcEncoding', value: 'UTF-8' }];
    const data = Buffer.alloc(16);
    Buffer.from('höyry\0', 'utf8').copy(data, 0);

    const decoded = compileDataTypeDecoder(dataType, client.settings, attributes)(data);

    expect(decoded).toBe('höyry');
    expect(decoded).toStrictEqual(client['convertBufferToObject'](data, dataType, attributes));
  });

  test('returns undefined for unsupported constructs', () => {
    const client = makeClient();
    const dataType = makeType({ name: 'ST_Weird', type: 'SOME_UNKNOWN_TYPE', adsDataType: 999, size: 4 });

    expect(compileDataTypeDecoder(dataType, client.settings)).toBeUndefined();
  });
});

describe('Client.decodeBufferToObject', () => {

  test('uses the compiled decoder when useCompiledDecoders is set and caches it', () => {
    const client = makeClient({ useCompiledDecoders: true });
    const dataType = mixedStructType();
    const data = mixedStructBuffer();

    const interpreted = client['convertBufferToObject'](data, dataType);

    expect(client['decodeBufferToObject'](data, dataType)).toStrictEqual(interpreted);
    expect(client['compiledDecoders'].has(dataType)).toBe(true);
    expect(client['decodeBufferToObject'](data, dataType)).toStrictEqual(interpreted); //Cached path
  });

  test('falls back to the interpreter when compilation is not possible', () => {
    const client = makeClient({ useCompiledDecoders: true });
    const dataType = makeType({ name: 'INT', type: 'INT', adsDataType: T.ADST_INT16, size: 2 });
    //Sabotage compilation by making the base type unresolvable, then restore
    const brokenType = { ...dataType, type: 'SOME_UNKNOWN_TYPE' };
    const data = Buffer.alloc(2);
    data.writeInt16LE(42, 0);

    expect(compileDataTypeDecoder(brokenType, client.settings)).toBeUndefined();
    expect(() => client['decodeBufferToObject'](data, dataType)).not.toThrow();
    expect(client['decodeBufferToObject'](data, dataType)).toBe(42);
  });

  test('skips the compiled path for targetOpts overrides (data type cache does not apply)', () => {
    const client = makeClient({ useCompiledDecoders: true });
    const dataType = mixedStructType();
    const data = mixedStructBuffer();

    //With targetOpts, buildDataType() returns a fresh AdsDataType per call, so caching
    //a decoder (keyed by object identity) would silently recompile on every call
    const result = client['decodeBufferToObject'](data, dataType, undefined, { amsNetId: '192.168.4.2.1.1' });

    expect(result).toStrictEqual(client['convertBufferToObject'](data, dataType));
    expect(client['compiledDecoders'].has(dataType)).toBe(false);
  });

  test('is disabled by default', () => {
    const client = makeClient();

    expect(client.settings.useCompiledDecoders).toBe(false);
    client['decodeBufferToObject'](mixedStructBuffer(), mixedStructType());
    expect(client['compiledDecoders'].has(mixedStructType())).toBe(false);
  });

  test('compiled decoding is substantially faster than interpreting', () => {
    const client = makeClient();
    //Realistic subscription shape: deeply nested numeric/bool struct (like an
    //axis/drive status), where metadata interpretation dominates - strings would
    //compress the ratio as iconv decoding costs the same on both paths
    const axis = () => makeType({
      name: 'ST_Axis', type: 'ST_Axis', adsDataType: T.ADST_BIGTYPE, size: 40,
      subItems: [
        makeType({ name: 'bEnabled', type: 'BOOL', adsDataType: T.ADST_BIT, size: 1, offset: 0 }),
        makeType({ name: 'bHomed', type: 'BOOL', adsDataType: T.ADST_BIT, size: 1, offset: 1 }),
        makeType({
          name: 'eState', type: 'INT', adsDataType: T.ADST_INT16, size: 2, offset: 2,
          enumInfos: [{ name: 'IDLE', value: 0 }, { name: 'MOVING', value: 1 }, { name: 'ERROR', value: 2 }]
        }),
        makeType({ name: 'nErrorId', type: 'UDINT', adsDataType: T.ADST_UINT32, size: 4, offset: 4 }),
        makeType({ name: 'fPosition', type: 'LREAL', adsDataType: T.ADST_REAL64, size: 8, offset: 8 }),
        makeType({ name: 'fVelocity', type: 'LREAL', adsDataType: T.ADST_REAL64, size: 8, offset: 16 }),
        makeType({ name: 'fTorque', type: 'LREAL', adsDataType: T.ADST_REAL64, size: 8, offset: 24 }),
        makeType({
          name: 'Inputs', type: 'ST_Inputs', adsDataType: T.ADST_BIGTYPE, size: 8, offset: 32,
          subItems: [0, 1, 2, 3, 4, 5, 6, 7].map(i =>
            makeType({ name: `bIn${i}`, type: 'BOOL', adsDataType: T.ADST_BIT, size: 1, offset: i }))
        }),
      ]
    });
    const dataType = makeType({
      name: 'ST_Status', type: 'ST_Status', adsDataType: T.ADST_BIGTYPE, size: 168,
      subItems: [
        makeType({ name: 'bHasError', type: 'BOOL', adsDataType: T.ADST_BIT, size: 1, offset: 0 }),
        makeType({ ...axis(), name: 'Horizontal', offset: 8 }),
        makeType({ ...axis(), name: 'Vertical', offset: 48 }),
        makeType({ ...axis(), name: 'Gripper', offset: 88 }),
        makeType({ ...axis(), name: 'ZAxis', offset: 128 }),
      ]
    });
    const data = Buffer.alloc(168);
    for (let i = 0; i < 168; i++) data.writeUInt8((i * 7) % 250, i);
    const decoder = compileDataTypeDecoder(dataType, client.settings);
    expect(decoder(data)).toStrictEqual(client['convertBufferToObject'](data, dataType));
    const N = 2000;

    //Warmup
    for (let i = 0; i < 200; i++) {
      decoder(data);
      client['convertBufferToObject'](data, dataType);
    }

    const t0 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) decoder(data);
    const t1 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) client['convertBufferToObject'](data, dataType);
    const t2 = process.hrtime.bigint();

    const compiledUs = Number(t1 - t0) / N / 1000;
    const interpretedUs = Number(t2 - t1) / N / 1000;
    console.info(`compiled: ${compiledUs.toFixed(2)} µs/op, interpreted: ${interpretedUs.toFixed(2)} µs/op, ${(interpretedUs / compiledUs).toFixed(1)}x`);

    expect(interpretedUs / compiledUs).toBeGreaterThan(2);
  });
});
