'use strict';

var utils = require('./lib/utils'),
    nconf = require('nconf');

nconf.argv().env().file({ file: 'local.json' });
var db = require('./config/dbschema')(nconf.get('name')),
    action = require('./config/action')(nconf.get('name'));

module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({

        // Metadata.
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                   '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                   '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
                   '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                   ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',

        // Task configuration.
        concat: {
            options: {
                banner: '<%= banner %>',
                stripBanners: true
              },
              dist: {
                src: ['lib/<%= pkg.name %>.js'],
                dest: 'dist/<%= pkg.name %>.js'
              },
            },
            uglify: {
                options: {
                    banner: '<%= banner %>'
                  },
                  dist: {
                    src: '<%= concat.dist.dest %>',
                    dest: 'dist/<%= pkg.name %>.min.js'
                  },
                },
                nodeunit: {
                    files: ['test/**/*.js']
                  },
                  jshint: {
                    options: {
                        jshintrc: '.jshintrc'
                      },
                      gruntfile: {
                        src: 'Gruntfile.js'
                      },
                      apps: {
                        src: ['app/**/*.js']
                      },
                      config: {
                        src: ['config/**/*.js']
                      },
                      lib: {
                        src: ['lib/**/*.js']
                      },
                      routes: {
                        src: ['routes/**/*.js']
                      },
//            test: {
//                src: ['test/**/*.js']
//            },
                    },
                    watch: {
                        gruntfile: {
                            files: '<%= jshint.gruntfile.src %>',
                            tasks: ['jshint:gruntfile']
                          },
                          lib: {
                            files: '<%= jshint.lib.src %>',
                            tasks: ['jshint:lib', 'nodeunit']
                          },
                          test: {
                            files: '<%= jshint.test.src %>',
                            tasks: ['jshint:test', 'nodeunit']
                          },
                        },
                      });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Default task.
    grunt.registerTask('default', ['jshint', 'nodeunit', 'concat', 'uglify']);

    /** 
     * Thank you to jaredhanson/passport-local
     * https://github.com/jaredhanson/passport-local
     */
    grunt.registerTask('dbseed', 'seed the database', function () {
        grunt.task.run('adduser:admin:admin@example.com:secret:true');
        grunt.task.run('adduser:bob:bob@example.com:secret:false');
        grunt.task.run('addclient:Samplr:abc123:ssh-secret');
      });

    grunt.registerTask('adduser', 'add a user to the database',
        function (usr, emailaddress, pass, adm) {
            // convert adm string to bool
            adm = (adm === 'true');

            var user = new db.userModel({
                name: usr,
                email: emailaddress,
                password: pass,
                admin: adm
              });
    
            // save call is async, put grunt into async mode to work
            var done = this.async();

            user.save(function (err) {
                if (err) {
                  console.log('Error: ' + err);
                  done(false);
                }
                else {
                  console.log('saved user: ' + user.name);
                  action.createDatabase(
                          utils.getMongoDbName(emailaddress),
                          user).
                    then(function() {
                        done();
                      }).
                    catch(function(err) {
                        if (err) {
                          console.log(err);
                          done(false);
                        }
                        done();
                      });
                }
              });
          });

    grunt.registerTask('dbdrop', 'drop the database',
        function () {
            // async mode
            var done = this.async();

            db.mongoose.db.on('open', function () {
                db.mongoose.db.dropDatabase(function (err) {
                    if (err) {
                      console.log('Error: ' + err);
                      done(false);
                    }
                    else {
                      console.log('Successfully dropped db');
                      done();
                    }
                  });
              });
          });

    /**
     * addclient
     */
    grunt.registerTask('addclient', 'add a client to the database',
        function (name, clientId, secret) {

            var client = new db.clientModel({
                name: name,
                clientId: clientId,
                secret: secret,
              });
    
            // save call is async, put grunt into async mode to work
            var done = this.async();

            client.save(function (err) {
                if (err) {
                  console.log('Error: ' + err);
                  done(false);
                }
                else {
                  console.log('saved client: ' + client.name);
                  done();
                }
              });
          });

  };
