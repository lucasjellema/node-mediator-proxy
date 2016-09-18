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

var pcsUsername= settings.pcsUsername;
var pcsPassword = settings.pcsPassword;
var pcsTargetServer = settings.pcsTargetServer;
var proxyServerIP = settings.proxyServerIP;


var pcsProxy = module.exports;
/* deal with (REST and SOAP) calls to ICS */


/* deal with (WSDL get requests to PCS */
pcsProxy.handlePCSGet = function (req, res) {

 var targetPath = req.url.substring(4); // anything after /pcs
 var targetPort=443;

 console.log('PCS request '+ req.method);
 var targetUrl = "https://"+pcsTargetServer+":"+targetPort+targetPath;
 console.log('forward path '+targetUrl);

 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle PCS REST "+req.method+" Request to "+targetUrl);
 addToLogFile( "\nBody:\n"+JSON.stringify(req.body)+ "\n ");
 
 var route_options ={};
 var url_parts = url.parse(req.url, true);
 var query = url_parts.query;
 var isWsdlRequest = false;
 if (query.hasOwnProperty('wsdl') || query.hasOwnProperty('WSDL')) {
   console.log("Request a WSDL document");
    isWsdlRequest = true;
 }
 
 // delete route_options.protocol;
 route_options.method = req.method;
 route_options.uri = targetUrl;
 route_options.json = req.body;
  if (isWsdlRequest) {
    request(route_options, function (error, response, body) {
        console.log('response is in '+JSON.stringify(body));
    if (!error && response.statusCode == 200) {
        
	  // replace all endpoint references in WSDL document to ICS with references to proxy:
      // oracleprocessctrial0533-deoracleem99369.process.us2.oraclecloud.com
      var data = body.replace(/https\:\/\/oracleprocessctrial0533\-deoracleem99369\.process.us2\.oraclecloud\.com\:443/g,"http://"+proxyServerIP+"/pcs");
      res.writeHead(response.statusCode, response.headers);
      res.end(data);
	}
    if (error) {
        console.error(JSON.stringify(error));
    }
  });//request
 } 
 } //handlePCSGet

 
