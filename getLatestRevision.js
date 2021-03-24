#! /usr/local/bin/node
/*jslint node:true */
// getLatestRevision.js
// ------------------------------------------------------------------
//
// created: Mon Dec  3 13:31:48 2018
// last saved: <2021-March-23 17:12:47>

/* jshint esversion: 9, node: true, strict:implied */
/* global process, console, Buffer */

const apigeejs = require('apigee-edge-js'),
      common   = apigeejs.utility,
      apigee   = apigeejs.apigee,
      Getopt   = require('node-getopt'),
      util     = require('util'),
      version  = '20210323-1711',
      getopt   = new Getopt(common.commonOptions.concat([
        ['P' , 'prefix=ARG', 'optional. name prefix. query revision of proxies with names starting with this prefix.' ],
        ['R' , 'regex=ARG', 'optional. a regular expression. query revision of proxies with names matching this regex.' ],
        ['S' , 'sharedflow', 'optional. query sharedflows. Default: query proxies.']
      ])).bindHelp();

function isKeeper(opt) {
  if (opt.options.regex) {
    common.logWrite('using regex match (%s)',opt.options.regex);
    return name => name.match(new RegExp(opt.options.regex));
  }

  if (opt.options.prefix) {
    common.logWrite('using prefix match (%s)',opt.options.prefix);
    return name => name.startsWith(opt.options.prefix);
  }

  return () => true;
}

// ========================================================
let opt = getopt.parse(process.argv.slice(2));

if (opt.options.verbose) {
  console.log(
  `Apigee  GetLatestRevision tool, version: ${version}\n` +
      `Node.js ${process.version}\n`);
  common.logWrite('start');
}

// process.argv array starts with 'node' and 'scriptname.js'
common.verifyCommonRequiredParameters(opt.options, getopt);
apigee
  .connect(common.optToOptions(opt))
  .then( org => {
    common.logWrite('connected');
    const collection = (opt.options.sharedflow) ? org.sharedflows : org.proxies;
    return collection.get({})
      .then( items => {
        let reducer = (p, name) =>
          p.then( results =>
                  collection
                  .get({ name })
                  .then( ({revision}) => [ ...results, {proxyname:name, revision:revision[revision.length-1]} ] )
                );

        return items
            .sort()
            .filter( isKeeper(opt) )
            .reduce(reducer, Promise.resolve([]))
            .then( a => common.logWrite('all done...\n' + JSON.stringify(a, null, 2)) );
      });
  })
  .catch( e => console.error('error: ' + util.format(e) ));
