var https = require('https'),
    http = require('http'),
    fs = require('fs'),
    //httpProxy = require('http-proxy'),
    url = require('url'),
    request = require('request'),
    qs = require('querystring'),
    bodyParser = require('body-parser'),
    dateFormat = require('dateformat');

var utils = require("./proxy-utils.js");
var settings = require("./proxy-settings.js");

var apiURL = "/apicsProxy";
var moduleName = "accs.apicsProxy";

var APICS_ENDPOINT = "http://129.144.150.67:8001";


var apicsProxy = module.exports;


apicsProxy.handleAPICS = function (req, res) {
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;

    //"path":"/apicsProxy/OfmAcedemoActsApi
    var path = url_parts.path.substring(11);

    console.log('body in request' + JSON.stringify(req.body));
    addToLogFile("\n[" + dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT") + "] APICS, forward to " + APICS_ENDPOINT + path + "....");
    addToLogFile("\n[" + dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT") + "] raw URL: " + JSON.stringify(url_parts) + "path=" + path);
    
    var options = { method: 'GET',
     url: APICS_ENDPOINT +  path,
     qs:  url_parts.query,
  headers: 
   { 'cache-control': 'no-cache',
     authorization: 'Basic d2VibG9naWM6MVBhYVM1cGwxdA==',
     accept: 'application/json',
     'tenant-id': 'OFM2017',
     'api-key': 'd4e79807-532e-46e0-ae07-b7114228b1bc' } };



    addToLogFile("\n[" + dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT") + "] Options for request: " + JSON.stringify(options) + "; path=" + path);


    request(options, function (error, response, body) {
        if (error) {
            console.log(moduleName + "- Error in processing API Platform message " + JSON.stringify(error));
            throw new Error(error);
        }
        console.log(moduleName + " Forwarded API Platform: status= " + response.statusCode);
        console.log(moduleName + "received response = " + body);
        res.statusCode = response.statusCode;
        res.setHeader('Content-Type', 'application/json');
        res.send(body);

    });
}


function addToLogFile(logEntry) {
    utils.addToLogFile('*** Module: apics-proxy :' + logEntry);
}

console.log(moduleName + " initialized at " + apiURL + " running against APICS Endpoint " + APICS_ENDPOINT);
