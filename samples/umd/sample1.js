// generated by uRequire v0.0.1, (C) AnoDyNoS 2012, License: MIT
(function (root, factory) {
    if (typeof exports === 'object') {

          var makeRequire = require('uRequire').makeRequire;
          var asyncRequire = makeRequire('sample1.js');
          module.exports = factory(asyncRequire, require('underscore'), require('depdir1/dep1'));

    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['require', 'underscore', 'depdir1/dep1'], function (require, _, dep1) { 
          return (root.myAwesomeModule = factory(require, _, dep1)); 
        });
    }
}(this, function(require, _, dep1) {
    console.log("\n main starting....");
dep1 = new dep1;
dep1.myEach([ 1, 2, 3 ], function(val) {
    return console.log("each :" + val);
});
return "main";

}));