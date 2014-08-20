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
    fs = require('fs'),
    crypto = require('crypto'),
    base64url = require('base64url'),
    jwtBearer = require('oauth2orize-jwt-bearer').Exchange,
    geboDb = require('../schemata/gebo')(),
    agentDb = require('../schemata/agent')(),
    mongoose = require('mongoose'),
    winston = require('winston');

nconf.file({ file: 'gebo.json' });
var logLevel = nconf.get('logLevel');

module.exports = function() {
    var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({ colorize: true }) ] });

    var Token = require('../config/token');
    
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
    
    server.serializeClient(function (resourceEmail, done) {
        if (logLevel === 'trace') logger.info('serializeClient', resourceEmail);
        return done(null, resourceEmail);
      });
    
    server.deserializeClient(function (requestDetails, done) {
        if (logLevel === 'trace') logger.info('deserializeClient', requestDetails);
    
        agentDb.friendoModel.findOne({ email: requestDetails.friendo }, function (err, friendo) {
                if (logLevel === 'trace') logger.info('friendoModel', friendo);
                var id = null;
                if (friendo) {
                  id = friendo._id;
                }
                requestDetails.friendo = id;
                if (logLevel === 'trace') logger.info('requestDetails', requestDetails);
                if (err) {
                  return done(err);
                }
                return done(null, requestDetails);
          });
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
    server.grant(oauth2orize.grant.token(function(requestDetails, user, ares, done) {
        _implicitGrant(requestDetails, user, ares, function(err, str) {
            if (err) {
              return done(err);
            }
            return done(null, str);
        });

//        logger.info('Implicit grant', requestDetails, user, ares);
//    
//        var tokenStr = utils.uid(256);
//      
//        var token = new geboDb.tokenModel({
//            registrantId: user._id,
//            friendoId: requestDetails.friendo,
//            resource: utils.getMongoCollectionName(requestDetails.resource),
//            ip: requestDetails.ip,
//            string: tokenStr,
//          });
//      
//        token.save(function (err, token) {
//            if (err) {
//              return done(err);
//            }
//            logger.info('Token', token);
//            return done(null, token.string);
//          });
      }));
    
    function _implicitGrant(requestDetails, user, ares, done) {
        if (logLevel === 'trace') logger.info('Implicit grant', requestDetails, user, ares);

        agentDb.friendoModel.findOne({ email: user.email }, function(err, friendo) {
            if (err) {
              done(err);
            }
            if (!friendo) {
              done('You may be registered, but you\'re not my friendo');
            }
            else {
              var tokenStr = utils.uid(256);
            
              var token = new geboDb.tokenModel({
                  friendoId: friendo._id,
                  ip: requestDetails.ip,
                  string: tokenStr,
                });
            
              token.save(function (err, token) {
                  if (err) {
                    return done(err);
                  }
                  if (logLevel === 'trace') logger.info('Token', token.string);
                  done(null, token.string);
                });
            }
          });
      };
    exports.implicitGrant = _implicitGrant;
    
    // Exchange authorization codes for access tokens.  The callback accepts the
    // `client`, which is exchanging `code` and any `redirectUri` from the
    // authorization request for verification.  If these values are validated, the
    // application issues an access token on behalf of the user who authorized the
    // code.
    server.exchange(oauth2orize.exchange.code(function (client, code, redirectUri, done) {
        if (logLevel === 'trace') logger.warn('------ regular exchange, no no');
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
    var _jwtBearerExchange = function(citizen, data, signature, done) {
        if (logLevel === 'trace') logger.info('JWT, yeah yeah');
    
        // The signature hasn't been verified yet, but
        // I need the user in the prn field to get the
        // public certificate
        var decodedData = data.split('.').pop();
        decodedData = JSON.parse(base64url.decode(decodedData));
    
        /**
         * A vouchee does not need to be specified. If none,
         * then the requesting agent is vouching for himself
         */
        if (!decodedData.prn) {
          decodedData.prn = decodedData.iss;
        }
    
        agentDb.friendoModel.findOne({ email: decodedData.prn }, function(err, friendo) {
            if (err) {
              if (logLevel === 'trace') logger.error(err);
              done(err);
            }
        
            var verifier = crypto.createVerify('sha256WithRSAEncryption');
        
            verifier.update(data);
            
            if (verifier.verify(friendo.certificate, signature, 'base64')) {
              if (logLevel === 'trace') logger.info('verified');
    
              var scope = _processScope(decodedData.scope);
    
              if (!scope) {
                return done('You did not correctly specify the scope of your request');
              }
    
              /**
               * 2014-6-11 Mothballed
               */
//              _verifyFriendship(scope, citizen.email, decodedData.prn).
//                      then(function(friendo) {
//                            if (!friendo) {
//                              return done(decodedData.prn + ' breached friendoship');
//                            }
//    
                            geboDb.registrantModel.findOne({ email: citizen.email }, function(err, owner) {
                                    if (err) {
                                      return done(err);
                                    }
    
                                    var tokenStr = utils.uid(256);
                                    var token = new geboDb.tokenModel({
                                        registrantId: owner._id,
                                        friendoId: friendo._id,
                                        resource: scope.resource,
                                        string: tokenStr,
                                      });
                        
                                    token.save(function (err, token) {
                                        if (err) {
                                          return done(err);
                                        }
                                        return done(null, token.string);
                                      });
                              });
//                          }).
//                        catch(function(err) {
//                            return done(err);
//                          });
            }
            else {
              if (logLevel === 'trace') logger.error('error');
              return done(new Error('Could not verify data with signature'));
            }
          });
      }
    exports.jwtBearerExchange = _jwtBearerExchange;
    server.exchange('urn:ietf:params:oauth:grant-type:jwt-bearer', jwtBearer(_jwtBearerExchange));
    
    /**
     * 2014-6-11
     * Mothballed
     *
     * This funciton verified the friendoship between
     * agents. This is no longer necessary at the moment.
     * It is doubtful that the generic gebo will be required to 
     * mediate friendoship between agents again.
    /**
     * Given a foreign agent, a citizen agent, and a
     * set of permissions, verify that the two agents are 
     * friendos.
     *
     * @param Object
     * @param string
     * @param string
     *
     * @return promise
     */
//    var _verifyFriendship = function(scope, citizen, foreignAgent) {
//        var deferred = q.defer();
//        agentDb.friendoModel.findOne({ email: foreignAgent }, function(err, friendo) {
//            if (err) {
//              deferred.reject(err);
//            }
//            if (!friendo) {
//              deferred.resolve(false);
//            }
//            else {
//              var index = utils.getIndexOfObject(friendo.permissions, 'email', scope.resource);
//              if (index > -1 &&
//                  friendo.permissions[index].read === scope.read &&
//                  friendo.permissions[index].write === scope.write &&
//                  friendo.permissions[index].execute === scope.execute) {
//                deferred.resolve(friendo);
//              }
//              else {
//                deferred.resolve(false);
//              }
//            }
//          });
//        return deferred.promise;
//      };
//    exports.verifyFriendship = _verifyFriendship;
    
    /**
     * Take the scope provided in a JWT claim and
     * break it into something a little more sensible
     *
     * @param string: the scope is a space-seperated list:
     *      '<[r][w][x]> <resource>'
     *
     * @return Object
     */
    var _processScope = function(scope) {
        if (!scope) {
          return null;
        }
    
        var splitScope = scope.split(' ');
        if (splitScope.length !== 2) {
          return null
        }
    
        return {
                resource: splitScope.pop(),
                read: splitScope[0].indexOf('r') > -1 ? true: false,
                write: splitScope[0].indexOf('w') > -1 ? true: false,
                execute: splitScope[0].indexOf('x') > -1 ? true: false,
            }
      };
    exports.processScope = _processScope;
    
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
            if (logLevel === 'trace') logger.info('authorization');
            // { resource: email } gets passed to the serializeClient function's
            // resourceEmail parameter. The agent email and originating IP address
            // is added just before the dialog window is rendered
            return done(null, { resource: email }, redirectUri);
          }),
    
        // The req.oauth2.client object is passed through
        // the emails parameter in the [de]serializeClient functions.
        // Hence, req.oauth2.client.agent = req.user.email
        function (req, res) {
            if (logLevel === 'trace') logger.info(req.user.email, 'is using', req.query.client_name, req.query.client_id);
    
            // Add some details to the oauth2 object
            // created by oauth2orize. This will all get
            // passed through deserializeClient on its way to
            // the implicit grant.
            req.oauth2.client.agent = req.user.email;
            req.oauth2.client.friendo = req.query.friendo;
            req.oauth2.client.ip = req.headers['x-forwarded-for'] || 
                                   req.connection.remoteAddress || 
                                   req.socket.remoteAddress ||
                               userreq.connection.socket.remoteAddress; 
            req.oauth2.req.clientName = req.query.client_name;
    
            if (logLevel === 'trace') logger.info('resource', req.oauth2.resource);
    
            res.render('dialog', {
                    transactionID: req.oauth2.transactionID,
                    oauth: req.oauth2,
                    agent: req.user,
                });
          }
      ];
    
    // user decision endpoint
    //
    // `decision` middleware processes a user's decision to allow or deny access
    // requested by a client application.  Based on the grant type requested by the
    // client, the grant middleware configured above will be invoked to send
    // a response.
    
    exports.decision = [
        login.ensureLoggedIn(),
        /**
         * 2014-8-20
         * If I didn't know any better (and I don't), jaredhanson's oauth2orize
         * isn't properly destroying the session after an agent has been
         * authenticated. Regrettably, I have no easy way of demonstrating
         * this, so this hack will have to suffice until someone better-equipped
         * can show me the error of my ways.
         *
         * https://github.com/jaredhanson/oauth2orize
         *
         * See oauth2orize/lib/middleware/decision.js (line ~106).
         * This `delete req.session[key][tid];` has no impact, because
         * an authorized user remains logged in even after issued a token
         */
        function(req, res, next){
            var end = res.end;
            res.end = function(chunk, encoding) {
                req.session.destroy(function(err) {
                    if (err) {
                      if (logLevel === 'trace') logger.error('oauth2orize hack', err);
                    }
                    res.end = end;
                    res.end(chuck, encoding);
                  });
            };
            next();
        },
        server.decision()
      ];
    
    // token endpoint
    //
    // `token` middleware handles client requests to exchange authorization grants
    // for access tokens.  Based on the grant type being exchanged, the above
    // exchange middleware will be invoked to handle the request.  Clients must
    // authenticate when making requests to this endpoint.
    
    exports.token = [
        passport.authenticate(['oauth2-jwt-bearer', 'basic', 'oauth2-client-password'], { session: false }),
        server.token(),
        server.errorHandler()
      ];

    /**
     * Exchange a token for a user's profile information.
     *
     * This route verifies that the token is valid.
     */
    exports.verify = [
        passport.authenticate('bearer', { session: false }),
        function (req, res) {
            if (logLevel === 'trace') logger.info('verified', req.user.email);
            res.json(req.user);
          },
     ];
   
    return exports;
  };
