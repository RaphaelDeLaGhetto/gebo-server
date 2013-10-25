/**
 * Thank you to jaredhanson/oauth2orize
 * https://github.com/jaredhanson/oauth2orize
 */

'use strict';

/**
 * Module dependencies.
 */
var oauth2orize = require('oauth2orize'),
    passport = require('passport'),
    login = require('connect-ensure-login'),
    nconf = require('nconf'),
    utils = require('../lib/utils'),
    q = require('q'),
    jwtBearer = require('oauth2orize-jwt-bearer').Exchange,
    mongoose = require('mongoose');

nconf.argv().env().file({ file: 'local.json' });
var geboDb = require('../schemata/gebo')(nconf.get('email')),
    agentSchema = require('../schemata/agent');

// create OAuth 2.0 server
var server = oauth2orize.createServer();

// Register serialialization and deserialization functions.
//
// When a client redirects a user to user authorization endpoint, an
// authorization transaction is initiated.  To complete the transaction, the
// user must authenticate and approve the authorization request.  Because this
// may involve multiple HTTP request/response exchanges, the transaction is
// stored in the session.
//
// An application must supply serialization functions, which determine how the
// client object is serialized into the session.  Typically this will be a
// simple matter of serializing the client's ID, and deserializing by finding
// the client by ID from the database.

server.serializeClient(function (emails, done) {
    console.log('serializeClient');
    console.log(emails);
    return done(null, emails);
  });

server.deserializeClient(function (emails, done) {
    console.log('deserializeClient');
    console.log(emails);
    return done(null, emails);
//    var agentDb = new agentSchema(emails.agent);
//    agentDb.friendModel.findOne({ email: emails.friend }, function (err, friend) {
//            console.log('findFriend');
//            console.log(err);
//            console.log(friend);
//            if (err) {
//              return done(err);
//            }
//            return done(null, friend);
//      });
  });

// Register supported grant types.
//
// OAuth 2.0 specifies a framework that allows users to grant client
// applications limited access to their protected resources.  It does this
// through a process of the user granting access, and the client exchanging
// the grant for an access token.

// Grant authorization codes.  The callback takes the `client` requesting
// authorization, the `redirectURI` (which is used as a verifier in the
// subsequent exchange), the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application.  The application issues a code, which is bound to these
// values, and will be exchanged for an access token.

server.grant(oauth2orize.grant.code(function (client, redirectUri, user, ares, done) {
    var code = utils.uid(16);
  
    var authorization = new geboDb.authorizationModel({
        userId: user.id,
        clientId: client.id,
        redirectUri: redirectUri,
        code: code,
      });

    authorization.save(function (err, code) {
        if (err) {
          return done(err);
        }

        return done(null, code.code);
      });
  }));

/**
 * Here's my attempt at an implicit grant
 */
server.grant(oauth2orize.grant.token(function(client, user, ares, done) {
    console.log('------ implicit grant');
    console.log(client);
    console.log(user);
    console.log(ares);
    var tokenStr = utils.uid(256);

//    var token = new geboDb.tokenModel({
//        userId: user._id,
//        clientId: client._id,
//        token: tokenStr,
//      });
    var token = new geboDb.tokenModel({
        registrantId: user._id,
        haiId: client.friend,
        string: tokenStr,
      });


    token.save(function (err, token) {
        if (err) {
          return done(err);
        }

        return done(null, token.string);
      });
  }));

// Exchange authorization codes for access tokens.  The callback accepts the
// `client`, which is exchanging `code` and any `redirectUri` from the
// authorization request for verification.  If these values are validated, the
// application issues an access token on behalf of the user who authorized the
// code.

server.exchange(oauth2orize.exchange.code(function (client, code, redirectUri, done) {
    console.log('------ regular exchange, no no');
    geboDb.authorizationModel.findOne({ code: code }, function (err, authCode) {
        if (err) {
          return done(err);
        }
        if (client.id._id !== authCode.clientId._id) {
          return done(null, false);
        }
        if (redirectUri !== authCode.redirectUri) {
          return done(null, false);
        }
    
        var tokenStr = utils.uid(256);

        var token = new geboDb.tokenModel({
            userId: authCode.userId,
            clientId: client.id,
            token: tokenStr,
          });

        token.save(function (err, token) {
            if (err) {
              return done(err);
            }
            return done(null, token.token);
          });
      });
  }));

/**
 * For server login
 */
