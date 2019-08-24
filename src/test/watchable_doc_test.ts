import * as assert from 'assert';

import * as sinon from 'sinon';
import {SinonSpy} from 'sinon';
import {WatchableDoc} from '../src/watchable_doc';
import {Change} from '../src/change.interface';

const Automerge = process.env.TEST_DIST === '1' ? require('../dist/automerge') : require('../src/automerge');

describe('Automerge.WatchableDoc', () => {
  let watchDoc: WatchableDoc;
  let beforeDoc: WatchableDoc;
  let afterDoc: WatchableDoc;
  let changes: Change[];
  let callback: SinonSpy;

  beforeEach(() => {
    beforeDoc = Automerge.change(Automerge.init(), (doc: any) => doc.document = 'watch me now');
    afterDoc = Automerge.change(beforeDoc, (doc: any) => doc.document = 'i can mash potato');
    changes = Automerge.getChanges(beforeDoc, afterDoc);
    watchDoc = new Automerge.WatchableDoc(beforeDoc);
    callback = sinon.spy();
    watchDoc.registerHandler(callback)
  });

  it('should have a document', () => {
    assert.strictEqual(watchDoc.get(), beforeDoc)
  });

  it('should call the handler via set', () => {
    watchDoc.set(afterDoc);
    assert.strictEqual(callback.calledOnce, true);
    assert.deepEqual(watchDoc.get(), afterDoc)
  });

  it('should call the handler via applyChanges', () => {
    watchDoc.applyChanges(changes);
    assert.strictEqual(callback.calledOnce, true);
    assert.deepEqual(watchDoc.get(), afterDoc)
  });

  it('should allow removing the handler', () => {
    watchDoc.unregisterHandler(callback);
    watchDoc.applyChanges(changes);
    assert.strictEqual(callback.notCalled, true)
  })
});
