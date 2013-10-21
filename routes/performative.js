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

            _verify(req.body.access_token, req.body.email).
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
     * Match the token against the agent and the registered 
     * client. If they exist, return a promise
     *
     * @param string
     * @param string
     *
     * @return promise
     */
    var _verify = function(token, email) {
        var agent = new agentSchema(dbName);
        console.log('dbName');
        console.log(dbName);

        var deferred = q.defer();
    
        var _token, _agent, _client;
    
        // Retrieve the token
        var tokenQuery = agent.tokenModel.findOne({ token: token });
    
        tokenQuery.exec().
            then(function(token) {
                _token = token;
                var agentQuery = agent.agentModel.findOne({ _id: _token.agentId });
                return agentQuery.exec();
              }).
            // User
            then(function(agent) {
                _agent = agent;
                var clientQuery = agent.clientModel.findOne({ _id: _token.clientId });
                return clientQuery.exec();
              }).
            // Client
            then(function(client) {
                _client = client;
    
                var verified = {
                    dbName: utils.getMongoDbName(_agent.email),
                    collectionName: utils.getMongoCollectionName(_client.name),
                    admin: _agent.admin,
                  };
    
                // Admins may operate on DBs not their own
                if (email && verified.admin) {
                  verified.dbName = utils.getMongoDbName(email);
                  deferred.resolve(verified);
                }
                else if (email && email !== _agent.email && !verified.admin) {
                  deferred.reject('You are not permitted to access that resource');
                }
                else {
                  deferred.resolve(verified);
                }
              });
   
        return deferred.promise;
      };
    exports.verify = _verify;

    return exports;
  };
