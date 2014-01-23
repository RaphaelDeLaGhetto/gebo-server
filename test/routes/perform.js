var config = require('../../config/config'),
    nconf = require('nconf'),
    mongo = require('mongodb'),
    utils = require('../../lib/utils'),
    extend = require('extend'),
    geboSchema = require('../../schemata/gebo'),
    agentSchema = require('../../schemata/agent');

nconf.file({ file: 'gebo.json' });

var COL_NAME = 'appCollection',
//    ADMIN_TOKEN = '1234',
//    USER_TOKEN = '5678',
//    ACCESS_TOKEN = '9012',
    HAI = 'A human-agent interface',
    IP = '127.0.0.1';


// Agent configs
var BASE_ADDRESS = 'http://theirhost.com';

var performRoute = require('../../routes/perform');
var perform = new performRoute(nconf.get('testDb'));

var SIGNING_PAIR;
utils.getPrivateKeyAndCertificate().
    then(function(pair) {
        SIGNING_PAIR = pair
      });

var geboDb = new geboSchema(nconf.get('testDb'));

/**
 * For testing the routes
 */
var CLIENT = 'yanfen@example.com',
    SERVER = 'dan@example.com';

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
 * verify
 */
exports.verify = {

    setUp: function(callback) {
        try {
            /**
             * Setup a registrant
             */
            var adminRegistrant = new geboDb.registrantModel({
                    name: 'dan',
                    email: 'dan@example.com',
                    password: 'password123',
                    admin: true,
                    _id: new mongo.ObjectID('0123456789AB')
                });
          
            /**
             * Make a friend for the registrant
             */
            var adminAgentDb = new agentSchema('dan@example.com');
            var adminFriend = new adminAgentDb.friendModel({
                    name: 'john',
                    email: 'john@painter.com',
                    uri: BASE_ADDRESS,
                    _id: new mongo.ObjectID('23456789ABCD')
                });

            /**
             * Create access permissions for imaginary collection
             */
            adminFriend.hisPermissions.push({ email: 'app@painter.com' });

            /** 
             * Set up another registrant
             */
            var registrant = new geboDb.registrantModel({
                    name: 'yanfen',
                    email: 'yanfen@example.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('123456789ABC')
                });

            /**
             * Make a friend for the new registrant
             */
            var regularAgentDb = new agentSchema('yanfen@example.com');
            var friend = new regularAgentDb.friendModel({
                    name: 'richard',
                    email: 'richard@construction.com',
                    uri: BASE_ADDRESS,
                    _id: new mongo.ObjectID('3456789ABCDE')
                });

            /**
             * Create access permissions for imaginary collection
             */
            friend.hisPermissions.push({ email: 'someotherapp@example.com' });
            friend.hisPermissions.push({ email: 'app@construction.com' });

            // There has got to be a better way to do this...
            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                friend.save(function(err) {
                    if (err) {
                      console.log(err);
                    }
                    regularAgentDb.connection.db.close();
                    adminRegistrant.save(function(err) {
                        if (err) {
                          console.log(err);
                        }
                        adminFriend.save(function(err) {
                            if (err) {
                              console.log(err);
                            }
                            adminAgentDb.connection.db.close();
                            callback();
                          });
                      });
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
          });

        var regularAgentDb = new agentSchema('yanfen@example.com');
        regularAgentDb.connection.on('open', function(err) {
            regularAgentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err)
                }
                regularAgentDb.connection.db.close();

                var adminAgentDb = new agentSchema('dan@example.com');
                adminAgentDb.connection.on('open', function(err) {
                    adminAgentDb.connection.db.dropDatabase(function(err) {
                        if (err) {
                          console.log(err)
                        }
                        adminAgentDb.connection.db.close();
                        callback();
                      });
                  });
              });
          });
    },

    'Return permissions object for a friend attempting to perform an action on a resource owned by a citizen agent': function(test) {
        test.expect(6);
        perform.verify({ name: 'richard', email: 'richard@construction.com', admin: false },
                       { receiver: 'yanfen@example.com', content: { resource: 'app@construction.com' } }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('yanfen@example.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('app@construction.com')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, false); 
                test.equal(verified.admin, false); 
                test.done();
              }).
            catch(function(err) {
                console.log('err');
                console.log(err);
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object (as above) when content field is a string': function(test) {
        test.expect(6);
        perform.verify({ name: 'richard', email: 'richard@construction.com', admin: false },
                       { receiver: 'yanfen@example.com',
						 content: JSON.stringify({ resource: 'app@construction.com' }) }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('yanfen@example.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('app@construction.com')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, false); 
                test.equal(verified.admin, false); 
                test.done();
              }).
            catch(function(err) {
                console.log('err');
                console.log(err);
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for a friend attempting to perform an action on a resource owned by an admin agent': function(test) {
        test.expect(6);
        perform.verify({ name: 'john', email: 'john@painter.com', admin: false },
                       { receiver: 'dan@example.com', content: { resource: 'app@painter.com' } }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('dan@example.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('app@painter.com')); 
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
    
    'Return permissions object for an admin agent attempting to perform an action on a friend\'s resource': function(test) {
        test.expect(6);
        perform.verify({ name: 'richard', email: 'richard@construction.com', admin: true },
                       { receiver: 'yanfen@example.com', content: { resource: 'someotherapp@example.com' } }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('yanfen@example.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('someotherapp@example.com')); 
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

    'Return permissions object for a regular agent attempting to perform an action on his own resource with dbName param set': function(test) {
        test.expect(6);
        perform.verify({ name: 'yanfen', email: 'yanfen@example.com', admin: false },
                       { receiver: 'yanfen@example.com', content: { resource: 'someotherapp@example.com' } }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('yanfen@example.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('someotherapp@example.com')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, true); 
                test.equal(verified.execute, true); 
                test.equal(verified.admin, false); 
                test.done();      
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for a regular agent attempting to perform an action on his own resource without dbName param set': function(test) {
        test.expect(6);
        perform.verify({ name: 'yanfen', email: 'yanfen@example.com', admin: false },
                       { content: { resource: 'someotherapp@example.com' } }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('yanfen@example.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('someotherapp@example.com')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, true); 
                test.equal(verified.execute, true); 
                test.equal(verified.admin, false); 
                test.done();      
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for an admin agent attempting to perform an action on his own resource with dbName param set': function(test) {
        test.expect(6);
        perform.verify({ name: 'dan', email: 'dan@example.com', admin: true },
                       { receiver: 'dan@example.com', content: { resource: 'app@painter.com' } }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('dan@example.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('app@painter.com')); 
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

    'Return permissions object for an admin agent attempting to perform an action on his own resource with dbName param set': function(test) {
        test.expect(6);
        perform.verify({ name: 'dan', email: 'dan@example.com', admin: true },
                       { content: { resource: 'app@painter.com' } }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('dan@example.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('app@painter.com')); 
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

    'Return permissions object for an admin agent attempting to perform an action on a non-friend\'s resources': function(test) {
        test.expect(6);
        perform.verify({ name: 'dan', email: 'dan@example.com', admin: true },
                       { receiver: 'yanfen@example.com', content: { resource: 'app@construction.com' } }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('yanfen@example.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('app@construction.com')); 
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

    'Return a permissions object for a non-friend (non-admin) attempting to perform an action on a resource': function(test) {
        test.expect(5);
        perform.verify({ name: 'dan', email: 'dan@example.com', admin: false },
                       { receiver: 'yanfen@example.com', content: { resource: 'app@construction.com' } }).
            then(function(verified) {
                test.equal(verified.dbName, 'yanfen_at_example_dot_com');
                test.equal(verified.collectionName, 'app@construction.com');
                test.equal(verified.read, false);
                test.equal(verified.write, false);
                test.equal(verified.execute, false);
                test.done();      
              }).
            catch(function(err) {
                test.ok(false, 'rwx permission should have been denied in each case');
                test.done();      
              });
    },

    'Return a permissions object for a friend who has not been granted to the resource in question': function(test) {
        test.expect(5);
        perform.verify({ name: 'richard', email: 'richard@construction.com', admin: false },
                       { receiver: 'yanfen@example.com', content: { resource: 'someother@inaccessibleapp.com' } }).
            then(function(verified) {
                test.equal(verified.dbName, 'yanfen_at_example_dot_com');
                test.equal(verified.collectionName, 'someother@inaccessibleapp.com');
                test.equal(verified.read, false);
                test.equal(verified.write, false);
                test.equal(verified.execute, false);
                test.done();      
              }).
            catch(function(err) {
                test.ok(false, 'rwx permission should have been denied in each case');
                test.done();
              });
    },

    'Return a permissions object for a friend when no resource is specified': function(test) {
        test.expect(5);
        perform.verify({ name: 'richard', email: 'richard@construction.com', admin: false },
                       { receiver: 'yanfen@example.com' }).
            then(function(verified) {
                test.equal(verified.dbName, 'yanfen_at_example_dot_com');
                test.equal(verified.collectionName, undefined);
                test.equal(verified.read, false);
                test.equal(verified.write, false);
                test.equal(verified.execute, false);
                test.done();      
              }).
            catch(function(err) {
                test.ok(false, 'rwx permission have been denied in each case');
                test.done();
              });
    },

    'Return a permissions object for a non-friend when no resource is specified': function(test) {
        test.expect(5);
        perform.verify({ name: 'dan', email: 'dan@example.com', admin: false },
                       { receiver: 'yanfen@example.com' }).
            then(function(verified) {
                test.equal(verified.dbName, 'yanfen_at_example_dot_com');
                test.equal(verified.collectionName, undefined);
                test.equal(verified.read, false);
                test.equal(verified.write, false);
                test.equal(verified.execute, false);
                test.done();      
              }).
            catch(function(err) {
                test.ok(false, 'rwx permission have been denied in each case');
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

        var agentDb = new agentSchema(SERVER);
        var friend = new agentDb.friendModel({
                            name: 'Yanfen',
                            email: CLIENT,
                            uri: BASE_ADDRESS,
                            _id: new mongo.ObjectID('23456789ABCD')
                        });

        friend.hisPermissions.push({ email: 'friends' });
        
        friend.save(function(err) {
            agentDb.connection.db.close();
            if (err) {
              console.log(err);
            }
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

    'Form a social commitment on receipt of a perform message': function(test) {
        test.expect(9);
        var agentDb = new agentSchema(SERVER);
        agentDb.socialCommitmentModel.find({}, function(err, scs) {
            agentDb.connection.db.close();
            test.equal(scs.length, 0);

            perform.handler(SEND_REQ, RES, function(err, results) { 
                if (err) {
                  console.log(err);
                  test.ok(false, err);
                }

                var agentDb = new agentSchema(SERVER);
                agentDb.socialCommitmentModel.find({}, function(err, scs) {
                    agentDb.connection.db.close();
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
        test.expect(12);
        perform.handler(SEND_REQ, RES, function(err, results) { 
            if (err) {
              console.log(err);
              test.ok(false, err);
            }
            // Return data
            test.equal(_code, 200);
            test.equal(_content.length, 1);
            test.equal(_content[0].name, 'Yanfen');
            test.equal(!!_content[0]._id, true);
            
            var agentDb = new agentSchema(SERVER);
            agentDb.socialCommitmentModel.find({}, function(err, scs) {
                agentDb.connection.db.close();
                test.equal(scs.length, 1);
                test.equal(scs[0].performative, 'perform');
                test.equal(scs[0].action, 'ls');
                test.equal(!!scs[0].message, true);
                test.equal(scs[0].creditor, CLIENT);
                test.equal(scs[0].debtor, SERVER);
                test.equal(!!scs[0].created, true);
                test.equal(!!scs[0].fulfilled, true);
                test.done();
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
              console.log(err);
              test.ok(false, err);
            }
            test.equal(_code, 501);
            test.equal(_content, 'I don\'t know how to bakeACake');
            test.done();
        }); 
    },
};

