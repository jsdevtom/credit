import {CACHE, CONFLICTS, INBOUND, OBJECT_ID, OPTIONS, ROOT_ID, STATE} from './constants';
import {uuidv4} from '../uuid4';
import {CreditState, Doc, InitOptions} from './types';


export function init<T>(options?: InitOptions): Doc<T> {
  if (typeof options === 'string') {
    options = {actorId: options};
  } else if (typeof options === 'undefined') {
    options = {};
  } else if (!isObject(options)) {
    throw new TypeError(`Unsupported value for init() options: ${options}`);
  }
  if (options.actorId === undefined && !options.deferActorId) {
    options.actorId = uuidv4();
  }

  const root = {};
  const cache = {[ROOT_ID]: root};
  const state: CreditState = {seq: 0, requests: [], deps: {}, canUndo: false, canRedo: false};

  // if (options.backend) {
  //   state.backendState = options.backend.init()
  // }

  Object.defineProperty(root, OBJECT_ID, {value: ROOT_ID});
  Object.defineProperty(root, OPTIONS,   {value: Object.freeze(options)});
  Object.defineProperty(root, CONFLICTS, {value: Object.freeze({})});
  Object.defineProperty(root, CACHE,     {value: Object.freeze(cache)});
  Object.defineProperty(root, INBOUND,   {value: Object.freeze({})});
  Object.defineProperty(root, STATE,     {value: Object.freeze(state)});

  return Object.freeze(root) as Doc<T>
}
