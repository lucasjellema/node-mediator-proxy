//CORS middleware - taken from http://stackoverflow.com/questions/7067966/how-to-allow-cors-in-express-node-js
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', true);
 
    next();
}

var https = require('https'),
    http = require('http'),
    fs = require('fs'),
    //httpProxy = require('http-proxy'),
	url = require('url'),
	request = require('request'),
	qs = require('querystring'),
	bodyParser = require('body-parser'),
    dateFormat = require('dateformat');

var soap = require('soap'); //https://www.npmjs.com/package/soap
var xml2js = require('xml2js'); //https://www.npmjs.com/package/xml2js


var utils = require( "./proxy-utils.js" );
var icsProxy = require( "./ics-proxy.js" );
var icsDropoffProxy = require( "./ics-dropoff-proxy.js" );
var pcsProxy = require( "./pcs-proxy.js" );
var settings = require( "./proxy-settings.js" );

/* docs:
https://nodejs.org/api/https.html
https://nodejs.org/api/http.html

https://github.com/request/request

*/	
	
var express = require('express');
var app = express();


var icsUsername= 'gse_cloud-admin@oracleads.com';
var icsPassword = 'blOody@4PiLl';
 var pcsUsername= 'cloud.admin';
 var pcsPassword = 'preservedPoundage=4';


 var icsTargetServer = "icsdem0058service-icsdem0058.integration.us2.oraclecloud.com";
 var pcsTargetServer = "pcs1-gse00000196.process.us2.oraclecloud.com"; // identity domain gse00000196 
 var soacsTargetServer = "140.86.4.95";


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
var PORT = settings.PORT;

var proxyVersion = "0.9.3"

var proxyServerIP = settings.proxyServerIP;



var options = {
  host: targetServer,
  port: 443,
headers: {
    accept: '*/*'
},  path: '/departments',
  method: 'GET'
};

/*
app.listen(PORT, function () {
  console.log('Server running, Express is listening on port ...'+PORT);
});
*/




if (module === require.main) {
  // [START server]
  // Start the server
  var server = app.listen(PORT, function () {
    var host = server.address().address;

    console.log('App listening at http://%s:%s', host, PORT);
    addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] **************************************** Restart ");
    addToLogFile( "\n ********* Restart of proxy; version "+proxyVersion + ", listening at  port "+":" + PORT );

	});
  // [END server]
}

module.exports = app;

// curl -vIX GET https://mockdataapi-lucasjellema.apaas.em2.oraclecloud.com/departments

//curl -vIX GET  https://data-api-lucasjellema.apaas.em2.oraclecloud.com/departments/90
app.get('/', function (req, res) {

console.log('request received: '+request.url);

    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write("No Data Requested, so none is returned");
    res.end();
});

app.get('/logs', function(req, res) {

    res.writeHead(200, {
        'Content-Type': 'text/plain'    });

    var readStream = fs.createReadStream(settings.logFile);
    readStream.pipe(res);
  
  });


// Say hello!
app.get('/hello', function(req, res) {
  res.status(200).send('Hello, world!');
});
// [END hello_world]

app.get('/hrm/*', function(req,res){ handleHRM(req, res);} );
app.get('/conversion/*', function(req,res){ handleConversion(req, res);} );
app.get('/soacs/*', function(req,res){ handleSOACS(req, res);} );
app.post('/soacs/*', function(req,res){ handleSOACSPost(req, res);} );

app.use(bodyParser.json()); // for parsing application/json
//app.use(bodyParser.urlencoded({ extended: false })); 
// parse an HTML body into a string 
app.use(bodyParser.text({ type: 'text/xml' }));
app.use(allowCrossDomain);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: '*/*' }));

app.post('/ics/*', function(req,res){ icsProxy.handleICSPost(req, res); });
app.get('/ics/*', function(req,res){ icsProxy.handleICS(req, res); } );
app.get('/pcs/*', function(req,res){ pcsProxy.handlePCSGet(req, res);} );
app.post('/pcs/*', function(req,res){ pcsProxy.handlePCSPost(req, res);} );

app.all('/mcs/*', function(req,res){ handleMCS(req, res);} );
app.all('/c3/*', function(req,res){ handleC3(req, res);} );

