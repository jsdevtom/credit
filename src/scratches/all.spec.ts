import {init} from './init';
import {change} from './change';

describe('all', () => {
  describe('init', () => {
    it('should init', () => {
      const state1 = init<{next: string}>();
      const state2 = change(state1, s => s.next = 'next');

      const state1Changes = getChanges(state1);
      const state2Changes = getChanges(state2);
      assertSame(receiveChanges(state1, state2Changes), state2);
    });
  })
})
