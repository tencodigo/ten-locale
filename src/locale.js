const _get = require('lodash/get');
const _mergeDash = require('lodash/mergeWith');
const _assign = require('lodash/assign');
const _clone = require('lodash/cloneDeep');
const _masker = require('./mask/masker').default;
const _tokens = require('./mask/tokens');
import { format, parseJSON } from 'date-fns';

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
        country: {
          phone:'(###) ###-####',
          date:{
            format:'MM-dd-yyyy',
            formatDateTime:'MM-dd-yyyy hh:mmaa',
            formatTime:'hh:mm:ssaa',
            timeZone:'America/Chicago'
          },
          currency: {
            symbol: '$'
          }
        },
        countries: {
          US: {
            postal:'#####-####',
            currency:{
              locale:'en-US',
              code:'USD',
              minDecimals:2
            },
          },
          CA: {
            postal:'A#A #A#',
            currency:{
              code:'CAD'
            }
          },
          MX: {
            postal:'#####',
            currency:{
              code:'MXN'
            }
          }
        }
      };
      this._localeCode = 'es';
      this._countryCode = 'US';
      this._countries = {};
      this._locales = {};
    }
  }

  locale()  {
    return tenLocale.instance._locales[this._localeCode];
  }

  country() {
    return tenLocale.instance._countries[this._localeCode];
  }

  defaults() {
    return tenLocale.instance._defaults;
  }

  get(name,def) {
    return this._get(name, def);
  }

  _get(name,def, noReplace, lang) {
    lang = lang || this._locales[this._localeCode];
    let value = _get(lang, name, undefined);

    if(value===undefined) {
      value = _get(this._locales, name, def);
    }

    if(noReplace) return value;
    return this._replace(value, lang);
  }

  setup(options, isDefault) {
    if(options) {
      if(options["~locales"]) {
        this.setup({"locales":options["~locales"]},true);
      }
      let locales=options.locales;
      if(locales) {
        Object.keys(locales).forEach((key)=> {
          if(key==='default') {
            this.changeLocale(locales[key]);
            return;
          }
          if(key==='countries') {
            _merge(this._countries,locales[key],undefined,true);
            return;
          }
          this.set(locales[key],key,isDefault);
        })
      }
    }
  }

  set(localeStrings, localeCode, isDefault) {
    this._locales[localeCode] = this._locales[localeCode] || {};
    this._defaults.locales[localeCode] = this._defaults.locales[localeCode] || {};
    if(isDefault) {
      _assign(this._defaults.locales[localeCode],_clone(localeStrings));
    }
    _merge(this._locales[localeCode],_clone(localeStrings));
  }

  changeLocale(localeCode) {
    this._locales[localeCode]=this._locales[localeCode]||{};
    this._localeCode = localeCode;
  }

  getCountry(countryCode) {
    countryCode = countryCode || this._countryCode;
    let country = this._countries[countryCode]||{};
    if(!country.__merged) {
      _merge(country, this._defaults.country);
      _merge(country, this._defaults.countries[countryCode]);
      country.__merged = true;
    }
    this._countries[countryCode]=country;
    return country;
  }

  getDateLocale(countryCode) {
    countryCode = countryCode || this._countryCode;
    let country = this.getCountry(countryCode);
    if(country.date.locale) return country.date.locale;
    country.date.locale = new Locale(this._localeCode, countryCode, this._localeCode);
    return country.date.locale;
  }

  replace(str,hash) {
    return this._replace(str,hash);
  }

  _replace(str, lang) {
    lang = lang || tenLocale.instance._locale;
    let typ = typeof str;
    if (typ === 'string'){
      let keys = str.match(/{+([a-zA-Z0-9\.\[\]]*)}+/g);
      if (keys === undefined || keys===null) return str;

      for (let i = 0; i < keys.length; i++){
        let key = keys[i];
        let name = key.replace(/[{}]/g, '');
        if (name === undefined || name === '') continue;

        let value = this._get(name,null,true, lang);
        if (value === undefined) continue;
        let re = new RegExp('\\{' + name + '\\}', 'g');
        str = str.replace(re, value);
      }
      return str;
    }
    if (typ === 'object'){
      if(Array.isArray(str)) {
        for (let i = 0; i < str.length; i++){
          str[i] = this._replace(str[i],lang);
        }
        return str;
      }
      Object.keys(str).forEach((key)=>{
        this._replace(str[key],lang);
      })
    }
    return str;
  }

  format(value,typ,countryCode) {
    countryCode = countryCode || this._countryCode;
    let country = this.getCountry(countryCode);

    let dte = null;

    switch (typ) {
      case 't': //phone
        value = _masker(value, country.phone, true, _tokens);
        return value;
      case 'c': //currency
        value=Number(parseFloat(value)).toLocaleString(country.currency.locale, {style:"currency", currency:country.currency.code, minimumFractionDigits: country.currency.minDecimals});
        return value;
      case 'p': //postal
        value = _masker(value, country.postal, true, _tokens);
        return value;
      case 'd': //date
        if(value.toISOString===undefined) value = parseJSON(value);
        value = format(value, country.date.format);
        return value;
      case 'dl': //date time
        if(value.toISOString===undefined) value = parseJSON(value);
        value = format(value, country.date.formatDateTime);
        return value;
      case 'dt': //time
        if(value.toISOString===undefined) value = parseJSON(value);
        value = format(value, country.date.formatTime);

        return value;
      default:
        return value;
    }
  }
}

const instance = new tenLocale();

export default instance;
