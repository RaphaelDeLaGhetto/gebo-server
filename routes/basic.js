'use strict';

exports.index = function (req, res) {
    res.render('index', {
        title: 'gebo-server',
        user: req.user
      });
  };

