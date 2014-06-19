'use strict';

module.exports = function() {

    exports.schemata = require('./schema')();

    return exports;
  }();
