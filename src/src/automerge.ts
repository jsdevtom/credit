import {InitOptions} from './init-options.type';
import {Change, ChangeImmutable} from './change.interface';
import {Doc} from './doc.type';
import {Proxy} from './proxy.type';
import {ChangeFn} from './change-fn.type';
import {Diff} from './diff.interface';
import {Clock} from './clock.interface';
import {State} from './state.interface';
import {List} from 'immutable';

const transit = require('transit-immutable-js');
const uuid = require('./uuid');
const Frontend = require('../frontend');
const Backend = require('../backend');
const { isObject } = require('./common');

/**
 * Constructs a new frontend document that reflects the given list of changes.
 */
function docFromChanges<T>(options?: InitOptions, changes?: Change[]): Doc<T> {
  const doc = init(options);
  const [state, _] = Backend.applyChanges(Backend.init(), changes);
  const patch = Backend.getPatch(state);
  patch.state = state;
  return Frontend.applyPatch(doc, patch)
}

///// Automerge.* API

function init<T>(options?: InitOptions): Doc<T> {
  if (typeof options === 'string') {
    options = {actorId: options};
  } else if (typeof options === 'undefined') {
    options = {};
  } else if (!isObject(options)) {
    throw new TypeError(`Unsupported options for init(): ${options}`);
  }
  return Frontend.init(Object.assign({backend: Backend}, options));
}

/**
 * Returns a new document object initialized with the given state.
 */
function from<T>(initialState: T | Doc<T>, options?: InitOptions): Doc<T> {
  return change(init(options), 'Initialization', doc => Object.assign(doc, initialState))
}

function change<D, T = Proxy<D>>(doc: D, callback: ChangeFn<T>): D
function change<D, T = Proxy<D>>(doc: D, message: string, callback: ChangeFn<T>): D
function change<D, T = Proxy<D>>(doc: D, message: string | ChangeFn<T>, callback?: ChangeFn<T>): D {
  const [newDoc, change] = Frontend.change(doc, message, callback);
  return newDoc
}

function emptyChange<D extends Doc<any>>(doc: D, message?: string): D {
  const [newDoc, change] = Frontend.emptyChange(doc, message);
  return newDoc
}

function undo<T>(doc: Doc<T>, message?: string): Doc<T> {
  const [newDoc, change] = Frontend.undo(doc, message);
  return newDoc
}

function redo<T>(doc: Doc<T>, message?: string): Doc<T> {
  const [newDoc, change] = Frontend.redo(doc, message);
  return newDoc
}

function load<T>(doc: string, options?: any): Doc<T> {
  return docFromChanges(options, transit.fromJSON(doc))
}

function save<T>(doc: Doc<T>): string {
  const state = Frontend.getBackendState(doc);
  return transit.toJSON(state.getIn(['opSet', 'history']))
}

function merge<T>(localDoc: Doc<T>, remoteDoc: Doc<T>): Doc<T> {
  if (Frontend.getActorId(localDoc) === Frontend.getActorId(remoteDoc)) {
    throw new RangeError('Cannot merge an actor with itself')
  }
  const localState  = Frontend.getBackendState(localDoc);
  const remoteState = Frontend.getBackendState(remoteDoc);
  const [state, patch] = Backend.merge(localState, remoteState);
  if (patch.diffs.length === 0) return localDoc;
  patch.state = state;
  return Frontend.applyPatch(localDoc, patch)
}

function diff<D extends Doc<any>>(oldDoc: D, newDoc: D): Diff[] {
  const oldState = Frontend.getBackendState(oldDoc);
  const newState = Frontend.getBackendState(newDoc);
  const changes = Backend.getChanges(oldState, newState);
  const [state, patch] = Backend.applyChanges(oldState, changes);
  return patch.diffs
}

function getChanges<T>(oldDoc: Doc<T>, newDoc: Doc<T>): Change[] {
  const oldState = Frontend.getBackendState(oldDoc);
  const newState = Frontend.getBackendState(newDoc);
  return Backend.getChanges(oldState, newState)
}

function applyChanges<T>(doc: Doc<T>, changes: Change[]): Doc<T> {
  const oldState = Frontend.getBackendState(doc);
  const [newState, patch] = Backend.applyChanges(oldState, changes);
  patch.state = newState;
  return Frontend.applyPatch(doc, patch)
}

function getMissingDeps<T>(doc: Doc<T>): Clock {
  return Backend.getMissingDeps(Frontend.getBackendState(doc))
}

function equals<T>(val1: T, val2: T): boolean {
  if (!isObject(val1) || !isObject(val2)) {
    return val1 === val2;
  }

  const keys1 = Object.keys(val1).sort() as Array<keyof T>;
  const keys2 = Object.keys(val2).sort() as Array<keyof T>;

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let i = 0; i < keys1.length; i++) {
    if (keys1[i] !== keys2[i]) {
      return false;
    }
    if (!equals(val1[keys1[i]], val2[keys2[i]])) {
      return false
    }
  }
  return true;
}

function getHistory<D, T = Proxy<D>>(doc: Doc<T>): State<T>[] {
  const state = Frontend.getBackendState(doc);
  const actor = Frontend.getActorId(doc);

  const history = state.getIn(['opSet', 'history']) as List<ChangeImmutable>;

  return history.map((change, index) => {
    return {
      get change () {
        return change && change.toJS()
      },
      get snapshot () {
        // TODO-Tom: change
        if (index === undefined) { // TODO-Tom: you added this if for typing
          return;
        }
        return (docFromChanges(actor, history.slice(0, index + 1) as any) as unknown as any)
      },
    }
  }).toArray()
}

module.exports = {
  init, from, change, emptyChange, undo, redo,
  load, save, merge, diff, getChanges, applyChanges, getMissingDeps,
  equals, getHistory, uuid,
  Frontend, Backend,
  DocSet: require('./doc_set').default,
  WatchableDoc: require('./watchable_doc'),
  Connection: require('./connection'),
};

for (let name of ['canUndo', 'canRedo', 'getObjectId', 'getObjectById', 'getActorId',
     'setActorId', 'getConflicts', 'Text', 'Table', 'Counter']) {
  module.exports[name] = Frontend[name]
}
