/**
 * This ensures that a connection is made to the
 * test databases
 */
var nativeMongoConnection = require('../../lib/native-mongo-connection').get(true, function(){}),
    mongoose = require('gebo-mongoose-connection').get(true);

var mongo = require('mongodb'),
    utils = require('../../lib/utils'),
    extend = require('extend'),
    geboSchema = require('../../schemata/gebo'),
    agentSchema = require('../../schemata/agent'),
    sinon = require('sinon');

var nconf = require('nconf');
nconf.file({ file: 'gebo.json' });

var geboDb = new geboSchema(),
    agentDb = new agentSchema();


var COL_NAME = 'appCollection',
    HAI = 'A human-agent interface',
    IP = '127.0.0.1';


// Agent configs
var BASE_ADDRESS = 'http://theirhost.com';

var performRoute = require('../../routes/perform');
var perform = new performRoute();

var SIGNING_PAIR;
utils.getPrivateKeyAndCertificate().
    then(function(pair) {
        SIGNING_PAIR = pair
      });

/**
 * For testing the routes
 */
var CLIENT = 'yanfen@example.com',
    SERVER = nconf.get('testEmail');

var SEND_REQ = {
        body: { 
             sender: CLIENT,
             receiver: SERVER,
             action: 'ls',
             content: {
                resource: 'friends',
             }
          },
        user: { email: CLIENT, admin: false },
      };

var _code, _content;
var RES = {
    send: function(code, content) {
        _code = code;
        _content = content;
        return;
      }
  };

/**
 * handler
 */
exports.handler = {

    setUp: function(callback) {
        _code = undefined;
        _content = undefined;

        var friend = new agentDb.friendModel({
                            name: 'Yanfen',
                            email: CLIENT,
                            uri: BASE_ADDRESS,
                            _id: new mongo.ObjectID('23456789ABCD')
                        });
    
        friend.hisPermissions.push({ resource: 'friends' });
        
        friend.save(function(err) {
            if (err) {
              console.log(err);
            }
            callback();
          });
    },

    tearDown: function(callback) {
        agentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    },

    'Form a social commitment on receipt of a perform message': function(test) {
        test.expect(9);
        agentDb.socialCommitmentModel.find({}, function(err, scs) {
            test.equal(scs.length, 0);

            perform.handler(SEND_REQ, RES, function(err, results) { 
                if (err) {
                  test.ok(false, err);
                }

                agentDb.socialCommitmentModel.find({}, function(err, scs) {
                    test.equal(scs.length, 1);
                    test.equal(scs[0].performative, 'perform');
                    test.equal(scs[0].action, 'ls');
                    test.equal(!!scs[0].message, true);
                    test.equal(scs[0].creditor, CLIENT);
                    test.equal(scs[0].debtor, SERVER);
                    test.equal(!!scs[0].created, true);
                    // The successful call will immediately
                    // fulfil this commitment
                    test.equal(!!scs[0].fulfilled, true);
                    test.done();
                  });
              });
          });
    },

    'Respond with 401 unauthorized when an unknown agent makes tries to perform an action': function(test) {
        test.expect(3);
        var req = {};
        extend(true, req, SEND_REQ);
        req.user.email = 'some@foreignagent.com';

        perform.handler(req, RES, function(err, results) { 
            if (err) {
              test.equal(err, 'You are not allowed access to that resource');
            }
            test.equal(_code, 401);
            test.equal(_content, 'You are not allowed access to that resource');
            test.done();
          });

    },

    'Fulfil social commitment and return data when action is performed': function(test) {
        test.expect(13);

        // Make sure a friend has actually been written to the DB
        agentDb.friendModel.find({}, function(err, docs) {
            if (err) {
              test.ok(false, err);
            }
            test.equal(docs.length, 1);

            perform.handler(SEND_REQ, RES, function(err, results) { 
                if (err) {
                  test.ok(false, err);
                }
                // Return data
                test.equal(_code, 200);
                test.equal(_content.length, 1);
                test.equal(_content[0].name, 'Yanfen');
                test.equal(!!_content[0]._id, true);
                
                agentDb.socialCommitmentModel.find({}, function(err, scs) {
                    test.equal(scs.length, 1);
                    test.equal(scs[0].performative, 'perform');
                    test.equal(scs[0].action, 'ls');
                    test.equal(!!scs[0].message, true);
                    test.equal(scs[0].creditor, CLIENT);
                    test.equal(scs[0].debtor, nconf.get('testEmail'));
                    test.equal(!!scs[0].created, true);
                    test.equal(!!scs[0].fulfilled, true);
                    test.done();
                  });
              });
          });
    },

    'Return a 501 error if the agent does not know how to perform the requested action': function(test) {
        test.expect(2);

        var req = {};
        extend(true, req, SEND_REQ);
        req.body.action = 'bakeACake';

        perform.handler(req, RES, function(err, results) { 
            if (err) {
              test.ok(false, err);
            }
            test.equal(_code, 501);
            test.equal(_content, 'I don\'t know how to bakeACake');
            test.done();
        }); 
    },
};

