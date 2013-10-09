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
    // jaredhanson/oauth2orize
    BasicStrategy = require('passport-http').BasicStrategy,
    ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy,
    ClientJwtBearerStrategy = require('passport-oauth2-jwt-bearer').Strategy;

nconf.argv().env().file({ file: 'local.json' });
var db = require('./dbschema')(nconf.get('name'));

/**
 * LocalStrategy
 *
 * This strategy is used to authenticate users based on a username and password.
 * Anytime a request is made to authorize an application, we must ensure that
 * a user is logged in before asking them to approve the request.
 */
passport.use(new LocalStrategy(
    function(username, password, done) {
        console.log(username);
        db.userModel.findOne({ username: username }, function(err, user) {
            console.log(user);
            if (err) {
              return done(err);
            }
            if (!user) {
              return done(null, false, { message: 'Invalid username or password' });
            }
            user.comparePassword(password, function(err, isMatch) {
              if (err) {
                return done(err);
              }
              if(isMatch) {
                return done(null, user);
              }
              else {
                return done(null, false, { message: 'Invalid username or password' });
              }
            });
          });
      }));

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

passport.deserializeUser(function(id, done) {
    db.userModel.findById(id, function (err, user) {
        done(err, user);
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
            console.log(client);
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
 */
passport.use(new BearerStrategy(
    function(accessToken, done) {
        db.tokenModel.findOne({ token: accessToken }, function(err, token) {
            if (err) {
              return done(err);
            }
            if (!token) {
              return done(null, false);
            }
            
            db.userModel.findOne({ _id: token.userId }, function(err, user) {
                if (err) {
                  return done(err);
                }
                if (!user) {
                  return done(null, false);
                }

                // To keep this example simple, restricted scopes are not implemented,
                // and this is just for illustrative purposes
                var info = { scope: '*' };
                done(null, user, info);
              });
          });
      }
  ));

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
