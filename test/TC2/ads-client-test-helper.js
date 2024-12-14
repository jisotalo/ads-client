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
  //typeGuid: '95190718000000000000000100000052', <- not in TC2
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
  //typeGuid: 'e25ca2c595fc17906eb25949c2faeb1c', <- not in TC2
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
  //LWORD_: 18446744073709551615n, <- not in TC2
  //LINT_: 9223372036854775807n, <- not in TC2
  //LINT_2: -9223372036854775808n, <- not in TC2
  //ULINT_: 18446744073709551615n, <- not in TC2
  LREAL_: expect.closeTo(1.7e+308),
  LREAL_2: expect.closeTo(-1.7e+308),
  LREAL_3: expect.closeTo(75483.546875),
  LREAL_4: expect.closeTo(-75483.546875),
  //WSTRING_: 'A test wstring ääöö!!@@ ẞẟΔش', <- not in TC2
  //WSTRING_2: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque bibendum mauris vel metus rutrum, sed gravida justo dignissim. Aenean et nisi cursus, auctor mi vel, posuere enim. Suspendisse ultricies mauris in finibus tristique. Nullam turpis duis.', <- not in TC2
  //LTIME_: 18446744073709551615n <- not in TC2
};


const ST_STANDARD_TYPES_WRITE = {
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
  REAL_: 3.3999999521443642e+38,
  REAL_2: -3.3999999521443642e+38,
  REAL_3: 75483.546875,
  REAL_4: -75483.546875,
  STRING_: 'A test string ääöö!!@@',
  STRING_2: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque bibendum mauris vel metus rutrum, sed gravida justo dignissim. Aenean et nisi cursus, auctor mi vel, posuere enim. Suspendisse ultricies mauris in finibus tristique. Nullam turpis duis.',
  DATE_: new Date('2106-02-06T00:00:00.000Z'),
  DT_: new Date('2106-02-06T06:28:15.000Z'),
  DT_2: new Date('2106-02-06T06:28:15.000Z'),
  TOD_: 4294967295,
  TOD_2: 4294967295,
  TIME_: 4294967295,
  //LWORD_: 18446744073709551615n, <- not in TC2
  //LINT_: 9223372036854775807n, <- not in TC2
  //LINT_2: -9223372036854775808n, <- not in TC2
  //ULINT_: 18446744073709551615n, <- not in TC2
  LREAL_: 1.7e+308,
  LREAL_2: -1.7e+308,
  LREAL_3: 75483.546875,
  LREAL_4: -75483.546875,
  //WSTRING_: 'A test wstring ääöö!!@@ ẞẟΔش', <- not in TC2
  //WSTRING_2: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque bibendum mauris vel metus rutrum, sed gravida justo dignissim. Aenean et nisi cursus, auctor mi vel, posuere enim. Suspendisse ultricies mauris in finibus tristique. Nullam turpis duis.', <- not in TC2
  //LTIME_: 18446744073709551615n <- not in TC2
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
  REAL_: [expect.closeTo(3.3999999521443642e+38), expect.closeTo(0), expect.closeTo(-3.3999999521443642e+38)],
  REAL_2: [expect.closeTo(-3.3999999521443642e+38), expect.closeTo(0), expect.closeTo(3.3999999521443642e+38)],
  REAL_3: [expect.closeTo(75483.546875), expect.closeTo(0), expect.closeTo(-75483.546875)],
  REAL_4: [expect.closeTo(-75483.546875), expect.closeTo(0), expect.closeTo(75483.546875)],
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
  LREAL_: [expect.closeTo(1.7e+308), expect.closeTo(0), expect.closeTo(-1.7e+308)],
  LREAL_2: [expect.closeTo(-1.7e+308), expect.closeTo(0), expect.closeTo(1.7e+308)],
  LREAL_3: [expect.closeTo(75483.546875), expect.closeTo(0), expect.closeTo(-75483.546875)],
  LREAL_4: [expect.closeTo(-75483.546875), expect.closeTo(0), expect.closeTo(75483.546875)],
}


const ST_STANDARD_ARRAY_TYPES_WRITE =
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
  REAL_: [3.3999999521443642e+38, 0, -3.3999999521443642e+38],
  REAL_2: [-3.3999999521443642e+38, 0, 3.3999999521443642e+38],
  REAL_3: [75483.546875, 0, -75483.546875],
  REAL_4: [-75483.546875, 0, 75483.546875],
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
  LREAL_: [1.7e+308, 0, -1.7e+308],
  LREAL_2: [-1.7e+308, 0, 1.7e+308],
  LREAL_3: [75483.546875, 0, -75483.546875],
  LREAL_4: [-75483.546875, 0, 75483.546875],
  WSTRING_: ['A test wstring ääöö!!@@ ẞẟΔش', '', 'ẞẟΔ'],
  WSTRING_2: [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque bibendum mauris vel metus rutrum, sed gravida justo dignissim. Aenean et nisi cursus, auctor mi vel, posuere enim. Suspendisse ultricies mauris in finibus tristique. Nullam turpis duis.',
    '',
    'Proin tempor diam a felis fermentum, id molestie tortor pharetra. Phasellus condimentum rhoncus ultrices. Suspendisse ultricies nec neque quis sodales. In molestie vestibulum nulla eu gravida. Morbi orci ipsum, gravida elementum eros non, egestas egestas.'
  ],
  LTIME_: [18446744073709551615n, 18446744073709551614n, 0n]
}


