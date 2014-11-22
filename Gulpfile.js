/**
 * Created by Shaun on 11/13/2014.
 */

var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var karma = require('karma').server;
var runSequence = require('run-sequence');
var clean = require('gulp-clean');
var karmaConfig = __dirname + '/karma.conf.js';

gulp.task('clean', function() {
  return gulp.src('dist', {read: false})
    .pipe(clean());
});

gulp.task('build', function() {
  return gulp.src(
    [
      'bower_components/kilo-core/src/kilo-core.js',
      'bower_components/kilo-sup/src/**/*.js',
      'bower_components/kilo-scheduler/src/**/*.js',
      'src/**/*.js'
    ])
    .pipe(concat('kilo-flow.js'))
    .pipe(gulp.dest('dist'))
    .pipe(uglify())
    .pipe(rename('kilo-flow.min.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('test', function(cb) {
  return karma.start({
    configFile: karmaConfig,
    singleRun: true
  }, cb);
});

gulp.task('watch', function() {
  return gulp.watch('src/**/*.js', ['build']);
});

gulp.task('ci', function(cb) {
  return karma.start({
    configFile: karmaConfig
  }, cb);
});

gulp.task('default', function(cb) {
  //runSequence('test', 'clean', 'build', 'watch', cb);
  runSequence('clean', 'build', 'watch', cb);
});