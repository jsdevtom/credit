export interface List<T> extends Pick<Array<T>, 'concat' | 'every' | 'filter' | 'find' | 'findIndex' | 'forEach' | 'includes' | 'indexOf' | 'join' | 'lastIndexOf' | 'map' | 'reduce' | 'reduceRight' | 'slice' | 'some' | 'toLocaleString' | 'toString'> {
  insertAt?(index: number, ...args: T[]): List<T>

  deleteAt?(index: number, numDelete?: number): List<T>
}
