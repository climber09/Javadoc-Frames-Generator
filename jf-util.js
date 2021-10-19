'use strict';
var jfUtil = function() {
  var basenameRE = new RegExp('/[^/]+$');
  var levelRE = new RegExp('_.+$');

  function dirname(path) {
    return path.replace(basenameRE, '');
  }

  function compareByLevel(s1, s2) {
    var a1 = s1.replace(levelRE, '');
    var a2 = s2.replace(levelRE, '');
    var c = compareIgnoreCase(a1, a2);
    if (c != 0) {
      return c;
    }
    // attempt to break the tie
    if (s1.indexOf('_') != -1) {
      if (s2.indexOf('_') == -1) {
          return 1;
      } else {
        return compareByLevel(s1.substring(a1.length + 1), s2.substring(a2.length + 1));
      }
    } else if (s2.indexOf('_') != -1) {
      return -1;
    }
    return 0;
  }

  function compareIgnoreCase(s1, s2){
    s1 = s1.toUpperCase();
    s2 = s2.toUpperCase();
    return (s1 < s2)? -1: (s1 > s2)? 1: 0;
  }

  function compareSplitValue(delim) {
    return function(s1, s2) {
      var n1 = s1.substring(s1.indexOf(delim) +1).toUpperCase();
      var n2 = s2.substring(s2.indexOf(delim) +1).toUpperCase();
      var c = compareByLevel(n1, n2);
      if (c != 0) {
        return c;
      }
      return compareByLevel(s1, s2);
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
    dirname : dirname,
    addToTotal : addToTotal,
    compareByLevel : compareByLevel,
    compareIgnoreCase : compareIgnoreCase,
    compareSplitValue : compareSplitValue,
    hasAncestor : hasAncestor,
    test : test
  }
}();
