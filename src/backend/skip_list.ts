import {Map} from 'immutable';

// Returns a random number from the geometric distribution with p = 0.75.
// That is, returns k with probability p * (1 - p)^(k - 1).
// For example, returns 1 with probability 3/4, returns 2 with probability 3/16,
// returns 3 with probability 3/64, and so on.
function randomLevel(): Iterator<number> {
  // NOTE: this function used to be a generator; it has been converted to a regular
  // function (that mimics the interface of a generator) to avoid having to include
  // generator polyfills in the distribution build.
  return {
    next() {
      // Create random number between 0 and 2^32 - 1
      const rand = Math.floor(Math.random() * 0x100000000);
      // Count leading zeros in that 32-bit number
      let level = 1;
      while (rand < 1 << (32 - 2 * level) && level < 16) level += 1;
      return { value: level, done: false };
    },
  }
}

class Node {
  constructor (
    public readonly key: string | null,
    public readonly value: number | null,
    public readonly level: number,
    public readonly prevKey: Array<string | null>,
    public readonly nextKey: Array<string | null>,
    public readonly prevCount: Array<number | null>,
    public readonly nextCount: Array<number | null>,
  ) {
  }

  setValue (key: string, value: number) {
    return new Node(this.key, value, this.level, this.prevKey, this.nextKey,
                    this.prevCount, this.nextCount)
  }

  insertAfter(newKey: string, newLevel: number, fromLevel: number, distance: number) {
    if (newLevel > this.level && this.key !== null) {
      throw new RangeError('Cannot increase the level of a non-head node')
    }
    const maxLevel = Math.max(this.level, newLevel);
    const nextKey = this.nextKey.slice();
    const nextCount = this.nextCount.slice();

    for (let level = fromLevel; level < maxLevel; level++) {
      if (level < newLevel) {
        nextKey[level] = newKey;
        nextCount[level] = distance
      } else {
        (nextCount as Array<number>)[level] += 1
      }
    }

    return new Node(this.key, this.value, maxLevel,
                    this.prevKey, nextKey, this.prevCount, nextCount)
  }

  insertBefore(newKey: string, newLevel: number, fromLevel: number, distance: number) {
    if (newLevel > this.level) throw new RangeError('Cannot increase node level');
    const prevKey = this.prevKey.slice();
    const prevCount = this.prevCount.slice();

    for (let level = fromLevel; level < this.level; level++) {
      if (level < newLevel) {
        prevKey[level] = newKey;
        prevCount[level] = distance
      } else {
        (prevCount as Array<number>)[level] += 1
      }
    }

    return new Node(this.key, this.value, this.level,
                    prevKey, this.nextKey, prevCount, this.nextCount)
  }

  removeAfter (fromLevel: number, removedLevel: number, newKeys: Array<string | null>, distances: Array<number>) {
    const nextKey = this.nextKey.slice();
    const nextCount = this.nextCount.slice();

    for (let level = fromLevel; level < this.level; level++) {
      if (level < removedLevel) {
        nextKey[level] = newKeys[level];
        nextCount[level] = distances[level]
      } else {
        (nextCount as Array<number>)[level] -= 1
      }
    }

    return new Node(this.key, this.value, this.level,
                    this.prevKey, nextKey, this.prevCount, nextCount)
  }

  removeBefore (fromLevel: number, removedLevel: number, newKeys: Array<string | null>, distances: Array<number>) {
    const prevKey = this.prevKey.slice();
    const prevCount = this.prevCount.slice();

    for (let level = fromLevel; level < this.level; level++) {
      if (level < removedLevel) {
        prevKey[level] = newKeys[level];
        prevCount[level] = distances[level]
      } else {
        (prevCount as Array<number>)[level] -= 1
      }
    }

    return new Node(this.key, this.value, this.level,
                    prevKey, this.nextKey, prevCount, this.nextCount)
  }
}

class SkipList {

  // assigned in `makeInstance`
  private readonly _nodes!: Map<string | null, Node>;
  // assigned in `makeInstance`
  private readonly _randomSource!: Iterator<number>;
  // assigned in `makeInstance`
  private readonly length!: number;

  constructor (randomSource?: () => Iterator<number>) {
    const head = new Node(null, null, 1, [], [null], [], [null]);
    const random = randomSource ? randomSource() : randomLevel();
    return makeInstance(0, Map<string | null, Node>().set(null, head), random)
  }

