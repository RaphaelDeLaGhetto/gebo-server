/**
 * This ensures that a connection is made to the
 * test databases
 */
var mongoose = require('gebo-mongoose-connection').get(true),
    basic = require('gebo-basic-action'),
    nativeMongoConnection = basic.nativeMongoConnection.get(true, function(){});

var utils = require('../../lib/utils'),
    fs = require('fs'),
    generalUtils = require('gebo-utils'),
    mongo = require('mongodb'),
    GridStore = mongo.GridStore,
    nconf = require('nconf');


nconf.file({ file: 'gebo.json' });

/**
 * getDefaultDomain
 */
exports.getDefaultDomain = {
    'Return the host with https port': function(test) {
        test.expect(1);

        // Manually create the default host
        var manualDomain = nconf.get('domain') + ':' + nconf.get('httpsPort');
                
        var host = utils.getDefaultDomain();

        test.equal(host, manualDomain);
        test.done();
    },
};


/**
 * saveFileToDb
 */
var db, collection;
var TEST_DB = generalUtils.getMongoDbName(nconf.get('testEmail'));
exports.saveFileToDb = {

    setUp: function (callback) {
    	try{
            /**
             * Write the test file to /tmp
             */
            fs.createReadStream('./test/files/pdf.pdf').pipe(fs.createWriteStream('/tmp/pdf0.pdf'));

            // Get a database connection
            var server = new mongo.Server('localhost', 27017, {});

            db = new mongo.Db(TEST_DB, server, { safe: true });
            db.open(function (err, client) {
                if (err) {
                  console.log(err);
                }
        	collection = new mongo.Collection(client, 'someCollection');
    		callback();
              });
    	}
        catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        // Lose the database for next time
        db.dropDatabase(function(err) { 
            if (err) {
              console.log(err);
            }
            db.close();
            callback();
        });
    },

    'Return a file object': function(test) {
        test.expect(6);
        utils.saveFileToDb({
                            path: '/tmp/pdf0.pdf',
                            name: 'pdf0.pdf',
                            type: 'application/pdf',
                            size: 16,
                        }, collection).
            then(function(file) {
                test.equal(file.filename, 'pdf0.pdf');
                test.equal(file.contentType, 'application/pdf');
                test.equal(file.metadata.collection, 'someCollection');
                test.ok(file.uploadDate);

                // Make sure the file model is saved
                var fileSize = fs.statSync('/tmp/pdf0.pdf').size;
                var data = fs.readFileSync('/tmp/pdf0.pdf');

                GridStore.read(db, file.fileId, function(err, fileData) {
                    if (err) {
                      test.ok(false, err);
                    }
                    test.equal(data.toString('base64'), fileData.toString('base64')); 
                    test.equal(fileSize, fileData.length); 
                    test.done();
                  });
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Don\'t barf if the files object is empty, null, or undefined': function(test) {
        test.expect(3);

        var dir = 'docs/someResource';
        utils.saveFileToDb({}, collection).
            then(function() {
                test.ok(true);
                return utils.saveFileToDb(null, collection);
              }).
            then(function() {
                test.ok(true);
                return utils.saveFileToDb(undefined, collection);
              }).
            then(function() {
                test.ok(true);
                test.done(); 
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done(); 
              });
    },
};

