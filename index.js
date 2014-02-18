'use strict';

var Shrinkwrap = require('shrinkwrap')
  , Pagelet = require('pagelet')
  , readme = require('renderme')
  , Registry = require('npmjs');

Pagelet.extend({
  //
  // Specify the locations of our UI components.
  //
  view: 'view.ejs',       // The template that gets rendered.
  css:  'css.styl',       // All CSS required to render this component.
  js:   'package.js',     // Progressive enhancements for the UI.

  /**
   *
   * @param {String} name The name of the package.
   * @param {String} registry The optional registry we should use.
   * @param {Function} next The callback.
   * @api private
   */
  resolve: function resolve(name, registry, next) {
    if ('function' === typeof registry) {
      next = registry;
      registry = this.registry || Registry.mirrors.nodejitsu;
    }

    var shrinkwrap = new Shrinkwrap({ registry: registry })
      , npm = new Registry({ registry: registry });

    npm.packages.details(name, function details(err, data) {
      if (err) return next(err);

      shrinkwrap.resolve(data, function resolve(err, pkg, dependencies) {
        if (err) return next(err);

        //
        // @TODO merge data
        //
      });
    });
  },

  /**
   * Prepare the data for rendering. All the data that is send to the callback
   * is exposed in the template.
   *
   * @param {Function} next Completion callback.
   * @api private
   */
  render: function render(next) {

  }
}).on(module);
