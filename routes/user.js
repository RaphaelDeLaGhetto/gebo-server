'use strict';
var passport = require('passport'),
    nconf = require('nconf'),
    q = require('q'),
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

    exports.account = [
        login.ensureLoggedIn(),
        function (req, res) {
            res.render('account', { user: req.user });
          }
      ];
    
    exports.getLogin = function (req, res) {
        res.render('login');
      };
    
    exports.admin = [
        pass.ensureAuthenticated,
        pass.ensureAdmin,
        function (req, res) {
            res.render('admin', { user: req.user });
          }
      ];
    
    // POST /login
    exports.postLogin = passport.authenticate('local', {
        successReturnToOrRedirect: '/',
        failureRedirect: '/login'
      });
    
    exports.logout = function (req, res) {
        req.logout();
        res.redirect('/');
      };

    /**
     * API
     */
    return exports;
  };
