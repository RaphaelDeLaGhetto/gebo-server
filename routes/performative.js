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
    
        gebo.tokenModel.findOne({ string: tokenStr }).exec().
            then(function(token) {
                return gebo.registrantModel.findOne({ _id: token.registrantId }).exec();        
              }).
            then(function(registrant) {
                var agent = new agentSchema(registrant.email);
                return agent.friendModel.findOne({ email: friendEmail }).exec();
              }).
            then(function(friend) {
                console.log(friend.hisPermissions);
                console.log(resourceEmail);
                // Search the array for requested resource.
                // There's got to be a better way to do this...
                var found = false;
                for (var i = 0; i < friend.hisPermissions.length; i++) {
                  if (friend.hisPermissions[i].email === resourceEmail) {
                    deferred.resolve(friend.hisPermissions[i].email);
                    found = true;
                    break;
                  }
                }
                if (!found) {
                  deferred.reject('You don\'t have access to that resource');
                }
              });
    
//                var verified = {
//                    dbName: utils.getMongoDbName(_agent.email),
//                    collectionName: utils.getMongoCollectionName(_client.name),
//                    admin: _agent.admin,
//                  };
//    
//                // Admins may operate on DBs not their own
//                if (email && verified.admin) {
//                  verified.dbName = utils.getMongoDbName(email);
//                  deferred.resolve(verified);
//                }
//                else if (email && email !== _agent.email && !verified.admin) {
//                  deferred.reject('You are not permitted to access that resource');
//                }
//                else {
//                  deferred.resolve(verified);
//                }
//              });
   
        return deferred.promise;
      };
    exports.verify = _verify;

    return exports;
  };
