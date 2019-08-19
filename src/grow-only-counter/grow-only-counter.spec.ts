import {CrdtMutation} from '../mutation/mutation.interface';

interface CrdtDataStructure {
  value: number;
  _CREDIT_TYPE: string;
}

const mutators = new Map([
  ['INCREMENT', (growOnlySet: CrdtDataStructure, value: number) => growOnlySet.value + value],
]);

function applyMutators(dataStructure: CrdtDataStructure, ...mutations: CrdtMutation[]) {
  const mutators = getMutators(dataStructure._CREDIT_TYPE);

  mutations
    .map(mutation => ({
        mutation,
        mutator: getMutator(mutators, mutation._CREDIT_OP_TYPE),
    }))
    .reduce(({mutation, mutator}) => mutation(dataStructure, mutator))
}

describe('GrowOnlyCounter', () => {
  it('should merge sets with values 2 and 4 respectively to give 6', () => {
    const growOnlySet1 = {
      _CREDIT_TYPE: 'GOS',
      value: 0,
    };
    const operation1 = {
      _CREDIT_OP_TYPE: 'INCREMENT',
      value: 2,
    };
    const operation2 = {
      _CREDIT_OP_TYPE: 'INCREMENT',
      value: 4,
    };

    expect(applyMutators(growOnlySet1, operation1, operation2))
  });
});
