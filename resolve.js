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

  //
  // Only create a new Registry instance if we've been supplied with a string.
  //
  var npm = 'string' !== typeof options.registry
    ? options.registry
    : new Registry({
      registry: options.registry,
      githulk: options.githulk
  });

  var shrinkwrap = new Shrinkwrap({
    githulk: options.githulk,
    registry: npm
  });

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
      },
      github: function render(next) {
        var project = options.githulk.project(data);
        if (!project || !project.user || !project.repo) return next();

        //
        // Get repository details but ignore any returned error by githulk.
        // This data is considered highly optional and should not stop processing.
        //
        options.githulk.repository.moved(
          project.user + '/' + project.repo,
          function moved(err, parsed, changed) {
            if (err) return next(null);
            if (changed) project = parsed;

            options.githulk.repository.get(
              project.user + '/' + project.repo,
              function get(err, data) {
                next(null, data);
              }
            );
          }
        );
      }
    }, function parallel(err, additional) {
      if (err) return next(err);

      reduce({
        package: data,
        readme: additional.readme,
        shrinkwrap: additional.shrinkwrap,
        github: additional.github
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
  // what ever because there's a circular reference. Keep track of what are main
  // dependencies by providing them with a number, usefull for sorting later on.
  //
  if ('object' === typeof data.shrinkwrap) {
    Object.keys(data.shrinkwrap).forEach(function each(id) {
      data.shrinkwrap[id].main = +(data.shrinkwrap[id].parent.name === data.package.name);

      delete data.shrinkwrap[id].dependencies;
      delete data.shrinkwrap[id].dependent;
      delete data.shrinkwrap[id].parent;
    });
  }

  //
  // Extract github data from array.
  //
  if (data.github && data.github.length) data.github = data.github.pop();

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
  // Transform shrinkwrap to an array and prioritize main dependencies.
  //
  data.shrinkwrap = Object.keys(data.shrinkwrap || {}).map(function wrap(_id) {
    return data.shrinkwrap[_id];
  }).sort(function sort(a, b) {
    return b.main - a.main;
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
