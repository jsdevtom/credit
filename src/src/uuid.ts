const uuid = require('uuid/v4');

export type UUID = string;

let factory: () => string = uuid;

function makeUuid(): string {
  return factory()
}

makeUuid.setFactory = (newFactory: () => string) => factory = newFactory;
makeUuid.reset = () => factory = uuid;

module.exports = makeUuid;
