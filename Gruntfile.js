'use strict';

var utils = require('./lib/utils'),
    nconf = require('nconf');

nconf.argv().env().file({ file: 'local.json' });
var db = require('./schemata/gebo')(nconf.get('email')),
    action = require('./actions/basic')(nconf.get('email'));


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
        grunt.task.run('registeragent:admin:admin@example.com:secret:true');
        grunt.task.run('registeragent:bob:bob@example.com:secret:false');
        grunt.task.run('addfriend:bob:bob@example.com:admin@example.com');
        grunt.task.run('addfriend:admin:admin@example.com:bob@example.com');
        //grunt.task.run('addclient:Samplr:abc123:ssh-secret');
      });

    grunt.registerTask('registeragent', 'add an agent to the database',
        function (usr, emailaddress, pass, adm) {
            // convert adm string to bool
            adm = (adm === 'true');

            var agent = new db.registrantModel({
                name: usr,
                email: emailaddress,
                password: pass,
                admin: adm
              });
    
            // save call is async, put grunt into async mode to work
            var done = this.async();

            agent.save(function (err) {
                if (err) {
                  console.log('Error: ' + err);
                  done(false);
                }
                else {
                  console.log('Registered ' + agent.name);
                  action.createDatabase({ admin: true,
                                          dbName: utils.getMongoDbName(emailaddress) },
                                        { profile: agent }).
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

            db.connection.db.on('open', function () {
                db.connection.db.dropDatabase(function (err) {
                    if (err) {
                      console.log('Error: ' + err);
                      done(false);
                    }
                    else {
                      console.log('Successfully dropped db');
                      done();
                    }
                  });
              })
          });

    /**
     * addfriend
     */
    grunt.registerTask('addfriend', 'add a friend to the agent specified',
        function (name, email, agentEmail) {
            var agentDb = require('./schemata/agent')(agentEmail);

            var friend = agentDb.friendModel({
                    name: name,
                    email: email,
                });

            // Can't modify ID in findOneAndUpdate
            friend._id = undefined;

            // Save call is async. Put grunt into async mode to work
            var done = this.async();

            agentDb.friendModel.findOneAndUpdate({ email: friend.email },
                    friend.toObject(),
                    { upsert: true },
                    function (err) {
                        if (err) {
                          console.log('Error: ' + err);
                          done(false);
                        }
                        else {
                          console.log('Saved friend: ' + friend.name);
                          done();
                        }
                      });
          });

    /**
     * setpermission
     */
    grunt.registerTask('setpermission', 'Set access to an agent\'s resource',
        function(friendAgent, ownerAgent, resource, read, write, execute) {
            var agentDb = require('./schemata/agent')(ownerAgent);
            
            // Save call is async. Put grunt into async mode to work
            var done = this.async();

            agentDb.friendModel.findOne({ email: friendAgent },
                function(err, friend) {
                    if (err) {
                      console.log(err);
                    }

                    var index = utils.getIndexOfObject(friend.hisPermissions, 'email', resource);

                    if (index > -1) {
                      friend.hisPermissions.splice(index, 1);
                    }
                    friend.hisPermissions.push({ email: resource,
                                                 read: read === 'true', 
                                                 write: write === 'true', 
                                                 execute: execute === 'true', 
                                               });

                    friend.save(function(err) {
                        if (err) {
                          console.log(err);
                        }
                        done();
                      });
                  });
          });

  };
