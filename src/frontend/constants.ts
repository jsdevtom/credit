import {UUID} from '../src/uuid';

export const ROOT_ID = '00000000-0000-0000-0000-000000000000';

// Properties of the document root object
export const OPTIONS = Symbol('_options');   // object containing options passed to init()
export interface IHasOPTIONS {
  // TODO-Tom: find correct type
  [OPTIONS]: any;
}

export const CACHE = Symbol('_cache');     // map from objectId to immutable object
export interface IHasCACHE {
  [CACHE]: {
    ['unique symbol']: any;
  }
}

export const INBOUND = Symbol('_inbound');   // map from child objectId to parent objectId
export interface IHasINBOUND {
  [INBOUND]: any;
}

export const STATE = Symbol('_state');     // object containing metadata about current state (e.g. sequence numbers)
export interface IHasSTATE {
  // TODO-Tom: find correct type
  [STATE]: {};
}

// Properties of all Automerge objects
export const OBJECT_ID = Symbol('_objectId');  // the object ID of the current object (string)
export interface IHasOBJECT_ID {
  [OBJECT_ID]: UUID;
}

export const CONFLICTS = Symbol('_conflicts'); // map or list (depending on object type) of conflicts
export interface IHasCONFLICTS {
  // TODO-Tom: find correct type
  [CONFLICTS]: any;
}

export const CHANGE = Symbol('_change');    // the context object on proxy objects used in change callback
export interface IHasCHANGE {
  // TODO-Tom: find correct type
  [CHANGE]: any;
}

// Properties of Automerge list objects
export const ELEM_IDS = Symbol('_elemIds');   // list containing the element ID of each list element
export interface IHasELEM_IDS {
  // TODO-Tom: find correct type
  [ELEM_IDS]: any;
}

export const MAX_ELEM = Symbol('_maxElem');   // maximum element counter value in this list (number)
export interface IHasMAX_ELEM {
  // TODO-Tom: find correct type
  [MAX_ELEM]: any;
}
