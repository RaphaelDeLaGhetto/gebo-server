var config = require('../../config/config'),
    nconf = require('nconf'),
    mongo = require('mongodb');

var COL_NAME = 'appCollection',
    ADMIN_TOKEN = '1234',
    USER_TOKEN = '5678';

nconf.argv().env().file({ file: 'local.json' });
var dbSchema = require('../../config/dbschema')(nconf.get('testDb')),
    pass = require('../../config/pass')(nconf.get('testDb'));

/**
 * localStrategy
 */
exports.localStrategy = {

    setUp: function(callback) {
    	try{
            var agent = new dbSchema.agentModel(
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
        dbSchema.mongoose.db.dropDatabase(function(err) {
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


