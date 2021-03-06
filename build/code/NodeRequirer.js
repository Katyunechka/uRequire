// Generated by CoffeeScript 1.6.3
var BundleBase, Dependency, NodeRequirer, fs, l, pathRelative, upath, urequire, _, _B,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

_ = require('lodash');

fs = require('fs');

upath = require('./paths/upath');

pathRelative = require('./paths/pathRelative');

Dependency = require('./fileResources/Dependency');

_B = require('uberscore');

l = new _B.Logger('urequire/NodeRequirer', 0);

urequire = require('./urequire');

BundleBase = require('./process/BundleBase');

/*
The `nodejs`'s require facility.

An instance of `NodeRequirer` is created for each UMD module, when running on node. Its purpose is to resolve and load modules, synchronoysly or asynchronoysly, depending on how it was called:

  * sync (blocking): when call was made the nodejs way `require('dependency')` in which case the module is simply loaded & returned.

  * async (immediatelly returning): when called the AMD/requirejs way `require(['dep1', 'dep2'], function(dep1, dep2) {})` in which case the callback function is called, when all modules/dependencies have been loaded asynchronously.

@note: it used to mimic the inconsistent RequireJS 2.0.x behaviour on the `require([..],->`, where if all deps are loaded before, then the call is SYNCHRONOUS :-(. It is now reverted to the [always asynch 2.1.x behaviour](https://github.com/jrburke/requirejs/wiki/Upgrading-to-RequireJS-2.1#wiki-breaking-async)

@author Agelos Pikoulas
*/


