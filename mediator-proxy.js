

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
/* docs:
https://nodejs.org/api/https.html
https://nodejs.org/api/http.html

https://github.com/request/request

*/	
	
var express = require('express');
var app = express();

var logFile = 'mediator-proxy.txt';
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
var PORT =80;
//var PORT =5100;

var proxyServerIP = "104.155.85.98";

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

    var readStream = fs.createReadStream(logFile);
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
app.use(bodyParser.text({ type: 'text/xml' }))
app.post('/ics/*', function(req,res){ handleICSPost(req, res);} );
app.get('/ics/*', function(req,res){ handleICS(req, res);} );
app.get('/pcs/*', function(req,res){ handlePCSGet(req, res);} );
app.post('/pcs/*', function(req,res){ handlePCSPost(req, res);} );

app.all('/mcs/*', function(req,res){ handleMCS(req, res);} );

//app.get('/artists/*', function(req,res){ handleArtists(req, res);} );
app.get('/artists/*', function(req,res){ handleArtistsAPI(req, res);} );


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

 var route_options ={};
 route_options.method = req.method;
 route_options.uri = targetUrl;
 route_options.json = req.body;
 var route_request = request(route_options);
 req.pipe(route_request).pipe(res);

 } //handleArtistsAPI


/* deal with (WSDL get requests to PCS */
function handlePCSGet(req, res) {

 var targetServer = "pcs-gse00000225.process.us2.oraclecloud.com";
 var targetPath = req.url.substring(4); // anything after /pcs
 var targetPort=443;

 console.log('PCS request '+ req.method);
 var targetUrl = "https://"+targetServer+":"+targetPort+targetPath;
 console.log('forward path '+targetUrl);

 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle PCS REST "+req.method+" Request to "+targetUrl);
 addToLogFile( "\nBody:\n"+JSON.stringify(req.body)+ "\n ");
 
 var route_options ={};
 var url_parts = url.parse(req.url, true);
 var query = url_parts.query;
 var isWsdlRequest = false;
 if (query.hasOwnProperty('wsdl')) {
   console.log("Request a WSDL document");
    isWsdlRequest = true;
 }
 
 // delete route_options.protocol;
 route_options.method = req.method;
 route_options.uri = targetUrl;
 route_options.json = req.body;
/* route_options.auth = {
                        'user': icsUsername,
                        'pass': icsPassword,
                        'sendImmediately': false
                      };
*/
  if (isWsdlRequest) {
    request(route_options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
	  // replace all endpoint references in WSDL document to ICS with references to proxy:
      var data = body.replace(/https\:\/\/pcs\-gse00000225\.process.us2\.oraclecloud\.com\:443/g,"http://"+proxyServerIP+"/pcs");
      res.writeHead(response.statusCode, response.headers);
      res.end(data);
	}
  });//request
 } 
 } //handlePCSGet

 
