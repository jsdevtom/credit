export type Freeze<T> =
  T extends Function ? T
    : T extends Array<infer T> ? FreezeArray<T>
      : T extends Map<infer K, infer V> ? FreezeMap<K, V>
        : FreezeObject<T>

export interface FreezeArray<T> extends ReadonlyArray<Freeze<T>> {}

export interface FreezeMap<K, V> extends ReadonlyMap<Freeze<K>, Freeze<V>> {}

export type FreezeObject<T> = { readonly [P in keyof T]: Freeze<T[P]> }

/**
 * The return type of `init<T>()`, `change<T>()`, etc. where `T` is the
 * original type. It is a recursively frozen version of the original type.
 */
export type Doc<T> = FreezeObject<T>;

/**
 * The argument passed to the callback of a `change` function is a mutable proxy of the original
 * type. `Proxy<D>` is the inverse of `Doc<T>`: `Proxy<Doc<T>>` is `T`, and `Doc<Proxy<D>>` is `D`.
 */
export type Proxy<D> = D extends Doc<infer T> ? T : never

export type ChangeFn<D, T= Proxy<D>> = (doc: T) => void

export type UUID = string

export type DataType =
  | 'counter' //..
  | 'timestamp'

export type OpAction =
  | 'ins'
  | 'del'
  | 'inc'
  | 'link'
  | 'set'
  | 'makeText'
  | 'makeTable'
  | 'makeList'
  | 'makeMap'

export type DiffAction =
  | 'create' //..
  | 'insert'
  | 'set'
  | 'remove'

export type CollectionType =
  | 'list' //..
  | 'map'
  | 'table'
  | 'text'

export type RequestType =
  | 'change' //..
  | 'redo'
  | 'undo'

export interface Clock {
  [actorId: string]: number
}

export interface Change {
  message?: string
  requestType?: RequestType
  actor: string
  seq: number
  deps: Clock
  ops: Op[]
  diffs?: Diff[]
}

export interface Op {
  action: OpAction
  obj: UUID
  key?: string
  value?: any
  datatype?: DataType
  elem?: number
}

export interface Patch {
  actor?: string
  seq?: number
  clock?: Clock
  deps?: Clock
  canUndo?: boolean
  canRedo?: boolean
  diffs: Diff[]
}

export interface Diff {
  action: DiffAction
  type: CollectionType
  obj: UUID
  path?: string[]
  key?: string
  index?: number
  value?: any
  elemId?: string
  conflicts?: Conflict[]
  datatype?: DataType
  link?: boolean
}

export interface Conflict {
  actor: string
  value: any
  link?: boolean
}

export interface CreditOptions extends Partial<IHasActorId> {}

export type InitOptions =
  | string // = actorId
  | Partial<IHasActorId> & {
    deferActorId?: boolean,
    freeze?: boolean,
  }

interface IHasActorId {
  actorId: string;
}

export interface CreditState extends Partial<IHasActorId> {
  seq: number;
  requests: any[];
  deps: {};
  canUndo: boolean;
  canRedo: boolean;
}
