'use strict';

var passport = require('passport'),
    nconf = require('nconf');

nconf.argv().env().file({ file: 'local.json' });
var gebo = require('../schemata/gebo')(nconf.get('email'));

exports.verify = [
    passport.authenticate('bearer', { session: false }),
    function (req, res) {
        console.log('api');
        console.log(req.user);
        // req.authInfo is set using the `info` argument supplied by
        // `BearerStrategy`.  It is typically used to indicate scope of the token,
        // and used in access control checks.  For illustrative purposes, this
        // example simply returns the scope in the response.
        gebo.registrantModel.findById(req.user.id, function (err, registrant) {
            res.json({ name: registrant.name, email: registrant.email, scope: req.authInfo.scope });
          });
      }
  ];

