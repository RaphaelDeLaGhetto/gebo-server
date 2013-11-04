'use strict';

var passport = require('passport'),
    nconf = require('nconf'),
    utils = require('../lib/utils'),
    geboSchema = require('../schemata/gebo'),
    agentSchema = require('../schemata/agent'),
    extend = require('extend'),
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

            // There might be files attached to the request
            var params = req.body;
            extend(true, params, req.files);

            console.log('request');
            console.log(req.body);
            console.log(req.user);
            console.log(req.authInfo);
            console.log('params');
            console.log(params);

            var action = require('../config/action')(dbName);
            //action[req.body.action](req.user, req.body).
            action[req.body.action](req.user, params).
                then(function(data) {
                    res.send(data);
                  }).
                catch(function(err) {
                    console.log(err);
                    res.send(404, err);
                  });
          }
      ];

    /**
     * Determine what permissions an agent has on a
     * given object
     *
     * @param Object
     * @param Object
     *
     * @return promise
     */
    function _verify(agent, params) {
        var deferred = q.defer();

	var verified = {
                collectionName: utils.getMongoCollectionName(params.collectionName),
                admin: agent.admin,
                dbName: utils.getMongoDbName(params.dbName)
            };

        if (!verified.dbName) {
          verified.dbName = utils.getMongoDbName(agent.email);
        }

        if (utils.getMongoDbName(agent.email) !== verified.dbName && !verified.admin) {
          var agentDb = new agentSchema(verified.dbName);
  
          agentDb.friendModel.findOne({ email: agent.email}, function(err, friend) {
                if (err) {
                  deferred.reject(err);
                }
                if (!friend) {
                  deferred.reject('I don\'t know you');
                }
                else { 
                  // Search the array for requested resource
                  var index = utils.getIndexOfObject(friend.hisPermissions, 'email', verified.collectionName);

                  if (index > -1) {
                    verified.read = friend.hisPermissions[index].read;
                    verified.write = friend.hisPermissions[index].write;
                    verified.execute = friend.hisPermissions[index].execute;
                    deferred.resolve(verified);
                  }
                  else {
                    deferred.reject('You don\'t have access to that resource');
                  }
                }
                agentDb.connection.db.close();
              });
        }
        // This agent is requesting access to his own resources
        else {
          verified.read = true;
          verified.write = true;
          verified.execute = true;
          deferred.resolve(verified);
        }

        return deferred.promise;
      };
    exports.verify = _verify;
    
    return exports;
  };


