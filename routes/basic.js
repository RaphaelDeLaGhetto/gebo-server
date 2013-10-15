'use strict';

exports.index = function (req, res) {
    res.render('index', {
        title: 'gebo-server',
        agent: req.user
      });
  };

