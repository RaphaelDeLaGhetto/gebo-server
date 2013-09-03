var mongo = require('mongodb'),
    config = require('../../config/config');

//var cname='unitTest';
//module.exports = {
//    setUp: function (callback) {
//	try{
//         var server = new mongo.Server(config.mongo.host,
//                                       config.mongo.port,
//                                       config.mongo.options || {});
//         this.db = new mongo.Db(config.mongo.db, server, {});
//         this.db.open(function (err, client) {
//               if (err) {throw err;}
//		this.collection = new mongo.Collection(client, cname);
//		this.collection.remove({},function(err){
//			callback();
//		});
//         });
//	}catch(e){
//		console.dir(e);
//	}
//    },
//    tearDown: function (callback) {
//        this.db.close();
//	callback();
//    },
//    'Connect to Mongo' : function (test) {
//					test.expect(2);
//					collection.insert({foo:'bar'},function(err,docs){
//						if(err){
//							test.ok(false, err);
//						}
//						test.ok(true, 'Inserted doc with no err.');
//					        collection.count(function(err, count) {
//						  test.equal(1, count, 'There is only one doc in the collection');
//						  test.done();
//					        });
//					});
//			}
//};
