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

    //
    // Retreive some additional information and pre-parse some information.
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
  fn(undefined, data);
}

//
// Expose the methods.
//
resolve.reduce = reduce;
module.exports = resolve;
