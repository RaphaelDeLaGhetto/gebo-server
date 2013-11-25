'use strict';

var agentSchema = require('../../schemata/agent'),
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
        test.expect(5);
        utils.loadConversation({ receiver: 'dan@example.com',
                                 conversationId: 'some conversation ID' },
                               { email: 'dan@example.com' }).
            then(function(conversation) {
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

    'Return an error if no matching conversation exists': function(test) {
        test.expect(1);
        utils.loadConversation({ receiver: 'dan@example.com',
                                 conversationId: 'some non-existent conversation ID' },
                               { email: 'dan@example.com' }).
            then(function(conversation) {
                test.ok(false, 'Should not get here');
                test.done();
              }).
            catch(function(err) {
                test.equal(err, 'Conversation: some non-existent conversation ID does not exist');
                test.done();
              });
    },

    'Return a new conversation with conversationId if no ID set': function(test) {
        test.expect(6);
        utils.loadConversation({ receiver: 'dan@example.com', sender: 'yanfen@example.com' },
                               { email: 'dan@example.com' }, 'propose', 'server').
            then(function(conversation) {
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
