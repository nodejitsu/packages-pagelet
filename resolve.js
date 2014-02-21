'use strict';

var Shrinkwrap = require('shrinkwrap')
  , readme = require('renderme')
  , Registry = require('npmjs')
  , async = require('async')
  , GitHulk = readme.GitHulk;

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
    , npm = new Registry({
        registry: options.registry,
        githulk: options.githulk
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

  delete data.package.readmeFilename;
  delete data.package.versions;
  delete data.package.readme;

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
  // Transform shrinkwrap to an array.
  //
  data.shrinkwrap = Object.keys(data.shrinkwrap || {}).map(function wrap(_id) {
    return data.shrinkwrap[_id];
  });

  fn(undefined, data);
}

//
// Expose the methods.
//
resolve.reduce = reduce;
module.exports = resolve;
