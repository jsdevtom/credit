import {Map} from 'immutable';
import {Clock, ClockImmutable} from './clock.interface';
import {Op} from './op';
import {Diff} from './diff.interface';
import {RequestType} from './request-type.type';
import Table = WebAssembly.Table;

export interface Change {
  message?: string
  requestType?: RequestType
  actor: string
  seq: number
  deps: ClockImmutable
  ops: Op[]
  diffs?: Diff[]
}

export interface ChangeImmutable extends Map<keyof Change, Change[keyof Change]> {
}
