import {copyObject, isObject, parseElemId, ROOT_ID} from '../src/common';
import {
  CONFLICTS,
  ELEM_IDS,
  IHasCONFLICTS, IHasELEM_IDS, IHasMAX_ELEM,
  IHasOBJECT_ID,
  IHasOPTIONS,
  MAX_ELEM,
  OBJECT_ID,
  OPTIONS,
} from './constants';
import {instantiateText, Text, TextElems} from './text';
import {instantiateTable, Table} from './table';
import {Counter} from './counter';
import {Diff} from '../src/diff.interface';
import {ChildReference} from './child-references.interface';
import {Inbound} from './inbound.interface';
import {IHasDatatype} from '../src/i-has-datatype.interface';
import {IHasLink} from '../src/i-has-link.interface';
import {IHasValue} from '../src/i-has-value.interface';
import {UUID} from '../src/uuid';
import {List} from '../src/list.interface';



/**
 * Reconstructs the value from the diff object `diff`.
 */
function getValue(
  diff: Partial<IHasDatatype> & Partial<IHasLink> & Partial<IHasValue>,
  cache: { [id: string]: object },
  updated: { [id: string]: object },
): Date | Counter | any | undefined {
  if (diff.link) {
    // Reference to another object; fetch it from the cache
    return updated[diff.value] || cache[diff.value]
  } else if (diff.datatype === 'timestamp') {
    // Timestamp: value is milliseconds since 1970 epoch
    return new Date(diff.value)
  } else if (diff.datatype === 'counter') {
    return new Counter(diff.value)
  } else if (diff.datatype !== undefined) {
    throw new TypeError(`Unknown datatype: ${diff.datatype}`)
  } else {
    // Primitive value (number, string, boolean, or null)
    return diff.value
  }
}

/**
 * Finds the object IDs of all child objects referenced under the key `key` of
 * `object` (both `object[key]` and any conflicts under that key). Returns a map
 * from those objectIds to the value `true`.
 */
function childReferences(
  object: IHasCONFLICTS & IHasOBJECT_ID & { [key: string]: any },
  key: string | number,
): ChildReference {
  let refs: ChildReference = {};
  let conflicts = object[CONFLICTS][key] || {};
  let children: Array<IHasOBJECT_ID> = [object[key]].concat(Object.values(conflicts));
  for (let child of children) {
    if (isObject(child) && child[OBJECT_ID]) {
      refs[child[OBJECT_ID]] = true
    }
  }
  return refs
}

/**
 * Updates `inbound` (a mapping from each child object ID to its parent) based
 * on a change to the object with ID `objectId`. `refsBefore` and `refsAfter`
 * are objects produced by the `childReferences()` function, containing the IDs
 * of child objects before and after the change, respectively.
 */
function updateInbound(
  objectId: string,
  refsBefore: ChildReference,
  refsAfter: ChildReference,
  inbound: Inbound,
): void {
  for (let ref of Object.keys(refsBefore)) {
    if (!refsAfter[ref]) delete inbound[ref]
  }
  for (let ref of Object.keys(refsAfter)) {
    if (inbound[ref] && inbound[ref] !== objectId) {
      throw new RangeError(`Object ${ref} has multiple parents`)
    } else if (!inbound[ref]) {
      inbound[ref] = objectId
    }
  }
}

/**
 * Creates a writable copy of an immutable map object. If `originalObject`
 * is undefined, creates an empty object with ID `objectId`.
 */
function cloneMapObject<T>(
  originalObject: T & IHasOBJECT_ID & IHasCONFLICTS,
  objectId: string,
): T & IHasOBJECT_ID & IHasCONFLICTS {
  if (originalObject && originalObject[OBJECT_ID] !== objectId) {
    throw new RangeError(`cloneMapObject ID mismatch: ${originalObject[OBJECT_ID]} !== ${objectId}`)
  }
  let object = copyObject(originalObject);
  let conflicts = copyObject(originalObject ? originalObject[CONFLICTS] : undefined);
  Object.defineProperty(object, CONFLICTS, {value: conflicts});
  Object.defineProperty(object, OBJECT_ID, {value: objectId});
  return object
}

/**
 * Applies the change `diff` to a map object. `cache` and `updated` are indexed
 * by objectId; the existing read-only object is taken from `cache`, and the
 * updated writable object is written to `updated`. `inbound` is a mapping from
 * child objectId to parent objectId; it is updated according to the change.
 */
