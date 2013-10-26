var config = require('../../config/config'),
    nconf = require('nconf'),
    agentSchema = require('../../schemata/agent');
    mongo = require('mongodb');

//var ACCESS_TOKEN = '1234',
//    HAI_EMAIL = 'A human-agent interface',
//    IP = '127.0.0.1';

var COL_NAME = 'appCollection',
    ADMIN_FRIEND_TOKEN = '1234',
    FRIEND_TOKEN = '5678',
    ADMIN_TOKEN = '9012',
    REGULAR_TOKEN = '3456',
    HAI_EMAIL = 'human-agent@interface.org',
    IP = '127.0.0.1';


var ADMIN_AGENT_EMAIL = 'dan@hg.com',
    REGULAR_AGENT_EMAIL = 'yanfen@hg.com',
    FRIEND_GEBO_URI = 'http://theirhost.com';

nconf.argv().env().file({ file: 'local.json' });
var geboDb = require('../../schemata/gebo')(nconf.get('testDb')),
    regularAgentDb = new agentSchema(REGULAR_AGENT_EMAIL),
    adminAgentDb = new agentSchema(ADMIN_AGENT_EMAIL),
    pass = require('../../config/pass')(nconf.get('testDb'));

/**
 * localStrategy
 */
exports.localStrategy = {

    setUp: function(callback) {
    	try{
            var agent = new geboDb.registrantModel(
                            { name: 'dan', email: ADMIN_AGENT_EMAIL,
                              password: 'password123', admin: true,  
                              _id: new mongo.ObjectID('0123456789AB') });

            agent.save(function(err){
                if (err) {
                  console.log(err);
                }
                callback();       
              });
    	}
        catch(e) {
            console.log(e);
            callback();
    	}
    },

    tearDown: function(callback) {
        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    },

    'Return an agent object when provided correct email and password': function(test) {
        test.expect(3);
        pass.localStrategy(ADMIN_AGENT_EMAIL, 'password123', function(err, agent) {
            if (err) {
              test.ok(false, err);
            } 
            else {
              test.equal(agent.name, 'dan');
              test.equal(agent.email, ADMIN_AGENT_EMAIL);
              test.equal(agent.admin, true);
            }
            test.done();
          });
    },

    'Return false agent if an invalid email is provided': function(test) {
        test.expect(2);
        pass.localStrategy('wrongemail@hg.com', 'password123', function(err, agent, message) {
            if (err) {
              test.ok(false, err);
            } 
            else {
              test.equal(agent, false);
              test.equal(message.message, 'Invalid email or password');
            }
            test.done();
          });
    },

    'Return false agent if a valid email and invalid password are provided': function(test) {
        test.expect(2);
        pass.localStrategy(ADMIN_AGENT_EMAIL, 'wrongpassword123', function(err, agent, message) {
            if (err) {
              test.ok(false, err);
            } 
            else {
              test.equal(agent, false);
              test.equal(message.message, 'Invalid email or password');
            }
            test.done();
          });
    },
};

/**
 * bearerStrategy
 */
