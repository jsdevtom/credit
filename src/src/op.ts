import {UUID} from './uuid';
import {OpAction} from './op-action.type'
import {DataType} from './data-type.type';
import {Map} from 'immutable'

export interface Op {
  action: OpAction
  obj: UUID
  key?: string
  value?: any
  datatype?: DataType
  elem?: number
}

export interface OpWithActor extends Op {
  actor: UUID
}

export interface ImmutableOpWithActor extends Map<string, OpWithActor[keyof OpWithActor]> {
}