/* deal with SOAP calls to PCS */
function handlePCSPost(req, res) {
  if (req.url.indexOf('/pcs/rest/')> -1 ) { 
//  if (req.url.startsWith("/pcs/rest")) {
    handlePCSRestPost(req, res);
    return;
  }
 var targetServer = "pcs-gse00000225.process.us2.oraclecloud.com";
  /*https://pcs-gse00000225.process.us2.oraclecloud.com:443/soa-infra/services/default/TakeThree!1*soa_8a16e235-9036-4d22-bc36-f5a32c2b496e/KickOffApproval.service?wsdl
  */
 var pcsUsername= 'cloud.admin';
 var pcsPassword = 'gLvHRTttU_7A';

 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle PCS POST "+req.method+" Request to "+req.url);
 addToLogFile( "\nBody:\n"+req.body+ "\n ");

 // turn SOAP Envelope to JSON object
 xml2js.parseString(req.body
 , function (err, result) {
    addToLogFile( "\n JSON Result of parsing HTTP BODY:\n"+JSON.stringify(result)+ "\n ");

	var soapNSPrefix = searchKeyWithValue( result, "http://schemas.xmlsoap.org/soap/envelope/" ).substring(6);
	console.log('soapNSPrefix'+soapNSPrefix);
	var body = result[soapNSPrefix+':Envelope'][soapNSPrefix+':Body'];
    addToLogFile( "\nSoap Body :\n"+JSON.stringify(body)+ "\n ");
	console.log("body part 0 "+JSON.stringify(body[0]));
	   
	// test for TakeThree namespace   
	if ( JSON.stringify(result).indexOf("http://xmlns.oracle.com/bpmn/bpmnCloudProcess/TakeThree/KickOffApproval") > -1 ){
	  var acedXMLNSPrefix = searchKeyWithValue( body[0], "http://xmlns.oracle.com/bpmn/bpmnCloudProcess/TakeThree/KickOffApproval" );
	  console.log('acedXMLNSPrefix'+acedXMLNSPrefix);
	  if (!acedXMLNSPrefix) {
	    acedXMLNSPrefix = searchKeyWithValue( result, "http://xmlns.oracle.com/bpmn/bpmnCloudProcess/TakeThree/KickOffApproval" );
	    console.log('not found at first - acedXMLNSPrefix'+acedXMLNSPrefix);
   	  }
	  var acedPrefix ="";
	
	  if ("xmlns"===acedXMLNSPrefix) {acedPrefix ="";}
	  else {acedPrefix =acedXMLNSPrefix.substring(6)+":";};	
	  console.log('acedPrefix'+acedPrefix);
	  console.log('acedNSPrefix'+acedPrefix);
      //when parsing is done, interpret the object
	  if (body[0][acedPrefix+'start']) {
   	    var r = body[0][acedPrefix+'start'];	
	    console.log('r : '+JSON.stringify(r));
	  
        var actProposal = { name:  r[0]['name']
                      , voteCount :  r[0]['voteCount']
                      };
	    console.log('actproposal : '+JSON.stringify(actProposal));

	    // create a JavaScript proxy-client for the WebService at the specified URL (in PCS)				  
	    var urlWSDL = 'https://pcs-gse00000225.process.us2.oraclecloud.com:443/soa-infra/services/default/TakeThree!1*soa_8a16e235-9036-4d22-bc36-f5a32c2b496e/KickOffApproval.service?wsdl';
        soap.createClient(urlWSDL, function(err, client) {		
	    // this setting is required for PCS
  	    client.setSecurity(new soap.WSSecurity(pcsUsername, pcsPassword))
        client.start
        ( actProposal
	    , function(err, result, raw, soapHeader) {      
            addToLogFile( "\n => Soap Response for Submit Response Body :\n"+raw+ "\n ");
			res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(raw);
          }// callback on response from SOAP WebService
        );
      }
      );//createClient
     }// if 	start
   }// if TakeThree namespace 

	   
	// test for ArtistProposalProcess/SubmitActProposal namespace   
	if ( JSON.stringify(result).indexOf("http://xmlns.oracle.com/bpmn/bpmnCloudProcess/ArtistProposalProcess/SubmitActProposal") > -1 ){
	  var acedXMLNSPrefix = searchKeyWithValue( body[0], "http://xmlns.oracle.com/bpmn/bpmnCloudProcess/ArtistProposalProcess/SubmitActProposal" );
	  console.log('acedXMLNSPrefix'+acedXMLNSPrefix);
	  if (!acedXMLNSPrefix) {
	    acedXMLNSPrefix = searchKeyWithValue( result, "http://xmlns.oracle.com/bpmn/bpmnCloudProcess/ArtistProposalProcess/SubmitActProposal" );
	    console.log('not found at first - acedXMLNSPrefix'+acedXMLNSPrefix);
   	  }
	  var acedPrefix ="";
	
	  if ("xmlns"===acedXMLNSPrefix) {acedPrefix ="";}
	  else {acedPrefix =acedXMLNSPrefix.substring(6)+":";};	
	  console.log('acedPrefix'+acedPrefix);
	  console.log('acedNSPrefix'+acedPrefix);
      //when parsing is done, interpret the object
	  if (body[0][acedPrefix+'start']) {
   	    var r = body[0][acedPrefix+'start'];	
	    console.log('r : '+JSON.stringify(r));
	  
        var actProposal = { name:  r[0]['name']
                      , voteCount :  r[0]['voteCount']
                      };
	    console.log('actproposal : '+JSON.stringify(actProposal));

	    // create a JavaScript proxy-client for the WebService at the specified URL (in PCS)				  
	    var urlWSDL = 'https://pcs-gse00000225.process.us2.oraclecloud.com/soa-infra/services/default/ArtistProposalProcess!1.0*soa_68f55698-0293-4386-b2f6-aa6ee69b497f/SubmitActProposal.service?WSDL';
        soap.createClient(urlWSDL, function(err, client) {		
	    // this setting is required for PCS
  	    client.setSecurity(new soap.WSSecurity(pcsUsername, pcsPassword))
        client.start
        ( actProposal
	    , function(err, result, raw, soapHeader) {      
            addToLogFile( "\n => Soap Response for Submit Response Body :\n"+raw+ "\n ");
			res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(raw);
          }// callback on response from SOAP WebService
        );
      }
      );//createClient
     }// if 	start
   }// if ArtistProposalProcess/SubmitActProposal namespace  

   
  });//xml2js

} //handlePCSPost
 
