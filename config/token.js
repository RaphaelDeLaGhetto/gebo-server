'use strict';

var q = require('q'),
    https = require('https'),
    base64url = require('base64url'),
    crypto = require('crypto'),
    agentSchema = require('../schemata/agent'),
//    geboSchema = require('../schemata/gebo'),
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
     *  This response type must be passed to the authorization endpoint using
     *  the implicit grant flow (4.2.1 of RFC 6749).
     */
    var RESPONSE_TYPE = 'token';
    
    
    /**
     * Load a friend's profile from the database
     *
     * @param string
     *
     * @return Object
     */
    var _getFriend = function(email) {
        var deferred = q.defer();

        var agentDb = new agentSchema(dbName);
        agentDb.friendModel.findOne({ email: email }, function(err, friend) {
            agentDb.connection.db.close();
            if (err) {
              deferred.reject(err);
            }
            else if (!friend) {
              deferred.reject('You are not friends with ' + email);
            }
            else {
              deferred.resolve(friend);
            }
          });

        return deferred.promise;
      };
    exports.getFriend = _getFriend;

    /**
     * Load a private key from the database
     *
     * @param string
     *
     * @return Object
     */
    var _getKey = function(email) {
        var deferred = q.defer();

        var agentDb = new agentSchema(dbName);
        agentDb.keyModel.findOne({ email: email }, function(err, key) {
            agentDb.connection.db.close();
            if (err) {
              deferred.reject(err);
            }
            else if (!key) {
              deferred.reject('You have not created a key for ' + email);
            }
            else {
              deferred.resolve(key.private);
            }
          });

        return deferred.promise;
      };
    exports.getKey = _getKey;

    /**
     * Request a token from a gebo with a JWT
     *
     * @param string
     * @param string
     * @param string
     *
     * @return promise
     */
    exports.get = function(friendEmail, scope, agentEmail) {
        var deferred = q.defer();

        _getFriend(friendEmail).
            then(function(friend) {

            if (!friend) {
              deferred.reject(friendEmail + ' is not your friend');
            }
            else {
              console.log('friend');
              console.log(friend);
  
              // Make the claim 
              var claim = {
                      iss: nconf.get('email'),
                      scope: scope,
                      aud: friend.gebo + friend.authorize,
                      exp: new Date()/1000 + 3600*1000,
                      iat: new Date()/1000, 
                      prn: agentEmail,
                  };
      
              var jwt = _makeJwt(HEADER, claim);
      
              var params = JSON.stringify({
                      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                      assertion: jwt,
                  });
      
              // https.request is pretty picky. Collect the
              // parameters it wants...
              var gebo = friend.gebo;
              var splitUri = gebo.split('https://'); 
              gebo = splitUri.pop();
              splitUri = gebo.split(':'); 
              var port = '443';
              if (splitUri.length > 1) {
                port = splitUri.pop();
                gebo = splitUri.pop();
              }

              // Make the request
              var options = {
                      host: gebo,
                      port: port,
                      path: friend.authorize,
                      method: 'POST',
                      rejectUnauthorized: false,
                      requestCert: true,
                      agent: false,
                      headers: { 'Content-Type': 'application/json',
      	        	         'Content-Length': Buffer.byteLength(params) }
                    };
      
              console.log('options');
              console.log(options);

              var req = https.request(options, function(res) {
                      var token;
                      res.setEncoding('utf8');
                      res.on('data', function(t) {
                              token = t;
                              console.log('token.token');
                              console.log(token);
                          });
                      res.on('end', function() {
                              console.log('end');
                              token = JSON.parse(token);
                              if (token.error) {
                                console.log('token.error_description');
                                console.log(token.error_description);
                                deferred.reject(token.error_description);
                              }
                              else {
                                deferred.resolve(token);
                              }
                          });
                  }).
                on('error', function(err){
                        console.log('err');
      			console.log(err);
                        deferred.reject(err);
                  });
      
              req.write(params);
              req.end();
            }
          }).
        catch(function(err) {
            deferred.reject(err);       
          });

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

        sign.update(jwt);
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

