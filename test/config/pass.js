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
            var user = new dbSchema.userModel(
                            { username: 'dan', email: 'dan@hg.com',
                              password: 'password123', admin: true,  
                              _id: new mongo.ObjectID('0123456789AB') });

            user.save(function(err){
                if (err) {
                  console.log(err);
                }
                callback();       
              });
    	}
        catch(e) {
            console.dir(e);
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

    'Return a user object when provided correct email and password': function(test) {
        test.done();
    },

    'Return an error if an invalid email is provided': function(test) {
        test.done();
    },

    'Return an error if a valid email and invalid password are provided': function(test) {
        test.done();
    },

};
