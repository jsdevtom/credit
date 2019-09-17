import {UUID} from './uuid';
import {DataType} from './data-type.type';
import {DiffAction} from './diff-action.type';
import {CollectionType} from './collection-type.type';
import {Conflict} from './conflict.interface';
import {IHasDatatype} from './i-has-datatype.interface';
import {IHasLink} from './i-has-link.interface';
import {IHasValue} from './i-has-value.interface';

export interface Diff extends Partial<IHasDatatype>, Partial<IHasLink>, Partial<IHasValue> {
  action: DiffAction
  type: CollectionType
  obj: UUID
  path?: string[]
  key?: string
  index?: number
  elemId?: string
  conflicts?: Conflict[]
}