/* make a SOAP call to PCS based on a REST request and return a REST response, no matter how meaningless*/
function handlePCSRestPost(req, res) {
 var targetServer = "pcs-gse00000225.process.us2.oraclecloud.com";
 var pcsUsername= 'cloud.admin';
 var pcsPassword = 'gLvHRTttU_7A';

 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle PCS REST POST and turn into one way SOAP Call"+req.method+" Request to "+req.url);
 addToLogFile( "\nBody:\n"+JSON.stringify(req.body)+ "\n ");
 
    var actProposal = { name:  req.body.artistProposal.artistName
                      , voteCount :  req.body.artistProposal.numberOfVotes
                      };
	console.log('actproposal : '+JSON.stringify(actProposal));

					  // create a JavaScript proxy-client for the WebService at the specified URL (in ICS)				  
	 var urlWSDL = 'https://pcs-gse00000225.process.us2.oraclecloud.com/soa-infra/services/default/ArtistProposalProcess!1.0*soa_68f55698-0293-4386-b2f6-aa6ee69b497f/SubmitActProposal.service?WSDL';
    soap.createClient(urlWSDL, function(err, client) {		
	  // this setting is required for ICS
	  client.setSecurity(new soap.WSSecurity(pcsUsername, pcsPassword))
      client.start
      ( actProposal
	  , function(err, result, raw, soapHeader) {      
			res.writeHead(200, {'Content-Type': 'application/json'});
			var response = {"artistProposalSubmissionResult" : { "status" : "OK, I guess for "+ actProposal.name}};
            res.end(JSON.stringify(response));
        }// callback on response from SOAP WebService
      );//clientStart
    }
    );//createClient
   
} //handlePCSRestPost
 

/* make a SOAP call to PCS based on a REST request and return a REST response, no matter how meaningless*/
function handlePCSRestPosthandlePCSRestPostTakeThree(req, res) {
 var targetServer = "pcs-gse00000225.process.us2.oraclecloud.com";
  /*https://pcs-gse00000225.process.us2.oraclecloud.com:443/soa-infra/services/default/TakeThree!1*soa_8a16e235-9036-4d22-bc36-f5a32c2b496e/KickOffApproval.service?wsdl
  */
 var pcsUsername= 'cloud.admin';
 var pcsPassword = 'gLvHRTttU_7A';

 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle PCS REST POST and turn into one way SOAP Call"+req.method+" Request to "+req.url);
 addToLogFile( "\nBody:\n"+JSON.stringify(req.body)+ "\n ");
 
    var actProposal = { name:  req.body.artistProposal.artistName
                      , voteCount :  req.body.artistProposal.numberOfVotes
                      };
	console.log('actproposal : '+JSON.stringify(actProposal));

					  // create a JavaScript proxy-client for the WebService at the specified URL (in ICS)				  
	 var urlWSDL = 'https://pcs-gse00000225.process.us2.oraclecloud.com:443/soa-infra/services/default/TakeThree!1*soa_8a16e235-9036-4d22-bc36-f5a32c2b496e/KickOffApproval.service?wsdl';
    soap.createClient(urlWSDL, function(err, client) {		
	  // this setting is required for ICS
	  client.setSecurity(new soap.WSSecurity(pcsUsername, pcsPassword))
      client.start
      ( actProposal
	  , function(err, result, raw, soapHeader) {      
			res.writeHead(200, {'Content-Type': 'application/json'});
			var response = {"artistProposalSubmissionResult" : { "status" : "OK, I guess for "+ actProposal.name}};
            res.end(JSON.stringify(response));
        }// callback on response from SOAP WebService
      );//clientStart
    }
    );//createClient
   
} //handlePCSRestPostTakeThree
  
 
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

