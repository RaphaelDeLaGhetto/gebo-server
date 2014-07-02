'use strict';
var q = require('q');

module.exports = function() {

    exports.someAction = function() {
        var deferred = q.defer();
        deferred.resolve('Hi, guy!');
        return deferred.promise;
      };

    exports.theAnswerToLifeTheUniverseAndEverything = function() {
        var deferred = q.defer();
        deferred.resolve(42);
        return deferred.promise;
      };

    return exports;
  };
