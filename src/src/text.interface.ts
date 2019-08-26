import {List} from './list';
import {UUID} from './uuid';

export interface Text extends List<string> {
  constructor(objectId?: UUID, elems?: string[], maxElem?: number): Text

  get(index: number): string

  getElemId(index: number): string
}
