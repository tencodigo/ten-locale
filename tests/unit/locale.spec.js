import { createApp } from 'vue'

import App from '../../dev/App';
const app = createApp(App);

import  __locale  from '../../src/main';
app.use(__locale,{
  "~locales":{
    "default":"en",
    "en":{
      "hello":"world",
      "hello1": "value1",
      "deep":{"test":"one"}
    },
    "es":{
      "hello":"mundo",
      "hello1": "valor1",
      "deep":{"test":"uno"}
    }
  },
  "locales": {
    "en": {
      "hello1": "value2"
    }
  }
});

describe('locale.js', () => {
  it('$l is registered', () => {
    expect(app.$l).toBeDefined();
  })
  it('default settings set', () => {
    expect(app.$l.get('hello')).toMatch('world');
  })
  it('defaults can be overwritten', () => {
    expect(app.$l.get('hello1')).toMatch('value2');
  })
  it('replace can macro replace in string', () => {
    expect(app.$l.replace('this is a hello {hello}')).toMatch('this is a hello world');
  })
  it('retrieve with dot notation', () => {
    expect(app.$l.get('deep.test')).toMatch('one');
  })
  it('retrieve from other language dot notation', () => {
    expect(app.$l.get('es.deep.test')).toMatch('uno');
  })
  it('replace with dot notation', () => {
    expect(app.$l.replace('this is a deep {deep.test}')).toMatch('this is a deep one');
  })
  it('array replace', () => {
    let res = app.$l.replace(['this is a deep {deep.test}','this is a hello {hello}'])
    expect(res[0]).toMatch('this is a deep one');
    expect(res[1]).toMatch('this is a hello world');
  })

  it('format phone', () => {
    expect(app.$l.format('1111111111','t')).toMatch('(111) 111-1111');
  })
  it('format postal code', () => {
    expect(app.$l.format('111111111','p')).toMatch('11111-1111');
  })
  it('format currency', () => {
    expect(app.$l.format('111111111','c')).toMatch('$111,111,111.00');
  })

  it('format date', () => {
    expect(app.$l.format('2022-04-28T12:34:00Z','d')).toMatch('04-28-2022');
  })
  it('format date and time', () => {
    expect(app.$l.format('2011-12-03T10:15:30Z','dl')).toMatch('12-03-2011 04:15AM');
  })
  it('format time', () => {
    expect(app.$l.format('2011-12-03T10:15:30Z','dt')).toMatch('04:15:30AM');
  })
})