// I can't figure out how to use sinon's mocks, stubs, etc.
// As such, I can't tell if passport.authenticate is being called
// TODO: figure out sinon
/**
 * authenticate
 */
exports.authenticate = {

    setUp: function(callback) {
        callback();
    },

    tearDown: function(callback) {
        callback();
    },

    'call passort.authenticate if no user in request': function(test) {
        test.done();
    },

    'do not call passort.authenticate if user in request': function(test) {
        test.done();
    },

};


/**
 * verify
 */
exports.verify = {

    setUp: function(callback) {
        try {
          /**
           * Setup an admin registrant
           */
          var adminRegistrant = new geboDb.registrantModel({
                  name: 'dan',
                  email: 'dan@example.com',
                  password: 'password123',
                  admin: true,
                  _id: new mongo.ObjectID('0123456789AB')
              });

          /**
           * Make a friendo for the gebo
           */
          var friendo = new agentDb.friendModel({ 
                    name: 'john',
                    email: 'john@painter.com',
                    uri: BASE_ADDRESS,
                    _id: new mongo.ObjectID('23456789ABCD')
                });

          /**
           * Create access permissions for imaginary collection
           */
          friendo.hisPermissions.push({ resource: 'painterApp' });

          /**
           * Create access permissions for action with no associated collection 
           */
          friendo.hisPermissions.push({ resource: 'getCurrentTime', read: false, execute: true });

          adminRegistrant.save(function(err) {
              if (err) {
                console.log(err);
              }
              friendo.save(function(err) {
                  if (err) {
                    console.log(err);
                  }
                  callback();
                });
            });
        }
        catch(err) {
            console.log(err);
            callback();
        }
    },

    tearDown: function(callback) {
        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err)
                }
                callback();
              });
          });
    },

    'Return permissions object for a friendo': function(test) {
        test.expect(5);
        perform.verify({ name: 'john', email: 'john@painter.com', admin: false },
                       { content: { resource: 'painterApp' } }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('painterApp')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, false); 
                test.equal(verified.admin, false);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Return permissions object for a friendo when content field is a string': function(test) {
        test.expect(5);
        perform.verify({ name: 'john', email: 'john@painter.com', admin: false },
                       { content: JSON.stringify({ resource: 'painterApp' }) }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('painterApp')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, false); 
                test.equal(verified.admin, false); 
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    /**
     * If no resource is specified, then there is no DB collection associated
     * with the attempted action. Thus, the action itself becomes the resource
     */
    'Return permissions object for a friendo when no resource is specified': function(test) {
        test.expect(5);
        perform.verify({ name: 'john', email: 'john@painter.com', admin: false },
                       { action: 'getCurrentTime' }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('getCurrentTime')); 
                test.equal(verified.read, false); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, true); 
                test.equal(verified.admin, false); 
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for a friendo without permission to access the specified resource': function(test) {
        test.expect(5);
        perform.verify({ name: 'john', email: 'john@painter.com', admin: false },
                       { action: 'ls' }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('ls')); 
                test.equal(verified.read, false); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, false); 
                test.equal(verified.admin, false); 
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for an adminstrator': function(test) {
        test.expect(5);
        perform.verify({ name: 'dan', email: 'dan@example.com', admin: true },
                       { content: { resource: 'painterApp' } }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('painterApp')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, true); 
                test.equal(verified.execute, true); 
                test.equal(verified.admin, true); 
                test.done();      
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for an administrator when no resource is specified': function(test) {
        test.expect(5);
        perform.verify({ name: 'dan', email: 'dan@example.com', admin: true },
                       { action: 'getCurrentTime' }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('getCurrentTime')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, true); 
                test.equal(verified.execute, true); 
                test.equal(verified.admin, true); 
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for a non-friendo': function(test) {
        test.expect(5);
        perform.verify({ name: 'richard', email: 'richard@construction.com', admin: false },
                       { content: { resource: 'painterApp' } }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('painterApp')); 
                test.equal(verified.read, false); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, false); 
                test.equal(verified.admin, false);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Return permissions object for a non-friendo when no resource is specified': function(test) {
        test.expect(5);
        perform.verify({ name: 'richard', email: 'richard@construction.com', admin: false },
                       { action: 'getCurrentTime' }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('getCurrentTime')); 
                test.equal(verified.read, false); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, false); 
                test.equal(verified.admin, false);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },
};

