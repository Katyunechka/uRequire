// Generated by CoffeeScript 1.6.3
var BundleFile, FileResource, UError, fs, l, upath, wrench, _, _B, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('lodash');

fs = require('fs');

wrench = require('wrench');

_B = require('uberscore');

l = new _B.Logger('urequire/fileResources/FileResource');

BundleFile = require('./BundleFile');

upath = require('../paths/upath');

UError = require('../utils/UError');

/*
  Represents any bundlefile resource, whose source/content we dont read (but subclasses do).

  The `convert()` of the ResourceConverter should handle the file contents - for example fs.read it, require() it or spawn an external program.

  Paradoxically, a FileResource
    - can `read()` its source contents (assumed utf-8 text)
    - can `save()` its `converted` content (if any).

  Each time it `@refresh()`es, if super is changed (BundleFile's fileStats), it runs `runResourceConverters`:
      - calls `converter.convert()` and stores result as @converted
      - calls `converter.convFilename()` and stores result as @dstFilename
    otherwise it returns `@hasChanged = false`

  When `save()` is called (with no args) it outputs `@converted` to `@dstFilepath`.
*/


FileResource = (function(_super) {
  var readOptions, saveOptions;

  __extends(FileResource, _super);

  function FileResource() {
    _ref = FileResource.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  /*
    @data converters {Array<ResourceConverter} (bundle.resources) that matched this filename & are used in turn to convert, each time we `refresh()`
  */


  /*
    Check if source (AS IS eg js, coffee, LESS etc) has changed
    and convert it passing throught all @converters
  
    @return true if there was a change (and convertions took place) and note as @hasChanged
            false otherwise
  */


  FileResource.prototype.refresh = function() {
    if (!FileResource.__super__.refresh.apply(this, arguments)) {
      return false;
    } else {
      if (this.constructor === FileResource) {
        return this.hasChanged = this.runResourceConverters(function(rc) {
          return !rc.isBeforeTemplate && !rc.isAfterTemplate;
        });
      } else {
        return true;
      }
    }
  };

  FileResource.prototype.reset = function() {
    FileResource.__super__.reset.apply(this, arguments);
    return delete this.converted;
  };

  FileResource.prototype.runResourceConverters = function(convFilter) {
    var err, resConv, _i, _len, _ref1, _ref2, _ref3;
    if (convFilter == null) {
      convFilter = function() {
        return true;
      };
    }
    this.hasErrors = false;
    _ref1 = this.converters;
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      resConv = _ref1[_i];
      if (!(convFilter(resConv))) {
        continue;
      }
      try {
        if (_.isFunction(resConv.convert)) {
          if (l.deb(40)) {
            l.debug("Converting " + ((_ref2 = this.constructor) != null ? _ref2.name : void 0) + " '" + this.dstFilename + "' with '" + resConv.name + "'...");
          }
          this.converted = resConv.convert(this);
        }
        if (_.isFunction(resConv.convFilename)) {
          this.dstFilename = resConv.convFilename(this.dstFilename, this.srcFilename, this);
          if (l.deb(70)) {
            l.debug("... @dstFilename is '" + this.dstFilename + "'");
          }
        }
        this.hasChanged = true;
      } catch (_error) {
        err = _error;
        this.hasErrors = true;
        throw new UError("Error converting " + ((_ref3 = this.constructor) != null ? _ref3.name : void 0) + " '" + this.srcFilename + "' with resConv '" + (resConv != null ? resConv.name : void 0) + "'.", {
          nested: err
        });
      }
      if (resConv.isTerminal) {
        break;
      }
    }
    return this.hasChanged;
  };

  readOptions = 'utf-8';

  FileResource.prototype.read = function(filename, options) {
    var err, _ref1;
    if (filename == null) {
      filename = this.srcFilename;
    }
    if (options == null) {
      options = readOptions;
    }
    if (options !== readOptions) {
      _.defaults(options, readOptions);
    }
    filename = upath.join(((_ref1 = this.bundle) != null ? _ref1.path : void 0) || '', filename);
    try {
      return fs.readFileSync(filename, options);
    } catch (_error) {
      err = _error;
      this.hasErrors = true;
      this.bundle.handleError(new UError("Error reading file '" + filename + "'", {
        nested: err
      }));
      return void 0;
    }
  };

  FileResource.prototype.save = function(filename, content, options) {
    var _ref1, _ref2;
    if (filename == null) {
      filename = this.dstFilename;
    }
    if (content == null) {
      content = this.converted;
    }
    return this.constructor.save(upath.join(((_ref1 = this.bundle) != null ? (_ref2 = _ref1.build) != null ? _ref2.dstPath : void 0 : void 0) || '', filename), content, options);
  };

  saveOptions = 'utf-8';

  FileResource.save = function(filename, content, options) {
    var err, uerr;
    if (options == null) {
      options = saveOptions;
    }
    if (options !== saveOptions) {
      _.defaults(options, saveOptions);
    }
    if (l.deb(95)) {
      l.debug("Saving file '" + filename + "'...");
    }
    if (!filename) {
      this.bundle.handleError(new UError("Error saving - no filename"));
    }
    if (!content) {
      this.bundle.handleError(new UError("Error saving - no content"));
    }
    try {
      if (!fs.existsSync(upath.dirname(filename))) {
        l.verbose("Creating directory '" + (upath.dirname(filename)) + "'");
        wrench.mkdirSyncRecursive(upath.dirname(filename));
      }
      fs.writeFileSync(filename, content, options);
      l.verbose("Saved file '" + filename + "'");
      return true;
    } catch (_error) {
      err = _error;
      l.er(uerr = "Can't save '" + filename + "'", err);
      return this.bundle.handleError(new UError(uerr, {
        nested: err
      }));
    }
  };

  return FileResource;

})(BundleFile);

module.exports = FileResource;
