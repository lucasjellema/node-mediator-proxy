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

var APICS_ENDPOINT = "129.144.150.67:8001";


var apicsProxy = module.exports;


apicsProxy.handleAPICS = function (req, res) {
     var url_parts = url.parse(req.url, true);
      var query = url_parts.query;

    
    console.log('body in request' + JSON.stringify(req.body));
    addToLogFile("\n[" + dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT") + "] APICS, forward to " +APICS_ENDPOINT+"....");
    addToLogFile("\n[" + dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT") + "] raw URL: " + JSON.stringify(url_parts));
    var iotmessage = req.body[0];
    addToLogFile("\n[" + dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT") + "] IoTCS dropoff 1st message from IoTCS: " + JSON.stringify(iotmessage));
    var options = {
        method: 'POST',
        url: APICS_ENDPOINT
        ,
        headers:
        {
            'cache-control': 'no-cache',
            'Accept': 'application/json',
            'api-key':'d4e79807-532e-46e0-ae07-b7114228b1bc',
'tenant-id':'OFM2017',
'Authorization':'Basic d2VibG9naWM6MVBhYVM1cGwxdA=='



        }
    };

    request(options, function (error, response, body) {
        if (error) {
            console.log(moduleName + "- Error in processing IoT Dropoff message " + JSON.stringify(error));
            throw new Error(error);
        }
        console.log(moduleName + " Forwarded IoT Dropoff Message to ICS: status= " + response.statusCode);
                        res.statusCode = response.statusCode;
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({ "status": "message was sent to ICS", "statusCode": response.statusCode }));

    });
}


function addToLogFile(logEntry) {
    utils.addToLogFile('*** Module: apics-proxy :' + logEntry);
}

console.log(moduleName + " initialized at " + apiURL + " running against ICS Endpoint " + ICS_ENDPOINT);
