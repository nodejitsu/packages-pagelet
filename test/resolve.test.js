describe('resolve', function () {
  'use strict';

  var resolve = require('../resolve')
    , chai = require('chai')
    , expect = chai.expect
    , data;

  this.timeout(20000);

  before(function clean(done) {
    resolve('primus', function resolved(err, obj) {
      data = obj;

      done(err);
    });
  });

  it('exposes as a single function', function () {
    expect(resolve).to.be.a('function');
  });

  it('exposes the reducer', function () {
    expect(resolve.reduce).to.be.a('function');
  });

  it('adds `dependent` on the data structure', function () {
    expect(data.dependent).to.be.a('object');
    expect(Object.keys(data.dependent).length).to.be.above(2);
  });

  it('can JSON.stringify the data structure', function () {
    JSON.stringify(data);
  });
});