exports.bearerStrategy = {

    setUp: function(callback) {
        try {
            /**
             * Setup a registrant
             */
            var adminRegistrant = new geboDb.registrantModel({
                    name: 'dan',
                    email: ADMIN_AGENT_EMAIL,
                    password: 'password123',
                    admin: true,
                    _id: new mongo.ObjectID('0123456789AB')
                });
          
            /**
             * Make a friend for the registrant
             */
            var adminFriend = new adminAgentDb.friendModel({
                    name: 'john',
                    email: 'john@painter.com',
                    uri: FRIEND_GEBO_URI,
                    _id: new mongo.ObjectID('23456789ABCD')
                });

            /**
             * Create access permissions for imaginary collection
             */
            adminFriend.hisPermissions.push({ email: 'painting@app.com' });

            /**
             * Create an access token for the friend
             */
            var adminFriendToken = new geboDb.tokenModel({
                    registrantId: new mongo.ObjectID('0123456789AB'),
                    friendId: new mongo.ObjectID('23456789ABCD'),
                    hai: HAI_EMAIL,
                    ip: IP,
                    string: ADMIN_FRIEND_TOKEN,
                });

            /**
             * Create an access token for the friend
             */
            var adminToken = new geboDb.tokenModel({
                    registrantId: new mongo.ObjectID('0123456789AB'),
                    friendId: null,
                    hai: HAI_EMAIL,
                    ip: IP,
                    string: ADMIN_TOKEN,
                });


            /** 
             * Set up another registrant
             */
            var registrant = new geboDb.registrantModel({
                    name: 'yanfen',
                    email: REGULAR_AGENT_EMAIL,
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('123456789ABC')
                });

            /**
             * Make a friend for the new registrant
             */
            var friend = new regularAgentDb.friendModel({
                    name: 'richard',
                    email: 'richard@construction.com',
                    uri: FRIEND_GEBO_URI,
                    _id: new mongo.ObjectID('3456789ABCDE')
                });

            /**
             * Create access permissions for imaginary collection
             */
            friend.hisPermissions.push({ email: 'someotherapp@example.com' });
            friend.hisPermissions.push({ email: 'richard@construction.com' });

            /**
             * Create an access token for the friend
             */
            var friendToken = new geboDb.tokenModel({
                    registrantId: new mongo.ObjectID('123456789ABC'),
                    friendId: new mongo.ObjectID('3456789ABCDE'),
                    hai: HAI_EMAIL,
                    ip: IP,
                    string: FRIEND_TOKEN,
                });

            /**
             * Create an access token for regular user 
             */
            var regularToken = new geboDb.tokenModel({
                    registrantId: new mongo.ObjectID('123456789ABC'),
                    friendId: null,
                    hai: HAI_EMAIL,
                    ip: IP,
                    string: FRIEND_TOKEN,
                });


            // There has got to be a better way to do this...
            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                friendToken.save(function(err) {
                     if (err) {
                      console.log(err);
                    }
                    friend.save(function(err) {
                        if (err) {
                          console.log(err);
                        }
                        adminRegistrant.save(function(err) {
                            if (err) {
                              console.log(err);
                            }
                            adminFriendToken.save(function(err) {
                                 if (err) {
                                  console.log(err);
                                }
                                adminFriend.save(function(err) {
                                    if (err) {
                                      console.log(err);
                                    }
                                    adminToken.save(function(err) {
                                        if (err) {
                                          console.log(err);
                                        }
                                        regularToken.save(function(err) {
                                           if (err) {
                                             console.log(err);
                                           }
                                           callback();
                                         });
                                      });
                                  });
                              });
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
        regularAgentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
          });

        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
          });

        adminAgentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    },

    'Return permissions object for a friend requesting a resource from a regular agent': function(test) {
        test.expect(6);
        pass.bearerStrategy(FRIEND_TOKEN, function(err, verified) {
            if (err) {
              test.ok(false, err);
            }
            else {
              test.equal(verified.dbName, ADMIN_AGENT_EMAIL); 
              test.equal(verified.collectionName, 'someotherapp@example.com'); 
              test.equal(verified.read, true); 
              test.equal(verified.write, false); 
              test.equal(verified.execute, false); 
              test.equal(verified.admin, false); 
            }
            test.done();
        });
    },

    'Return permissions object for a friend requesting a resource from an admin agent': function(test) {
        test.expect(6);
        pass.bearerStrategy(ADMIN_FRIEND_TOKEN, function(err, verified) {
            if (err) {
              test.ok(false, err);
            }
            else {
              test.equal(verified.dbName, ADMIN_AGENT_EMAIL); 
              test.equal(verified.collectionName, 'painting@app.com'); 
              test.equal(verified.read, true); 
              test.equal(verified.write, false); 
              test.equal(verified.execute, false); 
              test.equal(verified.admin, true); 
            }
            test.done();
        });
    },
    
    'Return permissions object for an admin agent requesting access to its own resource': function(test) {
        test.expect(6);
        pass.bearerStrategy(ADMIN_TOKEN, function(err, verified) {
            if (err) {
              test.ok(false, err);
            }
            else {
              test.equal(verified.dbName, ADMIN_AGENT_EMAIL); 
              test.equal(verified.collectionName, HAI_EMAIL); 
              test.equal(verified.read, true); 
              test.equal(verified.write, true); 
              test.equal(verified.execute, true); 
              test.equal(verified.admin, true); 
            }
            test.done();
        });
    },

    'Return permissions object for a regular agent requesting access to its own resource': function(test) {
        test.expect(6);
        pass.bearerStrategy(REGULAR_TOKEN, function(err, verified) {
            if (err) {
              test.ok(false, err);
            }
            else {
              test.equal(verified.dbName, ADMIN_AGENT_EMAIL); 
              test.equal(verified.collectionName, HAI_EMAIL); 
              test.equal(verified.read, true); 
              test.equal(verified.write, true); 
              test.equal(verified.execute, true); 
              test.equal(verified.admin, false); 
            }
            test.done();
        });
    },


    /**
     * The friend doesn't own the resource, his app just created the data.
     * That is, the friendEmail and resourceEmail parameters are the same.
     */
    'Return permissions for a friend requesting his own app\'s resources': function(test) {
//        test.expect(3);
//        var performative = new performativeRoute(nconf.get('testDb'));
//        performative.verify(FRIEND_TOKEN, 'richard@construction.com', 'richard@construction.com').
//            then(function(permissions) {
//                test.equal(permissions.read, true);
//                test.equal(permissions.write, false);
//                test.equal(permissions.execute, false);
                test.done();
//              });
    },

//    'Return permissions for a friend requesting another app\'s resources': function(test) {
//        test.expect(6);
//        var performative = new performativeRoute(nconf.get('testDb'));
//        performative.verify(FRIEND_TOKEN, 'richard@construction.com', 'someotherapp@example.com').
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
//        performative.verify(ADMIN_FRIEND_TOKEN, 'john@painter.com', 'someotherapp@example.com').
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
//        performative.verify(ADMIN_FRIEND_TOKEN, 'my@enemy.com', 'someotherapp@example.com').
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
//
//    'Return false if the token provided is expired': function(test) {
//        test.expect(1);
//        pass.bearerStrategy(ACCESS_TOKEN + '56', function(err, friend) {
//            if (err) {
//              test.ok(false, err);
//            } 
//            else {
//              test.equal(friend, false);
//            }
//            test.done();
//          });
//    },

// The old way
//    setUp: function(callback) {
//    	try{
//            var agent = new geboDb.registrantModel({
//                                    name: 'dan',
//                                    email: ADMIN_AGENT_EMAIL,
//                                    password: 'password123',
//                                    admin: true,
//                                    _id: new mongo.ObjectID('0123456789AB')
//                                });
//
//            // A good token
//            var token = new geboDb.tokenModel({
//                                    registrantId: new mongo.ObjectID('0123456789AB'),
//                                    friendId: new mongo.ObjectID('123456789ABC'),
//                                    hai: HAI_EMAIL,
//                                    ip: IP,
//                                    string: ACCESS_TOKEN,
//                                });
//
//            token.save(function(err){
//                if (err) {
//                  console.log(err);
//                }
//              });
//
//            // Another good token
//            token = new geboDb.tokenModel({
//                                    registrantId: new mongo.ObjectID('0123456789AB'),
//                                    friendId: new mongo.ObjectID('123456789ABC'),
//                                    hai: HAI_EMAIL,
//                                    ip: IP,
//                                    string: ACCESS_TOKEN + '5',
//                                    expires: Date.now() + 60*60*1000,
//                                });
//
//            token.save(function(err){
//                if (err) {
//                  console.log(err);
//                }
//              });
//
//            // An expired token
//            token = new geboDb.tokenModel({
//                                    registrantId: new mongo.ObjectID('0123456789AB'),
//                                    friendId: new mongo.ObjectID('123456789ABC'),
//                                    string: ACCESS_TOKEN + '56',
//                                    hai: HAI_EMAIL,
//                                    ip: IP,
//                                    expires: Date.now() - 60*60*1000,
//                                });
//
//            token.save(function(err){
//                if (err) {
//                  console.log(err);
//                }
//              });
//
//            // A token with no friend
//            token = new geboDb.tokenModel({
//                                    registrantId: new mongo.ObjectID('0123456789AB'),
//                                    friendId: null, 
//                                    string: ACCESS_TOKEN + '567',
//                                    hai: HAI_EMAIL,
//                                    ip: IP,
//                                });
//
//
//            // Make a friend for this agent
//            var friend = new regularAgentDb.friendModel({
//                                    _id: new mongo.ObjectID('123456789ABC'),
//                                    name: 'yanfen',
//                                    email: REGULAR_AGENT_EMAIL,
//                                });
//
//            // Save the agent and last token here to make sure
//            // it's in the database in time for testing (this wasn't 
//            // happening before. I.e., tests were failing because 
//            // the agent hadn't been added in time)
//            agent.save(function(err){
//                if (err) {
//                  console.log(err);
//                }
//                token.save(function(err){
//                    if (err) {
//                      console.log(err);
//                    }
//                    friend.save(function(err) {
//                        if (err) {
//                          console.log(err);
//                        }
//                        callback();
//                      });
//                  });
//              });
//     	}
//        catch(e) {
//            console.log(e);
//            callback();
//    	}
//    },
//
//    tearDown: function(callback) {
//        geboDb.connection.db.dropDatabase(function(err) {
//            if (err) {
//              console.log(err)
//            }
//          });
//        
//        regularAgentDb.connection.db.dropDatabase(function(err) {
//            if (err) {
//              console.log(err)
//            }
//            callback();
//          });
//    },
//
//    'Return a registrant object when provided a token with no friend attached': function(test) {
//        test.expect(3);
//        pass.bearerStrategy(ACCESS_TOKEN + '567', function(err, registrant) {
//            if (err) {
//              test.ok(false, err);
//            } 
//            else {
//              test.equal(registrant.name, 'dan');
//              test.equal(registrant.email, ADMIN_AGENT_EMAIL);
//              test.equal(registrant.admin, true);
//            }
//            test.done();
//          });
//    },
//
//
//    'Return a friend object when provided a valid token with no expiry': function(test) {
//        test.expect(2);
//        pass.bearerStrategy(ACCESS_TOKEN, function(err, friend) {
//            if (err) {
//              test.ok(false, err);
//            } 
//            else {
//              test.equal(friend.name, 'yanfen');
//              test.equal(friend.email, REGULAR_AGENT_EMAIL);
//            }
//            test.done();
//          });
//    },
//
//    'Return a friend object when provided a valid token with expiry': function(test) {
//        test.expect(2);
//        pass.bearerStrategy(ACCESS_TOKEN + '5', function(err, friend) {
//            if (err) {
//              test.ok(false, err);
//            } 
//            else {
//              test.equal(friend.name, 'yanfen');
//              test.equal(friend.email, REGULAR_AGENT_EMAIL);
//            }
//            test.done();
//          });
//    },
//
//    'Return false if the token provided is expired': function(test) {
//        test.expect(1);
//        pass.bearerStrategy(ACCESS_TOKEN + '56', function(err, friend) {
//            if (err) {
//              test.ok(false, err);
//            } 
//            else {
//              test.equal(friend, false);
//            }
//            test.done();
//          });
//    },
//
//    'Return false if a non-existent token is provided': function(test) {
//        test.expect(1);
//        pass.bearerStrategy('N0SUchT0k3n', function(err, friend) {
//            if (err) {
//              test.ok(false, err);
//            } 
//            else {
//              test.equal(friend, false);
//            }
//            test.done();
//          });
//    },
};


