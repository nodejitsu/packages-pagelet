describe('pagelet', function () {
  'use strict';

  var Pagelet = require('../')
    , chai = require('chai')
    , major = require('../package.json').version.slice(0, 1)
    , expect = chai.expect;

  it('exposes the module as single function', function () {
    expect(Pagelet).to.be.a('function');
  });

  describe('#key', function () {
    it('should prefix the module with our major version number', function () {
      var pagelet = new Pagelet();

      expect(pagelet.key('foo', '1.0.0')).to.equal('v'+ major +':foo@1.0.0');
    });

    it('should append package@version', function () {
      var pagelet = new Pagelet();

      expect(pagelet.key('foo', '2.0.0')).to.equal('v'+ major +':foo@2.0.0');
    });
  });
});
