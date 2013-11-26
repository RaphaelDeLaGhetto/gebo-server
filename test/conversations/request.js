'use strict';

var agentSchema = require('../../schemata/agent'),
    request = require('../../conversations/request'),
    utils = require('../../conversations/utils');

/**
 * Performative functions, because I need to keep
 * doing the same bloody thing over and over.
 */
var CLIENT = 'yanfen@example.com',
    SERVER = 'dan@example.com';

function clientRequestAction(isServer) {
    if (isServer) {
      return request.server({ receiver: SERVER,
                              sender: CLIENT,
                              performative: 'request',
                              action: 'action' },
                            { email: SERVER });
    }
    return request.client({ receiver: SERVER,
                            sender: CLIENT,
                            performative: 'request',
                            action: 'action' },
                          { email: CLIENT });
  }

function serverReplyNotUnderstood(conversation, isServer) {
    if (isServer) {
      return request.server({ receiver: CLIENT,
                              sender: SERVER,
                              performative: 'not-understood request',
                              action: 'action',
                              conversationId: conversation.conversationId },
                            { email: SERVER });
    }
    return request.client({ receiver: CLIENT,
                            sender: SERVER,
                            performative: 'not-understood request',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function serverReplyRefuse(conversation, isServer) {
    if (isServer) {
      return request.server({ receiver: CLIENT,
                              sender: SERVER,
                              performative: 'refuse request',
                              action: 'action',
                              conversationId: conversation.conversationId },
                            { email: SERVER });
    }
    return request.client({ receiver: CLIENT,
                            sender: SERVER,
                            performative: 'refuse request',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function serverReplyTimeout(conversation, isServer) {
    if (isServer) {
      return request.server({ receiver: CLIENT,
                              sender: SERVER,
                              performative: 'timeout request',
                              action: 'action',
                              conversationId: conversation.conversationId },
                            { email: SERVER });
    }
    return request.client({ receiver: CLIENT,
                            sender: SERVER,
                            performative: 'timeout request',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function serverAgreeRequestAction(conversation, isServer) {
    if (isServer) {
      return request.server({ receiver: CLIENT,
                              sender: SERVER,
                              performative: 'agree request',
                              action: 'action',
                              conversationId: conversation.conversationId },
                            { email: SERVER });
    }
    return request.client({ receiver: CLIENT,
                            sender: SERVER,
                            performative: 'agree request',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function clientCancelRequestAction(conversation, isServer) {
    if (isServer) {
      return request.server({ receiver: SERVER,
                              sender: CLIENT,
                              performative: 'cancel request',
                              action: 'action',
                              conversationId: conversation.conversationId },
                            { email: SERVER });
    }
    return request.client({ receiver: SERVER,
                            sender: CLIENT,
                            performative: 'cancel request',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function serverFailurePerformRequestAction(conversation, isServer) {
    if (isServer) {
      return request.server({ receiver: CLIENT,
                              sender: SERVER,
                              performative: 'failure perform',
                              action: 'action',
                              conversationId: conversation.conversationId },
                            { email: SERVER });
    }
    return request.client({ receiver: CLIENT,
                            sender: SERVER,
                            performative: 'failure perform',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function serverProposeDischargePerformAction(conversation, isServer) {
    if (isServer) {
      return request.server({ receiver: CLIENT,
                              sender: SERVER,
                              performative: 'propose discharge|perform',
                              action: 'action',
                              conversationId: conversation.conversationId },
                            { email: SERVER });
    }
    return request.client({ receiver: CLIENT,
                            sender: SERVER,
                            performative: 'propose discharge|perform',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function serverTimeoutPerformAction(conversation, isServer) {
    if (isServer) {
      return request.server({ receiver: CLIENT,
                              sender: SERVER,
                              performative: 'timeout perform',
                              action: 'action',
                              conversationId: conversation.conversationId },
                            { email: SERVER });
    }
    return request.client({ receiver: CLIENT,
                            sender: SERVER,
                            performative: 'timeout perform',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }


function clientNotUnderstoodProposeDischargePerformAction(conversation, isServer) {
    if (isServer) {
      return request.server({ receiver: SERVER,
                              sender: CLIENT,
                              performative: 'not-understood propose|discharge|perform',
                              action: 'action',
                              conversationId: conversation.conversationId },
                            { email: SERVER });
    };
    return request.client({ receiver: SERVER,
                            sender: CLIENT,
                            performative: 'not-understood propose|discharge|perform',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function clientRefuseProposeDischargePerformAction(conversation, isServer) {
    if (isServer) {
      return request.server({ receiver: SERVER,
                              sender: CLIENT,
                              performative: 'refuse propose|discharge|perform',
                              action: 'action',
                              conversationId: conversation.conversationId },
                            { email: SERVER });
    }
    return request.client({ receiver: SERVER,
                            sender: CLIENT,
                            performative: 'refuse propose|discharge|perform',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function clientTimeoutProposeDischargePerformAction(conversation, isServer) {
    if (isServer) {
      return request.server({ receiver: SERVER,
                              sender: CLIENT,
                              performative: 'refuse propose|discharge|perform',
                              action: 'action',
                              conversationId: conversation.conversationId },
                            { email: SERVER });
    }
    return request.client({ receiver: SERVER,
                            sender: CLIENT,
                            performative: 'refuse propose|discharge|perform',
                            action: 'action',
                            conversationId: conversation.conversationId },
                          { email: CLIENT });
  }

function clientAgreeProposeDischargePerformAction(conversation, isServer) {
    if (isServer) {
      return request.server({ receiver: SERVER,
                              sender: CLIENT,
                              performative: 'agree propose|discharge|perform',
                              action: 'action',
                              conversationId: conversation.conversationId },
                            { email: SERVER });
    }
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
        test.expect(6);
        request.client({ receiver: SERVER, conversationId: 'some conversation ID' },
                       { email: CLIENT }).
            then(function(conversation) {
                test.equal(conversation.type, 'request');
                test.equal(conversation.role, 'client');
                test.equal(conversation.conversationId, 'some conversation ID');
                test.equal(conversation.socialCommitments.length, 0);
                test.equal(!!conversation.created, true);
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
        test.expect(11);
        request.client({ receiver: SERVER,
                         sender: CLIENT,
                         performative: 'request',
                         action: 'action' },
                       { email: CLIENT }).
            then(function(conversation) {
                test.equal(conversation.type, 'request');
                test.equal(conversation.role, 'client');
                test.equal(conversation.conversationId.search(CLIENT), 0);
                test.equal(conversation.socialCommitments.length, 1);
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(!!conversation.socialCommitments[0].message, true);
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(conversation.socialCommitments[0].fulfilled, null);
                test.done();
            }).
            catch(function(err) {
                console.log(err);
                test.ok(false, 'Should not get here');
                test.done();
              });
    },

    'Create a new conversation if non-existent conversationId is provided': function(test) {
        test.expect(11);
        request.client({ receiver: SERVER,
                         sender: CLIENT,
                         performative: 'request',
                         action: 'action',
                         conversationId: 'some non-existent conversation ID' },
                       { email: CLIENT }).
            then(function(conversation) {
                test.equal(conversation.type, 'request');
                test.equal(conversation.role, 'client');
                test.equal(conversation.conversationId, 'some non-existent conversation ID');
                test.equal(conversation.socialCommitments.length, 1);
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(!!conversation.socialCommitments[0].message, true);
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(conversation.socialCommitments[0].fulfilled, null);
 
                test.done();
            }).
            catch(function(err) {
                console.log(err);
                test.ok(false, 'Should not get here');
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

    'Fulfil \'C: propose discharge|perform|action\' when \'failure perform|action\' is received': function(test) {
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

    'Fulfil \'C: propose discharge|perform|action\' when \'timeout perform|action\' is received': function(test) {
        test.expect(18);
        clientRequestAction().
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 2);
                return serverTimeoutPerformAction(conversation);
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
};

/**
 * server
 */
exports.server = {

    setUp: function(callback) {
        var agentDb = new agentSchema(SERVER);
        var conversation = new agentDb.conversationModel({
                type: 'request',
                role: 'server',
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
        var agentDb = new agentSchema(SERVER);
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
        request.server({ receiver: SERVER, conversationId: 'some conversation ID' },
                       { email: SERVER }).
            then(function(conversation) {
                test.equal(conversation.type, 'request');
                test.equal(conversation.role, 'server');
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
                test.done();
              });
    },

    'Create a new conversation if no conversationId is provided': function(test) {
        test.expect(11);
        request.server({ receiver: SERVER,
                         sender: CLIENT,
                         performative: 'request',
                         action: 'action' },
                       { email: SERVER }).
            then(function(conversation) {
                test.equal(conversation.type, 'request');
                test.equal(conversation.role, 'server');
                test.equal(conversation.conversationId.search(CLIENT), 0);
                test.equal(conversation.socialCommitments.length, 1);
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(!!conversation.socialCommitments[0].message, true);
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(conversation.socialCommitments[0].fulfilled, null);
                test.done();
            }).
            catch(function(err) {
                console.log(err);
                test.ok(false, 'Should not get here');
                test.done();
              });
    },

    'Create conversation if non-existent conversationId is provided': function(test) {
        test.expect(11);
        request.server({ receiver: SERVER,
                         sender: CLIENT,
                         performative: 'request',
                         action: 'action',
                         conversationId: 'some non-existent conversation ID' },
                       { email: SERVER }).
            then(function(conversation) {
                test.equal(conversation.type, 'request');
                test.equal(conversation.role, 'server');
                test.equal(conversation.conversationId, 'some non-existent conversation ID');
                test.equal(conversation.socialCommitments.length, 1);
                test.equal(conversation.socialCommitments[0].performative, 'reply request');
                test.equal(conversation.socialCommitments[0].action, 'action');
                test.equal(!!conversation.socialCommitments[0].message, true);
                test.equal(conversation.socialCommitments[0].creditor, CLIENT);
                test.equal(conversation.socialCommitments[0].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[0].created, true);
                test.equal(conversation.socialCommitments[0].fulfilled, null);
                test.done();
            }).
            catch(function(err) {
                console.log(err);
                test.ok(false, 'Should not get here');
                test.done();
              });
    },

    'Form \'D: reply request|action\' having received a \'request action\'': function(test) {
        test.expect(9);
        clientRequestAction(true).
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

    'Fulfil \'D: reply request|action\' when \'not-understood request|action\' is sent': function(test) {
        test.expect(10);
        clientRequestAction(true).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverReplyNotUnderstood(conversation, true);
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

    'Fulfil \'D: reply request|action\' when \'refuse request|action\' is sent': function(test) {
        test.expect(10);
        clientRequestAction(true).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverReplyRefuse(conversation, true);
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

    'Fulfil \'D: reply request|action\' when \'timeout request|action\' is sent': function(test) {
        test.expect(10);
        clientRequestAction(true).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverReplyTimeout(conversation, true);
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

    'Fulfil \'D: reply request|action\', form \'D: perform action\', and form \'D: propose discharge|perform|action\' when \'agree request|action\' is sent': function(test) {
        test.expect(24);
        clientRequestAction(true).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation, true);
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

                // 'propose discharge|perform|action' formed
                test.equal(conversation.socialCommitments[1].performative, 'propose discharge|perform');
                test.equal(conversation.socialCommitments[1].action, 'action');
                test.equal(typeof conversation.socialCommitments[1].message, 'object');
                test.equal(conversation.socialCommitments[1].creditor, CLIENT);
                test.equal(conversation.socialCommitments[1].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[1].created, true);
                test.equal(!!conversation.socialCommitments[1].fulfilled, false);

                // 'perform action' formed
                test.equal(conversation.socialCommitments[2].performative, 'perform');
                test.equal(conversation.socialCommitments[2].action, 'action');
                test.equal(typeof conversation.socialCommitments[2].message, 'object');
                test.equal(conversation.socialCommitments[2].creditor, CLIENT);
                test.equal(conversation.socialCommitments[2].debtor, SERVER);
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

    'Fulfil \'D: propose discharge|perform|action\' and \'D: perform action\' when \'cancel request|action\' is received': function(test) {
        test.expect(25);
        clientRequestAction(true).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation, true);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 3);
                return clientCancelRequestAction(conversation, true);
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

                // 'perform action' fulfilled
                test.equal(conversation.socialCommitments[2].performative, 'perform');
                test.equal(conversation.socialCommitments[2].action, 'action');
                test.equal(typeof conversation.socialCommitments[2].message, 'object');
                test.equal(conversation.socialCommitments[2].creditor, CLIENT);
                test.equal(conversation.socialCommitments[2].debtor, SERVER);
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

    'Fulfil \'D: propose discharge|perform|action\' and \'D: perform action\' when \'failure perform|action\' is sent': function(test) {
        test.expect(25);
        clientRequestAction(true).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation, true);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 3);
                return serverFailurePerformRequestAction(conversation, true);
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

                // 'perform action' fulfilled
                test.equal(conversation.socialCommitments[2].performative, 'perform');
                test.equal(conversation.socialCommitments[2].action, 'action');
                test.equal(typeof conversation.socialCommitments[2].message, 'object');
                test.equal(conversation.socialCommitments[2].creditor, CLIENT);
                test.equal(conversation.socialCommitments[2].debtor, SERVER);
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

    'Fulfil \'D: propose discharge|perform|action\' and \'D: perform action\' when \'timeout perform|action\' is sent': function(test) {
        test.expect(25);
        clientRequestAction(true).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation, true);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 3);
                return serverTimeoutPerformAction(conversation, true);
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

                // 'propose discharge|perform|action' fulfilled
                test.equal(conversation.socialCommitments[2].performative, 'perform');
                test.equal(conversation.socialCommitments[2].action, 'action');
                test.equal(typeof conversation.socialCommitments[2].message, 'object');
                test.equal(conversation.socialCommitments[2].creditor, CLIENT);
                test.equal(conversation.socialCommitments[2].debtor, SERVER);
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

    'Fulfil \'D: propose discharge|perform|action\' and form \'C: reply propose|discharge|perform|action\' when \'propose discharge|perform|action\' is sent': function(test) {
        test.expect(32);
        clientRequestAction(true).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation, true);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 3);
                return serverProposeDischargePerformAction(conversation, true);
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

                // 'perform action' stays unfulfilled
                test.equal(conversation.socialCommitments[2].performative, 'perform');
                test.equal(conversation.socialCommitments[2].action, 'action');
                test.equal(typeof conversation.socialCommitments[2].message, 'object');
                test.equal(conversation.socialCommitments[2].creditor, CLIENT);
                test.equal(conversation.socialCommitments[2].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[2].created, true);
                test.equal(!!conversation.socialCommitments[2].fulfilled, false);

                // 'reply propose|discharge|perform|action' formed
                test.equal(conversation.socialCommitments[3].performative, 'reply propose|discharge|perform');
                test.equal(conversation.socialCommitments[3].action, 'action');
                test.equal(typeof conversation.socialCommitments[3].message, 'object');
                test.equal(conversation.socialCommitments[3].creditor, SERVER);
                test.equal(conversation.socialCommitments[3].debtor, CLIENT);
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

    'Form \'D: propose discharge|perform|action\', fulfil \'C: reply propose|discharge|perform|action\' when \'not-understood propose discharge|perform|action\' is received': function(test) {
        test.expect(40);
        clientRequestAction(true).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation, true);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 3);
                return serverProposeDischargePerformAction(conversation, true);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 4);
                return clientNotUnderstoodProposeDischargePerformAction(conversation, true);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 5);

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

                // 'perform action' remains unfulfilled 
                test.equal(conversation.socialCommitments[2].performative, 'perform');
                test.equal(conversation.socialCommitments[2].action, 'action');
                test.equal(typeof conversation.socialCommitments[2].message, 'object');
                test.equal(conversation.socialCommitments[2].creditor, CLIENT);
                test.equal(conversation.socialCommitments[2].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[2].created, true);
                test.equal(!!conversation.socialCommitments[2].fulfilled, false);

                // 'reply propose|discharge|perform|action' fulfilled 
                test.equal(conversation.socialCommitments[3].performative, 'reply propose|discharge|perform');
                test.equal(conversation.socialCommitments[3].action, 'action');
                test.equal(typeof conversation.socialCommitments[3].message, 'object');
                test.equal(conversation.socialCommitments[3].creditor, SERVER);
                test.equal(conversation.socialCommitments[3].debtor, CLIENT);
                test.equal(!!conversation.socialCommitments[3].created, true);
                test.equal(!!conversation.socialCommitments[3].fulfilled, true);

                // 'propose discharge|perform|action' formed
                test.equal(conversation.socialCommitments[4].performative, 'propose discharge|perform');
                test.equal(conversation.socialCommitments[4].action, 'action');
                test.equal(typeof conversation.socialCommitments[4].message, 'object');
                test.equal(conversation.socialCommitments[4].creditor, CLIENT);
                test.equal(conversation.socialCommitments[4].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[4].created, true);
                test.equal(!!conversation.socialCommitments[4].fulfilled, false);

                test.equal(conversation.terminated, false);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
        
    }, 

    'Form \'D: propose discharge|perform|action\', fulfil \'C: reply propose|discharge|perform|action\' when \'refuse propose discharge|perform|action\' is received': function(test) {
        test.expect(40);
        clientRequestAction(true).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation, true);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 3);
                return serverProposeDischargePerformAction(conversation, true);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 4);
                return clientRefuseProposeDischargePerformAction(conversation, true);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 5);

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

                // 'perform action' remains unfulfilled 
                test.equal(conversation.socialCommitments[2].performative, 'perform');
                test.equal(conversation.socialCommitments[2].action, 'action');
                test.equal(typeof conversation.socialCommitments[2].message, 'object');
                test.equal(conversation.socialCommitments[2].creditor, CLIENT);
                test.equal(conversation.socialCommitments[2].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[2].created, true);
                test.equal(!!conversation.socialCommitments[2].fulfilled, false);

                // 'reply propose|discharge|perform|action' fulfilled 
                test.equal(conversation.socialCommitments[3].performative, 'reply propose|discharge|perform');
                test.equal(conversation.socialCommitments[3].action, 'action');
                test.equal(typeof conversation.socialCommitments[3].message, 'object');
                test.equal(conversation.socialCommitments[3].creditor, SERVER);
                test.equal(conversation.socialCommitments[3].debtor, CLIENT);
                test.equal(!!conversation.socialCommitments[3].created, true);
                test.equal(!!conversation.socialCommitments[3].fulfilled, true);

                // 'propose discharge|perform|action' formed
                test.equal(conversation.socialCommitments[4].performative, 'propose discharge|perform');
                test.equal(conversation.socialCommitments[4].action, 'action');
                test.equal(typeof conversation.socialCommitments[4].message, 'object');
                test.equal(conversation.socialCommitments[4].creditor, CLIENT);
                test.equal(conversation.socialCommitments[4].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[4].created, true);
                test.equal(!!conversation.socialCommitments[4].fulfilled, false);

                test.equal(conversation.terminated, false);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Form \'D: propose discharge|perform|action\', fulfil \'C: reply propose|discharge|perform|action\' when \'timeout propose discharge|perform|action\' is received': function(test) {
        test.expect(40);
        clientRequestAction(true).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation, true);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 3);
                return serverProposeDischargePerformAction(conversation, true);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 4);
                return clientTimeoutProposeDischargePerformAction(conversation, true);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 5);

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

                // 'perform action' remains unfulfilled 
                test.equal(conversation.socialCommitments[2].performative, 'perform');
                test.equal(conversation.socialCommitments[2].action, 'action');
                test.equal(typeof conversation.socialCommitments[2].message, 'object');
                test.equal(conversation.socialCommitments[2].creditor, CLIENT);
                test.equal(conversation.socialCommitments[2].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[2].created, true);
                test.equal(!!conversation.socialCommitments[2].fulfilled, false);

                // 'reply propose|discharge|perform|action' fulfilled 
                test.equal(conversation.socialCommitments[3].performative, 'reply propose|discharge|perform');
                test.equal(conversation.socialCommitments[3].action, 'action');
                test.equal(typeof conversation.socialCommitments[3].message, 'object');
                test.equal(conversation.socialCommitments[3].creditor, SERVER);
                test.equal(conversation.socialCommitments[3].debtor, CLIENT);
                test.equal(!!conversation.socialCommitments[3].created, true);
                test.equal(!!conversation.socialCommitments[3].fulfilled, true);

                // 'propose discharge|perform|action' formed
                test.equal(conversation.socialCommitments[4].performative, 'propose discharge|perform');
                test.equal(conversation.socialCommitments[4].action, 'action');
                test.equal(typeof conversation.socialCommitments[4].message, 'object');
                test.equal(conversation.socialCommitments[4].creditor, CLIENT);
                test.equal(conversation.socialCommitments[4].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[4].created, true);
                test.equal(!!conversation.socialCommitments[4].fulfilled, false);

                test.equal(conversation.terminated, false);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    }, 

    'Fulfil \'C: reply propose|discharge|perform|action\', fulfil \'D: perform action\' when \'agree propose|discharge|perform|action\' is received': function(test) {
        test.expect(33);
        clientRequestAction(true).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 1);
                return serverAgreeRequestAction(conversation, true);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 3);
                return serverProposeDischargePerformAction(conversation, true);
              }).
            then(function(conversation) {
                test.equal(conversation.socialCommitments.length, 4);
                return clientAgreeProposeDischargePerformAction(conversation, true);
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

                // 'perform action' fulfilled 
                test.equal(conversation.socialCommitments[2].performative, 'perform');
                test.equal(conversation.socialCommitments[2].action, 'action');
                test.equal(typeof conversation.socialCommitments[2].message, 'object');
                test.equal(conversation.socialCommitments[2].creditor, CLIENT);
                test.equal(conversation.socialCommitments[2].debtor, SERVER);
                test.equal(!!conversation.socialCommitments[2].created, true);
                test.equal(!!conversation.socialCommitments[2].fulfilled, true);

                // 'reply propose|discharge|perform|action' fulfilled 
                test.equal(conversation.socialCommitments[3].performative, 'reply propose|discharge|perform');
                test.equal(conversation.socialCommitments[3].action, 'action');
                test.equal(typeof conversation.socialCommitments[3].message, 'object');
                test.equal(conversation.socialCommitments[3].creditor, SERVER);
                test.equal(conversation.socialCommitments[3].debtor, CLIENT);
                test.equal(!!conversation.socialCommitments[3].created, true);
                test.equal(!!conversation.socialCommitments[3].fulfilled, true);

                test.equal(conversation.terminated, true);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },
};

