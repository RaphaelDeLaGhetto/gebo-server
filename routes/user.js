'use strict';
var passport = require('passport'),
    nconf = require('nconf'),
    q = require('q'),
    utils = require('../lib/utils'),
    login = require('connect-ensure-login');

module.exports = function(dbName) {

    /**
     * Set the database name, if not set already 
     */
    if (!dbName) {
      nconf.argv().env().file({ file: 'local.json' });
      dbName = nconf.get('email');
    }
    var pass = require('../config/pass')(dbName);
    var gebo = require('../schemata/gebo')(dbName);
    var token = require('../config/token')(dbName);

    exports.account = [
        login.ensureLoggedIn(),
        function (req, res) {
            var agent = require('../schemata/agent')(req.user.email);
            agent.friendModel.find({}, function(err, friends) {
                agent.socialCommitmentModel.find({}, function(err, scs) {
                    agent.connection.db.close();
                    res.render('account', { agent: req.user,
                                            friends: friends,
                                            socialCommitments: scs,
                                            error: err });
                  });
              });
          }
      ];
    
    exports.getLogin = function (req, res) {
        res.render('login');
      };
    
    exports.admin = [
        pass.ensureAuthenticated,
        pass.ensureAdmin,
        function (req, res) {
            gebo.registrantModel.find({}, function(err, registrants) {
                gebo.friendModel.find({}, function(err, friends) {
                    res.render('admin', { agent: req.user,
                                          registrants: registrants,
                                          friends: friends,
                                          error: err });
                  });
              });
          }
      ];
    
    /**
     * _poke
     *
     * This simply verifies friendship by returning a valid
     * token with no real privileges attached.
     */
    var _poke = function(req, res) {
        token.get(req.body.email, '', nconf.get('email')).
            then(function(token) {
                console.log('token');
                console.log(token);
                res.send(200, token);
              }).
            catch(function(err) {
                console.log('_poke err');
                console.log(err);
                res.send(401, err);
              });
      };
    exports.poke = [
        pass.ensureAuthenticated,
        pass.ensureAdmin,
        _poke,
      ];

    /**
     *  POST /login
     */
    exports.postLogin = passport.authenticate('local', {
        successReturnToOrRedirect: '/',
        failureRedirect: '/login'
      });
    
    exports.logout = function(req, res) {
        req.logout();
        res.redirect('/');
      };

    /**
     * POST /signup
     */
    exports.signUp = function(req, res) {
        var gebo = require('../schemata/gebo')(dbName);

        // Add the admin param
//        req.body.admin = false;
        var registrant = new gebo.registrantModel(req.body);

        registrant.save(function(err, registrant) {
            if (err) {
              res.redirect('/');
            }
            else {
              res.render('login', { agent: registrant });
            }
          });
      };

    /**
     * API
     */
    return exports;
  };
