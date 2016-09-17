
var settings = module.exports;

var local = false;
//local settings
if (local) {
  settings.PORT= 5100;  // Note: 5100 for running locally, 80 for running in the cloud
  settings.proxyServerIP = "127.0.0.1:5100";  // local
}

// Google App Engine
if (!local) {
  settings.PORT= 80;  // Note: 5100 for running locally, 80 for running in the cloud
  settings.proxyServerIP = "104.155.49.139"; // cloud
}


settings.logFile = 'mediator-proxy.txt';


settings.icsUsername= 'soaring';
settings.icsPassword = 'Ooow2016';
settings.pcsUsername= 'soaring';
settings.pcsPassword = 'Ooow2016';

settings.icsTargetServer = "integrationtrial6950-deoracleem99369.integration.us2.oraclecloud.com";
//old: june 2016: settings.icsTargetServer = "icsdem0058service-icsdem0058.integration.us2.oraclecloud.com";
settings.pcsTargetServer = "pcs1-gse00000196.process.us2.oraclecloud.com"; // identity domain gse00000196 
settings.soacsTargetServer = "140.86.4.95";


settings.mcsServer = "mobileportalsetrial0004dev-mcsdem0004.mobileenv.us2.oraclecloud.com";