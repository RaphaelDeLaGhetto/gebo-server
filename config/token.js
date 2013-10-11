'use strict';

var q = require('q'),
    http = require('http'),
    base64url = require('base64url'),
    crypto = require('crypto'),
    fs = require('fs');

module.exports = function(dbName) {

    /**
     * Data returned upon token verification
     */
    var _data = {};
    exports.data = function() { return _data; };

    /**
     * Set the database name, if not set already 
     */
    if (!dbName) {
      var nconf = require('nconf');
      nconf.argv().env().file({ file: 'local.json' });
      dbName = nconf.get('email');
    }

    /**
     *  This response type must be passed to the authorization endpoint using
     *  the implicit grant flow (4.2.1 of RFC 6749).
     */
    var RESPONSE_TYPE = 'token';
    
    /**
     * Communication endpoints for the agent who
     * grants the token 
     */
    var _agent = {
            uri: null,
            clientId: null,
            redirectUri: null,
            authorization: null,
            request: null,
            verification: null,
            scopes: []
        };
    
    /**
     * set the configuration options
     */
    exports.setParams = function(config) {
        _agent = config;
      };
    
    /**
     * Return select parameters for this token
     *
     * @return Object
     */
    exports.getParams = function() {
        var requiredAndMissing = [];
    
        Object.keys(_agent).forEach(function(key) {
                if (!_agent[key]) {
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
            client_id: _agent.clientId,
            redirect_uri: _agent.redirectUri,
            scope: _agent.scopes.join(' '),
        };
      };
    
    /**
     * Get the agent collection associated with the
     * given agent name
     *
     * @return Promise
     */
    var _get = function() {
        var db = require('./dbschema')(dbName);

        var deferred = q.defer();

        var query = db.agentModel.findOne({
                clientId: _agent.clientId,
                verification: _agent.verification });
        query.exec().
                then(function(agent) {
                      deferred.resolve(agent);
                  });
  
        return deferred.promise;
      };
    exports.get = _get;
            
    /**
     * Store the access token associated with the
     * endpoint configured above
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
                host: _agent.uri,
                path: _agent.verification + '?access_token=' + token,
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
     * Request a token
     *
     * @return promise
     */
    exports.getTokenWithJwt = function() {
        var deferred = q.defer();
        var jwt = '';

        // Make the header
        var header = {
                alg: 'RS256',
                typ: 'JWT',
            };
        jwt += base64url(JSON.stringify(header)) + '.';

        // Make the claim 
        var claim = {
                iss: 'some@email.com',
                scope: _agent.request,
                aud: _agent.authorization,
                exp: new Date()/1000 + 3600*1000,
                iat: new Date()/1000, 
            };
        jwt += base64url(JSON.stringify(claim));

        // Sign the request
        var pem = fs.readFileSync(__dirname + '/../cert/key.pem');
        var key = pem.toString('ascii');

        var sign = crypto.createSign('sha256WithRSAEncryption');
        sign.update(new Buffer(jwt, 'base64'));
        var signature = sign.sign(key);

        jwt += '.' + base64url(signature);

        var params = {
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwt,
            };

        // Make the request
        var options = {
                host: _agent.uri,
                path: _agent.authorization,
                method: 'POST'
              };
        var req = http.request(options, function(res) {
                        res.setEncoding('utf8');
                        res.on('data', function(token) {
                            deferred.resolve(token);
                          });
                      }).
                    on('error', function(err){
                        deferred.reject(err);
                      });

        req.write(params);
        req.end();

        return deferred.promise;
      };

    /**
     * API
     */
    return exports;

  };

