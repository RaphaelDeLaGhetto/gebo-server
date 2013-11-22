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
     * @param Object
     *
     * @return promise
     */
    exports.client = function(message, agent) {
        var deferred = q.defer();

        utils.loadConversation(message, agent, 'request', 'client').
            then(function(conversation) {
                switch(message.performative) {
                    case 'request':
                        // Form C: reply request|action
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
                        // Fulfil C: reply request|action
                        var index = utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'reply request');
                        conversation.socialCommitments[index].fulfilled = Date.now();
                        break;
                    case 'agree request':
                        // Fulfils C: reply request/action
                        // Form C: propose discharge|perform|action
                        var index = utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'reply request');
                        conversation.socialCommitments[index].fulfilled = Date.now();

                        conversation.socialCommitments.push({
                                performative: 'propose discharge|perform',
                                action: message.action,
                                message: message,
                                creditor: message.receiver,
                                debtor: message.sender,                                
                                created: Date.now(),
                          });
                        break;
                    case 'cancel request':
                    case 'failure perform':
                    case 'timeout perform':
                        // Fulfil C: propose discharge|perform|action
                        var index = utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'propose discharge|perform');
                        conversation.socialCommitments[index].fulfilled = Date.now();
                        break;
                    case 'propose discharge|perform':
                        // Fulfil C: propose discharge|perform|action
                        // Form D: reply propose|discharge|perform|action
                        var index = utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'propose discharge|perform');
                        conversation.socialCommitments[index].fulfilled = Date.now();

                        conversation.socialCommitments.push({
                                performative: 'reply propose|discharge|perform',
                                action: message.action,
                                message: message,
                                creditor: message.sender,
                                debtor: message.receiver,                                
                                created: Date.now(),
                          });
                        break;
                    case 'not-understood propose|discharge|perform':
                    case 'refuse propose|discharge|perform':
                    case 'timeout propose|discharge|perform':
                        // Fulfil D: reply propose|discharge|perform|action
                        // Form C: propose discharge|perform|action
                        var index = utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'reply propose|discharge|perform');
                        conversation.socialCommitments[index].fulfilled = Date.now();

                        conversation.socialCommitments.push({
                                performative: 'propose discharge|perform',
                                action: message.action,
                                message: message,
                                creditor: message.sender,
                                debtor: message.receiver,
                                created: Date.now(),
                          });
                        break;
                    case 'agree propose|discharge|perform':
                        // Fulfil D: reply propose|discharge|perform|action
                        var index = utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'reply propose|discharge|perform');
                        conversation.socialCommitments[index].fulfilled = Date.now();
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
     * @param Object
     *
     * @return promise
     */
    exports.server = function(message, agent) {
        var deferred = q.defer();
        utils.loadConversation(message, agent, 'request', 'server').
            then(function(conversation) {

                switch(message.performative) {
                    case 'request':
                        // Form D: reply request|action
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
                        // Fulfil D: reply request|action
                        var index = utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'reply request');
                        conversation.socialCommitments[index].fulfilled = Date.now();
                        break;
                    case 'agree request':
                        // Fulfils D: reply request/action
                        // Form D: propose discharge|perform|action
                        var index = utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'reply request');
                        conversation.socialCommitments[index].fulfilled = Date.now();

                        conversation.socialCommitments.push({
                                performative: 'propose discharge|perform',
                                action: message.action,
                                message: message,
                                creditor: message.receiver,
                                debtor: message.sender,                                
                                created: Date.now(),
                          });

                        conversation.socialCommitments.push({
                                performative: 'perform',
                                action: message.action,
                                message: message,
                                creditor: message.receiver,
                                debtor: message.sender,                                
                                created: Date.now(),
                          });
                        break;
                    case 'cancel request':
                    case 'failure perform':
                    case 'timeout perform':
                        // Fulfil D: propose discharge|perform|action
                        // Fulfil D: perform action
                        var index = utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'propose discharge|perform');
                        conversation.socialCommitments[index].fulfilled = Date.now();
                        index = utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'perform');
                        conversation.socialCommitments[index].fulfilled = Date.now();
                        break;
                    case 'propose discharge|perform':
                        // Fulfil D: propose discharge|perform|action
                        // Form C: reply propose|discharge|perform|action
                        var index = utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'propose discharge|perform');
                        conversation.socialCommitments[index].fulfilled = Date.now();

                        conversation.socialCommitments.push({
                                performative: 'reply propose|discharge|perform',
                                action: message.action,
                                message: message,
                                creditor: message.sender,
                                debtor: message.receiver,                                
                                created: Date.now(),
                          });
                        break;
                    case 'not-understood propose|discharge|perform':
                    case 'refuse propose|discharge|perform':
                    case 'timeout propose|discharge|perform':
                        // Fulfil C: reply propose|discharge|perform|action
                        // Form D: propose discharge|perform|action
                        var index = utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'reply propose|discharge|perform');
                        conversation.socialCommitments[index].fulfilled = Date.now();

                        conversation.socialCommitments.push({
                                performative: 'propose discharge|perform',
                                action: message.action,
                                message: message,
                                creditor: message.sender,
                                debtor: message.receiver,
                                created: Date.now(),
                          });
                        break;
                    case 'agree propose|discharge|perform':
                        // Fulfil C: reply propose|discharge|perform|action
                        var index = utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'reply propose|discharge|perform');
                        conversation.socialCommitments[index].fulfilled = Date.now();
                        index = utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'perform');
                        conversation.socialCommitments[index].fulfilled = Date.now();
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

    return exports;
};
