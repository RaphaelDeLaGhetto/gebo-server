'use strict';

exports.index = function (req, res) {
    res.render('index', {
        title: '{%= name %}',
        user: req.user
      });
  };

