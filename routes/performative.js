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
    
    return exports;
  };


