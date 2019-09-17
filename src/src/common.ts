import {Map} from 'immutable';
import {ClockImmutable} from './clock.interface';

export const ROOT_ID = '00000000-0000-0000-0000-000000000000';

export function isObject(obj: unknown): obj is object {
  return typeof obj === 'object' && obj !== null;
}

/**
 * Returns a shallow copy of the object `obj`. Faster than `Object.assign({}, obj)`.
 * https://jsperf.com/cloning-large-objects/1
 */
export function copyObject<T extends { [key: string]: any }>(obj: T): T {
  if (!isObject(obj)) return {} as T;
  let copy: T = {} as T;
  for (const key of (Object.keys(obj) as Array<keyof T>)) {
    copy[key] = obj[key]
  }
  return copy
}

/**
 * Returns true if all components of `clock1` are less than or equal to those
 * of `clock2` (both clocks given as Immutable.js Map objects). Returns false
 * if there is at least one component in which `clock1` is greater than
 * `clock2` (that is, either `clock1` is overall greater than `clock2`, or the
 * clocks are incomparable).
 */
export function lessOrEqual(clock1: ClockImmutable, clock2: ClockImmutable): boolean {
  return clock1
    .keySeq()
    .concat(clock2.keySeq())
    .reduce(
    (result: boolean | undefined, key: string | undefined) => {
      return Boolean(result &&
        clock1.get(key as string, 0) <= clock2.get(key as string, 0),
      );
    }, true);
}

/**
 * Takes a string in the form that is used to identify list elements (an actor
 * ID concatenated with a counter, separated by a colon) and returns an object
 * of the structure `{counter, actorId}`.
 */
export function parseElemId(elemId: string): {counter: number, actorId: string} {
  const match = /^(.*):(\d+)$/.exec(elemId || '');

  if (!match) {
    throw new RangeError(`Not a valid elemId: ${elemId}`)
  }

  return {counter: parseInt(match[2]), actorId: match[1]};
}
