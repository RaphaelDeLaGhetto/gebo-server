var cluster = require('cluster'),
    nconf = require('nconf'),
    winston = require('winston');

nconf.file({ file: './gebo.json' });
var logLevel = nconf.get('logLevel');
var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({ colorize: true }) ] });

/**
 * The clustering stuff is courtesy of Rowan Manning
 * http://rowanmanning.com/posts/node-cluster-and-express/
 * 2014-2-28
 */
if (cluster.isMaster) {

  require('strong-cluster-express-store').setup();

  // Count the machine's CPUs
  var cpuCount = require('os').cpus().length;

  // Create a worker for each CPU
  for (var i = 0; i < cpuCount; i += 1) {
    cluster.fork();
  }

  // Listen for dying workers
  cluster.on('exit', function (worker) {
        // Replace the dead worker,
        // we're not sentimental
        if (logLevel === 'trace') logger.warn('Worker ' + worker.id + ' died :(');
        cluster.fork();
    });
}

else {
  /**
   * Run node demo.js
   */
  var gebo = require('./index')();
  
  gebo.start();

  if (logLevel === 'trace') logger.info('Worker ' + cluster.worker.id + ' running!');
}
