export type DeepCopyConstructor = new (...args: any[]) => any;

// @ts-ignore
export type DeepCopyRealm = Window;

export interface DeepCopyCache {
  _values?: any[];
  add: (value: any) => void;
  has: (value: any) => boolean;
}

export type DeepCopyCopier = (object: any, cache: DeepCopyCache) => any;

export type DeepCopyObjectCloner = (
  object: any,
  realm: DeepCopyRealm,
  handleCopy: DeepCopyCopier,
  cache: DeepCopyCache,
) => any;

export interface DeepCopyOptions {
  isStrict?: boolean;
  realm?: DeepCopyRealm;
}

const {toString: toStringFunction} = Function.prototype;
const {
  create,
  defineProperty,
  getOwnPropertyDescriptor,
  getOwnPropertyNames,
  getOwnPropertySymbols,
  getPrototypeOf,
} = Object;
const {hasOwnProperty, propertyIsEnumerable} = Object.prototype;

export const SUPPORTS = {
  SYMBOL_PROPERTIES: typeof getOwnPropertySymbols === 'function',
  WEAKSET: typeof WeakSet === 'function',
};

/**
 *
 * @description
 * get a new cache object to prevent circular references
 *
 * @returns the new cache object
 */
export const createCache = (): DeepCopyCache => {
  if (SUPPORTS.WEAKSET) {
    return new WeakSet();
  }

  const object = create({
    add: (value: any) => object._values.push(value),
    // tslint:disable-next-line:no-bitwise
    has: (value: any) => !!~object._values.indexOf(value),
  });

  object._values = [];

  return object;
};

/**
 *
 * @description
 * get an empty version of the object with the same prototype it has
 *
 * @param object the object to build a clean clone from
 * @param realm the realm the object resides in
 * @returns the empty cloned object
 */
export const getCleanClone = (object: any): any => {
  if (!object.constructor) {
    return create(null);
  }

  const prototype = object.__proto__ || getPrototypeOf(object);

  // @ts-ignore
  if (object.constructor === Object) {
    // @ts-ignore
    return prototype === Object.prototype ? {} : create(prototype);
  }

  // tslint:disable-next-line:no-bitwise
  if (~toStringFunction.call(object.constructor).indexOf('[native code]')) {
    try {
      return new object.constructor();
    } catch {
    }
  }

  return create(prototype);
};

/**
 *
 * @description
 * and symbols are copied, but property descriptors are not considered
 *
 * @param object the object to clone
 * @param realm the realm the object resides in
 * @param handleCopy the function that handles copying the object
 * @param cache Cache
 * @returns the copied object
 */
export const getObjectCloneLoose: DeepCopyObjectCloner = (
  object: any,
  realm: DeepCopyRealm,
  handleCopy: DeepCopyCopier,
  cache: DeepCopyCache,
): any => {
  const clone: any = getCleanClone(object);

  for (const key in object) {
    if (hasOwnProperty.call(object, key)) {
      clone[key] = handleCopy(object[key], cache);
    }
  }

  if (SUPPORTS.SYMBOL_PROPERTIES) {
    const symbols: symbol[] = getOwnPropertySymbols(object);

    if (symbols.length) {
      for (let index = 0, symbol; index < symbols.length; index++) {
        symbol = symbols[index];

        if (propertyIsEnumerable.call(object, symbol)) {
          clone[symbol] = handleCopy(object[symbol], cache);
        }
      }
    }
  }

  return clone;
};

/**
 *
 * @description
 * get a copy of the object based on strict rules, meaning all keys and symbols
 * are copied based on the original property descriptors
 *
 * @param object the object to clone
 * @param realm the realm the object resides in
 * @param handleCopy the function that handles copying the object
 * @param cache Cache
 * @returns the copied object
 */
export const getObjectCloneStrict: DeepCopyObjectCloner = (
  object: any,
  realm: DeepCopyRealm,
  handleCopy: DeepCopyCopier,
  cache: DeepCopyCache,
): any => {
  const clone: any = getCleanClone(object);

  const properties: (string | symbol)[] = SUPPORTS.SYMBOL_PROPERTIES
    // @ts-ignore
    ? [].concat(getOwnPropertyNames(object), getOwnPropertySymbols(object))
    : getOwnPropertyNames(object);

  if (properties.length) {
    for (
      let index = 0, property, descriptor;
      index < properties.length;
      index++
    ) {
      property = properties[index];

      if (property !== 'callee' && property !== 'caller') {
        descriptor = getOwnPropertyDescriptor(object, property);

        // @ts-ignore
        descriptor.value = handleCopy(object[property], cache);

        // @ts-ignore
        defineProperty(clone, property, descriptor);
      }
    }
  }

  return clone;
};

/**
 *
 * @description
 * get the flags to apply to the copied regexp
 *
 * @param regExp the regexp to get the flags of
 * @returns the flags for the regexp
 */
