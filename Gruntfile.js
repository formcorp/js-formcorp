module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        postcss: {
            options: {
                map: {
                    inline: false, // save all sourcemaps as separate files...
                },
                processors: [
                  require('pixrem')(), // add fallbacks for rem units
                  require('autoprefixer')({browsers: 'last 2 versions, ie 9, > 5% in AU'}), // add vendor prefixes
                  //require('cssnano')() // minify the result
                ]
            },
            dist: {
                src: 'lib/green-id/green-id.css'
            }
        },
        uglify: {
            build: {
                files: {
                    'realtime.min.js': 'realtime.js',
                    'formcorp.min.js': 'formcorp.js',
                    'lib/green-id.min.js': 'lib/green-id.js',
                    'lib/parser.min.js': 'lib/parser.js',
                    'lib/material_datetime/datepicker.standalone.min.js': 'lib/material_datetime/datepicker.standalone.js'
                }
            }
        },
        watch: {
            styles: {
                files: [
                    'lib/green-id/**/*.less',
                ],
                tasks: ['less']
            }
        },
        less: {
            development: {
                files: {
                    'lib/green-id/green-id.css': 'lib/green-id/green-id.less'
                }
            }
        }
    });

    // Load the plugins (packages) that provide the "uglify" and "less compiler" tasks.
    grunt.loadNpmTasks('grunt-postcss');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-less');

    // Task(s).
    grunt.registerTask('default', ['uglify', 'less', 'watch']);
    grunt.registerTask('css', ['less', 'postcss', 'watch']);
    //grunt.registerTask('watch');
};
