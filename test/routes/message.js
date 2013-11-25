'use strict';

var message = require('../../routes/message'),
    nock = require('nock'),
    q = require('q'),
    extend = require('extend'),
    nconf = require('nconf'),
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

        var scope = nock(nconf.get('domain')).
                post('/receive').
                reply(200, { data: 'Okay' });  

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
                            if (err) {
                              console.log(err);
                              test.ok(false, err);
                            }
                            scope.done();
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

        var scope = nock(nconf.get('domain')).
                post('/receive').
                reply(200, { data: 'Okay' });  

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

    'POST message to citizen agent if no gebo URI provided': function(test) {
        test.expect(5);

        var scope = nock(nconf.get('domain')).
                post('/receive').
                reply(200, { data: 'Okay' });  

        message.sendMessageHandler(SEND_REQ, RES, function(err, result) {
            scope.done();
            test.equal(_code, 200);
            test.equal(_content.conversationId.search('yanfen@example.com'), 0);
            test.equal(_content.type, 'request');
            test.equal(_content.socialCommitments.length, 1);
            test.equal(_content.socialCommitments[0].performative, 'reply request');
            test.done();
          });
     },

    'POST message to foreign agent if gebo URI provided': function(test) {
        test.expect(5);

        var scope = nock('https://foreigngebo.com').
                post('/receive').
                reply(200, { data: 'Okay' });  

        var req = { body: { gebo: 'https://foreigngebo.com' } };
        extend(true, req, SEND_REQ);
        message.sendMessageHandler(req, RES, function(err, result) {
            test.equal(_code, 200);
            test.equal(_content.conversationId.search('yanfen@example.com'), 0);
            test.equal(_content.type, 'request');
            test.equal(_content.socialCommitments.length, 1);
            test.equal(_content.socialCommitments[0].performative, 'reply request');
            test.done();
          });
    },
};

/**
 * receive
 */
exports.receive = {
    setUp: function(callback) {
        _code = undefined;
        _content = undefined;

        var agentDb = new agentSchema(SERVER);
        agentDb.connection.on('open', function(err) {
            if (err) {
              console.log(err)
            }
            agentDb.connection.db.dropDatabase(function(err) {
                    var conversation = new agentDb.conversationModel({
                            type: 'request',
                            role: 'server',
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

    'Should create a new conversation when matching conversationId doesn\'t exist': function(test) {
        test.expect(15);

        var agentDb = new agentSchema(SERVER);
        agentDb.conversationModel.find({}, function(err, conversations) {
            agentDb.connection.db.close();
            if (err) {
              console.log(err);
              test.ok(false, err);
            }
            test.equal(_code, undefined);
            test.equal(_content, undefined);
            test.equal(conversations.length, 1);

            var req = {};
            extend(true, req, SEND_REQ);
            req.user.email = SERVER;
 
            message.receive(req, RES, function(err, result) {
                    var agentDb = new agentSchema(SERVER);
                    agentDb.conversationModel.find({}, function(err, conversations) {
                            if (err) {
                              console.log(err);
                              test.ok(false, err);
                            }
                            agentDb.connection.db.close();
                            test.equal(conversations.length, 2);
                            test.equal(_code, 200);
                            test.equal(_content.conversationId.search(CLIENT), 0);
                            test.equal(conversations[1].conversationId.search(CLIENT), 0);
                            test.equal(_content.role, 'server');
                            test.equal(conversations[1].role, 'server');
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

    'Should return an ongoing conversation when a conversationId exists': function(test) {
//        test.expect(13);
//
//        var agentDb = new agentSchema(CLIENT);
//        agentDb.conversationModel.find({}, function(err, conversations) {
//            agentDb.connection.db.close();
//            if (err) {
//              console.log(err);
//              test.ok(false, err);
//            }
//            test.equal(_code, undefined);
//            test.equal(_content, undefined);
//            test.equal(conversations.length, 1);
//
//            var req = { body: { conversationId: 'Some conversation ID' } };
//            extend(true, req, SEND_REQ);
//            message.receive(req, RES, function(err, result) {
//                    var agentDb = new agentSchema(CLIENT);
//                    agentDb.conversationModel.find({}, function(err, conversations) {
//                            agentDb.connection.db.close();
//                            test.equal(conversations.length, 1);
//                            test.equal(_code, 200);
//                            test.equal(_content.conversationId, 'Some conversation ID');
//                            test.equal(conversations[0].conversationId, 'Some conversation ID');
//                            test.equal(_content.type, 'request');
//                            test.equal(conversations[0].type, 'request');
//                            test.equal(_content.socialCommitments.length, 1);
//                            test.equal(conversations[0].socialCommitments.length, 1);
//                            test.equal(_content.socialCommitments[0].performative, 'reply request');
//                            test.equal(conversations[0].socialCommitments[0].performative, 'reply request');
                            test.done();
//                      });
//              });
//          });
    },
};
