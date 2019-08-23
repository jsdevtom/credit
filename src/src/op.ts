import {UUID} from './uuid';
import {OpAction} from './op-action.type'
import {DataType} from './data-type.type';

export interface Op {
  action: OpAction
  obj: UUID
  key?: string
  value?: any
  datatype?: DataType
  elem?: number
}
