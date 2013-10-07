'use strict';

var q = require('q'),
    http = require('http'),
    dbSchema = require('./dbschema');

module.exports = function(dbName) {

    /**
     * Data returned upon token verification
     */
    var _data = {};
    exports.data = function() { return _data; };

    /**
     * Start up the database connection
     */
    if (!dbName) {
      var nconf = require('nconf');
      nconf.argv().env().file({ file: 'local.json' });
      dbName = nconf.get('name');
    }

    /**
     *  This response type must be passed to the authorization endpoint using
     *  the implicit grant flow (4.2.1 of RFC 6749).
     */
    var RESPONSE_TYPE = 'token';
    
     
    /**
     * Default config fields
     */
    var _config = {
            agentUri: null,
            clientId: null,
            redirectUri: null,
            authorizationEndpoint: null,
            requestEndpoint: null,
            verificationEndpoint: null,
            scopes: []
        };
    
    /**
     * set the configuration options
     */
    exports.setParams = function(config) {
        _config = config;
      };
    
    /**
     * Return select parameters for this token
     *
     * @return Object
     */
    exports.getParams = function() {
        var requiredAndMissing = [];
    
        Object.keys(_config).forEach(function(key) {
                if (!_config[key]) {
                  requiredAndMissing.push(key);
                }
              });
    
        if (requiredAndMissing.length) {
          throw new Error('Token is insufficiently configured. Please ' +
                          'configure the following options: ' +
                          requiredAndMissing.join(', '));
        }
    
        return {
            response_type: RESPONSE_TYPE,
            client_id: _config.clientId,
            redirect_uri: _config.redirectUri,
            scope: _config.scopes.join(' '),
        };
      };
    
    /**
     * Get the agent collection associated with the
     * given agent name
     *
     * @return Promise
     */
    var _get = function() {
        var db = new dbSchema(dbName);
        var deferred = q.defer();

        var query = db.agentModel.findOne({
                clientId: _config.clientId,
                verificationEndpoint: _config.verificationEndpoint });
        query.exec().
                then(function(agent) {
                      deferred.resolve(agent);
                  });
  
        return deferred.promise;
      };
    exports.get = _get;
            
    /**
     * Store the access token associated with the
     * endpoint configured abov
     *
     * @param string
     *
     * @return promise
     */
    exports.set = function(accessToken) {
        var deferred = q.defer();

        _get().
            then(function(agent) {
                agent.token = accessToken;
                agent.save(function(err) {
                    if (err) {
                      deferred.reject(err);
                    }
                    else {
                      deferred.resolve();
                    }
                  });
              });
        return deferred.promise;
      };

    /**
     * Remove token from local storage and clear
     * authentication data
     */
    exports.clear = function() {
        var deferred = q.defer();

        _get().
            then(function(agent) {
                agent.token = null;
                agent.save(function(err) {
                    if (err) {
                      deferred.reject(err);
                    }
                    else {
                      deferred.resolve();
                    }
                  });
              });
        return deferred.promise;
      };

    /**
     * Verify that the token stored by this agent
     * is still valid
     *
     * @param string
     *
     * @return promise
     */
    exports.verify = function(token) {
        var deferred = q.defer();

        var options = {
                host: _config.agentUri,
                path: _config.verificationEndpoint + '?access_token=' + token,
                method: 'GET'
              };
        var req = http.get(options, function(res) {
                        res.setEncoding('utf8');
                        res.on('data', function(data) {
                            _data = JSON.parse(data);
                            deferred.resolve(_data);
                          });
                      })
                    .on('error', function(err){
                        deferred.reject(err);
                      });

        return deferred.promise;
      };

    /**
     * API
     */
    return exports;

  };

