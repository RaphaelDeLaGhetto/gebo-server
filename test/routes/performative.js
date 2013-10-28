var config = require('../../config/config'),
    nconf = require('nconf'),
    mongo = require('mongodb'),
    geboSchema = require('../../schemata/gebo');
    agentSchema = require('../../schemata/agent');

var COL_NAME = 'appCollection',
    ADMIN_TOKEN = '1234',
    USER_TOKEN = '5678',
    ACCESS_TOKEN = '9012',
    HAI = 'A human-agent interface',
    IP = '127.0.0.1';


// Agent configs
var BASE_ADDRESS = 'http://theirhost.com';

var performativeRoute = require('../../routes/performative');

var geboDb = new geboSchema(nconf.get('testDb')),
    adminAgentDb = new agentSchema('dan@hg.com'),
    regularAgentDb = new agentSchema('yanfen@hg.com');

/**
 * verify
 */
//exports.verify = {
//
//    setUp: function(callback) {
//        try {
//            /**
//             * Setup a registrant
//             */
//            var adminRegistrant = new geboDb.registrantModel({
//                    name: 'dan',
//                    email: 'dan@hg.com',
//                    password: 'password123',
//                    admin: true,
//                    _id: new mongo.ObjectID('0123456789AB')
//                });
//          
//            /**
//             * Make a friend for the registrant
//             */
//            var adminFriend = new adminAgentDb.friendModel({
//                    name: 'john',
//                    email: 'john@painter.com',
//                    uri: BASE_ADDRESS,
//                    _id: new mongo.ObjectID('23456789ABCD')
//                });
//
//            /**
//             * Create access permissions for imaginary collection
//             */
//            adminFriend.hisPermissions.push({ email: 'john@painter.com' });
//
//            /**
//             * Create an access token for the friend
//             */
//            var adminToken = new geboDb.tokenModel({
//                    registrantId: new mongo.ObjectID('0123456789AB'),
//                    friendId: new mongo.ObjectID('23456789ABCD'),
//                    hai: HAI,
//                    ip: IP,
//                    string: ADMIN_TOKEN,
//                });
//
//            /** 
//             * Set up another registrant
//             */
//            var registrant = new geboDb.registrantModel({
//                    name: 'yanfen',
//                    email: 'yanfen@hg.com',
//                    password: 'password123',
//                    admin: false,
//                    _id: new mongo.ObjectID('123456789ABC')
//                });
//
//            /**
//             * Make a friend for the new registrant
//             */
//            var friend = new regularAgentDb.friendModel({
//                    name: 'richard',
//                    email: 'richard@construction.com',
//                    uri: BASE_ADDRESS,
//                    _id: new mongo.ObjectID('3456789ABCDE')
//                });
//
//            /**
//             * Create access permissions for imaginary collection
//             */
//            friend.hisPermissions.push({ email: 'someotherapp@example.com' });
//            friend.hisPermissions.push({ email: 'richard@construction.com' });
//
//            /**
//             * Create an access token for the friend
//             */
//            var token = new geboDb.tokenModel({
//                    registrantId: new mongo.ObjectID('123456789ABC'),
//                    friendId: new mongo.ObjectID('3456789ABCDE'),
//                    hai: HAI,
//                    ip: IP,
//                    string: USER_TOKEN,
//                });
//
//            // There has got to be a better way to do this...
//            registrant.save(function(err) {
//                if (err) {
//                  console.log(err);
//                }
//                token.save(function(err) {
//                     if (err) {
//                      console.log(err);
//                    }
//                    friend.save(function(err) {
//                        if (err) {
//                          console.log(err);
//                        }
//                        adminRegistrant.save(function(err) {
//                            if (err) {
//                              console.log(err);
//                            }
//                            adminToken.save(function(err) {
//                                 if (err) {
//                                  console.log(err);
//                                }
//                                adminFriend.save(function(err) {
//                                    if (err) {
//                                      console.log(err);
//                                    }
//                                    callback();
//                                  });
//                              });
//                          });
//                      });
//                  });
//              });
//        }
//        catch(err) {
//            console.log(err);
//            callback();
//        }
//    },
//
//    tearDown: function(callback) {
//        regularAgentDb.connection.db.dropDatabase(function(err) {
//            if (err) {
//              console.log(err)
//            }
//          });
//
//        geboDb.connection.db.dropDatabase(function(err) {
//            if (err) {
//              console.log(err)
//            }
//          });
//
//        adminAgentDb.connection.db.dropDatabase(function(err) {
//            if (err) {
//              console.log(err)
//            }
//            callback();
//          });
//    },
//
//    /**
//     * The friend doesn't own the resource, his app just created the data.
//     * That is, the friendEmail and resourceEmail parameters are the same.
//     */
//    'Return permissions for a friend requesting his own app\'s resources': function(test) {
//        test.expect(3);
//        var performative = new performativeRoute(nconf.get('testDb'));
//        performative.verify(USER_TOKEN, 'richard@construction.com', 'richard@construction.com').
//            then(function(permissions) {
//                test.equal(permissions.read, true);
//                test.equal(permissions.write, false);
//                test.equal(permissions.execute, false);
//                test.done();
//              });
//    },

//    'Return permissions for a friend requesting another app\'s resources': function(test) {
//        test.expect(6);
//        var performative = new performativeRoute(nconf.get('testDb'));
//        performative.verify(USER_TOKEN, 'richard@construction.com', 'someotherapp@example.com').
//            then(function(permissions) {
//                test.equal(permissions.read, true);
//                test.equal(permissions.write, false);
//                test.equal(permissions.execute, false);
//                test.equal(permissions.collectionName, 'someotherapp@example.com');
//                test.equal(permissions.dbName, 'yanfen_at_hg_dot_com');
//                test.equal(permissions.admin, false);
//                test.done();
//              });
//    },
//
//    'Do not barf if access has not been granted to the requested resource': function(test) {
//        test.expect(1);
//        var performative = new performativeRoute(nconf.get('testDb'));
//        performative.verify(ADMIN_TOKEN, 'john@painter.com', 'someotherapp@example.com').
//            then(function(permissions) {
//                test.ok(false, 'Permission should not have been granted');
//                test.done();
//              }).
//            catch(function(err) {
//                test.equal(err, 'You don\'t have access to that resource');       
//                test.done();
//              });
//    },
//
//    'Do not barf if a non-friend requests a resource': function(test) {
//        test.expect(1);
//        var performative = new performativeRoute(nconf.get('testDb'));
//        performative.verify(ADMIN_TOKEN, 'my@enemy.com', 'someotherapp@example.com').
//            then(function(permissions) {
//                test.ok(false, 'Permission should not have been granted');
//                test.done();
//              }).
//            catch(function(err) {
//                test.equal(err, 'I don\'t know you');       
//                test.done();
//              });
//    },
//
//    'Do not barf if the token provided does not exist': function(test) {
//        test.expect(1);
//        var performative = new performativeRoute(nconf.get('testDb'));
//        performative.verify('n0sucht0ken', 'john@painter.com', 'john@painter.com').
//            then(function(permissions) {
//                test.ok(false, 'Permission should not have been granted');
//                test.done();
//              }).
//            catch(function(err) {
//                test.equal(err, 'The token provided is invalid');       
//                test.done();
//              });
//    },
//};
