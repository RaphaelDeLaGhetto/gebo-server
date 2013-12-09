var express = require('express'),
    http = require('http'),
    https = require('https'),
    app = express(),
    nconf = require('nconf'),
    winston = require('winston'),
    pass = require('./config/pass'),
    passport = require('passport'),
    api_routes = require('./routes/api'),
    basic_routes = require('./routes/basic'),
    message_routes = require('./routes/message'),
    util = require('util'),
    fs = require('fs');
    
// Expose the Express app so that it may be run
// as a virtual host
exports.app = app;

// Logging
var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({colorize:true}) ] });

// Load the settings
require('./settings')(app, express, passport, logger);

// Merge nconf overrides with the configuration file.
nconf.argv().env().file({ file: 'local.json' });

// Requirements
var perform_route = require('./routes/perform')(nconf.get('email')),
    oauth2_routes = require('./routes/oauth2')(nconf.get('email')),
    user_routes = require('./routes/user')(nconf.get('email'));

// Basic routes
app.get('/', basic_routes.index);

// Authenticated user routes
app.get('/account', user_routes.account);
app.get('/login', user_routes.getLogin);
app.post('/login', user_routes.postLogin);
app.get('/admin', user_routes.admin);
app.get('/logout', user_routes.logout);
app.post('/signup', user_routes.signUp);
app.post('/poke', user_routes.poke);

// OAuth2 routes
app.get('/dialog/authorize', oauth2_routes.authorization); 
app.post('/dialog/authorize/decision', oauth2_routes.decision); 
app.post('/oauth/token', oauth2_routes.token);

// Experimental JWT
app.post('/authorize', oauth2_routes.testtoken);


// Perform route
app.post('/perform', perform_route.perform);

// API routes
app.get('/verify', api_routes.verify);

// Message routes
app.post('/send', message_routes.send);
app.post('/receive', message_routes.receive);

// HTTP
logger.info('HTTP listening on', nconf.get('port'));
http.createServer(app).listen(nconf.get('port'));

// HTTPS
// Start the secure server
var options = {
    key: fs.readFileSync('./cert/key.pem'),
    cert: fs.readFileSync('./cert/cert.pem'),
};
logger.info('HTTPS listening on', nconf.get('httpsPort'));
https.createServer(options, app).listen(nconf.get('httpsPort'));


