'use strict';

var agentSchema = require('../../schemata/agent'),
    request = require('../../conversations/request')(),
    utils = require('../../conversations/utils');

/**
 * Performative functions, because I need to keep
 * doing the same bloody thing over and over.
 */

function clientRequestAction() {
    return request.client({ receiver: 'dan@example.com',
                            sender: 'yanfen@example.com',
                            performative: 'request',
                            action: 'action',
                        });
  }

function serverReplyNotUnderstood(conversation) {
    return request.client({ receiver: 'yanfen@example.com',
                            sender: 'dan@example.com',
                            performative: 'not-understood request',
                            action: 'action',
                            conversationId: conversation.conversationId,
                        });
  }

function serverReplyRefuse(conversation) {
    return request.client({ receiver: 'yanfen@example.com',
                            sender: 'dan@example.com',
                            performative: 'refuse request',
                            action: 'action',
                            conversationId: conversation.conversationId,
                        });
  }

function serverReplyTimeout(conversation) {
    return request.client({ receiver: 'yanfen@example.com',
                            sender: 'dan@example.com',
                            performative: 'timeout request',
                            action: 'action',
                            conversationId: conversation.conversationId,
                        });
  }

function clientReplyRequestAction(conversation) {
    return request.client({ receiver: 'yanfen@example.com',
                            sender: 'dan@example.com',
                            performative: 'reply request',
                            action: 'action',
                            conversationId: conversation.conversationId,
                        });
  }


/**
 * client
 */
