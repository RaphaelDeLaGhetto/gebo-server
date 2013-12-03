'use strict';

var agentSchema = require('../../schemata/agent'),
    nock = require('nock'),
    utils = require('../../conversations/utils');

/**
 * loadConversation
 */
exports.loadConversation = {

    setUp: function(callback) {
        var agentDb = new agentSchema('dan@example.com');
        // Drop the DB here because test documents have 
        // tendency to persist when errors are thrown
        // during testing
        agentDb.connection.on('open', function(err) {
            agentDb.connection.db.dropDatabase(function(err) {
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
              });
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

    'Load an existing conversation': function(test) {
        test.expect(6);
        utils.loadConversation({ receiver: 'dan@example.com',
                                 conversationId: 'some conversation ID' },
                               { email: 'dan@example.com' }, 'client').
            then(function(conversation) {
                // Connection should be open
                test.equal(conversation.db.readyState, 1);
        		conversation.db.close();

                test.equal(conversation.type, 'request');
                test.equal(conversation.role, 'client');
                test.equal(conversation.conversationId, 'some conversation ID');
                // Did not form social commitment for test conversation. A social commitment
                // would be formed in real life.
                test.equal(conversation.socialCommitments.length, 0);
                // This is true because no social commitments have been formed
                test.equal(conversation.terminated, true);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },

    'Return a new conversation if no matching conversationId exists': function(test) {
        test.expect(6);
        utils.loadConversation({ receiver: 'dan@example.com',
                                 sender: 'yanfen@example.com',
                                 performative: 'request', 
                                 conversationId: 'some non-existent conversation ID' },
                               { email: 'dan@example.com' }, 'request', 'server').
            then(function(conversation) {
                // Connection should be open
                test.equal(conversation.db.readyState, 1);
		        conversation.db.close();

                test.equal(conversation.type, 'request');
                test.equal(conversation.role, 'server');
                test.equal(conversation.conversationId, 'some non-existent conversation ID'); 
                test.equal(conversation.socialCommitments.length, 0);
                // This is true because no social commitments have been formed
                test.equal(conversation.terminated, true);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, 'Should not get here');
                test.done();
              });
    },

    'Return a new conversation with conversationId if no ID set': function(test) {
        test.expect(7);
        utils.loadConversation({ receiver: 'dan@example.com',
                                 sender: 'yanfen@example.com',
                                 performative: 'propose' },
                               { email: 'dan@example.com' }, 'propose', 'server').
            then(function(conversation) {
                // Connection should be open
                test.equal(conversation.db.readyState, 1);
	
		conversation.db.close();
                test.equal(conversation.type, 'propose');
                test.equal(conversation.role, 'server');
                test.equal(conversation.conversationId.search('yanfen@example.com'), 0); 
                test.equal(conversation.socialCommitments.length, 0);
                // This is true because no social commitments have been formed
                test.equal(conversation.terminated, true);

		// Make sure it is saved
                var agentDb = new agentSchema('dan@example.com');
                agentDb.conversationModel.find({}, function(err, conversations) {
                        agentDb.connection.db.close();
                        if (err) {
                          console.log(err);
                          test.ok(false, err);
                        }
                        test.equal(conversations.length, 2);
	                test.done();
                      });
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },
};

/**
 * getFirstUnfulfilledSocialCommitmentIndex
 */
exports.getFirstUnfulfilledSocialCommitmentIndex = {

    setUp: function(callback) {
        var agentDb = new agentSchema('dan@example.com');
        var conversation = new agentDb.conversationModel({
                type: 'request',
                role: 'client',
                conversationId: 'some conversation ID',
              });

        // Some social commitments
        var fulfilledSc = {
                performative: 'propose discharge|perform',
                action: 'action',
                message: {},
                creditor: 'dan@example.com',
                debtor: 'yanfen@example.com',
                created: Date.now(),
                fulfilled: Date.now(),
            };

        var unfulfilledSc = {
                performative: 'propose discharge|perform',
                action: 'action',
                message: {},
                creditor: 'dan@example.com',
                debtor: 'yanfen@example.com',
                created: Date.now(),
            };

        // Add some social commitments
        conversation.socialCommitments.push(fulfilledSc);
        conversation.socialCommitments.push(unfulfilledSc);
        conversation.socialCommitments.push(unfulfilledSc);
        conversation.socialCommitments.push(fulfilledSc);
        conversation.socialCommitments.push(unfulfilledSc);

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

    'Get the first unfulfilled social commitment': function(test) {
        test.expect(2);
        var agentDb = new agentSchema('dan@example.com');
        agentDb.conversationModel.findOne({ conversationId: 'some conversation ID' }, function(err, conversation) {
            agentDb.connection.db.close();
            if (err) {
              console.log(err);
              test.ok(false, err);
            }
            test.equal(conversation.socialCommitments.length, 5);
            test.equal(utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'propose discharge|perform'), 1);
            test.done();
          });
    },

    'Return the first unfulfilled social commitment at the start of the array': function(test) {
        test.expect(2);
        var agentDb = new agentSchema('dan@example.com');
        agentDb.conversationModel.findOne({ conversationId: 'some conversation ID' }, function(err, conversation) {
            agentDb.connection.db.close();
            if (err) {
              console.log(err);
              test.ok(false, err);
            }
            // Remove the fulfilled social commitment to put an 
            // unfulfilled commitment at the start
            conversation.socialCommitments.splice(0, 1);
            test.equal(conversation.socialCommitments.length, 4);

            test.equal(utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'propose discharge|perform'), 0);
            test.done();
          });
    },

    'Return the first unfulfilled social commitment at the end of the array': function(test) {
        test.expect(2);
        var agentDb = new agentSchema('dan@example.com');
        agentDb.conversationModel.findOne({ conversationId: 'some conversation ID' }, function(err, conversation) {
            agentDb.connection.db.close();
            if (err) {
              console.log(err);
              test.ok(false, err);
            }
            // Remove the fulfilled social commitment to put an 
            // unfulfilled commitment at the end
            conversation.socialCommitments.splice(0, 3);
            test.equal(conversation.socialCommitments.length, 2);

            test.equal(utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'propose discharge|perform'), 1);
            test.done();
          });
    },

    'Return -1 if no such commitment is unfulfilled': function(test) {
        test.expect(2);
        var agentDb = new agentSchema('dan@example.com');
        agentDb.conversationModel.findOne({ conversationId: 'some conversation ID' }, function(err, conversation) {
            agentDb.connection.db.close();
            if (err) {
              console.log(err);
              test.ok(false, err);
            }
            // Remove the unfulfilled social commitments
            conversation.socialCommitments.splice(1, 2);
            conversation.socialCommitments.splice(2, 1);
            test.equal(conversation.socialCommitments.length, 2);

            test.equal(utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'propose discharge|perform'), -1);
            test.done();
          });
    },

    'Return -1 if no such commitment exists': function(test) {
        test.expect(2);
        var agentDb = new agentSchema('dan@example.com');
        agentDb.conversationModel.findOne({ conversationId: 'some conversation ID' }, function(err, conversation) {
            agentDb.connection.db.close();
            if (err) {
              console.log(err);
              test.ok(false, err);
            }
            test.equal(conversation.socialCommitments.length, 5);
            test.equal(utils.getFirstUnfulfilledSocialCommitmentIndex(conversation.socialCommitments, 'reply request'), -1);
            test.done();
          });
    },
};

/**
 * startNewConversation
 */
exports.startNewConversation = {

    setUp: function(callback) {
        var agentDb = new agentSchema('server@example.com');
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

    tearDown: function(callback) {
        var agentDb = new agentSchema('server@example.com');
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

    'Add a new conversation to the database': function(test) {
        test.expect(13);
        var agentDb = new agentSchema('server@example.com');
        agentDb.conversationModel.find({}, function(err, conversations) {
            agentDb.connection.db.close();
            if (err) {
              console.log(err);
              test.ok(false, err);
            }
            test.equal(conversations.length, 0);
            utils.startNewConversation({ receiver: 'server@example.com',
                                         sender: 'client@example.com',
                                         performative: 'request',
                                         action: 'action' },{ email: 'server@example.com' },
                                         'request', 'server').
                then(function(conversation) {
                    // Connection should be open
                    test.equal(conversation.db.readyState, 1);
	            conversation.db.close();

                    test.equal(conversation.type, 'request');
                    test.equal(conversation.role, 'server');
                    test.equal(conversation.conversationId.search('client@example.com'), 0);
                    test.equal(conversation.socialCommitments.length, 0);
                    // This is true because no social commitments have been formed
                    test.equal(conversation.terminated, true);

                    // Make sure it is saved
                    var agentDb = new agentSchema('server@example.com');
                    agentDb.conversationModel.find({}, function(err, conversations) {
                            agentDb.connection.db.close();
                            if (err) {
                              console.log(err);
                              test.ok(false, err);
                            }
                            test.equal(conversations.length, 1);
                            test.equal(conversations[0].type, 'request');
                            test.equal(conversations[0].role, 'server');
                            test.equal(conversations[0].conversationId.search('client@example.com'), 0);
                            test.equal(conversations[0].socialCommitments.length, 0);
                            // This is true because no social commitments have been formed
                            test.equal(conversations[0].terminated, true);

                  	    test.done();
                      });
                  }).
                catch(function(err) {
                    console.log(err);
                    test.ok(false, err);
                    test.done();      
                  });
          });
    },

    'Add a new conversation with conversationId specified': function(test) {
        test.expect(13);
        var agentDb = new agentSchema('server@example.com');
        agentDb.conversationModel.find({}, function(err, conversations) {
            agentDb.connection.db.close();
            if (err) {
              console.log(err);
              test.ok(false, err);
            }
            test.equal(conversations.length, 0);
            utils.startNewConversation({ receiver: 'server@example.com',
                                         sender: 'client@example.com',
                                         performative: 'request',
                                         conversationId: 'some non-existent conversationId',
                                         action: 'action' },
                                       { email: 'server@example.com' },
                                       'request', 'server').
                then(function(conversation) {
                    // Connection should be open
                    test.equal(conversation.db.readyState, 1);
	            conversation.db.close();

                    test.equal(conversation.type, 'request');
                    test.equal(conversation.role, 'server');
                    test.equal(conversation.conversationId, 'some non-existent conversationId');
                    test.equal(conversation.socialCommitments.length, 0);
                    // This is true because no social commitments have been formed
                    test.equal(conversation.terminated, true);

                    // Make sure it is saved
                    var agentDb = new agentSchema('server@example.com');
                    agentDb.conversationModel.find({}, function(err, conversations) {
                            agentDb.connection.db.close();
                            if (err) {
                              console.log(err);
                              test.ok(false, err);
                            }
                            test.equal(conversations.length, 1);
                            test.equal(conversations[0].type, 'request');
                            test.equal(conversations[0].role, 'server');
                            test.equal(conversations[0].conversationId, 'some non-existent conversationId');
                            test.equal(conversations[0].socialCommitments.length, 0);
                            // This is true because no social commitments have been formed
                            test.equal(conversations[0].terminated, true);

                  	    test.done();
                      });
                  }).
                catch(function(err) {
                    console.log(err);
                    test.ok(false, err);
                    test.done();      
                  });
          });
    },

    'Do not add a conversation if the performative doesn\'t match a conversation template': function(test) {
        test.expect(4);
        var agentDb = new agentSchema('server@example.com');
        agentDb.conversationModel.find({}, function(err, conversations) {
            agentDb.connection.db.close();
            if (err) {
              console.log(err);
              test.ok(false, err);
            }
            test.equal(conversations.length, 0);
            utils.startNewConversation({ receiver: 'server@example.com',
                                         sender: 'client@example.com',
                                         performative: 'agree propose',
                                         conversationId: 'some non-existent conversationId',
                                         action: 'action' },
                                       { email: 'server@example.com' },
                                       'propose', 'server').
                then(function(conversation) {
                    console.log(conversation);
                    test.ok(false, 'Shouldn\'t get here');
                    test.done();      
                  }).
                catch(function(err) {
                    test.equal(err, 'There\'s no propose conversation for this agree propose');
                    agentDb = new agentSchema('server@example.com');
                    agentDb.conversationModel.find({}, function(err, conversations) {
                        agentDb.connection.db.close();
                        if (err) {
                          console.log(err);
                          test.ok(false, err);
                        }
                        test.equal(conversations.length, 0);
                        test.ok(true, err);
                        test.done();
                      });
                  });
          });
    },
};

/**
 * getRole
 */
exports.getRole = {

    setUp: function(callback) {

        var agentDb = new agentSchema('client@example.com');
        agentDb.connection.on('open', function(err) {
            if (err) {
              console.log(err)
            }
            agentDb.connection.db.dropDatabase(function(err) {
                var clientConversation = new agentDb.conversationModel({
                        type: 'request',
                        role: 'client',
                        conversationId: 'Some client conversation ID',
                  });

                clientConversation.save(function(err) {
                    agentDb.connection.db.close();

                    agentDb = new agentSchema('server@example.com'); agentDb.connection.on('open', function(err) { if (err) {
                          console.log(err)
                        }

                        var serverConversation = new agentDb.conversationModel({
                                type: 'request',
                                role: 'server',
                                conversationId: 'Some client conversation ID',
                              });
    
                        serverConversation.save(function(err) {
                            agentDb.connection.db.close();
                            if (err) {
                              console.log(err);
                            }
                            callback();
                          });
                      });
                  });
              });
          });
    },

    tearDown: function(callback) {
        var agentDb = new agentSchema('client@example.com');
        agentDb.connection.on('open', function(err) {
            agentDb.connection.db.dropDatabase(function(err) {
                agentDb.connection.db.close();

                agentDb = new agentSchema('server@example.com');
                agentDb.connection.on('open', function(err) {
                    agentDb.connection.db.dropDatabase(function(err) {
                        agentDb.connection.db.close();
                        if (err) {
                          console.log(err)
                        }
                        callback();
                      });
                  });
              });
          });
    },
    
    'Return \'client\' when sending a new request': function(test) {
        test.expect(1);
        utils.getRole({
                sender: 'client@example.com',
                receiver: 'server@example.com',
                performative: 'request',
                action: 'friend'}, false).
            then(function(role) {
                test.equal(role, 'client');
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
              });
    },

    'Return \'server\' when receiving a new request': function(test) {
        test.expect(1);
        utils.getRole({
                sender: 'client@example.com',
                receiver: 'server@example.com',
                performative: 'request',
                action: 'friend'}, true).
            then(function(role) {
                test.equal(role, 'server');
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
              });
    },
    
    'Return \'server\' when sending a new propose': function(test) {
        test.expect(1);
        utils.getRole({
                sender: 'server@example.com',
                receiver: 'client@example.com',
                performative: 'propose',
                action: 'friend'}, false).
            then(function(role) {
                test.equal(role, 'server');
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
              });
    },

    'Return \'client\' when receiving a new propose': function(test) {
        test.expect(1);
        utils.getRole({
                sender: 'server@example.com',
                receiver: 'client@example.com',
                performative: 'propose',
                action: 'friend'}, true).
            then(function(role) {
                test.equal(role, 'client');
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
              });
    },

    'Return \'client\' when receiving an \'agree request\'': function(test) {
        test.expect(1);
        utils.getRole({
                sender: 'server@example.com',
                receiver: 'client@example.com',
                performative: 'agree request',
                conversationId: 'Some client conversation ID',
                action: 'friend'}, true).
            then(function(role) {
                test.equal(role, 'client');
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },

    'Return \'server\' when sending an \'agree request\'': function(test) {
        test.expect(1);
        utils.getRole({
                sender: 'server@example.com',
                receiver: 'client@example.com',
                performative: 'agree request',
                conversationId: 'Some client conversation ID',
                action: 'friend'}, false).
            then(function(role) {
                test.equal(role, 'server');
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
 * getOptions
 */
exports.getOptions = {

    'Return the correct options for a web address': function(test) {
        test.expect(9);

        var content = { data: 'some data' };
        var options = utils.getOptions('https://mygebo.com:3443', '/', content);

        test.equal(options.host, 'mygebo.com');
        test.equal(options.port, '3443');
        test.equal(options.path, '/');
        test.equal(options.method, 'POST');
        test.equal(options.headers['Content-Type'], 'application/json'); 
        test.equal(options.headers['Content-Length'],  Buffer.byteLength(JSON.stringify(content))); 
        test.equal(options.rejectUnauthorized, false);
        test.equal(options.requestCert, true);
        test.equal(options.agent, false);
 
        test.done();
    },

    'Return the correct options for web address without a protocol': function(test) {
        test.expect(9);

        var content = { data: 'some data' };
        var options = utils.getOptions('mygebo.com:3443', '/', content);

        test.equal(options.host, 'mygebo.com');
        test.equal(options.port, '3443');
        test.equal(options.path, '/');
        test.equal(options.method, 'POST');
        test.equal(options.headers['Content-Type'], 'application/json'); 
        test.equal(options.headers['Content-Length'],  Buffer.byteLength(JSON.stringify(content))); 
        test.equal(options.rejectUnauthorized, false);
        test.equal(options.requestCert, true);
        test.equal(options.agent, false);
 
        test.done();
    },

    'Return the correct options for web address without a port': function(test) {
        test.expect(9);

        var content = { data: 'some data' };
        var options = utils.getOptions('mygebo.com', '/', content);

        test.equal(options.host, 'mygebo.com');
        test.equal(options.port, '443');
        test.equal(options.path, '/');
        test.equal(options.method, 'POST');
        test.equal(options.headers['Content-Type'], 'application/json'); 
        test.equal(options.headers['Content-Length'],  Buffer.byteLength(JSON.stringify(content))); 
        test.equal(options.rejectUnauthorized, false);
        test.equal(options.requestCert, true);
        test.equal(options.agent, false);
 
        test.done();
    },
};


/**
 * makeRequest
 */
exports.makeRequest = {

    'POST data to the destination specified': function(test) {
        test.expect(1);
        var content = { data: 'some data' };
        var scope = nock('https://somegebo.com').
                post('/receive').
                reply(200, { data: 'Here\'s what you want' });  

        utils.makeRequest('somegebo.com', '/receive', content).
            then(function(data) {
                scope.done();
                test.equal(data.data, 'Here\'s what you want'); 
                test.done();
              }).
            catch(function(err) {
                scope.done();
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },
};


