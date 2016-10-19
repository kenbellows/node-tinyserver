var util = require('util');
var http = require('http');
var path = require('path');
var fs = require('fs');
var mime = require('mime');
var _ = require ('lodash/core');


var exports = module.exports = {};

var statusResponses = exports.statusResponses = {
  403: {status: 403, contentType: mime.types.html, content:'<h1>Forbidden</h1><p>You do not have permission to view this resource.</p>'},
  404: {status: 404, contentType: mime.types.html, content:'<h1>Not found</h1><p>Could not find the resource you requested.</p>'}
}


function getRoute(req, routes) {
  var url = req.url;
  var route, match;
  console.log('url:', url);
  if (match = routes.find(r => url === r.pattern)) {
    console.log('matched', match.pattern);
    route = match.response;
  }
  else if (match = routes.find(r => _.isString(r.pattern)? url.split('?')[0] === r.pattern : _.isRegExp(r.pattern)? url.match(r.pattern) : false)){
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
  else if ('file' in route) util._extend(route, getFile(route.file));
  else if ('handler' in route) route.content = route.handler(req)

  return route;
}

function getFile(filename) {
  return {
    content: fs.readFileSync(filename),
    contentType: mime.lookup(filename)
  }
}


exports.serve = function (routes, port) {

  http.createServer((req,res)=>{
    var url = req.url;
    console.log('received request for', url);
    
    var route = getRoute(req, routes);
    var headers = {};
    headers['Content-Type'] = route.contentType || mime.types.txt;
    if ('headers' in route) util._extend(headers, route.headers);

    res.writeHead(
      route.status || 200,
      headers
    );
    
    res.write(route.content || '');
    res.end();
  }).listen(port || 3000);
  console.log('Listening on port', port||3000);

}