function updateMapObject(
  diff: Diff,
  cache: { [id: string]: IHasOBJECT_ID & IHasCONFLICTS },
  updated: { [id: string]: any & IHasOBJECT_ID & IHasCONFLICTS },
  inbound: Inbound,
) {
  if (!updated[diff.obj]) {
    updated[diff.obj] = cloneMapObject(cache[diff.obj], diff.obj)
  }
  let object = updated[diff.obj];
  let conflicts = object[CONFLICTS];
  let refsBefore = {};
  let refsAfter = {};

  if (diff.action === 'create') {
    // do nothing
  } else {
    const key = diff.key as string;

    if (diff.action === 'set') {
      refsBefore = childReferences(object, key);
      object[key] = getValue(diff, cache, updated);
      if (diff.conflicts) {
        conflicts[key] = {};
        for (let conflict of diff.conflicts) {
          conflicts[key][conflict.actor] = getValue(conflict, cache, updated)
        }
        Object.freeze(conflicts[key])
      } else {
        delete conflicts[key]
      }
      refsAfter = childReferences(object, key)
    } else if (diff.action === 'remove') {
      refsBefore = childReferences(object, key);
      delete object[key];
      delete conflicts[key]
    } else {
      throw new RangeError('Unknown action type: ' + diff.action)
    }
  }

  updateInbound(diff.obj, refsBefore, refsAfter, inbound)
}

/**
 * Updates the map object with ID `objectId` such that all child objects that
 * have been updated in `updated` are replaced with references to the updated
 * version.
 */
function parentMapObject(
  objectId: string,
  cache: { [id: string]: IHasOBJECT_ID & IHasCONFLICTS & IHasOPTIONS },
  updated: { [id: string]: IHasOBJECT_ID & IHasCONFLICTS },
): void {
  if (!updated[objectId]) {
    updated[objectId] = cloneMapObject(cache[objectId], objectId)
  }
  let object: any = updated[objectId];

  for (let key of Object.keys(object)) {
    let value: IHasOBJECT_ID = object[key];
    if (isObject(value) && updated[value[OBJECT_ID]]) {
      object[key] = updated[value[OBJECT_ID]]
    }

    const conflicts = object[CONFLICTS][key] || {};
    let conflictsUpdate = null;
    for (let actorId of Object.keys(conflicts)) {
      value = conflicts[actorId];
      if (isObject(value) && updated[value[OBJECT_ID]]) {
        if (!conflictsUpdate) {
          conflictsUpdate = copyObject(conflicts);
          object[CONFLICTS][key] = conflictsUpdate
        }
        conflictsUpdate[actorId] = updated[value[OBJECT_ID]]
      }
    }

    if (conflictsUpdate && cache[ROOT_ID][OPTIONS].freeze) {
      Object.freeze(conflictsUpdate)
    }
  }
}

/**
 * Applies the change `diff` to a table object. `cache` and `updated` are indexed
 * by objectId; the existing read-only object is taken from `cache`, and the
 * updated writable object is written to `updated`. `inbound` is a mapping from
 * child objectId to parent objectId; it is updated according to the change.
 */
function updateTableObject<T extends IHasOBJECT_ID>(
  diff: Diff,
  cache: { [id: string]: Table<T, Array<keyof T>> & IHasOBJECT_ID & IHasCONFLICTS & IHasOPTIONS },
  updated: { [id: string]: Table<T, Array<keyof T>> & IHasOBJECT_ID & IHasCONFLICTS },
  inbound: Inbound,
): void {
  if (!updated[diff.obj]) {
    updated[diff.obj] = cache[diff.obj] ?
      cache[diff.obj]._clone<T, Array<keyof T>>() :
      instantiateTable<T, Array<keyof T>>(diff.obj);
  }
  let object: { [p: string]: Table<T, Array<keyof T>> & IHasOBJECT_ID & IHasCONFLICTS }[UUID] = updated[diff.obj];
  let refsBefore: ChildReference = {};
  let refsAfter: ChildReference = {};

  if (diff.action === 'create') {
    // do nothing
  } else {
    const key = diff.key as string;

    if (diff.action === 'set') {
      const previous = object.byId(key);

      if (isObject(previous)) refsBefore[previous[OBJECT_ID]] = true;

      if (diff.link) {
        // Ignored to prevent error: but 't' could be instantiated with a different subtype of constraint 'IHasOBJECT_ID'
        // @ts-ignore
        object.set(key, updated[diff.value] || cache[diff.value]);
        refsAfter[diff.value] = true
      } else {
        object.set(key, diff.value)
      }

    } else if (diff.action === 'remove') {
      const previous = object.byId(key);

      if (isObject(previous)) refsBefore[previous[OBJECT_ID]] = true;

      object.remove(key)
    } else {
      throw new RangeError('Unknown action type: ' + diff.action)
    }
  }

  updateInbound(diff.obj, refsBefore, refsAfter, inbound)
}

