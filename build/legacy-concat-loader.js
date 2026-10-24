const fs = require('fs');
const path = require('path');

const scripts = [
  'vendors/webmidi.js',
  'vendors/FileSaver.min.js',
  'consts.js',
  'functions.js',
  'events.js',
  'main.js'
];

module.exports = function() {
  this.cacheable();
  const source = scripts.map((script) => {
    const filePath = path.resolve(this.rootContext, 'assets', script);
    this.addDependency(filePath);
    const contents = fs.readFileSync(filePath, 'utf8');
    return script === 'vendors/webmidi.js'
      ? `${contents}\nvar WebMidi = module.exports;`
      : contents;
  });

  return source.join('\n');
};