export const getRegExpFlags = (regExp: RegExp): string => {
  let flags = '';

  if (regExp.global) {
    flags += 'g';
  }

  if (regExp.ignoreCase) {
    flags += 'i';
  }

  if (regExp.multiline) {
    flags += 'm';
  }

  if (regExp.unicode) {
    flags += 'u';
  }

  if (regExp.sticky) {
    flags += 'y';
  }

  return flags;
};

const {isArray} = Array;

const GLOBAL_THIS = (() => {
  if (typeof self !== 'undefined') {
    return self;
  }

  if (typeof window !== 'undefined') {
    return window;
  }

  if (console && console.error) {
    console.error('Unable to locate global object, returning "this".');
  }
})();

/**
 *
 * @description
 * copy an object deeply as much as possible
 *
 * are copied with their original property descriptors on both objects and arrays.
 *
 * The object is compared to the global constructors in the `realm` provided,
 * and the native constructor is always used to ensure that extensions of native
 * objects (allows in ES2015+) are maintained.
 *
 * @param object the object to copy
 * @param [options] the options for copying with
 * @param [options.isStrict] should the copy be strict
 * @param [options.realm] the realm (this) object the object is copied from
 * @returns the copied object
 */
export function copy<T>(object: T, options?: DeepCopyOptions): T {
  // manually coalesced instead of default parameters for performance
  const isStrict: boolean = !!(options && options.isStrict);
  // @ts-ignore
  const realm: DeepCopyRealm = (options && options.realm) || GLOBAL_THIS;

  const getObjectClone: DeepCopyObjectCloner = isStrict
    ? getObjectCloneStrict
    : getObjectCloneLoose;

  /**
   *
   * @description
   * copy the object recursively based on its type
   *
   * @param objectInHandle the object to copy
   * @param cache Cache
   * @returns the copied object
   */
  const handleCopy: DeepCopyCopier = (
    objectInHandle: any,
    cache: DeepCopyCache,
  ): any => {
    if (!objectInHandle || typeof objectInHandle !== 'object' || cache.has(objectInHandle)) {
      return objectInHandle;
    }

    const constructor: DeepCopyConstructor = objectInHandle.constructor;

    // plain objects
    // @ts-ignore
    if (constructor === Object) {
      cache.add(objectInHandle);

      return getObjectClone(objectInHandle, realm, handleCopy, cache);
    }

    let clone: any;

    // arrays
    if (isArray(objectInHandle)) {
      cache.add(objectInHandle);

      // if strict, include non-standard properties
      if (isStrict) {
        return getObjectCloneStrict(objectInHandle, realm, handleCopy, cache);
      }

      clone = new constructor();

      for (let index = 0; index < objectInHandle.length; index++) {
        clone[index] = handleCopy(objectInHandle[index], cache);
      }

      return clone;
    }

    // dates
    if (objectInHandle instanceof Date) {
      return new constructor(objectInHandle.getTime());
    }

    // regexps
    if (objectInHandle instanceof RegExp) {
      clone = new constructor(
        objectInHandle.source,
        objectInHandle.flags || getRegExpFlags(objectInHandle),
      );

      clone.lastIndex = objectInHandle.lastIndex;

      return clone;
    }

    // maps
    if (Map && objectInHandle instanceof Map) {
      cache.add(objectInHandle);

      clone = new constructor();

      objectInHandle.forEach((value: any, key: any) => {
        clone.set(key, handleCopy(value, cache));
      });

      return clone;
    }

    // sets
    if (Set && objectInHandle instanceof Set) {
      cache.add(objectInHandle);

      clone = new constructor();

      objectInHandle.forEach((value: any) => {
        clone.add(handleCopy(value, cache));
      });

      return clone;
    }

    // File
    if (File && objectInHandle instanceof File) {
      cache.add(objectInHandle);

      return new File([objectInHandle], objectInHandle.name, { type: objectInHandle.type });
    }

    // arraybuffers / dataviews
    if (ArrayBuffer) {
      // dataviews
      if (ArrayBuffer.isView(objectInHandle)) {
        return new constructor(objectInHandle.buffer.slice(0));
      }

      // arraybuffers
      if (objectInHandle instanceof ArrayBuffer) {
        return objectInHandle.slice(0);
      }
    }

    // if the object cannot / should not be cloned, don't
    if (
      // promise-like
      typeof objectInHandle.then === 'function' ||
      // errors
      objectInHandle instanceof Error ||
      // weakMaps
      (WeakMap && objectInHandle instanceof WeakMap) ||
      // weakSets
      (WeakSet && objectInHandle instanceof WeakSet)
    ) {
      return objectInHandle;
    }

    cache.add(objectInHandle);

    // assume anything left is a custom constructor
    return getObjectClone(objectInHandle, realm, handleCopy, cache);
  };

  return handleCopy(object, createCache());
}

/**
 *
 * @description
 * copy the object with `strict` option pre-applied
 *
 * @param object the object to copy
 * @param [options] the options for copying with
 * @param [options.realm] the realm (this) object the object is copied from
 * @returns the copied object
 */
(copy as any).strict = function strictCopy(object: any, options?: DeepCopyOptions) {
  return copy(object, {
    isStrict: true,
    realm: options ? options.realm : void 0,
  });
};
