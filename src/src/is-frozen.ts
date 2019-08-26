export function isFrozen<T extends object>(v: T): v is Readonly<T> {
  return Object.isFrozen(v);
}
