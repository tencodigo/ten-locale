const _orderBy =  require('lodash/orderBy');
const _groupBy =  require('lodash/groupBy');
const _debounce =  require('lodash/debounce');
const _filter =  require('lodash/filter');
const _forEach =  require('lodash/forEach');
const _some =  require('lodash/some');
const _isEmpty =  require('lodash/isEmpty');
const _map =  require('lodash/map');
const _find =  require('lodash/find');
const _get =  require('lodash/get');
const _set =  require('lodash/set');
const _pick =  require('lodash/pick');

import $q from 'q';
import moment from 'moment';

const BufferClass = ('function' === typeof Buffer) ? Buffer : Array;
let _rng, _mathRNG, _nodeRNG, _whatwgRNG, _previousRoot;

let _byteToHex = [];
let _hexToByte = {};
for (var i = 0; i < 256; i++) {
  _byteToHex[i] = (i + 0x100).toString(16).substr(1);
  _hexToByte[_byteToHex[i]] = i;
}

function setupNode() {
  // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
  //
  // Moderately fast, high quality
  if ('function' === typeof require) {
    try {
      var _rb = require('crypto').randomBytes;
      _nodeRNG = _rng = _rb && function() {return _rb(16);};
      _rng();
    } catch(e) {}
  }
}

function unparse(buf, offset) {
  var i = offset || 0, bth = _byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
    bth[buf[i++]] + bth[buf[i++]] + '-' +
    bth[buf[i++]] + bth[buf[i++]] + '-' +
    bth[buf[i++]] + bth[buf[i++]] + '-' +
    bth[buf[i++]] + bth[buf[i++]] + '-' +
    bth[buf[i++]] + bth[buf[i++]] +
    bth[buf[i++]] + bth[buf[i++]] +
    bth[buf[i++]] + bth[buf[i++]];
}

