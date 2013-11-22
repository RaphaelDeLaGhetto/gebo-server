'use strict';

var agentSchema = require('../../schemata/agent'),
    request = require('../../conversations/request')(),
    utils = require('../../conversations/utils');

/**
 * Performative functions, because I need to keep
 * doing the same bloody thing over and over.
 */
var CLIENT = 'yanfen@example.com',
    SERVER = 'dan@example.com';

function clientRequestAction() {
    return request.client({ receiver: SERVER,
                            sender: CLIENT,
                            performative: 'request',
                            action: 'action' },
                          { email: CLIENT });
  }

function serverReplyNotUnderstood(conversation) {
    return request.client({ receiver: CLIENT,
                            sender: SERVER,
                            performative: 'not-understood request',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function serverReplyRefuse(conversation) {
    return request.client({ receiver: CLIENT,
                            sender: SERVER,
                            performative: 'refuse request',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function serverReplyTimeout(conversation) {
    return request.client({ receiver: CLIENT,
                            sender: SERVER,
                            performative: 'timeout request',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function serverAgreeRequestAction(conversation) {
    return request.client({ receiver: CLIENT,
                            sender: SERVER,
                            performative: 'agree request',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function clientCancelRequestAction(conversation) {
    return request.client({ receiver: SERVER,
                            sender: CLIENT,
                            performative: 'cancel request',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function serverFailurePerformRequestAction(conversation) {
    return request.client({ receiver: CLIENT,
                            sender: SERVER,
                            performative: 'failure perform|request',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function serverProposeDischargePerformAction(conversation) {
    return request.client({ receiver: CLIENT,
                            sender: SERVER,
                            performative: 'propose discharge|perform',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function clientNotUnderstoodProposeDischargePerformAction(conversation) {
    return request.client({ receiver: SERVER,
                            sender: CLIENT,
                            performative: 'not-understood propose|discharge|perform',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function clientRefuseProposeDischargePerformAction(conversation) {
    return request.client({ receiver: SERVER,
                            sender: CLIENT,
                            performative: 'refuse propose|discharge|perform',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function clientTimeoutProposeDischargePerformAction(conversation) {
    return request.client({ receiver: SERVER,
                            sender: CLIENT,
                            performative: 'refuse propose|discharge|perform',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function clientAgreeProposeDischargePerformAction(conversation) {
    return request.client({ receiver: SERVER,
                            sender: CLIENT,
                            performative: 'agree propose|discharge|perform',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }


/**
 * client
 */
exports.client = {

    setUp: function(callback) {
        var agentDb = new agentSchema(CLIENT);
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
        var agentDb = new agentSchema(CLIENT);
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
        request.client({ receiver: SERVER, conversationId: 'some conversation ID' },
                       { email: CLIENT }).
            then(function(conversation) {
                test.equal(conversation.type, 'request');
                test.equal(conversation.role, 'client');
                test.equal(conversation.conversationId, 'some conversation ID');
                test.equal(conversation.socialCommitments.length, 0);
                // This is true because no social commmitments have
                // been formed at this point
                test.equal(conversation.terminated, true);
                test.done();
            }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
              });
    },

    'Create a new conversation if no conversationId is provided': function(test) {
        test.expect(1);
        request.client({ receiver: SERVER,
                         conversationId: 'some non-existent conversation ID' },
                       { email: CLIENT }).
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
        test.expect(9);
        clientRequestAction().
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(typeof conversation.socialCommitments[0].message, 'object');
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(conversation.socialCommitments[0].fulfilled, null);

                test.equal(conversation.terminated, false);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Fulfil \'C: reply request|action\' when \'not-understood request|action\' is received': function(test) {
        test.expect(10);
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
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(!!conversation.socialCommitments[0].fulfilled, true);

                test.equal(conversation.terminated, true);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Fulfil \'C: reply request|action\' when \'refuse request|action\' is received': function(test) {
        test.expect(10);
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
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(!!conversation.socialCommitments[0].fulfilled, true);

                test.equal(conversation.terminated, true);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Fulfil \'C: reply request|action\' when \'timeout request|action\' is received': function(test) {
        test.expect(10);
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
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(!!conversation.socialCommitments[0].fulfilled, true);

                test.equal(conversation.terminated, true);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Fulfil \'Client C: reply request|action\' and form \'C: propose discharge|perform|action\' when \'agree request|action\' is received': function(test) {
        test.expect(17);
        clientRequestAction().
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 2);

                // 'reply request:action' fulfilled
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(typeof conversation.socialCommitments[0].message, 'object');
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(!!conversation.socialCommitments[0].fulfilled, true);

                // 'propose discharge|perform|action' formed
                test.equal(conversation.socialCommitments[1].performative, 'propose discharge|perform');
                test.equal(conversation.socialCommitments[1].action, 'action');
                test.equal(typeof conversation.socialCommitments[1].message, 'object');
                test.equal(conversation.socialCommitments[1].creditor, CLIENT);
                test.equal(conversation.socialCommitments[1].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[1].created, true);
                test.equal(!!conversation.socialCommitments[1].fulfilled, false);

                test.equal(conversation.terminated, false);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Fulfil \'C: propose discharge|perform|action\' when \'cancel request|action\' is sent': function(test) {
        test.expect(18);
        clientRequestAction().
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 2);
                return clientCancelRequestAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 2);

                // 'reply request:action' fulfilled
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(typeof conversation.socialCommitments[0].message, 'object');
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(!!conversation.socialCommitments[0].fulfilled, true);

                // 'propose discharge|perform|action' formed
                test.equal(conversation.socialCommitments[1].performative, 'propose discharge|perform');
                test.equal(conversation.socialCommitments[1].action, 'action');
                test.equal(typeof conversation.socialCommitments[1].message, 'object');
                test.equal(conversation.socialCommitments[1].creditor, CLIENT);
                test.equal(conversation.socialCommitments[1].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[1].created, true);
                test.equal(!!conversation.socialCommitments[1].fulfilled, true);

                test.equal(conversation.terminated, true);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Fulfil \'C: propose discharge|perform|action\' when \'failure perform|request|action\' is received': function(test) {
        test.expect(18);
        clientRequestAction().
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 2);
                return serverFailurePerformRequestAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 2);

                // 'reply request:action' fulfilled
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(typeof conversation.socialCommitments[0].message, 'object');
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(!!conversation.socialCommitments[0].fulfilled, true);

                // 'propose discharge|perform|action' formed
                test.equal(conversation.socialCommitments[1].performative, 'propose discharge|perform');
                test.equal(conversation.socialCommitments[1].action, 'action');
                test.equal(typeof conversation.socialCommitments[1].message, 'object');
                test.equal(conversation.socialCommitments[1].creditor, CLIENT);
                test.equal(conversation.socialCommitments[1].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[1].created, true);
                test.equal(!!conversation.socialCommitments[1].fulfilled, true);

                test.equal(conversation.terminated, true);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Fulfil \'C: propose discharge|perform|action\' and form \'D: reply propose|discharge|perform|action\' when \'propose discharge|perform|action\' is received': function(test) {
        test.expect(25);
        clientRequestAction().
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 2);
                return serverProposeDischargePerformAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 3);

                // 'reply request:action' fulfilled
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(typeof conversation.socialCommitments[0].message, 'object');
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(!!conversation.socialCommitments[0].fulfilled, true);

                // 'propose discharge|perform|action' fulfilled
                test.equal(conversation.socialCommitments[1].performative, 'propose discharge|perform');
                test.equal(conversation.socialCommitments[1].action, 'action');
                test.equal(typeof conversation.socialCommitments[1].message, 'object');
                test.equal(conversation.socialCommitments[1].creditor, CLIENT);
                test.equal(conversation.socialCommitments[1].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[1].created, true);
                test.equal(!!conversation.socialCommitments[1].fulfilled, true);

                // 'reply propose|discharge|perform|action' formed
                test.equal(conversation.socialCommitments[2].performative, 'reply propose|discharge|perform');
                test.equal(conversation.socialCommitments[2].action, 'action');
                test.equal(typeof conversation.socialCommitments[2].message, 'object');
                test.equal(conversation.socialCommitments[2].creditor, SERVER);
                test.equal(conversation.socialCommitments[2].debtor, CLIENT);
                test.equal(!!conversation.socialCommitments[2].created, true);
                test.equal(!!conversation.socialCommitments[2].fulfilled, false);

                test.equal(conversation.terminated, false);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Fulfil, then form new \'C: propose discharge|perform|action\', fulfil \'D: reply propose|discharge|perform|action\' when \'not-understood propose discharge|perform|action\' is sent': function(test) {
        test.expect(33);
        clientRequestAction().
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 2);
                return serverProposeDischargePerformAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 3);
                return clientNotUnderstoodProposeDischargePerformAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 4);

                // 'reply request:action' fulfilled
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(typeof conversation.socialCommitments[0].message, 'object');
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(!!conversation.socialCommitments[0].fulfilled, true);

                // 'propose discharge|perform|action' fulfilled
                test.equal(conversation.socialCommitments[1].performative, 'propose discharge|perform');
                test.equal(conversation.socialCommitments[1].action, 'action');
                test.equal(typeof conversation.socialCommitments[1].message, 'object');
                test.equal(conversation.socialCommitments[1].creditor, CLIENT);
                test.equal(conversation.socialCommitments[1].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[1].created, true);
                test.equal(!!conversation.socialCommitments[1].fulfilled, true);

                // 'reply propose|discharge|perform|action' fulfilled 
                test.equal(conversation.socialCommitments[2].performative, 'reply propose|discharge|perform');
                test.equal(conversation.socialCommitments[2].action, 'action');
                test.equal(typeof conversation.socialCommitments[2].message, 'object');
                test.equal(conversation.socialCommitments[2].creditor, SERVER);
                test.equal(conversation.socialCommitments[2].debtor, CLIENT);
                test.equal(!!conversation.socialCommitments[2].created, true);
                test.equal(!!conversation.socialCommitments[2].fulfilled, true);

                // 'propose discharge|perform|action' formed
                test.equal(conversation.socialCommitments[3].performative, 'propose discharge|perform');
                test.equal(conversation.socialCommitments[3].action, 'action');
                test.equal(typeof conversation.socialCommitments[3].message, 'object');
                test.equal(conversation.socialCommitments[3].creditor, CLIENT);
                test.equal(conversation.socialCommitments[3].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[3].created, true);
                test.equal(!!conversation.socialCommitments[3].fulfilled, false);

                test.equal(conversation.terminated, false);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Form \'C: propose discharge|perform|action\', fulfil \'D: reply propose|discharge|perform|action\' when \'refuse propose discharge|perform|action\' is sent': function(test) {
        test.expect(33);
        clientRequestAction().
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 2);
                return serverProposeDischargePerformAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 3);
                return clientRefuseProposeDischargePerformAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 4);

                // 'reply request:action' fulfilled
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(typeof conversation.socialCommitments[0].message, 'object');
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(!!conversation.socialCommitments[0].fulfilled, true);

                // 'propose discharge|perform|action' fulfilled
                test.equal(conversation.socialCommitments[1].performative, 'propose discharge|perform');
                test.equal(conversation.socialCommitments[1].action, 'action');
                test.equal(typeof conversation.socialCommitments[1].message, 'object');
                test.equal(conversation.socialCommitments[1].creditor, CLIENT);
                test.equal(conversation.socialCommitments[1].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[1].created, true);
                test.equal(!!conversation.socialCommitments[1].fulfilled, true);

                // 'reply propose|discharge|perform|action' fulfilled 
                test.equal(conversation.socialCommitments[2].performative, 'reply propose|discharge|perform');
                test.equal(conversation.socialCommitments[2].action, 'action');
                test.equal(typeof conversation.socialCommitments[2].message, 'object');
                test.equal(conversation.socialCommitments[2].creditor, SERVER);
                test.equal(conversation.socialCommitments[2].debtor, CLIENT);
                test.equal(!!conversation.socialCommitments[2].created, true);
                test.equal(!!conversation.socialCommitments[2].fulfilled, true);

                // 'propose discharge|perform|action' formed
                test.equal(conversation.socialCommitments[3].performative, 'propose discharge|perform');
                test.equal(conversation.socialCommitments[3].action, 'action');
                test.equal(typeof conversation.socialCommitments[3].message, 'object');
                test.equal(conversation.socialCommitments[3].creditor, CLIENT);
                test.equal(conversation.socialCommitments[3].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[3].created, true);
                test.equal(!!conversation.socialCommitments[3].fulfilled, false);

                test.equal(conversation.terminated, false);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Form \'C: propose discharge|perform|action\', fulfil \'D: reply propose|discharge|perform|action\' when \'timeout propose discharge|perform|action\' is sent': function(test) {
        test.expect(33);
        clientRequestAction().
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 2);
                return serverProposeDischargePerformAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 3);
                return clientTimeoutProposeDischargePerformAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 4);

                // 'reply request:action' fulfilled
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(typeof conversation.socialCommitments[0].message, 'object');
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(!!conversation.socialCommitments[0].fulfilled, true);

                // 'propose discharge|perform|action' fulfilled
                test.equal(conversation.socialCommitments[1].performative, 'propose discharge|perform');
                test.equal(conversation.socialCommitments[1].action, 'action');
                test.equal(typeof conversation.socialCommitments[1].message, 'object');
                test.equal(conversation.socialCommitments[1].creditor, CLIENT);
                test.equal(conversation.socialCommitments[1].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[1].created, true);
                test.equal(!!conversation.socialCommitments[1].fulfilled, true);

                // 'reply propose|discharge|perform|action' fulfilled 
                test.equal(conversation.socialCommitments[2].performative, 'reply propose|discharge|perform');
                test.equal(conversation.socialCommitments[2].action, 'action');
                test.equal(typeof conversation.socialCommitments[2].message, 'object');
                test.equal(conversation.socialCommitments[2].creditor, SERVER);
                test.equal(conversation.socialCommitments[2].debtor, CLIENT);
                test.equal(!!conversation.socialCommitments[2].created, true);
                test.equal(!!conversation.socialCommitments[2].fulfilled, true);

                // 'propose discharge|perform|action' formed
                test.equal(conversation.socialCommitments[3].performative, 'propose discharge|perform');
                test.equal(conversation.socialCommitments[3].action, 'action');
                test.equal(typeof conversation.socialCommitments[3].message, 'object');
                test.equal(conversation.socialCommitments[3].creditor, CLIENT);
                test.equal(conversation.socialCommitments[3].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[3].created, true);
                test.equal(!!conversation.socialCommitments[3].fulfilled, false);

                test.equal(conversation.terminated, false);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Fulfil \'D: reply propose|discharge|perform|action\', fulfil \'C: propose discharge|perform|action\' when \'agree propose|discharge|perform|action\' is sent': function(test) {
        test.expect(26);
        clientRequestAction().
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 2);
                return serverProposeDischargePerformAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 3);
                return clientAgreeProposeDischargePerformAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 3);

                // 'reply request:action' fulfilled
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(typeof conversation.socialCommitments[0].message, 'object');
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(!!conversation.socialCommitments[0].fulfilled, true);

                // 'propose discharge|perform|action' fulfilled
                test.equal(conversation.socialCommitments[1].performative, 'propose discharge|perform');
                test.equal(conversation.socialCommitments[1].action, 'action');
                test.equal(typeof conversation.socialCommitments[1].message, 'object');
                test.equal(conversation.socialCommitments[1].creditor, CLIENT);
                test.equal(conversation.socialCommitments[1].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[1].created, true);
                test.equal(!!conversation.socialCommitments[1].fulfilled, true);

                // 'reply propose|discharge|perform|action' fulfilled 
                test.equal(conversation.socialCommitments[2].performative, 'reply propose|discharge|perform');
                test.equal(conversation.socialCommitments[2].action, 'action');
                test.equal(typeof conversation.socialCommitments[2].message, 'object');
                test.equal(conversation.socialCommitments[2].creditor, SERVER);
                test.equal(conversation.socialCommitments[2].debtor, CLIENT);
                test.equal(!!conversation.socialCommitments[2].created, true);
                test.equal(!!conversation.socialCommitments[2].fulfilled, true);

                test.equal(conversation.terminated, true);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
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

