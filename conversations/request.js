'use strict';

var agentSchema = require('../schemata/agent'),
    q = require('q');

module.exports = function() {

    /**
     * The client-side request conversation
     *
     * @param Object
     */
    exports.client = function(message) {
        var deferred = q.defer();
        deferred.resolve();
        return deferred.promise;
      };

    /**
     * The server-side request conversation
     *
     * @param Object
     */
    exports.server = function(message) {
        var deferred = q.defer();
        deferred.resolve();
        return deferred.promise;
      };

    return exports;
};
