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
        res.json(req.user);
      }
  ];

