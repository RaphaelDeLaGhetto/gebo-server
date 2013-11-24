'use strict';

var message = require('../../routes/message'),
    q = require('q'),
    extend = require('extend'),
    agentSchema = require('../../schemata/agent');

var CLIENT = 'yanfen@example.com',
    SERVER = 'dan@example.com';

var SEND_REQ = {
    body: { 
         sender: CLIENT,
         receiver: SERVER,
         performative: 'request',
         action: 'friend',
      },
    user: { email: CLIENT },
  }

var _code, _content;
var RES = {
    send: function(code, content) {
        _code = code;
        _content = content;
        return;
      }
  }

/**
 * sendMessageHandler
 */
exports.sendMessageHandler = {

    setUp: function(callback) {
        _code = undefined;
        _content = undefined;

        var agentDb = new agentSchema(CLIENT);
        agentDb.connection.on('open', function(err) {
            if (err) {
              console.log(err)
            }
            agentDb.connection.db.dropDatabase(function(err) {
                    var conversation = new agentDb.conversationModel({
                            type: 'request',
                            role: 'client',
                            conversationId: 'Some conversation ID',
                          });
                    conversation.save(function(err) {
                            agentDb.connection.db.close();
                            if (err) {
                              console.log(err);
                            }
                            callback();
                          });
              });
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

    'Should create a new conversation when no conversationId provided': function(test) {
        test.expect(13);
        var agentDb = new agentSchema(CLIENT);
        agentDb.conversationModel.find({}, function(err, conversations) {
            agentDb.connection.db.close();
            if (err) {
              console.log(err);
              test.ok(false, err);
            }
            test.equal(_code, undefined);
            test.equal(_content, undefined);
            test.equal(conversations.length, 1);

            message.sendMessageHandler(SEND_REQ, RES, function(err, result) {
                    var agentDb = new agentSchema(CLIENT);
                    agentDb.conversationModel.find({}, function(err, conversations) {
                            agentDb.connection.db.close();
                            test.equal(conversations.length, 2);
                            test.equal(_code, 200);
                            test.equal(_content.conversationId.search(CLIENT), 0);
                            test.equal(conversations[1].conversationId.search(CLIENT), 0);
                            test.equal(_content.type, 'request');
                            test.equal(conversations[1].type, 'request');
                            test.equal(_content.socialCommitments.length, 1);
                            test.equal(conversations[1].socialCommitments.length, 1);
                            test.equal(_content.socialCommitments[0].performative, 'reply request');
                            test.equal(conversations[1].socialCommitments[0].performative, 'reply request');
                            test.done();
                      });
              });
          });
    },

    'Should return an ongoing conversation when a conversationId is provided': function(test) {
        test.expect(13);
        var agentDb = new agentSchema(CLIENT);
        agentDb.conversationModel.find({}, function(err, conversations) {
            agentDb.connection.db.close();
            if (err) {
              console.log(err);
              test.ok(false, err);
            }
            test.equal(_code, undefined);
            test.equal(_content, undefined);
            test.equal(conversations.length, 1);

            var req = { body: { conversationId: 'Some conversation ID' } };
            extend(true, req, SEND_REQ);
            message.sendMessageHandler(req, RES, function(err, result) {
                    var agentDb = new agentSchema(CLIENT);
                    agentDb.conversationModel.find({}, function(err, conversations) {
                            agentDb.connection.db.close();
                            test.equal(conversations.length, 1);
                            test.equal(_code, 200);
                            test.equal(_content.conversationId, 'Some conversation ID');
                            test.equal(conversations[0].conversationId, 'Some conversation ID');
                            test.equal(_content.type, 'request');
                            test.equal(conversations[0].type, 'request');
                            test.equal(_content.socialCommitments.length, 1);
                            test.equal(conversations[0].socialCommitments.length, 1);
                            test.equal(_content.socialCommitments[0].performative, 'reply request');
                            test.equal(conversations[0].socialCommitments[0].performative, 'reply request');
                            test.done();
                      });
              });
          });
    },
};