/**
 * handler
 */
exports.handler = {

    setUp: function(callback) {
        _code = undefined;
        _content = undefined;

        var friend = new agentDb.friendModel({
                            name: 'Yanfen',
                            email: CLIENT,
                            uri: BASE_ADDRESS,
                            _id: new mongo.ObjectID('23456789ABCD')
                        });
    
        friend.hisPermissions.push({ resource: 'friends' });
        
        friend.save(function(err) {
            if (err) {
              console.log(err);
            }
            callback();
          });
    },

    tearDown: function(callback) {
        agentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    },

    'Form a social commitment on receipt of a perform message': function(test) {
        test.expect(9);
        agentDb.socialCommitmentModel.find({}, function(err, scs) {
            test.equal(scs.length, 0);

            perform.handler(SEND_REQ, RES, function(err, results) { 
                if (err) {
                  test.ok(false, err);
                }

                agentDb.socialCommitmentModel.find({}, function(err, scs) {
                    test.equal(scs.length, 1);
                    test.equal(scs[0].performative, 'perform');
                    test.equal(scs[0].action, 'ls');
                    test.equal(!!scs[0].message, true);
                    test.equal(scs[0].creditor, CLIENT);
                    test.equal(scs[0].debtor, SERVER);
                    test.equal(!!scs[0].created, true);
                    // The successful call will immediately
                    // fulfil this commitment
                    test.equal(!!scs[0].fulfilled, true);
                    test.done();
                  });
              });
          });
    },

    'Respond with 401 unauthorized when an unknown agent makes tries to perform an action': function(test) {
        test.expect(3);
        var req = {};
        extend(true, req, SEND_REQ);
        req.user.email = 'some@foreignagent.com';

        perform.handler(req, RES, function(err, results) { 
            if (err) {
              test.equal(err, 'You are not allowed access to that resource');
            }
            test.equal(_code, 401);
            test.equal(_content, 'You are not allowed access to that resource');
            test.done();
          });

    },

    'Fulfil social commitment and return data when action is performed': function(test) {
        test.expect(13);

        // Make sure a friend has actually been written to the DB
        agentDb.friendModel.find({}, function(err, docs) {
            if (err) {
              test.ok(false, err);
            }
            test.equal(docs.length, 1);

            perform.handler(SEND_REQ, RES, function(err, results) { 
                if (err) {
                  test.ok(false, err);
                }
                // Return data
                test.equal(_code, 200);
                test.equal(_content.length, 1);
                test.equal(_content[0].name, 'Yanfen');
                test.equal(!!_content[0]._id, true);
                
                agentDb.socialCommitmentModel.find({}, function(err, scs) {
                    test.equal(scs.length, 1);
                    test.equal(scs[0].performative, 'perform');
                    test.equal(scs[0].action, 'ls');
                    test.equal(!!scs[0].message, true);
                    test.equal(scs[0].creditor, CLIENT);
                    test.equal(scs[0].debtor, nconf.get('testEmail'));
                    test.equal(!!scs[0].created, true);
                    test.equal(!!scs[0].fulfilled, true);
                    test.done();
                  });
              });
          });
    },

    'Return a 501 error if the agent does not know how to perform the requested action': function(test) {
        test.expect(2);

        var req = {};
        extend(true, req, SEND_REQ);
        req.body.action = 'bakeACake';

        perform.handler(req, RES, function(err, results) { 
            if (err) {
              test.ok(false, err);
            }
            test.equal(_code, 501);
            test.equal(_content, 'I don\'t know how to bakeACake');
            test.done();
        }); 
    },
};

// I can't figure out how to use sinon's mocks, stubs, etc.
// As such, I can't tell if passport.authenticate is being called
// TODO: figure out sinon
/**
 * authenticate
 */
exports.authenticate = {

    setUp: function(callback) {
        callback();
    },

    tearDown: function(callback) {
        callback();
    },

    'call passort.authenticate if no user in request': function(test) {
        test.done();
    },

    'do not call passort.authenticate if user in request': function(test) {
        test.done();
    },

};