NodeRequirer = (function(_super) {
  var unloaded;

  __extends(NodeRequirer, _super);

  /*
  Create a NodeRequirer instance, passing paths resolution information.
  
  @param {String} moduleNameBR `module` name of current UMD module (that calls 'require'), in bundleRelative format, eg 'models/Person', as hardcoded in generated uRequire UMD.
  
  @param {Object} modyle The node `module` object of the current UMD module (that calls 'require').
                  Used to issue the actual node `require` on the module, to preserve the correct `node_modules` lookup paths (as opposed to using the NodeRequirer's paths.
  
  @param {String} dirname `__dirname` passed at runtime from the UMD module, poiniting to its self (i.e filename of the .js file).
  
  @param {String} webRootMap where '/' is mapped when running on nodejs, as hardcoded in uRequire UMD (relative to path).
  */


  function NodeRequirer(moduleNameBR, modyle, dirname, webRootMap) {
    var baseUrl;
    this.moduleNameBR = moduleNameBR;
    this.modyle = modyle;
    this.dirname = dirname;
    this.webRootMap = webRootMap;
    this.require = __bind(this.require, this);
    this.loadModule = __bind(this.loadModule, this);
    this.path = upath.normalize(this.dirname + '/' + (pathRelative("$/" + (upath.dirname(this.moduleNameBR)), "$/")) + '/');
    if (l.deb(90)) {
      l.debug("new NodeRequirer(\n  @moduleNameBR='" + this.moduleNameBR + "'\n  @dirname='" + this.dirname + "'\n  @webRootMap='" + this.webRootMap + "')\n  @path (Calculated from @moduleNameBR & @dirname) = '" + this.path + "'");
    }
    if (this.getRequireJSConfig().baseUrl) {
      baseUrl = this.getRequireJSConfig().baseUrl;
      if (l.deb(15)) {
        l.debug("`baseUrl` (from requireJsConfig ) = " + baseUrl);
      }
      this.path = upath.normalize((baseUrl[0] === '/' ? this.webRoot : this.path) + '/' + baseUrl + '/');
      if (l.deb(30)) {
        l.debug("Final `@path` (from requireJsConfig.baseUrl & @path) = " + this.path);
      }
    }
  }

  /*
  Defaults to node's `require`, invoked on the module to preserve `node_modules` path lookup.
  It can be swaped with another/mock version (eg by spec tests).
  */


  Object.defineProperties(NodeRequirer.prototype, {
    nodeRequire: {
      get: function() {
        return this._nodeRequire || _.bind(this.modyle.require, this.modyle);
      },
      set: function(_nodeRequire) {
        this._nodeRequire = _nodeRequire;
      }
    },
    debugInfo: {
      get: function() {
        var config, di, pathsRjs, pathsRjsConfig, rjs, rjsConfig, rjsConfigs, rjsLoaded, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7;
        di = {
          path: this.path,
          webRoot: this.webRoot
        };
        rjsLoaded = di["requirejsLoaded[@path]"] = {};
        _ref = NodeRequirer.prototype.requirejsLoaded;
        for (pathsRjs in _ref) {
          rjs = _ref[pathsRjs];
          rjsConfig = rjsLoaded[pathsRjs] = {};
          rjsConfig["requirejs._.config.baseUrl"] = (_ref1 = rjs.s) != null ? (_ref2 = _ref1.contexts) != null ? (_ref3 = _ref2._) != null ? _ref3.config.baseUrl : void 0 : void 0 : void 0;
          rjsConfig["requirejs._.config.paths"] = (_ref4 = rjs.s) != null ? (_ref5 = _ref4.contexts) != null ? (_ref6 = _ref5._) != null ? _ref6.config.paths : void 0 : void 0 : void 0;
        }
        rjsConfigs = di["requireJSConfigs[@path]"] = {};
        _ref7 = NodeRequirer.prototype.requireJSConfigs;
        for (pathsRjsConfig in _ref7) {
          config = _ref7[pathsRjsConfig];
          rjsConfigs[pathsRjsConfig] = config;
        }
        return l.prettify(di);
      }
    }
  });

  /*
  Load 'requirejs.config.json' for @path & cache it with @path as key.
  @return {RequireJSConfig object} the requireJSConfig for @path (or {} if 'requirejs.config.json' not found/not valid json)
  */


  NodeRequirer.prototype.getRequireJSConfig = function() {
    var error, rjsc, _base, _base1, _name;
    if ((_base = NodeRequirer.prototype).requireJSConfigs == null) {
      _base.requireJSConfigs = {};
    }
    if (NodeRequirer.prototype.requireJSConfigs[this.path] === void 0) {
      try {
        rjsc = require('fs').readFileSync(this.path + 'requirejs.config.json', 'utf-8');
      } catch (_error) {
        error = _error;
      }
      if (rjsc) {
        try {
          NodeRequirer.prototype.requireJSConfigs[this.path] = JSON.parse(rjsc);
        } catch (_error) {
          error = _error;
          l.er("urequire: error parsing requirejs.config.json from " + (this.path + 'requirejs.config.json'));
        }
      }
      if ((_base1 = NodeRequirer.prototype.requireJSConfigs)[_name = this.path] == null) {
        _base1[_name] = {};
      }
    }
    return NodeRequirer.prototype.requireJSConfigs[this.path];
  };

  /*
  Load the [Requirejs](http://requirejs.org/) system module (as npm installed), & cache for @path as key.
  
  Then cache it in static NodeRequirer::requirejsLoaded[@path], so only one instance
  is shared among all `NodeRequirer`s for a given @path. Hence, its created only once,
  first time it's needed (for each distinct @path).
  
  It is configuring rjs with resolved paths, for each of the paths entry in `requirejs.config.json`.
  Resolved paths are relative to `@path` (instead of `@dirname`).
  
  @return {requirejs} The module `RequireJS` for node, configured for this @path.
  */


  NodeRequirer.prototype.getRequirejs = function() {
    var pathEntries, pathEntry, pathName, requireJsConf, requirejs, resolvedPath, _base, _base1, _i, _j, _len, _len1, _ref, _ref1;
    if ((_base = NodeRequirer.prototype).requirejsLoaded == null) {
      _base.requirejsLoaded = {};
    }
    if (!NodeRequirer.prototype.requirejsLoaded[this.path]) {
      requirejs = this.nodeRequire('requirejs');
      requireJsConf = {
        nodeRequire: this.nodeRequire,
        baseUrl: this.path
      };
      if (this.getRequireJSConfig().paths) {
        requireJsConf.paths = {};
        _ref = this.getRequireJSConfig().paths;
        for (pathName in _ref) {
          pathEntries = _ref[pathName];
          pathEntries = _B.arrayize(pathEntries);
          (_base1 = requireJsConf.paths)[pathName] || (_base1[pathName] = []);
          for (_i = 0, _len = pathEntries.length; _i < _len; _i++) {
            pathEntry = pathEntries[_i];
            _ref1 = this.resolvePaths(new Dependency(pathEntry), this.path);
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              resolvedPath = _ref1[_j];
              if (!(__indexOf.call(requireJsConf.paths[pathName], resolvedPath) >= 0)) {
                requireJsConf.paths[pathName].push(resolvedPath);
              }
            }
          }
        }
      }
      requirejs.config(requireJsConf);
      NodeRequirer.prototype.requirejsLoaded[this.path] = requirejs;
    }
    return NodeRequirer.prototype.requirejsLoaded[this.path];
  };

  /*
  Loads *one* module, synchronously.
  
  Uses either node's `require` or the synchronous version of `RequireJs`'s.
  The latter is used for modules that :
    * either have a plugin (eg `"text!module.txt"`)
    * or modules that failed to load with node's require: these are assumed to be native AMD, hence and attempt is made to load with RequireJS.
  
  @note If loading failures occur, it makes more than one attempts to find/load a module (alt paths & node/rjs require), noting loading errors. If all loading attempts fail, **it QUITS with process.exit(1)**.
  
  @param {Dependency} dep The Dependency to be load.
  @return {module} loaded module or quits if it fails
  @todo:2 refactor/simplify
  */


  unloaded = {};

  NodeRequirer.prototype.loadModule = function(dep) {
    var att, attIdx, attempts, err, loadedModule, modulePath, resolvedPathNo, resolvedPaths, _i, _len, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8;
    attempts = [];
    loadedModule = unloaded;
    l.debug(95, "loading dep '" + dep + "'");
    resolvedPaths = this.resolvePaths(dep, this.dirname);
    if (l.deb(95)) {
      l.debug("resolvedPaths = \n", resolvedPaths);
    }
    for (resolvedPathNo = _i = 0, _len = resolvedPaths.length; _i < _len; resolvedPathNo = ++_i) {
      modulePath = resolvedPaths[resolvedPathNo];
      if (loadedModule === unloaded) {
        if ((_ref = dep.pluginName) === (void 0) || _ref === 'node') {
          if (l.deb(95)) {
            l.debug("@nodeRequire '" + modulePath + "'");
          }
          attempts.push({
            modulePath: modulePath,
            requireUsed: 'nodeRequire',
            resolvedPathNo: resolvedPathNo,
            dependency: dep.name()
          });
          try {
            loadedModule = this.nodeRequire(modulePath);
          } catch (_error) {
            err = _error;
            if (l.deb(35)) {
              l.debug("FAILED: @nodeRequire '" + modulePath + "' err=\n", err);
            }
            _.extend(_.last(attempts), {
              urequireError: "Error loading node or UMD module through nodejs require.",
              error: {
                string: err.toString(),
                err: err
              }
            });
            modulePath = upath.addExt(modulePath, '.js');
            if (l.deb(25)) {
              l.debug("@nodeRequire failure caused: @getRequirejs() '" + modulePath + "'");
            }
            attempts.push({
              modulePath: modulePath,
              requireUsed: 'RequireJS',
              resolvedPathNo: resolvedPathNo,
              dependency: dep.name()
            });
            try {
              loadedModule = this.getRequirejs()(modulePath);
            } catch (_error) {
              err = _error;
              if (l.deb(25)) {
                l.debug("FAILED: @getRequirejs() '" + modulePath + "' err=\n", err);
              }
              _.extend(_.last(attempts), {
                urequireError: "Error loading module through RequireJS; it previously failed with node's require.",
                error: {
                  string: err.toString(),
                  err: err
                }
              });
            }
          }
        } else {
          modulePath = "" + dep.pluginName + "!" + modulePath;
          if (l.deb(25)) {
            l.debug("Dependency plugin '" + dep.pluginName + "' caused: @getRequirejs() '" + modulePath + "'");
          }
          attempts.push({
            modulePath: modulePath,
            requireUsed: 'RequireJS',
            resolvedPathNo: resolvedPathNo,
            dependency: dep.name(),
            pluginName: dep.pluginName,
            pluginPaths: (_ref1 = this.requireJSConfig) != null ? _ref1.paths[dep.pluginName] : void 0,
            pluginResolvedPaths: (_ref2 = this.requirejs) != null ? (_ref3 = _ref2.s) != null ? (_ref4 = _ref3.contexts) != null ? (_ref5 = _ref4._) != null ? (_ref6 = _ref5.config) != null ? _ref6.paths[dep.pluginName] : void 0 : void 0 : void 0 : void 0 : void 0
          });
          try {
            loadedModule = this.getRequirejs()(modulePath);
          } catch (_error) {
            err = _error;
            _.extend(_.last(attempts), {
              urequireError: "Error loading module with plugin '" + dep.pluginName + "' through RequireJS.",
              error: {
                string: err.toString(),
                err: err
              }
            });
          }
        }
      }
    }
    if (loadedModule === unloaded) {
      l.er("\n\n*uRequire " + urequire.VERSION + "*: failed to load dependency: '" + dep + "' in module '" + this.moduleNameBR + "'.\nTried paths:\n" + (_.uniq((function() {
        var _j, _len1, _results;
        _results = [];
        for (_j = 0, _len1 = attempts.length; _j < _len1; _j++) {
          att = attempts[_j];
          _results.push("'" + att.modulePath + "'");
        }
        return _results;
      })()).join('\n  ')) + "\n\nQuiting with throwing 1st error at the end - Detailed attempts follow:\n" + (((function() {
        var _j, _len1, _results;
        _results = [];
        for (attIdx = _j = 0, _len1 = attempts.length; _j < _len1; attIdx = ++_j) {
          att = attempts[attIdx];
          _results.push("  \u001b[33m Attempt #" + (attIdx + 1) + '\n' + l.prettify(att));
        }
        return _results;
      })()).join('\n\n')) + "\n\nDebug info:\n ", this.debugInfo);
      throw ((_ref7 = attempts[0]) != null ? (_ref8 = _ref7.error) != null ? _ref8.err : void 0 : void 0) || '1st err was undefined!';
    } else {
      return loadedModule;
    }
  };

  /*
  The actual `require` method, called as synchronous or asynchronous.
  
  It is the method passed to the *factoryBody* of UMD modules
    (i.e what you call on your uRequire module when running on node)
  and the one used to load all deps before entering the module's factoryBody.
  
  @param { String, Array<String> } strDeps
      As `String`, its a single dependency to load *synchronously*, eg `"models/person"` or `'text!abc.txt'`
      As `Array<String>`, its an array of dependencies to load *asynchronously* the AMD/RequireJS way, eg `[ "models/person" or 'text!abc.txt' ]`
  
  @param {Function} callback The callback function to call when all dependencies are loaded, called asynchronously by default
          (or synchronously if all dependencies were cached, when it matched RequireJs's 2.0.x behaviour
          [not needed any more in 2.1.x](https://github.com/jrburke/requirejs/wiki/Upgrading-to-RequireJS-2.1#wiki-breaking-async) )
  @return {module} module loaded if called *synchronously*, or `undefined` if it was called *asynchronously*
  */


  NodeRequirer.prototype.require = function(strDeps, callback) {
    var _this = this;
    if (_.isString(strDeps)) {
      return this.loadModule(new Dependency(strDeps, {
        path: this.moduleNameBR
      }));
    } else {
      if (_.isArray(strDeps) && _.isFunction(callback)) {
        process.nextTick(function() {
          var strDep;
          return callback.apply(null, (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = strDeps.length; _i < _len; _i++) {
              strDep = strDeps[_i];
              _results.push(this.loadModule(new Dependency(strDep, {
                path: this.moduleNameBR
              })));
            }
            return _results;
          }).call(_this));
        });
      }
    }
    return void 0;
  };

  return NodeRequirer;

})(BundleBase);

module.exports = NodeRequirer;
