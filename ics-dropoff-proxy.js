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

var apiURL = "/icsProxy";
var moduleName = "accs.icsProxy";

var ICS_ENDPOINT = "https://ics4emeapartner-partnercloud17.integration.us2.oraclecloud.com/integration/flowapi/rest";
var RESOURCE_IOTCS_DROPOFF = "ACEDEMO_IOTCSDROPO_INTEGRATIO/v01/act";

var ICS_IOTCS_DROPOFF_ENDPOINT = ICS_ENDPOINT + '/' + RESOURCE_IOTCS_DROPOFF;

var icsDropoffProxy = module.exports;


icsDropoffProxy.handleIoT = function (req, res) {
    console.log('body in request' + JSON.stringify(req.body));
    addToLogFile("\n[" + dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT") + "] Handle IoTCS dropoff to ICS, forwarded to " + ICS_IOTCS_DROPOFF_ENDPOINT+"....");
    addToLogFile("\n[" + dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT") + "] raw body: " + JSON.stringify(req.body));
    var iotmessage = req.body;
    if (req.body[0]) {
        iotmessage = req.body[0];
    }
    addToLogFile("\n[" + dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT") + "] IoTCS dropoff 1st message from IoTCS: " + JSON.stringify(iotmessage));
    var options = {
        method: 'POST',
        url: ICS_IOTCS_DROPOFF_ENDPOINT
        ,
        headers:
        {
            'cache-control': 'no-cache',
            authorization: 'Basic c3Zlbi5iZXJuaGFyZHRAb3BpdHotY29uc3VsdGluZy5jb206JHYzTjMzODFf',
            'content-type': 'application/json'
        },
        body:
        {
            id: iotmessage.id,
            source: iotmessage.source,
            sentTime: iotmessage.sentTime,
            eventTime: iotmessage.eventTime,
            payload: {
                data: {
                              max_of_data_artistname: iotmessage.payload.data.data_artistname
                            , count_of_data_artistname: iotmessage.payload.data.count_of_data_artistname_15
                }
            }
        },
        json: true
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
    utils.addToLogFile('*** Module: ics-dropoff-proxy :' + logEntry);
}

console.log(moduleName + " initialized at " + apiURL + " running against ICS Endpoint " + ICS_ENDPOINT);
