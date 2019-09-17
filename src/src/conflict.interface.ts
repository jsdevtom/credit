import {IHasValue} from './i-has-value.interface';
import {IHasLink} from './i-has-link.interface';

export interface Conflict extends IHasValue, Partial<IHasLink> {
  actor: string
}
