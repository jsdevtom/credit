import {copy} from './deep-copy';
import {getRecursiveHandler} from './recursive-proxy-handler';

export function init(state = {}) {
  if (Reflect.getMetadata())
}

export class Store<T extends {}> {
  private readonly internalState: T;

  constructor(
    init = {} as T
  ) {
    this.internalState = copy(init);
  }

  change(mutator: (store: T) => any): Readonly<Store<T>> {
    const copiedStore = copy(this.internalState);

    mutator(new Proxy(copiedStore, getRecursiveHandler<T>()));

    return new Store(copiedStore);
  }
}
