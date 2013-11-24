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
    var agentDb = new agentSchema(agent.email);

    if (message.conversationId) {
      agentDb.conversationModel.findOne({ conversationId: message.conversationId },
          function(err, conversation) {
                if (err) {
                  deferred.reject(err);
                }
                else if (!conversation) {
                  deferred.reject('Conversation: ' + message.conversationId + ' does not exist'); 
                }
                else {
                  deferred.resolve(conversation);
                }
            });
    }
    else {
      var conversation = new agentDb.conversationModel({
            type: type,
            role: role,
            conversationId: message.sender + ':' + Date.now().toString(),
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
    return deferred.promise;
};

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