/**
 * Updates the table object with ID `objectId` such that all child objects that
 * have been updated in `updated` are replaced with references to the updated
 * version.
 */
function parentTableObject<T extends IHasOBJECT_ID>(
  objectId: UUID,
  cache: { [id: string]: Table<T, Array<keyof T>> & IHasOBJECT_ID & IHasCONFLICTS & IHasOPTIONS },
  updated: { [id: string]: Table<T, Array<keyof T>> & IHasOBJECT_ID & IHasCONFLICTS },
): void {
  if (!updated[objectId]) {
    updated[objectId] = cache[objectId]._clone()
  }
  let table = updated[objectId];

  for (let key of Object.keys(table.entries)) {
    let value = table.byId(key);
    if (isObject(value) && updated[value[OBJECT_ID]]) {
      // Ignored to prevent error: but 't' could be instantiated with a different subtype of constraint 'IHasOBJECT_ID'
      // @ts-ignore
      table.set(key, updated[value[OBJECT_ID]])
    }
  }
}

/**
 * Creates a writable copy of an immutable list object. If `originalList` is
 * undefined, creates an empty list with ID `objectId`.
 */
function cloneListObject<T>(
  originalList: List<T> &
    IHasOBJECT_ID &
    Partial<IHasCONFLICTS> &
    Partial<IHasELEM_IDS> &
    Partial<IHasMAX_ELEM> |
    undefined,
  objectId: UUID,
): List<T> {
  if (originalList && originalList[OBJECT_ID] !== objectId) {
    throw new RangeError(`cloneListObject ID mismatch: ${originalList[OBJECT_ID]} !== ${objectId}`)
  }
  let list = originalList ? originalList.slice() : []; // slice() makes a shallow clone
  let conflicts = (originalList && originalList[CONFLICTS]) ? originalList[CONFLICTS].slice() : [];
  let elemIds = (originalList && originalList[ELEM_IDS]) ? originalList[ELEM_IDS].slice() : [];
  let maxElem = (originalList && originalList[MAX_ELEM]) ? originalList[MAX_ELEM] : 0;
  Object.defineProperty(list, OBJECT_ID, {value: objectId});
  Object.defineProperty(list, CONFLICTS, {value: conflicts});
  Object.defineProperty(list, ELEM_IDS, {value: elemIds});
  Object.defineProperty(list, MAX_ELEM, {value: maxElem, writable: true});
  return list
}

/**
 * Applies the change `diff` to a list object. `cache` and `updated` are indexed
 * by objectId; the existing read-only object is taken from `cache`, and the
 * updated writable object is written to `updated`. `inbound` is a mapping from
 * child objectId to parent objectId; it is updated according to the change.
 */
function updateListObject<T extends IHasOBJECT_ID>(
  diff: Diff,
  cache: { [id: string]: List<T> & IHasOBJECT_ID & IHasCONFLICTS & IHasOPTIONS },
  updated: { [id: string]: List<T> & IHasOBJECT_ID & IHasCONFLICTS & Partial<IHasELEM_IDS> },
  inbound: Inbound,
): void {
  if (!updated[diff.obj]) {
    updated[diff.obj] = cloneListObject(cache[diff.obj], diff.obj) as List<T> & IHasOBJECT_ID & IHasCONFLICTS
  }
  let list: List<T> & IHasOBJECT_ID & IHasCONFLICTS & Partial<IHasELEM_IDS> & Partial<IHasMAX_ELEM> = updated[diff.obj];
  let conflicts = list[CONFLICTS];
  let elemIds = list[ELEM_IDS];
  let value = null;
  let conflict: {[actor: string]: any} | null = null;

  if (['insert', 'set'].includes(diff.action)) {
    value = getValue(diff, cache, updated);
    if (diff.conflicts) {
      conflict = {};
      for (let c of diff.conflicts) {
        conflict[c.actor] = getValue(c, cache, updated)
      }
      Object.freeze(conflict)
    }
  }

  let refsBefore = {};
  let refsAfter = {};
  if (diff.action === 'create') {
    // do nothing
  } else {
    const index = diff.index as number;
    if (diff.action === 'insert') {
        list[MAX_ELEM] = Math.max(list[MAX_ELEM], parseElemId(diff.elemId as string).counter);
        list.splice(index, 0, value);
        conflicts.splice(index, 0, conflict);
        elemIds.splice(index, 0, diff.elemId);
        refsAfter = childReferences(list, index)
      } else if (diff.action === 'set') {
        refsBefore = childReferences(list, index);
        list[index] = value;
        conflicts[index] = conflict;
        refsAfter = childReferences(list, index)
      } else if (diff.action === 'remove') {
        refsBefore = childReferences(list, index);
        list.splice(index, 1);
        conflicts.splice(index, 1) || {};
        elemIds.splice(index, 1)
      } else if (diff.action === 'maxElem') {
        list[MAX_ELEM] = Math.max(list[MAX_ELEM], diff.value)
      } else {
        throw new RangeError('Unknown action type: ' + diff.action)
      }
  }

  updateInbound(diff.obj, refsBefore, refsAfter, inbound)
}

