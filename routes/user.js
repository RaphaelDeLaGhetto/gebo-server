'use strict';
var passport = require('passport'),
    nconf = require('nconf'),
    q = require('q'),
    login = require('connect-ensure-login'),
    cluster = require('cluster'),
    winston = require('winston');

module.exports = function() {

    var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({ colorize: true }) ] });
    nconf.file({ file: './gebo.json' });
    var logLevel = nconf.get('logLevel');

    var pass = require('../config/pass')();

    exports.account = [
        login.ensureLoggedIn(),
        function (req, res) {
            var agent = require('../schemata/agent')();
            agent.friendoModel.find({}, function(err, friendos) {
                agent.socialCommitmentModel.find({}).where('fulfilled', null).sort('-created').exec(function(err, scs) {
                    res.render('account', { agent: req.user,
                                            friendos: friendos,
                                            socialCommitments: scs,
                                            error: err });
                  });
              });
          }
      ];
    
    exports.getLogin = function (req, res) {
        if (cluster.worker) {
          if (logLevel === 'trace') logger.info('Worker', cluster.worker.id, 'received login request');
        }
        res.render('login');
      };
    
    exports.admin = [
        pass.ensureAuthenticated,
        pass.ensureAdmin,
        function (req, res) {
            var gebo = require('../schemata/gebo')();
            var agent = require('../schemata/agent')();
            gebo.registrantModel.find({}, function(err, registrants) {
                agent.friendoModel.find({}, function(err, friendos) {
                    res.render('admin', { agent: req.user,
                                          registrants: registrants,
                                          friendos: friendos,
                                          error: err });
                  });
              });
          }
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
        var gebo = require('../schemata/gebo')();

        // Add the admin param
//        req.body.admin = false;
        var registrant = new gebo.registrantModel(req.body);

        registrant.save(function(err, registrant) {
            gebo.connection.db.close();
            if (err) {
              res.redirect('/');
            }
            else {
              res.render('login', { agent: registrant });
            }
          });
      };

    return exports;
  };
