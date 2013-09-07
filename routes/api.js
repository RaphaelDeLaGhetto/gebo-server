'use strict';

var passport = require('passport'),
    db = require('../config/dbschema'),
//    utils = require('../lib/utils'),
    documentProvider = require('../config/documentProvider');
//    q = require('q');

exports.userinfo = [
    passport.authenticate('bearer', { session: false }),
    function (req, res) {
        // req.authInfo is set using the `info` argument supplied by
        // `BearerStrategy`.  It is typically used to indicate scope of the token,
        // and used in access control checks.  For illustrative purposes, this
        // example simply returns the scope in the response.
        db.userModel.findById(req.user.id, function (err, user) {
            res.json({ name: user.username, email: user.email, scope: req.authInfo.scope });
          });
      }
  ];


/**
 * Attempts to save the given JSON to the
 * owner's profile. Currently the owner is 
 * named in the body of the JSON itself.
 *
 * The current strategy may change, or it may 
 * simply be buttressed with a 'copy' route
 * so that the given resource can be stored
 * somewhere different than the original 
 * owner's profile.
 */
exports.save = [
    passport.authenticate('bearer', { session: false }),
    function(req, res) {
        var _token, _user, _client;

        // Retrieve the token
        var tokenQuery = db.tokenModel.findOne({ token: req.body.access_token });
        tokenQuery.exec().
        then(function(token) {
                _token = token;
                var userQuery = db.userModel.findOne({ _id: _token.userId });
                return userQuery.exec();
              }).
        // User
        then(function(user) {
                _user = user;
                var clientQuery = db.clientModel.findOne({ _id: _token.clientId });
                return clientQuery.exec();
              }).
        // Client and save
        then(function(client) {
                _client = client;
                return documentProvider.save(_user, _client.clientId, req.body.data);
              }).
        // Results of save
        then(function() {
            res.send(200);
          });
        // Something blew up
        // What goes here?
//        catch(function(err) {
//            console.log('This is an error, uh uh');
//            res.send(400, err)
//          });
      }
  ];

 /**
  * Get a list of documents in the app's colleciton
  */
exports.ls = [
    passport.authenticate('bearer', { session: false }),
    function(req, res) {
        res.json([{a:1},{b:2}]);
      } 
  ];


