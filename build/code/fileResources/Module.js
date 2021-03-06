// Generated by CoffeeScript 1.6.3
var Dependency, Module, ModuleGeneratorTemplates, TextResource, UError, escodegen, esprima, fs, isEqualCode, isLikeCode, l, upath, _, _B, _ref,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

_ = require('lodash');

_B = require('uberscore');

l = new _B.Logger('urequire/fileResources/Module');

fs = require('fs');

esprima = require('esprima');

escodegen = require('escodegen');

upath = require('../paths/upath');

ModuleGeneratorTemplates = require('../templates/ModuleGeneratorTemplates');

TextResource = require('./TextResource');

Dependency = require("./Dependency");

UError = require('../utils/UError');

isLikeCode = function(code1, code2) {
  if (_.isString(code1)) {
    code1 = esprima.parse(code1).body[0];
  }
  if (_.isString(code2)) {
    code2 = esprima.parse(code2).body[0];
  }
  return _B.isLike(code1, code2);
};

isEqualCode = function(code1, code2) {
  if (_.isString(code1)) {
    code1 = esprima.parse(code1).body[0];
  }
  if (_.isString(code2)) {
    code2 = esprima.parse(code2).body[0];
  }
  return _.isEqual(code1, code2);
};

Module = (function(_super) {
  __extends(Module, _super);

  function Module() {
    this.requireFinder = __bind(this.requireFinder, this);
    _ref = Module.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  Module.prototype.escodegenOptions = {
    format: {
      indent: {
        style: '  ',
        base: 1
      },
      json: false,
      renumber: false,
      hexadecimal: false,
      quotes: 'double',
      escapeless: true,
      compact: false,
      parentheses: true,
      semicolons: true
    }
  };

  Module.escodegenOptions = Module.prototype.escodegenOptions;

  /*
    Check if `super` in TextResource has spotted changes and thus has a possibly changed @converted (javascript code)
    & call `@adjust()` if so.
  
    It does not actually convert to any template - the bundle building does that
  
    But the module info needs to provide dependencies information (eg to inject Dependencies etc)
  */


  Module.prototype.refresh = function() {
    if (!Module.__super__.refresh.apply(this, arguments)) {
      return false;
    } else {
      if (this.sourceCodeJs !== this.converted) {
        this.sourceCodeJs = this.converted;
        this.extract();
        this.prepare();
        return this.hasChanged = true;
      } else {
        if (l.deb(90)) {
          l.debug("No changes in compiled sourceCodeJs of module '" + this.srcFilename + "' ");
        }
        return this.hasChanged = false;
      }
    }
  };

  Module.prototype.reset = function() {
    Module.__super__.reset.apply(this, arguments);
    delete this.sourceCodeJs;
    return this.resetModuleInfo();
  };

  Module.prototype.resetModuleInfo = function() {
    var dv, _i, _j, _len, _len1, _ref1, _ref2;
    this.flags = {};
    _ref1 = this.keys_depsAndVarsArrays;
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      dv = _ref1[_i];
      this[dv] = [];
    }
    _ref2 = this.keys_resolvedDependencies;
    for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
      dv = _ref2[_j];
      delete this[dv];
    }
    return delete this.parameters;
  };

  Module.prototype.AST_data = ['AST_top', 'AST_body', 'AST_factoryBody', 'AST_preDefineIFINodes', 'AST_requireReplacementLiterals'];

  Module.prototype.keys_depsAndVarsArrays = ['ext_defineArrayDeps', 'ext_defineFactoryParams', 'ext_requireDeps', 'ext_requireVars', 'ext_asyncRequireDeps', 'ext_asyncFactoryParams'];

  Module.prototype.keys_resolvedDependencies = ['defineArrayDeps', 'nodeDeps'];

  Module.prototype.info = function() {
    var info, p, _i, _len, _ref1,
      _this = this;
    info = {};
    _ref1 = _.flatten([this.keys_depsAndVarsArrays, this.keys_resolvedDependencies, ['flags', 'name', 'kind', 'path', 'factoryBody', 'preDefineIFIBody', 'parameters']]);
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      p = _ref1[_i];
      if (!_.isEmpty(this[p])) {
        if (_.isArray(this[p])) {
          info[p] = _.map(this[p], function(x) {
            if (__indexOf.call(_this.keys_resolvedDependencies, p) >= 0) {
              return x.name();
            } else {
              return x.toString();
            }
          });
        } else {
          info[p] = this[p];
        }
      }
    }
    return info;
  };

  Module.prototype.readArrayDepsAndVars = function(arrayAst, arrayDeps, paramsAst, factoryParams) {
    var arrayDep, astArrayDep, excParamIdx, idx, param, _i, _j, _len, _ref1, _ref2, _ref3, _ref4, _ref5;
    _ref1 = arrayAst.elements;
    for (idx = _i = 0, _len = _ref1.length; _i < _len; idx = ++_i) {
      astArrayDep = _ref1[idx];
      param = (_ref2 = paramsAst[idx]) != null ? _ref2.name : void 0;
      if (_B.isLike({
        type: 'Literal'
      }, astArrayDep)) {
        arrayDep = new Dependency(astArrayDep.value, this);
        (this.AST_requireReplacementLiterals || (this.AST_requireReplacementLiterals = [])).push(astArrayDep);
      } else {
        arrayDep = new Dependency(this.toCode(astArrayDep), this, true);
      }
      if (arrayDep) {
        arrayDeps.push(arrayDep);
      }
      if (param) {
        factoryParams.push(param);
      }
    }
    for (excParamIdx = _j = _ref3 = arrayAst.elements.length, _ref4 = paramsAst.length - 1; _j <= _ref4; excParamIdx = _j += 1) {
      factoryParams.push((_ref5 = paramsAst[excParamIdx]) != null ? _ref5.name : void 0);
    }
    return this;
  };

  Module.prototype.requireFinder = function(prop, src, dst, blender) {
    var args, requireDep, requireVar;
    if (_B.isLike({
      type: "CallExpression",
      callee: {
        type: "Identifier",
        name: "require"
      }
    }, src[prop])) {
      if (_B.isLike({
        "arguments": [
          {
            type: 'Literal'
          }
        ]
      }, src[prop])) {
        requireDep = new Dependency(src[prop]["arguments"][0].value, this);
        (this.AST_requireReplacementLiterals || (this.AST_requireReplacementLiterals = [])).push(src[prop]["arguments"][0]);
      } else {
        if (_B.isLike([
          {
            type: 'ArrayExpression'
          }, {
            type: 'FunctionExpression'
          }
        ], src[prop]["arguments"])) {
          args = src[prop]["arguments"];
          this.readArrayDepsAndVars(args[0], (this.ext_asyncRequireDeps || (this.ext_asyncRequireDeps = [])), args[1].params, (this.ext_asyncFactoryParams || (this.ext_asyncFactoryParams = [])));
        } else {
          requireDep = new Dependency(this.toCode(src[prop]["arguments"][0]), this, true);
        }
      }
      if (_B.isLike({
        type: 'AssignmentExpression',
        left: {
          type: 'Identifier'
        }
      }, src) || _B.isLike({
        type: 'VariableDeclarator',
        id: {
          type: 'Identifier'
        }
      }, src)) {
        requireVar = _B.isLike({
          type: 'AssignmentExpression'
        }, src) ? src.left.name : src.id.name;
        if (src[prop]["arguments"].length > 1) {
          l.warn("Wrong require() signature in " + (this.toCode(src[prop])) + "\nUse the proper AMD `require([dep1, dep2], function(dep1, dep2){...})` for the asnychronous AMD require.");
        }
      }
      if (requireDep) {
        if (requireVar) {
          (this.ext_requireVars || (this.ext_requireVars = [])).push(requireVar);
          (this.ext_requireDeps || (this.ext_requireDeps = [])).splice(this.ext_requireVars.length - 1, 0, requireDep);
        } else {
          (this.ext_requireDeps || (this.ext_requireDeps = [])).push(requireDep);
        }
      }
    }
    return null;
  };

  Module.prototype.extract = function() {
    var AMDSignature, args, bodyNode, define, defines, err, i, idx, _i, _j, _len, _ref1, _ref2;
    if (l.deb(70)) {
      l.debug("@extract for '" + this.srcFilename + "'");
    }
    this.resetModuleInfo();
    try {
      this.AST_top = esprima.parse(this.sourceCodeJs);
    } catch (_error) {
      err = _error;
      throw new UError("*esprima.parse* error while parsing top Module's javascript.", {
        nested: err
      });
    }
    if (isLikeCode('(function(){}).call()', this.AST_top.body[0]) || isLikeCode('(function(){}).apply()', this.AST_top.body[0])) {
      this.AST_body = this.AST_top.body[0].expression.callee.object.body.body;
      this.AST_preDefineIFINodes = [];
    } else {
      if (isLikeCode('(function(){})()', this.AST_top.body[0])) {
        this.AST_body = this.AST_top.body[0].expression.callee.body.body;
        this.AST_preDefineIFINodes = [];
      } else {
        this.AST_body = this.AST_top.body;
      }
    }
    defines = [];
    _ref1 = this.AST_body;
    for (idx = _i = 0, _len = _ref1.length; _i < _len; idx = ++_i) {
      bodyNode = _ref1[idx];
      if (bodyNode.expression && isLikeCode('define()', bodyNode)) {
        defines.push(bodyNode.expression);
        if (defines.length > 1) {
          throw new UError("Each AMD file shoule have one (top-level or IFI) define call - found " + defines.length + " `define` calls");
        }
      } else {
        if (isLikeCode('({urequire:{}})', bodyNode)) {
          this.flags = (eval(this.toCode(bodyNode))).urequire;
        } else {
          if (!(isLikeCode('var define;', bodyNode) || isLikeCode('if(typeof define!=="function"){define=require("amdefine")(module);}', bodyNode) || isLikeCode('if(typeof define!=="function"){var define=require("amdefine")(module);}', bodyNode)) && !isLikeCode(';', bodyNode) && (defines.length === 0) && this.AST_preDefineIFINodes) {
            this.AST_preDefineIFINodes.push(bodyNode);
          }
        }
      }
    }
    if (defines.length === 1) {
      define = defines[0];
      args = define["arguments"];
      AMDSignature = ['Literal', 'ArrayExpression', 'FunctionExpression'];
      for (i = _j = 0, _ref2 = args.length - 1; 0 <= _ref2 ? _j <= _ref2 : _j >= _ref2; i = 0 <= _ref2 ? ++_j : --_j) {
        if (args[i].type !== AMDSignature[i + (3 - args.length)]) {
          throw new UError("Invalid AMD define() signature with " + args.length + " args: got a '" + args[i].type + "' as arg " + i + ", expected a '" + AMDSignature[i + (3 - args.length)] + "'.");
        }
      }
      this.kind = 'AMD';
      if (args.length === 3) {
        this.name = args[0].value;
      }
      if (args.length >= 2) {
        this.readArrayDepsAndVars(args[args.length - 2], this.ext_defineArrayDeps, args[args.length - 1].params, this.ext_defineFactoryParams);
      } else {
        this.ext_defineFactoryParams = _.map(args[args.length - 1].params, 'name');
      }
      this.AST_factoryBody = args[args.length - 1].body;
    } else {
      this.kind = 'nodejs';
      this.AST_factoryBody = _.isEmpty(this.AST_preDefineIFINodes) ? this.AST_body : this.AST_preDefineIFINodes;
      delete this.AST_preDefineIFINodes;
    }
    _B.traverse(this.AST_factoryBody, this.requireFinder);
    if (l.deb(90)) {
      l.debug("'" + this.srcFilename + "' extracted module .info():\n", _.omit(this.info(), ['factoryBody', 'preDefineIFIBody']));
    }
    return this;
  };

  Module.prototype.prepare = function() {
    var ar1, ar2, _ref1;
    if (l.deb(70)) {
      l.debug("@prepare for '" + this.srcFilename + "'\n");
    }
    this.parameters = this.ext_defineFactoryParams.slice(0, +(this.ext_defineArrayDeps.length - 1) + 1 || 9e9);
    this.defineArrayDeps = _.clone(this.ext_defineArrayDeps);
    if (ar1 = (this.parameters[0] === 'require') | (ar2 = (_ref1 = this.defineArrayDeps[0]) != null ? typeof _ref1.isEqual === "function" ? _ref1.isEqual('require') : void 0 : void 0)) {
      if (ar1 && (ar2 || this.defineArrayDeps[0] === void 0)) {
        this.parameters.shift();
        this.defineArrayDeps.shift();
      } else {
        throw new UError(("Module '" + this.path + "':") + (ar1 ? "1st define factory argument is 'require', but 1st dependency is '" + this.defineArrayDeps[0] + "'" : "1st dependency is 'require', but 1st define factory argument is '" + this.parameters[0] + "'"));
      }
    }
    this.nodeDeps = _.clone(this.defineArrayDeps);
    return this;
  };

  /*
  Produce final template information:
  
  - bundleRelative deps like `require('path/dep')` in factory, are replaced with their fileRelative counterpart
  
  - injecting dependencies?.exports?.bundle
  
  - add @ext_requireDeps to @defineArrayDeps (& perhaps @nodeDeps)
  
  @todo: decouple from build, use calculated (cached) properties, populated at convertWithTemplate(@build) step
  */


  Module.prototype.adjust = function(build) {
    var addToArrayDependencies, dep, newDep, oldDep, oldDeps, reqDep, rootExports, rt, _base, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref1, _ref10, _ref11, _ref12, _ref13, _ref14, _ref15, _ref16, _ref17, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9,
      _this = this;
    this.build = build;
    if (l.deb(70)) {
      l.debug("\n@adjust for '" + this.srcFilename + "'");
    }
    _ref3 = ((_ref1 = this.bundle) != null ? (_ref2 = _ref1.dependencies) != null ? _ref2.replace : void 0 : void 0) || {};
    for (newDep in _ref3) {
      oldDeps = _ref3[newDep];
      for (_i = 0, _len = oldDeps.length; _i < _len; _i++) {
        oldDep = oldDeps[_i];
        this.replaceDep(oldDep, newDep);
      }
    }
    _ref4 = _.flatten([this.defineArrayDeps, this.ext_requireDeps, this.ext_asyncRequireDeps]);
    for (_j = 0, _len1 = _ref4.length; _j < _len1; _j++) {
      dep = _ref4[_j];
      if (dep && !dep.untrusted) {
        this.replaceDep(dep, dep);
      }
    }
    if (((_ref5 = this.build) != null ? (_ref6 = _ref5.template) != null ? _ref6.name : void 0 : void 0) !== 'combined') {
      this.injectDeps((_ref7 = this.bundle) != null ? (_ref8 = _ref7.dependencies) != null ? (_ref9 = _ref8.exports) != null ? _ref9.bundle : void 0 : void 0 : void 0);
    }
    if (this.flags.rootExports) {
      this.flags.rootExports = _B.arrayize(this.flags.rootExports);
    }
    if (rootExports = (_ref10 = this.bundle) != null ? (_ref11 = _ref10.dependencies) != null ? (_ref12 = _ref11.exports) != null ? (_ref13 = _ref12.root) != null ? _ref13[this.path] : void 0 : void 0 : void 0 : void 0) {
      _ref14 = _B.arrayize(rootExports);
      for (_k = 0, _len2 = _ref14.length; _k < _len2; _k++) {
        rt = _ref14[_k];
        ((_base = this.flags).rootExports || (_base.rootExports = [])).push(rt);
      }
      this.flags.noConflict = true;
    }
    this.webRootMap = ((_ref15 = this.bundle) != null ? _ref15.webRootMap : void 0) || '.';
    addToArrayDependencies = function(reqDep) {
      var _ref16, _ref17, _ref18, _ref19;
      if ((reqDep.pluginName !== 'node') && (_ref16 = reqDep.name({
        plugin: false
      }), __indexOf.call(((_ref17 = _this.bundle) != null ? (_ref18 = _ref17.dependencies) != null ? _ref18.node : void 0 : void 0) || [], _ref16) < 0) && (!_.any(_this.defineArrayDeps, function(dep) {
        return dep.isEqual(reqDep);
      }))) {
        _this.defineArrayDeps.push(reqDep);
        if ((_ref19 = _this.build) != null ? _ref19.allNodeRequires : void 0) {
          return _this.nodeDeps.push(reqDep);
        }
      }
    };
    if (!(_.isEmpty(this.defineArrayDeps) && ((_ref16 = this.build) != null ? _ref16.scanAllow : void 0) && !this.flags.rootExports)) {
      _ref17 = this.ext_requireDeps;
      for (_l = 0, _len3 = _ref17.length; _l < _len3; _l++) {
        reqDep = _ref17[_l];
        addToArrayDependencies(reqDep);
      }
    }
    return this;
  };

  Module.prototype.injectDeps = function(depVars) {
    var dep, depName, dependenciesBindingsBlender, varName, varNames, _i, _len, _ref1;
    if (l.deb(40)) {
      l.debug("" + this.path + ": injecting dependencies: ", depVars);
    }
    dependenciesBindingsBlender = require('../config/blendConfigs').dependenciesBindingsBlender;
    if (_.isEmpty(depVars = dependenciesBindingsBlender.blend(depVars))) {
      return;
    }
    if ((_ref1 = this.bundle) != null) {
      if (typeof _ref1.inferEmptyDepVars === "function") {
        _ref1.inferEmptyDepVars(depVars, "Infering empty depVars from injectDeps for '" + this.path + "'");
      }
    }
    for (depName in depVars) {
      varNames = depVars[depName];
      dep = new Dependency(depName, this);
      if (!dep.isEqual(this.path)) {
        for (_i = 0, _len = varNames.length; _i < _len; _i++) {
          varName = varNames[_i];
          if (!(__indexOf.call(this.parameters, varName) >= 0)) {
            this.defineArrayDeps.splice(this.parameters.length, 0, dep);
            this.nodeDeps.splice(this.parameters.length, 0, dep);
            this.parameters.push(varName);
            if (l.deb(70)) {
              l.debug("" + this.path + ": injected dependency '" + depName + "' as parameter '" + varName + "'");
            }
          } else {
            l.warn("" + this.path + ": NOT injecting dependency '" + depName + "' as parameter '" + varName + "' cause it already exists.");
          }
        }
      } else {
        if (l.deb(50)) {
          l.debug("" + this.path + ": NOT injecting dependency '" + depName + "' on self'");
        }
      }
    }
    return null;
  };

  Module.prototype.replaceDep = function(oldDep, newDep) {
    var dep, depIdx, depLiteral, rai, rdArrayName, removeArrayIdxs, _i, _j, _k, _l, _len, _len1, _len2, _ref1, _ref2, _ref3;
    if (!(oldDep instanceof Dependency)) {
      if (_.isString(oldDep)) {
        oldDep = new Dependency(oldDep, this);
      } else {
        l.er("Module.replaceDep: Wrong old dependency type '" + oldDep + "' in module " + this.path + " - should be String|Dependency.");
        throw new UError("Module.replaceDep: Wrong old dependency type '" + oldDep + "' in module " + this.path + " - should be String|Dependency.");
      }
    }
    if (newDep) {
      if (!(newDep instanceof Dependency)) {
        if (_.isString(newDep)) {
          newDep = new Dependency(newDep, this);
        } else {
          throw new UError("Module.replaceDep: Wrong new dependency type '" + newDep + "' in module " + this.path + " - should be String|Dependency|Undefined.");
        }
      }
    } else {
      removeArrayIdxs = [];
    }
    if (oldDep !== newDep) {
      _ref1 = this.keys_resolvedDependencies;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        rdArrayName = _ref1[_i];
        _ref2 = this[rdArrayName] || [];
        for (depIdx = _j = 0, _len1 = _ref2.length; _j < _len1; depIdx = ++_j) {
          dep = _ref2[depIdx];
          if (dep.isEqual(oldDep)) {
            if (newDep) {
              this[rdArrayName][depIdx] = newDep;
              l.debug(80, "Module.replaceDep in '" + rdArrayName + "', replaced '" + oldDep + "' with '" + newDep + "'.");
            } else {
              removeArrayIdxs.push({
                rdArrayName: rdArrayName,
                depIdx: depIdx
              });
            }
          }
        }
      }
      if (!newDep) {
        for (_k = removeArrayIdxs.length - 1; _k >= 0; _k += -1) {
          rai = removeArrayIdxs[_k];
          l.debug(80, "Module.replaceDep in '" + rai.rdArrayName + "', removing '" + this[rai.rdArrayName][rai.depIdx] + "'.");
          this[rai.rdArrayName].splice(rai.depIdx, 1);
          if (rai.rdArrayName === 'defineArrayDeps') {
            this.parameters.splice(rai.depIdx, 1);
          }
        }
      }
    }
    _ref3 = this.AST_requireReplacementLiterals || [];
    for (_l = 0, _len2 = _ref3.length; _l < _len2; _l++) {
      depLiteral = _ref3[_l];
      if ((depLiteral != null ? depLiteral.value : void 0) !== (newDep != null ? typeof newDep.name === "function" ? newDep.name() : void 0 : void 0)) {
        if (oldDep.isEqual(new Dependency(depLiteral.value, this))) {
          if (newDep) {
            l.debug(80, "Replacing AST literal '" + depLiteral.value + "' with '" + (newDep.name()) + "'");
            depLiteral.value = newDep.name();
          }
        }
      }
    }
    return null;
  };

  /*
  Returns all deps in this module along with their corresponding parameters (variable names)
  @param {Function} depFltr optional callback filtering dependency, called with dep (defaults to all-true fltr)
  @return {Object}
      {
        jquery: ['$', 'jQuery']
        lodash: ['_']
        'models/person': ['pm']
      }
  */


  Module.prototype.getDepsVars = function(depFltr) {
    var bundleRelativeDep, dep, depVarArrays, depsArrayName, dv, idx, varNames, varsArrayName, _i, _len, _ref1, _ref2;
    if (depFltr == null) {
      depFltr = function() {
        return true;
      };
    }
    varNames = {};
    depVarArrays = {
      'defineArrayDeps': 'parameters',
      'ext_requireDeps': 'ext_requireVars',
      'ext_asyncRequireDeps': 'ext_asyncFactoryParams'
    };
    for (depsArrayName in depVarArrays) {
      varsArrayName = depVarArrays[depsArrayName];
      _ref1 = this[depsArrayName] || [];
      for (idx = _i = 0, _len = _ref1.length; _i < _len; idx = ++_i) {
        dep = _ref1[idx];
        if (!(depFltr(dep))) {
          continue;
        }
        bundleRelativeDep = dep.name({
          relative: 'bundle'
        });
        dv = (varNames[bundleRelativeDep] || (varNames[bundleRelativeDep] = []));
        if (this[varsArrayName][idx] && !(_ref2 = this[varsArrayName][idx], __indexOf.call(dv, _ref2) >= 0)) {
          dv.push(this[varsArrayName][idx]);
        }
      }
    }
    return varNames;
  };

  Module.prototype.replaceCode = function(matchCode, replCode) {
    var deletion, deletions, replCodeAction, _i, _results;
    matchCode = Module.toAST(matchCode);
    replCode = Module.toAST(replCode);
    deletions = [];
    replCodeAction = function(prop, src) {
      var matchedCode, _replCode;
      if (_B.isLike(matchCode, src[prop])) {
        matchedCode = Module.toCode(src[prop]);
        _replCode = _.isFunction(replCode) ? Module.toAST(replCode(src[prop])) : replCode;
        if (_replCode) {
          if (l.deb(50)) {
            l.debug("Replacing code:\n```````````````````\n" + matchedCode + "\n```` with code: ```\n" + (Module.toCode(_replCode)) + "\n```````````````````");
          }
          return src[prop] = _replCode;
        } else {
          if (_.isArray(src)) {
            if (l.deb(50)) {
              l.debug("Deleting code:\n  `" + matchedCode + "`");
            }
            deletions.push({
              src: src,
              prop: prop
            });
          } else {
            if (l.deb(50)) {
              l.debug("Delete code (replacing with EmptyStatement) :\n  `" + matchedCode + "`");
            }
            src[prop] = {
              type: 'EmptyStatement'
            };
          }
          return false;
        }
      }
    };
    _B.traverse(this.AST_factoryBody, replCodeAction);
    _results = [];
    for (_i = deletions.length - 1; _i >= 0; _i += -1) {
      deletion = deletions[_i];
      _results.push(deletion.src.splice(deletion.prop, 1));
    }
    return _results;
  };

  Module.prototype.addReportData = function() {
    var dep, _i, _len, _ref1, _ref2, _ref3, _results;
    _ref1 = _.flatten([this.defineArrayDeps, this.ext_asyncRequireDeps]);
    _results = [];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      dep = _ref1[_i];
      if ((_ref2 = dep.type) !== 'bundle' && _ref2 !== 'system') {
        _results.push((_ref3 = this.bundle) != null ? _ref3.reporter.addReportData(_B.okv(dep.type, dep.name({
          relative: 'bundle'
        })), this.path) : void 0);
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  Module.prototype.convertWithTemplate = function(build) {
    this.build = build;
    l.verbose("Converting '" + this.path + "' with template = '" + this.build.template.name + "'");
    if (l.deb(60)) {
      l.debug("'" + this.path + "' adjusted module.info() with keys_resolvedDependencies = \n", _.pick(this.info(), _.flatten([this.keys_resolvedDependencies, 'parameters', 'kind', 'name', 'flags'])));
    }
    this.moduleTemplate || (this.moduleTemplate = new ModuleGeneratorTemplates(this));
    return this.converted = this.moduleTemplate[this.build.template.name]();
  };

  Object.defineProperties(Module.prototype, {
    path: {
      get: function() {
        if (this.srcFilename) {
          return upath.trimExt(this.srcFilename);
        }
      }
    },
    factoryBody: {
      get: function() {
        var fb;
        fb = this.toCode(this.AST_factoryBody);
        if (this.kind !== 'AMD') {
          return fb;
        } else {
          return fb.slice(1, +(fb.length - 2) + 1 || 9e9).trim();
        }
      }
    },
    'preDefineIFIBody': {
      get: function() {
        if (this.AST_preDefineIFINodes) {
          return this.toCode(this.AST_preDefineIFINodes);
        }
      }
    }
  });

  Module.prototype.toAST = function(code) {
    var err;
    if (_.isString(code)) {
      try {
        return (esprima.parse(code)).body[0];
      } catch (_error) {
        err = _error;
        l.err(err);
        throw new UError("*esprima.parse* in Module @toAST while parsing javascript fragment: \n " + code + ".", {
          nested: err
        });
      }
    } else {
      return code;
    }
  };

  Module.toAST = Module.prototype.toAST;

  Module.toCode = function(astCode) {
    var err;
    if (_.isEmpty(astCode)) {
      return '';
    }
    if (_.isArray(astCode)) {
      astCode = {
        type: 'Program',
        body: astCode
      };
    }
    try {
      return escodegen.generate(astCode, this.escodegenOptions);
    } catch (_error) {
      err = _error;
      throw new UError("Error generating code from AST in Module's toCode - AST = \n " + (l.prettify(astCode)));
    }
  };

  Module.prototype.toCode = function(astCode) {
    if (astCode == null) {
      astCode = this.AST_body;
    }
    return Module.toCode.call(this, astCode);
  };

  return Module;

})(TextResource);

_.extend(Module, {
  isLikeCode: isLikeCode,
  isEqualCode: isEqualCode
});

module.exports = Module;
