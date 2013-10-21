
'use strict';

var nconf = require('nconf');
nconf.argv().env().file({ file: 'local.json' });

/**
 * Mongo naming restriction constants
 */
exports.constants = {
    at: '_at_',
    backslash: '_backslash_',
    colon: '_colon_',
    dollarSign: '_dollarsign_',
    dot: '_dot_',
    doubleQuotes: '_doublequotes_',
    greaterThan: '_greaterthan_',
    lessThan: '_lessthan_',
    noCollection: 'No collection',
    pipe: '_pipe_',
    questionMark: '_questionmark_',
    slash: '_slash_',
    space: '_space_',
    star: '_star_',
  };

/**
 * Return a unique identifier with the given `len`.
 *
 *     utils.uid(10);
 *     // => "FDaS435D2z"
 *
 * @param {Number} len
 * @return {String}
 * @api private
 */

/**
 * Return a random int, used by `utils.uid()`
 *
 * @param {Number} min
 * @param {Number} max
 * @return {Number}
 * @api private
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

exports.uid = function (len) {
    var buf = [],
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        charlen = chars.length;

    for (var i = 0; i < len; ++i) {
      buf.push(chars[getRandomInt(0, charlen - 1)]);
    }

    return buf.join('');
  };

/**
 * Make the gebo user's email address suitable for naming
 * a database... and more!
 * 
 * Mongo does not allow these characters: /\. "*<>:|? 
 * (http://docs.mongodb.org/manual/reference/limits/)
 *
 * This function sanitizes @s as well, though it is not
 * required by Mongo.
 *
 * @param string
 *
 * @return string
 */
function _getMongoDbName(str) {
    if (!/[/\. "*<>:|?@]/.test(str)) {
      return str;
    }
    
    str = str.replace(/\//g, exports.constants.slash);
    str = str.replace(/\\/g, exports.constants.backslash);
    str = str.replace(/\./g, exports.constants.dot);
    str = str.replace(/ /g, exports.constants.space);
    str = str.replace(/"/g, exports.constants.doubleQuotes);
    str = str.replace(/\*/g, exports.constants.star);
    str = str.replace(/</g, exports.constants.lessThan);
    str = str.replace(/>/g, exports.constants.greaterThan);
    str = str.replace(/:/g, exports.constants.colon);
    str = str.replace(/\|/g, exports.constants.pipe);
    str = str.replace(/\?/g, exports.constants.questionMark);
    str = str.replace(/@/g, exports.constants.at);

    return str;
  };
exports.getMongoDbName = _getMongoDbName;

/**
 * Sanitize a mongo collection name. Find restrictions
 * on collections names here:
 *
 * http://docs.mongodb.org/manual/reference/limits/
 *
 * @param string
 *
 * @return string
 */
exports.getMongoCollectionName = function(str) {
    if (str === undefined ||
        str === null || str.length === 0) {
      return exports.constants.noCollection;
    }

    str = str.replace(/\$/g, exports.constants.dollarSign);

    if (/^system\.|^[^A-Za-z_]/.test(str)) {
      str = '_' + str;
    }
    
    return str;
  };

/**
 * Sanitize a mongo field name. Find restrictions
 * on collections names here:
 *
 * http://docs.mongodb.org/manual/reference/limits/
 *
 * @param string
 *
 * @return string
 */
exports.getMongoFieldName = function(str) {
    if (str === undefined ||
        str === null || str.length === 0) {
      return exports.constants.noCollection;
    }
    
    str = str.replace(/\$/g, exports.constants.dollarSign);
    str = str.replace(/\./g, exports.constants.dot);
    return str;
  };

/**
 * Given an flat object, return an URL-friendly query string.  Note
 * that for a given object, the return value may be.
 *  
 * @example
 * <pre>
 *    // returns 'color=red&size=large'
 *    _objectToQueryString({color: 'red', size: 'large'})
 * </pre>
 *
 * @param {Object} A flat object containing keys for a query string.
 * 
 * @returns {string} An URL-friendly query string.
 */
exports.objectToQueryString = function(obj) {
    var str = [];
    for (var key in obj) {
      str.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
    }    
    return str.join('&');
  };

/**
 * Take an email address and turn it into a mongo-friendly
 * database name
 *
 * @param string
 *
 * @return string
 */
exports.ensureDbName = function(email) {
    if (!email) {
      email = nconf.get('email');
    }
    return _getMongoDbName(email);
  };

