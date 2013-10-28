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

            // Convert email address to mongo-friendly DB
            // and collection strings
            req.user.dbName = utils.getMongoDbName(req.user.dbName);
            req.user.collectionName = utils.getMongoCollectionName(req.user.collectionName);

            action[req.body.action](req.user, req.body).
                then(function(data) {
                    res.send(data);
                  }).
                catch(function(err) {
                    console.log(err);
                    res.send(404, err);
                  });

          }
      ];
    
    return exports;
  };


