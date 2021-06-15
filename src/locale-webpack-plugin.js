const fs = require("fs");
const path = require("path");
const _get = require('lodash/get');
const _set = require('lodash/set');
let compiler = require('vue-template-compiler');

const templateRegex = /(<template(\s|\S)*?<\/template>)/g;
const localeEx = /(<.*\sv-locale-(text|placeholder|title)\s?=\s?\"\'(.*)'".*?>)(.*)?<\/.*>?/g;
const localeEx2 = /(<.*\sv-locale-(text|placeholder|title)\s?=\s?\"\'(.*)'".*?\/>)/g;
const placeEx = /\splaceholder\s?=\s?"(.*)"/g;
const titleEx = /\stitle\s?=\s?"(.*)"/g;
const idEx = /\sid\s?=\s?"(.*)"/g;

function execRegEx(str,rex) { // should not need this, but every other exec is failing
  let matches = rex.exec(str);
  if(matches===null) matches = rex.exec(str);
  return matches;
}

/// Sorts an object recursively putting hashes at top of each sub hash
function sortObject(object){
  const sortedObj = {},
    keys = Object.keys(object);

  keys.sort(function(key1, key2){
    key1 = key1.toLowerCase(), key2 = key2.toLowerCase();

    key1 = key1.replace('~','');
    key2 = key2.replace('~','');

    if(typeof object[key1]!==typeof object[key2]) {
      if (typeof object[key1] === 'object') return -1;
      if (typeof object[key2] === 'object') return 1;
    }
    if(key1 < key2) return -1;
    if(key1 > key2) return 1;
    return 0;
  });

  for(let index in keys){
    const key = keys[index];
    if(typeof object[key] == 'object' && !(object[key] instanceof Array)){
      sortedObj[key] = sortObject(object[key]);
    } else {
      sortedObj[key] = object[key];
    }
  }

  return sortedObj;
}

function getTemplates(directory, files, tags, locale, localeCode)
{
  files = files || [];
  tags = tags || {};
  const filesInDirectory = fs.readdirSync(directory);

  for (const file of filesInDirectory) {
    const absolute = path.join(directory, file);
    if (fs.statSync(absolute).isDirectory()) {
      getTemplates(absolute,files, tags, locale, localeCode);
    } else {
      if(absolute.indexOf('.git')>0) continue;
      let ext = path.extname(absolute).toLocaleLowerCase();
      if(ext!=='.html' && ext!==".vue") continue;
      let contents = fs.readFileSync(absolute, 'utf8');

      if(!contents.match(templateRegex)) continue;
      let matches = contents.match(localeEx);
      const matches2 = contents.match(localeEx2);
      if(!matches && matches2) matches=matches2;
      else if(matches && matches2) matches = matches.concat(matches2);

      if(!matches) continue;

      for(let i=0;i<matches.length;i++) {
        let tag = execRegEx(matches[i],localeEx);
        if(tag===null) tag = execRegEx(matches[i],localeEx2);
        if(tag===null) { continue; }

        let id = execRegEx(matches[i],idEx);
        if(id) id=id[1];

        let typ = tag[2];
        let name = tag[3];
        if(name.indexOf(':')<0) { // make sure all are prefixed with the language code
          name=localeCode+':'+name;
        }
        if (typ === 'text') {
          let value = tag[4];
          tags.push({name: name, value: value});
        } else if (typ === 'title') {
          let title = execRegEx(matches[i],titleEx);
          if(title) title=title[1];
          tags.push({name: name, value: title});
        } else if (typ === 'placeholder') {
          let place = execRegEx(matches[i],placeEx);
          if(place) place=place[1];
          tags.push({name: name, value: place});
        } else {
          continue;
        }
      }

      files.push(absolute);
    }
  }
  return files;
}

function mergeOptions(a, b)
{
  if (!b) return a;
  Object.keys(b).forEach((key) => {
    a[key] = b[key];
  });
  return a;
}

function stripAutoText(a) {
  let b = {};
  Object.keys(a).forEach((key) => {
    if(key.substr(0,1)==='~') return;
    b[key] = a[key];
    if(typeof b[key]==='object') {
      b[key] = stripAutoText(a[key]);
    }
  });
  return b;
}

class LocaleWebPackPlugin {
  constructor(options)
  {
    this.options = {
      localeCode:"en"
    };
    mergeOptions(this.options,options);
  }

  getCompiler(options) {
    return {compile:function (v1,v2) {
        console.log('here',v1,v2);
        if(!compiler || !compiler.compile) console.log('no compile');
        else console.log('has compile');
        if(compiler.compile)
          return compiler.compile(v1,v2);
        return compiler;
      }};
  }

  _rebuild() {
    if(!this.options.locale && !fs.existsSync(this.options.locale))
      throw "locale option must be specified and point to a valid file";

    let allText = fs.readFileSync(this.options.locale);
    let all = JSON.parse(allText);
    allText = JSON.stringify(sortObject(all), null, 4);
    let locale = stripAutoText(all.locale);

    let tags = [];
    let files = getTemplates(process.cwd(), null, tags, locale, this.options.localeCode || 'en');
    if(this.options.debug) {
      console.log(files,tags);
    }

    for(let i=0;i<tags.length;i++) {
      let parts = tags[i].name.split(':');
      let localeCode = parts[0];
      let name = parts[1];
      let lang = locale[localeCode];
      if(!lang) locale[localeCode]={};

      if(_get(lang,name)) {
        continue;
      } else {
        parts = name.split('.');
        let last = parts.length-1;
        parts[last] = '~'+parts[last];
        name = parts.join('.');
        _set(lang,name,tags[i].value);
      }
    }

    all.locale = locale;
    const data = JSON.stringify(sortObject(all), null, 4);

    if(allText===data) return;

    let outputFile = this.options.outputFile;
    if(!outputFile) outputFile = this.options.locale;
    fs.writeFileSync(this.options.locale, data);
  }

  apply(compiler) {
    this._rebuild();
    compiler.hooks.done.tap('LocaleWebPackPlugin', compilation => {
      this._rebuild();
    });
  }
}

module.exports = LocaleWebPackPlugin;
