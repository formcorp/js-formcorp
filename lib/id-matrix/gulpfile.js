var gulp        = require('gulp'),
    gulpIf      = require('gulp-if'),
    sass        = require('gulp-sass'),
    sourcemaps  = require('gulp-sourcemaps'),
    browserSync = require('browser-sync').create(),
    strip       = require('gulp-strip-comments'),
    minifyCSS   = require('gulp-minify-css'),
    util        = require('gulp-util'),
    runSequence = require('run-sequence');

var MODULE_DIR = '.',
    DIST_DIR = MODULE_DIR + '/dist',
    SASS_DIR  = MODULE_DIR + '/sass',
    SASS_FILE = SASS_DIR + '/main.scss';

gulp.task('serve', ['sass'], function () {
  browserSync.init({
    proxy: 'http://localhost:3000'
  });

  gulp.watch(SASS_DIR + '/**/*.scss', ['sass']);
});

gulp.task('sass', function () {
  return gulp.src(SASS_FILE)
    .pipe(gulpIf(!util.env.production, sourcemaps.init()))
    .pipe(sass.sync().on('error', sass.logError))
    .pipe(strip())
    //.pipe(minifyCSS())
    .pipe(gulpIf(!util.env.production, sourcemaps.write()))
    .pipe(gulp.dest(DIST_DIR))
    .pipe(gulpIf(!util.env.production, browserSync.stream()));
});

gulp.task('build', function () {
  if (util.env.production) {
    runSequence([
        'sass'
    ]);
  } else {
    runSequence([
        'serve'
    ])
  }
});

gulp.task('default', ['build']);
