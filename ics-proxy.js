var https = require('https'),
    http = require('http'),
    fs = require('fs'),
    //httpProxy = require('http-proxy'),
	url = require('url'),
	request = require('request'),
	qs = require('querystring'),
	bodyParser = require('body-parser'),
    dateFormat = require('dateformat');

var utils = require( "./proxy-utils.js" );
var settings = require( "./proxy-settings.js" );

var soap = require('soap'); //https://www.npmjs.com/package/soap
var xml2js = require('xml2js'); //https://www.npmjs.com/package/xml2js

var icsUsername= settings.icsUsername;
var icsPassword = settings.icsPassword;


var icsTargetServer = settings.icsTargetServer;

var icsProxy = module.exports;
/* deal with (REST and SOAP) calls to ICS */

icsProxy.handleICSPost = 
function (req, res) {
 if (req.url.indexOf('/rest/')> -1 ) { 
   icsProxy.handleICS(req, res);
 } else 
 {

 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle ICS POST "+req.method+" Request to "+req.url);
 addToLogFile( "\nBody:\n"+req.body+ "\n ");

 // turn SOAP Envelope to JSON object
 xml2js.parseString(req.body
 , function (err, result) {
    addToLogFile( "\n JSON Result of parsing HTTP BODY:\n"+JSON.stringify(result)+ "\n ");

	var soapNSPrefix = utils.searchKeyWithValue( result, "http://schemas.xmlsoap.org/soap/envelope/" ).substring(6);
	console.log('soapNSPrefix'+soapNSPrefix);
	var body = result[soapNSPrefix+':Envelope'][soapNSPrefix+':Body'];
    addToLogFile( "\nSoap Body :\n"+JSON.stringify(body)+ "\n ");
	console.log("body part 0 "+JSON.stringify(body[0]));
	   
	if ( JSON.stringify(body[0]).indexOf("submitActProposalRequestMessage") > -1 ){
	   

	var acedXMLNSPrefix = utils.searchKeyWithValue( body[0], "aced.cloud.demo.ics" );
	console.log('acedXMLNSPrefix'+acedXMLNSPrefix);
	if (!acedXMLNSPrefix) {
	  acedXMLNSPrefix = utils.searchKeyWithValue( result, "aced.cloud.demo.ics" );
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
	  
    var actProposal = { artistName: utils.getValue('artistName', acedPrefix, request[0]) 
                      , numberOfVotes :  utils.getValue('numberOfVotes', acedPrefix, request[0])
                      , description: utils.getValue('description', acedPrefix, request[0]) 
                      ,imageURL : utils.getValue('imageURL', acedPrefix, request[0])
                      };
	// create a JavaScript proxy-client for the WebService at the specified URL (in ICS)				  
	 var url = 'https://'+icsTargetServer+':443/integration/flowsvc/soap/PROPOSENEWACTFOR_SOAP/v01/?wsdl';
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
	var acedXMLNSPrefix = utils.searchKeyWithValue( body[0], "aced.cloud.demo" );
	if (!acedXMLNSPrefix) {
	  acedXMLNSPrefix = utils.searchKeyWithValue( result, "aced.cloud.demo" );
	}
	var acedPrefix ="";
	
	if ("xmlns"===acedXMLNSPrefix) {acedPrefix ="";}
	else {acedPrefix =acedXMLNSPrefix.substring(6)+":";};
	
   if (body[0][acedPrefix+'verifyExistenceProposalRequestMessage']) {

   var request = body[0][acedPrefix+'verifyExistenceProposalRequestMessage'];
   var artistName = utils.getValue('name', acedPrefix, request[0]) ;
/*	var artistName = request[0][acedPrefix+'name'];
	// deal with calls from PCS
	if (artistName[0] && artistName[0]["_"]) {
	  artistName = artistName[0]["_"]
	}
	*/
    var verifyAct = { name: artistName
                      };
    addToLogFile( "\n => Go invoke ICS - Verify Existence - with  :\n"+JSON.stringify(verifyAct)+ "\n ");

	var url = 'https://'+icsTargetServer+'/integration/flowsvc/soap/VERIFYEXISTENCEO_FROMSOACS/v01/?wsdl';

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

icsProxy.handleICS = function (req, res) {
/*
http://stackoverflow.com/questions/10435407/proxy-with-express-js
*/
  /* 
  https://icsdem0058service-icsdem0058.integration.us2.oraclecloud.com:443/integration/flowsvc/soap/PROPOSENEWACTFOR_SOAP/v01/
  and
  https://icsdem0058service-icsdem0058.integration.us2.oraclecloud.com/integration/flowapi/rest/PROPOSENEWACTFOROOW2016/v01/actproposals
  
  localhost:5100/ics/integration/flowsvc/soap/PROPOSENEWACTFOR_SOAP/v01/?wsdl
  
  */
 var targetPath = req.url.substring(4); // anything after /ics
 var targetPort=443;
 // credentials for ICS
console.log('ICS request '+ req.method);
 var targetUrl = "https://"+icsTargetServer+":"+targetPort+targetPath;
 console.log('forward path '+targetUrl);
 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] ICS thingie");
 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle ICS REST "+req.method+" Request to "+targetUrl);
 addToLogFile( "\nBody:\n"+JSON.stringify(req.body)+ "\n ");

// new:  , "payload" :     { "data":  {" data_artistname_2": "talking heads", " count_of_artistname": 48}

// original   , "payload" :     { "data":  {"max_of_data_hashtag": "talking heads", "count_of_data_hashtag": 48}

 if (req.body[0].payload.data[' data_artistname_2']) { req.body[0].payload.data.max_of_data_hashtag = req.body[0].payload.data[' data_artistname_2'];} 
 if (req.body[0].payload.data[' count_of_artistname']) { req.body[0].payload.data.count_of_data_hashtag = req.body[0].payload.data[' count_of_artistname'];} 

 if (req.body[0].payload.data.max_of_data_hashtag) { req.body[0].payload.data.data_artistname_2 = req.body[0].payload.data.max_of_data_hashtag;} 
 if (req.body[0].payload.data.count_of_data_hashtag) { req.body[0].payload.data.count_of_artistname = req.body[0].payload.data.count_of_data_hashtag;}
  
 if (req.body[0].payload.data.data_artistname_2) { req.body[0].payload.data.max_of_data_hashtag = req.body[0].payload.data.data_artistname_2;} 
 if (req.body[0].payload.data.count_of_artistname) { req.body[0].payload.data.count_of_data_hashtag = req.body[0].payload.data.count_of_artistname;} 
 
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
else { /* not a WSDL request*/
    
    request(route_options, function(error, response, body){
    if(error) {
        console.log(error);
    } else {
        console.log(response.statusCode);
        console.log("BODY:"+JSON.stringify(body));
        res.set(  response.headers);
        res.status(response.statusCode); //
        
        res.send(body);
        res.end();
    }
});                      
} 

 } //handleICS



function addToLogFile( logEntry) {
  utils.addToLogFile('ics-proxy-'+logEntry);    
}