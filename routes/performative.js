'use strict';

var passport = require('passport'),
    db = require('../config/dbschema'),
    utils = require('../lib/utils'),
    action = require('../config/action'),
    q = require('q');

/**
 * Receive a request for consideration
 */
exports.request = [
    passport.authenticate('bearer', { session: false }),
    function(req, res) {

        _verify(req.body.access_token, req.body.email).
            then(function(verified) {
                // Remove the access token for when saving to the DB. All
                // data to be saved is stored in the request body
                delete req.body.access_token;

		return action[req.body.action](verified, req.body);	    
              }).
            // Results of save
            then(function(data) {
		res.send(data);
              }).
            // Something blew up
            catch(function(err) {
                console.log('err');
                console.log(err);
                res.send(404, err);
              });
      }
  ];

/**
 * Match the token against the user and the registered 
 * client. If they exist, return a promise
 *
 * @param string
 * @param string
 *
 * @return promise
 */
var _verify = function(token, email) {
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
                collectionName: utils.getMongoCollectionName(_client.name),
		admin: _user.admin,
            };

	    // Admins may operate on DBs not their own
	    if (email && verified.admin) {
	      verified.dbName = utils.getMongoDbName(email); 
              deferred.resolve(verified);
	    }
	    else if (email && !verified.admin) {
	      deferred.reject('You are not permitted to access that resource');
	    }
	    else {
              deferred.resolve(verified);
	    }
          });
        // Why doesn't the catch function work here?
//        catch(function(err) {
//            console.log(err);
//            deferred.reject(err)
//          });

    return deferred.promise;
  };