/**
 * Updates the list object with ID `objectId` such that all child objects that
 * have been updated in `updated` are replaced with references to the updated
 * version.
 */
function parentListObject<T extends IHasOBJECT_ID>(
  objectId: UUID,
  cache: { [id: string]: List<T> & IHasOBJECT_ID & IHasCONFLICTS & IHasOPTIONS },
  updated: { [id: string]: List<T> & IHasOBJECT_ID & IHasCONFLICTS & Partial<IHasELEM_IDS> },
): void {
  if (!updated[objectId]) {
    updated[objectId] = cloneListObject(cache[objectId], objectId) as List<T> & IHasOBJECT_ID & IHasCONFLICTS;
  }
  let list = updated[objectId];

  for (let index = 0; index < list.length; index++) {
    let value = list[index];
    if (isObject(value) && updated[value[OBJECT_ID]]) {
      // Ignored to prevent error: but 't' could be instantiated with a different subtype of constraint 'IHasOBJECT_ID'
      // @ts-ignore
      list[index] = updated[value[OBJECT_ID]]
    }

    let conflicts = list[CONFLICTS][index] || {}, conflictsUpdate = null;
    for (let actorId of Object.keys(conflicts)) {
      value = conflicts[actorId];
      if (isObject(value) && updated[value[OBJECT_ID]]) {
        if (!conflictsUpdate) {
          conflictsUpdate = copyObject(conflicts);
          list[CONFLICTS][index] = conflictsUpdate
        }
        conflictsUpdate[actorId] = updated[value[OBJECT_ID]]
      }
    }

    if (conflictsUpdate && cache[ROOT_ID][OPTIONS].freeze) {
      Object.freeze(conflictsUpdate)
    }
  }
}

/**
 * Applies the list of changes from `diffs[startIndex]` to `diffs[endIndex]`
 * (inclusive the last element) to a Text object. `cache` and `updated` are
 * indexed by objectId; the existing read-only object is taken from `cache`,
 * and the updated object is written to `updated`.
 */
function updateTextObject(
  diffs: Array<Diff>,
  startIndex: number,
  endIndex: number,
  cache: { [id: string]: Text & IHasOBJECT_ID & IHasCONFLICTS & IHasOPTIONS },
  updated: { [id: string]: Text & IHasOBJECT_ID & IHasCONFLICTS & Partial<IHasELEM_IDS> },
) {
  const objectId = diffs[startIndex].obj;
  if (!updated[objectId]) {
    if (cache[objectId]) {
      const elems = cache[objectId].elems.slice();
      const maxElem = cache[objectId][MAX_ELEM];
      updated[objectId] = instantiateText(objectId, elems, maxElem) as Text & IHasOBJECT_ID & IHasCONFLICTS;
    } else {
      updated[objectId] = instantiateText(objectId, [], 0) as Text & IHasOBJECT_ID & IHasCONFLICTS;
    }
  }

  let elems = updated[objectId].elems;
  let maxElem = updated[objectId][MAX_ELEM];
  let splicePos = -1;
  let deletions;
  let insertions;

  while (startIndex <= endIndex) {
    const diff = diffs[startIndex];
    if (diff.action === 'create') {
      // do nothing

    } else {
      const diffIndex = diff.index as number;

      if (diff.action === 'insert') {
            if (splicePos < 0) {
              splicePos = diffIndex;
              deletions = 0;
              insertions = []
            }
            maxElem = Math.max(maxElem, parseElemId(diff.elemId as string).counter);
            // Ignored due to not willing to change logic. Could result in bugs
            // @ts-ignore
            insertions.push({elemId: diff.elemId, value: diff.value, conflicts: diff.conflicts});

            if (startIndex === endIndex || diffs[startIndex + 1].action !== 'insert' ||
              diffs[startIndex + 1].index !== diffIndex + 1) {
              elems.splice(splicePos, deletions as number, ...insertions as Array<TextElems>);
              splicePos = -1
            }

          } else if (diff.action === 'set') {
            elems[diffIndex] = {
              elemId: elems[diffIndex].elemId,
              value: diff.value,
              conflicts: diff.conflicts,
            }

          } else if (diff.action === 'remove') {
            if (splicePos < 0) {
              splicePos = diffIndex;
              deletions = 0;
              insertions = []
            }
            // Ignored due to not willing to change logic. Could result in bugs
            // @ts-ignore
            deletions += 1;

            if (startIndex === endIndex ||
              !['insert', 'remove'].includes(diffs[startIndex + 1].action) ||
              diffs[startIndex + 1].index !== diffIndex) {
              elems.splice(splicePos, deletions);
              splicePos = -1
            }

          } else if (diff.action === 'maxElem') {
            maxElem = Math.max(maxElem, diff.value)
          } else {
            throw new RangeError('Unknown action type: ' + diff.action)
          }
    }

    startIndex += 1
  }
  updated[objectId] = instantiateText(objectId, elems, maxElem) as Text & IHasCONFLICTS;
}