/* deal with SOAP calls to PCS */
pcsProxy.handlePCSPost = function (req, res) {
  if (req.url.indexOf('/pcs/rest/')> -1 ) { 
//  if (req.url.startsWith("/pcs/rest")) {
    pcsProxy.handlePCSRestPost(req, res);
    return;
  }

 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle PCS POST "+req.method+" Request to "+req.url);
 addToLogFile( "\nBody:\n"+req.body+ "\n ");

 // turn SOAP Envelope to JSON object
 xml2js.parseString(req.body
 , function (err, result) {
    addToLogFile( "\n JSON Result of parsing HTTP BODY:\n"+JSON.stringify(result)+ "\n ");

	var soapNSPrefix = utils.searchKeyWithValue( result, "http://schemas.xmlsoap.org/soap/envelope/" ).substring(6);
	console.log('PCS POST soapNSPrefix'+soapNSPrefix);
	var body = result[soapNSPrefix+':Envelope'][soapNSPrefix+':Body'];
    addToLogFile( "\nSoap Body :\n"+JSON.stringify(body)+ "\n ");
	console.log("body part 0 "+JSON.stringify(body[0]));
	   
	// test for TakeThree namespace   
	if ( JSON.stringify(result).indexOf("http://xmlns.oracle.com/bpmn/bpmnCloudProcess/TakeThree/KickOffApproval") > -1 ){
	  var acedXMLNSPrefix = utils.searchKeyWithValue( body[0], "http://xmlns.oracle.com/bpmn/bpmnCloudProcess/TakeThree/KickOffApproval" );
	  console.log('acedXMLNSPrefix'+acedXMLNSPrefix);
	  if (!acedXMLNSPrefix) {
	    acedXMLNSPrefix = utils.searchKeyWithValue( result, "http://xmlns.oracle.com/bpmn/bpmnCloudProcess/TakeThree/KickOffApproval" );
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
	    var artistName = r[0]['name']+"";
		artistName = artistName.replace(/_/g," ");
        var actProposal = { name:  artistName
                      , voteCount :  r[0]['voteCount']
                      };
	    console.log('actproposal after _ replace : '+JSON.stringify(actProposal));

	    // create a JavaScript proxy-client for the WebService at the specified URL (in PCS)				  
	    // TODO replace with endpoint for the PCS process WSDL
	    var urlWSDL = 'https://'+ pcsTargetServer+ ':443/soa-infra/services/default/TakeThree!1*soa_8a16e235-9036-4d22-bc36-f5a32c2b496e/KickOffApproval.service?wsdl';
        soap.createClient(urlWSDL, function(err, client) {		
	  if (err) {
         addToLogFile("Error in handling PCS call "+JSON.stringify(err)); 
      } else {
       try {   
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
      catch(err) {
         addToLogFile("Error in handling PCS call "+JSON.stringify(err));     
      }// catch 
      }// try
      } //else
      );//createClient
     }// if 	start
   }// if TakeThree namespace 

	   
	// test for ArtistProposalProcess/SubmitActProposal namespace  
    // http://xmlns.oracle.com/bpmn/bpmnCloudProcess/ArtistProposalProcess/SubmitActProposal 
	if ( JSON.stringify(result).indexOf("http://xmlns.oracle.com/bpmn/bpmnCloudProcess/ArtistProposalProcess/SubmitActProposal") > -1 ){
	  var acedXMLNSPrefix = utils.searchKeyWithValue( body[0], "http://xmlns.oracle.com/bpmn/bpmnCloudProcess/ArtistProposalProcess/SubmitActProposal" );
	  console.log('acedXMLNSPrefix'+acedXMLNSPrefix);
	  if (!acedXMLNSPrefix) {
	    acedXMLNSPrefix = utils.searchKeyWithValue( result, "http://xmlns.oracle.com/bpmn/bpmnCloudProcess/ArtistProposalProcess/SubmitActProposal" );
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
	  
	    var artistName = r[0]['name']+"";
		artistName = artistName.replace(/_/g," ");
        var actProposal = { name:  artistName
                      , voteCount :  r[0]['voteCount']
                      };
	    console.log('actproposal after _ replacement : '+JSON.stringify(actProposal));

	    // create a JavaScript proxy-client for the WebService at the specified URL (in PCS)				  
	    // TODO: replace with proper PCS process instance endpoint
        //https://oracleprocessctrial0533-deoracleem99369.process.us2.oraclecloud.com/soa-infra/services/default/ArtistProposalProcess!1.0*soa_f616f6ed-6b1d-4268-82d4-1beb76618fb1/SubmitActProposal.service?wsdl
	    var urlWSDL = 'https://'+ pcsTargetServer+'/soa-infra/services/default/ArtistProposalProcess!1.0*soa_f616f6ed-6b1d-4268-82d4-1beb76618fb1/SubmitActProposal.service?wsdl';
        soap.createClient(urlWSDL, function(err, client) {		
	  if (err) {
         addToLogFile("Error in handling PCS call "+JSON.stringify(err)); 
      } else {
          
       try {   
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
      catch(err) {
         addToLogFile("Error in handling PCS call "+JSON.stringify(err));     
      }// catch 
      }// try
      } //else
      );//createClient
     }// if 	start
   }// if ArtistProposalProcess/SubmitActProposal namespace  

   
  });//xml2js

} //handlePCSPost
 
/* make a SOAP call to PCS based on a REST request and return a REST response, no matter how meaningless*/
pcsProxy.handlePCSRestPost = function (req, res) {

 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle PCS REST POST and turn into one way SOAP Call"+req.method+" Request to "+req.url);
 addToLogFile( "\nBody:\n"+JSON.stringify(req.body)+ "\n ");

	    var artistName = req.body.artistProposal.artistName+"";
		artistName = artistName.replace(/_/g," ");
 
    var actProposal = { name:  artistName
                      , voteCount :  req.body.artistProposal.numberOfVotes
                      };
	console.log('actproposal : '+JSON.stringify(actProposal));

					  // create a JavaScript proxy-client for the WebService at the specified URL (in ICS)				  
	 var urlWSDL = 'https://'+ pcsTargetServer+ '/soa-infra/services/default/ArtistProposalProcess!1.0*soa_f616f6ed-6b1d-4268-82d4-1beb76618fb1/SubmitActProposal.service?wsdl';
 
 
    soap.createClient(urlWSDL, function(err, client) {		
	  if (err) {
         addToLogFile("Error in handling PCS call "+JSON.stringify(err)); 
      } else {
          
       try {   
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
      catch(err) {
         addToLogFile("Error in handling PCS call "+JSON.stringify(err));     
      }// catch 
      }// try
      } //else
    );//createClient
   
} //handlePCSRestPost
 

/* make a SOAP call to PCS based on a REST request and return a REST response, no matter how meaningless*/
pcsProxy.handlePCSRestPosthandlePCSRestPostTakeThree = function (req, res) {

 addToLogFile( "\n["+dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT")+"] Handle PCS REST POST and turn into one way SOAP Call"+req.method+" Request to "+req.url);
 addToLogFile( "\nBody:\n"+JSON.stringify(req.body)+ "\n ");
 
    var actProposal = { name:  req.body.artistProposal.artistName.replace(/_/g," ")
                      , voteCount :  req.body.artistProposal.numberOfVotes
                      };
	console.log('handlePCSRestPosthandlePCSRestPostTakeThree:  actproposal : '+JSON.stringify(actProposal));

					  // create a JavaScript proxy-client for the WebService at the specified URL (in ICS)				  
	 var urlWSDL = 'https://'+ pcsTargetServer+':443/soa-infra/services/default/TakeThree!1*soa_8a16e235-9036-4d22-bc36-f5a32c2b496e/KickOffApproval.service?wsdl';
    soap.createClient(urlWSDL, function(err, client) {		
	  if (err) {
         addToLogFile("Error in handling PCS call "+JSON.stringify(err)); 
      } else {
          
       try {   
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
      catch(err) {
         addToLogFile("Error in handling PCS call "+JSON.stringify(err));     
      } 

    }
      }
          );//createClient
   
} //handlePCSRestPostTakeThree
  


function addToLogFile( logEntry) {
  utils.addToLogFile('ics-proxy-'+logEntry);    
}