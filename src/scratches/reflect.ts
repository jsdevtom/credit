import 'reflect-metadata';
import {Store} from './store';

export interface DemoState {
  a: number;
  b: Array<string>;
}

const store = new Store<DemoState>({
  a: 1,
  b: ['z']
});

const two = store.change(s => {
  s.a++;
  s.b.push('hi');
  s.b.sort();

  delete s.a
});

const three = two.change(s => {
  s.a = 3;
});

Reflect.defineMetadata('fuck', 'you', three, 'a');

const meta = Reflect.getMetadata('fuck', three, 'a');
console.log('meta: ', meta);
console.log(three);
