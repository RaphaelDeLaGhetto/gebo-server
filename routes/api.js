'use strict';

var passport = require('passport'),
    db = require('../config/dbschema');

exports.userinfo = [
    passport.authenticate('bearer', { session: false }),
    function (req, res) {
        // req.authInfo is set using the `info` argument supplied by
        // `BearerStrategy`.  It is typically used to indicate scope of the token,
        // and used in access control checks.  For illustrative purposes, this
        // example simply returns the scope in the response.
        db.userModel.findById(req.user.id, function (err, user) {

            // Pretty sure this is going to have to change
            res.header('Access-Control-Allow-Origin', '*');
            res.json({ username: user.username, email: user.email, scope: req.authInfo.scope });
          });
      }
  ];