  get headNode(): Node {
    return this._nodes.get(null)
  }

  predecessors(predecessor: string | null, maxLevel: number) {
    const preKeys = [predecessor], preCounts = [1];

    for (let level = 1; level < maxLevel; level++) {
      let preKey = preKeys[level - 1];
      let count = preCounts[level - 1];
      while (preKey) {
        let node = this._nodes.get(preKey);
        if (node.level > level) break;
        if (node.level < level) {
          throw new RangeError('Node ' + preKey + ' below expected level ' + (level - 1))
        }
        count += (node.prevCount as Array<number>)[level - 1];
        preKey = node.prevKey[level - 1]
      }
      preKeys[level] = preKey;
      preCounts[level] = count
    }

    return {preKeys, preCounts}
  }

  successors (successor: string | null, maxLevel: number) {
    const sucKeys = [successor];
    const sucCounts = [1];

    for (let level = 1; level < maxLevel; level++) {
      let sucKey = sucKeys[level - 1];
      let count = sucCounts[level - 1];
      while (sucKey) {
        let node = this._nodes.get(sucKey);
        if (node.level > level) break;
        if (node.level < level) {
          throw new RangeError('Node ' + sucKey + ' below expected level ' + (level - 1))
        }
        count += (node.nextCount as Array<number>)[level - 1];
        sucKey = node.nextKey[level - 1]
      }
      sucKeys[level] = sucKey;
      sucCounts[level] = count
    }

    return {sucKeys, sucCounts}
  }

  // Inserts a new list element immediately after the element with key `predecessor`.
  // If predecessor === null, inserts at the head of the list.
  insertAfter (predecessor: string | null, key: string, value: number) {
    if (typeof key as unknown !== 'string' || key === '') {
      throw new RangeError('Key must be a nonempty string')
    }
    if (!this._nodes.has(predecessor)) {
      throw new RangeError('The referenced predecessor key does not exist')
    }
    if (this._nodes.has(key)) {
      throw new RangeError('Cannot insert a key that already exists')
    }

    const newLevel = this._randomSource.next().value;
    const maxLevel = Math.max(newLevel, this.headNode.level);
    const successor = this._nodes.get(predecessor).nextKey[0] || null;
    const { preKeys, preCounts } = this.predecessors(predecessor, maxLevel);
    const { sucKeys, sucCounts } = this.successors(successor, maxLevel);

    return makeInstance(this.length + 1, this._nodes.withMutations(nodes => {
      let preLevel = 0, sucLevel = 0;
      for (let level = 1; level <= maxLevel; level++) {
        const updateLevel = Math.min(level, newLevel);
        if (level === maxLevel || preKeys[level] !== preKeys[preLevel]) {
          nodes.update(preKeys[preLevel],
                       node => node.insertAfter(key, updateLevel, preLevel, preCounts[preLevel]));
          preLevel = level
        }
        if (sucKeys[sucLevel] && (level === maxLevel || sucKeys[level] !== sucKeys[sucLevel])) {
          nodes.update(sucKeys[sucLevel],
                       node => node.insertBefore(key, updateLevel, sucLevel, sucCounts[sucLevel]));
          sucLevel = level
        }
      }

      nodes.set(key, new Node(key, value, newLevel,
                              preKeys.slice(0, newLevel),
                              sucKeys.slice(0, newLevel),
                              preCounts.slice(0, newLevel),
                              sucCounts.slice(0, newLevel)))
    }), this._randomSource)
  }

  insertIndex (index: number, key: string, value: number) {
    if (typeof index !== 'number' || index < 0) {
      throw new RangeError('Index must be a non-negative integer')
    }
    if (index === 0) {
      return this.insertAfter(null, key, value)
    } else {
      return this.insertAfter(this.keyOf(index - 1), key, value)
    }
  }

