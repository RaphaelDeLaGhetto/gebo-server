'use strict';

var passport = require('passport'),
    db = require('../config/dbschema'),
    utils = require('../lib/utils'),
    documentProvider = require('../config/documentProvider');

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
        console.log('-------------------------------');
        console.log(req.body);
        documentProvider.save(
                        req.body.data,
                        req.body.collection,
                        utils.getMongoDbname(req.body.owner.email)).
                then();
        res.send(200);
    }
  ];



