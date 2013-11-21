'use strict';

var agentSchema = require('../schemata/agent'),
    q = require('q');

/**
 * Retrieve the conversation, if it exists
 *
 * @param string
 * @param role
 */
exports.loadConversation = function(message, type, role) {
    var deferred = q.defer();
    var agentDb = new agentSchema(message.receiver);
    if (message.conversationId) {
      agentDb.conversationModel.findOne({ conversationId: message.conversationId },
          function(err, conversation) {
              agentDb.connection.db.close();
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
      deferred.resolve(conversation);
    }
    return deferred.promise;
};


