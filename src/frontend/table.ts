import {UUID} from '../src/uuid';
import {CONFLICTS, IHasOBJECT_ID, OBJECT_ID} from './constants';
import {copyObject, isObject} from '../src/common';
import {isFrozen} from '../src/is-frozen';
import {isMutable} from '../src/is-mutable';



// Type utility function: KeyArray
// Enforces that the array provided for key order only contains keys of T
export type KeyArray<T, KeyOrder extends Array<keyof T>> = keyof T extends KeyOrder[number]
  ? KeyOrder
  : Exclude<keyof T, KeyOrder[number]>[]

function compareRows<T extends object>(properties: Array<keyof T>, row1: T, row2: T): number {
  for (let prop of properties) {
    if (row1[prop] === row2[prop]) continue;

    if (typeof row1[prop] === 'number' && typeof row2[prop] === 'number') {
      return (row1[prop] as unknown as number) - (row2[prop] as unknown as number)
    }

    const prop1 = '' + row1[prop];
    const prop2 = '' + row2[prop];

    if (prop1 === prop2) {
      continue;
    }

    if (prop1 < prop2) {
      return -1;
    }

    return +1;
  }

  return 0;
}


interface TableRows<T extends IHasOBJECT_ID> {
  [id: /*UUID*/string]: T;
}

/**
 * A relational-style collection of records. A table has an ordered list of
 * columns, and an unordered set of rows. Each row is an object that maps
 * column names to values. The set of rows is represented by a map from
 * object ID to row object.
 */
export class Table<T extends IHasOBJECT_ID, KeyOrder extends Array<keyof T>> implements IHasOBJECT_ID {

  [OBJECT_ID]: string;
  protected entries: Readonly<TableRows<T>>;
  protected columns: KeyArray<T, KeyOrder>;
  /**
   * This constructor is used by application code when creating a new Table
   * object within a change callback.
   */
  constructor(columns: KeyArray<T, KeyOrder>) {
    if (!Array.isArray(columns)) {
      throw new TypeError('When creating a table you must supply a list of columns')
    }
    this.columns = columns;
    this.entries = Object.freeze({});
    Object.freeze(this)
  }

  /**
   * Looks up a row in the table by its unique ID.
   */
  byId(id: UUID): T {
    return this.entries[id];
  }

  /**
   * Returns an array containing the unique IDs of all rows in the table, in no
   * particular order.
   */
  get ids(): string[] {
    return Object.keys(this.entries).filter(key => {
      const entry = this.entries[key];
      return isObject(entry) && entry[OBJECT_ID] === key
    })
  }

  /**
   * Returns the number of rows in the table.
   */
  get count(): number {
    return this.ids.length
  }

  /**
   * Returns an array containing all of the rows in the table, in no particular
   * order.
   */
  get rows(): T[] {
    return this.ids.map(id => this.byId(id))
  }

  /**
   * The standard JavaScript `filter()` method, which passes each row to the
   * callback function and returns all rows for which the it returns true.
   */
  filter(...args: Parameters<Array<T>['filter']>): ReturnType<Array<T>['filter']> {
    return this.rows.filter(...args);
  }

  /**
   * The standard JavaScript `find()` method, which passes each row to the
   * callback function and returns the first row for which it returns true.
   */
  find(...args: Parameters<Array<T>['find']>): ReturnType<Array<T>['find']> {
    return this.rows.find(...args);
  }

  /**
   * The standard JavaScript `map()` method, which passes each row to the
   * callback function and returns a list of its return values.
   */
  map(...args: Parameters<Array<T>['map']>): ReturnType<Array<T>['map']> {
    return this.rows.map(...args);
  }

  /**
  * Returns the list of rows, sorted by one of the following:
  * - If a function argument is given, it compares rows as per
  *   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Description
  * - If a string argument is given, it is interpreted as a column name and
  *   rows are sorted according to that column.
  * - If an array of strings is given, it is interpreted as a list of column
  *   names, and rows are sorted lexicographically by those columns.
  * - If no argument is given, it sorts by row ID by default.
  */
  sort(arg: ((a: T, b: T) => number) | keyof T | keyof T[]): T[] {
    if (typeof arg === 'function') {
      return this.rows.sort(arg)
    } else if (typeof arg === 'string') {
      return this.rows.sort((row1, row2) => compareRows([arg as keyof T], row1, row2))
    } else if (Array.isArray(arg)) {
      return this.rows.sort((row1, row2) => compareRows(arg, row1, row2))
    } else if (arg === undefined) {
      return this.rows.sort((row1, row2) => compareRows([OBJECT_ID as keyof T], row1, row2))
    } else {
      throw new TypeError(`Unsupported sorting argument: ${arg}`)
    }
  }

  /**
   * When iterating over a table, you get all rows in the table, in no
   * particular order.
   */
  [Symbol.iterator] (): Iterator<T | undefined> {
    let rows = this.rows, index = -1;
    return {
      next () {
        index += 1;
        if (index < rows.length) {
          return {done: false, value: rows[index]};
        } else {
          return {done: true, value: undefined};
        }
      },
    }
  }

