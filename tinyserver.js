/**
 * A tiny server implementation made for simulating a backend while developing a frontend
 * @module tinyserver
 */

/**
 * An object describing how you want to respond to a request
 * @typedef {Object} ResponseDefinition
 * @property {Number} status          - The HTTP status code of a response
 * @property {String} contentType     - A string to be used as the Content-Type header; can (should?) be populated
 *                                      with members of mime.types (if you require the 'mime' npm module)
 * @property {String|Buffer} content  - The response body
 * @property {String} redirectTo      - An alternative URL to use instead of the requested URL
 * @property {Function} handler       - A callback method that will be called with the request object to retrieve
 *                                      the response body; should return a String or a Buffer
 * @property {Object} headers         - Additional headers to added to the response
 * @property {String} file            - A file on the local file system to write out as the repsonse; the MIME type
 *                                      of the file will be detected and used as the Content-Type header
 */

 /**
  * A single mapping definition pairing a URL pattern to a ResponseDefinition
  * @typedef UrlMapping
  * @property {String|RegExp} pattern         - The URL pattern to match; a String will look for an exact match
  *                                             (ignoring hashes and query params), a RegExp will be compared
  *                                             with url.match(pattern)
  * @property {ResponseDefinition} response   - An object describing how to handle requests matching the pattern
  */


var http = require('http');
var path = require('path');
var fs = require('fs');
var mime = require('mime');
var _ = require ('lodash/core');


var exports = module.exports = {};


/**
 * Standard status response objects. Feel free to replace them with custom error code responses.
 */
var statusResponses = exports.statusResponses = {
  403: {status: 403, contentType: mime.types.html, content:'<h1>Forbidden</h1><p>You do not have permission to view this resource.</p>'},
  404: {status: 404, contentType: mime.types.html, content:'<h1>Not found</h1><p>Could not find the resource you requested.</p>'}
}

/**
 * Given a request object and a route mapping, determine what kind of response to send; internal method,
 * not exposed on the module exports
 * @returns {ResponseDefinition}
 */
function getRoute(req, routes) {
  var url = req.url;
  var route, match;
  console.log('url:', url);
  if (match = routes.find(r => url === r.pattern)) {
    console.log('matched', match.pattern);
    route = match.response;
  }
  else if (match = routes.find(r => _.isString(r.pattern)? url.split(/[?#]/)[0] === r.pattern : _.isRegExp(r.pattern)? url.match(r.pattern) : false)){
    console.log('matched', match.pattern);
    route = match.response;
  }
  else {
    var filename = path.join('.',url);
    if (fs.existsSync(filename)) {
      console.log('returning file', filename);
      route = getFile(filename);
    }
    else {
      console.error('Path not found!');
      return statusResponses[404];
    }
  }
  
  if ('redirectTo' in route) { req.url = route.redirectTo; return getRoute(req); }
  else if ('file' in route) _.extend(route, getFile(route.file));
  else if ('handler' in route) route.content = route.handler(req)

  return route;
}

function getFile(filename) {
  return {
    content: fs.readFileSync(filename),
    contentType: mime.lookup(filename)
  }
}

/**
 * Kick off a server on the specified port (defaults to 3000) that recognizes the provided routes
 * @param {Array<UrlMapping>} routes  - An array of UrlMappings connecting URLs to behaviors
 * @param {Number} [port=3000]        - The port on which to listen for connections; defaults to port 3000
 * @returns {http.Server}
 */
exports.serve = function (routes, port) {

  var server = http.createServer((req,res)=>{
    var url = req.url;
    console.log('received request for', url);
    
    var route = getRoute(req, routes);
    var headers = {};
    headers['Content-Type'] = route.contentType || mime.types.txt;
    if ('headers' in route) _.extend(headers, route.headers);

    res.writeHead(
      route.status || 200,
      headers
    );
    
    res.write(route.content || '');
    res.end();
  }).listen(port || 3000);
  console.log('Listening on port', port||3000);
  return server;
}

