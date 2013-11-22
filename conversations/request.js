'use strict';

var agentSchema = require('../schemata/agent'),
    utils = require('./utils'),
    generalUtils = require('../lib/utils'),
    q = require('q');

module.exports = function() {

    /**
     * The client-side request conversation
     *
     * @param Object
     */
    exports.client = function(message) {
        var deferred = q.defer();

		console.log('exports.client');
		console.log(message);

        utils.loadConversation(message, 'request', 'client').
            then(function(conversation) {
				console.log('conversation loaded');
				console.log(conversation);
                switch(message.performative) {
                    case 'request':
                        // Creditor: forms sc to reply request/action
                        conversation.socialCommitments.push({
                                performative: 'reply request',
                                action: message.action,
                                message: message,
                                creditor: message.sender,
                                debtor: message.receiver,                                
                                created: Date.now(),
                        });
                        break;
                    case 'not-understood request':
                    case 'refuse request':
                    case 'timeout request':
                        // Fulfils sc to reply request/action
                        var index = generalUtils.getIndexOfObject(conversation.socialCommitments, 'performative', 'reply request');
                        console.log('\n-------------------- index');
                        console.log(index);
                        console.log(conversation.socialCommitments);
                        conversation.socialCommitments[index].fulfilled = Date.now();
                        break;
                    case 'agree request':
                        // Fulfils sc to reply request/action
                        // Creditor: Forms sc to perform action
                        break;
                    case 'cancel request':
                        // Fulfils sc to perform action
                        break;
                    case 'failure perform':
                        // Fulfils sc to perform action
                        break;
                    case 'propose discharge|perform':
                        // Fulfils sc to perform action
                        // Debtor: forms sc to reply propose discharge|perform|action
                        break;
                    case 'agree propose|discharge|perform':
                        // Fulfils sc to reply propose discharge|perform|action
                        break;
                }

                conversation.save(function(err) {
					conversation.db.close();
                    if (err) {
                      deferred.reject(err);
                    }
                    else {
                      deferred.resolve(conversation);
                    }
                  });
              }).
            catch(function(err) {
                deferred.reject(err);      
              });
        return deferred.promise;
      };

    /**
     * The server-side request conversation
     *
     * @param Object
     */
    exports.server = function(message) {
        var deferred = q.defer();
        deferred.resolve();
        return deferred.promise;
      };

    return exports;
};
