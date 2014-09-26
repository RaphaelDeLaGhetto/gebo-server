var express = require('express'),
    fs = require('fs'),
    http = require('http'),
    https = require('https'),
    nativeMongoConnection = require('./lib/native-mongo-connection'),
    nconf = require('nconf'),
    passport = require('passport'),
    server = express(),
    utils = require('./lib/utils'),
    winston = require('winston');

module.exports = function(testing) {

    if (testing === undefined || typeof testing !== 'boolean') {
      testing = false;
    }

    /**
     * Use these functions to retrieve the
     * appropriate database connection. This
     * step ensures that the gebo establishes
     * the correct connection to the database
     * (i.e., testing or production)
     */
    nativeMongoConnection.get(testing, function(){}); 
    exports.nativeMongoConnection = nativeMongoConnection;
    exports.mongoose = require('gebo-mongoose-connection').get(testing);

    /**
     * Load gebo configurations
     */
    nconf.file({ file: './gebo.json' });
    var logLevel = nconf.get('logLevel');

    /**
     * Load passport configuration,
     * standard gebo routes, and basic 
     * actions
     */
    var pass = require('./config/pass'),
        basic_routes = require('./routes/basic'),
        message_routes = require('./routes/message'),
        perform_route = require('./routes/perform')(),
        oauth2_routes = require('./routes/oauth2')(),
        user_routes = require('./routes/user')();
    
    /**
     * Expose the necessary modules 
     */   
    exports.actions = require('./actions')(); 
    exports.schemata = require('./schemata');
    exports.server = server;
    exports.utils = utils;
    
    /**
     * Winston Logger
     */
    var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({ colorize: true }) ] });

    /**
     * Apply settings
     */
    require('./config/settings')(server, express, passport);

    /**
     * Basic routes
     */
    server.get('/', basic_routes.index);

    /**
     * Authenticated user routes
     */
    server.get('/account', user_routes.account);
    server.get('/login', user_routes.getLogin);
    server.post('/login', user_routes.postLogin);
    server.get('/admin', user_routes.admin);
    server.get('/logout', user_routes.logout);
    server.post('/signup', user_routes.signUp);

    /**
     * OAuth2 routes
     */
    server.get('/dialog/authorize', oauth2_routes.authorization); 
    server.post('/dialog/authorize/decision', oauth2_routes.decision); 
    server.post('/oauth/token', oauth2_routes.token);
    server.get('/verify', oauth2_routes.verify);

    /**
     * Perform route
     */
    server.post('/perform', perform_route.perform);

    /**
     * Message routes
     */
    server.post('/send', message_routes.send);
    server.post('/receive', message_routes.receive);

    /**
     * Enable behaviour defined in action module
     *
     * @param string - a unique module name
     * @param object
     */
    exports.enable = function(moduleName, actionModule) {
        // Add actions
        if (actionModule.actions) {
          var keys = Object.keys(actionModule.actions);
          if (keys.length > 0) { 
            exports.actions[moduleName] = {};
            for (var i = 0; i < keys.length; i++) {
              exports.actions[moduleName][keys[i]] = actionModule.actions[keys[i]]; 
            }
          }
          //exports.actions.add(actionModule.actions); 
        }
        // Add modules
        if (actionModule.schemata) {
          exports.schemata.add(moduleName, actionModule.schemata);
        }
      };

    /**
     * Start the gebo servers
     */
    exports.start = function() {
        // HTTP
        if (logLevel !== 'trace') logger.info('HTTP listening on', nconf.get('port'));
        http.createServer(server).listen(nconf.get('port'));
        

        // HTTPS
        var sslConfig = nconf.get('ssl');
        var options = {
                cert: fs.readFileSync(sslConfig.cert),
                key: fs.readFileSync(sslConfig.key),
                ca: sslConfig.ca?fs.readFileSync(sslConfig.ca):undefined,
            };

        if (logLevel !== 'trace') logger.info('HTTPS listening on', nconf.get('httpsPort'));
        https.createServer(options, server).listen(nconf.get('httpsPort'));
      };

    return exports;
}
