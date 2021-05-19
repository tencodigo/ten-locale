const fs = require("fs");
const path = require("path");

const templateRegex = /(<template(\s|\S)*?<\/template>)/g;
const localeEx = /(<.*\sv-locale-(text|placeholder|title)\s?=\s?\"\'(.*)'".*?>)(.*)?<\/.*>?/g;
const localeEx2 = /(<.*\sv-locale-(text|placeholder|title)\s?=\s?\"\'(.*)'".*?\/>)/g;
const placeEx = /\splaceholder\s?=\s?"(.*)"/g;
const titleEx = /\stitle\s?=\s?"(.*)"/g;
const idEx = /\sid\s?=\s?"(.*)"/g;

function execRegEx(str,rex) {
  let matches = rex.exec(str);
  if(matches===null) matches = rex.exec(str);
  return matches;
}

function getTemplates(directory, files, locale)
{
  files = files || [];
  const filesInDirectory = fs.readdirSync(directory);
  for (const file of filesInDirectory) {
    const absolute = path.join(directory, file);
    if (fs.statSync(absolute).isDirectory()) {
      getTemplates(absolute,files, locale);
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
        if (typ === 'text') {
          let value = tag[4];
          console.log({name: name, value: value});
        } else if (typ === 'title') {
          let title = execRegEx(matches[i],titleEx);
          if(title) title=title[1];
          console.log({name: name, value: title});
        } else if (typ === 'placeholder') {
          let place = execRegEx(matches[i],placeEx);
          if(place) place=place[1];
          console.log({name: name, value: place});
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
class LocaleWebPackPlugin {
  constructor(options)
  {
    this.options = {
      localeCode:"en"
    };
    mergeOptions(this.options,options);
  }

  apply(compiler) {
    console.log('before ---- ');

    if(!this.options.locale && !fs.existsSync(this.options.locale))
      throw "locale option must be specified and point to a valid file";

    let locale = require(this.options.locale);

    console.log(getTemplates(process.cwd(), null, locale));

    compiler.hooks.done.tap('LocaleWebPackPlugin', compilation => {
      console.log('Touch the run hook asynchronously. ');
    });
  }
}

module.exports = LocaleWebPackPlugin;
