'use strict';

exports.onLoad = {

    'Load every file in the conversations folder': function(test) {
        test.expect(4);
        var conversations = require('../../conversations');
        test.equal(typeof conversations.request.client, 'function');
        test.equal(typeof conversations.request.server, 'function');
        test.equal(conversations.utils, undefined);
        test.equal(conversations.index, undefined);
        test.done();
    },
};


