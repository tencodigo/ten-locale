const fs = require("fs");
const path = require("path");
const templateRegex = /(<template(\s|\S)*?<\/template>)/g;
const localeEx = /(<.*\sv-locale-(text|placeholder|title)\s?=\s?\"\'.*'">)(.*)(<\/.*>)/g;

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
      const matches = contents.match(localeEx);
      if(!matches) continue;

      console.log(matches);

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
