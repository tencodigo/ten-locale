function mergeOptions(a, b) {
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
    compiler.hooks.done.tap('LocaleWebPackPlugin', compilation => {
      console.log('Touch the run hook asynchronously. ');
    });
  }
}

module.exports = LocaleWebPackPlugin;
