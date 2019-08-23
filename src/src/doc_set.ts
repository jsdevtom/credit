import {Map, Set, Iterator} from 'immutable';
import {Change} from './change.interface';
import {Doc} from './doc.type';
import {FreezeObject} from './freeze';

const Frontend = require('../frontend');
const Backend = require('../backend');

type DocSetHandler<T> = (docId: string, doc: Doc<T>) => void

export default class DocSet<T> {
  private docs: Map<string, FreezeObject<T>>;
  private handlers: Set<DocSetHandler<T>>;

  constructor() {
    this.docs = Map();
    this.handlers = Set()
  }

  // TODO-Tom: HIGHEST PRIO. This used to be itterator, howver typescript throws that it can't
  //  find [Symbol.iterator]()
  get docIds(): any {
    return this.docs.keys()
  }

  getDoc(docId: string): FreezeObject<T> {
    return this.docs.get(docId)
  }

  setDoc(docId: string, doc: Doc<T>): void {
    this.docs = this.docs.set(docId, doc);
    this.handlers.forEach(handler => handler && handler(docId, doc))
  }

  applyChanges(docId: string, changes: Change[]): FreezeObject<T> {
    let doc = this.docs.get(docId) || Frontend.init({backend: Backend});
    const oldState = Frontend.getBackendState(doc);
    const [newState, patch] = Backend.applyChanges(oldState, changes);
    patch.state = newState;
    doc = Frontend.applyPatch(doc, patch);
    this.setDoc(docId, doc);
    return doc
  }

  registerHandler(handler: DocSetHandler<T>): void {
    this.handlers = this.handlers.add(handler)
  }

  unregisterHandler(handler: DocSetHandler<T>): void {
    this.handlers = this.handlers.remove(handler)
  }
}
