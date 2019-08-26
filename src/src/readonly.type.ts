import {List} from './list';
import {Text} from './text.interface';

// TODO-Tom: Add me again once table has been converted to typescript.
// export type ReadonlyTable<T, KeyOrder extends Array<keyof T>> = ReadonlyArray<T> & Table<T, KeyOrder>
export type ReadonlyList<T> = ReadonlyArray<T> & List<T>
export type ReadonlyText = ReadonlyList<string> & Text
