
/**
 * Inspired by Greg Wang, 2013-11-5
 * http://stackoverflow.com/questions/5364928/node-js-require-all-files-in-a-folder
 *
 * This function is identical to that found in the schemata directory
 */
var schema, key;
require('fs').readdirSync(__dirname + '/').forEach(function(file) {
    if (file.match(/^\w+\.js/g) !== null && file !== 'index.js') {
      schema = require('./' + file);
      key = file.replace('.js', '');
      exports[key] = schema;
    }
  });


