'use strict';

var passport = require('passport'),
    nconf = require('nconf'),
    utils = require('../lib/utils'),
    dbSchema = require('../config/dbschema'),
    q = require('q');

module.exports = function(dbName) {

    if (!dbName) {
      nconf.argv().env().file({ file: 'local.json' });
      dbName = nconf.get('name');
    }


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
        var db = new dbSchema(dbName);

        var deferred = q.defer();
    
        var _token, _agent, _client;
    
        // Retrieve the token
        var tokenQuery = db.tokenModel.findOne({ token: token });
    
        tokenQuery.exec().
            then(function(token) {
                _token = token;
                var agentQuery = db.agentModel.findOne({ _id: _token.agentId });
                return agentQuery.exec();
              }).
            // User
            then(function(agent) {
                _agent = agent;
                var clientQuery = db.clientModel.findOne({ _id: _token.clientId });
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