/* deal with (REST and SOAP) calls to ICS */
function handleICSPost(req, res) {
 if (req.url.indexOf('/rest/')> -1 ) { 
   handleICS(req, res);
 } else 
 {
 var icsUsername= 'gse_cloud-admin@oracleads.com';
 var icsPassword = 'bristlyYear5^';

 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle ICS POST "+req.method+" Request to "+req.url);
 addToLogFile( "\nBody:\n"+req.body+ "\n ");

 // turn SOAP Envelope to JSON object
 xml2js.parseString(req.body
 , function (err, result) {
    addToLogFile( "\n JSON Result of parsing HTTP BODY:\n"+JSON.stringify(result)+ "\n ");

	var soapNSPrefix = searchKeyWithValue( result, "http://schemas.xmlsoap.org/soap/envelope/" ).substring(6);
	console.log('soapNSPrefix'+soapNSPrefix);
	var body = result[soapNSPrefix+':Envelope'][soapNSPrefix+':Body'];
    addToLogFile( "\nSoap Body :\n"+JSON.stringify(body)+ "\n ");
	console.log("body part 0 "+JSON.stringify(body[0]));
	   
	if ( JSON.stringify(body[0]).indexOf("submitActProposalRequestMessage") > -1 ){
	   

	var acedXMLNSPrefix = searchKeyWithValue( body[0], "aced.cloud.demo.ics" );
	console.log('acedXMLNSPrefix'+acedXMLNSPrefix);
	if (!acedXMLNSPrefix) {
	  acedXMLNSPrefix = searchKeyWithValue( result, "aced.cloud.demo.ics" );
	console.log('not found at first - acedXMLNSPrefix'+acedXMLNSPrefix);
	}
	var acedPrefix ="";
	
	if ("xmlns"===acedXMLNSPrefix) {acedPrefix ="";}
	else {acedPrefix =acedXMLNSPrefix.substring(6)+":";};
	
	console.log('acedPrefix'+acedPrefix);


//	var acedNSPrefix = searchKeyWithValue( result, "aced.cloud.demo" ).substring(6);;
	console.log('acedNSPrefix'+acedPrefix);
    //when parsing is done, interpret the object
	if (body[0][acedPrefix+'submitActProposalRequestMessage']) {
   	  var request = body[0][acedPrefix+'submitActProposalRequestMessage'];	
	  
    var actProposal = { artistName: getValue('artistName', acedPrefix, request[0]) 
                      , numberOfVotes :  getValue('numberOfVotes', acedPrefix, request[0])
                      , description: getValue('description', acedPrefix, request[0]) 
                      ,imageURL : getValue('imageURL', acedPrefix, request[0])
                      };
	// create a JavaScript proxy-client for the WebService at the specified URL (in ICS)				  
	 var url = 'https://icsdem0058service-icsdem0058.integration.us2.oraclecloud.com:443/integration/flowsvc/soap/PROPOSENEWACTFOR_SOAP/v01/?wsdl';
    soap.createClient(url, function(err, client) {		
	  // this setting is required for ICS
	  client.setSecurity(new soap.WSSecurity(icsUsername, icsPassword))
      client.submitActProposal
      ( actProposal
	  , function(err, result, raw, soapHeader) {      
            addToLogFile( "\n => Soap Response for Submit Response Body :\n"+raw+ "\n ");
			res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(raw);
        }// callback on response from SOAP WebService
      );
    }
    );//createClient
   }// if 	submitActProposalRequestMessage
   }
	   
	if ( JSON.stringify(body[0]).indexOf("verifyExistenceProposalRequestMessage") > -1) {
	   console.log("verifyExistenceProposalRequestMessage");
    addToLogFile( "\nbody[0]:\n"+JSON.stringify(body[0])+ "\n ");
	var acedXMLNSPrefix = searchKeyWithValue( body[0], "aced.cloud.demo" );
	if (!acedXMLNSPrefix) {
	  acedXMLNSPrefix = searchKeyWithValue( result, "aced.cloud.demo" );
	}
	var acedPrefix ="";
	
	if ("xmlns"===acedXMLNSPrefix) {acedPrefix ="";}
	else {acedPrefix =acedXMLNSPrefix.substring(6)+":";};
	
   if (body[0][acedPrefix+'verifyExistenceProposalRequestMessage']) {

   var request = body[0][acedPrefix+'verifyExistenceProposalRequestMessage'];
   var artistName = getValue('name', acedPrefix, request[0]) ;
/*	var artistName = request[0][acedPrefix+'name'];
	// deal with calls from PCS
	if (artistName[0] && artistName[0]["_"]) {
	  artistName = artistName[0]["_"]
	}
	*/
    var verifyAct = { name: artistName
                      };
    addToLogFile( "\n => Go invoke ICS - Verify Existence - with  :\n"+JSON.stringify(verifyAct)+ "\n ");

	var url = 'https://icsdem0058service-icsdem0058.integration.us2.oraclecloud.com/integration/flowsvc/soap/VERIFYEXISTENCEO_FROMSOACS/v01/?wsdl';

					  // create a JavaScript proxy-client for the WebService at the specified URL (in ICS)				  
    soap.createClient(url, function(err, client) {		
	  // this setting is required for ICS
	  client.setSecurity(new soap.WSSecurity(icsUsername, icsPassword))
      client.verifyExistenceActProposal
      ( verifyAct
	  , function(err, result, raw, soapHeader) {
            addToLogFile( "\n => Soap Response Body :\n"+raw+ "\n ");
			
			res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(raw);
        }// callback on response from SOAP WebService
      );
    }
    );//createClient
   }// if 	verifyExistenceProposalRequestMessage
   };//verifyExistenceProposalRequestMessage
   
});//xml2js
}//else
}// handICSPost


