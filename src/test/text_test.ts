import * as assert from 'assert';
import {Text} from '../src/text.interface';
import {assertEqualsOneOf} from './helpers';

const Automerge = process.env.TEST_DIST === '1' ? require('../dist/automerge') : require('../src/automerge');


interface TextTestDoc {
  text: Text;
}

describe('Automerge.Text', () => {
  // TODO-Tom: type vars
  let s1: any;
  let s2: any;

  beforeEach(() => {
    s1 = Automerge.change(Automerge.init(), (doc: any) => doc.text = new Automerge.Text());
    s2 = Automerge.merge(Automerge.init(), s1)
  });

  it('should support insertion', () => {
    s1 = Automerge.change(s1, (doc: any) => doc.text.insertAt(0, 'a'));
    assert.strictEqual(s1.text.length, 1);
    assert.strictEqual(s1.text.get(0), 'a')
  });

  it('should support deletion', () => {
    s1 = Automerge.change(s1, (doc: any) => doc.text.insertAt(0, 'a', 'b', 'c'));
    s1 = Automerge.change(s1, (doc: any) => doc.text.deleteAt(1, 1));
    assert.strictEqual(s1.text.length, 2);
    assert.strictEqual(s1.text.get(0), 'a');
    assert.strictEqual(s1.text.get(1), 'c')
  });

  it('should handle concurrent insertion', () => {
    s1 = Automerge.change(s1, (doc: any) => doc.text.insertAt(0, 'a', 'b', 'c'));
    s2 = Automerge.change(s2, (doc: any) => doc.text.insertAt(0, 'x', 'y', 'z'));
    s1 = Automerge.merge(s1, s2);
    assert.strictEqual(s1.text.length, 6);
    assertEqualsOneOf(s1.text.join(''), 'abcxyz', 'xyzabc')
  });

  it('should handle text and other ops in the same change', () => {
    s1 = Automerge.change(s1, (doc: any) => {
      doc.foo = 'bar';
      doc.text.insertAt(0, 'a')
    });
    assert.strictEqual(s1.foo, 'bar');
    assert.strictEqual(s1.text.join(''), 'a')
  });

  it('should serialize to JSON as a simple string', () => {
    s1 = Automerge.change(s1, (doc: any) => doc.text.insertAt(0, 'a', '"', 'b'));
    assert.strictEqual(JSON.stringify(s1), '{"text":"a\\"b"}')
  });

  it('should allow modification before an object is assigned to a document', () => {
    s1 = Automerge.change(Automerge.init(), (doc: any) => {
      const text = new Automerge.Text();
      text.insertAt(0, 'a', 'b', 'c', 'd');
      text.deleteAt(2);
      doc.text = text;
      assert.strictEqual(doc.text.join(''), 'abd')
    });
    assert.strictEqual(s1.text.join(''), 'abd')
  });

  it('should allow modification after an object is assigned to a document', () => {
    s1 = Automerge.change(Automerge.init(), (doc: any) => {
      const text = new Automerge.Text();
      doc.text = text;
      text.insertAt(0, 'a', 'b', 'c', 'd');
      text.deleteAt(2);
      assert.strictEqual(doc.text.join(''), 'abd')
    });
    assert.strictEqual(s1.text.join(''), 'abd')
  });

  it('should not allow modification outside of a change callback', () => {
    assert.throws(() => s1.text.insertAt(0, 'a'), /Text object cannot be modified outside of a change block/);
    assert.throws(() => s1.text.set(0, 'a'), /Text object cannot be modified outside of a change block/);
    assert.throws(() => s1.text.deleteAt(0, 1), /Text object cannot be modified outside of a change block/);
  });

  describe('with initial value', () => {
    it('should accept a string as initial value', () => {
      let s1 = Automerge.change(Automerge.init(), (doc: any) => doc.text = new Automerge.Text('init'));
      assert.strictEqual(s1.text.length, 4);
      assert.strictEqual(s1.text.get(0), 'i');
      assert.strictEqual(s1.text.get(1), 'n');
      assert.strictEqual(s1.text.get(2), 'i');
      assert.strictEqual(s1.text.get(3), 't')
    });

    it('should accept an array as initial value', () => {
      let s1 = Automerge.change(Automerge.init(), (doc: any) => doc.text = new Automerge.Text(['i', 'n', 'i', 't']));
      assert.strictEqual(s1.text.length, 4);
      assert.strictEqual(s1.text.get(0), 'i');
      assert.strictEqual(s1.text.get(1), 'n');
      assert.strictEqual(s1.text.get(2), 'i');
      assert.strictEqual(s1.text.get(3), 't')
    });

    it('should initialize text in Automerge.from()', () => {
      let s1 = Automerge.from({text: new Automerge.Text('init')});
      assert.strictEqual(s1.text.length, 4);
      assert.strictEqual(s1.text.get(0), 'i');
      assert.strictEqual(s1.text.get(1), 'n');
      assert.strictEqual(s1.text.get(2), 'i');
      assert.strictEqual(s1.text.get(3), 't')
    });

    it('should encode the initial value as a change', () => {
      const s1 = Automerge.from({text: new Automerge.Text('init')});
      const changes = Automerge.getChanges(Automerge.init(), s1);
      assert.strictEqual(changes.length, 1);
      const s2 = Automerge.applyChanges(Automerge.init(), changes);
      assert.strictEqual(s2.text instanceof Automerge.Text, true);
      assert.strictEqual(s2.text.join(''), 'init')
    });

    it('should allow immediate access to the value', () => {
      let s1 = Automerge.change(Automerge.init(), (doc: any) => {
        const text = new Automerge.Text('init');
        assert.strictEqual(text.length, 4);
        assert.strictEqual(text.get(0), 'i');
        doc.text = text;
        assert.strictEqual(doc.text.length, 4);
        assert.strictEqual(doc.text.get(0), 'i')
      })
    });

    it('should allow pre-assignment modification of the initial value', () => {
      let s1 = Automerge.change(Automerge.init(), (doc: any) => {
        const text = new Automerge.Text('init');
        text.deleteAt(3);
        assert.strictEqual(text.join(''), 'ini');
        doc.text = text;
        assert.strictEqual(doc.text.join(''), 'ini')
      });
      assert.strictEqual(s1.text.join(''), 'ini')
    });

    it('should allow post-assignment modification of the initial value', () => {
      let s1 = Automerge.change(Automerge.init(), (doc: any) => {
        const text = new Automerge.Text('init');
        doc.text = text;
        text.deleteAt(0);
        doc.text.insertAt(0, 'I');
        assert.strictEqual(text.join(''), 'Init');
        assert.strictEqual(doc.text.join(''), 'Init')
      });
      assert.strictEqual(s1.text.join(''), 'Init')
    });

    it('should allow Readonly Array methods', () => {
      let s1 = Automerge.change(Automerge.init(), (doc: TextTestDoc) => {
        const text = new Automerge.Text('init');
        doc.text = text;
        assert.strictEqual(doc.text.concat(['i', 'a', 'l']).join(''), 'initial');
        assert(doc.text.every(l => typeof l === 'string'));
        assert.deepEqual(doc.text.filter(l => l === 'i'), ['i', 'i']);
        assert.strictEqual(doc.text.find(l => l === 't'), 't');
        assert.strictEqual(doc.text.findIndex(l => l === 'n'), 1);
        doc.text.forEach((l, i) => assert.strictEqual(l, doc.text.get(i)));
        assert(doc.text.includes('t'));
        assert.strictEqual(doc.text.indexOf('z'), -1);
        assert.strictEqual(doc.text.join(';'), 'i;n;i;t');
        assert.strictEqual(doc.text.lastIndexOf('i'), 2);
        assert.deepEqual(doc.text.map(l => l + 'a'), ['ia', 'na', 'ia', 'ta']);
        assert.strictEqual(doc.text.reduce((a, curr) => a + curr), 'init');
        assert.strictEqual(doc.text.reduce((a, curr) => a + curr, '0'), '0init');
        assert.strictEqual(doc.text.reduceRight((a, curr) => a + curr), 'tini');
        assert.strictEqual(doc.text.reduceRight((a, curr) => a + curr, '0'), '0tini');
        assert(doc.text.some(l => l === 't'));
        assert.deepEqual(doc.text.slice(2), ['i', 't']);
        assert.strictEqual(doc.text.toLocaleString(), 'i,n,i,t');
        assert.strictEqual(doc.text.toString(), 'i,n,i,t');
      });
    });
  })
});
