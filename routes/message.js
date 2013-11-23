'use strict';

var passport = require('passport'),
    nconf = require('nconf'),
    utils = require('../lib/utils'),
    geboSchema = require('../schemata/gebo'),
    agentSchema = require('../schemata/agent'),
    extend = require('extend'),
    conversations = require('../conversations'),
    q = require('q');

//module.exports = function(email) {
//
//    // Turn the email into a mongo-friend database name
//    var dbName = utils.ensureDbName(email);
//    var action = require('../actions')(dbName);

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
    var _sendMessageHandler = function(req, res) { 

        var message = req.body,
            agent = req.user;

        /**
         * Is this message part of a new conversation,
         * or is it already in progress?
         */
        if (message.conversationId) {
          var agentDb = new agentSchema(req.user.email);
          agentDb.conversationModel.findOne({ conversationId: message.conversationId }, function(err, conversation) {
                conversationModel.connection.db.close();
                if (err) {
                  console.log('conversationModel error');
                  console.log(err);
                  res.send(500, err);
                }
                else if (!conversation) {
                  console.log(message.conversationId + ' not found');
                  res.send(404, message.conversationId + ' not found');
                }
                else {
                  conversations[conversation.type][conversation.role](message, agent).
                    then(function(conversation) {
                        res.send(200, conversation);
                      }).
                    catch(function(err) {
                        res.send(500, err);
                      });
                }
            });
        }
        else {
          // This is a new conversation
          var role;
          switch(message.performative) {
            case 'request':
                role = 'client';
                break;
          }
 
          conversations[message.performative][role](message, agent).
                then(function(conversation) {
                    console.log('conversation');
                    console.log(conversation);
                    res.send(200, conversation);
                  }).
                catch(function(err) {
                    res.send(500, err);
                  });
        }
      };
    exports.sendMessageHandler = _sendMessageHandler; 

    /**
     * For incoming messages
     */
    exports.receive = function(req, res) {
        var message = req.body,
        agent = req.user;

        /**
         * Is this message part of a new conversation,
         * or is it already in progress?
         */
        if (message.conversationId) {
          var agentDb = new agentSchema(req.user.email);
          agentDb.conversationModel.findOne({ conversationId: message.conversationId }, function(err, conversation) {
                conversationModel.connection.db.close();
                if (err) {
                  console.log('conversationModel error');
                  console.log(err);
                  res.send(500, err);
                }
                else if (!conversation) {
                  console.log(message.conversationId + ' not found');
                  res.send(404, message.conversationId + ' not found');
                }
                else {
                  conversations[conversation.type][conversation.role](message, { email: message.receiver }).
                    then(function(conversation) {
                        res.send(200, conversation);
                      }).
                    catch(function(err) {
                        res.send(500, err);
                      });
                }
            });
        }
        else {
          // This is a new conversation
          var role;
          switch(message.performative) {
            case 'request':
                role = 'server';
                break;
          }
 
          conversations[message.performative][role](message, { email: message.receiver }).
                then(function(conversation) {
                    res.send(200, conversation);
                  }).
                catch(function(err) {
                    res.send(500, err);
                  });
        }
      };

//    return exports;
//  };
