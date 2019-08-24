import {Change} from './change.interface';

export interface State<T> {
  change: Change;
  snapshot: T;
}
