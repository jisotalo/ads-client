import * as ADS from "./ads-commons";
import type { AdsAttributeEntry, AdsDataType, AdsEnumInfoEntry } from "./types/ads-protocol-types";

/**
 * A compiled decoder converts raw PLC data to a Javascript object,
 * exactly like `Client.convertBufferToObject()` does.
 *
 * `convertBufferToObject()` re-interprets the `AdsDataType` metadata tree on every
 * call: property lookups, type dispatch, `subarray()` slices and enum searches for
 * each member. The metadata is static per data type, so all of that work can be done
 * once: `compileDataTypeDecoder()` partially evaluates the metadata into a tree of
 * small closures with precomputed byte offsets, leaving only the buffer reads for
 * runtime. For large structs read at high notification rates this is typically
 * several times faster than the interpreting path.
 */
export type CompiledDecoder = (data: Buffer) => any;

/**
 * Settings that affect value decoding (subset of `AdsClientSettings`).
 */
export interface CompiledDecoderSettings {
  /** If set, enumeration (ENUM) data types are converted to objects */
  objectifyEnumerations: boolean,
  /** If set, PLC date types are converted to Javascript `Date` objects */
  convertDatesToJavascript: boolean
}

/**
 * A decoder for a node of the data type tree.
 * `base` is the absolute byte offset of the node's parent scope in `data`.
 */
type NodeDecoder = (data: Buffer, base: number) => any;

/**
 * Offset-native readers for base types whose value is a pure number/boolean/bigint,
 * keyed by the canonical (first) name of the `ADS.BASE_DATA_TYPES` entry.
 * Everything else falls back to the entry's own `fromBuffer()` on a subarray.
 *
 * NOTE: `TIME`/`TOD` alias `UDINT` and `LTIME` aliases `LWORD` in `BASE_DATA_TYPES`,
 * so they are covered here. `DATE_AND_TIME`/`DT`/`DATE` have their own entry with
 * date conversion and take the fallback path.
 */
const NATIVE_READERS: Record<string, (data: Buffer, offset: number) => any> = {
  'BOOL': (data, offset) => data.readUInt8(offset) !== 0,
  'BYTE': (data, offset) => data.readUInt8(offset),
  'SINT': (data, offset) => data.readInt8(offset),
  'UINT': (data, offset) => data.readUInt16LE(offset),
  'INT': (data, offset) => data.readInt16LE(offset),
  'DINT': (data, offset) => data.readInt32LE(offset),
  'UDINT': (data, offset) => data.readUInt32LE(offset),
  'REAL': (data, offset) => data.readFloatLE(offset),
  'LREAL': (data, offset) => data.readDoubleLE(offset),
  'LWORD': (data, offset) => data.readBigUInt64LE(offset),
  'LINT': (data, offset) => data.readBigInt64LE(offset),
};

/**
 * Signals that a data type contains a construct the compiler does not support.
 * The caller is expected to fall back to `convertBufferToObject()`.
 */
class UnsupportedDataType extends Error { }

/**
 * Compiles a decoder function for the given data type.
 *
 * The returned decoder produces output identical to `convertBufferToObject()`
 * (given the same `settings` and `attributes`) without re-walking the data type
 * metadata on every call.
 *
 * Returns `undefined` if the data type contains a construct the compiler does not
 * support - the caller should then fall back to `convertBufferToObject()`.
 *
 * @param dataType The data type to compile a decoder for (as built by `Client.buildDataType()`)
 * @param settings Decoding-related client settings
 * @param attributes Additional attributes of the symbol used for conversion (as `convertBufferToObject()` receives them - only applied to the root node)
 */
export const compileDataTypeDecoder = (dataType: AdsDataType, settings: CompiledDecoderSettings, attributes?: AdsAttributeEntry[]): CompiledDecoder | undefined => {
  try {
    const decoder = compileNode(dataType, settings, false, attributes);
    return (data: Buffer) => decoder(data, 0);

  } catch (err) {
    if (err instanceof UnsupportedDataType) {
      return undefined;
    }
    throw err;
  }
};

/**
 * Compiles a decoder for one node of the data type tree.
 *
 * Mirrors the branch structure of `Client.convertBufferToObject()` - each branch
 * here must produce the same result as the corresponding branch there.
 *
 * @param dataType Data type of this node
 * @param settings Decoding-related client settings
 * @param isArrayItem If `true`, this node is an array item (offsets relative to the element base)
 * @param attributes Symbol attributes (root node only, like in `convertBufferToObject()`)
 */
