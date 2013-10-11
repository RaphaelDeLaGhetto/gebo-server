'use strict';
var passport = require('passport'),
    nconf = require('nconf'),
    login = require('connect-ensure-login')

nconf.argv().env().file({ file: 'local.json' });
var pass = require('../config/pass')(nconf.get('name'));


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

