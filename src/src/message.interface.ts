import {Change} from './change.interface';
import {Clock} from './clock.interface';

export interface Message {
  docId: string
  clock: Clock
  changes?: Change[]
}
