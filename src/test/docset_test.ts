import * as sinon from 'sinon';
import {Doc} from '../src/doc.type';
import DocSet from '../src/doc_set';
import {Change} from '../src/change.interface';
import {SinonSpy} from 'sinon';

const assert = require('assert');
const Automerge =
  process.env.TEST_DIST === '1' ? require('../dist/automerge') : require('../src/automerge');

console.log('process.env.TEST_DIST: ', process.env.TEST_DIST);

interface DocsetTestDoc {
  birds: Array<string>;
}

describe('Automerge.DocSet', () => {
  let beforeDoc: Doc<DocsetTestDoc>;
  let afterDoc: Doc<DocsetTestDoc>;
  let docSet: DocSet<DocsetTestDoc>;
  let changes: Array<Change>;
  let callback: SinonSpy;
  const ID = '1';

  beforeEach(() => {
    beforeDoc = Automerge.change(Automerge.init(), (doc: DocsetTestDoc) => (doc.birds = ['goldfinch']));
    afterDoc = Automerge.change(beforeDoc, (doc: DocsetTestDoc) => (doc.birds = ['swallows']));
    changes = Automerge.getChanges(beforeDoc, afterDoc);
    docSet = new Automerge.DocSet();
    docSet.setDoc(ID, beforeDoc);
    callback = sinon.spy();
    docSet.registerHandler(callback)
  });

  it('should have a document inside the docset', () => {
    assert.strictEqual(docSet.getDoc(ID), beforeDoc)
  });

  it('should call the handler via set', () => {
    docSet.setDoc(ID, afterDoc);
    assert.strictEqual(callback.calledOnce, true);
    assert.deepEqual(docSet.getDoc(ID), afterDoc)
  });

  it('should call the handler via applyChanges', () => {
    docSet.applyChanges(ID, changes);
    assert.strictEqual(callback.calledOnce, true);
    assert.deepEqual(docSet.getDoc(ID), afterDoc)
  });

  it('should allow removing the handler', () => {
    docSet.unregisterHandler(callback);
    docSet.applyChanges(ID, changes);
    assert.strictEqual(callback.notCalled, true)
  })
});
