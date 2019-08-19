import 'reflect-metadata';

const IS_PROXY = '__isProxy';

export function getRecursiveHandler<T extends object>(): ProxyHandler<T> {
  return {
    deleteProperty(target: any, key: string) {
      console.log('Deleting', target, `.${key}`);

      delete target[key];

      return true;
    },
    get(target: any, key: string) {
      if (key === IS_PROXY) {
        return true;
      }

      const prop = target[key];

      if (typeof prop == 'undefined') {
        return;
      }

      if (!prop[IS_PROXY] && typeof prop === 'object') {
        target[key] = new Proxy(prop, getRecursiveHandler());
      }

      return target[key];
    },

    set(target: any, key: string, value: any) {
      console.log('Setting', target, `.${key} to equal`, value);

      // todo : call callback

      target[key] = value;
      return true;
    }
  }
}
