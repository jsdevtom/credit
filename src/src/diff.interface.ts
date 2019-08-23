import {UUID} from './uuid';
import {DataType} from './data-type.type';
import {DiffAction} from './diff-action.type';
import {CollectionType} from './collection-type.type';
import {Conflict} from './conflict.interface';

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
