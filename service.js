/*
 * Licensed Materials - Property of IBM
 * Copyright IBM Corp. 2014.  All Rights Reserved.
 *
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 */

// On selection event, take the first of the selected items
// and invoke the TrivialWebService on it
function handleSelection(ref) {
  if(!ref || ref.length == 0){
	return;
  }
	  
  var params = {};  
  params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.TEXT;
  
  // This parameter indicates that RM proxy should pass on the SSO token
    params[gadgets.io.RequestParameters.AUTHORIZATION]="SSO";
    params[gadgets.io.RequestParameters.HEADERS] = {"OSLC-Core-Version":"2.0",
                                                    "Accept": "application/rdf+xml"
                                                   }
  
  var url = ref[0].uri;

  // SERVICE_URL is defined in the gadget.xml file in a separate script tag
  var service = url;
  gadgets.io.makeRequest(service, responseHandler, params);
  setStatus("Request has been sent to remote service", "running");
};

/*
 * Handler for the result returned from the TrivialWebService
 * 
 * The response varies in form depending on whether there is a success or failure
 *  For Success the response is rdf/xml which needs escaping so it can be displayed
 *  For Failure the response is an html fragment that can be displayed directly
 */
function responseHandler(resp) {  
	var html =  resp.text;
	var status = "failed";

	// 200==Good Result, so escape rdf xml
	if (resp.rc==200)
	{
	   html = html.replace(/&/g,"&amp;");
	   html = html.replace(/</g,"&lt;");
	   html = html.replace(/>/g,"&gt;");
	   status="success";
	}
	else
	{
	   status="failed";
	}

    setStatus("Request completed. Result is :<br/>"+html, status);
};

// Update the status in the UI
// Status should be one of "running", "success", "failed"
function setStatus(msg, status){
	var domNode = document.getElementById('result');
	domNode.className="serviceResult "+status;
	domNode.innerHTML = msg;
}
	
// Subscribe to the selection event
RM.Event.subscribe(RM.Event.ARTIFACT_SELECTED, handleSelection);