  removeKey (key: string | null) {
    if (typeof key !== 'string' || !this._nodes.has(key)) {
      throw new RangeError('The given key cannot be removed because it does not exist')
    }
    const removedNode = this._nodes.get(key);
    const maxLevel = this.headNode.level;
    const { preKeys, preCounts } = this.predecessors(removedNode.prevKey[0], maxLevel);
    const { sucKeys, sucCounts } = this.successors  (removedNode.nextKey[0], maxLevel);
    const distances = new Array(maxLevel);

    for (let level = 0; level < maxLevel; level++) {
      distances[level] = preCounts[level] + sucCounts[level] - 1
    }

    return makeInstance(this.length - 1, this._nodes.withMutations(nodes => {
      nodes.remove(key);
      let preLevel = 0, sucLevel = 0;

      for (let level = 1; level <= maxLevel; level++) {
        const updateLevel = Math.min(level, removedNode.level);
        if (level === maxLevel || preKeys[level] !== preKeys[preLevel]) {
          nodes.update(preKeys[preLevel],
                       node => node.removeAfter(preLevel, updateLevel, sucKeys, distances));
          preLevel = level
        }
        if (sucKeys[sucLevel] && (level === maxLevel || sucKeys[level] !== sucKeys[sucLevel])) {
          nodes.update(sucKeys[sucLevel],
                       node => node.removeBefore(sucLevel, updateLevel, preKeys, distances));
          sucLevel = level
        }
      }
    }), this._randomSource)
  }

  removeIndex (index: number) {
    return this.removeKey(this.keyOf(index))
  }

  indexOf (key: string) {
    if (typeof key as unknown !== 'string' || key === '' || !this._nodes.has(key)) return -1;
    let node = this._nodes.get(key), count = 0;
    while (node && node.key) {
      count += (node.prevCount as Array<number>)[node.level - 1];
      node = this._nodes.get(node.prevKey[node.level - 1])
    }
    return count - 1
  }

  keyOf (index: number) {
    if (typeof index as unknown !== 'number') return null;
    if (index < 0) index = index + this.length;
    if (index < 0 || index >= this.length) return null;

    let node = this._nodes.get(null), level = node.level - 1, count = 0;
    while (true) {
      if (count === index + 1) {
        return node.key
      } else if (count + (node.nextCount as Array<number>)[level] > index + 1) {
        level -= 1
      } else {
        count += (node.nextCount as Array<number>)[level];
        node = this._nodes.get(node.nextKey[level])
      }
    }
  }

  getValue (key: string) {
    if (typeof key as unknown !== 'string' || key === '') {
      throw new RangeError('Key must be a nonempty string')
    }
    const node = this._nodes.get(key);
    return node && node.value
  }

  setValue (key: string, value: number) {
    if (typeof key as unknown !== 'string' || key === '') {
      throw new RangeError('Key must be a nonempty string')
    }
    let node = this._nodes.get(key);
    if (!node) throw new RangeError('The referenced key does not exist');

    node = node.setValue(key, value);
    return makeInstance(this.length, this._nodes.set(key, node), this._randomSource)
  }

  iterator<Mode extends 'keys' | 'values' | 'entries'>(mode: Mode)
    : Mode extends 'keys' ? Iterator<string> :
        Mode extends 'values' ? Iterator<number | null> :
          Mode extends 'entries' ? Iterator<Array<string | number | null>> :
            Iterator<undefined>
  {
    // NOTE: this method used to be a generator; it has been converted to a regular
    // method (that mimics the interface of a generator) to avoid having to include
    // generator polyfills in the distribution build.
    const nodes = this._nodes;
    let key = nodes.get(null).nextKey[0];
    return {
      next (): Iterator<string> | Iterator<number | null> | Iterator<Array<string | number | null>> | Iterator<undefined> {
        if (!key) return { value: undefined, done: true } as unknown as Iterator<undefined> ;
        const node = nodes.get(key);
        let rval = undefined;
        switch (mode) {
          case 'keys':    rval = {value: key,               done: false}; break;
          case 'values':  rval = {value: node.value,        done: false}; break;
          case 'entries': rval = {value: [key, node.value], done: false}; break;
        }
        key = node.nextKey[0];
        // TODO-Tom: unany
        return rval as any
      },
      [Symbol.iterator]: () => this.iterator(mode),
      // TODO-Tom: unany
    } as any;
  }

  [Symbol.iterator] () {
    return this.iterator('values')
  }
}

function makeInstance(length: number, nodes: Map<string | null, Node>, randomSource: Iterator<number>): SkipList {
  const instance = Object.create(SkipList.prototype);

  instance.length = length;
  instance._nodes = nodes;
  instance._randomSource = randomSource;

  return instance
}

module.exports = {SkipList};
