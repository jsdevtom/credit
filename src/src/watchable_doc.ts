import {Proxy} from './proxy.type';
import {Doc} from './doc.type';

import {Set} from 'immutable';
import {Change} from './change.interface';

const Frontend = require('../frontend');
const Backend = require('../backend');

export type WatchableDocHandler<T = any> = (doc: Doc<T>) => void

// TODO-Tom: Here you changed D, T = Proxy<D> to D extends Doc<T>, T = Proxy.
//  This may be wrong.
export class WatchableDoc<D extends Doc<T> = any, T = Proxy<D>> {
  private doc: D;
  private handlers: Set<WatchableDocHandler<T>>;

  constructor(doc: D) {
    if (!doc) throw new Error('doc argument is required');
    this.doc = doc;
    this.handlers = Set()
  }

  get(): D {
    return this.doc
  }

  set(doc: D): void {
    this.doc = doc;
    this.handlers.forEach((handler: WatchableDocHandler<T> | undefined) => handler && handler(doc))
  }

  applyChanges(changes: Change[]): D {
    const oldState = Frontend.getBackendState(this.doc);
    const [newState, patch] = Backend.applyChanges(oldState, changes);
    patch.state = newState;
    const newDoc = Frontend.applyPatch(this.doc, patch);
    this.set(newDoc);
    return newDoc
  }

  registerHandler(handler: WatchableDocHandler<T>): void {
    this.handlers = this.handlers.add(handler)
  }

  unregisterHandler(handler: WatchableDocHandler<T>): void {
    this.handlers = this.handlers.remove(handler)
  }
}

module.exports = WatchableDoc;
