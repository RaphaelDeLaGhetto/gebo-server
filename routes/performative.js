'use strict';

var passport = require('passport'),
    nconf = require('nconf'),
    utils = require('../lib/utils'),
    geboSchema = require('../schemata/gebo'),
    agentSchema = require('../schemata/agent'),
    q = require('q');

module.exports = function(email) {

    // Turn the email into a mongo-friend database name
    var dbName = utils.ensureDbName(email);

    /**
     * Receive a request for consideration
     */
    exports.request = [
        passport.authenticate('bearer', { session: false }),
        function(req, res) {
            console.log('request');
            console.log(req.body);
            console.log(req.user);
            console.log(req.authInfo);
            var action = require('../config/action')(dbName);

            // client_id is your friend's email address,
            // scope is the email of the requested resource
            _verify(req.body.access_token, req.body.client_id, req.body.scope).
                then(function(verified) {
                    return action[req.body.action](verified, req.body);
                  }).
                // Results of action
                then(function(data) {
                    res.send(data);
                  }).
                // Something blew up
                catch(function(err) {
                    console.log('err');
                    console.log(err);
                    res.send(404, err);
                  });
          }
      ];
    
    /**
     * Match the token against the registrant and the
     * friend.
     *
     * @param string
     * @param string
     *
     * @return promise
     */
    var _verify = function(tokenStr, friendEmail, resourceEmail) {
        var gebo = new geboSchema(dbName);

        var deferred = q.defer();
        var _registrant;
    
        gebo.tokenModel.findOne({ string: tokenStr }).exec().
            then(function(token) {
                if (!token) {
                  deferred.reject('The token provided is invalid');
                }
                else {
                  return gebo.registrantModel.findOne({ _id: token.registrantId }).exec();        
                }
              }).
            then(function(registrant) {
                if (!registrant) {
                  deferred.reject('That agent is not registered here');
                }
                else {
                  var agent = new agentSchema(registrant.email);
                  _registrant = registrant;
                  return agent.friendModel.findOne({ email: friendEmail }).exec();
                }
              }).
            then(function(friend) {
                if (!friend) {
                  deferred.reject('I don\'t know you');
                }
                else {
                    // Search the array for requested resource.
                    // There's got to be a better way to do this...
                    var found = false;
                    for (var i = 0; i < friend.hisPermissions.length; i++) {
                      if (friend.hisPermissions[i].email === resourceEmail) {
                        friend.hisPermissions[i].collectionName = utils.getMongoCollectionName(resourceEmail);
                        friend.hisPermissions[i].dbName = utils.getMongoDbName(_registrant.email);
                        friend.hisPermissions[i].admin = _registrant.admin;
                        deferred.resolve(friend.hisPermissions[i]);
                        found = true;
                        break;
                      }
                    }
                    if (!found) {
                      deferred.reject('You don\'t have access to that resource');
                    }
                }
              });
        return deferred.promise;
      };
    exports.verify = _verify;

    return exports;
  };


