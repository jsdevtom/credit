export const REFLECT_BY_ID = Symbol.for('REFLECT_BY_ID');

const globalContext: NodeJS.Global | Window = global || window;

const globalSymbols = Object.getOwnPropertySymbols(globalContext);

if (!globalSymbols.includes(REFLECT_BY_ID)){
  (globalContext as any)[REFLECT_BY_ID] = {
    foo: "bar"
  };
}

// define the singleton API
// ------------------------

const singleton = {};

Object.defineProperty(singleton, "instance", {
  get: function(){
    return (globalContext as any)[REFLECT_BY_ID];
  }
});

Object.freeze(singleton);

export {
  singleton,
};


function isObject(x: any): x is object {
  return typeof x === "object" ? x !== null : typeof x === "function";
}

class ReflectById {

}
