'use strict';

var Filecache = require('../filecache')
  , Page = require('bigpipe').Page
  , GitHulk = require('githulk');

Page.extend({
  path: '/package/:name', // HTTP route we should respond to.
  view: './index.ejs',    // The base template we need to render.
  pagelets: {             // The pagelets that should be rendered.
    package: require('../../').extend({
      cache: new Filecache(),
      dependenciesPagelet: '/dependencies',
      githulk: new GitHulk({
        token: process.env.GITHUB_TOKEN
      })
    })
  }
}).on(module);
