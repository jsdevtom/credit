import {Doc} from './doc.type';

export type Proxy<D> = D extends Doc<infer T> ? T : never
