var config = require('../../config/config'),
    nconf = require('nconf'),
    mongo = require('mongodb');

var ACCESS_TOKEN = '1234';

nconf.argv().env().file({ file: 'local.json' });
var geboSchema = require('../../schemata/gebo'),
    pass = require('../../config/pass')(nconf.get('testDb'));

/**
 * localStrategy
 */
exports.localStrategy = {

    setUp: function(callback) {
    	try{
            this.gebo = new geboSchema(nconf.get('testDb'));
            var agent = new this.gebo.registrantModel(
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
        this.gebo.connection.db.dropDatabase(function(err) {
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
            this.gebo = new geboSchema(nconf.get('testDb'));
            var agent = new this.gebo.registrantModel({
                                    name: 'dan',
                                    email: 'dan@hg.com',
                                    password: 'password123',
                                    admin: true,
                                    _id: new mongo.ObjectID('0123456789AB')
                                });

            agent.save(function(err){
                if (err) {
                  console.log(err);
                }
              });

            // A good token
            var token = new this.gebo.tokenModel({
                                    registrantId: new mongo.ObjectID('0123456789AB'),
                                    friendId: new mongo.ObjectID('123456789ABC'),
                                    string: ACCESS_TOKEN,
                                });

            token.save(function(err){
                if (err) {
                  console.log(err);
                }
              });

            // Another good token
            token = new this.gebo.tokenModel({
                                    registrantId: new mongo.ObjectID('0123456789AB'),
                                    friendId: new mongo.ObjectID('123456789ABC'),
                                    string: ACCESS_TOKEN + '5',
                                    expires: Date.now() + 60*60*1000,
                                });

            token.save(function(err){
                if (err) {
                  console.log(err);
                }
              });

            // An expired token
            token = new this.gebo.tokenModel({
                                    registrantId: new mongo.ObjectID('0123456789AB'),
                                    friendId: new mongo.ObjectID('123456789ABC'),
                                    string: ACCESS_TOKEN + '56',
                                    expires: Date.now() - 60*60*1000,
                                });

            token.save(function(err){
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
        this.gebo.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    },

    'Return a registrant object when provided a valid token with no expiry': function(test) {
        test.expect(3);
        pass.bearerStrategy(ACCESS_TOKEN, function(err, registrant) {
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

    'Return a registrant object when provided a valid token with expiry': function(test) {
        test.expect(3);
        pass.bearerStrategy(ACCESS_TOKEN + '5', function(err, registrant) {
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

    'Return false if the token provided is expired': function(test) {
        test.expect(1);
        pass.bearerStrategy(ACCESS_TOKEN + '56', function(err, registrant) {
            if (err) {
              test.ok(false, err);
            } 
            else {
              test.equal(registrant, false);
            }
            test.done();
          });
    },

    'Return false if a non-existent token is provided': function(test) {
        test.expect(1);
        pass.bearerStrategy('N0SUchT0k3n', function(err, registrant) {
            if (err) {
              test.ok(false, err);
            } 
            else {
              test.equal(registrant, false);
            }
            test.done();
          });
    },
};


