describe('resolve', function () {
  'use strict';

  var resolve = require('../resolve')
    , chai = require('chai')
    , expect = chai.expect;

  it('exposes as a single function', function () {
    expect(resolve).to.be.a('function');
  });

  it('exposes the reducer', function () {
    expect(resolve.reduce).to.be.a('function');
  });
});
