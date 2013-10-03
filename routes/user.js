'use strict';
var passport = require('passport'),
    pass = require('../config/pass'),
    login = require('connect-ensure-login');

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
        res.render('admin');
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

