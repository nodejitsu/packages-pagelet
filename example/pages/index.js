'use strict';

var Filecache = require('../filecache')
  , Page = require('bigpipe').Page;

Page.extend({
  path: '/package/:name', // HTTP route we should respond to.
  view: './index.ejs',    // The base template we need to render.
  pagelets: {             // The pagelets that should be rendered.
    package: require('../../').extend({
      cache: new Filecache()
    })
  }
}).on(module);