/* deal with (REST and SOAP) calls to ICS */
function handleICS(req, res) {
 var icsUsername= 'gse_cloud-admin@oracleads.com';
 var icsPassword = 'bristlyYear5^';


/*
http://stackoverflow.com/questions/10435407/proxy-with-express-js
*/
 var targetServer = "icsdem0058service-icsdem0058.integration.us2.oraclecloud.com";
  /* 
  https://icsdem0058service-icsdem0058.integration.us2.oraclecloud.com:443/integration/flowsvc/soap/PROPOSENEWACTFOR_SOAP/v01/
  and
  https://icsdem0058service-icsdem0058.integration.us2.oraclecloud.com/integration/flowapi/rest/PROPOSENEWACTFOROOW2016/v01/actproposals
  
  localhost:5100/ics/integration/flowsvc/soap/PROPOSENEWACTFOR_SOAP/v01/?wsdl
  
  */
 var targetPath = req.url.substring(4); // anything after /ics
 var targetPort=443;
 // credentials for ICS
 var icsUsername= 'gse_cloud-admin@oracleads.com';
 var icsPassword = 'bristlyYear5^';
console.log('ICS request '+ req.method);
 var targetUrl = "https://"+targetServer+":"+targetPort+targetPath;
 console.log('forward path '+targetUrl);

 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle ICS REST "+req.method+" Request to "+targetUrl);
 addToLogFile( "\nBody:\n"+JSON.stringify(req.body)+ "\n ");
 
 var route_options ={};
 var url_parts = url.parse(req.url, true);
 var query = url_parts.query;
 var isWsdlRequest = false;
 if (query.hasOwnProperty('wsdl')) {
   console.log("Request a WSDL document");
    isWsdlRequest = true;
 }
 
 // delete route_options.protocol;
 route_options.method = req.method;
 route_options.uri = targetUrl;
 route_options.json = req.body;
 route_options.auth = {
                        'user': icsUsername,
                        'pass': icsPassword,
                        'sendImmediately': false
                      };
 if (isWsdlRequest) {
    request(route_options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
	  // replace endpoint references in WSDL document to ICS with references to proxy:
      var data = body.replace(/https\:\/\/icsdem0058service\-icsdem0058\.integration\.us2\.oraclecloud\.com\:443/g,"http://"+proxyServerIP+"/ics");

      res.writeHead(response.statusCode, response.headers);
      res.end(data);
	}
  });//request
 } 
