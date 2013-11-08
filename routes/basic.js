'use strict';

var nconf = require('nconf');
nconf.argv().env().file({ file: 'local.json' });

exports.index = function (req, res) {
    res.render('index', {
        title: nconf.get('name'),
        agent: req.user
      });
  };

