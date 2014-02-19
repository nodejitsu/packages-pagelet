'use strict';

var BigPipe = require('bigpipe');

//
// Setup a basic HTTP based BigPipe server.
//
var bigpipe = BigPipe.createServer(8080, {
  pages: __dirname +'/pages',
  dist: __dirname +'/dist'
});

bigpipe.once('listening', function listening() {
  console.log('');
  console.log('The example is now listening on http://localhost:8080');
  console.log('');
});
