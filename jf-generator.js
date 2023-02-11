/**
 * Files needed:
 *    jf-generator.js
 *    jf-config.js
 *    jf-util.js
 *    templates/main.html
 *    templates/index-frame.html
 *    templates/allclasses-frame.html
 *    templates/overview-frame.html
 *    templates/allpackages-frame.html
 *    templates/package-frame.html
 *    templates/index-style.js
 */
"use strict";
(function() {
  var webPage = require('webpage');
  var system = require('system');
  var fs = require('fs');
  var config = require('./jf-config');
  var javadocHome = config.javadocHome;
  var apiHeading = config.apiHeading;
  var actions, indexTitle, javadocURI, packages, totalBytes;

  /*
   * A mapping of module names to a list of package names.
   * {module_name => [package_name...]}.
   */
  var ModuleToPkgMap = {};

  /*
   * A mapping of package names to the associated file system paths.
   * Package paths are relative to the javadoc_home directory, starting
   * with the parent module directory.
   * {package_name => module_dir/path/to/package/dir}
   */
  var PkgToPathMap = {};

  /*
  * load the data for all modules and packages.
  */
  function loadData(callback) {
    var moduleData, packageData;
    var page = webPage.create();
    page.injectJs(javadocHome + fs.separator + 'script.js');
    page.injectJs(javadocHome + fs.separator + config.moduleSearchIndex);
    page.injectJs(javadocHome + fs.separator + config.packageSearchIndex);

    moduleData = page.evaluate( function() {
      if(typeof moduleSearchIndex !== 'undefined') {
        return moduleSearchIndex;
      }
    });
    packageData = page.evaluate( function() {
      if (typeof packageSearchIndex !== 'undefined') {
        return packageSearchIndex;
      }
    });

    if (! moduleData || ! packageData) {
      return callback(
          new Error('Cannot load module and/or package data from ' + javadocHome),
          function(){page.close(); phantom.exit(1)});
    }

    for (var i = 0; i < moduleData.length; i++) {
      if (moduleData[i] && moduleData[i] !== 'undefined') {
        ModuleToPkgMap[ moduleData[i]['l'] ] = [];
      }
    }

    // Prepare the data for each of the package-frame links
    for (var i = 0; i < packageData.length; i++) {
      var mod = packageData[i]["m"];
      var pkg = packageData[i]["l"];
      if (mod && mod !== 'undefined') {
        var pkgDir = mod + fs.separator + pkg.replace(/\./g, fs.separator);
        PkgToPathMap[pkg] = pkgDir;
        ModuleToPkgMap[mod].push(pkg);
      }
    }
    return callback('Loaded module and package data', function(){page.close()});
  }

  /*
   * Generate a new 'All Classes' page:
   */
  function writeAllClassesPage(callback) {
    var page = webPage.create();
    var uri = javadocURI + '/' + config.overviewSummaryPage;
    var source = config.templates + fs.separator + config.newAllClassesPage;
    var dest = javadocHome + fs.separator + config.newAllClassesPage;
    var pageTitle;

    page.open(uri, function(status) {
      if (status !== 'success') {
        return callback('Failed to load ' + uri);
      } else {
        page.injectJs('jf-util.js');

        if (apiHeading === '' || apiHeading === 'undefined') {
          apiHeading = page.title.replace(/.*\(/, '').replace(/\).*$/, '').trim();
        }
        indexTitle = 'Overview (' + apiHeading + ' )';
        pageTitle = 'All&nbsp;Classes (' + apiHeading + ' )';

        var lines = page.evaluate(function() {
          var fqnToContentMap = {};
          var sections = document.querySelectorAll('section');
          var lines = [], sortKeys;
          var sectionName, fqName, pkgName, typeName, displayName, aTag, href, title;

          for (var i = 0, sLen = sections.length; i < sLen; i++) {
            sectionName = sections[i].children[0].innerHTML.replace(/ .*$/, '');
            var items = sections[i].querySelectorAll('li');

            for (var j = 0, iLen = items.length; j < iLen; j++) {
              pkgName = items[j].firstChild.nodeValue;
              if (items[j].children[0].nodeName == 'A') {
                aTag = items[j].children[0];
              } else {
                continue;
              }
              typeName = aTag.innerHTML.replace(/<[^>]+>/g, '');
              fqName = pkgName + typeName;
              href = aTag.attributes['href'].value;
              title = sectionName.toLowerCase() + ' in ' + pkgName.replace(/\.$/, '');
              displayName = typeName;
              if (sectionName === 'Interface') {
                displayName = '<span class="interfaceName">' + displayName + '</span>'
              }
              var k = fqName + ' ' + typeName;
              if (typeof fqnToContentMap[k] === 'undefined') {
                fqnToContentMap[k] = '<li><a target="classFrame" href="' + href + '" title="' + title + '">' + displayName + '</a></li>';
              }
            }
          }
          sortKeys = Object.keys(fqnToContentMap);
          sortKeys.sort(jfUtil.compareSplitValue(' '));
          sortKeys.forEach(function (key, i) {
            lines.push(fqnToContentMap[key]);
          });
          return lines;
        });

        try {
          // filter out non-static inner classes and interfaces.
          for(var i = 0, l = lines.length; i < l; i++) {
            var fqName = lines[i].replace(/^.+ href="(.+)\.html" .+$/, '$1');
            var baseName = fqName.substring(fqName.lastIndexOf('/') + 1);
            if (baseName.indexOf('.') != -1) {
              var fileName = javadocHome + fs.separator + fqName.replace(/\//g, fs.separator) + '.html'
              var fstream = fs.open(fileName, 'r');
              var line, isStaticMember = false;
              while(! fstream.atEnd() && ! isStaticMember) {
                line = fstream.readLine();
                if (line.match('static( final)? (?:class|interface|@interface|enum).+' + baseName)) {
                  isStaticMember = true;
                }
              }
              fstream.close();
              if (! isStaticMember) {
                delete lines[i];
              }
            }
          }

          var content = fs.read(source)
              .replace('<title>', '<title>' + pageTitle)
              .replace('%NEW_CONTENT%', lines.join('\n'));

          fs.write(dest, content, 'w');
          return callback(diskWriteLog(dest), function(){page.close()});
        } catch (e) {
          return callback(e, function(){page.close()})
        }
      }
    });
  }

  /*
   * Write the parent frame page, main.html, to the destination directory.
   */
  function writeParentFramePage(callback) {
    var source = config.templates + fs.separator + config.mainPage;
    var dest = javadocHome + fs.separator + config.mainPage;
    var content;

    try {
      content = fs.read(source).replace('<title>', '<title>' + indexTitle)
      fs.write(dest, content, 'w');
      return nextAction(diskWriteLog(dest));
    } catch (e) {
      return callback(e);
    }
  }

  /*
   * Generate index-frame.html.
   */
  function writeIndexFramePage(callback) {
    var source = config.templates + fs.separator + config.newIndexPage;
    var dest = javadocHome + fs.separator + config.newIndexPage;
    var content;

    try {
      content = fs.read(source).replace('<title>', '<title>' + indexTitle);
      fs.write(dest, content, 'w');
      return callback(diskWriteLog(dest));
    } catch (e) {
      return callback(e);
    }
  }

  /*
   * Add an additional style sheet.
   */
  function writeStylesheet(callback) {
    var source = config.templates + fs.separator + config.stylesheet;
    var dest =  javadocHome + fs.separator + config.stylesheet;
    var content;

    try {
      content = fs.read(source);
      fs.write(dest, content, 'w');
      return callback(diskWriteLog(dest));
    } catch (e) {
      return callback(e);
    }
  }

  /*
   * Generate the 'Overview' page - all modules and their packages.
   */
  function writeOverviewPage(callback) {
    var source = config.templates + fs.separator + config.newOverviewPage;
    var dest = javadocHome + fs.separator + config.newOverviewPage;
    var content = [];

    for (var m in ModuleToPkgMap) {
      content.push('<div class="ec_box"><button type="button" class="module">' + m + '</button></div>');
      content.push('<div class="content"><ul title="Packages">');

      for (var p in ModuleToPkgMap[m]) {
        var pkgName = ModuleToPkgMap[m][p];
        var href = PkgToPathMap[pkgName] + '/' + config.newPackagePage;
        content.push('<li><a href="' + href + '" target="packageFrame">' + pkgName + '</a></li>');
      }
      if (ModuleToPkgMap[m].length == 0) {
        content.push('<li><em>No Packages</em></li>');
      }
      content.push('</ul></div>');
    }

    try {
      content = fs.read(source)
          .replace('<title>', '<title>' + indexTitle)
          .replace(/%API_HEADING%/g, apiHeading)
          .replace('%NEW_CONTENT%', content.join('\n'));

      fs.write(dest, content, 'w');
      return callback(diskWriteLog(dest));
    } catch (e) {
      return callback(e);
    }
  }

  /*
   * Generate the 'All  Packages' page.
   */
  function writeAllPackagesPage(callback) {
    var source = config.templates + fs.separator + config.newAllPackagesPage;
    var dest = javadocHome + fs.separator + config.newAllPackagesPage;
    var pageTitle = 'All&nbsp;Packages ' + indexTitle.substring( indexTitle.indexOf('(') );
    var content = [];
    var href, pkgName;
    var pkgList = Object.keys(PkgToPathMap).sort();

    for (var i = 0, len = pkgList.length; i < len; i++) {
      pkgName = pkgList[i];
      href = PkgToPathMap[pkgName] + '/' + config.newPackagePage;
      content.push('<li><a href="' + href + '" target="packageFrame">' + pkgName + '</a></li>');
    }

    try {
      content = fs.read(source)
          .replace('<title>', '<title>' + pageTitle)
          .replace(/%API_HEADING%/g, apiHeading)
          .replace('%NEW_CONTENT%', content.join('\n'));

      fs.write(dest, content, 'w');
      return callback(diskWriteLog(dest));
    } catch (e) {
      return callback(e);
    }
  }

  /*
   * Generate each of the package index pages for the package frame.
   */
  function writePackagePage(pkgPath, callback) {
    var source = config.templates + fs.separator + config.newPackagePage;
    var dest = [javadocHome, pkgPath, config.newPackagePage].join(fs.separator);
    var uri = [javadocURI, pkgPath, config.packageSummaryPage].join('/').replace(/\\/g, '/');
    var pathParts = pkgPath.split(fs.separator);
    var pkgName = pathParts.slice(1).join('.');
    var stylesheetPath = pathParts.map(function(){return '../'}).join('');
    var page = webPage.create();
    var content;

    page.open(uri, function(status) {
      if (status !== 'success') {
        return callback('Failed to load ' + uri);
      } else {
        page.injectJs('jf-util.js');
        content = page.evaluate(function() {

          var TypeSummary = {
            Interface : {},
            Class : {},
            Enum : {},
            Exception : {},
            Error : {},
            Annotation : {},
            Record : {}
          };

          function ancestorTest(n, re) {
            var p = n.parentNode;
            var s = p.children[0];
            return p.nodeName === 'LI' && s.nodeName === 'A'
                && s.hasAttribute('href') && s.getAttribute('href').match(re);
          }

          var lines = [];
          var sections = document.querySelectorAll('section');
          var locPath = jfUtil.dirname(location.href);
          var tsName, links, linkPath, lKey, tsKeys, section, link;

          for (var i = 0, sLen = sections.length; i < sLen; i++) {
            section = sections[i];
            // Strip off the type name from the section header.
            tsName = section.children[0].innerHTML.replace(/ .*$/, '');
            links = section.querySelectorAll('li a:first-of-type[href]');

            for (var j = 0, kLen = links.length; j < kLen; j++) {
              link = links[j];
              // exclude members of the hierarchy outside of the current package by
              // comparing the current link against the link for the current package.
              linkPath = jfUtil.dirname(link.toString());
              if (linkPath !== locPath) {
                continue;
              }

              link.removeAttribute('class');
              link.setAttribute('target', 'classFrame');
              // remove any decorative tags enclosing the link text
              link.innerHTML = link.innerHTML.replace(/<[^>]+>/g, '');
              lKey = link.innerHTML;

              if (tsName === 'Interface') {
                link.innerHTML = '<span class="interfaceName">' + link.innerHTML + '</span>';
              }

              if (jfUtil.hasAncestor(link, section, function(n) {
                return ancestorTest(n, /\/?Exception.html$/);
              }) ) {
                TypeSummary['Exception'][lKey] = link;
              }
              else if (jfUtil.hasAncestor(link, section, function(n) {
                return ancestorTest(n, /\/?Error.html$/);
              }) ) {
                TypeSummary['Error'][lKey] = link;
              }
              else {
                TypeSummary[tsName][lKey] = link;
              }
            }
          }

          // create the final html content
          for (var t in TypeSummary) {
            tsKeys = Object.keys(TypeSummary[t]);
            if (tsKeys.length > 0) {
              tsKeys.sort(jfUtil.compareByLevel);
              tsName = (t === 'Class')? t.concat('es'):
                       (t === 'Record')? t.concat('&nbsp;Classes'):
                       t.concat('s');
              lines.push('<h2 title="' + tsName + '">' + tsName + '</h2>');
              lines.push('<ul title="' + tsName + '">');

              tsKeys.forEach(function (key, i) {
                lines.push('<li>' + TypeSummary[t][key].outerHTML + '</li>');
              });
              lines.push('</ul>');
            }
          }
          return lines.join('\n');
        });

        try {
          content = fs.read(source)
              .replace('<title>', '<title>' + page.title)
              .replace('href="stylesheet.css"', 'href="' + stylesheetPath + 'stylesheet.css"')
              .replace('href="' + config.stylesheet + '"', 'href="' + stylesheetPath + config.stylesheet + '"')
              .replace(/%PACKAGE_NAME%/g, pkgName)
              .replace('%NEW_CONTENT%', content);

          fs.write(dest, content, 'w');
        } catch (e) {
          return callback(e, function(){page.close()});
        }
        return callback(diskWriteLog(dest), function(){page.close()});
      }
    });
  }

  /*
   *
   */
  function diskWriteLog(file) {
    var bytes = (fs.size(file));
    totalBytes(bytes);
    var pad = "        ".substring(bytes.toString().length);
    var entry = 'wrote to disk:' + pad + bytes + '  ' + file;
    return entry;
  }

  /*
   *
   */
  function nextAction(message, callback) {
    if (message) {
      console.log('Action Result: ' + message);
    }
    if (callback) {
      callback();
    }
    return executeAction();
  }

  /*
   *
   */
  function executeAction() {
    if (actions.length > 0) {
      if (actions.length > 1) {
        return actions.shift()(nextAction);
      }
      if (! packages) {
        packages = Object.keys(PkgToPathMap);
      }
      if (packages.length > 0) {
        return actions[0](PkgToPathMap[packages.shift()], nextAction);
      }
    }
    console.log('Total bytes written: ' + totalBytes());
    phantom.exit();
  }

  if (system.args.length === 2) {
    javadocHome = system.args[1];
  }
  if (javadocHome === '.') {
    javadocHome = fs.workingDirectory
  }
  javadocHome = javadocHome.trim().replace(/[\/\\]+$/, '');
  if (! fs.isDirectory(javadocHome)) {
    console.log('Not a valid directory: "' + javadocHome + '"');
    phantom.exit(1);
  }
  javadocURI = javadocHome.replace(/\\/g, '/').replace(/^\/*/, 'file:///');
  phantom.injectJs('./jf-util.js');
  totalBytes = jfUtil.addToTotal();
  actions = [
    loadData,
    writeAllClassesPage,
    writeParentFramePage,
    writeIndexFramePage,
    writeStylesheet,
    writeOverviewPage,
    writeAllPackagesPage,
    writePackagePage
  ];
  executeAction();
})();
