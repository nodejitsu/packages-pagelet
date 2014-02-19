describe('pagelet', function () {
  'use strict';

  var Pagelet = require('../')
    , chai = require('chai')
    , expect = chai.expect;

  it('exposes the module as single function', function () {
    expect(Pagelet).to.be.a('function');
  });

  describe('#key', function () {
    it('should prefix the module with our major version number', function () {
      var pagelet = new Pagelet();

      expect(pagelet.key('foo')).to.equal('v0:foo');
    });
  });
});