/**
 * After some set of objects in `updated` (a map from object ID to mutable
 * object) have been updated, updates their parent objects to point to the new
 * object versions, all the way to the root object. `cache` contains the
 * previous (immutable) version of all objects, and `inbound` is the mapping
 * from child objectId to parent objectId. Any objects that were not modified
 * continue to refer to the existing version in `cache`.
 */
function updateParentObjects(
  cache: { [id: string]: Text & IHasOBJECT_ID & IHasCONFLICTS & IHasOPTIONS },
  updated: { [id: string]: Text & IHasOBJECT_ID & IHasCONFLICTS & Partial<IHasELEM_IDS> },
  inbound: Inbound
) {
  let affected: { [p: string]: Text & IHasOBJECT_ID & IHasCONFLICTS & Partial<IHasELEM_IDS> | boolean } = updated;
  while (Object.keys(affected).length > 0) {
    const parents: {[id: string]: boolean} = {};
    for (let childId of Object.keys(affected)) {
      const parentId = inbound[childId];
      if (parentId) parents[parentId] = true
    }
    affected = parents;

    for (let objectId of Object.keys(parents)) {
      if (Array.isArray(updated[objectId] || cache[objectId])) {
        parentListObject(objectId, cache, updated)
      } else if ((updated[objectId] || cache[objectId]) instanceof Table) {
        parentTableObject(objectId, cache, updated)
      } else {
        parentMapObject(objectId, cache, updated)
      }
    }
  }
}

/**
 * Applies the list of changes `diffs` to the appropriate object in `updated`.
 * `cache` and `updated` are indexed by objectId; the existing read-only object
 * is taken from `cache`, and the updated writable object is written to
 * `updated`. `inbound` is a mapping from child objectId to parent objectId;
 * it is updated according to the change.
 */
function applyDiffs(diffs, cache, updated, inbound) {
  let startIndex = 0;
  for (let endIndex = 0; endIndex < diffs.length; endIndex++) {
    const diff = diffs[endIndex];

    if (diff.type === 'map') {
      updateMapObject(diff, cache, updated, inbound);
      startIndex = endIndex + 1
    } else if (diff.type === 'table') {
      updateTableObject(diff, cache, updated, inbound);
      startIndex = endIndex + 1
    } else if (diff.type === 'list') {
      updateListObject(diff, cache, updated, inbound);
      startIndex = endIndex + 1
    } else if (diff.type === 'text') {
      if (endIndex === diffs.length - 1 || diffs[endIndex + 1].obj !== diff.obj) {
        updateTextObject(diffs, startIndex, endIndex, cache, updated);
        startIndex = endIndex + 1
      }
    } else {
      throw new TypeError(`Unknown object type: ${diff.type}`)
    }
  }
}

/**
 * Creates a writable copy of the immutable document root object `root`.
 */
function cloneRootObject(root) {
  if (root[OBJECT_ID] !== ROOT_ID) {
    throw new RangeError(`Not the root object: ${root[OBJECT_ID]}`)
  }
  return cloneMapObject(root, ROOT_ID)
}

module.exports = {
  applyDiffs, updateParentObjects, cloneRootObject
};
