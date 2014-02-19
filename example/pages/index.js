'use strict';

var Page = require('bigpipe').Page;

Page.extend({
  path: '/:name',         // HTTP route we should respond to.
  view: './index.ejs',    // The base template we need to render.
  paglets: {              // The pagelets that should be rendered.
    package: require('../../')
  }
}).on(module);
