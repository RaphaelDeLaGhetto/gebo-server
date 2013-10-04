var nock = require('nock'),
    nconf = require('nconf'),
    mongo = require('mongodb'),
    dbSchema = require('../../config/dbschema');

var CLIENT_ID = 'abc123',
    REDIRECT_URI = 'http://myhost.com',
    AUTHORIZATION_ENDPOINT = 'http://theirhost.com/authorize',
    VERIFICATION_ENDPOINT = 'http://theirhost.com/userinfo',
    REQUEST_ENDPOINT = 'http://theirhost.com/request',
    SCOPES = ['*'],
    ACCESS_TOKEN = '1234';

// Start up the test database
nconf.argv().env().file({ file: 'local.json' });
var token = require('../../config/token')(nconf.get('testDb'));

/**
 * Get the app's collection
 */
exports.getParams = {

    setUp: function (callback) {
        callback();
    },

    tearDown: function (callback) {
        callback();
    }, 

    'Throw an exception if not initialized': function(test) {
        test.expect(1);
        test.throws(function() { token.getParams(); }, Error);
        test.done();
    },

    'Return an object if initialized': function(test) {
        test.expect(4);

        token.setParams({
                clientId: CLIENT_ID,
                redirectUri: REDIRECT_URI,
                authorizationEndpoint: AUTHORIZATION_ENDPOINT,
                verificationEndpoint: VERIFICATION_ENDPOINT,
                scopes: SCOPES
            });

        var params = token.getParams();

        test.equal(params.client_id, CLIENT_ID);
        test.equal(params.response_type, 'token');
        test.equal(params.redirect_uri, REDIRECT_URI);
        test.equal(params.scope, '*');

        test.done();
    },

}

/**
 * get
 */
exports.get = {

    setUp: function (callback) {

        token.setParams({
                clientId: CLIENT_ID,
                redirectUri: REDIRECT_URI,
                authorizationEndpoint: AUTHORIZATION_ENDPOINT,
                requestEndpoint: REQUEST_ENDPOINT,
                verificationEndpoint: VERIFICATION_ENDPOINT,
                scopes: SCOPES
            });

        /**
         * Setup an external agent
         */
        this.db = new dbSchema(nconf.get('testDb'));
        var agent = new this.db.agentModel({
                clientId: CLIENT_ID,
                authorizationEndpoint: AUTHORIZATION_ENDPOINT,
                requestEndpoint: REQUEST_ENDPOINT,
                verificationEndpoint: VERIFICATION_ENDPOINT,
                token: ACCESS_TOKEN,
                _id: new mongo.ObjectID('0123456789AB')
            });

        agent.save(function(err) {
            if (err) {
              console.log(err);
            }
            callback();
          });
    },

    tearDown: function (callback) {
        this.db.mongoose.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    }, 

//    'Return null if no agent stored': function(test) {
//        test.expect(1);
//        token.get().
//            then(function(tokenStr) {
//                test.equal(tokenStr, null);
//                test.done();
//            });
//    },

    'Return the external agent collection if it exists': function(test) {
        test.expect(5);
        token.get().
            then(function(agent) {
                test.equal(agent.clientId, CLIENT_ID);
                test.equal(agent.token, ACCESS_TOKEN);
                test.equal(agent.authorizationEndpoint, AUTHORIZATION_ENDPOINT);
                test.equal(agent.requestEndpoint, REQUEST_ENDPOINT);
                test.equal(agent.verificationEndpoint, VERIFICATION_ENDPOINT);
                test.done();
            });
    },
}

/**
 * set
 */
exports.set = {

    setUp: function (callback) {
        token.setParams({
                clientId: CLIENT_ID,
                redirectUri: REDIRECT_URI,
                authorizationEndpoint: AUTHORIZATION_ENDPOINT,
                requestEndpoint: REQUEST_ENDPOINT,
                verificationEndpoint: VERIFICATION_ENDPOINT,
                scopes: SCOPES
            });

        /**
         * Setup an external agent
         */
        this.db = new dbSchema(nconf.get('testDb'));
        var agent = new this.db.agentModel({
                clientId: CLIENT_ID,
                authorizationEndpoint: AUTHORIZATION_ENDPOINT,
                requestEndpoint: REQUEST_ENDPOINT,
                verificationEndpoint: VERIFICATION_ENDPOINT,
                token: ACCESS_TOKEN,
                _id: new mongo.ObjectID('0123456789AB')
            });

        agent.save(function(err) {
            if (err) {
              console.log(err);
            }
            callback();
          });
    },

    tearDown: function (callback) {
        console.log('tearDown');
        this.db.mongoose.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            console.log('done');
            callback();
          });
    }, 

    'Overwrite the access token value of a previously stored agent': function(test) {
        test.expect(1);
        token.get().
            then(function(agent) {
                test.equal(agent.token, ACCESS_TOKEN);
                console.log('HERE');
                return token.set(ACCESS_TOKEN + '5678');
              }).
            then(function(ack) {
                console.log(ack);
                return token.get();
              }).
            then(function(agent) {
                console.log('HERE?????????????');
                console.log(agent);
                test.done(); 
              });
    },
};
