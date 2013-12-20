var utils = require('../lib/utils');

/**
 * Inspired by Greg Wang, 2013-11-5
 * http://stackoverflow.com/questions/5364928/node-js-require-all-files-in-a-folder
 */
var schema, key;
require('fs').readdirSync(__dirname + '/').forEach(function(file) {
    if (file.match(/^\w+\.js/g) !== null && file !== 'index.js') {
      schema = require('./' + file);
      key = file.replace('.js', '');
      exports[key] = schema;
    }
  });

 /**
  * Add a new schema to the schemata module.
  *
  * This function does not check to see if a function
  * name will overwrite another. That task is left to 
  * the developer, for now.
  *
  * @param string - optional name
  * @param function or module.exports object
  */
exports.add = function(name, schema) {
    if (typeof name === 'function') {
      throw new Error('This schema needs a name');
    }
    else if (typeof name === 'string' && typeof schema === 'function') {
      exports[name] = schema; 
    }
    else if (typeof name === 'object') {
      var keys = Object.keys(name);
      for (var i = 0; i < keys.length; i++) {
        if (!exports[keys[i]]) {
          exports[keys[i]] = name[keys[i]];
        }
      }
    }
  }; 

/**
 * Remove an action by name
 *
 * @param string
 */
exports.remove = function(name) {
    delete exports[name];
  };

