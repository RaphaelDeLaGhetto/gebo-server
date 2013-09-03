var documentProvider = require('../../config/documentProvider'),
    config = require('../../config/config'),
    DatabaseCleaner = require('database-cleaner'),
    databaseCleaner = new DatabaseCleaner('mongodb'),
    mongo = require("mongodb");


var cname='unitTest';
module.exports = {
    
    setUp: function (callback) {
    	try{
            var server = new mongo.Server(config.mongo.host,
                                          config.mongo.port,
                                          config.mongo.serverOptions);
            this.db = new mongo.Db(config.mongo.db, server, config.mongo.clientOptions);
            this.db.open(function (err, client) {
                if (err) {
                  throw err;
                }
        		this.collection = new mongo.Collection(client, cname);
    	    	this.collection.remove({}, function(err) {
    		    	callback();
    		    });
             });
    	} catch(e) {
    		console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        databaseCleaner.clean(this.db, function() {
            console.log('Done');
            this.db.close();
        });
    	callback();
    },
    

    'Connect to Mongo' : function (test) {
        test.expect(2);
        collection.insert({foo:'bar'},function(err,docs) {
            if(err) {
              test.ok(false, err);
            }
            test.ok(true, 'Inserted doc with no err.');
            collection.count(function(err, count) {
                test.equal(1, count, 'There is only one doc in the collection');
                test.done();
            });
        });
    },

    'Save to database': function(test) {
        collection.insert({user: 'dan', email: 'dan@email.com'});
        test.equal(documentProvider.save(2), 4);
        test.done();
    },
    
}
