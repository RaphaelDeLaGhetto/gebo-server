'use strict';

var passport = require('passport'),
    generalUtils = require('../lib/utils'),
    conversationUtils = require('../conversations/utils'),
    https = require('https'),
    geboSchema = require('../schemata/gebo'),
    agentSchema = require('../schemata/agent'),
    extend = require('extend'),
    conversations = require('../conversations'),
    q = require('q');

/**
 * Handles an agent's outgoing messages
 */
var _sendMessageHandler = function(req, res, done) { 
    var message = req.body,
        agent = req.user;

    console.log('_sendMessageHandler');
    console.log('agent');
    console.log(agent);
    console.log('message');
    console.log(message);

    conversationUtils.loadConversation(message, agent).
        then(function(conversation) {

            // If this is new conversation, the message will
            // not have a conversationId
            if (!message.conversationId) {
              message.conversationId = conversation.conversationId;
            }

            conversations[conversation.type][conversation.role](message, agent).
                then(function(conversation) {
                    console.log('conversation.gebo');
                    console.log(conversation.gebo);
                    conversationUtils.postMessage(conversation.gebo, '/receive', message).
                        then(function(data) {
                            console.log('data');
                            console.log(data);
                            res.send(200, conversation);
                            done();
                          }).
                        catch(function(err) {
                            console.log('err');
                            console.log(err);
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

    // _sendMessageHandler takes a callback for unit testing purposes.
    // passport.authenticate's next() callback screws everything up
    // when the server runs for real. This step, though goofy looking,
    // circumvents that issue.
    function(req, res, next) {
        _sendMessageHandler(req, res, function(){});
    },
  ];

/**
 * Handle incoming messages
 */
var _receiveMessageHandler = function(req, res, done) { 
    console.log('receive');
    var message = req.body;

    console.log('message');
    console.log(message);
    conversationUtils.loadConversation(message, { email: message.receiver }).
        then(function(conversation) {
//            conversation.db.close();

            // If this is new conversation, the message will
            // not have a conversationId
            if (!message.conversationId) {
              message.conversationId = conversation.conversationId;
            }

            conversations[conversation.type][conversation.role](message, { email: message.receiver }).
                then(function(conversation) {
                    console.log('conversation');
                    console.log(conversation);
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
exports.receiveMessageHandler = _receiveMessageHandler;

/**
 * _receiveMessageHandler takes a callback for unit testing purposes.
 * Routing also, apparently, passes a callback, which screws everything up
 * when the server runs for real. This step, though goofy looking,
 * circumvents that issue.
 */
exports.receive = function(req, res, next) {
    _receiveMessageHandler(req, res, function(){});
  };

