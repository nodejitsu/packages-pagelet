'use strict';

var Registry = require('npm-registry')
  , Pagelet = require('pagelet')
  , Contour = require('contour')
  , resolve = require('./resolve')
  , major = require('./package.json').version.slice(0, 1);

Pagelet.extend({
  //
  // Specify the locations of our UI components.
  //
  view: 'view.ejs',       // The template that gets rendered.
  css:  'css.styl',       // All CSS required to render this component.
  js:   'package.js',     // Progressive enhancements for the UI.
  resolve: resolve,       // Expose the resolver so it can be overridden.

  //
  // External dependencies that should be included on the page using a regular
  // script tag. This dependency is needed forthe `package.js` client file.
  //
  dependencies: [
    'http://code.jquery.com/jquery-2.1.0.min.js',
    Contour.core('npm').styl
  ],

  /**
   * There are parts of page that could require Github API access. As you might
   * know there is rate limiting in place for API calls. Unauthorized calls are
   * 60 RPH (requests per hour) and authorized is 5000 RPH. You can create an
   * authorized githulk instance which we will be used instead of a default
   * unauthorized githulk.
   *
   * @type {Githulk|Null}
   * @api public
   */
  githulk: null,

  /**
   * The default registry we should use when resolving package information.
   *
   * @type {String}
   * @api public
   */
  registry: Registry.mirrors.nodejitsu,

  /**
   * Return the cache key for a given module. By default we are prefixing the
   * names with the major version number of this module. As we want to be able
   * to change the structure of the data without creating potential cache
   * conflicts. In addition to that this prevent potential dictionary attacks
   * where people use __proto__ as package name.
   *
   * @param {String} name The name of the module.
   * @param {String} version The version number of the module.
   * @returns {String} The cache key.
   * @api public
   */
  key: function key(name, version) {
    return 'v'+ major +':'+ name +'@'+ version;
  },

  /**
   * Get the latest version of a module.
   *
   * @param {String} name The name of the module.
   * @param {Function} fn The callback.
   * @api private
   */
  latest: function latest(name, fn) {
    var key = this.key(name, 'latest')
      , pagelet = this;

    this.fireforget('get', key, function cached(err, data) {
      if (!err && data) return fn(err, data);

      var registry = pagelet.registry instanceof Registry
        ? pagelet.registry
        : new Registry({ registry: pagelet.registry });

      registry.packages.get(name +'/latest', function latest(err, data) {
        if (err) return fn(err);

        if (Array.isArray(data)) data = data[0];
        pagelet.fireforget('set', key, data.version);

        fn(undefined, data.version);
      });
    });
  },

  /**
   * Simple wrapper around a possible cache interface.
   *
   * @param {String} method The cache method we went to invoke.
   * @param {String} key The key we want to retrieve.
   * @param {Object} obj The data we want to store.
   * @param {Function} fn An optional callback.
   * @api private
   */
  fireforget: function (method, key, obj, fn) {
    if ('function' === typeof obj) {
      fn = obj;
      obj = null;
    }

    fn = fn || function nope() {};

    var pagelet = this;

    //
    // Force asynchronous execution of cache retrieval without starving I/O
    //
    (
      global.setImmediate   // Only available since node 0.10
      ? global.setImmediate
      : global.setTimeout
    )(function immediate() {
      if (key && pagelet.cache) {
        if ('get' === method) {
          if (pagelet.cache.get.length === 1) {
            return fn(undefined, pagelet.cache.get(key));
          } else {
            return pagelet.cache.get(key, fn);
          }
        } else if ('set' === method) {
          if (pagelet.cache.set.length === 2) {
            return fn(undefined, pagelet.cache.set(key, obj));
          } else {
            return pagelet.cache.set(key, obj, fn);
          }
        }
      }

      //
      // Nothing, no cache or matching methods.
      //
      fn();
    });

    return this;
  },

  /**
   * Prepare the data for rendering. All the data that is send to the callback
   * is exposed in the template.
   *
   * @param {Function} next Completion callback.
   * @api private
   */
  get: function get(next) {
    var name = this.params.name
      , pagelet = this
      , key;

    this.latest(name, function latest(err, version) {
      if (err) return next(err);

      key = pagelet.key(name, version);

      pagelet.fireforget('get', key, function cached(err, data) {
        if (!err && data) return next(err, data);

        //
        // No data or an error, resolve the data structure and attempt to
        // store it again.
        //
        pagelet.resolve(name, {
          registry: pagelet.registry,
          githulk: pagelet.githulk
        }, function resolved(err, data) {
          //
          // Store and forget, we should delay the rendering procedure any
          // longer as manually resolving took to damn much time.
          //
          if (!err) pagelet.fireforget('set', key, data);

          next(err, data);
        });
      });
    });
  }
}).on(module);

//
// Also expose the `resolve` method on the Pagelet instance so we can use this
// to pre-populate a cache.
//
module.exports.resolve = resolve;
