/** 
 * Thank you to jaredhanson/passport-local
 * https://github.com/jaredhanson/passport-local
 *
 * and jaredhanson/oauth2orize
 * https://github.com/jaredhanson/oauth2orize
 */

'use strict';

var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    nconf = require('nconf'),
    utils = require('../lib/utils'),
    // jaredhanson/oauth2orize
    BasicStrategy = require('passport-http').BasicStrategy,
    ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy,
    ClientJwtBearerStrategy = require('passport-oauth2-jwt-bearer').Strategy,
    agentSchema = require('../schemata/agent');

module.exports = function(email) {

    // Turn the email into a mongo-friend database name
    var dbName = utils.ensureDbName(email);

    var db = require('../schemata/gebo')(dbName);

    /**
     * LocalStrategy
     *
     * This strategy is used to authenticate an agent's email and password.
     * Any time a request is made to authorize an application, we must ensure that
     * a user is logged in before asking him to approve the request.
     *
     * @param string
     * @param string
     * @param function
     */
    var _localStrategy = function(email, password, done) {
        db.registrantModel.findOne({ email: email }, function(err, agent) {
            if (err) {
              return done(err);
            }
            if (!agent) {
              return done(null, false, { message: 'Invalid email or password' });
            }
            agent.comparePassword(password, function(err, isMatch) {
                if (err) {
                  return done(err);
                }
                if(isMatch) {
                  return done(null, agent);
                }
                else {
                  return done(null, false, { message: 'Invalid email or password' });
                }
              });
          });
      };
    exports.localStrategy = _localStrategy;
    passport.use(new LocalStrategy(_localStrategy));
    
    passport.serializeUser(function(agent, done) {
        done(null, agent.id);
      });
    
    passport.deserializeUser(function(id, done) {
        db.registrantModel.findById(id, function (err, agent) {
            done(err, agent);
          });
      });
    
    // Simple route middleware to ensure user is authenticated.  Otherwise send to login page.
    exports.ensureAuthenticated = function ensureAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
          return next();
        }
        res.redirect('/login');
      };
    
    
    // Check for admin middleware, this is unrelated to passport.js
    // You can delete this if you use different method to check for admins or don't need admins
    exports.ensureAdmin = function(req, res, next) {
        if(req.user && req.user.admin === true) {
          next();
        }
        else {
          res.send(403);
        }
      };
    
    
    /**
     * BasicStrategy & ClientPasswordStrategy
     *
     * These strategies are used to authenticate registered OAuth clients.  They are
     * employed to protect the `token` endpoint, which consumers use to obtain
     * access tokens.  The OAuth 2.0 specification suggests that clients use the
     * HTTP Basic scheme to authenticate.  Use of the client password strategy
     * allows clients to send the same credentials in the request body (as opposed
     * to the `Authorization` header).  While this approach is not recommended by
     * the specification, in practice it is quite common.
     */
    passport.use(new BasicStrategy(
        function(clientName, password, done) {
            db.clientModel.findOne({ name: clientName }, function(err, client) {
                if (err) {
                  return done(err);
                }
                if (!client) {
                  return done(null, false, { message: 'Invalid client credentials' });
                }
                if (client.secret !== password) {
                  return done(null, false);
                }
                return done(null, client);
              });
          }
      ));
    
    passport.use(new ClientPasswordStrategy(
        function(clientId, secret, done) {
            db.clientModel.findOne({ clientId: clientId, secret: secret }, function(err, client) {
                if (err) {
                  return done(err);
                }
                if (!client) {
                  return done(null, false);
                }
                if (client.secret !== secret) {
                  return done(null, false);
                }
                return done(null, client);
              });
          }
      ));
    
    /**
     * BearerStrategy
     * 
     * This strategy is used to authenticate users based on an access token (aka a
     * bearer token).  The user must have previously authorized a client
     * application, which is issued an access token to make requests on behalf of
     * the authorizing user.
     *
     * @param string
     * @param function
     */
    var _bearerStrategy = function(accessToken, done) {
            
        db.tokenModel.findOne({ string: accessToken }, function(err, token) {
            if (err) {
              return done(err);
            }
            if (!token) {
              return done(null, false);
            }

            if (token.expires && new Date(token.expires) < new Date()) {
              return done(null, false);
            }
            
            // Look up the resource owner
            db.registrantModel.findOne({ _id: token.registrantId }, function(err, registrant) {
                if (err) {
                  return done(err);
                }
                if (!registrant) {
                  return done(null, false);
                }
            
                // Is the bearer the resource owner or a friend?
                if (token.friendId) {
                  var agentDb = new agentSchema(registrant.email);

                  agentDb.friendModel.findOne({ _id: token.friendId }, function(err, friend) {
                        if (err) {
                          return done(err);
                        }
                        if (!friend) {
                          return done(null, false);
                        }
                        done(null, friend, token);
                    });
                }
                else {
                  // To keep this example simple, restricted scopes are not implemented,
                  // and this is just for illustrative purposes
//                  var info = { scope: '*' };
//                  done(null, registrant, info);
                  done(null, registrant, token);
                }
              });
          });
      };
    exports.bearerStrategy = _bearerStrategy;
    passport.use(new BearerStrategy(_bearerStrategy));

    /**
     * Client JWT Bearer Strategy
     *
     * This should let this server authenticate against
     * other servers, but time will tell.
     */
    passport.use(new ClientJwtBearerStrategy(
        function(claimSetIss, done) {
            console.log('ClientJwtBearerStrategy');
    
            db.clientModel.findOne({ clientId: claimSetIss }, function(err, client) {
                if (err) {
                  return done(err);
                }
                if (!client) {
                  return done(null, false);
                }
                return done(null, client);
              });
          }
      ));


    /**
     * API
     */
    return exports;
  };
