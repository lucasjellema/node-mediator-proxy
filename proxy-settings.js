var logFile = 'mediator-proxy.txt';

var settings = module.exports;
settings.PORT= 80;  // Note: 5100 for running locally, 80 for running in the cloud

settings.icsUsername= 'gse_cloud-admin@oracleads.com';
settings.icsPassword = 'blOody@4PiLl';
settings.pcsUsername= 'cloud.admin';
settings.pcsPassword = 'preservedPoundage=4';


settings.icsTargetServer = "icsdem0058service-icsdem0058.integration.us2.oraclecloud.com";
settings.pcsTargetServer = "pcs1-gse00000196.process.us2.oraclecloud.com"; // identity domain gse00000196 
settings.soacsTargetServer = "140.86.4.95";

