module.exports = function (app, express, passport) {

    var nconf = require('nconf'),
//        cachify = require('connect-cachify'),
        winston = require('winston'),
        path = require('path'),
        fs = require('fs'),
        bodyParser = require('body-parser'),
        methodOverride = require('method-override'),
        morgan = require('morgan'),
        multer = require('multer'),
        cookieParser = require('cookie-parser'),
        session = require('express-session'),
        favicon = require('static-favicon'),
        errorHandler = require('errorhandler'),
        ClusterStore = require('strong-cluster-express-store')(session);

    nconf.file({ file: './gebo.json' });
    var logLevel = nconf.get('logLevel');
 
    // load assets node from configuration file.
    var assets = nconf.get('assets') || {};

    // Logging is configured in gebo.json
    if (logLevel === 'info') {
      app.use(morgan('common'));
    }
    else if (logLevel ==='trace') {
      app.use(morgan('dev'));
    }
    if (logLevel !== 'off') {
      app.set('DEBUG', true);
      app.use(errorHandler({ dumpExceptions: true, showStack: true }));
    }

    /**
     * allowCrossDomain
     */
    var allowCrossDomain = function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
        res.header('Access-Control-Expose-Headers', 'Content-Disposition');

        if ('OPTIONS' === req.method) {
          res.send(200);
        }
        else {
          next();
        }
    };

    /**
     * Redirect to HTTPS
     *
     * Peter Lyons, 2013-4-5
     * http://stackoverflow.com/questions/15813677/https-redirection-for-all-routes-node-js-express-security-concerns
     */
    function requireHttps(req, res, next) {
        if (!req.secure) {
          var url = nconf.get('domain') + ':' + nconf.get('httpsPort') + req.url;
          console.log(url);
          return res.redirect(url);
        }
        next();
      }


    // Cachify Asset Configuration
//    app.use(cachify.setup(assets, {
//        root: root + '/public',
//        production: nconf.get('cachify')
//    }));

    // Global Configuration
    app.use(allowCrossDomain);

    // Find alternate views
    try {
        var viewsDir = fs.readdirSync('./views');
        app.set('views', './views');
    }
    catch(err) {
        app.set('views', __dirname + '/../views');
    }
    //app.set('views', './views');

    app.set('view engine', 'jade');
    app.set('view options', { layout: false });
    app.use(cookieParser());
    app.use(multer({
                        dest: '/tmp/',
                        limits: {
                            fieldSize: 4000000
                        },
                    }));
    // body-parser is needed for HAI login
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(methodOverride());

    // Find alternate public directory
    try {
        var publicDir = fs.readdirSync('./public');
        app.use(express.static('./public'));
    }
    catch(err) {
        app.use(express.static(__dirname + '/../public'));
    }

    // Find alternate favicon 
    try {
        var faviconFile = fs.openSync('./favicon.ico');
        faviconFile.close();
        app.use(favicon('./favicon.ico'));
    }
    catch(err) {
        app.use(favicon(__dirname + '/../favicon.ico'));
    }

    app.use(session({
                saveUninitialized: true,
                resave: true,
                store: new ClusterStore(),
                secret: 'What the halo!?'}));
    app.use(requireHttps);
    // Initialize Passport!  Also use passport.session() middleware, to support
    // persistent login sessions (recommended).
    app.use(passport.initialize());
    app.use(passport.session());
};
