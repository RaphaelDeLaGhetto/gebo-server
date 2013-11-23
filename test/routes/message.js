'use strict';

var message = require('../../routes/message'),
    q = require('q'),
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
        console.log('send called');
        _code = code;
        _content = content;
        console.log(_code);
        console.log(_content);
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

    'It should create a new conversation when no conversationId provided': function(test) {
        test.expect(6);
        var agentDb = new agentSchema(CLIENT);
        agentDb.conversationModel.find({}, function(err, conversations) {
            if (err) {
              console.log(err);
              test.ok(false, err);
            }
            test.equal(_code, undefined);
            test.equal(_content, undefined);
            test.equal(conversations.length, 1);
            message.sendMessageHandler(SEND_REQ, RES);

            agentDb.conversationModel.find({}, function(err, c) {
                console.log('c');
                console.log(c);
                //agentDb.connection.db.close();
                test.equal(c.length, 2);
                test.equal(_code, 200);
//                test.equal(_content, undefined);
                test.done();
               });
          });
    }
};
