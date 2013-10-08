var nock = require('nock'),
    config = require('../../config/config'),
    nconf = require('nconf'),
    mongo = require('mongodb'),
    http = require('http'),
    utils = require('../../lib/utils'),
    dbSchema = require('../../config/dbschema');

var CLIENT_ID = 'abc123',
    REDIRECT_URI = 'http://myhost.com',
    BASE_ADDRESS = 'theirhost.com',
    AUTHORIZATION_ENDPOINT = '/authorize',
    VERIFICATION_ENDPOINT = '/userinfo',
    REQUEST_ENDPOINT = '/request',
    SCOPES = ['*'],
    ACCESS_TOKEN = '1234';

var VERIFICATION_DATA = {
        id: '1',
        name: 'agent',
        email: 'agent@hg.com',
        scope: ['*'],
    };

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
                agentUri: BASE_ADDRESS,
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
                agentUri: BASE_ADDRESS,
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

    'Return the external agent collection if it exists': function(test) {
        console.log('Why stall here?');
        test.expect(5);
        token.get().
            then(function(agent) {
                test.equal(agent.clientId, CLIENT_ID);
                test.equal(agent.token, ACCESS_TOKEN);
                test.equal(agent.authorizationEndpoint, AUTHORIZATION_ENDPOINT);
                test.equal(agent.requestEndpoint, REQUEST_ENDPOINT);
                test.equal(agent.verificationEndpoint, VERIFICATION_ENDPOINT);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false);
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
                agentUri: BASE_ADDRESS,
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

    'Overwrite the access token value of a previously stored agent': function(test) {
        test.expect(2);
        token.get().
            then(function(agent) {
                test.equal(agent.token, ACCESS_TOKEN);
                return token.set(ACCESS_TOKEN + '5678');
              }).
            then(function(ack) {
                return token.get();
              }).
            then(function(agent) {
                test.equal(agent.token, ACCESS_TOKEN + '5678');
                test.done(); 
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false);
                test.done();
              });
    },
};

/**
 * clear
 */
exports.clear = {
    setUp: function (callback) {
        token.setParams({
                agentUri: BASE_ADDRESS,
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

    tearDown: function(callback) {
        this.db.mongoose.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    },

    'It sets the stored token to null': function(test) {
        test.expect(2);
        token.get().
            then(function(agent) {
                test.equal(agent.token, ACCESS_TOKEN);
                return token.clear();
              }).
            then(function() {
                return token.get();
              }).
            then(function(agent) {
                test.equal(agent.token, null);
                test.done(); 
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },

    'It doesn\'t barf when nullifying a token that doesn\'t exist': function(test) {
        test.expect(5);

        // Clear the one saved in setUp
        token.clear().
            then(function() {
                // Clear it again
                return token.clear();
              }).
            then(function() {
                return token.get();
              }).
            then(function(agent) {
                test.equal(agent.token, null);
                test.equal(agent.clientId, CLIENT_ID);
                test.equal(agent.authorizationEndpoint, AUTHORIZATION_ENDPOINT);
                test.equal(agent.requestEndpoint, REQUEST_ENDPOINT);
                test.equal(agent.verificationEndpoint, VERIFICATION_ENDPOINT);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },
};

/**
 * verify
 */
exports.verify = {
    setUp: function (callback) {
        token.setParams({
                agentUri: BASE_ADDRESS,
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

    tearDown: function(callback) {
        this.db.mongoose.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    },

    'Store verification data': function(test) {
        test.expect(6);

        var scope = nock('http://' + BASE_ADDRESS).
                get(VERIFICATION_ENDPOINT + '?access_token=' + ACCESS_TOKEN).
                reply(201, VERIFICATION_DATA);  

        token.verify(ACCESS_TOKEN).
            then(function(data) {
                test.equal(token.data().id, VERIFICATION_DATA.id);
                test.equal(data.id, VERIFICATION_DATA.id);
                test.equal(token.data().name, VERIFICATION_DATA.name);
                test.equal(data.name, VERIFICATION_DATA.name);
                test.equal(token.data().email, VERIFICATION_DATA.email);
                test.equal(data.email, VERIFICATION_DATA.email);

                scope.done();
                test.done();
            }); 
    },
};

/**
 * getToken
 */
exports.getToken = {
    setUp: function (callback) {
        token.setParams({
                agentUri: BASE_ADDRESS,
                clientId: CLIENT_ID,
                redirectUri: REDIRECT_URI,
                authorizationEndpoint: AUTHORIZATION_ENDPOINT,
                requestEndpoint: REQUEST_ENDPOINT,
                verificationEndpoint: VERIFICATION_ENDPOINT,
                scopes: SCOPES
            });
        callback();
    },

    tearDown: function(callback) {
        callback();
    },

    'Get a token from the server agent': function(test) {
        var params = token.getParams();

        var scope = nock('http://' + BASE_ADDRESS).
                get(AUTHORIZATION_ENDPOINT + '?' + utils.objectToQueryString(params)).
                reply(200, VERIFICATION_DATA);  

        token.getToken().
                then(function(token) {
                    test.done();
                  });
    },
};
