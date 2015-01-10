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
var jsSources = [
  'bower_components/kilo/src/kilo.js',
  'bower_components/kilo-extra/src/**/*.js',
  'bower_components/kilo-scheduler/src/**/*.js',
  'src/**/*.js'
];

gulp.task('clean', function() {
  return gulp.src('dist', {read: false})
    .pipe(clean());
});

gulp.task('build', function() {
  return gulp.src(jsSources)
    .pipe(concat('kilo-flow.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('build-prod', function() {
  return gulp.src(jsSources)
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

gulp.task('prod', function(cb) {
  runSequence('test', 'clean', 'prod-build', cb);
});