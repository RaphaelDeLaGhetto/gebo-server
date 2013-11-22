'use strict';

var agentSchema = require('../../schemata/agent'),
    utils = require('../../conversations/utils');

/**
 * loadConversation
 */
exports.loadConversation = {

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

    'Load an existing conversation': function(test) {
        test.expect(5);
        utils.loadConversation({ receiver: 'dan@example.com', conversationId: 'some conversation ID' }).
            then(function(conversation) {
				conversation.db.close();
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

    'Return an error if no matching conversation exists': function(test) {
        test.expect(1);
        utils.loadConversation({ receiver: 'dan@example.com',
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

    'Return a new conversation with conversationId if no ID set': function(test) {
        test.expect(6);
        utils.loadConversation({ receiver: 'dan@example.com', sender: 'yanfen@example.com' }, 'propose', 'server').
            then(function(conversation) {
				conversation.db.close();
                test.equal(conversation.type, 'propose');
                test.equal(conversation.role, 'server');
                test.equal(conversation.conversationId.search('yanfen@example.com'), 0); 
                test.equal(conversation.socialCommitments.length, 0);
                test.equal(conversation.terminated, false);

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


