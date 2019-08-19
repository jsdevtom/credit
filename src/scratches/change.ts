import {ChangeFn, Proxy} from './types';
import {
  CACHE,
  CHANGE,
  IHasCHANGE,
  IHasOBJECT_ID,
  IHasOPTIONS,
  IHasSTATE,
  OBJECT_ID,
  OPTIONS,
  ROOT_ID,
  STATE,
} from './constants';
import {Context} from './context';

export type DocToBeChanged<T> = IHasOBJECT_ID & IHasCHANGE & IHasSTATE & IHasOPTIONS & T;

export function change<D, T = Proxy<D>>(doc: DocToBeChanged<D>, callback: ChangeFn<T>): D
export function change<D, T = Proxy<D>>(doc: DocToBeChanged<D>, message: string, callback: ChangeFn<T>): D
export function change<D, T = Proxy<D>>(doc: DocToBeChanged<D>, message: string | ChangeFn<T> | undefined, callback?: ChangeFn<T>): D {
  if (doc[OBJECT_ID] !== ROOT_ID) {
    throw new TypeError('The first argument to `change` must be the document root');
  }
  if (doc[CHANGE]) {
    throw new TypeError('Calls to `change` cannot be nested');
  }
  if (typeof message === 'function' && callback === undefined) {
    [message, callback] = [callback, message];
  }
  if (message !== undefined && typeof message !== 'string') {
    throw new TypeError('Change message must be a string');
  }

  const actorId = getActorId(doc);

  if (!actorId) {
    throw new Error('Actor ID must be initialized with setActorId() before making a change');
  }
  const context = new Context(doc, actorId);
  callback!(rootObjectProxy(context));

  if (Object.keys(context.updated).length === 0) {
    // If the callback didn't change anything, return the original document object unchanged
    return [doc, null];
  } else {
    updateParentObjects(doc[CACHE], context.updated, context.inbound);
    return makeChange(doc, 'change', context, message)
  }
}

/**
 * Returns the Credit actor ID of the given document.
 */
function getActorId<T>(doc: DocToBeChanged<T>) {
  return doc[STATE].actorId || doc[OPTIONS].actorId;
}

function getMapHandler<T>() {
  return {
    get(target: {context: Context<T>, objectId: string}, key: symbol) {
      const {context, objectId} = target;
      if (key === OBJECT_ID) return objectId;
      if (key === CHANGE) return context;
      if (key === STATE) return {actorId: context.actorId};
      return context.getObjectField(objectId, key)
    },

    set(target: {context: Context<T>, objectId: string}, key: symbol, value: any) {
      const {context, objectId} = target;
      context.setMapKey(objectId, 'map', key, value);
      return true
    },

    deleteProperty(target: {context: Context<T>, objectId: string}, key: symbol) {
      const {context, objectId} = target;
      context.deleteMapKey(objectId, key);
      return true;
    },

    has(target: {context: Context<T>, objectId: string}, key: symbol) {
      const {context, objectId} = target;
      return [OBJECT_ID, CHANGE].includes(key) || (key in context.getObject(objectId));
    },

    getOwnPropertyDescriptor(target: {context: Context<T>, objectId: string}, key: symbol) {
      const {context, objectId} = target;
      const object = context.getObject(objectId);
      if (key in object) {
        return {configurable: true, enumerable: true};
      }
    },

    ownKeys(target: {context: Context<T>, objectId: string})  {
      const {context, objectId} = target;
      return Object.keys(context.getObject(objectId))
    },
  };
}


function mapProxy<T>(context: Context<T>, objectId: string): T {
  // TODO-Tom: This casting could be wrong
  return new Proxy({context, objectId}, getMapHandler()) as unknown as T;
}

/**
 * Instantiates a proxy object for the given `objectId`.
 * This function is added as a method to the context object by rootObjectProxy().
 * When it is called, `this` is the context object.
 */
function instantiateProxy<T>(this: Context<T>, objectId: string): T {
  const object = this.getObject(objectId);
  // if (Array.isArray(object)) {
  //   return listProxy(this, objectId)
  // } else if (object instanceof Text || object instanceof Table) {
  //   return object.getWriteable(this)
  // } else {

  // TODO-Tom: This casting could be wrong
  return mapProxy(this, objectId) as unknown as T;
  // }
}


function rootObjectProxy<T>(context: Context<T>): T {
  context.instantiateObject = instantiateProxy;
  return mapProxy(context, ROOT_ID);
}
