'use strict';

var passport = require('passport'),
    nconf = require('nconf'),
    utils = require('../lib/utils'),
    https = require('https'),
    geboSchema = require('../schemata/gebo'),
    agentSchema = require('../schemata/agent'),
    extend = require('extend'),
    conversations = require('../conversations'),
    q = require('q');

/**
 * All communication is carried out using the 
 * gebo as a proxy. This allows agents to carry
 * out conversations. When one agent wants to send
 * a message to another agent (citizen or foreign),
 * that message travels this route first.
 */
exports.send = [
    function(req, res, next) {
        if (req.user) {
          return next();
        }
        passport.authenticate(['bearer'], { session: false })(req, res, next);
    },
    _sendMessageHandler,
  ];

/**
 * Handles an agent's outgoing messages
 */
var _sendMessageHandler = function(req, res, done) { 
    var message = req.body,
        agent = req.user;

    utils.getRole(message, false).
        then(function(role) {
            conversations[message.performative][role](message, agent).
                then(function(conversation) {
                    var gebo = nconf.get('domain');
                    if (message.gebo) {
                      gebo = message.gebo;
                    }
      
                    utils.makeRequest(gebo, '/receive', message).
                        then(function(data) {
                            res.send(200, conversation);
                            done();
                          }).
                        catch(function(err) {
                            res.send(500, err);
                            done();
                          });
                  }).
                catch(function(err) {
                    res.send(500, err);
                    done();
                  });
          }).
        catch(function(err) {
            res.send(500, err);
            done();
          });
   };
exports.sendMessageHandler = _sendMessageHandler; 

/**
 * For incoming messages
 */
exports.receive = function(req, res, done) { 
    var message = req.body;

    utils.getRole(message, true).
        then(function(role) {
            conversations[message.performative][role](message, { email: message.receiver }).
                then(function(conversation) {
                    res.send(200, conversation);
                    done();
                  }).
                catch(function(err) {
                    res.send(500, err);
                    done();
                  });
          }).
        catch(function(err) {
            res.send(500, err);
            done();
          });
  };
