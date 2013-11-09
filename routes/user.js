'use strict';
var passport = require('passport'),
    nconf = require('nconf'),
    q = require('q'),
    utils = require('../lib/utils'),
    token = require('../config/token'),
    login = require('connect-ensure-login');

module.exports = function(dbName) {

    /**
     * Set the database name, if not set already 
     */
    if (!dbName) {
      var nconf = require('nconf');
      nconf.argv().env().file({ file: 'local.json' });
      dbName = nconf.get('email');
    }
    var pass = require('../config/pass')(dbName);
    var gebo = require('../schemata/gebo')(dbName);
    
    exports.account = [
        login.ensureLoggedIn(),
        function (req, res) {
            var agent = require('../schemata/agent')(req.user.email);
            agent.friendModel.find({}, function(err, friends) {
                agent.connection.db.close();
                res.render('account', { agent: req.user,
                                        friends: friends,
                                        error: err });
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
//            var gebo = require('../schemata/gebo')(dbName);
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
     */
    var _poke = function(req, res) {
//        var gebo = require('../schemata/gebo')(dbName);
        token.getTokenWithJwt(req.body.uri, req.body.authorize, 'read').
            then(function(token) {
                res.render('index');
              }).
            catch(function(err) {
                console.log('_poke err');
                console.log(err);
              });

//        gebo.registrantModel.find({}, function(err, registrants) {
//            gebo.friendModel.find({}, function(err, friends) {
//                res.render('admin', { agent: req.user,
//                                      registrants: registrants,
//                                      friends: friends,
//                                      error: err });
//                  });
//              });
 
      };
    exports.poke = [
        pass.ensureAuthenticated,
        pass.ensureAdmin,
        _poke,
      ];

    // POST /login
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
