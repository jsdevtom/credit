import {ClockImmutable} from './clock.interface';
import {Op} from './op';
import {Diff} from './diff.interface';
import {RequestType} from './request-type.type';

export interface Change {
  message?: string
  requestType?: RequestType
  actor: string
  seq: number
  deps: ClockImmutable
  ops: Op[]
  diffs?: Diff[]
}
