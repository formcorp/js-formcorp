module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            build: {
                files: {
                    'analytics.min.js': 'analytics.js',
                    'formcorp.min.js': 'formcorp.js',
                    'lib/green-id.min.js': 'lib/green-id.js'
                }
            }
        }
    });

    // Load the plugins (packages) that provide the "uglify" and "less compiler" tasks.
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // Task(s).
    grunt.registerTask('default', ['uglify']);
};