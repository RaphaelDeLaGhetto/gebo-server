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
            res.render('account', { agent: req.user });
          }
      ];
    
    exports.getLogin = function (req, res) {
        res.render('login');
      };
    
    exports.admin = [
        pass.ensureAuthenticated,
        pass.ensureAdmin,
        function (req, res) {
            var db = require('../config/dbschema')(dbName);
            db.agentModel.find({}, function(err, agents) {
                res.render('admin', { agent: req.user, agents: agents, error: err });
              });
          }
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
        var db = require('../config/dbschema')(dbName);

        // Add the admin param
        req.body.admin = false;
        var newAgent = new db.agentModel(req.body);

        newAgent.save(function(err, agent) {
            if (err) {
              res.redirect('/');
            }
            else {
              res.render('login', { agent: agent });
            }
          });
      };

    /**
     * API
     */
    return exports;
  };