  /**
   * Returns a shallow clone of this object. This clone is used while applying
   * a patch to the table, and `freeze()` is called on it when we have finished
   * applying the patch.
   */
  _clone() {
    if (!this[OBJECT_ID]) {
      throw new RangeError('clone() requires the objectId to be set')
    }
    return instantiateTable(this[OBJECT_ID], copyObject(this.entries))
  }

  /**
   * Sets the entry with key `id` to `value`.
   */
  set(id: UUID, value: T): void
  set(id: 'columns', value: string[]): void
  set(id: 'columns' | UUID, value: string[] | T): void {
    if (isFrozen(this.entries)) {
      throw new Error('A table can only be modified in a change function')
    }
    // TODO-Tom: change any
    (this as any).entries[id] = value;
    // TODO-Tom: change any
    if (id === 'columns') (this as any).columns = value
  }

  /**
   * Removes the row with unique ID `id` from the table.
   */
  remove(id: UUID) {
    if (Object.isFrozen(this.entries)) {
      throw new Error('A table can only be modified in a change function')
    }
    // TODO-Tom: change any
    delete (this as any).entries[id]
  }

  /**
   * Makes this object immutable. This is called after a change has been made.
   */
  _freeze() {
    Object.freeze(this.entries);
    Object.freeze(this)
  }

  /**
   * Returns a writeable instance of this table. This instance is returned when
   * the table is accessed within a change callback. `context` is the proxy
   * context that keeps track of the mutations.
   */
  // TODO-Tom: change any
  getWriteable(context: any) {
    if (!this[OBJECT_ID]) {
      throw new RangeError('getWriteable() requires the objectId to be set')
    }

    const instance = Object.create(WriteableTable.prototype);
    instance[OBJECT_ID] = this[OBJECT_ID];
    instance.context = context;
    instance.entries = this.entries;
    return instance
  }

  /**
   * Returns an object containing both the table entries (indexed by objectID)
   * and the columns (under the key `columns`). This provides a nice format
   * when serializing an Automerge document to JSON.
   */
  toJSON() {
    const rows: TableRows<T> = {};
    for (let id of this.ids) rows[id] = this.byId(id);
    return {columns: this.columns, rows}
  }
}

/**
 * An instance of this class is used when a table is accessed within a change
 * callback.
 */
class WriteableTable<T extends IHasOBJECT_ID, KeyOrder extends Array<keyof T>> extends Table<T, KeyOrder> {

  // ignore not instantiated
  // @ts-ignore
  entries: {[id: /*UUID*/string]: T};


  /**
   * Returns a proxied version of the columns list. This list can be modified
   * within a change callback.
   */
  get columns() {
    // TODO-Tom: remove ignore
    // @ts-ignore
    const columnsId = this.entries.columns[OBJECT_ID];
    // TODO-Tom: remove ignore
    // @ts-ignore
    return this.context.instantiateObject(columnsId)
  }

  /**
   * Returns a proxied version of the row with ID `id`. This row object can be
   * modified within a change callback.
   */
  byId(id: UUID) {
    // TODO-Tom: remove ignore
    // @ts-ignore
    if (isObject(this.entries[id]) && this.entries[id][OBJECT_ID] === id) {
      // TODO-Tom: remove ignore
      // @ts-ignore
      return this.context.instantiateObject(id)
    }
  }

  /**
   * Adds a new row to the table. The row can be given either as a map from
   * column name to value, or as a list of values. If given as a list of
   * values, it is translated into a map using the table's column list.
   * Returns the objectId of the new row.
   */
  add(row: {[prop: string]: any}): string {
    if (Array.isArray(row)) {
      const columns = this.columns;
      const rowObj: TableRows<T> = {};
      for (let i = 0; i < columns.length; i++) {
        rowObj[columns[i]] = row[i]
      }
      row = rowObj
    }
    // TODO-Tom: remove ignore
    // @ts-ignore
    return this.context.addTableRow(this[OBJECT_ID], row)
  }

  /**
   * Removes the row with ID `id` from the table. Throws an exception if the row
   * does not exist in the table.
   */
  remove(id: UUID): void {
    if (isObject(this.entries[id]) && this.entries[id][OBJECT_ID] === id) {
      // TODO-Tom: remove ignore
      // @ts-ignore
      this.context.deleteTableRow(this[OBJECT_ID], id)
    } else {
      throw new RangeError(`There is no row with ID ${id} in this table`)
    }
  }
}

/**
 * This function is used to instantiate a Table object in the context of
 * applying a patch (see apply_patch.js).
 */
export function instantiateTable<T extends IHasOBJECT_ID, KeyOrder extends Array<keyof T>>(objectId: string, entries?: object): Table<T, KeyOrder> {
  const instance = Object.create(Table.prototype);
  instance[OBJECT_ID] = objectId;
  instance[CONFLICTS] = Object.freeze({});
  instance.entries = entries || {};
  return instance
}