function uuid(options, buf, offset) {
  setupNode();
  // Deprecated - 'format' argument, as supported in v1.2
  var i = buf && offset || 0;

  if (typeof(options) === 'string') {
    buf = (options === 'binary') ? new BufferClass(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || _rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ii++) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || unparse(rnds);
}

let uxAppOptions ={

};
class uxApp {
  //setup
  constructor(){
    if(! uxApp.instance){
      uxApp.instance = this;
      this.userSettings = {};
      this.userSettingsBak = {};  // used to store defaults, so session can be reset
      const appSettings = this.appSettings = {};
      this.appState = {};
      this.appStateBak = {};     // used to store defaults, so session can be reset
      this.menus = {};
      this.menuFunc = {};
      this.replacement = [];
      this.endPoints = {};
      this.urls = {};
      this.urlDefaults = {};
      this.validators = {
        mask: function() {  // used as a place holder so masks can be configured with the validators
          return [];
        },
        required: function(self, prefix, name, value,settings, model) {
          let errors = [];
          if(prefix) prefix+='.';
          else prefix='';

          let dependsOn = true;
          if(model && settings.dependsOn) {
            dependsOn = model[settings.dependsOn];
          }

          if(value===undefined || value===null) value='';
          if(dependsOn && (value.trim()===''))
          {
            errors.push({message:"common.form.required",settings:settings,name:prefix+name});
          }

          return errors;
        },
        numeric: function(self, prefix, name,value,settings, model) {
          let errors = [];
          if(prefix) prefix+='.';
          else prefix='';

          // allow nulls by default
          if((settings.allowEmpty===undefined || settings.allowEmpty) && (value===''||value===undefined||value===null||value!==0)) return errors;

          if(!(parseInt(value) || parseFloat(value))) {
            errors.push({message:"common.form.numeric",settings:settings,name:prefix+name});
          }

          return errors;
        },
        compare: function(self, prefix, name,value,settings, model) {
          let errors = [];
          if (prefix) prefix += '.';
          else prefix = '';

          if (!settings.type) {
            throw name + ": compare requires type";
          }
          if (settings.type == 'number') {
            value = parseFloat(value);
          }
          if (settings.type == 'number' && settings.allowEmpty && (value === 0 || value === undefined)) {
            return errors;
          }
          if (settings.type == 'date') {
            value = new Date(value);
          }

          const getSettingVal = function (s, t) {
            if (t === "number") {
              if (s === "{year}") s = new Date().getFullYear();
              if (s === "{month}") s = new Date().getMonth();
              if (s === "{day}") s = new Date().getDate();
              if (s === "{today}") s = new Date().getTime();
              s = parseFloat(s);
            }
            if (t === "date") {
              if (s === "{today}") s = new Date();
              else s = new Date(model[s]);
            }
            if (t === "depends") {
              s = model[s];
            }
            return s
          };

          let s=settings["<="];
          let t = settings.type;
          const error = function (e,s) {
            let sval = s;
            if(t==='date') sval = moment(s.toISOString()).format(appSettings.dateFormat);
            errors.push({message:e,settings:settings,name:prefix+name,s:sval});
          };
          if(s!==undefined) {
            s=getSettingVal(s,settings.type);
            if(value>s) errors.push({message:"common.form.compareLTE"});
          }

          s=settings["<"];
          if(s!==undefined) {
            s=getSettingVal(s,settings.type);
            if(value>=s) error("common.form.compareLT",s);
          }

          s=settings[">="];
          if(s!==undefined) {
            s=getSettingVal(s,settings.type);
            if(value<s) error("common.form.compareGTE",s);
          }

          s=settings[">"];
          if(s!==undefined) {
            s=getSettingVal(s,settings.type);
            if(value<=s) error("common.form.compareGT",s);
          }

          s=settings["=="];
          if(s!==undefined) {
            let sname = s;
            if(sname && sname.substr(0,1)==='!') sname=sname.substr(1);
            let v=getSettingVal(sname,settings.type);
            if(value!==v) error("common.form.compareEQ",s!==sname?sname:v);
          }

          s=settings["!="];
          if(s!==undefined) {
            let sname = s;
            if(sname && sname.substr(0,1)==='!') sname=sname.substr(1);
            let v=getSettingVal(sname,settings.type);
            if(value===v) error("common.form.compareNEQ",s!==sname?sname:v);
          }

          return errors;
        },
        readonly: function () {
          return [];
        },
        "default": function(self, prefix, name,value,settings, model) {
          let errors = [];
          if(prefix) prefix+='.';
          else prefix='';

          if((value==='' || value===undefined || value===null))
          {
            model[name] = settings;
          }

          return errors;
        },
        email: function(self, prefix, name, value, settings, model) {
          if(!value) return [];
          let re = /^(?:[a-zA-Z0-9!#$%&amp;'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&amp;'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;
          if(!re.test(value)) {
            if(prefix) prefix+='.';
            else prefix='';
            return [{message:"common.form.email",settings:settings,name:prefix+name}];
          }
          return [];
        },
        site: function(self, prefix, name, value, settings, model) {
          if(!value) return [];
          let re = /\b((http|https):\/\/?)[^\s()<>]+(?:\([\w\d]+\)|([^[:punct:]\s]|\/?))/g;
          if(!re.test(value)) {
            if(prefix) prefix+='.';
            else prefix='';
            return [{message:"common.form.site",settings:settings,name:prefix+name}];
          }
          return [];
        },
        len: function(self, prefix, name,value,settings, model) {
          let errors = [];
          if(prefix) prefix+='.';
          else prefix='';

          if(settings.max && value.length>settings.max) {
            errors.push({message:"common.form.maxLength",settings:settings,name:prefix+name,max:settings.max});
          }
          if(settings.min && value.length<settings.min) {
            errors.push({message:"common.form.minLength",settings:settings,name:prefix+name,min:settings.min});
          }
          if(settings.maskLength)
          {
            let match = false;
            let maskLengths = [];
            if(self.maskConfig && self.maskConfig.mask)
            {
              for(let i =0; i<self.maskConfig.mask.length; i++)
              {
                let mask = self.maskConfig.mask[i];
                maskLengths.push(mask.length);
                if(value.length === mask.length || value.length === 0)
                  match = true;
              }
            }

            if(!match && maskLengths.length >0)
              errors.push({message:"common.form.maskLength",settings:settings,name:prefix+name,maskLengths:maskLengths.join()});
          }

          return errors;
        },
      };
      this.entities = {};
      this.lists = {};
      this.locale = {};
      this._claims = [];
      this.permissions = {};
    }

    return uxApp.instance;
  }

  setOptions(settings) {
    uxAppOptions.trace = this.getAppSetting("development");
    this.overwrite(uxAppOptions, settings, true);
  }

  different(hash1,hash2) {
    let changed = false;
    if((hash1!==undefined && hash2===undefined)||(hash1===undefined && hash2!==undefined)) return true;
    if(hash1===undefined && hash2===undefined) return false;
    if(hash1.length!==hash2.length) return true;
    for (const key2 in hash2){
      let value2=hash2[key2];
      if(changed) return;
      let first = (key2+'').substring(0,1);
      if(first==='$' || first==='_') return;
      if (!(value2 === '' && hash1[key2] === undefined)) {
        let typ = Object.prototype.toString.call(value2);
        if (typ === '[object Object]' || typ === '[object Array]') {
          if (this.different(value2, hash1[key2])) {
            changed = true;
          }
        } else if ((value2 + '') !== ('' + hash1[key2])) {
          changed = true;
        }
      }
    }

    return changed;
  }

  // common utility functions
  changed($scope,item,idx) {
    let changed = false;

    let checkItem = function(value,key) {
      if(changed || value===undefined) return;
      if(this.different(value,$scope[key])) {
        changed = true;
      }
    };

    if(!item) {
      for (const key in $scope.change){
        checkItem($scope.change[key], key);
      }
    } else {
      if($scope.change) {
        if(idx!==undefined) {
          changed = this.different($scope.change[item][idx],$scope[item][idx]);
        } else {
          changed = this.different($scope.change[item],$scope[item]);
        }
      }
    }
    return changed;
  }

  // directive parameters
  trueFalse(model,name, def) {
    let value = def;
    if(model && model[name] !== undefined) { value = model[name]; }
    if(value === undefined) value = def;
    value = value==="1" || value==="Y" || value==="true" || value===1 || value===true;
    model[name] = value;
    return value;
  }

  // object/array manipulation
  copy(from,to,all) {
    let typ=Object.prototype.toString.call( from );
    if(typ === '[object Array]') {
      to = to || [];
      for(let i=0;i<from.length;i++) {
        to[i]=this.copy(from[i],false,all);
      }
    } else
    if(typ === '[object Object]') {
      to = to || {};
      for (const key in from){
        if(all || (key.indexOf!==undefined && key.indexOf('_')!==0 && key.indexOf('$')!==0)) {
          to[key]=this.copy(from[key],false,all);
        }
      }
    } else return from;

    return to;
  }
  clear(to,all) {
    if(Object.prototype.toString.call( to ) === '[object Array]') {
      to.length=0;
      return to;
    }

    // remove all value that do not start with an underline
    for (const key in to){
      if(all || (key.indexOf!==undefined && key.indexOf('_')!==0 && key.indexOf('$')!==0))
        delete to[key];
    }
    return to;
  }
  clearExtend(to,from,all) {
    this.clear(to,all);

    if(Object.prototype.toString.call( to ) === '[object Array]') {
      for(let i=0;i<from.length;i++) {
        if (Object.prototype.toString.call(from[i]) === '[object Object]') {
          to.push(this.clearExtend({}, from[i]));
        } else {
          to.push(from[i]);
        }
      }
      return to;
    }

    if(from!==undefined) this.extend(to,from);
    return to;
  }
  union(to, from, all) {
    let typ=Object.prototype.toString.call( to );
    if(typ === '[object Array]') {
      for(let i=0;i<from.length;i++) {
        to.push(from[i]);
      }
      return to;
    }
    for (let key in from){
      if(all || key.indexOf!==undefined && key.indexOf('_')!==0 && key.indexOf('$')!==0) {
        if(to[key]===undefined)
          to[key]= from[key];
      }
    }
    return to;
  }
  overwrite(to, from, all) {
    for (const key in from) {
      if(!from.hasOwnProperty(key)) continue;
      let value = from[key];

      if(all || (key.indexOf!==undefined && key.indexOf('_')!==0 && key.indexOf('$')!==0)) {
        to[key]=value;
      }
    }
    return to;
  }
  extend(to, from){
    if(Array.isArray(from)){
      let fromArgs = [...arguments];
      fromArgs.splice(0, 1);
      for(let i=0; i < fromArgs.length; i++){
        this.overwrite(to, fromArgs[i], true);
      }
      return to;
    }else{
      return this.overwrite(to, from, true);
    }
  }
  deDupe(items, keyname) {
    // we define our output and keys array;
    var output = [],
      keys = [];
    for(let i = 0; i < items.length; i++){
      var item = items[i];
      // we check to see whether our object exists
      var key = item[keyname];
      // if it's not already part of our keys array
      if (keys.indexOf(key) === -1) {
        // add it to our keys array
        keys.push(key);
        // push this item to our final output array
        output.push(item);
      }
    }
    // return our array which should be devoid of
    // any duplicates
    return output;
  }

  // locale
  setLocale(defaults,isDefault) {
    if(isDefault) this.union(this.locale,defaults);
    else this.overwrite(this.locale,defaults);
    return this;
  }
  getLocale() {
    return this.locale;
  }
  getLocaleItem(name) {
    if(!name) return '';
    let module = this.appSettings.module;
    let noError = name.substr(0,1)==='?';
    if(noError) name=name.substr(1);
    let locale = this.locale;

    let path = name.split('.');
    if(path.length===1) {
      path.unshift(module);
    }
    while(path.length>0) {
      let part = path.shift();
      if(path.length===0) {
        if(locale[part]) return locale[part];
        if(locale[part+'Title']) return locale[part+'Title'];
      }
      if(!locale[part]) {
        break;
      }
      locale = locale[part];
    }

    path = name.split('.');
    if(path.length===1) {
      path.unshift('common');
    }
    while(path.length>1) {
      let part = path.shift();
      if(path.length===0) {
        if(locale[part]) return locale[part];
        if(locale[part+'Title']) return locale[part+'Title'];
      }
      if(!locale[part]) {
        break;
      }
      locale = locale[part];
    }

    if(!noError) {
      throw "missing locale item: "+name;
    }
    return '';
  }

  //dates
  getMonths() {
    if(this.months) return this.months;

    let list = [];
    let months = this.locale.common.months;
    for(let i=0;i<12;i++) {
      list.push(months[i.toString()]);
    }
    this.months=list;
    return list;
  }
  getMonthsAbbrev() {
    if(this.monthsAbbrev) return this.monthsAbbrev;

    let list = [];
    let months = this.locale.common.monthsS;
    for(let i=0;i<12;i++) {
      list.push(months[i.toString()]);
    }
    this.months=list;
    return list;
  }
  getDays() {
    if(this.days) return this.days;

    let list = [];
    let days = this.locale.common.days;
    for(let i=0;i<7;i++) {
      list.push(days[i.toString()]);
    }
    this.days=list;
    return list;
  }

  // common settings functions

  //user settings
  setUserSettings(settings, isDefault) {
    if(isDefault) {
      this.union(this.userSettings,settings);
      this.overwrite(this.userSettingsBak,settings);
    }
    else this.overwrite(this.userSettings,settings);
    if(uxAppOptions.$userSettingChange){
      uxAppOptions.$userSettingChange(settings, isDefault, true);
    }
    return this;
  }
  getUserSettings() {
    return this.userSettings;
  }
  setUserSetting(name,value) {
    if(value===undefined && this.userSettings[name]) {
      delete this.userSettings[name]; }
    else {
      this.userSettings[name] = value;
    }
    if(uxAppOptions.$userSettingChange)
      uxAppOptions.$userSettingChange(name, value, false);

    return this;
  }
  getUserSetting(name) {
    return this.userSettings[name];
  }

  // url functions
  setUrl(name, url) {
    this.urls[name] = url;
    return this;
  }
  setUrls(urls,isDefault) {
    if(isDefault) {
      this.union(this.urls,urls);
      this.union(this.urlDefaults,urls);
    }
    else this.overwrite(this.urls,urls);
    return this;
  }
  getUrl(name,replacement,exact) {
    let hashes = this.getReplacementHash(replacement);

    let url = this.macroReplace(this.macroReplace(this.urls[name],this.endPoints),hashes);
    if(!exact && url) url=url.replace(/http:/, window.location.protocol).replace(/https:/, window.location.protocol);
    return url;
  }
  getUrls() {
    return this.urls;
  }
  getUrlDefaults() {
    return this.urlDefaults;
  }

  // endpoint functions
  setEndPoint(name, url) {
    this.endPoints[name] = url;
    return this;
  }
  setEndPoints(endPoints, isDefault) {
    if(isDefault) this.union(this.endPoints,endPoints);
    else this.overwrite(this.endPoints,endPoints);
    return this;
  }
  getEndPoints() {
    return this.endPoints;
  }
  getEndPoint(name) {
    return this.endPoints[name];
  }

  // application settings
  setAppSettings(settings,isDefault) {
    if (settings.base) {
      settings.base = settings.base.replace(/http:/, window.location.protocol).replace(/https:/, window.location.protocol);
    }
    if(isDefault) {
      if(!this.appSettings.base) settings.base=window.location.protocol+'//'+window.location.host+'/';
      this.union(this.appSettings,settings);
    }
    else this.overwrite(this.appSettings,settings);
    return this;
  }
  getAppSettings() {
    return this.appSettings;
  }
  setAppSetting(name, value) {
    this.appSettings[name] = value;
    return this;
  }
  getAppSetting(name) {
    return this.appSettings[name];
  }

  // shared state
  setStateSettings(defaults,isDefault) {
    if(isDefault) this.overwrite(this.appStateBak,defaults);
    this.union(this.appState,defaults);
    return this;
  }
  setupState(name,value) {
    if(this.appState[name]===undefined) {
      this.appState[name] = value;
    }
    return this;
  }
  setState(name,value) {
    if(value===undefined && this.appState[name]) {
      delete this.appState[name]; }
    else {
      this.appState[name] = value;
    }
    return this;
  }
  getState(name) {
    return this.appState[name];
  }
  getAppState() {
    return this.appState;
  }

  // entity
  setEntities(entities, isDefault) {
    for (const key in entities) {
      if(!this.entities[key]) this.entities[key]={};
      if(isDefault) this.union(this.entities[key],entities[key]);
      else this.overwrite(this.entities[key],entities[key]);
    }
  }
  setEntity(schema,name,entity) {
    if(!this.entities[schema]) this.entities[schema]={};
    this.entities[schema][name] = entity;
    return this;
  }
  getEntity(schema,name) {
    if(!this.entities[schema]) this.entities[schema]={};
    return this.entities[schema][name] || {};
  }

  // lists
  getLists(){
    return this.lists;
  }
  setList(schema, name, list) {
    list.results = list.results || [];
    list.buttons = list.buttons || [];
    list.columns = list.columns || [];
    list.sortInfo = list.sortInfo || {};
    list.sortInfo.fields = list.sortInfo.fields || [];
    list.sortInfo.directions = list.sortInfo.directions || [];
    list.sortInfo.top = list.sortInfo.top || 25;
    list.loading = false;
    list.total = 0;
    list.page = 1;

    if(!this.lists[schema]) this.lists[schema]={};
    this.lists[schema][name] = list;
    return this;
  }
  setLists(lists, isDefault) {
    let typ=Object.prototype.toString.call( lists );
    if(typ === '[object Array]') {
      for(let i=0;i<lists.length;i++) {
        let list = lists[i];
        let module = list.module || list.moduleCode;
        let name = list.name || list.listCode;
        this.setList(module.toLocaleLowerCase(),name,list);
      }
    } else {
      for (const module in lists){
        if(!this.lists[module]) this.lists[module]={};
        for(const name in lists[module]) {
          let list = {};
          if(isDefault) this.union(list,lists[module][name]);
          else this.overwrite(list,lists[module][name]);
          this.setList(module, name, lists[module][name]);
        }
        if(isDefault) this.union(this.lists[module],lists[module]);
        else this.overwrite(this.lists[module],lists[module]);
      }
    }
  }
  getList(schema, name) {
    if(!this.lists[schema]) this.lists[schema]={};
    let list = this.lists[schema][name] || {};
    return list;
  }

  setListOrderBy(search) {  // TODO: this should be somewhere else
    // get the order in which to display
    let si = search.sortInfo;
    let sc = search.columns;
    if(!search) return;
    if(!si || !si.fields || !sc) {
      search.searchHash=search.searchHash||{};
      search.searchHash.orderBy='';
      return;
    }
    let orderByList = [];
    for (let i = 0; i < si.fields.length; i++) {
      let field = si.fields[i];
      for (let j = 0; j < sc.length; j++) {
        if(sc[j].field===field) {
          if(sc[j].sortField) field=sc[j].sortField;
          break;
        }
      }
      orderByList.push(field + ' ' + si.directions[0]);
    }
    if (orderByList.length > 0) orderByList = "&$orderBy=" + orderByList.join();
    else orderByList = '';
    search.searchHash.orderBy = orderByList;
  }

  // fields
  properCase(txt) {
    if(!txt) return '';
    return txt.substr(0,1).toUpperCase()+txt.substr(1);
  }
  buildKey(entity,field) {
    field=this.properCase(field);
    return entity+field;
  }
  setField(schema,entity,field,config) {
    if(!this.entities[entity]) this.entities[entity]={};
    this.entities[entity][field] = config;
    return this;
  }
  getField(schema,entity,field) {
    if(!this.entities[schema]) this.entities[schema] = {};
    if(!this.entities[schema][entity]) this.entities[schema][entity]={};
    if(!this.entities[schema][entity][field]) this.entities[schema][entity][field]={};
    return this.entities[schema][entity][field];
  }
  fieldLength(schema,entity, field) {
    return this.getField(schema,entity, field).length;
  }
  fieldTitle(schema, entity, field) {
    if(this.locale[schema] && this.locale[schema][entity]) {
      return this.locale[schema][entity][field+'Title'] || this.locale[schema][entity][field];
    }
    let key = this.buildKey(entity, field);
    let legacy = this.locale.common;
    let keyOld=this.properCase(key);
    return legacy[schema+keyOld+'Title'] || legacy[keyOld+'Title'] || legacy[key];
  }
  fieldTitleLong(schema, entity, field) {
    if(this.locale[schema] && this.locale[schema][entity]) {
      return this.locale[schema][entity][field+'TitleL'] || this.locale[schema][entity][field+'L'] || this.locale[schema][entity][field+'Title'] || this.locale[schema][entity][field];
    }

    let key = this.buildKey(entity, field);
    let common = this.locale.common;
    let keyOld=this.properCase(key);
    return common[schema+keyOld+'TitleL'] || common[schema+keyOld+'Title'] || common[keyOld+'TitleL'] || common[keyOld+'Title'] || common[key];
  }
  fieldTitleShort(schema,entity, field) {
    if(this.locale[schema] && this.locale[schema][entity]) {
      return  this.locale[schema][entity][field+'TitleS'] || this.locale[schema][entity][field+'S'] || this.locale[schema][entity][field+'Title'] || this.locale[schema][entity][field];
    }
    let key = this.buildKey(entity, field);
    let common = this.locale.common;
    let keyOld=this.properCase(key);
    return common[schema+keyOld+'TitleS'] || common[schema+keyOld+'Title'] || common[keyOld+'TitleS'] || common[keyOld+'Title'] || common[key];
  }
  fieldFormat(schema,entity, field) {
    field=this.getField(schema,entity, field);
    if(!field.format) return '';
    return field.format;
  }

  // user settings
  resetUserSettings() {
    this.userSettings = this.clearExtend(this.userSettings,this.userSettingsBak,true);
  }

  // clipboard
  fallbackCopyTextToClipboard(text) {
    let textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      let successful = document.execCommand('copy');
      let msg = successful ? 'successful' : 'unsuccessful';
      console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
  }
  copyTextToClipboard(text) {
    if (!navigator.clipboard) {
      this.fallbackCopyTextToClipboard(text);
      return;
    }
    navigator.clipboard.writeText(text).then(function() {
      console.log('Async: Copying to clipboard was successful!');
    }, function(err) {
      console.error('Async: Could not copy text: ', err);
    });
  }

  // macros
  macroReplace(str, values){
    if (values === undefined) return str;
    let typ = Object.prototype.toString.call(str);

    if (typ === '[object String]'){
      let keys = str.match(/\{+(\w*)}+/g);
      if (keys === undefined || keys===null) return str;

      for (let i = 0; i < keys.length; i++){
        var key = keys[i];
        let name = key.replace(/[{}]/g, '');
        if (name === undefined || name === '') continue;

        if (values[name] === undefined) continue;
        let re = new RegExp('\\{' + name + '\\}', 'g');
        str = str.replace(re, values[name]);
      }
      return str;
    }
    if (typ === '[object Object]' || typ === '[object Array]'){
      for (let i = 0; i < str.length; i++){
        str[i] = this.macroReplace(str[i], values);
      }
    }
    return str;
  }
  addReplacementHash(hash) {
    if(this.replacement.indexOf(hash)>=0) return this;
    this.replacement.push(hash);
    return this;
  }
  getReplacementHash(replacement) {
    let hashes = {};
    if(replacement) this.union(hashes,replacement);
    for(let i=0;i<this.replacement.length;i++) {
      this.union(hashes,this.replacement[i]);
    }
    return hashes;
  }


  // permissions
  isRequired(schema,entity, field) {
    field=this.getField(schema,entity, field);
    return field.required===true;
  }
  isReadOnly(schema,entity,field) {
    let e = this.getEntity(schema,entity);
    if(e._readonly) return true;
    if(e._hasFieldSecurity && field) {
      if(this.hasPermission(schema,entity,'F')) return false;
      if(!(this.hasPermission(schema,entity,'A') || this.hasPermission(schema,entity,'M')) || !(this.hasPermission(schema,entity+"_"+field,'M') || this.hasPermission(schema,entity+"_*",'M'))) return true;
    } else if(!this.hasPermission(schema,entity,'A') && !this.hasPermission(schema,entity,'M')) return true;

    return !this.hasPermission(schema,entity,'M');
  }
  canDelete(schema,entity) {
    if(this.getEntity(schema,entity)._readonly) return false;
    let del = this.getEntity(schema,entity).canDelete;
    if(del || del===undefined) {
      return this.hasPermission(schema,entity,'D');
    }
    return false;
  }
  canAdd(schema,entity) {
    if(this.getEntity(schema,entity)._readonly) return false;
    let add = this.getEntity(schema,entity).canAdd;
    if(add || add===undefined) {
      return this.hasPermission(schema,entity,'A');
    }
    return false;
  }
  canView(schema,entity,field) {
    if(this.getEntity(schema,entity).hidden) return false;
    let e=this.getEntity(schema,entity);
    let hidden = e.hidden;
    if(hidden || hidden===undefined) {
      if(e._hasFieldSecurity && field) return this.hasPermission(schema,entity,'V',field);
      return this.hasPermission(schema,entity,'V');
    }
    return false;
  }

  getClaims() {
    return this._claims;
  }
  setClaims(claims) {
    this._claims.length = 0;
    this.union(this._claims,claims);
    this.convertClaims();
  }
  convertClaims() {
    if(this._claims.length===0) return;
    this.clear(this.permissions);

    for(let i=0;i<this._claims.length;i++) {
      if(this._claims[i].type==="http://schemas.microsoft.com/ws/2008/06/identity/claims/role") {
        let parts=this._claims[i].value.split('.');
        if(parts && parts.length>1) {
          let parts2 = parts[1].split('_');

          let right = parts2[parts2.length - 1];
          parts2.splice(parts2.length - 1, 1);
          let oname = parts2.join('_');

          if (!this.permissions[parts[0]]) this.permissions[parts[0]] = {};
          if (!this.permissions[parts[0]][oname]) this.permissions[parts[0]][oname] = [];
          if (this.permissions[parts[0]][oname].indexOf(right) < 0) this.permissions[parts[0]][oname].push(right);
        }
      }
      let _ignored = this.userSettings._ignored = (this.userSettings._ignored ||[]);

      let claimMap = {
        'http://www.civic360.com/orgid':'organizationID,ouid',
        'http://www.civic360.com/ouid':'ouid',
        'http://www.civic360.com/profilePhotoType':'profilePhotoType',
        'http://www.civic360.com/personuid':'personUID',
        'http://www.civic360.com/useruid':'userUID',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/homephone':'homePhone',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/mobilephone':'mobilePhone',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/otherphone':'otherPhone',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress':'loginEmail,email',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name':'loginUserName,username',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/displayname':'loginName,displayName',
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/windowsaccountname':'loginWindows'
      };

      if(claimMap[this._claims[i].type]) {
        let keys=claimMap[this._claims[i].type].split(',');
        for(let j=0;j<keys.length;j++) {
          let key = keys[j];
          if(this._claims[i].value!==undefined && this._claims[i].value!=='') {
            this.userSettings[key] = this._claims[i].value;
            if (_ignored.indexOf(key) < 0) _ignored.push(key);
          } else {
            if (_ignored.indexOf(key) < 0) delete this.userSettings[key];
          }
        }
        delete this.userSettings._ignored;
      }
    }
  }
  getPermissions() {
    return this.permissions;
  }
  hasPermission(schema,entity,code,field,absolute) {
    schema = schema.toUpperCase();
    if(!entity) return false;
    entity = entity.toUpperCase();
    let entity2 = entity;
    code = code.toUpperCase();
    if(field) {
      field=field.toUpperCase();
      entity=entity+'_'+field;
      entity2=entity+'_*';
    }
    if(!this.permissions[schema]) return false;
    if(!this.permissions[schema][entity] && !this.permissions[schema][entity2]) return false;
    return (this.permissions[schema][entity].indexOf(code)>=0 || (!absolute && this.permissions[schema][entity].indexOf('F')>=0)) ||
      (this.permissions[schema][entity2].indexOf(code)>=0 || (!absolute && this.permissions[schema][entity2].indexOf('F')>=0));
  }

  // menus
  setupMenu(settings, isDefault) {
    if(!settings) { return; }
    let typ=Object.prototype.toString.call( settings );
    if(typ === '[object Array]') {
      let touched = [];
      for(let i=0;i<settings.length;i++) {
        let item = settings[i];
        item.attributes = item.attributes || {};
        if(!item) { continue;}

        let module = item.moduleCode || 'common';
        module = module.toLocaleLowerCase();

        let name='';
        if(!item.menuCodeList) {
          console.log("menu: menuCodeList is required");
          continue;
        }

        name = item.titleCode;
        if(!name && item.title) {
          name = item.title.replace(/\s/g,'');
          name = 'menu' + name.substr(0,1).toLocaleUpperCase() + name.substr(1);
          item.titleCode = name;
        }
        if(!name) {
          console.log("menu: titleCode could not be determine for menu");
          continue;
        }

        let list = item.menuCodeList;
        if(Object.prototype.toString.call( list ) !== '[object Array]') {
          list = list.split(',');
        }

        for(let j=0;j<list.length;j++) {
          let code = list[j].toLowerCase();   // locate menuItem array
          let code2 = module + '_' + code;

          let menu =this.menus[code] || {_open:false,_active:false, items:[]};
          let menu2 =this.menus[code2] || {_open:false,_active:false, items:[]};
          menu.items = menu.items || [];
          if(touched.indexOf(code)<0) {
            touched.push(code);
            if(!isDefault) {menu.items.length=0;}
            menu._dirty = true;
            if(!isDefault) {menu2.items.length=0;}
            menu2._dirty = true;
          }
          menu.items.push(item);
          menu2.items.push(item);
          this.menus[code] = menu;
          this.menus[code2] = menu2;

          if(item && item.seq === undefined) {
            item.seq=menu.items.length;
          }
        }
        if(item && item.items) {
          this.setupMenu(item.items,isDefault);
        }
      }
    }
    if(typ === '[object Object]') {
      for (const module in settings){
        for (const name in settings[module]){
          let code = module + '_' + name;
          let menu = settings[module][name];
          if(!menu) continue;
          for(let i=0;i<menu.length;i++) {
            const item=menu[i];
            if(item.seq===undefined) item.seq=i;
            if(!item.menuItemUID) item.menuItemUID=this.uidNew();
            if(!item.linkTypeCode) item.linkTypeCode="M";
            if(!item.titleCode && item.name) item.titleCode=module+'.'+name+"."+item.name;
            if(!item.attributes) item.attributes = {};
            if(!item.attributes.name) item.attributes.name = item.name;
          }
          this.menus[code.toLocaleLowerCase()] = {items:menu};
        }
      }
    }
  }
  getMenu(modulename,name) {
    if(modulename && name) {
      let code = modulename + "_" + name;
      if(this.menus[code.toLowerCase()]) {
        return this.menus[code.toLowerCase()];
      }
      console.log('menu not found: '+code);
    } else {
      if (modulename) {
        let code = modulename.toLowerCase();
        if(this.menus[code]){
          return this.menus[code];
        }
        console.log('menu not found: '+code);
      }
    }
    return {items:[]};
  };
  getMenuWrapper(moduleName,name) {
    let menu = this.getMenu(moduleName,name);
    if(menu) {  // resort items if dirty
      menu.items = this.orderBy(menu.items);
    }
    return menu;
  }
  registerFunction(name,func) {
    this.menuFunc[name] = func;
  }
  getMenuFunctions() {
    return this.menuFunc;
  }

  // guid / uid
  guidNew(){
    return uuid();
  }
  uidNew() {
    return uuid().replace(/-/g, '');
  }

  // currency
  formatCurrency(inputVal,sym,dec) {
    inputVal=''+inputVal;

    //clearing left side zeros
    while (inputVal.charAt(0) === '0') {
      inputVal = inputVal.substr(1);
    }
    if(inputVal==='') inputVal='0';

    let isneg = inputVal.charAt(0) === '-';
    inputVal = inputVal.replace(/[^\d.',']/g, '');

    let point = inputVal.indexOf(".");
    if (point >= 0) {
      inputVal = inputVal.slice(0, point + 3);
    }

    let decimalSplit = inputVal.split(".");
    let intPart = decimalSplit[0];
    let decPart = decimalSplit[1];

    intPart = intPart.replace(/[^\d]/g, '');
    if (intPart.length > 3) {
      let intDiv = Math.floor(intPart.length / 3);
      while (intDiv > 0) {
        let lastComma = intPart.indexOf(",");
        if (lastComma < 0) {
          lastComma = intPart.length;
        }

        if (lastComma - 3 > 0) {
          intPart = intPart.slice(0, lastComma - 3) + "," + intPart.slice(lastComma - 3);
        }
        intDiv--;
      }
    }

    if (decPart === undefined) {
      decPart = "";
    }
    else {
      decPart = "." + decPart;
    }
    dec=parseInt(dec);
    if(dec>0) {
      if(decPart==="") decPart=".";
      decPart+=new Array(dec+1).join('0');
      decPart=decPart.substr(0,dec+1);
    }

    let res = intPart + decPart;
    if(sym && res!=='') res = sym+res;
    if(isneg) res='-'+res;
    return res;
  }
  cleanAmount(amount) {
    let inputVal = ('' + amount);
    //clearing left side zeros
    while (inputVal.charAt(0) === '0') {
      inputVal = inputVal.substr(1);
    }
    if(inputVal==='') inputVal='0';
    let isneg = inputVal.charAt(0) === '-';
    let val = parseFloat(inputVal.replace(/[^\d.]/g, ''));
    if(isneg) val=-val;
    return val;
  }

  reset() {
    this.clearExtend(this.userSettings,this.userSettingsBak);
    this.clearExtend(this.appState,this.appStateBak);
  }
  // _combineControllerServices(app, transport, name, all, suffix) {
  //   all = all || {};
  //   suffix = suffix || 'Service';
  //   let nameSuffix = name+suffix;
  //   let pLen = suffix.length;
  //   let controllers = angular.module('controllers');
  //   angular.forEach(controllers._invokeQueue, function(service){
  //     if(service[1]!='service') return;
  //     let serviceName = service[2][0];
  //     let get = service[2][1][2];
  //     if(serviceName.length>pLen && serviceName!=nameSuffix && serviceName.substr(0,name.length) == name && serviceName.substr(serviceName.length-pLen)==suffix) {
  //       angular.extend(all,get(app, transport));
  //     }
  //   });
  //
  //   return all;
  // }

  setup(settings, isDefault) {
    console.log(settings);
    if(settings.locale) this.setLocale(settings.locale,isDefault);
    if(settings.endPoints) this.setEndPoints(settings.endPoints,isDefault);
    if(settings.urls) this.setUrls(settings.urls,isDefault);
    if(settings.user) this.setUserSettings(settings.user,isDefault);
    if(settings.state) this.setStateSettings(settings.state,isDefault);
    if(settings.settings) this.setAppSettings(settings.settings,isDefault);
    if(settings.lists) this.setLists(settings.lists,isDefault);
    if(settings.entities) this.setEntities(settings.entities,isDefault);
    if(settings.menus) this.setupMenu(settings.menus,isDefault);
    if(settings.claims && !isDefault) this.setClaims(settings.claims);

    this.addReplacementHash(this.appSettings);
    this.addReplacementHash(this.userSettings);

    return this;
  }
  orderBy(list, fields, direction){
    return _orderBy(list, fields || 'seq', direction || 'asc');
  }
  groupBy(list, propertyName){
    return _groupBy(list, propertyName);
  }
  debounce(func, wait, options){
    if(wait===undefined) wait=0;
    return _debounce(func, wait, options||{});
  }
  forEach(collection, iteratee) {
    return _forEach(collection, iteratee);
  }
  filter(collection, predicate) {
    return _filter(collection, predicate);
  }
  some(collection, predicate, guard) {
    return _some(collection, predicate, guard);
  }
  isEmpty(value) {
    return _isEmpty(value);
  }
  map(collection, iteratee) {
    return _map(collection, iteratee);
  }
  find(collection, predicate, fromIndex) {
    return _find(collection, predicate, fromIndex);
  }
  get(object, path, defaultValue) {
    return _get(object, path, defaultValue);
  }
  set(object, path, value) {
    return _set(object, path, value);
  }
  pick(object) {
    return _pick(object, arguments);
  }

  addValidators(validators) {
    let typ = Object.prototype.toString.call(validators);
    if (typ === '[object Array]') {
      for(let i=0;i<validators.length;i++){
        this.validators[validators[i].name] = validators[i];
      }
    } else
    if (typ === '[object Object]') {
      for(let key in validators) {
        this.validators[key] = validators[key];
      }
    }
  }

  validate(self, validations, prefix, model) {
    validations = validations || self.__validations;
    let name = self.id;
    let value = self.value;
    let defer = $q.defer();
    let list = [];

    let valid = [];
    if(!validations || validations.length===0) {
      defer.resolve(valid);
      return defer.promise;
    }
    for(let key in validations) {
      if(!this.validators[key]) {
        console.log(key+': validator not found');
        continue;
      }
      let errors = this.validators[key](self, prefix, name, value===undefined || value===null ? '' : value.toString(), validations[key], model);

      let typ = Object.prototype.toString.call(errors);
      if (typ === '[object Array]') {  // did it return array
        for(let i=0;i<errors.length;i++){
          valid.push(errors[i]);
        }
      } else {  // no so it should be a promise
        if(errors) list.push(errors);
      }
    }

    defer.resolve(valid) // always return all errors for those validations, that did not return promises

    // we always return a promise, but return an all promises if we had any return a promise
    if(list.length>0) {
      list.push(defer.promise);  // add the non promise errors;
      let defer2 = $q.defer();

      $q.all(list).then(function(results){
        let errors=[];
        for(let i=0;i<results.length;i++) {
          if(!results[i]) continue;
          for(let j=0;j<results[i].length;j++) {
            errors.push(results[i][j]);
          }
        }
        defer2.resolve(errors);
      });

      return defer2.promise;
    }

    return defer.promise;
  }

  bind($scope){
    this.union($scope, {
      user: this.userSettings,
      locale: this.locale,
      settings: this.appSettings,
      state: this.appState,
      changed: this.changed,

      isRequired: this.isRequired,
      fieldTitle: this.fieldTitle,
      fieldTitleLong: this.fieldTitleLong,
      fieldTitleShort: this.fieldTitleShort,
      fieldFormat: this.fieldFormat,
      formatCurrency: this.formatCurrency,
      cleanAmount: this.cleanAmount,

      today: new Date()
    });
  }
  //rest is the same code as preceding example

}

const instance = new uxApp();

export default instance;