const BLOCK_4 = (IS_64_BIT) => ({
  BREAD: false,
  SNETID: '',
  NPORT: 801,
  SVARNAME: '',
  NDESTADDR: IS_64_BIT ? 0n : 0,
  NLEN: 0,
  TTIMEOUT: 5000,
  ECOMMODE: 0,
  BBUSY: false,
  BERROR: false,
  NERRORID: 0,
  SVARNAME_INT: '',
  SNETID_INT: '',
  NPORT_INT: 801,
  FBGETHANDLE: {
    NETID: '',
    PORT: 0,
    IDXGRP: 0,
    IDXOFFS: 0,
    WRITELEN: 0,
    READLEN: 0,
    SRCADDR: IS_64_BIT ? 0n : 0,
    DESTADDR: IS_64_BIT ? 0n : 0,
    WRTRD: false,
    TMOUT: 5000,
    BUSY: false,
    ERR: false,
    ERRID: 0,
    FBADSRDWRT: {
      STAMP_I: 0,
      ACCESSCNT_I: 0,
      BUSY_I: false,
      ERR_I: false,
      ERRID_I: 0,
      WRTRD_SAV_I: false,
      PDESTADDR_I: 0,
      TICKSTART_I: 0,
      SNETID: '',
      NPORT: 0,
      NIDXGRP: 0,
      NIDXOFFS: 0,
      CBWRITELEN: 0,
      CBREADLEN: 0,
      PWRITEBUFF: 0,
      PREADBUFF: 0,
      BEXECUTE: false,
      TTIMEOUT: 0,
      BBUSY: false,
      BERROR: false,
      NERRID: 0,
      CBREAD: 0
    },
  },
  FBRELEASEHANDLE: {
    FBADSWRITE: {
      STAMP_I: 0,
      ACCESSCNT_I: 0,
      BUSY_I: false,
      ERR_I: false,
      ERRID_I: 0,
      WRITE_SAV_I: false,
      TICKSTART_I: 0,
      SNETID: '',
      NPORT: 0,
      NIDXGRP: 0,
      NIDXOFFS: 0,
      CBWRITELEN: 0,
      PWRITEBUFF: 0,
      BEXECUTE: false,
      TTIMEOUT: 0,
      BBUSY: false,
      BERROR: false,
      NERRID: 0
    },
    NETID: '',
    PORT: 0,
    IDXGRP: 0,
    IDXOFFS: 0,
    LEN: 0,
    SRCADDR: IS_64_BIT ? 0n : 0,
    WRITE: false,
    TMOUT: 5000,
    BUSY: false,
    ERR: false,
    ERRID: 0
  },
  FBREADBYHANDLE: {
    FBADSREAD: {
      STAMP_I: 0,
      ACCESSCNT_I: 0,
      BUSY_I: false,
      ERR_I: false,
      ERRID_I: 0,
      READ_SAV_I: false,
      TICKSTART_I: 0,
      SNETID: '',
      NPORT: 0,
      NIDXGRP: 0,
      NIDXOFFS: 0,
      CBREADLEN: 0,
      PREADBUFF: 0,
      BEXECUTE: false,
      TTIMEOUT: 0,
      BBUSY: false,
      BERROR: false,
      NERRID: 0,
      CBREAD: 0
    },
    NETID: '',
    PORT: 0,
    IDXGRP: 0,
    IDXOFFS: 0,
    LEN: 0,
    DESTADDR: IS_64_BIT ? 0n : 0,
    READ: false,
    TMOUT: 5000,
    BUSY: false,
    ERR: false,
    ERRID: 0
  },
  TRIGREAD: { CLK: false, Q: false, M: false },
  ISTEP: 0,
  INEXTSTEP: 0,
  NSYMBOLHANDLE: 0
});




module.exports = {
  SYMBOL_INFO_OBJECT,
  DATA_TYPE_OBJECT,
  ST_STANDARD_TYPES,
  ST_STANDARD_TYPES_WRITE,
  ST_STANDARD_ARRAY_TYPES,
  ST_STANDARD_ARRAY_TYPES_WRITE,
  BLOCK_4
}