'use strict';

var express = require('express');

var app = express();


// [START hello_world]
// Say hello!
app.get('/', function(req, res) {
  res.status(200).send('Hello, world!');
});
// [END hello_world]

if (module === require.main) {
  // [START server]
  // Start the server
  var server = app.listen(process.env.PORT || 8080, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('App listening at http://%s:%s', host, port);
  });
  // [END server]
}

module.exports = app;