app.get('/artistes/*', function(req,res){ handleArtists(req, res);} );
app.get('/artists/*', function(req,res){ handleArtists(req, res);} );
// what it is supposed to be app.get('/artists/*', function(req,res){ handleArtistsAPI(req, res);} );

//icsDropoffProxy.registerListeners(app);
app.post('/icsProxy/iotcs-dropoff', function(req,res){ icsDropoffProxy.handleIoT(req, res); });



function searchKeyWithValue( obj, value ){
    for( var key in obj ) {
        if( typeof obj[key] === 'object' ){
            var result = searchKeyWithValue( obj[key], value );
			if (result) {return result;};
        }
        if( obj[key] == value ){
		    return key;
        }
    }//for
    return null;
}//searchKeyWithValue

/* deal with HTTP calls to ArtistAPI */
function handleArtistsAPI(req, res) {

 var targetServer = "artist-enricher-api-lucasjellema.apaas.em2.oraclecloud.com";

 var targetPath = req.url.substring(8); // anything after /artists
 var targetPort=443;
 var targetUrl = "https://"+targetServer+":"+targetPort+targetPath;
 console.log('forward path '+targetUrl);
 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle Artist Enrichment reuqest, forwarded to "+targetUrl);

 var route_options ={};
 route_options.method = req.method;
 route_options.uri = targetUrl;
 route_options.json = req.body;
 var route_request = request(route_options);
 req.pipe(route_request).pipe(res);

 } //handleArtistsAPI

 
function getValue(property, prefix, obj) {
console.log('extract property '+ property+' - prfefix '+' - obj '+JSON.stringify(obj) );
  var value = obj[prefix+property];
	// deal with calls from PCS
	if (value && value[0])
  	  if ( value[0]["_"]) {
	    value = value[0]["_"]
	  }
	return value;
}//getValue


function handleC3(req, res) {
//https://c3-api-lucasjellema.apaas.em2.oraclecloud.com/speakers
 var targetServer = "c3-api-lucasjellema.apaas.em2.oraclecloud.com";
 var targetPath = req.url.substring(3);// chop off the mcs/
 var targetPort=443;
 console.log('C3 API  forward host and port  '+targetServer+":"+targetPort);
 var targetUrl = "https://"+targetServer+":"+targetPort+targetPath;
 console.log('forward path '+targetUrl);
 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle C3 request, forwarded to "+targetUrl);

   req.pipe(request(targetUrl)).pipe(res);
 } //handleC3



/* deal with all requests to MCS */
function handleMCS(req, res) {
/*
http://stackoverflow.com/questions/10435407/proxy-with-express-js

https://mobileportalsetrial1304dev-mcsdem0001.mobileenv.us2.oraclecloud.com:443/mobile/custom/artistapi
*/


 var targetPath = req.url.substring(4);// chop off the mcs/
 var targetPort=443;
 console.log('MCS  forward host and port  '+settings.mcsServer+":"+targetPort);
 var targetUrl = "https://"+settings.mcsServer+":"+targetPort+targetPath;
 console.log('forward path '+targetUrl);
 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle MCS request, forwarded to "+targetUrl);
 req.pipe(request(targetUrl)).pipe(res);
 
 } //handleMCS
 
 
/* deal with SOAP calls to SOACS */
function handleSOACSPost(req, res) {
/*
http://stackoverflow.com/questions/10435407/proxy-with-express-js
*/
 var targetServer = soacsTargetServer;
  /* http://140.86.4.95:8080/soa-infra/services/aced-cloud-demo/ProposedActsService/ProposedActsService?wsdl */
 var targetPath = req.url.substring(6);
 var targetPort=8080;
 console.log('SOACS POST forward host and port  '+targetServer+":"+targetPort);
 var targetUrl = "http://"+targetServer+":"+targetPort+targetPath;

 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle SOA CS (POST) request, forwarded to "+targetUrl);

 console.log('forward path '+targetUrl);
 var route_request = request.post({uri: targetUrl, json: req.body});
 req.pipe(route_request).pipe(res);
} //handleSOACSPost