server.exchange('urn:ietf:params:oauth:grant-type:jwt-bearer', jwtBearer(function(client, data, signature, done) {
    console.log('------ JWT, yeah yeah');
    var crypto = require('crypto'),
        pub = 'somePublicKey',
        verifier = crypto.createVerify('RSA-SHA256');

    verifier.update(JSON.stringify(data));

    if (verifier.verify(pub, signature, 'base64')) {

      var tokenStr = utils.uid(256);

      var token = new geboDb.tokenModel({
          userId: client.id,
          clientId: client.id,
          token: tokenStr,
        });

      token.save(function (err, token) {
          if (err) {
            return done(err);
          }
          return done(null, token.token);
        });
    }
  }));

// user authorization endpoint
//
// `authorization` middleware accepts a `validate` callback which is
// responsible for validating the client making the authorization request.  In
// doing so, is recommended that the `redirectURI` be checked against a
// registered value, although security requirements may vary accross
// implementations.  Once validated, the `done` callback must be invoked with
// a `client` instance, as well as the `redirectURI` to which the user will be
// redirected after an authorization decision is obtained.
//
// This middleware simply initializes a new authorization transaction.  It is
// the application's responsibility to authenticate the user and render a dialog
// to obtain their approval (displaying details about the client requesting
// authorization).  We accomplish that here by routing through `ensureLoggedIn()`
// first, and rendering the `dialog` view. 

exports.authorization = [
    login.ensureLoggedIn(),
    server.authorization(function (email, redirectUri, done) {
        console.log('authorization');
        // { friend: email } gets passed to the serializeClient function's
        // emails parameter. The agent email is added before the dialog 
        // window is rendered
        return done(null, { friend: email }, redirectUri);
      }),

    // The req.oauth2.client object is passed through
    // the emails parameter in the [de]serializeClient functions.
    // Hence, req.oauth2.client.agent = req.user.email
    function (req, res) {
        console.log('render dialog');
        console.log(req.query);

        req.oauth2.client.agent = req.user.email;
        req.oauth2.req.clientName = req.query.client_name;

        console.log('oauth2');
        console.log(req.oauth2);

        _getHaiProfileChanges(req.user.email, req.oauth2.req).
            then(function(delta) {
                res.render('dialog', {
                    transactionID: req.oauth2.transactionID,
                    oauth: req.oauth2,
                    delta: delta,
                  });
              });
      }
  ];

/**
 * Find the differences between the HAI on record 
 * and the one requiring access.
 *
 * The haiProfile Object is produced by Jared Hanson's
 * oauth2orize. See the calling function in the authorization
 * array
 *
 * @param string
 * @param Object
 *
 * @return promise
 */
function _getHaiProfileChanges(agentEmail, haiProfile) {
    var deferred = q.defer();

    geboDb.registrantModel.findOne({ email: agentEmail }, function(err, registrant) {
        if (err) {
          deferred.reject(err);
        }
        else if (!registrant) {
          deferred.reject('That agent is not registered');
        }
        else {
          var db = new agentSchema(agentEmail);
          db.haiModel.findOne({ email: haiProfile.clientID }, function(err, hai) {
                if (err) {
                  deferred.resolve(err);
                }
                else {
                  var delta = {};
        
                  // Scope
                  var haiScope = hai == null ? haiProfile.scope: hai.getPermissions(haiProfile.clientID);

                  // Compare the submitted profile with the stored profile
                  if (hai) {
                    if (hai.redirect !== haiProfile.redirectURI) {
                      delta.redirectURI = hai.redirect;
                    }

                    if (hai && hai.name !== haiProfile.clientName) {
                      delta.clientName = hai.name;
                    }

                    if (haiScope.join() !== haiProfile.scope.join()) {
                      delta.scope = haiScope;
                    }

                  }
                  // If never registered, return the profile submitted
                  else {
                    delta.clientID = haiProfile.clientID;
                    delta.redirectURI = haiProfile.redirectURI;
                    delta.clientName = haiProfile.clientName;
                    delta.scope = haiScope;
                  }

                  // Are there any differences?
                  if (Object.keys(delta).length) {
                    deferred.resolve(delta);
                  }
                  else {
                    deferred.resolve(false);
                  }
                }
              });
        }
      });

    return deferred.promise;
  };
exports.getHaiProfileChanges = _getHaiProfileChanges;

// user decision endpoint
//
// `decision` middleware processes a user's decision to allow or deny access
// requested by a client application.  Based on the grant type requested by the
// client, the above grant middleware configured above will be invoked to send
// a response.

exports.decision = [
    login.ensureLoggedIn(),
    server.decision()
  ];

// token endpoint
//
// `token` middleware handles client requests to exchange authorization grants
// for access tokens.  Based on the grant type being exchanged, the above
// exchange middleware will be invoked to handle the request.  Clients must
// authenticate when making requests to this endpoint.

exports.token = [
    passport.authenticate(['basic', 'oauth2-client-password', 'oauth2-jwt-bearer'], { session: false }),
    server.token(),
    server.errorHandler()
  ];

