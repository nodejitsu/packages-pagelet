'use strict';

var Shrinkwrap = require('shrinkwrap')
  , readme = require('renderme')
  , Registry = require('npmjs')
  , async = require('async');

/**
* Gather all the required data to correctly render a package page.
*
* @param {String} name The name of the package.
* @param {String} registry The optional registry we should use.
* @param {Function} next The callback.
* @api private
*/
function resolve(name, registry, next) {
  if ('function' === typeof registry) {
    next = registry;
    registry = Registry.mirrors.nodejitsu;
  }

  var shrinkwrap = new Shrinkwrap({ registry: registry })
    , npm = new Registry({ registry: registry });

  npm.packages.details(name, function details(err, data) {
    if (err) return next(err);

    data = Array.isArray(data) ? data.pop() : data;

    //
    // Retrieve some additional information and pre-parse some information.
    //
    async.parallel({
      dependent: function render(next) {
        shrinkwrap.resolve(data, function resolved(err, data, dependent) {
          next(err, dependent);
        });
      },
      readme: function render(next) {
        readme(data, next);
      }
    }, function parallel(err, additional) {
      if (err) return next(err);

      reduce({
        package: data,
        readme: additional.readme,
        dependent: additional.dependent
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

  fn(undefined, data);
}

//
// Expose the methods.
//
resolve.reduce = reduce;
module.exports = resolve;
