export function isMutable<T extends object>(v: T): v is Mutable<T> {
  return !Object.isFrozen(v);
}
