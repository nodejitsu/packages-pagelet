'use strict';

var debug = require('diagnostics')('packages-pagelet:resolve')
  , Shrinkwrap = require('shrinkwrap')
  , Registry = require('npm-registry')
  , readme = require('renderme')
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

  var api = clients(options)
    , githulk = api.git
    , npm = api.npm;

  var shrinkwrap = new Shrinkwrap({
    githulk: githulk,               // Custom GitHulk instance so it can be re-used.
    production: true,               // Don't include devDependencies.
    registry: npm                   // Do use a custom Registry instance.
  });

  npm.packages.details(name, function details(err, data) {
    if (err) return next(err);

    data = Array.isArray(data) ? data.pop() : data;

    //
    // Retrieve some additional information and pre-parse some information.
    //
    async.parallel({
      shrinkwrap: function render(next) {
        shrinkwrap.resolve(data, function resolved(err, data, nonfatal) {
          next(err, data);

          if (nonfatal && nonfatal.length) nonfatal.forEach(function (err) {
            debug('non-fatal error while processing %s', name, err);
          });
        });
      },

      depended: function render(next) {
        npm.packages.depended(name, next);
      },

      readme: function render(next) {
        readme(data, { githulk: githulk }, next);
      },

      stats: function downloads(next) {
        if (!npm.downloads) return next(undefined, { downloads: 0 });

        npm.downloads.totals('last-day', name, function handle(err, data) {
          next(err, data = Array.isArray(data) ? data[0] : data);
        });
      },

      github: function render(next) {
        var project = githulk.project(data);

        if (!project || !project.user || !project.repo) return next();

        //
        // Get repository details but ignore any returned error by GitHulk.
        // This data is considered highly optional and should not stop processing.
        //
        githulk.repository.moved(
          project.user + '/' + project.repo,
          function moved(err, parsed, changed) {
            if (err) return next(null);
            if (changed) project = parsed;

            githulk.repository.get(
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

      additional.package = data;
      reduce(additional, next);
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
  // dependencies by providing them with a number, useful for sorting later on.
  //
  if ('object' === typeof data.shrinkwrap) {
    Object.keys(data.shrinkwrap).forEach(function each(_id) {
      var shrinkwrap = data.shrinkwrap[_id];

      delete shrinkwrap.dependencies;
      delete shrinkwrap.dependent;
      delete shrinkwrap.parents;
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
  // Transform shrinkwrap to an array and prioritize on depth.
  //
  data.shrinkwrap = Object.keys(data.shrinkwrap || {}).map(function wrap(_id) {
    return data.shrinkwrap[_id];
  }).sort(function sort(a, b) {
    return a.depth - b.depth;
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

/**
 * Simple helper function to get a working npm and githulk client.
 *
 * @param {Object} options Configuration.
 * @returns {Object} Pre-configured npm and git.
 * @api private
 */
function clients(options) {
  options = options || {};
  options.registry = options.registry || Registry.mirrors.nodejitsu;

  var githulk = options.githulk || new GitHulk();

  //
  // Only create a new Registry instance if we've been supplied with a string.
  //
  var npm = 'string' !== typeof options.registry
    ? options.registry
    : new Registry({
      registry: options.registry,
      githulk: githulk
  });

  return {
    git: githulk,
    npm: npm
  };
}

//
// Expose the methods.
//
resolve.clients = clients;
resolve.reduce = reduce;
module.exports = resolve;
