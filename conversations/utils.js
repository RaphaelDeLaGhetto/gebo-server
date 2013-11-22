'use strict';

var agentSchema = require('../schemata/agent'),
    q = require('q');

/**
 * Retrieve the conversation, if it exists
 *
 * NOTE: the database connections are not closed.
 * That is left to the caller.
 *
 * @param string
 * @param role
 */
exports.loadConversation = function(message, type, role) {
	console.log('loadConversation');
	console.log(message);

    var deferred = q.defer();
    var agentDb = new agentSchema(message.receiver);

	agentDb.conversationModel.find({}, function(err, conversations) {
		console.log('all conversations');
		console.log(conversations);
	  });

    if (message.conversationId) {
      agentDb.conversationModel.findOne({ conversationId: message.conversationId },
          function(err, conversation) {
			  console.log('retrieve');
			  console.log(conversation);
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
			console.log('conversation.save');
			console.log(conversation);
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


