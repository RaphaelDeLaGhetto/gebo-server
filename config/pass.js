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
    utils = require('../lib/utils'),
    // jaredhanson/oauth2orize
    BasicStrategy = require('passport-http').BasicStrategy,
    ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy,
    ClientJwtBearerStrategy = require('passport-oauth2-jwt-bearer').Strategy,
    cluster = require('cluster'),
    winston = require('winston');

module.exports = function() {

    var geboDb = require('../schemata/gebo')();

    var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({ colorize: true }) ] });

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
        if (cluster.worker) {
          logger.info('_localStrategy. Worker', cluster.worker.id, 'attempting authentication');
        }

        geboDb.registrantModel.findOne({ email: email }, function(err, agent) {
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
        geboDb.registrantModel.findById(id, function (err, agent) {
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
            loggger.info('BasicStrategy');

            geboDb.clientModel.findOne({ name: clientName }, function(err, client) {
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
            logger.info('ClientPasswordStrategy');
            geboDb.clientModel.findOne({ clientId: clientId, secret: secret }, function(err, client) {
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
        logger.info('_bearerStrategy', accessToken);

        geboDb.tokenModel.findOne({ string: accessToken }, function(err, token) {
            if (err) {
              return done(err);
            }

            if (!token) {
              return done('The token provided is invalid', null);
            }
            logger.info('token found:', token.string);

            if (token.expires && new Date(token.expires) < new Date()) {
              logger.info('token: expired', token.expires);
              return done('The token provided is invalid', null);
            }
            
            // Look up the resource owner
            geboDb.registrantModel.findOne({ _id: token.registrantId }, { password: 0 }, function(err, registrant) {
                if (err) {
                  return done(err);
                }

                if (!registrant) {
                  return done(null, false);
                }
                logger.info('registrant.email',registrant.email);
                done(null, registrant);  
              });
          });
      };
    exports.bearerStrategy = _bearerStrategy;
    passport.use(new BearerStrategy(_bearerStrategy));

    /**
     * Client JWT Bearer Strategy
     *
     * A foreign agent will provide the email of
     * the agent from whom he is trying to obtain
     * an access token. The claimSetIss is the
     * email of the citizen agent, not the 
     * foreign agent seeking access.
     */
    var _clientJwtBearerStrategy = function(claimSetIss, done) {
        geboDb.registrantModel.findOne({ email: claimSetIss }, function(err, citizen) {
            if (err) {
              return done(err);
            }
            if (!citizen) {
              return done(null, false);
            }
            return done(null, citizen);
          });
      };
    exports.clientJwtBearerStrategy = _clientJwtBearerStrategy; 
    passport.use(new ClientJwtBearerStrategy(_clientJwtBearerStrategy));

    return exports;
  };