exports.client = {

    setUp: function(callback) {
        var agentDb = new agentSchema('dan@example.com');
        var conversation = new agentDb.conversationModel({
                type: 'request',
                role: 'client',
                conversationId: 'some conversation ID',
              });

        conversation.save(function(err) {
            if (err) {
              console.log(err);
            }
            agentDb.connection.db.close();
            callback();
          });
    },

    tearDown: function(callback) {
        var agentDb = new agentSchema('dan@example.com');
        agentDb.connection.on('open', function(err) {
            agentDb.connection.db.dropDatabase(function(err) {
                agentDb.connection.db.close();
                if (err) {
                  console.log(err)
                }
                callback();
              });
          });
    },

    'Load a conversation from the database if provided a conversationId': function(test) {
        test.expect(5);
        request.client({ receiver: 'dan@example.com', conversationId: 'some conversation ID' }).
            then(function(conversation) {
                test.equal(conversation.type, 'request');
                test.equal(conversation.role, 'client');
                test.equal(conversation.conversationId, 'some conversation ID');
                test.equal(conversation.socialCommitments.length, 0);
                test.equal(conversation.terminated, false);
                test.done();
            }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
              });
    },

    'Create a new conversation if no conversationId is provided': function(test) {
        test.expect(1);
        request.client({ receiver: 'dan@example.com',
                         conversationId: 'some non-existent conversation ID' }).
            then(function(conversation) {
                test.ok(false, 'Should not get here');
                test.done();
            }).
            catch(function(err) {
                test.equal(err, 'Conversation: some non-existent conversation ID does not exist');
                test.done();
              });
    },

    'Form \'C: reply request|action\' when sending a \'request action\'': function(test) {
        test.expect(8);
        clientRequestAction().
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(typeof conversation.socialCommitments[0].message, 'object');
                test.equal(conversation.socialCommitments[0].creditor, 'yanfen@example.com');
                test.equal(conversation.socialCommitments[0].debtor, 'dan@example.com');
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(conversation.socialCommitments[0].fulfilled, null);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Fulfil \'C: reply request|action\' when \'not-understood request|action\' is received': function(test) {
        test.expect(9);
        clientRequestAction().
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverReplyNotUnderstood(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(typeof conversation.socialCommitments[0].message, 'object');
                test.equal(conversation.socialCommitments[0].creditor, 'yanfen@example.com');
                test.equal(conversation.socialCommitments[0].debtor, 'dan@example.com');
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(!!conversation.socialCommitments[0].fulfilled, true);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Fulfil \'C: reply request|action\' when \'refuse request|action\' is received': function(test) {
        test.expect(9);
        clientRequestAction().
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverReplyRefuse(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(typeof conversation.socialCommitments[0].message, 'object');
                test.equal(conversation.socialCommitments[0].creditor, 'yanfen@example.com');
                test.equal(conversation.socialCommitments[0].debtor, 'dan@example.com');
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(!!conversation.socialCommitments[0].fulfilled, true);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Fulfil \'C: reply request|action\' when \'timeout request|action\' is received': function(test) {
        test.expect(9);
        clientRequestAction().
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverReplyTimeout(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(typeof conversation.socialCommitments[0].message, 'object');
                test.equal(conversation.socialCommitments[0].creditor, 'yanfen@example.com');
                test.equal(conversation.socialCommitments[0].debtor, 'dan@example.com');
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(!!conversation.socialCommitments[0].fulfilled, true);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Fulfil \'Client C: reply request|action\' and form \'C: propose discharge|perform|action\' when \'agree request|action\' is received': function(test) {
        test.done();
    }, 

    'Fulfil \'C: propose discharge|perform|action\' and form \'D: reply propose|discharge|perform|action\' when \'propose discharge|perform|action\' is received': function(test) {
        test.done();
    }, 

    'Form \'C: propose discharge|perform|action\', fulfil \'D: reply propose|discharge|perform|action\' when \'not-understood propose discharge|perform|action\' is sent': function(test) {
        test.done();
    }, 

    'Form \'C: propose discharge|perform|action\', fulfil \'D: reply propose|discharge|perform|action\' when \'refuse propose discharge|perform|action\' is sent': function(test) {
        test.done();
    }, 

    'Form \'C: propose discharge|perform|action\', fulfil \'D: reply propose|discharge|perform|action\' when \'timeout propose discharge|perform|action\' is sent': function(test) {
        test.done();
    }, 

    'Fulfil \'D: reply propose|discharge|perform|action\', fulfil \'C: propose discharge|perform|action\' when \'agree propose|discharge|perform|action\' is sent': function(test) {
        test.done();
    }, 

    'Should have no outstanding social commitments once complete': function(test) {
        test.done();
    }, 
};

/**
 * server
 */
exports.server = {

    setUp: function(callback) {
        callback();
    },

    tearDown: function(callback) {
        callback();
    },

    'Load a conversation from the database if provided a conversationId': function(test) {
        test.done();
    },

    'Create a new conversation if no conversationId is provided': function(test) {
        test.done();
    },

    'Form \'D: reply request|action\' having received a \'request action\'': function(test) {
        test.done();
    }, 

    'Fulfil \'D: reply request|action\' when \'not-understood request|action\' is sent': function(test) {
        test.done();
    }, 

    'Fulfil \'D: reply request|action\' when \'refuse request|action\' is sent': function(test) {
        test.done();
    }, 

    'Fulfil \'D: reply request|action\' when \'timeout request|action\' is sent': function(test) {
        test.done();
    }, 

    'Fulfil \'D: reply request|action\' and form \'D: propose discharge|perform|action\' when \'agree request|action\' is sent': function(test) {
        test.done();
    }, 

    'Fulfil \'D: propose discharge|perform|action\' and form \'C: reply propose|discharge|perform|action\' when \'propose discharge|perform|action\' is sent': function(test) {
        test.done();
    }, 

    'Form \'D: propose discharge|perform|action\', fulfil \'C: reply propose|discharge|perform|action\' when \'not-understood propose discharge|perform|action\' is received': function(test) {
        test.done();
    }, 

    'Form \'D: propose discharge|perform|action\', fulfil \'C: reply propose|discharge|perform|action\' when \'refuse propose discharge|perform|action\' is received': function(test) {
        test.done();
    }, 

    'Form \'D: propose discharge|perform|action\', fulfil \'C: reply propose|discharge|perform|action\' when \'timeout propose discharge|perform|action\' is received': function(test) {
        test.done();
    }, 

    'Fulfil \'C: reply propose|discharge|perform|action\', fulfil \'D: propose discharge|perform|action\' when \'agree propose|discharge|perform|action\' is received': function(test) {
        test.done();
    },

    'Should have no outstanding social commitments once complete': function(test) {
        test.done();
    },
};

