import {ELEM_IDS, MAX_ELEM, OBJECT_ID} from './constants';


export class Text {
  // TODO-Tom: ignored due to not initialized
  // @ts-ignore
  private elems: Array<{ value: string, elemId?: string }>;
  private [OBJECT_ID]: string;
  // TODO-Tom:
  private context: any;
  private [MAX_ELEM]: number;

  constructor (text: string)
  constructor (text: Array<string>)
  constructor (text: string | Array<string>) {
    if (typeof text === 'string') {
      const elements = text.split('').map(value => ({value}));
      return instantiateText(undefined, elements, undefined)
    } else if (Array.isArray(text)) {
      const elements = text.map(value => ({value}));
      return instantiateText(undefined, elements, undefined)
    } else if (text === undefined) {
      return instantiateText(undefined, [], 0)
    } else {
      throw new TypeError(`Unsupported initial value for Text: ${text}`)
    }
  }

  get length (): number {
    return this.elems.length
  }

  get (index: number): string {
    return this.elems[index].value
  }

  getElemId (index: number): string | undefined {
    return this.elems[index].elemId
  }

  [Symbol.iterator] (): Iterator<string | undefined> {
    let elems = this.elems;
    let index = -1;
    return {
      next () {
        index += 1;
        if (index < elems.length) {
          return {done: false, value: elems[index].value}
        } else {
          return {done: true, value: undefined}
        }
      },
    }
  }

  /**
   * Returns the content of the Text object as a simple string, so that the
   * JSON serialization of an Automerge document represents text nicely.
   */
  toJSON() {
    return this.join('')
  }

  /**
   * Returns a writeable instance of this object. This instance is returned when
   * the text object is accessed within a change callback. `context` is the
   * proxy context that keeps track of the mutations.
   */
  // TODO-Tom: getWriteable(context: Context) {
  getWriteable(context: any) {
    if (!this[OBJECT_ID]) {
      throw new RangeError('getWriteable() requires the objectId to be set')
    }

    const instance = instantiateText(this[OBJECT_ID], this.elems, this[MAX_ELEM]);
    instance.context = context;
    return instance
  }

  /**
   * Updates the list item at position `index` to a new value `value`.
   */
  set (index: number, value: string) {
    if (this.context) {
      this.context.setListIndex(this[OBJECT_ID], index, value)
    } else if (!this[OBJECT_ID]) {
      this.elems[index].value = value
    } else {
      throw new TypeError('Automerge.Text object cannot be modified outside of a change block')
    }
    return this
  }

  /**
   * Inserts new list items `values` starting at position `index`.
   */
  insertAt(index: number, ...values: Array<string>) {
    if (this.context) {
      this.context.splice(this[OBJECT_ID], index, 0, values)
    } else if (!this[OBJECT_ID]) {
      this.elems.splice(index, 0, ...values.map(value => ({value})))
    } else {
      throw new TypeError('Automerge.Text object cannot be modified outside of a change block')
    }
    return this
  }

  /**
   * Deletes `numDelete` list items starting at position `index`.
   * if `numDelete` is not given, one item is deleted.
   */
  deleteAt(index: number, numDelete: number) {
    if (this.context) {
      this.context.splice(this[OBJECT_ID], index, numDelete || 1, [])
    } else if (!this[OBJECT_ID]) {
      this.elems.splice(index, numDelete || 1)
    } else {
      throw new TypeError('Automerge.Text object cannot be modified outside of a change block')
    }
    return this
  }

  // Read-only methods that can delegate to the JavaScript built-in array
  concat(...args: Parameters<Array<string>['concat']>): ReturnType<Array<string>['concat']> {
    return Array.prototype.concat.call([...this], ...args);
  }

  every(...args: Parameters<Array<string>['every']>): ReturnType<Array<string>['every']> {
    return Array.prototype.every.call([...this], ...args);
  }

  filter(...args: Parameters<Array<string>['filter']>): ReturnType<Array<string>['filter']> {
    return Array.prototype.filter.call([...this], ...args);
  }

