'use strict';

var q = require('q'),
    http = require('http'),
    base64url = require('base64url'),
    crypto = require('crypto'),
    agentSchema = require('../schemata/agent'),
    geboSchema = require('../schemata/gebo'),
    utils = require('../lib/utils'),
    nconf = require('nconf'),
    fs = require('fs');

module.exports = function(email) {

    nconf.argv().env().file({ file: 'local.json' });

    // JWT header
    var HEADER = {
            alg: 'RS256',
            typ: 'JWT',
        };

    // Turn the email into a mongo-friend database name
    var dbName = utils.ensureDbName(email);

    /**
     * Data returned upon token verification
     */
    var _data = {};
    exports.data = function() { return _data; };

    /**
     *  This response type must be passed to the authorization endpoint using
     *  the implicit grant flow (4.2.1 of RFC 6749).
     */
    var RESPONSE_TYPE = 'token';
    
    /**
     * Communication endpoints for the agent who
     * grants the token 
     */
    var _friend = {};// {
//            uri: null,
//            clientId: null,
//            redirectUri: null,
//            authorization: null,
//            request: null,
//            verification: null,
//        };
    
    /**
     * set the configuration options
     */
//    exports.setParams = function(config) {
//        _friend = config;
//      };
    
    /**
     * Load a friend's profile from the database
     *
     * @param string
     *
     * @return Object
     */
    exports.loadFriend = function(email) {
        var agent = new agentSchema(dbName);
        var deferred = q.defer();

        agent.friendModel.findOne({ email: email }, function(err, friend) {
            if (err) {
              deferred.reject(err);
            }
            else {
              _friend = friend;
              deferred.resolve(_friend);
            }
          });

        return deferred.promise;
      };

    /**
     * Get the OAuth2-relevant handshake info
     *
     * @param string
     *
     * @return Object
     */
    exports.getParams = function() {

        if (Object.keys(_friend).length === 0) {
          return null;
        }

        var redirect = nconf.get('domain') + ':' + nconf.get('port') + nconf.get('oauth2callback');
        
        return {
            response_type: RESPONSE_TYPE,
            client_id: utils.getMongoDbName(dbName),
            redirect_uri: redirect,
        };
      };
    
    /**
     * Get the access token associated with the
     * given email
     *
     * @param string
     *
     * @return Promise
     */
    exports.get = function(email) {
        var agent = new agentSchema(dbName);
        var deferred = q.defer();

        agent.friendModel.findOne({ email: email }, function(err, friend) {
                if (err) {
                  deferred.reject(err);
                }
                else if (!friend) {
                  deferred.resolve(null);
                }
                else {
                  deferred.resolve(friend.myToken);
                }
            });
  
        return deferred.promise;
      };
//    exports.get = _get;
            
    /**
     * Store the access token associated with the
     * endpoint configured above
     *
     * @param string
     * @param string
     *
     * @return promise
     */
    exports.set = function(email, accessToken) {
        var agent = new agentSchema(dbName);
        var deferred = q.defer();

        agent.friendModel.findOne({ email: email }, function(err, friend) {
                if (err) {
                  deferred.reject(err);
                }
                else if (!friend) {
                  deferred.reject('No such friend: ' + email);
                }
                else {
                  friend.myToken = accessToken;
                  friend.save(function(err, savedFriend) {
                    if (err) {
                      deferred.reject(err);
                    }
                    else {
                      deferred.resolve();
                    }
                  });
                }
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
//    exports.verify = function(token) {
//        var deferred = q.defer();
//
//        var options = {
//                host: _friend.uri,
//                path: _friend.verification + '?access_token=' + token,
//                method: 'GET'
//              };
//        var req = http.get(options, function(res) {
//                        res.setEncoding('utf8');
//                        res.on('data', function(data) {
//                            _data = JSON.parse(data);
//                            deferred.resolve(_data);
//                          });
//                      })
//                    .on('error', function(err){
//                        deferred.reject(err);
//                      });
//
//        return deferred.promise;
//      };

    /**
     * Request a token
     *
     * @param string
     * @param string
     * @param string
     *
     * @return promise
     */
    exports.getTokenWithJwt = function(uri, path, scope) {
        var deferred = q.defer();

        // Make the claim 
        var claim = {
                iss: nconf.get('email'),
                scope: scope,
                aud: uri + path,
                exp: new Date()/1000 + 3600*1000,
                iat: new Date()/1000, 
            };

        var jwt = _makeJwt(claim, HEADER);

        var params = {
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwt,
            };

        // Make the request
        var options = {
                host: uri,
                path: path,
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
     * makeJwt
     *
     * @param Object
     * @param Object
     *
     * @return string
     */
    var _makeJwt = function(header, claim) {
        var jwt = base64url(JSON.stringify(header)) + '.';
        jwt += base64url(JSON.stringify(claim));

        // Sign the request
        var pem = fs.readFileSync(__dirname + '/../cert/key.pem');
        var key = pem.toString('ascii');

        var sign = crypto.createSign('sha256WithRSAEncryption');

        sign.update(new Buffer(jwt, 'base64'));
        var signature = sign.sign(key);

        jwt += '.' + base64url(signature);

        return jwt;
      };
    exports.makeJwt = _makeJwt;

    /**
     * API
     */
    return exports;

  };