else {
  var route_request = request(route_options);
  req.pipe(route_request).pipe(res);
} 
 } //handleICS

/* deal with all requests to MCS */
function handleMCS(req, res) {
/*
http://stackoverflow.com/questions/10435407/proxy-with-express-js

https://mobileportalsetrial1304dev-mcsdem0001.mobileenv.us2.oraclecloud.com:443/mobile/custom/artistapi
*/


 var targetServer = "mobileportalsetrial1304dev-mcsdem0001.mobileenv.us2.oraclecloud.com";
 var targetPath = req.url.substring(4);// chop off the mcs/
 var targetPort=443;
 console.log('MCS  forward host and port  '+targetServer+":"+targetPort);
 var targetUrl = "https://"+targetServer+":"+targetPort+targetPath;
 console.log('forward path '+targetUrl);

 
  req.pipe(request(targetUrl)).pipe(res);
 
 } //handleMCS
 
 
/* deal with SOAP calls to SOACS */
function handleSOACSPost(req, res) {
/*
http://stackoverflow.com/questions/10435407/proxy-with-express-js
*/
 var targetServer = "140.86.4.95";
  /* http://140.86.4.95:80/soa-infra/services/aced-cloud-demo/ProposedActsService/ProposedActsService?wsdl */
 var targetPath = req.url.substring(6);
 var targetPort=8080;
 console.log('SOACS POST forward host and port  '+targetServer+":"+targetPort);
 var targetUrl = "http://"+targetServer+":"+targetPort+targetPath;
 console.log('forward path '+targetUrl);
 var route_request = request.post({uri: targetUrl, json: req.body});
 req.pipe(route_request).pipe(res);
} //handleSOACSPost

function handleSOACS(request, response) {

var targetServer = "140.86.4.95";

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
	data = data.replace("140.86.4.95:8080/soa-infra",proxyServerIP+"/soacs/soa-infra");
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

function handleArtists(req, res) {

  var spotifyAPI ='https://api.spotify.com/v1';
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;
  
  request(spotifyAPI + '/search?q='+encodeURI(query.artist)+'&type=artist', function (error, response, body) {  
    if (!error && response.statusCode == 200) {
      var artistsResponse = JSON.parse(body);
      var artist ={};
	  // if the artist has not been found, return immediately
	  
	  if (artistsResponse.artists.total==0) {
	    res.status(200).send(JSON.stringify(artist));
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
		 
		 var echoNestAPI = "http://developer.echonest.com/api/v4";
		 var echoNestDeveloperKey = "0B3N8LMO4XG3BXPSY";
		 var searchURL = echoNestAPI+ "/artist/search";
		 var biographiesURL = echoNestAPI+ "/artist/biographies";
         request(searchURL + '?api_key='+echoNestDeveloperKey+'&format=json&name='+encodeURI(query.artist)+'&results=1', function (error, response, body) {  
            if (!error && response.statusCode == 200) {
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
                          var bio = echonestBioSearchResponse.response.biographies[0].text;
    					  artist.biography = bio;
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
				);// request
		 
//		 /artist/biographies?api_key=0B3N8LMO4XG3BXPSY&id=ARH6W4X1187B99274F&format=json&results=1&start=0&license=cc-by-sa
		 /* retrieve biography 
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
		 
		 
		 
		 
		 
		 */
		 
		 
		 
		 
		 }}
		 );// request echonest search
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
  fs.appendFile(logFile, logEntry, function(err)  {
  if (err) console.log("Error happened while write to log file "+err);
  
});
}