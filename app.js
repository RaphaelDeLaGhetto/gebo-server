var express = require('express'),
    http = require('http'),
    https = require('https'),
    server = express(),
    nconf = require('nconf'),
    winston = require('winston'),
    passport = require('passport'),
    util = require('util'),
    fs = require('fs');

/**
 * Load gebo configurations
 */
nconf.file({ file: 'gebo.json' });

/**
 * Expose the gebo server
 */   
exports.server = server;

/**
 * gebo requirements
 */
var pass = require('./config/pass'),
    api_routes = require('./routes/api'),
    basic_routes = require('./routes/basic'),
    message_routes = require('./routes/message'),
    perform_route = require('./routes/perform')(nconf.get('email')),
    oauth2_routes = require('./routes/oauth2')(nconf.get('email')),
    user_routes = require('./routes/user')(nconf.get('email'));

// Logging
var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({ colorize: true }) ] });

// Load the settings
require('./config/settings')(server, express, passport, logger);

// Basic routes
server.get('/', basic_routes.index);

// Authenticated user routes
server.get('/account', user_routes.account);
server.get('/login', user_routes.getLogin);
server.post('/login', user_routes.postLogin);
server.get('/admin', user_routes.admin);
server.get('/logout', user_routes.logout);
server.post('/signup', user_routes.signUp);

// OAuth2 routes
server.get('/dialog/authorize', oauth2_routes.authorization); 
server.post('/dialog/authorize/decision', oauth2_routes.decision); 
server.post('/oauth/token', oauth2_routes.token);

// Perform route
server.post('/perform', perform_route.perform);

// API routes
server.get('/verify', api_routes.verify);

/**
 * Message routes
 */
server.post('/send', message_routes.send);
server.post('/receive', message_routes.receive);

// HTTP
logger.info('HTTP listening on', nconf.get('port'));
http.createServer(server).listen(nconf.get('port'));

/**
 * HTTPS
 *
 * Configure and start the server
 */
var root = nconf.get('root');
if (!root) {
  root = '.';
}
var options = {
    key: fs.readFileSync(root + '/cert/key.pem'),
    cert: fs.readFileSync(root + '/cert/cert.pem'),
};

logger.info('HTTPS listening on', nconf.get('httpsPort'));
https.createServer(options, server).listen(nconf.get('httpsPort'));


