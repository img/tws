/*
 * Licensed Materials - Property of IBM
 * Copyright IBM Corp. 2014.  All Rights Reserved.
 *
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 */
//var http = require("http");
var http = require("http-debug").http;
//var https = require("https");
var https = require("http-debug").https;

http.debug=1;
https.debug=1;
var url = require("url");
var path = require("path");
var fs = require("fs");
var port = process.argv[2] || 8888;

var certsPath = path.join(__dirname, 'certs', 'server')
, caCertsPath = path.join(__dirname, 'certs', 'ca');


//
// SSL Certificates
//
var https_options = {
  key: fs.readFileSync(path.join(certsPath, 'my-server.key.pem'))
, ca: [ fs.readFileSync(path.join(caCertsPath, 'my-root-ca.crt.pem')) ]
, cert: fs.readFileSync(path.join(certsPath, 'my-server.crt.pem'))
, requestCert: false
, rejectUnauthorized: false
};
 
https.createServer(https_options, function(request, response) {
 
    // This function is invoked each time an incoming HTTP request occurs
    var parsedUrl = url.parse(request.url);
    var uri = parsedUrl.pathname;
	var query = parsedUrl.query;
    var filename = path.join(process.cwd(), uri);
    console.log("here" + request.url);
	// Request might be for a simple file, or to invoke the dynamic server
    // We detect the difference by checking if there is a query part in the uri
	// If there is not, it's a simple file fetch from the filesystem
    if(!query){
        path.exists(filename, function(exists) {
		
		    // If the requested file does not exist, return a 404 code
            if(!exists) {
                response.writeHead(404, {"Content-Type": "text/plain"});
                response.write("404 Not Found\n");
                response.end();
                return;
            }
  
            // If the file exists, load the contents and return to caller with suitable Content-Type header			
            fs.readFile(filename, "binary", function(err, file) {
                if(err) {
                    response.writeHead(500, {"Content-Type": "text/plain"});
                    response.write(err + "\n");
                    response.end();
                    return;
                }

                if(filename.indexOf(".xml")>0){				
                    response.writeHead(200, {"Content-Type": "application/xml"});
			    }
				else
                if(filename.indexOf(".css")>0){				
                    response.writeHead(200, {"Content-Type": "text/css"});
			    }
				else
                if(filename.indexOf(".js")>0){				
                    response.writeHead(200, {"Content-Type": "text/javascript"});
			    }
				else{
				    response.writeHead(200, {"Content-Type": "text/plain"});
				}

                response.write(file, "binary");
                response.end();
            });
        });
    }
	else{
        console.log("request from origin: " + JSON.stringify(request.headers));
	    // If we get here there is a Query part in the request URI so we assume the dynamic service is being invoked
		// We expect a query "?artifact=<some uri>" so we pull it apart and get the uri out
		// This is a really simple way to get the uri, it assumes there is only one query parameter
		// and doesn't check that it's called "artifact"
		var resourceUri=query.substring(query.indexOf("=")+1);
		
		// To call back to the initiating RM server, we need to get the SSO token from the incoming cookies
		var cookies = request.headers["cookie"];
        console.log("request from origin cookies: ", cookies);

		// Now, do an HTTP GET on the given resource URI
		// We construct an options object which captures the HTTPS request details
		var parsedResourceUri=url.parse(resourceUri);
		var options = {
            hostname: parsedResourceUri.hostname,
            port: parsedResourceUri.port,
            path: parsedResourceUri.path,
            method: 'GET',
			// This next one ignores broken SSL certificates.
			// Don't do this in production code
			rejectUnauthorized: false
        };
        console.log("making a request to remote service " + JSON.stringify(options));
		
		// We create a new HTTPS request, using the options defined above.
		// Part of this creation is a callback function which is invoked
		// when the response to this request arrives
		var req = https.request(options, function(res) {
            res.setEncoding('utf8');
            
            console.log("response from remote server "+JSON.stringify(res.headers));
			
			// We have special handling for the first chunk of the response
			var firstChunk = true;
			
			// Chunk of incoming response
            res.on('data', function (chunk) {
				if (firstChunk){
				    response.writeHead(200);
					firstChunk = false;
				}
				response.write(chunk);
                console.log("response chunk from remote server "+chunk);

            });
			
			// End of incoming response
			res.on('end', function(){
				response.end();
                console.log("response to origin "+JSON.stringify(response));
			});
        });

		// to set the cookies, we need an array.  "cookies" is a ';' delimited list so we split it
		if (cookies){
            console.log("origin request has cookies:", cookies.split(";"));
	        req.setHeader("cookie", cookies.split(";"));			
		}
		
		// These headers are required for an OSLC request to get a resource from RM
		req.setHeader("OSLC-Core-Version", "2.0");
		req.setHeader("Accept", "application/rdf+xml");
		
		// This executes the request
	    req.end();
	}
}).listen(parseInt(port, 10));
 
console.log("Static file server running at\n => http://localhost:" + port + "/\nCTRL + C to shutdown");