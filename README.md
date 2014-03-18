# packages-pagelet

The `packages-pagelet` is a small re-usable component that you could use to
display information about any npm package. Private, public it doesn't matter as
long as it's in a npm registry.

The `packages-pagelet` is build upon the [Pagelet] interface from the [BigPipe]
framework which allows you to compose pages from small fragments or components
which is you can re-use and remix in any way you want allowing for a fully
modular and high performance front-end development experience.

## Installation

This module is distributed through the public npm registry and can therefor be
installed using:

```
npm install --save packages-pagelet
```

The `--save` flag automatically tells `npm` to add this dependency and it's
installed version in to your `package.json`.  If you do not have the BigPipe
framework installed, run:

```
npm install --save bigpipe packages-pagelet
```

To also install and save BigPipe in one go.

## Configuration

The `packages-pagelet` was designed with flexibility and developer freedom in
mind that why there are a lot of (important) options that can be changed and
fine tuned. So take a few minutes to read through all options to ensure you get
the most out of this module. In order to configure this module you need to
`extend` the module and override the desired properties. The extending of the
module is done using `extend` method that is exposed on the module. The `extend`
method follows the same schematics as in the `backbone` library:

```js
'use strict';

var Packages = require('packages-pagelet');

//
// configure the module by extending it with new properties.
//
module.exports = Packages.extend({
  registry: 'https://registry.nodejitsu.com/'
});
```

The following options (keys) can be configured:

### registry

The `registry` property allows two different values, it can either be a string
with a trailing slash which points to the location of The npm Registry you want
to use (which is useful for a private registry) or it can be set to a
pre-configured `npm-registry` instance which would be preferred. The reason for
this is that the `npm-registry` client users the `githulk` module to make API
requests to GitHub repositories to retrieve addition data about packages. As the
API of GitHub is rate limited it's vital that you use authenticated API requests
to GitHub where ever possible. See the [npm-registry] for more detailed
information about the options that can be configured.

```js
Packages.extend({
  registry: 'https://registry.nodejitsu.com/'
});
```

Or

```
var Registry = require('npm-registry');

Packages.extend({
  registry: new Registry({
    registry: 'https://registry.nodejitsu.com/'
  });
});
```

---

### cache

This might be one of the most important properties that is configurable on this
module. The cache allows you to cache the result of the all gathered data per
module. We support 2 different cache patterns, an **async** cache and an
**sync** cache. The sync cache would be ideal during development as you can just
use a simple LRU cache for this. In a production environment it might be worth to
go with an async, distributed cache. Once you want to scale out to multiple node
processes you still want to share this cache.

The supplied cache only needs 2 different methods:

- `get(key)`: A method that returns a JSON object or null for a given key.
- `set(key, obj)`: A method that stores a JSON object for a given key.

When you are using an async cache each method will receive a callback as last
argument in addition to that, the cache will be set using fire and forget as we
will not wait until the supplied callback is answered before we rendering the
content.

```js
var store = {};

Packages.extend({
  cache: {
    get: function (key) {
      return store['.prefix@'+ key];
    },
    set: function (key, value) {
      return store['.prefix@'+ key] = value;
    }
  }
});
```

Please be aware that this cache is not automatically invalidated. So it might
make sense to use either a [memcached] or [redis] cache with an expire value
for this.

---

### githulk

The `packages-pagelet` uses a lot of GitHub API end points to get the data
retrieval as accurate and complete as possible and to render README's correctly.
As the GitHub API is rate limited to 60 calls per hour for unauthorized and 5000
calls for authorized connections it's really important to use an authorized
`githulk` instance within your pagelet. The [GitHulk] module has 2 ways of
creating an authorized connection, either by supplying it with an `token` option
which is your OAuth token or by supplying the user name and password for your
account so it can use basic auth. For small and private pages it might enough to
have 5000 API calls per hour, but if you want to host the packages page in the
public you would probably need as much as possible. That's why the `githulk`
implements a request cache so it can do conditional requests to the GitHub API
based on the returned `Etag` headers from the API.

The caching is implemented in [mana] which is a framework for writing high
available API clients. The cache API that it requires follows the same
schematics as the cache that you can implement for this pagelet as it supports
both an **sync** and **async** interface for retrieving and storing cache.

You don't need to manually invalidate this cache as it's automatically overridden
when the Etag is no longer accepted by the GitHub API.

```js
var GitHulk = require('githulk')

var hulk = new GitHulk({
  token: 'my secret oh.. auth token',
  cache: {
    get: function (key) {},
    set: function (key, value) {}
  }
});
```

The `githulk` instance that you've created can also be passed in to your custom
`npm-registry` client so it can also re-use the same instance and credentials
for when it does a lookup.

---

### key

When we cache the data for the pagelet we automatically run the name of the
module through the `key` method which prefixes the key so it can be used as
cache key. We are currently prefixing the key with the **major** version of this
module. So when we make a backwards incompatible change to the data structure
your page wouldn't die because it had an incorrect data structure.

But if you want absolute control over the process, you can just create your own
key prefixer:


```js
Packages.extend({
  key: function key(name) {
    return 'foo-bar-prefixed-key:'+ name;
  }
});
```

---

So a fully configured and customized `packages-pagelet` should look something
like this:

```js
'use strict';

var GitHulk = require('githulk')
  , Registry = require('npm-registry')
  , Packages = require('packages-pagelet')
  , DistributedJSONCache = require('no-existing-module-implement-it-yourself');

var githulk = new GitHulk({
      cache: new DistributedJSONCache(),
      token: 'your oauth token'
    })
  , registry = new Registry({
      githulk: githulk,
      registry: 'https://registry.nodejitsu.com/'
    });

module.exports = Packages.extend({
  cache: new DistributedJSONCache(),
  registry: registry,
  githulk: githulk
});
```

## Pre-population

Correctly resolving a single package requires a lot of HTTP requests and
computation. This pagelet does support caching, but this is of course only useful
if you start of with a completely cached result set as packages are only cached
when they are accessed for the first time (depending on how you implemented your
own cache of course).

To make the population of cache a bit easier we've exposed our internal resolve
method so it can be used out side of the pagelet as well.

```js
var resolve = require('packages-pagelet').resolve;

[
  /* assume a list of modules you want to pre-cache */
].forEach(function (name) {
  resolve(name, function (err, data) {
    // Cache the data.
  });
});
```

The resolve method accepts 3 arguments:

- `name`: The name of the module it needs to look up.
- `options`: Optional object which contains a reference to the [registry] and
  [githulk] options.
- `callback`: The completion callback which follows an error first callback
  pattern.

[BigPipe]: http://bigpipe.io
[Pagelet]: https://github.com/bigpipe/pagelet
[registry]: #registry
[githulk]: #githulk
[GitHulk]: https://github.com/3rd-Eden/githulk
[mana]: https://github.com/3rd-Eden/mana
[memcached]: https://github.com/3rd-Eden/node-memcached
[redis]: https://github.com/mranney/node_redis