  find(...args: Parameters<Array<string>['find']>): ReturnType<Array<string>['find']> {
    return Array.prototype.find.call([...this], ...args);
  }

  findIndex(...args: Parameters<Array<string>['findIndex']>): ReturnType<Array<string>['findIndex']> {
    return Array.prototype.findIndex.call([...this], ...args);
  }

  forEach(...args: Parameters<Array<string>['forEach']>): ReturnType<Array<string>['forEach']> {
    return Array.prototype.forEach.call([...this], ...args);
  }

  includes(...args: Parameters<Array<string>['includes']>): ReturnType<Array<string>['includes']> {
    return Array.prototype.includes.call([...this], ...args);
  }

  indexOf(...args: Parameters<Array<string>['indexOf']>): ReturnType<Array<string>['indexOf']> {
    return Array.prototype.indexOf.call([...this], ...args);
  }

  join(...args: Parameters<Array<string>['join']>): ReturnType<Array<string>['join']> {
    return Array.prototype.join.call([...this], ...args);
  }

  lastIndexOf(...args: Parameters<Array<string>['lastIndexOf']>): ReturnType<Array<string>['lastIndexOf']> {
    return Array.prototype.lastIndexOf.call([...this], ...args);
  }

  map(...args: Parameters<Array<string>['map']>): ReturnType<Array<string>['map']> {
    return Array.prototype.map.call([...this], ...args);
  }

  reduce<T extends string>(callbackFn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
  reduce<T extends string>
    (callbackFn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue: T): T;
  reduce<T extends string, U>
    (callbackFn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  reduce<T extends string, U = any>
    (
      callbackFn: (previousValue: T | U, currentValue: T, currentIndex: number, array: T[]) => T | U,
      initialValue?: T | U,
    ): T | U {
    if (initialValue === undefined) {
      // Ignored because expected wrong number of arguments
      // @ts-ignore
      return Array.prototype.reduce.call([...this], callbackFn as any);
    }

    return Array.prototype.reduce.call([...this], callbackFn as any, initialValue) as T | U;
  }

  reduceRight<T extends string>
    (callbackFn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
  reduceRight<T extends string>
    (callbackFn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue: T): T;
  reduceRight<T extends string, U>
    (callbackFn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  reduceRight<T extends string, U = any>
    (
      callbackFn: (previousValue: T | U, currentValue: T, currentIndex: number, array: T[]) => T | U,
      initialValue?: T | U,
    ): T | U {
    if (initialValue === undefined) {
      // Ignored because expected wrong number of arguments
      // @ts-ignore
      return Array.prototype.reduceRight.call([...this], callbackFn as any);
    }

    return Array.prototype.reduceRight.call([...this], callbackFn as any, initialValue) as T | U;
  }

  slice(...args: Parameters<Array<string>['slice']>): ReturnType<Array<string>['slice']> {
    return Array.prototype.slice.call([...this], ...args);
  }

  some(...args: Parameters<Array<string>['some']>): ReturnType<Array<string>['some']> {
    return Array.prototype.some.call([...this], ...args);
  }

  toLocaleString(...args: Parameters<Array<string>['toLocaleString']>): ReturnType<Array<string>['toLocaleString']> {
    return Array.prototype.toLocaleString.call([...this], ...args);
  }

  toString(...args: Parameters<Array<string>['toString']>): ReturnType<Array<string>['toString']> {
    return Array.prototype.toString.call([...this], ...args);
  }

}

function instantiateText(
  objectId: string | undefined,
  elems: Array<{value: string}>,
  maxElem: number | undefined,
): Text {
  const instance = Object.create(Text.prototype);
  instance[OBJECT_ID] = objectId;
  instance.elems = elems;
  instance[MAX_ELEM] = maxElem;
  return instance
}

/**
 * Returns the elemId of the `index`-th element. `object` may be either
 * a list object or a Text object.
 */
// TODO-Tom: properly type below
function getElemId(object: Text | {[ELEM_IDS]: Array<string>}, index: number): string | undefined {
  return (object instanceof Text) ? object.getElemId(index) : object[ELEM_IDS][index]
}

module.exports = { Text, getElemId, instantiateText };
