// Type utility function: Freeze
// Generates a readonly version of a given object, array, or map type applied recursively to the nested members of the root type.
// It's like TypeScript's `readonly`, but goes all the way down a tree.

// prettier-ignore
import {Map} from 'immutable';
import {ReadonlyList, ReadonlyText} from './readonly.type';
import {List} from './list.interface';

export type Freeze<T> =
  T extends Function ? T
    : T extends Text ? ReadonlyText
    // : T extends Table<infer T, infer KeyOrder> ? FreezeTable<T, KeyOrder>
      : T extends List<infer T> ? FreezeList<T>
        : T extends Array<infer T> ? FreezeArray<T>
          : T extends Map<infer K, infer V> ? FreezeMap<K, V>
            : FreezeObject<T>

// export interface FreezeTable<T, KeyOrder> extends ReadonlyTable<Freeze<T>, Array<keyof Freeze<T>>> {
// }

export interface FreezeList<T> extends ReadonlyList<Freeze<T>> {
}

export interface FreezeArray<T> extends ReadonlyArray<Freeze<T>> {
}

export interface FreezeMap<K, V> extends ReadonlyMap<Freeze<K>, Freeze<V>> {
}

export type FreezeObject<T> = { readonly [P in keyof T]: Freeze<T[P]> }
