

var https = require('https'),
    //httpProxy = require('http-proxy'),
	url = require('url');

/* docs:
https://nodejs.org/api/https.html
https://nodejs.org/api/http.html
*/	
	
var express = require('express');
var app = express();

var targetServer = "mockdataapi-lucasjellema.apaas.em2.oraclecloud.com";
//var targetServer = "data-api-lucasjellema.apaas.em2.oraclecloud.com"
/*
https.get('https://mockdataapi-lucasjellema.apaas.em2.oraclecloud.com/departments/100', function(res)  {
  console.log('HTTPS statusCode: ', res.statusCode);
  console.log('HTTPS headers: ', res.headers);

  res.on('data', function (d) {
  console.log('HTTPS Data Received : ');
    process.stdout.write(d);
  });

}).on('error', function (e)  {
  console.error('HTTPS error '+e);
});
*/
var PORT =5100;

var options = {
  host: targetServer,
  port: 443,
headers: {
    accept: '*/*'
},  path: '/departments',
  method: 'GET'
};


app.listen(PORT, function () {
  console.log('Server running, Express is listening on port ...'+PORT);
});



/*
var req = https.request(options, function(res) {
  console.log(res.statusCode);
  res.on('data', function(d) {
    process.stdout.write(d);
  });
});
req.end();
console.log(req._headers);

req.on('error', function(e) {
  console.error("https call failed "+e);
});
*/
// curl -vIX GET https://mockdataapi-lucasjellema.apaas.em2.oraclecloud.com/departments

//curl -vIX GET  https://data-api-lucasjellema.apaas.em2.oraclecloud.com/departments/90
app.get('/', function (req, res) {


    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write("No Data Requested, so none is returned");
    res.end();
});

app.get('/hrm/*', function(req,res){ handleHRM(req, res);} );
app.get('/conversion/*', function(req,res){ handleConversion(req, res);} );
	
function handleHRM(request, response) {
console.log(request.url);
console.log(request.path);
  var data="";
  // copy the URL path after /hrm to the destination path
  options.path = request.path.substring(4);
  console.log('forward path '+options.path);
  var req = https.request(options, function(res) {
  res.on('data', function(d) {
    console.log("on receive data");
    process.stdout.write(d);
	data=data+d;
    console.log("data = "+data);
  });//data

  res.on('end', function() {
    console.log("end receive data");
    console.log('data = '+ data);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    response.setHeader('Access-Control-Allow-Credentials', true);
    console.log("set headers done");
    response.writeHead(200, {'Content-Type': 'application/json'});
	console.log("write head");
    response.end(data);
	console.log("done response: "+data);
  });//end
  
}//req
);
console.log('req end');
req.end();
} //handleHRM

function handleConversion(request, response) {
var targetServer = "icsdem0058service-icsdem0058.integration.us2.oraclecloud.com";
var targetPath = "/integration/flowapi/rest/DISTANCECONVERSIONRESTUSINGEXTER/v01";
/* https://icsdem0058service-icsdem0058.integration.us2.oraclecloud.com/integration/flowapi/rest/DISTANCECONVERSIONRESTUSINGEXTER/v01/distance/Meters/Yards?distance=100

local:
http://localhost:5100/conversion/distance/Meters/Yards?distance=100
*/
var username= 'gse_cloud-admin@oracleads.com';
var passw = 'bristlyYear5^';
var optionsC = {
  host: targetServer,
  port: 443,
headers: {
    accept: '*/*',
      'Authorization': 'Basic ' + new Buffer(username + ':' + passw).toString('base64'),
},  
path: targetPath+'/distance/Meters/Yards?distance=100',
  method: 'GET'
};
console.log("target server "+optionsC.host);
console.log("target path "+optionsC.path);
console.log("***** targetURL  "+optionsC.host+optionsC.path);
var url_parts = url.parse(request.url, true);
var query = url_parts.query;
console.log("query:"+query);
console.log("query distance:"+query.distance);
var distance = query.distance;
  var data="";
  // copy the URL path after /hrm to the destination path
  optionsC.path = targetPath+request.path.substring(11)+'?distance='+distance;
  console.log('forward path '+optionsC.path);
  var req = https.request(optionsC, function(res) {
  res.on('data', function(d) {
    console.log("on receive data");
    process.stdout.write(d);
	data=data+d;
    console.log("data = "+data);
  });//data

  res.on('end', function() {
    console.log("end receive data");
    console.log('data = '+ data);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    response.setHeader('Access-Control-Allow-Credentials', true);
    console.log("set headers done");
    response.writeHead(200, {'Content-Type': 'application/json'});
	console.log("write head");
    response.end(data);
	console.log("done response: "+data);
  });//end


  res.on('error', function(e) {
    console.log("on receive error");
    process.stdout.write(e);
  });//error
}//req
);
console.log('req end');
req.end();
} //handleConversion


