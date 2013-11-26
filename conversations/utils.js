'use strict';

var agentSchema = require('../schemata/agent'),
    q = require('q');

/**
 * Retrieve the conversation, if it exists
 *
 * NOTE: the database connections are not closed.
 * That is left to the caller.
 *
 * @param Object
 * @param Object
 * @param string
 * @param string
 *
 * @return conversationModel
 */
exports.loadConversation = function(message, agent, type, role) {

    var deferred = q.defer();

    if (message.conversationId) {
      var agentDb = new agentSchema(agent.email);
      agentDb.conversationModel.findOne({ conversationId: message.conversationId },
          function(err, conversation) {
                if (err) {
                  deferred.reject(err);
                }
                else if (!conversation) {
                  agentDb.connection.db.close();
                  _startNewConversation(message, agent, type, role).
                    then(function(conversation) {
                        deferred.resolve(conversation);
                      }).
                    catch(function(err) {
                        deferred.reject(err);
                      });
                }
                else {
                  deferred.resolve(conversation);
                }
            });
    }
    else {
      _startNewConversation(message, agent, type, role).
        then(function(conversation) {
            deferred.resolve(conversation);
          }).
        catch(function(err) {
            deferred.reject(err);
          });
    }
    return deferred.promise;
  };

/**
 * Start a new conversation
 *
 * NOTE: startNewConversation doesn't close the database connection.
 *
 * @param Object
 * @param Object
 * @param string
 * @param string
 *
 * @return promise
 */
var _startNewConversation = function(message, agent, type, role) {
    var deferred = q.defer();

    if (message.performative === type) {
      var conversationId = message.conversationId;
      if (!conversationId) {
        conversationId = message.sender + ':' + Date.now().toString();
      }

      var agentDb = new agentSchema(agent.email);
      var conversation = new agentDb.conversationModel({
              type: type,
              role: role,
              conversationId: conversationId,
          });

      conversation.save(function(err) {
              if (err) {
                deferred.resolve(err);
              }
              else {
                deferred.resolve(conversation);
              }
            });
    }
    else {
      deferred.reject('There\'s no ' + type + ' conversation for this ' + message.performative);
    }
    return deferred.promise;
  };
exports.startNewConversation = _startNewConversation;

/**
 * getFirstUnfulfilledSocialCommitmentIndex
 *
 * @param array
 * @param string
 *
 * @return int
 */
exports.getFirstUnfulfilledSocialCommitmentIndex = function(socialCommitments, performative) {
    for (var i = 0; i < socialCommitments.length; i++) {
      if (socialCommitments[i].performative === performative &&
          socialCommitments[i].fulfilled === null) {
        return i;
      }
    }
    return -1;
  };
