'use strict';

var passport = require('passport'),
    generalUtils = require('../lib/utils'),
    conversationUtils = require('../conversations/utils'),
    https = require('https'),
    extend = require('extend'),
    conversations = require('../conversations'),
    q = require('q'),
    nconf = require('nconf'),
    winston = require('winston');

nconf.file({ file: './gebo.json' });
var logLevel = nconf.get('logLevel');
 
var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({ colorize: true }) ] });

/**
 * Handles an agent's outgoing messages
 */
var _sendMessageHandler = function(req, res, done) { 
    var message = req.body,
        agent = req.user;

    if (logLevel === 'trace') logger.info('_sendMessageHandler');
    if (logLevel === 'trace') logger.info('agent',  JSON.stringify(agent, null, 2));
    if (logLevel === 'trace') logger.info('message', JSON.stringify(message, null, 2));

    conversationUtils.loadConversation(message, agent).
        then(function(conversation) {

            // If this is new conversation, the message will
            // not have a conversationId
            if (!message.conversationId) {
              message.conversationId = conversation.conversationId;
            }

            conversations[conversation.type][conversation.role](message, agent).
                then(function(conversation) {
                    if (logLevel === 'trace') logger.info('conversation.gebo', conversation.gebo);
                    conversationUtils.postMessage(conversation.gebo, '/receive', message).
                        then(function(data) {
                            if (logLevel === 'trace') logger.info('data', data);
                            res.send(200, conversation);
                            done();
                          }).
                        catch(function(err) {
                            if (logLevel === 'trace') logger.error(err);
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
    if (logLevel === 'trace') logger.info('receive');
    var message = req.body;

    if (logLevel === 'trace') logger.info('message', JSON.stringify(message, null, 2));
    conversationUtils.loadConversation(message, { email: message.receiver }).
        then(function(conversation) {

            // If this is new conversation, the message will
            // not have a conversationId
            if (!message.conversationId) {
              message.conversationId = conversation.conversationId;
            }

            conversations[conversation.type][conversation.role](message, { email: message.receiver }).
                then(function(conversation) {
                    if (logLevel === 'trace') logger.info('conversation', JSON.stringify(conversation, null, 2));
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

