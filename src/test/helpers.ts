const assert = require('assert');
test.skip('skip', () => {});

// Assertion that succeeds if the first argument deepEquals at least one of the
// subsequent arguments (but we don't care which one)
export function assertEqualsOneOf<T>(actual: T, ...expected: T[]): void {
  assert(expected.length > 0);
  for (let i = 0; i < expected.length; i++) {
    try {
      assert.deepEqual(actual, expected[i]);
      return // if we get here without an exception, that means success
    } catch (e) {
      if (!e.name.match(/^AssertionError/) || i === expected.length - 1) throw e
    }
  }
}
