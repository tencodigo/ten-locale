import { createApp } from 'vue'

import App from '../../dev/App';
const app = createApp(App);

import  __app  from '../../src/main';
app.use(__app,{
  "~settings":{
    "hello":"world",
    "hello1": "value1",
    "deep":{"test":"one"}
  },
  "settings": {
    "hello1": "value2"
  }
});

describe('locale.js', () => {
  it('$l is registered', () => {
    expect(app.$l).toBeDefined();
  })
/*  it('default settings set', () => {
    expect(app.$a.get('hello')).toMatch('world');
  })
  it('defaults can be overwritten', () => {
    expect(app.$a.get('hello1')).toMatch('value2');
  })
  it('replace can macro replace in string', () => {
    expect(app.$a.replace('this is a hello {hello}')).toMatch('this is a hello world');
  })
  it('retrieve with dot notation', () => {
    expect(app.$a.get('deep.test')).toMatch('one');
  })
  it('replace with dot notation', () => {
    expect(app.$a.replace('this is a deep {deep.test}')).toMatch('this is a deep one');
  })
  it('array replace', () => {
    let res = app.$a.replace(['this is a deep {deep.test}','this is a hello {hello}'])
    expect(res[0]).toMatch('this is a deep one');
    expect(res[1]).toMatch('this is a hello world');
  })*/
})
