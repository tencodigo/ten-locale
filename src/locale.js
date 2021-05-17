const _get = require('lodash/get');
const _mergeDash = require('lodash/mergeWith');
const _assign = require('lodash/assign');
const _clone = require('lodash/cloneDeep');
const _merge = function (dest,src,srcIndex,all) {
  _mergeDash(dest,src,srcIndex,function (objValue, srcValue, key, object, source){
    const lead = key.substr(0,1);
    if(lead==='_' && !all) return undefined;
    if(lead==='~') {
      const key2=key.substr(1);
      object[key2]=source[key];
      return dest;
    }
    return undefined;
  });
};


class tenLocale {
  //setup
  constructor(){
    if(!tenLocale.instance) {
      tenLocale.instance = this;
      this._defaults = {
        locales:{},
        date:{
          format:'MM-DD-YYYY',
          formatDateTime:'MM-DD-YYYY hh:mmA z',
          formatTime:'hh:mmA',
          timeZone:'America/Chicago'
        }
      };
      this._countries = {
        US: {
          phone:'(###) ###-####',
          postal:'#####-####',
          currency:{
            symbol:'$',
            code:'USD'
          },
        },
        CA: {
          phone:'(###) ###-####',
          postal:'A#A #A#',
          currency:{
            symbol:'$',
            code:'CAD'
          }
        },
        MX: {
          phone:'###-###-####',
          postal:'#####',
          currency:{
            symbol:'$',
            code:'MXN'
          }
        }
      };
      this._locale = {};
      this._locales = {};
      this._country = {};
      delete this._locale.locales;
    }
  }

  locale()  {
    return tenLocale.instance._locale;
  }

  country() {
    return tenLocale.instance._country;
  }

  defaults() {
    return tenLocale.instance._defaults;
  }

  get(name,def) {
    return this._get(name, def);
  }

  _get(name,def, noReplace) {
    let value = _get(tenLocale.instance._locale,name,def);
    if(noReplace) return value;
    return this._replace(value);
  }

  setup(options, isDefault) {
    if(options) {
      if(options["~locale"]) {
        this.setup({"locale":options["~locale"]});
      }
      if(options.locale) {
        Object.keys(options.locale).forEach((key)=> {
          if(key==='default') {
            this.changeLocale(options.locale[key]);
            return;
          }
          if(key==='country') {
            this.changeCountry(options.locale[key]);
            return;
          }
          this.set(options.locale[key],key,isDefault);
        })
      }
    }
  }

  set(localeStrings, localeCode, isDefault) {
    this._locales[localeCode] = this._locales[localeCode] || {};
    this._defaults.locales[localeCode] = this._defaults.locales[localeCode] || {};
    if(isDefault) {
      _assign(this._defaults.locales[localeCode],_clone(localeStrings));
      _merge(this._locale,localeStrings);
    } else {
      _assign(this._locale,localeStrings);
    }
    _merge(this._locales[localeCode],_clone(localeStrings));
  }

  changeLocale(localeCode) {
    _assign(this._locale,_clone(this._locales[localeCode]));
  }

  changeCountry(countryCode) {
    let country = _clone(this._countries[countryCode]);
    _merge(country,this._defaults.date);
    this._country = country;
  }

  _replace(str){
    let typ = typeof str;
    if (typ === 'string'){
      let keys = str.match(/\{+(\w*)}+/g);
      if (keys === undefined || keys===null) return str;

      for (let i = 0; i < keys.length; i++){
        let key = keys[i];
        let name = key.replace(/[{}]/g, '');
        if (name === undefined || name === '') continue;

        let value = this._get(name,null,true);
        if (value === undefined) continue;
        let re = new RegExp('\\{' + name + '\\}', 'g');
        str = str.replace(re, value);
      }
      return str;
    }
    if (typ === 'object'){
      if(Array.isArray(str)) {
        for (let i = 0; i < str.length; i++){
          str[i] = this._replace(str[i]);
        }
        return str;
      }
      Object.keys(str).forEach((key)=>{
        this._replace(str[key]);
      })
    }
    return str;
  }
}

const instance = new tenLocale();

export default instance;
