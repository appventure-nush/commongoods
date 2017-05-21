module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    sass: {
      dist: {
        options:{
          outputStyle: 'compressed',
          sourceMap: 'inline'
        },
        files: {
          'assets/css/main.css': 'assets/sass/main.scss'
        }
      }
    },
    postcss:{
      options: {
        map: true,
        processors: [
          require('autoprefixer')({ browsers: 'last 2 versions' })
        ]
      },
      dist:{
        src: 'assets/css/main.css'
      }
    },
    watch: {
      css: {
        files: 'assets/sass/**/*',
        tasks: ['sass', 'postcss']
      }
    }
  });
  grunt.loadNpmTasks('grunt-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-postcss');
  grunt.registerTask('default', ['sass', 'postcss']);
}
