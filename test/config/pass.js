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
    EXPIRED_TOKEN = '7890',
    HAI_EMAIL = 'human-agent@interface.org',
    IP = '127.0.0.1';


var FRIEND_GEBO_URI = 'http://theirhost.com';

nconf.argv().env().file({ file: 'local.json' });
var geboDb = require('../../schemata/gebo')(nconf.get('testDb')),
    adminAgentDb = new agentSchema('dan@hg.com'),
    regularAgentDb = new agentSchema('yanfen@hg.com'),
    pass = require('../../config/pass')(nconf.get('testDb'));

/**
 * localStrategy
 */
exports.localStrategy = {

    setUp: function(callback) {
    	try{
            var agent = new geboDb.registrantModel(
                            { name: 'dan', email: 'dan@hg.com',
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
        pass.localStrategy('dan@hg.com', 'password123', function(err, agent) {
            if (err) {
              test.ok(false, err);
            } 
            else {
              test.equal(agent.name, 'dan');
              test.equal(agent.email, 'dan@hg.com');
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
        pass.localStrategy('dan@hg.com', 'wrongpassword123', function(err, agent, message) {
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
                    email: 'dan@hg.com',
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
                    email: 'yanfen@hg.com',
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

            /**
             * Create an expired token
             */
            var expiredToken = new geboDb.tokenModel({
                    registrantId: new mongo.ObjectID('456789ABCDEF'),
                    friendId: null,
                    hai: HAI_EMAIL,
                    ip: IP,
                    string: EXPIRED_TOKEN,
                    expires: Date.now() - 60*60*1000,
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
                                           expiredToken.save(function(err) {
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
        test.expect(7);
	// Make sure the friend is in the friend list
	console.log('regularAgentDb');
	console.log(regularAgentDb.friendModel.db.name);
	console.log(adminAgentDb.friendModel.db.name);
	regularAgentDb.friendModel.findOne({ email: 'richard@construction.com' }, 
			function(err, friend) {
			  if (err) {
			    test.ok(false, err);
			    test.done();
			  }
			  test.equal(friend.email, 'richard@construction.com');
			});
	regularAgentDb.friendModel.find({}, 
			function(err, friends) {
			  if (err) {
			    test.ok(false, err);
			    test.done();
			  }
			  console.log('friends');
			  console.log(friends);
			});
	
	console.log('friend requesting a resource from a regular');
        pass.bearerStrategy(FRIEND_TOKEN, function(err, verified) {
	    console.log('verified');
	    console.log(verified);
            if (err) {
              test.ok(false, err);
            }
            else {
              test.equal(verified.dbName, 'dan@hg.com'); 
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
              test.equal(verified.dbName, 'dan@hg.com'); 
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
              test.equal(verified.dbName, 'dan@hg.com'); 
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
              test.equal(verified.dbName, 'yanfen@hg.com'); 
              test.equal(verified.collectionName, HAI_EMAIL); 
              test.equal(verified.read, true); 
              test.equal(verified.write, true); 
              test.equal(verified.execute, true); 
              test.equal(verified.admin, false); 
            }
            test.done();
        });
    },

    'Do not barf if the token provided does not exist': function(test) {
        test.expect(1);
        pass.bearerStrategy('n0sucht0ken', function(err, verified) {
            if (err) {
              test.equal(err, 'The token provided is invalid');       
            }
            else {
              test.ok(false, 'Permission should not have been granted');
            }
            test.done();
        });
    },

    'Return error if the token provided is expired': function(test) {
        test.expect(1);
        pass.bearerStrategy(EXPIRED_TOKEN, function(err, friend) {
            if (err) {
              test.equal(err, 'The token provided is invalid');       
            } 
            else {
              test.ok(false, 'Permission should not have been granted');
            }
            test.done();
          });
    },
};


