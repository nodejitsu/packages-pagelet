'use strict';

var Shrinkwrap = require('shrinkwrap')
  , Registry = require('npm-registry')
  , readme = require('renderme')
  , moment = require('moment')
  , async = require('async');

//
// Re-use the Github instance from `renderme`.
//
var GitHulk = readme.GitHulk;

/**
* Gather all the required data to correctly render a package page.
*
* @param {String} name The name of the package.
* @param {Object} options Options
* @param {Function} next The callback.
* @api private
*/
function resolve(name, options, next) {
  if ('function' === typeof options) {
    next = options;
    options = {};
  }

  options.registry = options.registry || Registry.mirrors.nodejitsu;
  options.githulk = options.githulk || new GitHulk();

  var shrinkwrap = new Shrinkwrap({
        registry: options.registry,
        githulk: options.githulk
      })
    , npm = 'string' === typeof options.registry
      ? new Registry({
          registry: options.registry,
          githulk: options.githulk
        })
      : options.registry;

  npm.packages.details(name, function details(err, data) {
    if (err) return next(err);

    data = Array.isArray(data) ? data.pop() : data;

    //
    // Retrieve some additional information and pre-parse some information.
    //
    async.parallel({
      shrinkwrap: function render(next) {
        shrinkwrap.resolve(data, function resolved(err, data, dependent) {
          next(err, dependent);
        });
      },
      readme: function render(next) {
        readme(data, { githulk: options.githulk }, next);
      }
    }, function parallel(err, additional) {
      if (err) return next(err);

      reduce({
        package: data,
        readme: additional.readme,
        shrinkwrap: additional.shrinkwrap
      }, next);
    });
  });
}

/**
 * Reduce the massive data structure to something useful.
 *
 * @param {Object} data The received data structure.
 * @param {Function} fn The callback.
 * @api private
 */
function reduce(data, fn) {
  delete data.package.readmeFilename;   // README is already parsed.
  delete data.package.versions;         // Adds to much bloat.
  delete data.package.readme;           // README is already parsed.

  //
  // Remove circular references as it would prevent us from caching in Redis or
  // what ever because there's a circular reference.
  //
  if ('object' === typeof data.dependent) {
    Object.keys(data.dependent).forEach(function each(id) {
      delete data.dependent[id].dependencies;
      delete data.dependent[id].dependent;
      delete data.dependent[id].parent;
    });
  }

  //
  // Make sure we default to something so we don't get template errors
  //
  data.readme = data.readme || data.package.description || '';

  //
  // Make all dates human readable.
  //
  if (data.package.time) Object.keys(data.package.time).forEach(function (time) {
    var date = data.package.time[time];

    data.package.time[time] = {
      human: moment(date).format('MMM Do YYYY'),
      ago: moment(date).fromNow(),
      full: date
    };
  });

  ['created', 'modified'].forEach(function (time) {
    var date = data.package[time];

    data.package[time] = {
      human: moment(date).format('MMM Do YYYY'),
      ago: moment(date).fromNow(),
      full: date
    };
  });

  //
  // Transform shrinkwrap to an array.
  //
  data.shrinkwrap = Object.keys(data.shrinkwrap || {}).map(function wrap(_id) {
    return data.shrinkwrap[_id];
  });

  //
  // Remove empty objects from the package.
  //
  [
    'repository',
    'homepage',
    'bugs'
  ].forEach(function each(key) {
    if (Array.isArray(data.package[key])) {
      if (!data.package[key].length) delete data.package[key];
    } else if ('object' === typeof data.package[key] && !Object.keys(data.package[key]).length) {
      delete data.package[key];
    }
  });

  fn(undefined, data);
}

//
// Expose the methods.
//
resolve.reduce = reduce;
module.exports = resolve;
