'use strict';

var passport = require('passport'),
    db = require('../config/dbschema'),
    utils = require('../lib/utils'),
    action = require('../config/action'),
    q = require('q');

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
 * Match the token against the user and the registered 
 * client. If they exist, return a promise
 *
 * @param string
 *
 * @return promise
 */
var _verify = function(token) {
    var deferred = q.defer();

    var _token, _user, _client;

    // Retrieve the token
    var tokenQuery = db.tokenModel.findOne({ token: token});

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
        // Client
        then(function(client) {
            _client = client;
            var verified = {
                dbName: utils.getMongoDbName(_user.email),
                collectionName: utils.getMongoCollectionName(_client.name)
            };
            deferred.resolve(verified);
          });
        // Why doesn't the catch function work here?
//        catch(function(err) {
//            console.log(err);
//            deferred.reject(err)
//          });

    return deferred.promise;
  };

