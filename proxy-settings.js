
var settings = module.exports;
settings.PORT= 80;  // Note: 5100 for running locally, 80 for running in the cloud
//settings.PORT= 5100;  // Note: 5100 for running locally, 80 for running in the cloud

settings.logFile = 'mediator-proxy.txt';


settings.proxyServerIP = "104.155.85.98"; // cloud
//settings.proxyServerIP = "127.0.0.1:5100";  // local

settings.icsUsername= 'gse_cloud-admin@oracleads.com';
settings.icsPassword = 'blOody@4PiLl';
settings.pcsUsername= 'cloud.admin';
    settings.pcsPassword = 'preservedPoundage=4';


settings.icsTargetServer = "icsdem0058service-icsdem0058.integration.us2.oraclecloud.com";
settings.pcsTargetServer = "pcs1-gse00000196.process.us2.oraclecloud.com"; // identity domain gse00000196 
settings.soacsTargetServer = "140.86.4.95";


settings.mcsServer = "mobileportalsetrial0004dev-mcsdem0004.mobileenv.us2.oraclecloud.com";