const compileNode = (dataType: AdsDataType, settings: CompiledDecoderSettings, isArrayItem: boolean, attributes?: AdsAttributeEntry[]): NodeDecoder => {

  if ((dataType.arrayInfos.length === 0 || isArrayItem) && dataType.subItems.length > 0) {
    //Struct or array item
    //convertBufferToObject() slices the buffer to dataType.offset and lets each
    //subitem apply its own offset - here that becomes a base offset for the children
    const structOffset = dataType.offset;
    const names = dataType.subItems.map(item => item.name);
    const decoders = dataType.subItems.map(item => compileNode(item, settings, false));
    const count = names.length;

    return (data, base) => {
      const result: Record<string, any> = {};
      const childBase = base + structOffset;

      for (let i = 0; i < count; i++) {
        result[names[i]] = decoders[i](data, childBase);
      }
      return result;
    };

  } else if (dataType.arrayInfos.length > 0 && !isArrayItem) {
    //Array
    const elementSize = dataType.size;
    const element = compileNode(dataType, settings, true);
    const dimensions = dataType.arrayInfos.map(info => info.length);

    //convertBufferToObject() does NOT apply dataType.offset in its array branch -
    //each element applies the offset itself (also for primitive elements).
    //Element i therefore starts at base + i * size, with the element decoder
    //adding dataType.offset internally.
    const decodeDimension = (data: Buffer, base: number, dim: number, flatIndex: number): [any[], number] => {
      const result = [];

      for (let i = 0; i < dimensions[dim]; i++) {
        if (dim + 1 < dimensions.length) {
          const [value, nextIndex] = decodeDimension(data, base, dim + 1, flatIndex);
          result.push(value);
          flatIndex = nextIndex;

        } else {
          result.push(element(data, base + flatIndex * elementSize));
          flatIndex++;
        }
      }
      return [result, flatIndex];
    };

    return (data, base) => decodeDimension(data, base, 0, 0)[0];

  } else if (dataType.enumInfos.length > 0 && settings.objectifyEnumerations) {
    //Enumeration and objectifyEnumerations is enabled
    //Like convertBufferToObject(), known values resolve to the shared AdsEnumInfoEntry
    //object from the metadata (interned - safe, as these are never mutated)
    const readValue = compilePrimitiveReader(dataType, settings);
    const entriesByValue = new Map<any, AdsEnumInfoEntry>();

    for (const entry of dataType.enumInfos) {
      entriesByValue.set(primitiveKey(entry.value), entry);
    }

    return (data, base) => {
      const value = readValue(data, base + dataType.offset);
      return entriesByValue.get(primitiveKey(value)) ?? { name: '', value } as AdsEnumInfoEntry;
    };

  } else if (dataType.adsDataType === ADS.ADS_DATA_TYPES.ADST_BIGTYPE && dataType.subItems.length === 0) {
    if (dataType.size === 0) {
      //Empty STRUCT
      return () => ({});
    }

    //Empty FUNCTION_BLOCK or INTERFACE - handled like a pointer
    const type = ADS.BASE_DATA_TYPES.getTypeByPseudoType('PVOID', dataType.size);

    if (!type) {
      throw new UnsupportedDataType(`No pseudo type PVOID of size ${dataType.size}`);
    }

    const { offset, size } = dataType;
    const convertDates = settings.convertDatesToJavascript;
    const fromBuffer = ADS.BASE_DATA_TYPES.find(type)?.fromBuffer;

    if (!fromBuffer) {
      throw new UnsupportedDataType(`Base type ${type} not found`);
    }
    return (data, base) => fromBuffer(data.subarray(base + offset, base + offset + size) as never, convertDates);

  } else if (dataType.flagsStr.includes('BitValues')) {
    //BIT (special case) - offset is in bits, relative to the parent scope
    const byteOffset = Math.floor(dataType.offset / 8);
    const bitMask = 1 << (dataType.offset % 8);

    return (data, base) => !!(data.readUInt8(base + byteOffset) & bitMask);

  } else {
    //Primitive type
    const { offset } = dataType;
    const readValue = compilePrimitiveReader(dataType, settings, attributes);

    return (data, base) => readValue(data, base + offset);
  }
};

/**
 * Compiles an offset-taking reader equivalent to `Client.convertBufferToPrimitiveType()`
 * for the given data type, resolving the base type and string encoding at compile time.
 */
const compilePrimitiveReader = (dataType: AdsDataType, settings: CompiledDecoderSettings, attributes?: AdsAttributeEntry[]): ((data: Buffer, offset: number) => any) => {
  const { size } = dataType;

  if (dataType.adsDataType === ADS.ADS_DATA_TYPES.ADST_STRING) {
    //Encoding resolution as in getStringDataTypeEncoding()
    const encoding = dataType.attributes.find((attr) => attr.name === 'TcEncoding')?.value
      ?? attributes?.find((attr) => attr.name === 'TcEncoding')?.value;
    const utf8 = encoding === 'UTF-8';

    return (data, offset) => ADS.decodePlcStringBuffer(data.subarray(offset, offset + size), utf8);
  }

  if (dataType.adsDataType === ADS.ADS_DATA_TYPES.ADST_WSTRING) {
    return (data, offset) => ADS.decodePlcWstringBuffer(data.subarray(offset, offset + size));
  }

  const type = ADS.BASE_DATA_TYPES.find(dataType.type);

  if (!type) {
    throw new UnsupportedDataType(`Base type ${dataType.type} not found`);
  }

  const nativeReader = NATIVE_READERS[type.name[0]];

  if (nativeReader && type.size === size) {
    return nativeReader;
  }

  //No offset-native reader (e.g. DATE_AND_TIME) - fall back to the base type's
  //own fromBuffer() on a subarray, resolved once here instead of per call
  const convertDates = settings.convertDatesToJavascript;
  return (data, offset) => type.fromBuffer(data.subarray(offset, offset + size) as never, convertDates);
};

/**
 * Map key for an enum underlying value - BigInt values (LINT-based enums)
 * cannot be used as Map keys interchangeably with numbers, so normalize.
 */
const primitiveKey = (value: any): any => typeof value === 'bigint' ? value.toString() : value;
