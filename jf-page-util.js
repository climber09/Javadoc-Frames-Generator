'use strict';
var pageUtil = function() {

  function dirname() {
    var basenameRE = new RegExp('/[^/]+$');
    return function(path) {
      return path.replace(basenameRE, '');
    }
  }

  function compareIgnoreCase(s1, s2){
    s1 = s1.toUpperCase();
    s2 = s2.toUpperCase();
    return (s1 < s2)? -1: (s1 > s2)? 1: 0;
  }

  function compareBySplitValue(delim) {
    return function(s1, s2) {
      var n1 = s1.substring(s1.indexOf(delim) +1).toUpperCase();
      var n2 = s2.substring(s2.indexOf(delim) +1).toUpperCase();
      if (n1 < n2) return -1;
      if (n1 > n2) return 1;
      return (s1 < s2)? -1: 1;
    };
  }

  function hasAncestor(aNode, stopNode, test) {
    if (test(aNode)) {
      return true;
    }
    if (aNode === stopNode) {
      return false;
    }
    return hasAncestor(aNode.parentNode, stopNode, test);
  }

  function addToTotal() {
    var total = 0;
    return function(n) {
      if (n) {
        total += n;
      }
      return total;
    }
  }

  function test(action, postExec) {
    return action( function(message, callback){
      if(callback)
        callback();
      if (message)
        console.log(message);
      if(postExec)
        postExec();
      phantom.exit();
    });
  }

  return {
    dirname : dirname(),
    addToTotal : addToTotal,
    compareIgnoreCase : compareIgnoreCase,
    compareBySplitValue : compareBySplitValue,
    hasAncestor : hasAncestor,
    test : test
  }
}();
