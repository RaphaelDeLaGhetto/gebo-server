'use strict';

var passport = require('passport'),
    nconf = require('nconf'),
    utils = require('../lib/utils'),
    action = require('../config/action'),
    q = require('q');

nconf.argv().env().file({ file: 'local.json' });
var db = require('../config/dbschema')(nconf.get('name'));

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

