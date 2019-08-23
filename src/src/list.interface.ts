export interface List<T> extends Array<T> {
  insertAt?(index: number, ...args: T[]): List<T>

  deleteAt?(index: number, numDelete?: number): List<T>
}
