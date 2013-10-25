var config = require('../../config/config'),
    nconf = require('nconf'),
    mongo = require('mongodb');

var ACCESS_TOKEN = '1234',
    HAI = 'A human-agent interface',
    IP = '127.0.0.1';

nconf.argv().env().file({ file: 'local.json' });
var geboDb = require('../../schemata/gebo')(nconf.get('testDb')),
    agentDb = require('../../schemata/agent')('dan@hg.com'),
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
    	try{
            var agent = new geboDb.registrantModel({
                                    name: 'dan',
                                    email: 'dan@hg.com',
                                    password: 'password123',
                                    admin: true,
                                    _id: new mongo.ObjectID('0123456789AB')
                                });

            // A good token
            var token = new geboDb.tokenModel({
                                    registrantId: new mongo.ObjectID('0123456789AB'),
                                    friendId: new mongo.ObjectID('123456789ABC'),
                                    hai: HAI,
                                    ip: IP,
                                    string: ACCESS_TOKEN,
                                });

            token.save(function(err){
                if (err) {
                  console.log(err);
                }
              });

            // Another good token
            token = new geboDb.tokenModel({
                                    registrantId: new mongo.ObjectID('0123456789AB'),
                                    friendId: new mongo.ObjectID('123456789ABC'),
                                    hai: HAI,
                                    ip: IP,
                                    string: ACCESS_TOKEN + '5',
                                    expires: Date.now() + 60*60*1000,
                                });

            token.save(function(err){
                if (err) {
                  console.log(err);
                }
              });

            // An expired token
            token = new geboDb.tokenModel({
                                    registrantId: new mongo.ObjectID('0123456789AB'),
                                    friendId: new mongo.ObjectID('123456789ABC'),
                                    string: ACCESS_TOKEN + '56',
                                    hai: HAI,
                                    ip: IP,
                                    expires: Date.now() - 60*60*1000,
                                });

            token.save(function(err){
                if (err) {
                  console.log(err);
                }
              });

            // A token with no friend
            token = new geboDb.tokenModel({
                                    registrantId: new mongo.ObjectID('0123456789AB'),
                                    friendId: null, 
                                    string: ACCESS_TOKEN + '567',
                                    hai: HAI,
                                    ip: IP,
                                });


            // Make a friend for this agent
            var friend = new agentDb.friendModel({
                                    _id: new mongo.ObjectID('123456789ABC'),
                                    name: 'yanfen',
                                    email: 'yanfen@hg.com',
                                });

            // Save the agent and last token here to make sure
            // it's in the database in time for testing (this wasn't 
            // happening before. I.e., tests were failing because 
            // the agent hadn't been added in time)
            agent.save(function(err){
                if (err) {
                  console.log(err);
                }
                token.save(function(err){
                    if (err) {
                      console.log(err);
                    }
                    friend.save(function(err) {
                        if (err) {
                          console.log(err);
                        }
                        callback();
                      });
                  });
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
          });
        
        agentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    },

    'Return a registrant object when provided a token with no friend attached': function(test) {
        test.expect(3);
        pass.bearerStrategy(ACCESS_TOKEN + '567', function(err, registrant) {
            if (err) {
              test.ok(false, err);
            } 
            else {
              test.equal(registrant.name, 'dan');
              test.equal(registrant.email, 'dan@hg.com');
              test.equal(registrant.admin, true);
            }
            test.done();
          });
    },


    'Return a friend object when provided a valid token with no expiry': function(test) {
        test.expect(2);
        pass.bearerStrategy(ACCESS_TOKEN, function(err, friend) {
            if (err) {
              test.ok(false, err);
            } 
            else {
              test.equal(friend.name, 'yanfen');
              test.equal(friend.email, 'yanfen@hg.com');
            }
            test.done();
          });
    },

    'Return a friend object when provided a valid token with expiry': function(test) {
        test.expect(2);
        pass.bearerStrategy(ACCESS_TOKEN + '5', function(err, friend) {
            if (err) {
              test.ok(false, err);
            } 
            else {
              test.equal(friend.name, 'yanfen');
              test.equal(friend.email, 'yanfen@hg.com');
            }
            test.done();
          });
    },

    'Return false if the token provided is expired': function(test) {
        test.expect(1);
        pass.bearerStrategy(ACCESS_TOKEN + '56', function(err, friend) {
            if (err) {
              test.ok(false, err);
            } 
            else {
              test.equal(friend, false);
            }
            test.done();
          });
    },

    'Return false if a non-existent token is provided': function(test) {
        test.expect(1);
        pass.bearerStrategy('N0SUchT0k3n', function(err, friend) {
            if (err) {
              test.ok(false, err);
            } 
            else {
              test.equal(friend, false);
            }
            test.done();
          });
    },
};