function handleSOACS(request, response) {

var targetServer = soacsTargetServer;

/* 
NOTE: any reference in the response to 140.86.4.95:8080/soa-infra should be removed and replaced with a reference to 104.155.85.98/soacs/soa-infra
*/

var optionsSOACS = {
  host: targetServer,
  port: 8080,
  path:'/soa-infra/services/aced-cloud-demo/ProposedActsService/ProposedActsService?wsdl',
  method: 'GET'
};
/* http://140.86.4.95:80/soa-infra/services/aced-cloud-demo/ProposedActsService/ProposedActsService?wsdl */
console.log("request url="+request.url);
console.log("request path="+request.path);
  var data="";
  // copy the URL path after /soacs to the destination path
  optionsSOACS.path = request.url.substring(6);
var url_parts = url.parse(request.url, true);
var query = url_parts.query;
console.log("query:"+query);
 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle SOA CS (GET) request for "+ request.url + request.path +", forwarded to "
 +optionsSOACS.host+":"+optionsSOACS.port+optionsSOACS.path+ "options object: "+JSON.stringify(optionsSOACS));

  console.log('forward host and port  '+optionsSOACS.targetServer+":"+optionsSOACS.port);
  console.log('forward path '+optionsSOACS.path);
  var req = http.request(optionsSOACS	, function(res) {
   //response is in
   
   console.log("** on response");
   response.writeHead(res.statusCode, res.headers);
  
  res.on('data', function(d) {
    console.log("on receive data");
    process.stdout.write(d);
	data=data+d;
    console.log("data = "+data);
	// replace references to SOA CS machine with references to proxy service
	data = data.replace(soacsTargetServer+":8080/soa-infra",proxyServerIP+"/soacs/soa-infra");
  });//data

  res.on('end', function() {
    console.log("end receive data");
    console.log('data = '+ data);
	
	console.log("write head");
    response.end(data);
	console.log("done response: "+data);
  });//end
  
}//req
);
console.log('req end');
req.end();
} //handleSOACS
	

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
var optionsC = {
  host: icsTargetServer,
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

function handleArtists(req, res) {

  var spotifyAPI ='https://api.spotify.com/v1';
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;
  addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle Artist Enrichment request for "+ query.artist+" directly to spotify , forwarded to "+spotifyAPI + '/search?q='+encodeURI(query.artist)+'&type=artist');
 
  request(spotifyAPI + '/search?q='+encodeURI(query.artist)+'&type=artist', function (error, response, body) {
      console.log("Spotify "+JSON.stringify(response));  
    if (!error && response.statusCode == 200) {
console.log("no error from spotify");
      var artistsResponse = JSON.parse(body);
      var artist ={};
	  // if the artist has not been found, return immediately
	  
	  if (artistsResponse.artists.total==0) {
        console.log("no artists were found for the quert string "+query.artist);
        artist.spotifyId ="-1";  
        artist.found = "false";
        artist.name= query.artist;  
        res.set( {'Content-Type': 'application/json'});
        res.status(response.statusCode); //
        res.send(JSON.stringify(artist));
        res.end();
 
		return;
	  }
      artist.spotifyId = artistsResponse.artists.items[0].id;
      artist.name = artistsResponse.artists.items[0].name;
      artist.genres = JSON.stringify(artistsResponse.artists.items[0].genres);
	  if (artistsResponse.artists.items[0].images.length>0) {
        artist.imageURL = artistsResponse.artists.items[0].images[0].url;
      }
      artist.spottiyHRef = artistsResponse.artists.items[0].href;
      /* now get discography 
	  https://api.spotify.com/v1/artists/3WrFJ7ztbogyGnTHbHJFl2/albums?limit=50&album_type=album
	  
	  */
	  var albumsURL = spotifyAPI + '/artists/'+artist.spotifyId+'/albums'+'?limit=50&album_type=album';
	  artist.albums=[];
      request(albumsURL, function (error, response, body) {  	  
         var albumsResponse = JSON.parse(body);
		 for (var i = 0; i < albumsResponse.items.length; i++) {
           var album = {};
		   album.title = albumsResponse.items[i].name;
		   if (albumsResponse.items[i].images.length > 0) {
		     album.imageURL = albumsResponse.items[i].images[0].url;
		   }
		   artist.albums.push(album);
         };// for loop over albums
		 /*  NOTE: I can use https://api.spotify.com/v1/albums/?ids=41MnTivkwTO3UUJ8DrqEJJ,6JWc4iAiJ9FjyK0B59ABb4,6UXCm6bOO4gFlDQZV5yL37
		           to retrieve details for 20 albums at a time - including release date and tracks.  (see https://developer.spotify.com/web-api/get-several-albums/) 
				   */
		 console.log("done getting albums");
					   res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
              res.statusCode =200;
                          res.send(JSON.stringify(artist));
         
         
         
         /*
		 var echoNestAPI = "http://developer.echonest.com/api/v4";
		 var echoNestDeveloperKey = "0B3N8LMO4XG3BXPSY";
		 var searchURL = echoNestAPI+ "/artist/search";
		 var biographiesURL = echoNestAPI+ "/artist/biographies";
		 console.log("go invoke echonest API");
         request(searchURL + '?api_key='+echoNestDeveloperKey+'&format=json&name='+encodeURI(query.artist)+'&results=1', function (error, response, body) {
             		 console.log("done Echonest"+error +" status "+ response.statusCode);
  
            if (!error && response.statusCode == 200) {
                	 console.log("done Echonest"+body);
  
                var echonestSearchResponse = JSON.parse(body);
                var echonestArtistId = echonestSearchResponse.response.artists[0].id;
				artist.echonestArtistId = echonestArtistId;
				// with id under our belt, time to get the biography
				var bioURL = biographiesURL + '?api_key='+echoNestDeveloperKey+"&id="+echonestArtistId
				                                    +'&format=json&results=1&start=0&license=cc-by-sa';
         		request(bioURL
					  , function (error, response, body) {  
                          if (!error && response.statusCode == 200) {
                          var echonestBioSearchResponse = JSON.parse(body);
                          if (echonestBioSearchResponse.response.biographies[0]) {
                            var bio = echonestBioSearchResponse.response.biographies[0].text;
      					    artist.biography = bio;
                          }
					   res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
              res.statusCode =200;
                          res.send(JSON.stringify(artist));

						  }//if
						  else {
						  console.log('error '+error+" status "+response.statusCode );
						  }
						}
				);// request bioURL
		 
//		 /artist/biographies?api_key=0B3N8LMO4XG3BXPSY&id=ARH6W4X1187B99274F&format=json&results=1&start=0&license=cc-by-sa
		  retrieve biography 
		 API KEY = 0B3N8LMO4XG3BXPSY
		 
		 http://developer.echonest.com/docs/v4/artist.html#biographies
		 find artist:
		 
		 http://developer.echonest.com/api/v4/artist/search?api_key=0B3N8LMO4XG3BXPSY&format=json&name=radiohead&results=1
		 id = response.artists[0].id
		 
		 http://developer.echonest.com/api/v4/artist/biographies?api_key=0B3N8LMO4XG3BXPSY&id=ARH6W4X1187B99274F&format=json&results=1&start=0&license=cc-by-sa
		 
		 http://developer.echonest.com/api/v4/artist/biographies?api_key=0B3N8LMO4XG3BXPSY&id=AR6XZ861187FB4CECD&format=json&name=&results=1&start=0&license=cc-by-sa
		 bio  = response.biographies[0].text (note: attribute url refers to original publication
		 
		 find news about artist:
		 
		 http://developer.echonest.com/api/v4/artist/news?api_key=0B3N8LMO4XG3BXPSY&id=spotify:artist:5l8VQNuIg0turYE1VtM9zV&format=json
		 or
		 http://developer.echonest.com/api/v4/artist/news?api_key=0B3N8LMO4XG3BXPSY&id=AR6XZ861187FB4CECD&format=json
		 
		 
		 
		 
		 
		 
		 
		 
		 
		 
		 }}
		 );// request echonest search
         */
        
      }); // handle response from albums
	}
})
  
  var data="";
  // copy the URL path after /hrm to the destination path
  options.path = req.path.substring(7);
  console.log('forward path '+options.path);
/*

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
  });//on end
  
  }//req
);//var req
console.log('req end');
req.end();
*/
} //handleArtists

function addToLogFile( logEntry) {
  utils.addToLogFile(logEntry);    
}
