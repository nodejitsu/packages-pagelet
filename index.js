'use strict';

var Registry = require('npm-registry')
  , Pagelet = require('pagelet')
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
    'http://code.jquery.com/jquery-2.1.0.min.js'
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
   * @returns {String} The cache key.
   * @api public
   */
  key: function key(name) {
    return 'v'+ major +':'+ name;
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
      , key = this.key(name)
      , pagelet = this
      , data;

    if (this.cache) {
      //
      // Determine if we have a `sync` or `async` cache implementation. If it
      // accepts 2 arguments it's async as it requires a `key` and `callback`
      // argument.
      //
      if (this.cache.get.length === 1) {
        data = this.cache.get(key);

        if (data) return next(undefined, data);
      } else if (this.cache.get.length === 2) {
        return this.cache.get(key, function cached(err, data) {
          if (!err && data) return next(undefined, data);

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
            if ('function' === typeof pagelet.cache.set && !err) {
              pagelet.cache.set(key, data, function nope() {});
            }

            next(err, data);
          });
        });
      }
    }

    //
    // No cache resolve it on the fly, which would be slow-ish.
    //
    this.resolve(name, {
      registry: this.registry,
      githulk: this.githulk
    }, next);
  }
}).on(module);

//
// Also expose the `resolve` method on the Pagelet instance so we can use this
// to pre-populate a cache.
//
module.exports.resolve = resolve;
