----------------
# Javadoc Frames Generator

The Java Standard Edition API since version 11 has been published without the
traditional HTML frames layout that many developers have become accustomed to. If
you want to view the Java edition 11 (or later) API with HTML frames, as you
could with earlier Java editions, then you may want to give this a try. The
Javadoc Frames Generator is pure JavaScript. It uses [Phantomjs](https://phantomjs.org)
to parse the javadoc files in a local directory and produce the files needed for
an HTML frames layout. The generated layout is similar to that of the Java SE
10 API. 

### Usage

First you must have [Phantomjs](https://phantomjs.org) installed. Then you can
copy the script and template files to a directory of your choice, and from that
directory, execute:

```
 $ phantomjs jf-generator.js <path-to-javadoc-home> 
```

Alternatively, the <em>path-to-javadoc-home</em> parameter can be supplied by
editing the configuration file ```js-config.js```. For example:
```
exports.javadocPath = '/path/to/jdk11/docs/api';
...
```
After the script executes, open the newly created file: ```<path-to-javadoc-home>/main.html```

### Screenshots

The generated frames layout is similar to the Java SE 10 API, with a few notable differences:

![API frames layout](https://user-images.githubusercontent.com/1900914/137644452-40538013-b511-4898-9cf0-be6bb91db7e0.png)

View packages in the package list frame (upper left), grouped by module, in the
<em>All Modules</em> list, which has expandable tabs.

![package list frame](https://user-images.githubusercontent.com/1900914/137644506-9e6ff21f-accb-44d9-ad33-b90420e5bb78.png)&nbsp;&nbsp;
![package list frame](https://user-images.githubusercontent.com/1900914/137644556-5b99184f-6ed5-44c9-8652-b1ae8e0da68c.png)

Or select the <em>All Packages</em> list, as was available in previous editions.

![package list frame](https://user-images.githubusercontent.com/1900914/137644572-049e370b-ef85-4bbd-982f-bb7d0c163a42.png)

Note that a <code>FRAMES/NO FRAMES</code> button is placed in the upper right corner (just
to the left of the API version header) to toggle the view mode from frames to
no-frames.

The Javadoc Frames Generator only creates new files under the specified directory.
None of the original API files are modified.

### Dependencies

Phantomjs is the only dependency. You can download it from the
[Phantomjs website](https://phantomjs.org/download.html), or from
Github, [https://github.com/ariya/phantomjs](https://github.com/ariya/phantomjs/).

---
<sub>Copyright &copy; 2021 James P Hunter</sub>
