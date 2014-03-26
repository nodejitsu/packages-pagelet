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

  it('adds sorted `shrinkwrap` on the data structure', function () {
    expect(data.shrinkwrap).to.be.an('array');
    expect(data.shrinkwrap.length).to.be.above(2);
    expect(data.shrinkwrap[0].main).to.be.equal(1);

    expect(data.shrinkwrap.dependencies).to.equal(undefined);
    expect(data.shrinkwrap.dependent).to.equal(undefined);
    expect(data.shrinkwrap.parent).to.equal(undefined);
  });

  it('adds readme on the data structure', function () {
    expect(data.readme).to.be.a('string');
    expect(data.readme).to.include('<h1 id="primus">Primus</h1>');
  });

  it('adds package on the data structure', function () {
    expect(data.package).to.be.an('object');
    expect(data.package.releases).to.be.an('object');
    expect(data.package.time).to.be.an('object');

    expect(data.package.readmeFilename).to.equal(undefined);
    expect(data.package.versions).to.equal(undefined);
    expect(data.package.readme).to.equal(undefined);
  });

  it('adds github on the data structure', function () {
    expect(data.github).to.be.an('object');
    expect(data.github.name).to.equal('primus');
    expect(data.github.full_name).to.equal('primus/primus');
  });

  it('can JSON.stringify the data structure', function () {
    JSON.stringify(data);
  });

  describe('resolving complex multi moduled packages', function () {
    [
      'browserify',
      'jitsu'
    ].forEach(function (name) {
      it('resolves `'+ name +'`', function (done) {
        resolve(name, function resolved(err, obj) {
          done(err, JSON.stringify(data));
        });
      });
    });
  });
});
