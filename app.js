var express = require('express'),
    app = express(),
    nconf = require('nconf'),
    winston = require('winston'),
    db = require('./config/dbschema'),
    pass = require('./config/pass'),
    passport = require('passport'),
    api_routes = require('./routes/api'),
    basic_routes = require('./routes/basic'),
    user_routes = require('./routes/user'),
    oauth2_routes = require('./routes/oauth2'),
    util = require('util');
    
// Expose the Express app so that it may be run
// as a virtual host
exports.app = app;

// Logging
var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({colorize:true}) ] });

// Load the settings
require('./settings')(app, express, passport, logger);

// Merge nconf overrides with the configuration file.
nconf.argv().env().file({ file: 'local.json' });

// Basic routes
app.get('/', basic_routes.index);

// Authenticated user routes
app.get('/account', user_routes.account);
app.get('/login', user_routes.getLogin);
app.post('/login', user_routes.postLogin);
app.get('/admin', user_routes.admin);
app.get('/logout', user_routes.logout);

// OAuth2 routes
app.get('/dialog/authorize', oauth2_routes.authorization); 
app.post('/dialog/authorize/decision', oauth2_routes.decision); 
app.post('/oauth/token', oauth2_routes.token);
//app.get('/oauth/agent', oauth2_routes.agentLogin);

// Performative route
performative_routes = require('./routes/performative')(nconf.get('name')),
app.post('/request', performative_routes.request);

// API routes
app.get('/api/userinfo', api_routes.userinfo);

logger.info('listening on', nconf.get('port'));
app.listen(process.env.PORT || nconf.get('port'));

