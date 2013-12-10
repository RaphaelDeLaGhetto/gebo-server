var utils = require('../lib/utils'),
    agentSchema = require('../schemata/agent'),
    q = require('q');

/**
 * Inspired by Greg Wang, 2013-11-5
 * http://stackoverflow.com/questions/5364928/node-js-require-all-files-in-a-folder
 *
 * Load `*.js` under current directory as properties
 * i.e., `User.js` will become `exports['User']` or `exports.User`
 */
module.exports = function(email) {

    // Turn the email into a mongo-friendly database name
    var dbName = utils.ensureDbName(email);

    require('fs').readdirSync(__dirname + '/').forEach(function(file) {
        if (file.match(/^\w+\.js/g) !== null && file !== 'index.js') {
          var actions = require('./' + file)(dbName);
          var keys = Object.keys(actions);

          for (var i = 0; i < keys.length; i++) {
            if (!exports[keys[i]]) {
              exports[keys[i]] = actions[keys[i]];
             // throw 'Two actions cannot have the same name';
            }
          }
        }
      });

    /**
     * Add a new action to the actions module.
     *
     * This function does not check to see if a function
     * name will overwrite another. That task is left to 
     * the developer, for now.
     *
     * @param string - optional name
     * @param function or module.exports object
     */
   exports.add = function(name, actions) {

        if (typeof name === 'function') {
          actions = name;

          if (actions.name) {
            name = actions.name;
          }
          else {
            throw new Error('This action needs a name');
          }
          exports[name] = actions; 
        }
        else if (typeof name === 'string' && typeof actions === 'function') {
          exports[name] = actions; 
        }
        else if (typeof name === 'object' && !actions) {
          actions = name;
          var keys = Object.keys(actions);
          for (var i = 0; i < keys.length; i++) {
            if (!exports[keys[i]]) {
              exports[keys[i]] = actions[keys[i]];
             // throw 'Two actions cannot have the same name';
            }
          }
        }
     }; 

    return exports;
  };
